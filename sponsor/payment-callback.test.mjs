import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

const sponsorDir = path.dirname(fileURLToPath(import.meta.url));
const sandbox = fs.mkdtempSync(path.join(sponsorDir, ".payment-sandbox-"));
const keys = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const privateKey = keys.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const publicKey = keys.publicKey.export({ type: "spki", format: "pem" }).toString();
const WECHAT_API_V3_KEY = "0123456789abcdef0123456789abcdef";
const WECHAT_PLATFORM_SERIAL = "synthetic-wechat-platform-serial";
let server;
let base;
let serverOutput = "";

function sampleOrder(id, channel, amount, handle = null) {
  return {
    id, channel, amount, currency: "CNY", note: "synthetic test", plan: handle ? "personal" : null,
    handle, status: "pending", outTradeNo: `AC-${id.toUpperCase()}`,
    createdAt: new Date().toISOString(), paidAt: null, transactionId: null,
  };
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

function stageServer(directory) {
  for (const file of ["server.mjs", "state-store.mjs", "payment-security.mjs"]) {
    fs.copyFileSync(path.join(sponsorDir, file), path.join(directory, file));
  }
}

async function start(directory, extraEnv = {}) {
  const port = await unusedPort();
  const url = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: directory,
    env: {
      PATH: process.env.PATH ?? "",
      SystemRoot: process.env.SystemRoot ?? "",
      TEMP: process.env.TEMP ?? os.tmpdir(),
      TMP: process.env.TMP ?? os.tmpdir(),
      HOST: "127.0.0.1",
      PORT: String(port),
      PUBLIC_BASE_URL: url,
      DEMO: "0",
      ...extraEnv,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk.toString(); });
  child.stderr.on("data", (chunk) => { output += chunk.toString(); });
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`synthetic sponsor server exited ${child.exitCode}: ${output}`);
    try {
      if ((await fetch(`${url}/`)).ok) return { child, url, output: () => output };
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  child.kill();
  throw new Error(`synthetic sponsor server did not start: ${output}`);
}

async function stop(child) {
  if (child && child.exitCode === null && child.signalCode === null) {
    child.kill();
    await new Promise((resolve) => child.once("exit", resolve));
  }
}

function alipaySignature(form) {
  const unsigned = Object.keys(form)
    .filter((key) => key !== "sign" && key !== "sign_type" && form[key] !== "" && form[key] != null)
    .sort()
    .map((key) => `${key}=${form[key]}`)
    .join("&");
  return crypto.createSign("RSA-SHA256").update(unsigned).sign(privateKey, "base64");
}

function signedAlipay(overrides = {}) {
  const form = {
    app_id: "synthetic-app-id",
    auth_app_id: "synthetic-app-id",
    seller_id: "synthetic-seller-id",
    out_trade_no: "AC-ALIPAY-PLAN",
    total_amount: "72.00",
    trade_no: "synthetic-alipay-transaction",
    trade_status: "TRADE_SUCCESS",
    sign_type: "RSA2",
    ...overrides,
  };
  form.sign = alipaySignature(form);
  return form;
}

async function postAlipay(form, raw = new URLSearchParams(form).toString()) {
  return await fetch(`${base}/callback/alipay`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: raw,
  });
}

function wechatEvent(transaction) {
  const nonce = "0123456789ab";
  const associatedData = "synthetic-associated-data";
  const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(WECHAT_API_V3_KEY), Buffer.from(nonce));
  cipher.setAAD(Buffer.from(associatedData));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(transaction), "utf8"), cipher.final()]);
  const ciphertext = Buffer.concat([encrypted, cipher.getAuthTag()]).toString("base64");
  return JSON.stringify({
    id: "synthetic-event-id",
    event_type: "TRANSACTION.SUCCESS",
    resource_type: "encrypt-resource",
    resource: { original_type: "transaction", algorithm: "AEAD_AES_256_GCM", nonce, associated_data: associatedData, ciphertext },
  });
}

async function postWechat(transaction, serial = WECHAT_PLATFORM_SERIAL, timestampOverride) {
  const raw = wechatEvent(transaction);
  const timestamp = String(timestampOverride ?? Math.floor(Date.now() / 1000));
  const nonce = crypto.randomBytes(12).toString("hex");
  const signature = crypto.createSign("RSA-SHA256")
    .update(`${timestamp}\n${nonce}\n${raw}\n`)
    .sign(privateKey, "base64");
  return await fetch(`${base}/callback/wechat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "wechatpay-timestamp": timestamp,
      "wechatpay-nonce": nonce,
      "wechatpay-signature": signature,
      "wechatpay-serial": serial,
    },
    body: raw,
  });
}

before(async () => {
  stageServer(sandbox);
  fs.writeFileSync(path.join(sandbox, "synthetic-private.pem"), privateKey, { mode: 0o600 });
  fs.writeFileSync(path.join(sandbox, "synthetic-public.pem"), publicKey, { mode: 0o600 });
  fs.writeFileSync(path.join(sandbox, "synthetic-wechat-platform.pem"), publicKey, { mode: 0o600 });
  const existingExpiry = new Date(Date.now() + 5 * 864e5).toISOString();
  fs.writeFileSync(path.join(sandbox, "orders.json"), JSON.stringify({
    "alipay-plan": sampleOrder("alipay-plan", "alipay", 72, "synthetic-handle"),
    "legacy-alipay": { ...sampleOrder("legacy-alipay", "alipay", 10), outTradeNo: "AC-LEGACY-ALIPAY", currency: undefined },
    "epay-alipay": { ...sampleOrder("epay-alipay", "alipay", 10), outTradeNo: "AC-EPAY-ALIPAY" },
    "epay-wechat": { ...sampleOrder("epay-wechat", "wechat", 10), outTradeNo: "AC-EPAY-WECHAT" },
    "wechat-native": { ...sampleOrder("wechat-native", "wechat", 10), outTradeNo: "AC-WECHAT-NATIVE" },
    "vmq-alipay": { ...sampleOrder("vmq-alipay", "alipay", 25), outTradeNo: "AC-VMQ-ALIPAY" },
  }, null, 2) + "\n");
  fs.writeFileSync(path.join(sandbox, "subscribers.json"), JSON.stringify({
    "synthetic-handle": { handle: "synthetic-handle", expiresAt: existingExpiry, lastOrderId: "previous-order" },
  }, null, 2) + "\n");
  fs.writeFileSync(path.join(sandbox, "activations.json"), "{}\n");
  const started = await start(sandbox, {
    ALIPAY_APP_ID: "synthetic-app-id",
    ALIPAY_SELLER_ID: "synthetic-seller-id",
    ALIPAY_PRIVATE_KEY_PATH: "synthetic-private.pem",
    ALIPAY_PUBLIC_KEY_PATH: "synthetic-public.pem",
    EPAY_API_URL: "https://epay.example.test",
    EPAY_PID: "synthetic-epay-pid",
    EPAY_KEY: "synthetic-epay-secret",
    VMQ_URL: "https://vmq.example.test",
    VMQ_KEY: "synthetic-vmq-secret",
    WECHAT_MCHID: "synthetic-wechat-merchant-id",
    WECHAT_SERIAL: "synthetic-wechat-api-serial",
    WECHAT_APPID: "synthetic-wechat-app-id",
    WECHAT_APIV3_KEY: WECHAT_API_V3_KEY,
    WECHAT_PRIVATE_KEY_PATH: "synthetic-private.pem",
    WECHAT_PLATFORM_SERIAL,
    WECHAT_PLATFORM_PUBLIC_KEY_PATH: "synthetic-wechat-platform.pem",
  });
  server = started.child;
  base = started.url;
  serverOutput = started.output();
});

after(async () => {
  await stop(server);
  fs.rmSync(sandbox, { recursive: true, force: true });
});

test("invalid RSA2-signed Alipay notices cannot change a local order or grant an entitlement", async () => {
  const orderFile = path.join(sandbox, "orders.json");
  const original = fs.readFileSync(orderFile, "utf8");
  const invalidForms = [
    signedAlipay({ app_id: "other-app" }),
    signedAlipay({ auth_app_id: "other-app" }),
    signedAlipay({ seller_id: "other-seller" }),
    signedAlipay({ out_trade_no: "unknown-order" }),
    signedAlipay({ total_amount: "71.99" }),
    signedAlipay({ currency: "USD" }),
    signedAlipay({ trade_status: "WAIT_BUYER_PAY" }),
    signedAlipay({ trade_no: "" }),
    signedAlipay({ sign_type: "RSA" }),
    signedAlipay({ out_trade_no: "AC-EPAY-WECHAT", total_amount: "10.00" }),
    signedAlipay({ out_trade_no: "AC-LEGACY-ALIPAY", total_amount: "10.00" }),
  ];
  for (const form of invalidForms) {
    const response = await postAlipay(form);
    assert.notEqual(response.status, 200, `unexpected acceptance of ${JSON.stringify({ ...form, sign: "[redacted]" })}`);
    assert.equal(fs.readFileSync(orderFile, "utf8"), original, "invalid callback changed order state");
  }

  const duplicateField = await postAlipay({}, "app_id=one&app_id=two");
  assert.equal(duplicateField.status, 400);
  assert.equal(fs.readFileSync(orderFile, "utf8"), original);
  assert.equal(fs.existsSync(path.join(sandbox, "license-keys.json")), true);
});

test("valid and concurrent duplicate Alipay notifications fulfill exactly once", async () => {
  const before = JSON.parse(fs.readFileSync(path.join(sandbox, "subscribers.json"), "utf8"))["synthetic-handle"].expiresAt;
  const form = signedAlipay();
  const responses = await Promise.all(Array.from({ length: 20 }, () => postAlipay(form)));
  assert.ok(responses.every((response) => response.status === 200));

  const orders = JSON.parse(fs.readFileSync(path.join(sandbox, "orders.json"), "utf8"));
  const subs = JSON.parse(fs.readFileSync(path.join(sandbox, "subscribers.json"), "utf8"));
  assert.equal(orders["alipay-plan"].status, "paid");
  assert.equal(orders["alipay-plan"].transactionId, "synthetic-alipay-transaction");
  assert.equal(subs["synthetic-handle"].lastOrderId, "alipay-plan");
  assert.equal(Date.parse(subs["synthetic-handle"].expiresAt), Date.parse(before) + 30 * 864e5);
});

test("WeChat verifies signed encrypted callbacks and rejects local-order or certificate-pin mismatches", async () => {
  const orderFile = path.join(sandbox, "orders.json");
  const original = fs.readFileSync(orderFile, "utf8");
  const transaction = {
    mchid: "synthetic-wechat-merchant-id",
    appid: "synthetic-wechat-app-id",
    out_trade_no: "AC-WECHAT-NATIVE",
    trade_state: "SUCCESS",
    transaction_id: "synthetic-wechat-transaction",
    amount: { total: 1000, currency: "CNY" },
  };
  const invalid = [
    [{ mchid: "other-merchant" }, WECHAT_PLATFORM_SERIAL],
    [{ appid: "other-app" }, WECHAT_PLATFORM_SERIAL],
    [{ out_trade_no: "unknown-order" }, WECHAT_PLATFORM_SERIAL],
    [{ amount: { total: 1001, currency: "CNY" } }, WECHAT_PLATFORM_SERIAL],
    [{ amount: { total: 1000, currency: "USD" } }, WECHAT_PLATFORM_SERIAL],
    [{ trade_state: "NOTPAY" }, WECHAT_PLATFORM_SERIAL],
    [{}, "wrong-platform-serial"],
  ];
  for (const [overrides, serial] of invalid) {
    const response = await postWechat({ ...transaction, ...overrides }, serial);
    assert.notEqual(response.status, 200);
    assert.equal(fs.readFileSync(orderFile, "utf8"), original, "invalid WeChat callback changed order state");
  }
  const stale = await postWechat(transaction, WECHAT_PLATFORM_SERIAL, Math.floor(Date.now() / 1000) - 301);
  assert.notEqual(stale.status, 200, "stale signed callback must be rejected");
  assert.equal(fs.readFileSync(orderFile, "utf8"), original);

  const responses = await Promise.all(Array.from({ length: 20 }, () => postWechat(transaction)));
  assert.ok(responses.every((response) => response.status === 200));
  const orders = JSON.parse(fs.readFileSync(orderFile, "utf8"));
  assert.equal(orders["wechat-native"].status, "paid");
  assert.equal(orders["wechat-native"].transactionId, "synthetic-wechat-transaction");
});

function epaySign(form, key) {
  const unsigned = Object.keys(form)
    .filter((name) => name !== "sign" && name !== "sign_type" && form[name] !== "" && form[name] != null)
    .sort()
    .map((name) => `${name}=${form[name]}`)
    .join("&") + key;
  return crypto.createHash("md5").update(unsigned, "utf8").digest("hex");
}

test("Epay verifies configured merchant and binds its signed amount and channel", async () => {
  const orderFile = path.join(sandbox, "orders.json");
  const original = fs.readFileSync(orderFile, "utf8");
  const form = {
    pid: "synthetic-epay-pid", type: "alipay", out_trade_no: "AC-EPAY-ALIPAY", money: "10.00",
    trade_status: "TRADE_SUCCESS", trade_no: "synthetic-epay-transaction", sign_type: "MD5",
  };
  const invalid = { ...form, pid: "other-pid" };
  invalid.sign = epaySign(invalid, "synthetic-epay-secret");
  const rejected = await fetch(`${base}/callback/epay?${new URLSearchParams(invalid)}`);
  assert.equal(rejected.status, 400);
  assert.equal(fs.readFileSync(orderFile, "utf8"), original);

  form.sign = epaySign(form, "synthetic-epay-secret");
  const accepted = await fetch(`${base}/callback/epay?${new URLSearchParams(form)}`);
  assert.equal(accepted.status, 200);
  const orders = JSON.parse(fs.readFileSync(orderFile, "utf8"));
  assert.equal(orders["epay-alipay"].status, "paid");
});

test("VMQ settlement binds the base order amount and allows only the upstream nine-fen collision range", async () => {
  const orderFile = path.join(sandbox, "orders.json");
  const original = fs.readFileSync(orderFile, "utf8");
  const fields = { payId: "AC-VMQ-ALIPAY", param: "vmq-alipay", type: "2", price: "25.00", reallyPrice: "25.10" };
  const bad = { ...fields };
  bad.sign = crypto.createHash("md5").update(`${bad.payId}${bad.param}${bad.type}${bad.price}${bad.reallyPrice}synthetic-vmq-secret`).digest("hex");
  const rejected = await fetch(`${base}/callback/vmq?${new URLSearchParams(bad)}`);
  assert.equal(rejected.status, 400);
  assert.equal(fs.readFileSync(orderFile, "utf8"), original);

  const good = { ...fields, reallyPrice: "25.09" };
  good.sign = crypto.createHash("md5").update(`${good.payId}${good.param}${good.type}${good.price}${good.reallyPrice}synthetic-vmq-secret`).digest("hex");
  const accepted = await fetch(`${base}/callback/vmq?${new URLSearchParams(good)}`);
  assert.equal(accepted.status, 200);
  const orders = JSON.parse(fs.readFileSync(orderFile, "utf8"));
  assert.equal(orders["vmq-alipay"].status, "paid");
});
