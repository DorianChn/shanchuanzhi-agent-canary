import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";

const home = fs.mkdtempSync(path.join(os.tmpdir(), "agent-canary-watch-test-"));
process.env.AGENT_CANARY_HOME = home;
const { watch } = await import("../src/watch.js");

after(() => fs.rmSync(home, { recursive: true, force: true }));

test("watch rejects missing and non-directory roots instead of claiming to monitor them", () => {
  const missing = path.join(home, "missing-root");
  const file = path.join(home, "not-a-directory.txt");
  fs.writeFileSync(file, "synthetic\n");

  assert.throws(() => watch([missing]), /cannot inspect|missing|incomplete/i);
  assert.throws(() => watch([file]), /directory/i);
});
