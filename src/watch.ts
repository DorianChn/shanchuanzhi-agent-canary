import fs from "node:fs";
import path from "node:path";
import { loadTokens, scanFile, type CanaryToken } from "./tokens.js";
import { fireAlerts, logEvent, type CanaryEvent } from "./alerts.js";

const alerted = new Set<string>();

function alertOnce(t: CanaryToken, p: string): void {
  const key = `${t.token}:${p}`;
  if (alerted.has(key)) return;
  alerted.add(key);

  const ev: CanaryEvent = {
    ts: new Date().toISOString(),
    kind: "token_found",
    label: t.label,
    token: t.token.slice(0, 14) + "…",
    path: p,
  };
  logEvent(ev);
  fireAlerts(ev);
  console.error(`[agent-canary] ALERT: canary token "${t.label}" surfaced in ${p}`);
}

function scanAndAlert(p: string, registry: CanaryToken[] = loadTokens()): void {
  const hits = scanFile(p, registry);
  const hitTokens = new Set(hits.map((token) => token.token));
  for (const t of registry) {
    if (!hitTokens.has(t.token)) alerted.delete(`${t.token}:${p}`);
  }
  for (const t of hits) alertOnce(t, p);
}

function* walk(dir: string): Generator<string> {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isDirectory() && [".git", ".hg", ".svn", "node_modules"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile()) yield p;
  }
}

export function watch(roots: string[]): void {
  // Pre-arm so planted honeypot files never self-trigger.
  for (const t of loadTokens()) {
    for (const ref of t.planted) alerted.add(`${t.token}:${ref.path}`);
  }

  const timers = new Map<string, NodeJS.Timeout>();
  const queue = (p: string) => {
    const prev = timers.get(p);
    if (prev) clearTimeout(prev);
    timers.set(
      p,
      setTimeout(() => {
        timers.delete(p);
        scanAndAlert(p);
      }, 250)
    );
  };

  let watched = 0;
  let validRoots = 0;
  for (const root of roots) {
    try {
      if (!fs.statSync(root).isDirectory()) {
        console.error(`[agent-canary] cannot watch ${root}: expected a directory`);
        continue;
      }
      validRoots++;
      fs.watch(root, { recursive: true }, (_event, file) => {
        if (file) queue(path.join(root, file));
      });
      watched++;
    } catch (error) {
      console.error(`[agent-canary] native watch unavailable for ${root}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (validRoots === 0) {
    console.error("[agent-canary] no readable directory was provided");
    process.exitCode = 1;
    return;
  }

  // Catch tokens already present when monitoring starts; continue with polling as a safety net.
  const sweep = () => {
    const registry = loadTokens();
    for (const root of roots) for (const p of walk(root)) scanAndAlert(p, registry);
  };
  sweep();

  // Frequent polling is the fallback when native recursive watch is unavailable.
  const sweepMs = watched === roots.length ? 30_000 : 3_000;
  const sweepTimer = setInterval(sweep, sweepMs);
  if (watched > 0) sweepTimer.unref();

  console.error(`[agent-canary] watching ${roots.join(", ")} (${watched === roots.length ? "native watch + 30s scan" : "3s polling fallback"}) — Ctrl+C to stop`);
}
