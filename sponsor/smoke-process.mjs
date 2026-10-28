import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function smokeEnvironment(extra = {}) {
  return {
    PATH: process.env.PATH ?? "",
    SystemRoot: process.env.SystemRoot ?? "",
    TEMP: process.env.TEMP ?? os.tmpdir(),
    TMP: process.env.TMP ?? os.tmpdir(),
    DEMO: "1",
    ...extra,
  };
}

// Only the process tree/group created below is eligible for termination.
function terminateTree(child) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const result = spawnSync(path.join(process.env.SystemRoot, "System32", "taskkill.exe"),
      ["/PID", String(child.pid), "/T", "/F"],
      { env: smokeEnvironment(), windowsHide: true, encoding: "utf8", timeout: 5000 });
    if (result.error || result.status !== 0) {
      throw new Error(`SMOKE_TREE_CLEANUP_FAILED pid=${child.pid} exit=${result.status}: ${result.error?.message ?? result.stderr}`);
    }
  } else {
    try { process.kill(-child.pid, "SIGKILL"); }
    catch (error) { if (error.code !== "ESRCH") throw error; }
  }
}

export async function runSmokeDriver(script, { cwd, timeout = 60_000, env = smokeEnvironment() } = {}) {
  if (!Number.isSafeInteger(timeout) || timeout <= 0) throw new Error("SMOKE_TIMEOUT_INVALID");
  const fixture = fs.mkdtempSync(path.join(cwd, ".smoke-supervisor-"));
  let child, watchdog, closeTimer, error, stdout = "", stderr = "";
  let timedOut = false;
  try {
    child = spawn(process.execPath, [script, "--smoke-worker", fixture], {
      cwd, env, detached: process.platform !== "win32", windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", data => { stdout = (stdout + data).slice(-1024 * 1024); });
    child.stderr.on("data", data => { stderr = (stderr + data).slice(-1024 * 1024); });
    child.once("error", failure => { error = failure; });
    const closed = new Promise(resolve => child.once("close", (status, signal) => resolve({ status, signal })));
    const expired = new Promise(resolve => { watchdog = setTimeout(() => resolve(null), timeout); });
    let outcome = await Promise.race([closed, expired]);
    clearTimeout(watchdog);
    if (outcome === null) {
      timedOut = true;
      error = Object.assign(new Error("SMOKE_WATCHDOG_TIMEOUT"), { code: "ETIMEDOUT" });
      terminateTree(child);
      outcome = await Promise.race([closed, new Promise((_, reject) => {
        closeTimer = setTimeout(() => reject(new Error(`SMOKE_DRIVER_NOT_REAPED pid=${child.pid}`)), 5000);
      })]);
    } else if (process.platform !== "win32") {
      // An exited POSIX driver can still leave members of its owned group.
      terminateTree(child);
    }
    clearTimeout(closeTimer);
    fs.rmSync(fixture, { recursive: true, force: true });
    return { status: timedOut ? 1 : outcome.status, signal: outcome.signal, error,
      timedOut, stdout, stderr, pid: child.pid, fixture };
  } catch (failure) {
    // Keep evidence if OS cleanup was denied or the child could not be reaped.
    // Release this runner's local pipe/process handles so a denied OS operation
    // fails promptly; this does not terminate or pretend to reap the child.
    child?.stdout?.destroy();
    child?.stderr?.destroy();
    child?.unref();
    failure.message += `; own fixture=${fixture}`;
    throw failure;
  } finally {
    clearTimeout(watchdog);
    clearTimeout(closeTimer);
  }
}
