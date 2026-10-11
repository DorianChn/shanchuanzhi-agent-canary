import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

const sponsorDir = path.dirname(fileURLToPath(import.meta.url));
const sandboxes = new Set();
after(() => {
  for (const directory of sandboxes) fs.rmSync(directory, { recursive: true, force: true });
});

function makeSandbox() {
  const directory = fs.mkdtempSync(path.join(sponsorDir, ".state-sandbox-"));
  sandboxes.add(directory);
  for (const file of ["server.mjs", "state-store.mjs", "payment-security.mjs"]) {
    fs.copyFileSync(path.join(sponsorDir, file), path.join(directory, file));
  }
  return directory;
}

async function unusedPort() {
  const probe = http.createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const address = probe.address();
  assert.ok(address && typeof address !== "string");
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

async function start(directory) {
  const port = await unusedPort();
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: directory,
    env: {
      PATH: process.env.PATH ?? "",
      SystemRoot: process.env.SystemRoot ?? "",
      TEMP: process.env.TEMP ?? os.tmpdir(),
      TMP: process.env.TMP ?? os.tmpdir(),
      HOST: "127.0.0.1",
      PORT: String(port),
      PUBLIC_BASE_URL: `http://127.0.0.1:${port}`,
      DEMO: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk.toString(); });
  child.stderr.on("data", (chunk) => { output += chunk.toString(); });
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`sponsor server exited ${child.exitCode}: ${output}`);
    try {
      if ((await fetch(`http://127.0.0.1:${port}/`)).ok) return { child, url: `http://127.0.0.1:${port}` };
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  await stop(child);
  throw new Error(`sponsor server did not start: ${output}`);
}

async function expectStartupFailure(directory) {
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: directory,
    env: {
      PATH: process.env.PATH ?? "",
      SystemRoot: process.env.SystemRoot ?? "",
      TEMP: process.env.TEMP ?? os.tmpdir(),
      TMP: process.env.TMP ?? os.tmpdir(),
      HOST: "127.0.0.1",
      PORT: "0",
      DEMO: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk.toString(); });
  child.stderr.on("data", (chunk) => { output += chunk.toString(); });
  const exited = new Promise((resolve) => child.once("exit", (code) => resolve(code)));
  const code = await Promise.race([exited, new Promise((resolve) => setTimeout(() => resolve(null), 5000))]);
  if (code === null) {
    await stop(child);
    assert.fail("corrupt sponsor state unexpectedly started a listening service");
  }
  assert.notEqual(code, 0, output);
  return output;
}

async function stop(child) {
  if (child && child.exitCode === null && child.signalCode === null) {
    child.kill();
    await new Promise((resolve) => child.once("exit", resolve));
  }
}

function writeHealthyStores(directory) {
  fs.writeFileSync(path.join(directory, "orders.json"), "{}\n");
  fs.writeFileSync(path.join(directory, "subscribers.json"), "{}\n");
  fs.writeFileSync(path.join(directory, "activations.json"), "{}\n");
}

test("malformed, empty, truncated, unreadable, or wrong-shape stores refuse startup without rewriting data", async () => {
  const cases = [
    ["orders.json", "{"],
    ["orders.json", ""],
    ["orders.json", "{\"partial\":"],
    ["subscribers.json", "not-json"],
    ["subscribers.json", "{\"synthetic-handle\":{\"expiresAt\":\"not-a-date\"}}"],
    ["activations.json", "[]"],
    ["activations.json", "{\"synthetic-handle\":{\"machines\":{\"bad-hash\":123}}}"],
  ];
  for (const [name, contents] of cases) {
    const directory = makeSandbox();
    writeHealthyStores(directory);
    fs.writeFileSync(path.join(directory, name), contents);
    const output = await expectStartupFailure(directory);
    assert.match(output, /Business state|business state|invalid JSON|JSON object|regular file/i);
    assert.equal(fs.readFileSync(path.join(directory, name), "utf8"), contents);
    assert.equal(fs.existsSync(path.join(directory, "license-keys.json")), false, "invalid state must not create a new signing identity");
  }

  const directoryPath = makeSandbox();
  writeHealthyStores(directoryPath);
  fs.rmSync(path.join(directoryPath, "orders.json"));
  fs.mkdirSync(path.join(directoryPath, "orders.json"));
  await expectStartupFailure(directoryPath);
  assert.equal(fs.statSync(path.join(directoryPath, "orders.json")).isDirectory(), true);
  assert.equal(fs.existsSync(path.join(directoryPath, "license-keys.json")), false);
});

test("damaged or mismatched signing keys are never silently regenerated", async () => {
  const keyPathDirectory = makeSandbox();
  writeHealthyStores(keyPathDirectory);
  const keyDirectory = path.join(keyPathDirectory, "license-keys.json");
  fs.mkdirSync(keyDirectory);
  const pathOutput = await expectStartupFailure(keyPathDirectory);
  assert.match(pathOutput, /damaged or unsafe|regular file/i);
  assert.equal(fs.statSync(keyDirectory).isDirectory(), true, "an abnormal key path must not be replaced by a new identity");

  const malformed = makeSandbox();
  writeHealthyStores(malformed);
  const keyFile = path.join(malformed, "license-keys.json");
  const original = "{\"privateKey\":\n";
  fs.writeFileSync(keyFile, original);
  const malformedOutput = await expectStartupFailure(malformed);
  assert.match(malformedOutput, /damaged or unsafe|invalid JSON/i);
  assert.equal(fs.readFileSync(keyFile, "utf8"), original);

  const mismatched = makeSandbox();
  writeHealthyStores(mismatched);
  const first = crypto.generateKeyPairSync("ed25519");
  const second = crypto.generateKeyPairSync("ed25519");
  const mismatch = {
    publicKey: first.publicKey.export({ type: "spki", format: "pem" }).toString(),
    privateKey: second.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  };
  fs.writeFileSync(path.join(mismatched, "license-keys.json"), JSON.stringify(mismatch), { mode: 0o600 });
  await expectStartupFailure(mismatched);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(mismatched, "license-keys.json"), "utf8")), mismatch);
});

test("missing signing key is initialized once and survives restart unchanged", async () => {
  const directory = makeSandbox();
  writeHealthyStores(directory);
  let running = await start(directory);
  const keyFile = path.join(directory, "license-keys.json");
  const first = fs.readFileSync(keyFile, "utf8");
  const parsed = JSON.parse(first);
  assert.match(parsed.publicKey, /BEGIN PUBLIC KEY/);
  assert.match(parsed.privateKey, /BEGIN PRIVATE KEY/);
  if (process.platform !== "win32") assert.equal(fs.statSync(keyFile).mode & 0o777, 0o600);
  await stop(running.child);

  running = await start(directory);
  assert.equal(fs.readFileSync(keyFile, "utf8"), first);
  await stop(running.child);
});

test("startup recovers interrupted fulfillment idempotently across restarts", async () => {
  const directory = makeSandbox();
  const expiryAfterSubscriptionWrite = new Date(Date.now() + 20 * 864e5).toISOString();
  const beforeSecondOrder = new Date(Date.now() + 2 * 864e5).toISOString();
  const orders = {
    afterSubscriptionWrite: {
      id: "afterSubscriptionWrite", channel: "alipay", amount: 72, currency: "CNY", status: "paid_pending_fulfillment",
      outTradeNo: "AC-RECOVERY-1", plan: "personal", handle: "already-applied", paidAt: "2026-10-01T00:00:00.000Z",
      transactionId: "synthetic-txn-1",
    },
    beforeSubscriptionWrite: {
      id: "beforeSubscriptionWrite", channel: "wechat", amount: 72, currency: "CNY", status: "paid_pending_fulfillment",
      outTradeNo: "AC-RECOVERY-2", plan: "personal", handle: "needs-application", paidAt: "2026-10-02T00:00:00.000Z",
      transactionId: "synthetic-txn-2",
    },
  };
  fs.writeFileSync(path.join(directory, "orders.json"), JSON.stringify(orders));
  fs.writeFileSync(path.join(directory, "subscribers.json"), JSON.stringify({
    "already-applied": { expiresAt: expiryAfterSubscriptionWrite, lastOrderId: "afterSubscriptionWrite" },
    "needs-application": { expiresAt: beforeSecondOrder, lastOrderId: "previous-order" },
  }));
  fs.writeFileSync(path.join(directory, "activations.json"), "{}\n");

  let running = await start(directory);
  const settled = JSON.parse(fs.readFileSync(path.join(directory, "orders.json"), "utf8"));
  const subscriptions = JSON.parse(fs.readFileSync(path.join(directory, "subscribers.json"), "utf8"));
  assert.equal(settled.afterSubscriptionWrite.status, "paid");
  assert.equal(subscriptions["already-applied"].expiresAt, expiryAfterSubscriptionWrite);
  assert.equal(settled.beforeSubscriptionWrite.status, "paid");
  assert.equal(subscriptions["needs-application"].lastOrderId, "beforeSubscriptionWrite");
  const recoveredExpiry = subscriptions["needs-application"].expiresAt;
  assert.ok(Date.parse(recoveredExpiry) >= Date.now() + 29 * 864e5);
  await stop(running.child);

  running = await start(directory);
  assert.equal(JSON.parse(fs.readFileSync(path.join(directory, "subscribers.json"), "utf8"))["needs-application"].expiresAt, recoveredExpiry);
  await stop(running.child);
});
