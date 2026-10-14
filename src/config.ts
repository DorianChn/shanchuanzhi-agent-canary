import { homedir } from "node:os";
import path from "node:path";
import fs from "node:fs";

export const VERSION = "3.0.0";

// Overridable for tests; real installs live in ~/.agent-canary
export const ROOT = process.env.AGENT_CANARY_HOME ?? path.join(homedir(), ".agent-canary");

export const CANARY_DIR = ROOT;
export const CONFIG_PATH = path.join(ROOT, "config.json");
export const TOKENS_PATH = path.join(ROOT, "tokens.json");
export const EVENTS_PATH = path.join(ROOT, "events.jsonl");

export interface CanaryConfig {
  webhook: string | null;
  notify: boolean;
  eventsFile: string;
  /** Personal Edition license server (sponsor gateway) */
  licenseServer?: string;
}

export function defaultConfig(): CanaryConfig {
  return { webhook: null, notify: true, eventsFile: EVENTS_PATH };
}

export function ensureDirs(): void {
  fs.mkdirSync(ROOT, { recursive: true, mode: 0o700 });
}

export function loadConfig(): CanaryConfig {
  ensureDirs();
  let text: string;
  try {
    text = fs.readFileSync(CONFIG_PATH, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return defaultConfig();
    throw new Error("Could not read Agent Canary configuration; the file was left unchanged.", { cause: error });
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new Error("Agent Canary configuration contains invalid JSON; the file was left unchanged.", { cause: error });
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Agent Canary configuration must be a JSON object; the file was left unchanged.");
  }

  const raw = value as Partial<CanaryConfig>;
  if (raw.webhook !== undefined && raw.webhook !== null && typeof raw.webhook !== "string") {
    throw new Error("Agent Canary configuration has an invalid webhook value; the file was left unchanged.");
  }
  if (raw.notify !== undefined && typeof raw.notify !== "boolean") {
    throw new Error("Agent Canary configuration has an invalid notify value; the file was left unchanged.");
  }
  if (raw.eventsFile !== undefined && (typeof raw.eventsFile !== "string" || !raw.eventsFile.trim() || raw.eventsFile.includes("\0"))) {
    throw new Error("Agent Canary configuration has an invalid eventsFile value; the file was left unchanged.");
  }
  if (raw.licenseServer !== undefined && typeof raw.licenseServer !== "string") {
    throw new Error("Agent Canary configuration has an invalid licenseServer value; the file was left unchanged.");
  }
  return { ...defaultConfig(), ...raw };
}

/**
 * Replace a file through a same-directory temporary file. The completed
 * temporary file is fsynced before rename so an interrupted write cannot leave
 * a partially written JSON document at the destination.
 */
export function writeFileAtomically(filePath: string, contents: string, mode?: number): void {
  const directory = path.dirname(filePath);
  let fileMode = mode ?? 0o600;
  if (mode === undefined) {
    try {
      fileMode = fs.statSync(filePath).mode & 0o777;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  const temporaryPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`
  );
  let descriptor: number | undefined;

  fs.mkdirSync(directory, { recursive: true });
  try {
    descriptor = fs.openSync(temporaryPath, "wx", fileMode);
    fs.writeFileSync(descriptor, contents, "utf8");
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temporaryPath, filePath);
  } catch (error) {
    if (descriptor !== undefined) {
      try {
        fs.closeSync(descriptor);
      } catch {
        /* best-effort cleanup */
      }
    }
    try {
      fs.rmSync(temporaryPath, { force: true });
    } catch {
      /* preserve the original write error */
    }
    throw error;
  }
}

export function saveConfig(cfg: CanaryConfig): void {
  ensureDirs();
  writeFileAtomically(CONFIG_PATH, JSON.stringify(cfg, null, 2) + "\n", 0o600);
}
