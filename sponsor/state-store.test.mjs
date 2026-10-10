import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { readJsonFile, withFileLock, writeJsonFile } from "./state-store.mjs";

const home = fs.mkdtempSync(path.join(os.tmpdir(), "agent-canary-state-store-"));
after(() => fs.rmSync(home, { recursive: true, force: true }));

test("only ENOENT uses the first-run fallback; empty, truncated, and invalid JSON remain untouched", () => {
  const file = path.join(home, "state.json");
  assert.deepEqual(readJsonFile(file, { fresh: true }), { fresh: true });
  for (const contents of ["", "{", "{\"order\":", "not-json"]) {
    fs.writeFileSync(file, contents);
    assert.throws(() => readJsonFile(file, {}), /empty|invalid JSON/i);
    assert.equal(fs.readFileSync(file, "utf8"), contents);
  }
});

test("permission errors and non-regular paths fail instead of using empty business data", () => {
  const deniedFile = path.join(home, "denied.json");
  const deniedFs = new Proxy(fs, {
    get(target, property) {
      if (property === "lstatSync") return () => { throw Object.assign(new Error("synthetic access denied"), { code: "EACCES" }); };
      return Reflect.get(target, property, target);
    },
  });
  assert.throws(() => readJsonFile(deniedFile, {} , deniedFs), /could not read business state/i);

  const directory = path.join(home, "directory-state.json");
  fs.mkdirSync(directory);
  try {
    assert.throws(() => readJsonFile(directory, {}), /not a regular file/i);
  } finally {
    fs.rmdirSync(directory);
  }
});

test("atomic writes preserve valid JSON and never replace a symlink destination", { skip: process.platform === "win32" }, () => {
  const file = path.join(home, "atomic.json");
  writeJsonFile(file, { sentinel: "preserve" });
  assert.deepEqual(readJsonFile(file, null), { sentinel: "preserve" });
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);

  const target = path.join(home, "target.json");
  const link = path.join(home, "link.json");
  fs.writeFileSync(target, "{\"sentinel\":\"target\"}");
  fs.symlinkSync(target, link);
  assert.throws(() => writeJsonFile(link, { changed: true }), /non-regular/);
  assert.equal(fs.readFileSync(target, "utf8"), "{\"sentinel\":\"target\"}");
});

test("concurrent sponsor processes serialize state read-modify-write transactions", async () => {
  const file = path.join(home, "counter.json");
  const lock = path.join(home, "state.lock");
  const moduleUrl = new URL("./state-store.mjs", import.meta.url).href;
  const worker = `import { readJsonFile, withFileLock, writeJsonFile } from ${JSON.stringify(moduleUrl)}; withFileLock(${JSON.stringify(lock)}, () => { const value = readJsonFile(${JSON.stringify(file)}, { count: 0 }); value.count++; writeJsonFile(${JSON.stringify(file)}, value); });`;
  await Promise.all(Array.from({ length: 16 }, () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--input-type=module", "-e", worker], {
      cwd: path.dirname(file),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`state worker exited ${code}: ${stderr}`)));
  })));
  assert.deepEqual(readJsonFile(file, null), { count: 16 });
  assert.equal(fs.existsSync(lock), false);
});

test("active state locks time out without deleting another process lock", () => {
  const lock = path.join(home, "held.lock");
  const contents = JSON.stringify({ pid: process.pid, hostname: os.hostname(), createdAt: Date.now() });
  fs.writeFileSync(lock, contents, { flag: "wx", mode: 0o600 });
  assert.throws(() => withFileLock(lock, () => assert.fail("must not enter"), 40), /busy/i);
  assert.equal(fs.readFileSync(lock, "utf8"), contents);
  fs.unlinkSync(lock);
});
