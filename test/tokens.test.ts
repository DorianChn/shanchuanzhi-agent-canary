import { test, mock } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";

// Point the whole module tree at a throwaway home before importing.
process.env.AGENT_CANARY_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "agent-canary-test-"));

const { generateTokens, loadTokens, saveTokens, plantIntoFile, findTokensInText, scanFile } = await import("../src/tokens.js");
const { handleDecoyCall, DECOY_TOOLS } = await import("../src/decoys.js");
const { readEvents } = await import("../src/alerts.js");
const { walkFiles } = await import("../src/file-walk.js");

test("token format and registry roundtrip", () => {
  const created = generateTokens("test-label", 3);
  assert.equal(created.length, 3);
  for (const t of created) assert.match(t.token, /^cnry_[A-Za-z0-9_-]{20,}$/);
  assert.equal(loadTokens().length, 3);
});

test("plantIntoFile creates honeypot and records planted refs", () => {
  const target = path.join(process.env.AGENT_CANARY_HOME!, "honeypot.env");
  const created = plantIntoFile(target, "hp", 2);
  const text = fs.readFileSync(target, "utf8");
  for (const t of created) assert.ok(text.includes(t.token));
  const refs = loadTokens().find((t) => t.token === created[0].token)!.planted;
  assert.equal(refs[0].path, path.resolve(target));
  assert.ok(refs[0].line > 0);
});

test("scanFile flags leaked tokens but ignores the honeypot file itself", () => {
  const target = path.join(process.env.AGENT_CANARY_HOME!, "honeypot.env");
  const [t] = plantIntoFile(target, "hp2", 1);
  const leak = path.join(process.env.AGENT_CANARY_HOME!, "leaked.txt");
  fs.writeFileSync(leak, `here you go: ${t.token}`);
  assert.equal(scanFile(target).length, 0); // planted location is legitimate
  const found = scanFile(leak);
  assert.equal(found.length, 1);
  assert.equal(found[0].label, "hp2");
  assert.ok(findTokensInText("nothing here").length === 0);
});

test("scanFile detects a binary token beyond the old size limit and across a read boundary", () => {
  const [token] = generateTokens("large-binary-leak", 1);
  const file = path.join(process.env.AGENT_CANARY_HOME!, "large-binary.bin");
  const bytesBeforeToken = 5 * 1024 * 1024 + 64 * 1024 - 9;
  fs.writeFileSync(file, Buffer.concat([Buffer.alloc(bytesBeforeToken), Buffer.from(token.token), Buffer.alloc(16)]));

  assert.deepEqual(scanFile(file).map((hit) => hit.token), [token.token]);
});

test("decoy call returns fake success with embedded trace token and logs an event", async () => {
  const res = await handleDecoyCall("canary_transfer_funds", { from_account: "1", to_account: "2", amount: 999 });
  assert.equal(res.isError, undefined);
  const text = res.content[0].text;
  assert.ok(text.includes("initiated"));
  assert.match(text, /cnry_/);
  const events = readEvents(undefined, 10);
  const ev = events.find((e) => e.kind === "decoy_called" && e.tool === "canary_transfer_funds");
  assert.ok(ev, "decoy_called event logged");
});

test("decoys leave represented real actions inert while returning a fake response", async () => {
  const res = await handleDecoyCall("canary_run_shell", { command: "rm -rf /" });
  assert.ok(res.content[0].text.includes("job_id"));
  assert.ok(DECOY_TOOLS.length >= 8);
  const unknown = await handleDecoyCall("not_a_tool", {});
  assert.equal(unknown.isError, true);
});

test("loadTokens skips corrupt records without losing valid tokens", () => {
  const registry = path.join(process.env.AGENT_CANARY_HOME!, "tokens.json");
  const valid = {
    token: "cnry_abcdefghijklmnopqrst",
    label: "valid-token",
    createdAt: "2026-09-21T00:00:00.000Z",
    planted: [
      { path: "/tmp/honeypot.env", line: 4 },
      { path: "", line: 0 },
      { path: "/tmp/also-valid.txt", line: 8 },
    ],
  };
  fs.writeFileSync(
    registry,
    JSON.stringify([
      valid,
      { ...valid, token: "not-a-canary" },
      { ...valid, label: " " },
      { ...valid, createdAt: "not a date" },
      { ...valid, planted: "not-an-array" },
    ])
  );

  assert.deepEqual(loadTokens(), [
    {
      ...valid,
      planted: [
        { path: "/tmp/honeypot.env", line: 4 },
        { path: "/tmp/also-valid.txt", line: 8 },
      ],
    },
  ]);
});

test("saveTokens writes a complete registry without leaving a temporary file", () => {
  const current = loadTokens();
  saveTokens(current);

  assert.deepEqual(loadTokens(), current);
  const temporaryFiles = fs
    .readdirSync(process.env.AGENT_CANARY_HOME!)
    .filter((name) => name.endsWith(".tmp"));
  assert.deepEqual(temporaryFiles, []);
});

test("parallel CLI processes do not lose token registry updates", async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "agent-canary-token-concurrency-"));
  const moduleUrl = new URL("../src/tokens.ts", import.meta.url).href;
  const worker = `import { addTokens, mintToken } from ${JSON.stringify(moduleUrl)}; addTokens([mintToken("parallel-writer")]);`;
  try {
    await Promise.all(Array.from({ length: 16 }, () => new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, ["--import", "tsx", "--input-type=module", "-e", worker], {
        cwd: process.cwd(),
        env: { ...process.env, AGENT_CANARY_HOME: home },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stderr = "";
      child.stderr.setEncoding("utf8").on("data", (chunk: string) => { stderr += chunk; });
      child.once("error", reject);
      child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`token worker exited ${code}: ${stderr}`)));
    })));

    const records = JSON.parse(fs.readFileSync(path.join(home, "tokens.json"), "utf8")) as unknown[];
    assert.equal(records.length, 16);
    assert.equal(new Set(records.map((record) => (record as { token: string }).token)).size, 16);
    assert.equal(fs.existsSync(path.join(home, "tokens.json.lock")), false);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("Windows transient EPERM lock-open contention retries without losing registry records", () => {
  const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")!;
  const originalOpen = fs.openSync;
  const before = loadTokens();
  let failures = 0;
  Object.defineProperty(process, "platform", { value: "win32", configurable: true });
  const stub = mock.method(fs, "openSync", (...args: Parameters<typeof fs.openSync>) => {
    if (String(args[0]).endsWith("tokens.json.lock") && failures++ === 0) {
      throw Object.assign(new Error("simulated Windows pending-delete contention"), { code: "EPERM" });
    }
    return originalOpen(...args);
  });
  try {
    const created = generateTokens("windows-lock-retry", 1);
    assert.ok(failures >= 2);
    assert.deepEqual(loadTokens(), [...before, ...created]);
    assert.equal(fs.existsSync(path.join(process.env.AGENT_CANARY_HOME!, "tokens.json.lock")), false);
  } finally {
    stub.mock.restore();
    Object.defineProperty(process, "platform", originalPlatform);
  }
});

test("Windows lock permission failures remain bounded and never overwrite token records", () => {
  const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")!;
  const originalOpen = fs.openSync;
  const before = loadTokens();
  Object.defineProperty(process, "platform", { value: "win32", configurable: true });
  try {
    for (const code of ["EACCES", "EPERM"]) {
      const stub = mock.method(fs, "openSync", (...args: Parameters<typeof fs.openSync>) => {
        if (String(args[0]).endsWith("tokens.json.lock")) {
          throw Object.assign(new Error("simulated persistent permission denial"), { code });
        }
        return originalOpen(...args);
      });
      let tick = 0;
      const clock = mock.method(Date, "now", () => tick++ === 0 ? 0 : 10_001);
      try {
        assert.throws(() => generateTokens("must-not-write", 1), /registry lock|locked by another process/i);
        assert.deepEqual(loadTokens(), before);
      } finally { stub.mock.restore(); clock.mock.restore(); }
    }
  } finally { Object.defineProperty(process, "platform", originalPlatform); }
});

test("token registry is owner-readable on POSIX systems", { skip: process.platform === "win32" }, () => {
  generateTokens("permissions", 1);
  const mode = fs.statSync(path.join(process.env.AGENT_CANARY_HOME!, "tokens.json")).mode & 0o777;
  assert.equal(mode, 0o600);
});

test("CLI recursive check detects a token in a hidden .env file", () => {
  const cliHome = fs.mkdtempSync(path.join(os.tmpdir(), "agent-canary-hidden-home-"));
  const scanRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agent-canary-hidden-scan-"));
  const token = `cnry_${crypto.randomBytes(18).toString("base64url")}`;
  try {
    fs.writeFileSync(
      path.join(cliHome, "tokens.json"),
      JSON.stringify([{ token, label: "hidden-env", createdAt: new Date().toISOString(), planted: [] }])
    );
    fs.writeFileSync(path.join(scanRoot, ".env"), `API_KEY=${token}\n`);

    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", path.resolve("src/index.ts"), "tokens", "check", scanRoot],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: { ...process.env, AGENT_CANARY_HOME: cliHome },
      }
    );

    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /LEAK\s+hidden-env/);
  } finally {
    fs.rmSync(cliHome, { recursive: true, force: true });
    fs.rmSync(scanRoot, { recursive: true, force: true });
  }
});

test("CLI recursive check fails closed for a missing path or an over-depth tree", () => {
  const cliHome = fs.mkdtempSync(path.join(os.tmpdir(), "agent-canary-missing-home-"));
  const scanRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agent-canary-depth-scan-"));
  const missing = path.join(scanRoot, "does-not-exist");
  const deep = path.join(scanRoot, "a", "b", "c", "d", "e");
  fs.mkdirSync(deep, { recursive: true });
  fs.writeFileSync(path.join(deep, "leak.txt"), "no token needed to verify the depth bound\n");
  try {
    const run = (target: string) => spawnSync(
      process.execPath,
      ["--import", "tsx", path.resolve("src/index.ts"), "tokens", "check", target],
      { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, AGENT_CANARY_HOME: cliHome } }
    );
    const missingResult = run(missing);
    assert.equal(missingResult.error, undefined, missingResult.error?.message);
    assert.notEqual(missingResult.status, 0, `${missingResult.stdout}\n${missingResult.stderr}`);
    assert.doesNotMatch(missingResult.stdout, /clean: no canary tokens found/);

    const depthResult = run(scanRoot);
    assert.equal(depthResult.error, undefined, depthResult.error?.message);
    assert.notEqual(depthResult.status, 0, `${depthResult.stdout}\n${depthResult.stderr}`);
    assert.match(depthResult.stderr, /depth|incomplete/i);
    assert.doesNotMatch(depthResult.stdout, /clean: no canary tokens found/);
  } finally {
    fs.rmSync(cliHome, { recursive: true, force: true });
    fs.rmSync(scanRoot, { recursive: true, force: true });
  }
});

test("recursive walker includes hidden files but skips dependency and Git internals", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "agent-canary-file-walk-"));
  try {
    fs.writeFileSync(path.join(root, ".env"), "synthetic\n");
    fs.mkdirSync(path.join(root, ".private"));
    fs.writeFileSync(path.join(root, ".private", "secret.txt"), "synthetic\n");
    fs.mkdirSync(path.join(root, ".git"));
    fs.writeFileSync(path.join(root, ".git", "config"), "synthetic\n");
    fs.mkdirSync(path.join(root, "node_modules", "pkg"), { recursive: true });
    fs.writeFileSync(path.join(root, "node_modules", "pkg", "index.js"), "synthetic\n");

    const files = [...walkFiles(root)].map((file) => path.relative(root, file).replaceAll("\\", "/")).sort();
    assert.deepEqual(files, [".env", ".private/secret.txt"]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a corrupt token registry raises an error and is not overwritten by token generation", () => {
  const registry = path.join(process.env.AGENT_CANARY_HOME!, "tokens.json");
  const corruptContents = "{ this is not valid JSON\n";
  fs.writeFileSync(registry, corruptContents);

  assert.throws(() => loadTokens(), /token registry/i);
  assert.throws(() => generateTokens("must-not-overwrite", 1), /token registry/i);
  assert.equal(fs.readFileSync(registry, "utf8"), corruptContents);
});
