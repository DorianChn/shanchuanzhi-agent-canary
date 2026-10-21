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

test("synthetic M1 held-identity check denies a target replacement after M2 path validation", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ac3-m2-identity-race-"));
  const publicDirectory = path.join(root, "public");
  const resourcePath = path.join(publicDirectory, "readable.txt");
  const heldPath = path.join(publicDirectory, "readable.held.txt");
  fs.mkdirSync(publicDirectory);
  fs.writeFileSync(resourcePath, "original registered file");
  const heldFd = fs.openSync(resourcePath, fs.constants.O_RDONLY);
  const heldIdentity = fs.fstatSync(heldFd);
  const dispatchCalls = [];
  let allowedCallbacks = 0;

  try {
    // This double models M1's current private held-fd/dev/ino check. It is not
    // an import or execution of M1's runtime and does not prove product hookup.
    const gateway = Object.freeze({
      agent: Object.freeze({
        dispatch(call, signal) {
          dispatchCalls.push({ call, signal });
          const named = fs.lstatSync(resourcePath);
          const held = fs.fstatSync(heldFd);
          const stillBound =
            named.isFile() &&
            !named.isSymbolicLink() &&
            named.nlink === 1 &&
            named.dev === heldIdentity.dev &&
            named.ino === heldIdentity.ino &&
            held.dev === heldIdentity.dev &&
            held.ino === heldIdentity.ino;
          if (!stillBound) {
            return Promise.reject(new Error("resource_not_bound"));
          }

          allowedCallbacks += 1;
          return Promise.resolve(fs.readFileSync(heldFd, "utf8"));
        },
      }),
    });
    const adapter = createSecurityGatewayAdapter(gateway, {
      read_public: ["public/readable.txt"],
    });

    // M2 reads this after checking the exact fixed path. Its second `aborted`
    // read deterministically replaces the named target immediately before the
    // captured M1 dispatcher is called.
    let abortedReads = 0;
    const signal = {
      get aborted() {
        abortedReads += 1;
        if (abortedReads === 2) {
          fs.renameSync(resourcePath, heldPath);
          fs.writeFileSync(resourcePath, "replacement target");
        }
        return false;
      },
      addEventListener() {},
      removeEventListener() {},
    };

    await assert.rejects(
      adapter.executeRealTool(
        { name: "read_public", args: { path: "public/readable.txt" } },
        { signal },
      ),
      (error) => error.message === "resource_not_bound",
    );

    assert.equal(abortedReads, 2);
    assert.equal(dispatchCalls.length, 1);
    assert.deepEqual(dispatchCalls[0].call, {
      name: "read_file",
      args: { path: "public/readable.txt" },
    });
    assert.equal(typeof dispatchCalls[0].call.args.path, "string");
    assert.equal(Object.hasOwn(dispatchCalls[0].call, "identityCapability"), false);
    assert.equal(Object.hasOwn(dispatchCalls[0].call.args, "identityCapability"), false);
    assert.equal(allowedCallbacks, 0, "M1's held-identity boundary denies before the file callback");
    assert.equal(fs.readFileSync(resourcePath, "utf8"), "replacement target");
    assert.equal(fs.readFileSync(heldPath, "utf8"), "original registered file");
  } finally {
    fs.closeSync(heldFd);
    fs.rmSync(root, { recursive: true, force: true });
  }
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
