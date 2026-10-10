import fs from "node:fs";
import path from "node:path";
import { loadTokens, scanFileStrictAsync, type CanaryToken } from "./tokens.js";
import { fireAlerts, logEvent, type CanaryEvent } from "./alerts.js";

export interface WatchOptions {
  /** Metadata safety scan interval. Native file events are scanned sooner. */
  pollIntervalMs?: number;
}

const IGNORED_DIRECTORIES = new Set([".git", ".hg", ".svn", "node_modules"]);

async function* walk(
  directory: string,
  onError: (directory: string, error: unknown) => void
): AsyncGenerator<string> {
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(directory, { withFileTypes: true });
  } catch (error) {
    onError(directory, error);
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(target, onError);
    else if (entry.isFile()) yield target;
  }
}

function isMissing(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error &&
    ((error as NodeJS.ErrnoException).code === "ENOENT" || (error as NodeJS.ErrnoException).code === "ENOTDIR"));
}

async function fingerprint(file: string): Promise<string> {
  const stat = await fs.promises.lstat(file, { bigint: true });
  return [stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs].join(":");
}

export async function watch(roots: string[], options: WatchOptions = {}): Promise<void> {
  const requestedInterval = options.pollIntervalMs ?? 2_000;
  const pollIntervalMs = Number.isSafeInteger(requestedInterval)
    ? Math.max(500, Math.min(60_000, requestedInterval))
    : 2_000;
  const validRoots: string[] = [];
  for (const input of roots) {
    const root = path.resolve(input);
    try {
      if (!(await fs.promises.stat(root)).isDirectory()) {
        console.error(`[agent-canary] cannot watch ${input}: expected a directory`);
        continue;
      }
      if (!validRoots.includes(root)) validRoots.push(root);
    } catch (error) {
      console.error(`[agent-canary] cannot watch ${input}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (validRoots.length === 0) {
    console.error("[agent-canary] no readable directory was provided");
    process.exitCode = 1;
    return;
  }

  const alerted = new Set<string>();
  const fingerprints = new Map<string, string>();
  const hitsByFile = new Map<string, Set<string>>();
  const reportedFailures = new Set<string>();
  const timers = new Map<string, NodeJS.Timeout>();

  // Pre-arm so planted honeypot files never self-trigger on the first scan.
  for (const token of loadTokens()) {
    for (const ref of token.planted) alerted.add(`${token.token}:${path.resolve(ref.path)}`);
  }

  const reportFailure = (key: string, message: string) => {
    if (reportedFailures.has(key)) return;
    reportedFailures.add(key);
    console.error(`[agent-canary] scan incomplete: ${message}`);
  };
  const clearFailure = (key: string) => reportedFailures.delete(key);

  const forgetFile = (file: string) => {
    fingerprints.delete(file);
    for (const token of hitsByFile.get(file) ?? []) alerted.delete(`${token}:${file}`);
    hitsByFile.delete(file);
  };

  const alertOnce = (token: CanaryToken, file: string) => {
    const key = `${token.token}:${file}`;
    if (alerted.has(key)) return;
    alerted.add(key);
    const event: CanaryEvent = {
      ts: new Date().toISOString(),
      kind: "token_found",
      label: token.label,
      token: token.token.slice(0, 14) + "…",
      path: file,
    };
    console.error(`[agent-canary] ALERT: canary token "${token.label}" surfaced in ${file}`);
    try {
      logEvent(event);
    } catch (error) {
      reportFailure("audit-log", `could not write the local alert event: ${error instanceof Error ? error.message : String(error)}`);
    }
    try {
      fireAlerts(event);
    } catch (error) {
      reportFailure("alert-dispatch", `could not start alert delivery: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const scanFile = async (file: string, registry: CanaryToken[], force: boolean) => {
    let nextFingerprint: string;
    try {
      nextFingerprint = await fingerprint(file);
    } catch (error) {
      if (isMissing(error)) {
        forgetFile(file);
        clearFailure(`file:${file}`);
      } else {
        reportFailure(`file:${file}`, `${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
      return;
    }
    if (!force && fingerprints.get(file) === nextFingerprint) return;
    if (registry.length === 0) {
      fingerprints.set(file, nextFingerprint);
      return;
    }

    let hits: CanaryToken[];
    try {
      hits = await scanFileStrictAsync(file, registry);
    } catch (error) {
      // Unlike scanFile(), the strict scanner preserves I/O failures so an
      // unreadable file is never silently treated as a clean scan.
      if (isMissing(error)) forgetFile(file);
      else reportFailure(`file:${file}`, `${file}: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }

    clearFailure(`file:${file}`);
    fingerprints.set(file, nextFingerprint);
    const nextHits = new Set(hits.map((token) => token.token));
    for (const previous of hitsByFile.get(file) ?? []) {
      if (!nextHits.has(previous)) alerted.delete(`${previous}:${file}`);
    }
    if (nextHits.size) hitsByFile.set(file, nextHits);
    else hitsByFile.delete(file);
    for (const token of hits) alertOnce(token, file);
  };

  const scanPath = async (target: string, registry: CanaryToken[], force: boolean) => {
    let stat: fs.Stats;
    try {
      stat = await fs.promises.lstat(target);
    } catch (error) {
      if (isMissing(error)) forgetFile(target);
      else reportFailure(`file:${target}`, `${target}: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
    if (stat.isDirectory()) {
      for await (const file of walk(target, (directory, error) =>
        reportFailure(`walk:${directory}`, `${directory}: ${error instanceof Error ? error.message : String(error)}`))) {
        await scanFile(file, registry, force);
      }
      return;
    }
    if (!stat.isFile()) return;
    await scanFile(target, registry, force);
  };

  const isWithinRoot = (file: string, root: string) => {
    const relative = path.relative(root, file);
    return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
  };

  let fullContentScanIntervalMs = 30_000;
  let registrySignature = "";
  let lastFullContentScan = 0;
  if (loadTokens().length === 0) {
    reportFailure("registry", "no canary tokens are registered; run `agent-canary tokens generate --label <label>` first");
  }
  let sweeping = false;
  const sweep = async (force = false) => {
    // Do not stack full tree walks if a large root takes longer than the poll interval.
    if (sweeping) return;
    sweeping = true;
    try {
      const registry = loadTokens();
      if (registry.length === 0) {
        reportFailure("registry", "no canary tokens are registered; run `agent-canary tokens generate --label <label>` first");
      } else {
        clearFailure("registry");
      }
      const nextSignature = registry.map((token) => `${token.token}\0${token.label}`).sort().join("\x01");
      const registryChanged = nextSignature !== registrySignature;
      registrySignature = nextSignature;
      const fullContentScanDue = force || registryChanged || Date.now() - lastFullContentScan >= fullContentScanIntervalMs;
      const seen = new Set<string>();
      let complete = true;
      const walkFailures = new Set<string>();
      for (const root of validRoots) {
        for await (const file of walk(root, (directory, error) => {
          complete = false;
          const key = `walk:${directory}`;
          walkFailures.add(key);
          reportFailure(key, `${directory}: ${error instanceof Error ? error.message : String(error)}`);
        })) {
          seen.add(file);
          await scanFile(file, registry, fullContentScanDue);
        }
      }
      for (const key of reportedFailures) {
        if (key.startsWith("walk:") && !walkFailures.has(key)) clearFailure(key);
      }
      if (fullContentScanDue) lastFullContentScan = Date.now();

      // A failed directory read may hide existing files, so only prune stale
      // paths after a fully readable sweep of the configured roots.
      if (complete) {
        for (const file of fingerprints.keys()) {
          if (validRoots.some((root) => isWithinRoot(file, root)) && !seen.has(file)) forgetFile(file);
        }
      }
    } finally {
      sweeping = false;
    }
  };

  const queue = (target: string) => {
    if (timers.has(target)) return;
    timers.set(target, setTimeout(() => {
      timers.delete(target);
      void scanPath(target, loadTokens(), true).catch((error) =>
        reportFailure(`file:${target}`, `${target}: ${error instanceof Error ? error.message : String(error)}`));
    }, 100));
  };

  let watched = 0;
  for (const root of validRoots) {
    try {
      const watcher = fs.watch(root, { recursive: true }, (_event, file) => {
        if (file == null) {
          // Some platforms omit filenames. Trigger an early safety sweep.
          queue(root);
          return;
        }
        const target = path.resolve(root, String(file));
        if (isWithinRoot(target, root)) queue(target);
      });
      watcher.on("error", (error) => {
        fullContentScanIntervalMs = 3_000;
        reportFailure(`watch:${root}`, `native watcher for ${root}: ${error.message}; polling remains active`);
      });
      watched++;
    } catch (error) {
      reportFailure(`watch:${root}`, `native watch unavailable for ${root}: ${error instanceof Error ? error.message : String(error)}; polling remains active`);
    }
  }
  if (watched !== validRoots.length) fullContentScanIntervalMs = 3_000;

  const safeSweep = (force = false) => {
    void sweep(force).catch((error) =>
      reportFailure("sweep", `directory scan failed: ${error instanceof Error ? error.message : String(error)}`));
  };
  safeSweep(true);
  // Keep the process alive even if a native watcher later errors and closes;
  // the polling path remains the recovery mechanism until the user stops it.
  setInterval(() => safeSweep(), pollIntervalMs);

  const watchMode = watched === validRoots.length
    ? `native events + ${pollIntervalMs}ms fingerprint scan + ${fullContentScanIntervalMs}ms full scan`
    : `${watched}/${validRoots.length} native watchers + ${pollIntervalMs}ms fingerprint polling + ${fullContentScanIntervalMs}ms full scan`;
  console.error(`[agent-canary] watching ${validRoots.join(", ")} (${watchMode}) — Ctrl+C to stop`);
}
