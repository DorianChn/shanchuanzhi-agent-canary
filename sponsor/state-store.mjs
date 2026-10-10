import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const LOCK_WAIT = new Int32Array(new SharedArrayBuffer(4));
const DEFAULT_LOCK_TIMEOUT_MS = 10_000;
const STALE_LOCK_AGE_MS = 30_000;

function stateError(file, message, cause) {
  const error = new Error(`${message}: ${path.basename(file)}; the file was left unchanged.`);
  if (cause !== undefined) error.cause = cause;
  return error;
}

/** Missing files use the caller's first-run default; every other read failure is fatal. */
export function readJsonFile(file, fallback, fsApi = fs) {
  let descriptor;
  let contents;
  try {
    const linkInfo = fsApi.lstatSync(file);
    if (linkInfo.isSymbolicLink() || !linkInfo.isFile()) throw stateError(file, "Business state is not a regular file");
    const noFollow = typeof fsApi.constants.O_NOFOLLOW === "number" ? fsApi.constants.O_NOFOLLOW : 0;
    descriptor = fsApi.openSync(file, fsApi.constants.O_RDONLY | noFollow);
    if (!fsApi.fstatSync(descriptor).isFile()) throw stateError(file, "Business state is not a regular file");
    contents = fsApi.readFileSync(descriptor, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    if (error?.message?.includes(path.basename(file))) throw error;
    throw stateError(file, "Could not read business state", error);
  } finally {
    if (descriptor !== undefined) {
      try { fsApi.closeSync(descriptor); } catch {}
    }
  }

  if (contents.trim() === "") throw stateError(file, "Business state is empty");
  try {
    return JSON.parse(contents);
  } catch (error) {
    throw stateError(file, "Business state contains invalid JSON", error);
  }
}

/** Write complete JSON through an owner-only same-directory temp file and atomic rename. */
export function writeJsonFile(file, value) {
  try {
    const existing = fs.lstatSync(file);
    if (existing.isSymbolicLink() || !existing.isFile()) throw stateError(file, "Refusing to replace a non-regular business-state path");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const directory = path.dirname(file);
  const temp = path.join(directory, `.${path.basename(file)}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`);
  let descriptor;
  try {
    descriptor = fs.openSync(temp, "wx", 0o600);
    fs.writeFileSync(descriptor, JSON.stringify(value, null, 2) + "\n", "utf8");
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temp, file);
    try {
      const directoryFd = fs.openSync(directory, fs.constants.O_RDONLY);
      try { fs.fsyncSync(directoryFd); } finally { fs.closeSync(directoryFd); }
    } catch (error) {
      // Windows does not permit opening/fsyncing directories. The file itself
      // was fsynced before the atomic rename on every platform.
      if (process.platform !== "win32") throw error;
    }
  } catch (error) {
    if (descriptor !== undefined) {
      try { fs.closeSync(descriptor); } catch {}
    }
    try { fs.rmSync(temp, { force: true }); } catch {}
    if (error?.message?.includes(path.basename(file))) throw error;
    throw stateError(file, "Could not persist business state", error);
  }
}

/** Cross-process lock for sponsor state transactions; stale locks are removed only for dead local PIDs. */
export function withFileLock(lockFile, operation, timeoutMs = DEFAULT_LOCK_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  let descriptor;
  while (descriptor === undefined) {
    try {
      descriptor = fs.openSync(lockFile, "wx", 0o600);
      fs.writeFileSync(descriptor, JSON.stringify({ pid: process.pid, hostname: os.hostname(), createdAt: Date.now() }));
      fs.fsyncSync(descriptor);
    } catch (error) {
      if (descriptor !== undefined) {
        try { fs.closeSync(descriptor); } catch {}
        descriptor = undefined;
        try { fs.unlinkSync(lockFile); } catch {}
      }
      if (error?.code !== "EEXIST") throw stateError(lockFile, "Could not create business-state lock", error);
      if (removeDeadLocalLock(lockFile)) continue;
      if (Date.now() >= deadline) throw stateError(lockFile, "Business state is busy; no update was written");
      Atomics.wait(LOCK_WAIT, 0, 0, 10);
    }
  }

  try {
    return operation();
  } finally {
    try { fs.closeSync(descriptor); } catch {}
    try { fs.unlinkSync(lockFile); } catch (error) {
      throw stateError(lockFile, "Could not release business-state lock", error);
    }
  }
}

function removeDeadLocalLock(lockFile) {
  let text;
  try { text = fs.readFileSync(lockFile, "utf8"); } catch { return false; }
  let owner;
  try { owner = JSON.parse(text); } catch { return false; }
  if (
    owner.hostname !== os.hostname() ||
    !Number.isInteger(owner.pid) ||
    typeof owner.createdAt !== "number" ||
    Date.now() - owner.createdAt < STALE_LOCK_AGE_MS
  ) return false;
  try {
    process.kill(owner.pid, 0);
    return false;
  } catch (error) {
    if (error?.code !== "ESRCH") return false;
  }
  try {
    if (fs.readFileSync(lockFile, "utf8") !== text) return false;
    fs.unlinkSync(lockFile);
    return true;
  } catch {
    return false;
  }
}
