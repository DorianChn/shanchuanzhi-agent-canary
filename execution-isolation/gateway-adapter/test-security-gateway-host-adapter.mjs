import assert from "node:assert/strict";
import test from "node:test";
import { createSecurityGatewayHostAdapter } from "./gateway-adapter.mjs";

function setup(overrides = {}, { beforeFinalCapabilityCheck } = {}) {
  const gatewayCalls = [];
  const records = new WeakMap();
  let resourceCurrent = true;
  const gateway = Object.freeze({
    bindFileReadCapability(binding) {
      const capability = Object.freeze(Object.create(null));
      records.set(capability, Object.freeze({ ...binding }));
      return capability;
    },
    verifyFileReadCapability(capability, call, operation) {
      const binding = records.get(capability);
      return Boolean(
        resourceCurrent && binding && operation === "file-read" &&
          call?.name === binding.toolName && call?.args?.path === binding.path,
      );
    },
    readFileWithCapability(capability, call, operation, signal) {
      if (!this.verifyFileReadCapability(capability, call, operation)) {
        throw new Error("GATEWAY_FILE_CAPABILITY_INVALID");
      }
      gatewayCalls.push({ capability, call, operation, signal });
      return Promise.resolve({ content: "synthetic fixed read" });
    },
  });
  let routerOptions;
  let callbackCalls = 0;
  const createSecurityToolRouter = (options) => {
    routerOptions = options;
    const executeRealTool = options.executeRealTool;
    return Object.freeze({
      async dispatch(call) {
        const provider = options.fileReadCapability;
        const capability = provider.resolve(call);
        if (!provider.verify(capability, call, "file-read")) {
          const error = new Error("path_execution_not_pinned");
          error.decision = { action: "DENY", reason: error.message };
          throw error;
        }
        beforeFinalCapabilityCheck?.();
        if (!provider.verify(capability, call, "file-read")) {
          const error = new Error("path_execution_not_pinned");
          error.decision = { action: "DENY", reason: error.message };
          throw error;
        }
        callbackCalls += 1;
        return executeRealTool(call, {
          signal: new AbortController().signal,
          fileReadCapability: capability,
        });
      },
      pendingApprovals() {
        return [];
      },
    });
  };
  const host = createSecurityGatewayHostAdapter({
    gateway,
    fixedFileReads: { read_public: ["public/readable.txt"] },
    createSecurityToolRouter,
    routerOptions: {
      guard: Object.freeze({ id: "synthetic-host-guard" }),
      workspaceRoot: "C:/synthetic-workspace",
      mode: "OBSERVE",
      verifyRealPaths: true,
      ...overrides,
    },
  });
  return {
    host,
    gatewayCalls,
    routerOptions,
    callbackCalls: () => callbackCalls,
    replaceRegisteredResource() {
      resourceCurrent = false;
    },
  };
}

test("host composition passes the exact M1 capability through M5 and keeps aliases denied", async () => {
  const { host, gatewayCalls, routerOptions, callbackCalls } = setup();
  assert.equal(routerOptions.mode, "OBSERVE");
  assert.equal(routerOptions.verifyRealPaths, true);
  assert.deepEqual(routerOptions.tools.read_public, {
    operation: "file-read",
    pathArg: "path",
  });
  assert.equal(typeof routerOptions.fileReadCapability.resolve, "function");
  assert.equal(typeof routerOptions.fileReadCapability.verify, "function");

  const call = { name: "read_public", args: { path: "public/readable.txt" } };
  const capability = routerOptions.fileReadCapability.resolve(call);
  assert.deepEqual(await host.dispatch(call), { content: "synthetic fixed read" });
  assert.equal(callbackCalls(), 1);
  assert.equal(gatewayCalls.length, 1);
  assert.equal(gatewayCalls[0].capability, capability);
  assert.equal(gatewayCalls[0].call.name, "read_public");
  assert.equal(host.pendingApprovals().length, 0);

  await assert.rejects(
    host.dispatch({ name: "read_public", args: { path: "public/linked/readable.txt" } }),
    (error) => error.message === "path_execution_not_pinned",
  );
  assert.equal(callbackCalls(), 1);
  assert.equal(gatewayCalls.length, 1);
  assert.equal(host.pendingApprovals().length, 0);
});

test("replacement after capability resolution is denied before M5 callback or M1 read", async () => {
  let composition;
  composition = setup({}, {
    beforeFinalCapabilityCheck() {
      composition.replaceRegisteredResource();
    },
  });
  await assert.rejects(
    composition.host.dispatch({ name: "read_public", args: { path: "public/readable.txt" } }),
    (error) => error.message === "path_execution_not_pinned",
  );
  assert.equal(composition.callbackCalls(), 0);
  assert.equal(composition.gatewayCalls.length, 0);
  assert.equal(composition.host.pendingApprovals().length, 0);
});

test("host composition rejects legacy or non-OBSERVE policy settings", () => {
  for (const overrides of [
    { verifyRealPaths: false },
    { mode: "BALANCED" },
  ]) {
    assert.throws(
      () => setup(overrides),
      (error) => error.message === "M2_SECURITY_GATEWAY_STRICT_OBSERVE_REQUIRED",
    );
  }
});

test("host composition rejects caller-supplied callback or tool overrides", () => {
  for (const overrides of [
    { tools: { read_public: { operation: "http" } } },
    { executeRealTool: () => "untrusted override" },
    { fileReadCapability: { resolve: () => Object.freeze(Object.create(null)), verify: () => true } },
  ]) {
    assert.throws(
      () => setup(overrides),
      (error) => error.message === "M2_SECURITY_GATEWAY_HOST_ROUTER_CALLBACKS_RESERVED",
    );
  }
});
