import fs from "node:fs";
import path from "node:path";
import { loadTokens, scanFile, type CanaryToken } from "./tokens.js";
import { fireAlerts, logEvent, safeDisplayText, type CanaryEvent } from "./alerts.js";
import { walkFiles } from "./file-walk.js";

const MAX_ALERTED_KEYS = 4096;
const MAX_REPORTED_FAILURES = 1024;
const MAX_PENDING_FILES = 2048;

export interface WatchHandle {
  close(): void;
  /** Bounded operational counters, primarily useful to verify lifecycle behavior. */
  stats(): { watchedRoots: number; pendingFiles: number; alertedKeys: number; reportedFailures: number };
}

export interface WatchOptions {
  /** Injectable hooks keep lifecycle and load tests deterministic and offline. */
  watchFactory?: (root: string, onChange: (filename: string | Buffer | null) => void) => fs.FSWatcher;
  scanner?: typeof scanFile;
  sweepIntervalMs?: number;
}

class BoundedSet {
  private readonly values = new Set<string>();
  private readonly insertionOrder: string[] = [];

  constructor(private readonly limit: number) {}

  add(value: string): boolean {
    if (this.values.has(value)) return false;
    this.values.add(value);
    this.insertionOrder.push(value);
    if (this.insertionOrder.length > this.limit) {
      const oldest = this.insertionOrder.shift();
      if (oldest !== undefined) this.values.delete(oldest);
    }
    return true;
  }

  has(value: string): boolean {
    return this.values.has(value);
  }

  get size(): number {
    return this.values.size;
  }
}

function alertOnce(t: CanaryToken, p: string, alerted: BoundedSet): void {
  const key = `${t.token}:${p}`;
  if (!alerted.add(key)) return;

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

function scanAndAlert(p: string, alerted: BoundedSet, failures: BoundedSet, scanner: typeof scanFile): void {
  try {
    for (const t of scanner(p)) {
      // The honeypot file we planted ourselves is allowed to contain its tokens.
      if (t.planted.some((r) => r.path === p)) continue;
      alertOnce(t, p, alerted);
    }
  } catch (error) {
    if (failures.add(p)) {
      const message = error instanceof Error ? error.message : "unknown error";
      console.error(`[agent-canary] scan incomplete for ${JSON.stringify(p)}: ${safeDisplayText(message)}`);
    }
  }
}

export function watch(roots: string[], options: WatchOptions = {}): WatchHandle {
  if (roots.length === 0) throw new Error("At least one watch root is required.");
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

  const alerted = new BoundedSet(MAX_ALERTED_KEYS);
  const scanFailuresReported = new BoundedSet(MAX_REPORTED_FAILURES);
  const timers = new Map<string, NodeJS.Timeout>();
  const watchers: fs.FSWatcher[] = [];
  let closed = false;

  // Pre-arm so planted honeypot files never self-trigger. The cache is bounded;
  // the scanner still independently excludes each planted path.
  for (const t of loadTokens()) {
    for (const ref of t.planted) alerted.add(`${t.token}:${ref.path}`);
  }

  const queue = (p: string) => {
    if (closed) return;
    const prev = timers.get(p);
    if (prev) {
      clearTimeout(prev);
    } else if (timers.size >= MAX_PENDING_FILES) {
      // The periodic sweep is the fallback for overflow; memory stays bounded.
      return;
    }
    timers.set(
      p,
      setTimeout(() => {
        timers.delete(p);
        if (!closed) scanAndAlert(p, alerted, scanFailuresReported, options.scanner ?? scanFile);
      }, 250)
    );
  };

  let watched = 0;
  for (const root of roots) {
    try {
      const onChange = (file: string | Buffer | null) => {
        if (file) queue(path.join(root, String(file)));
      };
      const watcher = options.watchFactory
        ? options.watchFactory(root, onChange)
        : fs.watch(root, { recursive: true }, (_event, file) => onChange(file));
      watcher.on("error", (error) => {
        console.error(`[agent-canary] file watcher error for ${safeDisplayText(root)}: ${safeDisplayText(error.message)}`);
      });
      watchers.push(watcher);
      watched++;
    } catch {
      /* recursive watch unsupported on this platform/root */
    }
  }

  // Safety net: full sweep. Frequent if the native watch failed, rare otherwise.
  const sweepMs = options.sweepIntervalMs ?? (watched === roots.length ? 30_000 : 3_000);
  const sweep = setInterval(() => {
    if (closed) return;
    for (const root of roots) {
      try {
        for (const p of walkFiles(root)) scanAndAlert(p, alerted, scanFailuresReported, options.scanner ?? scanFile);
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown error";
        console.error(`[agent-canary] scan incomplete for ${JSON.stringify(root)}: ${safeDisplayText(message)}`);
      }
    }
  }, sweepMs);
  sweep.unref();

  console.error(`[agent-canary] watching ${roots.map((root) => safeDisplayText(root)).join(", ")} — Ctrl+C to stop`);

  return {
    close() {
      if (closed) return;
      closed = true;
      clearInterval(sweep);
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      for (const watcher of watchers) watcher.close();
      watchers.length = 0;
    },
    stats() {
      return { watchedRoots: watched, pendingFiles: timers.size, alertedKeys: alerted.size, reportedFailures: scanFailuresReported.size };
    },
  };
}
