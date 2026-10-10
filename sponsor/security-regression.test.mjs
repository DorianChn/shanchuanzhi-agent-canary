import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

const sponsorDir = path.dirname(fileURLToPath(import.meta.url));
const sandbox = fs.mkdtempSync(path.join(sponsorDir, ".security-sandbox-"));
let server;
let base;
let stdout = "";
let stderr = "";

before(async () => {
  for (const file of ["server.mjs", "state-store.mjs", "payment-security.mjs"]) {
    fs.copyFileSync(path.join(sponsorDir, file), path.join(sandbox, file));
  }
  const probe = http.createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const address = probe.address();
  assert.ok(address && typeof address !== "string");
  const port = address.port;
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  base = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ["server.mjs"], {
    cwd: sandbox,
    env: {
      PATH: process.env.PATH ?? "",
      SystemRoot: process.env.SystemRoot ?? "",
      TEMP: process.env.TEMP ?? os.tmpdir(),
      TMP: process.env.TMP ?? os.tmpdir(),
      HOST: "127.0.0.1",
      PORT: String(port),
      DEMO: "1",
      PUBLIC_BASE_URL: base,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  server.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${base}/`)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`sponsor server did not start: ${stderr}`);
});

after(async () => {
  if (server && server.exitCode === null && server.signalCode === null) {
    server.kill();
    await new Promise((resolve) => server.once("exit", resolve));
  }
  fs.rmSync(sandbox, { recursive: true, force: true });
});

test("oversized request bodies get 413 without retaining the oversized body", async () => {
  const response = await fetch(`${base}/api/order`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: `{"note":"${"x".repeat(1_100_000)}"}`,
  });
  assert.equal(response.status, 413);
  assert.equal(await response.text(), "request body too large");

  const followUp = await fetch(`${base}/api/order`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ channel: "wechat", plan: "personal", handle: "synthetic-test" }),
  });
  assert.equal(followUp.status, 200, stderr);
});

test("demo payment page escapes an untrusted subscription handle", async () => {
  const handle = `<svg/onload=alert(1)> & \"quoted\"`;
  const created = await fetch(`${base}/api/order`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ channel: "wechat", plan: "personal", handle }),
  });
  assert.equal(created.status, 200);
  const order = await created.json();
  const page = await fetch(`${base}/demo/pay/${order.orderId}`);
  const html = await page.text();
  assert.equal(page.status, 200);
  assert.ok(!html.includes(handle), "raw user-controlled handle must not appear in HTML");
  assert.ok(html.includes("&lt;svg/onload=alert(1)&gt; &amp; &quot;quoted&quot;"));
});

test("manual claim input cannot forge sponsor log lines or terminal colors", async () => {
  const handle = "viewer\r\n[sponsor] forged\u001b[31m";
  const response = await fetch(`${base}/api/manual-claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ channel: "wechat", plan: "personal", handle }),
  });
  assert.equal(response.status, 200);
  assert.ok(stdout.includes("[sponsor] manual claim: handle=[redacted]"));
  assert.ok(!stdout.includes("viewer"), "customer handle must not be written to sponsor logs");
  assert.ok(!stdout.includes("\u001b[31m"));
  assert.ok(!stdout.includes("\r\n[sponsor] forged"));
});
