import crypto from "node:crypto";
import fs from "node:fs";
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
  try {
    const raw: unknown = JSON.parse(fs.readFileSync(TOKENS_PATH, "utf8"));
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((entry) => {
      const token = parseCanaryToken(entry);
      return token ? [token] : [];
    });
  } catch {
    return [];
  }
}

export function saveTokens(tokens: CanaryToken[]): void {
  ensureDirs();
  writeFileAtomically(TOKENS_PATH, JSON.stringify(tokens, null, 2) + "\n");
}

export function addTokens(added: CanaryToken[]): CanaryToken[] {
  const all = [...loadTokens(), ...added];
  saveTokens(all);
  return added;
}

export function generateTokens(label: string, count: number): CanaryToken[] {
  validateTokenRequest(label, count);
  return addTokens(Array.from({ length: count }, () => mintToken(label)));
}

function validateTokenRequest(label: string, count: number): void {
  if (typeof label !== "string" || label.trim() === "" || label.length > 128 || /[\u0000-\u001f\u007f]/.test(label)) {
    throw new TypeError("label must be 1–128 characters and contain no control characters.");
  }
  if (!Number.isInteger(count) || count < 1 || count > 1000) {
    throw new RangeError("count must be an integer from 1 to 1000.");
  }
}

export function recordPlanted(token: CanaryToken, ref: PlantedRef): void {
  const all = loadTokens();
  const hit = all.find((t) => t.token === token.token);
  if (hit) hit.planted.push(ref);
  saveTokens(all);
}

/**
 * Plant canary tokens into `target`.
 * - If the file exists, a tripwire block is appended (never overwrites).
 * - If it does not exist, a honeypot file full of fake secrets is created.
 */
export function plantIntoFile(target: string, label: string, count: number): CanaryToken[] {
  validateTokenRequest(label, count);
  const created = Array.from({ length: count }, () => mintToken(label));
  const abs = path.resolve(target);
  const exists = fs.existsSync(abs);
  const originalSize = exists ? fs.statSync(abs).size : 0;
  const lines: string[] = [];

  if (!exists) {
    lines.push(
      "# WARNING: honeypot file planted by agent-canary.",
      "# The 'secrets' below are worthless tripwires. If any cnry_* value ever",
      "# appears outside its planted location, review where it was copied.",
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
  const block = lines.join("\n") + "\n";
  try {
    fs.appendFileSync(abs, block);
    // Register all planted tokens in one atomic write. This avoids an O(n²)
    // read/write loop for larger honeypots and avoids orphaning tokens when
    // writing the target file fails.
    const fileLines = fs.readFileSync(abs, "utf8").split("\n");
    const planted = created.map((token) => {
      const line = fileLines.findIndex((entry) => entry.includes(token.token));
      return {
        ...token,
        planted: line >= 0 ? [{ path: abs, line: line + 1 }] : [],
      };
    });
    saveTokens([...loadTokens(), ...planted]);
    return planted;
  } catch (error) {
    // If registry persistence fails, do not leave an untracked honeypot block.
    try {
      if (exists) fs.truncateSync(abs, originalSize);
      else fs.rmSync(abs, { force: true });
    } catch {
      /* preserve the registry/write error */
    }
    throw error;
  }
}

export function findTokensInText(text: string): CanaryToken[] {
  return loadTokens().filter((t) => text.includes(t.token));
}

function pathsMatch(left: string, right: string): boolean {
  const a = path.resolve(left);
  const b = path.resolve(right);
  return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}

/** Scan a file incrementally so large logs and archives do not consume unbounded memory. */
export function scanFileStrict(p: string, registry: CanaryToken[] = loadTokens()): CanaryToken[] {
  const stat = fs.statSync(p);
  if (!stat.isFile()) return [];

  const abs = path.resolve(p);
  const candidates = registry.filter((token) => !token.planted.some((ref) => pathsMatch(ref.path, abs)));
  if (candidates.length === 0) return [];

  const maxTokenLength = candidates.reduce((longest, token) => Math.max(longest, token.token.length), 0);
  const chunk = Buffer.allocUnsafe(64 * 1024);
  const found = new Map<string, CanaryToken>();
  let overlap = "";
  const descriptor = fs.openSync(p, "r");
  try {
    let bytesRead: number;
    while ((bytesRead = fs.readSync(descriptor, chunk, 0, chunk.length, null)) > 0) {
      const text = overlap + chunk.toString("utf8", 0, bytesRead);
      for (const token of candidates) {
        if (!found.has(token.token) && text.includes(token.token)) found.set(token.token, token);
      }
      overlap = text.slice(-(maxTokenLength - 1));
    }
  } finally {
    fs.closeSync(descriptor);
  }
  return [...found.values()];
}

export function scanFile(p: string, registry: CanaryToken[] = loadTokens()): CanaryToken[] {
  try {
    return scanFileStrict(p, registry);
  } catch {
    return [];
  }
}
