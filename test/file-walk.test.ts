import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { walkFiles } from "../src/file-walk.js";

test("directory enumeration errors are surfaced so a scan cannot report a false clean", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "agent-canary-walk-error-"));
  const original = fs.readdirSync;
  try {
    fs.readdirSync = ((directory: fs.PathLike, ...args: unknown[]) => {
      if (path.resolve(String(directory)) === path.resolve(root)) {
        throw Object.assign(new Error("synthetic permission denial"), { code: "EACCES" });
      }
      return (original as (...values: unknown[]) => unknown)(directory, ...args);
    }) as typeof fs.readdirSync;
    assert.throws(() => [...walkFiles(root)], /scan is incomplete/i);
  } finally {
    fs.readdirSync = original;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("recursive walking does not follow a symlink supplied as its root", { skip: process.platform === "win32" }, () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "agent-canary-walk-link-"));
  const target = path.join(parent, "target");
  const link = path.join(parent, "link");
  fs.mkdirSync(target);
  fs.writeFileSync(path.join(target, "outside.txt"), "synthetic\n");
  fs.symlinkSync(target, link, "dir");
  try {
    assert.deepEqual([...walkFiles(link)], []);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});
