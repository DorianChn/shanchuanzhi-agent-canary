import fs from "node:fs";
import path from "node:path";
import { loadTokens, scanFile, type CanaryToken } from "./tokens.js";
import { fireAlerts, logEvent, safeDisplayText, type CanaryEvent } from "./alerts.js";
import { walkFiles } from "./file-walk.js";

const alerted = new Set<string>();
const scanFailuresReported = new Set<string>();

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
  console.error(`[agent-canary] ALERT: canary token "${safeDisplayText(t.label, 128)}" surfaced in ${safeDisplayText(p)}`);
}

function scanAndAlert(p: string): void {
  try {
    for (const t of scanFile(p)) {
      // The honeypot file we planted ourselves is allowed to contain its tokens.
      if (t.planted.some((r) => r.path === p)) continue;
      alertOnce(t, p);
    }
  } catch (error) {
    if (!scanFailuresReported.has(p)) {
      scanFailuresReported.add(p);
      const message = error instanceof Error ? error.message : "unknown error";
      console.error(`[agent-canary] scan incomplete for ${JSON.stringify(p)}: ${safeDisplayText(message)}`);
    }
  }
}

export function watch(roots: string[]): void {
  for (const root of roots) {
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(root);
    } catch (error) {
      throw new Error(`Cannot inspect watch root ${JSON.stringify(root)}; monitoring was not started.`, { cause: error });
    }
    if (stat.isSymbolicLink()) throw new Error(`Refusing to watch symbolic-link root ${JSON.stringify(root)}.`);
    if (!stat.isDirectory()) throw new Error(`Watch root ${JSON.stringify(root)} is not a directory.`);
  }

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
  for (const root of roots) {
    try {
      fs.watch(root, { recursive: true }, (_event, file) => {
        if (file) queue(path.join(root, file));
      });
      watched++;
    } catch {
      /* recursive watch unsupported on this platform/root */
    }
  }

  // Safety net: full sweep. Frequent if the native watch failed, rare otherwise.
  const sweepMs = watched === roots.length ? 30_000 : 3_000;
  setInterval(() => {
    for (const root of roots) {
      try {
        for (const p of walkFiles(root)) scanAndAlert(p);
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown error";
        console.error(`[agent-canary] scan incomplete for ${JSON.stringify(root)}: ${safeDisplayText(message)}`);
      }
    }
  }, sweepMs).unref();

  console.error(`[agent-canary] watching ${roots.map((root) => safeDisplayText(root)).join(", ")} — Ctrl+C to stop`);
}
