import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createSecurityGatewayAdapter } from "./security-gateway-adapter.mjs";

function setup() {
  const calls = [];
  const gateway = Object.freeze({
    agent: Object.freeze({
      dispatch(call, signal) {
        calls.push({ call, signal });
        return Promise.resolve({ content: "synthetic public fixture" });
      },
    }),
  });
  const adapter = createSecurityGatewayAdapter(gateway, {
    read_public: ["public/readable.txt"],
  });
  return { adapter, calls };
}

test("fixed read forwards a plain path string and the host AbortSignal to M1", async () => {
  const { adapter, calls } = setup();
  const signal = new AbortController().signal;
  const result = await adapter.executeRealTool(
    { name: "read_public", args: { path: "public/readable.txt" } },
    { signal },
  );

  assert.deepEqual(result, { content: "synthetic public fixture" });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].call, {
    name: "read_file",
    args: { path: "public/readable.txt" },
  });
  assert.equal(typeof calls[0].call.args.path, "string");
  assert.equal(calls[0].signal, signal);
  assert.deepEqual(Object.keys(adapter).sort(), ["executeRealTool", "tools"]);
});

test("unregistered paths, tools, and model-controlled fields fail before M1 dispatch", async () => {
  const { adapter, calls } = setup();
  const signal = new AbortController().signal;
  const rejected = [
    {
      call: { name: "read_public", args: { path: "public/../secrets/key.txt" } },
      error: "M2_SECURITY_GATEWAY_PATH_NOT_REGISTERED",
    },
    {
      call: { name: "read_public", args: { path: "public/linked/readable.txt" } },
      error: "M2_SECURITY_GATEWAY_PATH_NOT_REGISTERED",
    },
    {
      call: { name: "unknown", args: { path: "public/readable.txt" } },
      error: "M2_SECURITY_GATEWAY_TOOL_NOT_REGISTERED",
    },
    {
      call: {
        name: "read_public",
        args: { path: "public/readable.txt", write: true },
      },
      error: "M2_SECURITY_GATEWAY_ARGUMENTS_INVALID",
    },
  ];

  for (const item of rejected) {
    await assert.rejects(
      adapter.executeRealTool(item.call, { signal }),
      (error) => error.message === item.error,
    );
    assert.equal(calls.length, 0);
  }
});

test("an actual symlink or junction alias outside the fixed allowlist fails before M1 dispatch", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ac3-m2-gateway-alias-"));
  const publicDirectory = path.join(root, "public");
  const targetDirectory = path.join(root, "target");
  const aliasPath = path.join(publicDirectory, "linked");

  try {
    fs.mkdirSync(publicDirectory);
    fs.mkdirSync(targetDirectory);
    fs.writeFileSync(path.join(targetDirectory, "readable.txt"), "synthetic protected fixture");
    fs.symlinkSync(targetDirectory, aliasPath, process.platform === "win32" ? "junction" : "dir");
    assert.equal(fs.realpathSync(aliasPath), fs.realpathSync(targetDirectory));

    const { adapter, calls } = setup();
    await assert.rejects(
      adapter.executeRealTool(
        { name: "read_public", args: { path: "public/linked/readable.txt" } },
        { signal: new AbortController().signal },
      ),
      (error) => error.message === "M2_SECURITY_GATEWAY_PATH_NOT_REGISTERED",
    );
    assert.equal(calls.length, 0, "the alias is rejected before the M1 dispatcher callback");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("an aborted signal fails closed before M1 dispatch", async () => {
  const { adapter, calls } = setup();
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    adapter.executeRealTool(
      { name: "read_public", args: { path: "public/readable.txt" } },
      { signal: controller.signal },
    ),
    (error) => error.name === "AbortError",
  );
  assert.equal(calls.length, 0);
});

test("quarantine, approval-required, and stale-approval denials propagate without retry or auto-approval", async () => {
  // This is a branch-local adapter seam fixture, not a live M1 Gateway integration test.
  for (const message of [
    "GATEWAY_DENY:guard_quarantined",
    "GATEWAY_REQUIRE_APPROVAL:host_scoped_file_capability",
    "GATEWAY_APPROVAL_EXPIRED_OR_CONSUMED",
  ]) {
    const denial = new Error(message);
    let dispatchCalls = 0;
    let approvalCalls = 0;
    const gateway = Object.freeze({
      agent: Object.freeze({
        dispatch() {
          dispatchCalls += 1;
          return Promise.reject(denial);
        },
      }),
      operator: Object.freeze({
        approve() {
          approvalCalls += 1;
          throw new Error("M2_MUST_NOT_AUTO_APPROVE");
        },
      }),
    });
    const adapter = createSecurityGatewayAdapter(gateway, {
      read_public: ["public/readable.txt"],
    });

    await assert.rejects(
      adapter.executeRealTool(
        { name: "read_public", args: { path: "public/readable.txt" } },
        { signal: new AbortController().signal },
      ),
      (error) => error === denial,
    );
    assert.equal(dispatchCalls, 1);
    assert.equal(approvalCalls, 0);
  }
});
