import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

const sponsorDir = path.dirname(fileURLToPath(import.meta.url));
const sandboxes = new Set();
after(() => {
  for (const directory of sandboxes) fs.rmSync(directory, { recursive: true, force: true });
});

function makeSandbox() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "agent-canary-grant-test-"));
  sandboxes.add(directory);
  for (const file of ["grant.mjs", "state-store.mjs"]) {
    fs.copyFileSync(path.join(sponsorDir, file), path.join(directory, file));
  }
  return directory;
}

function runGrant(directory, ...args) {
  return spawnSync(process.execPath, ["grant.mjs", "grant", ...args], { cwd: directory, encoding: "utf8" });
}

test("manual grant refuses corrupted state and leaves both business files unchanged", () => {
  const directory = makeSandbox();
  const orders = "{\"partial\":";
  const subscribers = "{\"other\":{\"expiresAt\":\"2030-01-01T00:00:00.000Z\"}}\n";
  fs.writeFileSync(path.join(directory, "orders.json"), orders);
  fs.writeFileSync(path.join(directory, "subscribers.json"), subscribers);
  fs.writeFileSync(path.join(directory, "activations.json"), "{}\n");

  const result = runGrant(directory, "synthetic-handle", "1");
  assert.notEqual(result.status, 0);
  assert.equal(fs.readFileSync(path.join(directory, "orders.json"), "utf8"), orders);
  assert.equal(fs.readFileSync(path.join(directory, "subscribers.json"), "utf8"), subscribers);
  assert.equal(fs.existsSync(path.join(directory, ".sponsor-state.lock")), false);
});

test("manual grant atomically confirms only matching synthetic orders", () => {
  const directory = makeSandbox();
  const previousExpiry = new Date(Date.now() + 5 * 864e5).toISOString();
  fs.writeFileSync(path.join(directory, "orders.json"), JSON.stringify({
    syntheticOrder: { id: "syntheticOrder", status: "pending_manual", handle: "synthetic-handle", createdAt: new Date().toISOString() },
    otherOrder: { id: "otherOrder", status: "pending_manual", handle: "different-handle", createdAt: new Date().toISOString() },
  }));
  fs.writeFileSync(path.join(directory, "subscribers.json"), JSON.stringify({
    "synthetic-handle": { handle: "synthetic-handle", expiresAt: previousExpiry, lastOrderId: "previous-order" },
  }));
  fs.writeFileSync(path.join(directory, "activations.json"), "{}\n");

  const result = runGrant(directory, "synthetic-handle", "1");
  assert.equal(result.status, 0, result.stderr);
  const orders = JSON.parse(fs.readFileSync(path.join(directory, "orders.json"), "utf8"));
  const subscribers = JSON.parse(fs.readFileSync(path.join(directory, "subscribers.json"), "utf8"));
  assert.equal(orders.syntheticOrder.status, "confirmed_manual");
  assert.equal(orders.otherOrder.status, "pending_manual");
  assert.equal(subscribers["synthetic-handle"].lastOrderId, "manual:syntheticOrder");
  assert.ok(Date.parse(subscribers["synthetic-handle"].expiresAt) >= Date.parse(previousExpiry) + 29 * 864e5);
});
