import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";
import test, { after } from "node:test";

const home = fs.mkdtempSync(path.join(os.tmpdir(), "agent-canary-watch-test-"));
process.env.AGENT_CANARY_HOME = home;
const { watch } = await import("../src/watch.js");
const { saveConfig, defaultConfig } = await import("../src/config.js");
const { mintToken } = await import("../src/tokens.js");

after(() => fs.rmSync(home, { recursive: true, force: true }));

test("watch rejects missing and non-directory roots instead of claiming to monitor them", () => {
  const missing = path.join(home, "missing-root");
  const file = path.join(home, "not-a-directory.txt");
  fs.writeFileSync(file, "synthetic\n");

  assert.throws(() => watch([missing]), /cannot inspect|missing|incomplete/i);
  assert.throws(() => watch([file]), /directory/i);
});

test("watch queues, deduplicates, and releases resources under sustained synthetic events", async () => {
  const root = path.join(home, "synthetic-root");
  fs.mkdirSync(root);
  saveConfig({ ...defaultConfig(), notify: false, eventsFile: path.join(home, "watch.jsonl") });

  let sendChange: ((filename: string | Buffer | null) => void) | undefined;
  let fakeWatcher: (EventEmitter & { close(): void }) | undefined;
  const token = mintToken("watch-growth-test");
  const handle = watch([root], {
    sweepIntervalMs: 60_000,
    scanner: (file) => {
      if (file.includes("batch-0")) throw new Error("synthetic scan failure");
      return [token];
    },
    watchFactory: (_watchRoot, onChange) => {
      sendChange = onChange;
      fakeWatcher = Object.assign(new EventEmitter(), { close() { this.emit("closed"); } });
      return fakeWatcher as unknown as fs.FSWatcher;
    },
  });
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.ok(sendChange);
    for (let batch = 0; batch < 3; batch++) {
      for (let i = 0; i < 5000; i++) sendChange(`batch-${batch}-file-${i}.txt`);
      assert.ok(handle.stats().pendingFiles <= 2048);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    const current = handle.stats();
  assert.ok(current.alertedKeys <= 4096);
    assert.equal(current.reportedFailures, 1024, "scan failure deduplication must stay at its configured bound");
    assert.ok(current.pendingFiles <= 2048);
  } finally {
    handle.close();
    handle.close();
    console.error = originalError;
  }
  assert.equal(handle.stats().pendingFiles, 0);
  assert.ok(fakeWatcher);
});
