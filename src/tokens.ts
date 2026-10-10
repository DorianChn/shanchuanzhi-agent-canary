import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TOKENS_PATH, ensureDirs, writeFileAtomically } from "./config.js";

export interface PlantedRef {
  path: string;
  line: number;
}

export interface CanaryToken {
  token: string;
  label: string;
  createdAt: string;
  planted: PlantedRef[];
}

const TOKEN_PATTERN = /^cnry_[A-Za-z0-9_-]{20,}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPlantedRef(value: unknown): value is PlantedRef {
  if (!isRecord(value)) return false;
  return (
    typeof value.path === "string" &&
    value.path.trim() !== "" &&
    !value.path.includes("\0") &&
    typeof value.line === "number" &&
    Number.isInteger(value.line) &&
    value.line > 0
  );
}

/** Parse one persisted record while preserving valid planted references. */
export function parseCanaryToken(value: unknown): CanaryToken | null {
  if (!isRecord(value)) return null;
  if (typeof value.token !== "string" || !TOKEN_PATTERN.test(value.token)) return null;
  if (typeof value.label !== "string" || value.label.trim() === "") return null;
  if (
    typeof value.createdAt !== "string" ||
    value.createdAt.trim() === "" ||
    Number.isNaN(Date.parse(value.createdAt))
  ) {
    return null;
  }
  if (value.planted !== undefined && !Array.isArray(value.planted)) return null;

  return {
    token: value.token,
    label: value.label,
    createdAt: value.createdAt,
    // A malformed ref cannot be used for scan exclusions; discard only that
    // ref instead of losing the otherwise valid token record.
    planted: Array.isArray(value.planted) ? value.planted.filter(isPlantedRef) : [],
  };
}

// Variable names used when creating a honeypot file: realistic enough to bait an
// exfiltrating agent, and each value is a unique, worthless canary string.
export const HONEYPOT_VARS = [
  "STRIPE_SECRET_KEY",
  "OPENAI_API_KEY",
  "GITHUB_TOKEN",
  "AWS_SECRET_ACCESS_KEY",
  "SMTP_PASSWORD",
  "DATABASE_URL_PASSWORD",
] as const;

export function mintToken(label: string): CanaryToken {
  return {
    token: `cnry_${crypto.randomBytes(18).toString("base64url")}`,
    label,
    createdAt: new Date().toISOString(),
    planted: [],
  };
}

export function loadTokens(): CanaryToken[] {
  let text: string;
  try {
    text = fs.readFileSync(TOKENS_PATH, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw new Error("Could not read the canary token registry; scanning and token updates are unavailable.", { cause: error });
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new Error("The canary token registry is invalid JSON; it was left unchanged.", { cause: error });
  }
  if (!Array.isArray(raw)) throw new Error("The canary token registry must contain a JSON array; it was left unchanged.");
  return raw.flatMap((entry) => {
    const token = parseCanaryToken(entry);
    return token ? [token] : [];
  });
}

export function saveTokens(tokens: CanaryToken[]): void {
  ensureDirs();
  withTokenRegistryLock(() => writeTokens(tokens));
}

export function addTokens(added: CanaryToken[]): CanaryToken[] {
  withTokenRegistryLock(() => writeTokens([...loadTokens(), ...added]));
  return added;
}

export function generateTokens(label: string, count: number): CanaryToken[] {
  return addTokens(Array.from({ length: count }, () => mintToken(label)));
}

export function recordPlanted(token: CanaryToken, ref: PlantedRef): void {
  withTokenRegistryLock(() => {
    const all = loadTokens();
    const hit = all.find((t) => t.token === token.token);
    if (hit && !hit.planted.some((existing) => existing.path === ref.path && existing.line === ref.line)) {
      hit.planted.push(ref);
      writeTokens(all);
    }
  });
}

const LOCK_TIMEOUT_MS = 10_000;
const LOCK_STALE_MS = 30_000;
const WAIT_CELL = new Int32Array(new SharedArrayBuffer(4));

function writeTokens(tokens: CanaryToken[]): void {
  ensureDirs();
  writeFileAtomically(TOKENS_PATH, JSON.stringify(tokens, null, 2) + "\n", 0o600);
}

function staleLockCanBeRemoved(lockPath: string): boolean {
  let initial: string;
  try {
    initial = fs.readFileSync(lockPath, "utf8");
  } catch {
    return false;
  }
  let owner: { pid?: number; hostname?: string; createdAt?: number };
  try {
    owner = JSON.parse(initial) as typeof owner;
  } catch {
    return false;
  }
  if (
    owner.hostname !== os.hostname() ||
    !Number.isInteger(owner.pid) ||
    typeof owner.createdAt !== "number" ||
    Date.now() - owner.createdAt < LOCK_STALE_MS
  ) return false;
  try {
    process.kill(owner.pid!, 0);
    return false;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") return false;
  }
  try {
    if (fs.readFileSync(lockPath, "utf8") !== initial) return false;
    fs.unlinkSync(lockPath);
    return true;
  } catch {
    return false;
  }
}

/** Serialize registry read-modify-write operations across CLI processes. */
function withTokenRegistryLock<T>(operation: () => T): T {
  ensureDirs();
  const lockPath = `${TOKENS_PATH}.lock`;
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  let descriptor: number | undefined;
  while (descriptor === undefined) {
    try {
      descriptor = fs.openSync(lockPath, "wx", 0o600);
      fs.writeFileSync(descriptor, JSON.stringify({ pid: process.pid, hostname: os.hostname(), createdAt: Date.now() }));
      fs.fsyncSync(descriptor);
    } catch (error) {
      // Windows can report EPERM while another process's lock deletion is
      // pending. Only retry lock creation, never run an unlocked write or
      // remove someone else's lock on a permission error. Persistent failures
      // retain the same bounded timeout and fail closed.
      const retryWindowsOpen = descriptor === undefined && process.platform === "win32" &&
        (error as NodeJS.ErrnoException).code === "EPERM";
      if (descriptor !== undefined) {
        try { fs.closeSync(descriptor); } catch {}
        descriptor = undefined;
        try { fs.unlinkSync(lockPath); } catch {}
      }
      if ((error as NodeJS.ErrnoException).code !== "EEXIST" && !retryWindowsOpen) {
        throw new Error("Could not create the canary token registry lock; token updates were not written.", { cause: error });
      }
      if (!retryWindowsOpen && staleLockCanBeRemoved(lockPath)) continue;
      if (Date.now() >= deadline) {
        throw new Error("The canary token registry is locked by another process; no token update was written.");
      }
      Atomics.wait(WAIT_CELL, 0, 0, 10);
    }
  }

  try {
    return operation();
  } finally {
    try { fs.closeSync(descriptor); } catch {}
    try { fs.unlinkSync(lockPath); } catch (error) {
      throw new Error("The canary token registry lock could not be released; inspect it before retrying.", { cause: error });
    }
  }
}

/**
 * Plant canary tokens into `target`.
 * - If the file exists, a tripwire block is appended (never overwrites).
 * - If it does not exist, a honeypot file full of fake secrets is created.
 */
export function plantIntoFile(target: string, label: string, count: number): CanaryToken[] {
  const created = generateTokens(label, count);
  const abs = path.resolve(target);
  const exists = fs.existsSync(abs);
  const lines: string[] = [];

  if (!exists) {
    lines.push(
      "# WARNING: honeypot file planted by agent-canary.",
      "# The 'secrets' below are worthless tripwires. If any cnry_* value ever",
      "# shows up outside this file, something read and exfiltrated it.",
      ""
    );
  } else {
    lines.push("", "# --- agent-canary tripwire block (safe to ignore) ---");
  }

  created.forEach((t, i) => {
    const varName = HONEYPOT_VARS[i % HONEYPOT_VARS.length] + (i >= HONEYPOT_VARS.length ? `_${i}` : "");
    lines.push(`${varName}=${t.token}`);
  });

  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.appendFileSync(abs, lines.join("\n") + "\n");

  // Figure out the line number each token landed on so events can point at it.
  const fileLines = fs.readFileSync(abs, "utf8").split("\n");
  for (const t of created) {
    const line = fileLines.findIndex((l) => l.includes(t.token));
    if (line >= 0) recordPlanted(t, { path: abs, line: line + 1 });
  }
  return created;
}

export function findTokensInText(text: string): CanaryToken[] {
  return loadTokens().filter((t) => text.includes(t.token));
}

export function scanFile(p: string): CanaryToken[] {
  let descriptor: number | undefined;
  try {
    const noFollow = typeof fs.constants.O_NOFOLLOW === "number" ? fs.constants.O_NOFOLLOW : 0;
    descriptor = fs.openSync(p, fs.constants.O_RDONLY | noFollow);
    if (!fs.fstatSync(descriptor).isFile()) return [];

    const abs = path.resolve(p);
    // A token sitting in the exact file where we planted it is legitimate;
    // anywhere else it is a leak.
    const tokens = loadTokens().filter((t) => !t.planted.some((r) => r.path === abs));
    if (!tokens.length) return [];

    const needles = tokens.map((token) => ({ token, bytes: Buffer.from(token.token, "utf8") }));
    const overlap = Math.max(...needles.map((needle) => needle.bytes.length)) - 1;
    const buffer = Buffer.allocUnsafe(64 * 1024);
    let carry = Buffer.alloc(0);
    const found = new Set<string>();

    while (true) {
      const bytesRead = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      const chunk = buffer.subarray(0, bytesRead);
      const sample = carry.length ? Buffer.concat([carry, chunk]) : chunk;
      for (const needle of needles) {
        if (!found.has(needle.token.token) && sample.includes(needle.bytes)) found.add(needle.token.token);
      }
      if (found.size === needles.length) break;
      carry = Buffer.from(sample.subarray(Math.max(0, sample.length - overlap)));
    }

    return tokens.filter((token) => found.has(token.token));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return [];
    throw new Error(`Could not scan file ${JSON.stringify(p)}; the scan is incomplete.`, { cause: error });
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}
