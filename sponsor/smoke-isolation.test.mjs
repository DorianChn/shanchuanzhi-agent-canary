import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runSmokeDriver, smokeEnvironment } from "./smoke-process.mjs";

const sponsorDir = path.dirname(fileURLToPath(import.meta.url));
const protectedFiles = new Map([
  ["orders.json", '{"sentinel":"keep-orders"}\n'],
  ["subscribers.json", '{"sentinel":"keep-subscribers"}\n'],
  ["activations.json", '{"sentinel":"keep-activations"}\n'],
  ["license-keys.json", '{"sentinel":"keep-synthetic-keys"}\n'],
  [".env", "SYNTHETIC_SENTINEL=keep-env\n"],
]);

test("smoke collision recovers without changing existing state or credentials", async () => {
  const sandbox = fs.mkdtempSync(path.join(sponsorDir, ".smoke-sandbox-"));
  let cleanupSafe = false;
  try {
    for (const file of ["server.mjs", "state-store.mjs", "payment-security.mjs", "smoke.mjs", "smoke-process.mjs"]) {
      fs.copyFileSync(path.join(sponsorDir, file), path.join(sandbox, file));
    }
    for (const [name, contents] of protectedFiles) {
      fs.writeFileSync(path.join(sandbox, name), contents);
    }
    const result = await runSmokeDriver(path.join(sandbox, "smoke.mjs"), {
      cwd: sandbox, timeout: 30_000,
      env: smokeEnvironment({ SMOKE_TEST_FORCE_EADDRINUSE: "1" }),
    });
    cleanupSafe = true;
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.equal(result.timedOut, false);
    assert.match(result.stderr, /EADDRINUSE/, "the first startup should encounter the injected port collision");
    assert.match(result.stderr, /retrying with a fresh ephemeral port/, "the smoke test should recover on a new port");
    assert.equal((result.stdout.match(/^ok - /gm) ?? []).length, 12, "all original smoke checks must pass");
    assert.equal(fs.existsSync(result.fixture), false, "supervisor fixture must be removed");
    for (const [name, contents] of protectedFiles) {
      assert.equal(fs.readFileSync(path.join(sandbox, name), "utf8"), contents, `${name} was modified by the smoke test`);
    }
  } finally {
    if (cleanupSafe) fs.rmSync(sandbox, { recursive: true, force: true });
    else console.error(`Smoke cleanup not verified; preserve own fixture for parent: ${sandbox}`);
  }
  assert.equal(fs.existsSync(sandbox), false);
});

function alive(pid) {
  try { process.kill(pid, 0); return true; }
  catch (error) { if (error.code === "ESRCH") return false; throw error; }
}

test("watchdog remains failure and reaps the stalled driver/server tree and fixture", async () => {
  const sandbox = fs.mkdtempSync(path.join(sponsorDir, ".smoke-watchdog-"));
  let cleanupSafe = false;
  try {
    // No server/payment implementation or network: both processes only keep a timer.
    // The server's IPC ready receipt proves it started before the watchdog fired.
    const driver = path.join(sandbox, "stalled-driver.mjs");
    fs.writeFileSync(driver, `
      import { spawn } from 'node:child_process';
      import fs from 'node:fs'; import path from 'node:path';
      const fixture = process.argv[3];
      fs.writeFileSync(path.join(fixture, 'synthetic-fixture.txt'), 'SYNTHETIC_ONLY');
      const server = spawn(process.execPath, ['-e',
        'process.send({pid:process.pid});setInterval(()=>{},1000);'],
        {env:process.env,stdio:['ignore','ignore','ignore','ipc']});
      server.once('message', ready => {
        console.log(JSON.stringify({driver:process.pid,server:ready.pid}));
      });
      setInterval(()=>{},1000);
    `);
    const result = await runSmokeDriver(driver, { cwd: sandbox, timeout: 2000 });
    cleanupSafe = true;
    const ready = JSON.parse(result.stdout.trim());
    assert.equal(ready.driver, result.pid);
    assert.ok(Number.isSafeInteger(ready.server) && ready.server > 0);
    assert.equal(result.timedOut, true);
    assert.equal(result.error?.code, "ETIMEDOUT");
    assert.notEqual(result.status, 0, "watchdog failure must not be converted to success");
    for (let attempt = 0; attempt < 40 && (alive(ready.driver) || alive(ready.server)); attempt++) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.equal(alive(ready.driver), false, "stalled driver is still alive");
    assert.equal(alive(ready.server), false, "stalled server descendant is still alive");
    assert.equal(fs.existsSync(result.fixture), false, "watchdog fixture must be removed");
  } finally {
    if (cleanupSafe) fs.rmSync(sandbox, { recursive: true, force: true });
    else console.error(`Watchdog cleanup not verified; preserve own fixture for parent: ${sandbox}`);
  }
  assert.equal(fs.existsSync(sandbox), false);
});
