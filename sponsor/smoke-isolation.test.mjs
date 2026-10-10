import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const sponsorDir = path.dirname(fileURLToPath(import.meta.url));
const sandbox = fs.mkdtempSync(path.join(sponsorDir, ".smoke-sandbox-"));
const protectedFiles = new Map([
  ["orders.json", '{"sentinel":"keep-orders"}\n'],
  ["subscribers.json", '{"sentinel":"keep-subscribers"}\n'],
  ["activations.json", '{"sentinel":"keep-activations"}\n'],
]);

try {
  for (const file of ["server.mjs", "smoke.mjs"]) {
    fs.copyFileSync(path.join(sponsorDir, file), path.join(sandbox, file));
  }
  for (const [name, contents] of protectedFiles) {
    fs.writeFileSync(path.join(sandbox, name), contents);
  }

  const result = spawnSync(process.execPath, [path.join(sandbox, "smoke.mjs")], {
    cwd: sandbox,
    encoding: "utf8",
    timeout: 30_000,
    env: {
      DEMO: "1",
      PATH: process.env.PATH ?? "",
      SystemRoot: process.env.SystemRoot ?? "",
      TEMP: process.env.TEMP ?? os.tmpdir(),
      TMP: process.env.TMP ?? os.tmpdir(),
    },
  });

  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  for (const [name, contents] of protectedFiles) {
    assert.equal(fs.readFileSync(path.join(sandbox, name), "utf8"), contents, `${name} was modified by the smoke test`);
  }
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
}

console.log("sponsor smoke isolation passed; pre-existing order, subscription, and activation files were preserved");
