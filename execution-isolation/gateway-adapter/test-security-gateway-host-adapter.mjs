import assert from "node:assert/strict";
import test from "node:test";
import { createSecurityGatewayHostAdapter } from "./security-gateway-adapter.mjs";

function setup(overrides = {}) {
  const gatewayCalls = [];
  const gateway = Object.freeze({
    agent: Object.freeze({
      dispatch(call, signal) {
        gatewayCalls.push({ call, signal });
        return Promise.resolve({ content: "synthetic fixed read" });
      },
    }),
  });
  let routerOptions;
  let callbackCalls = 0;
  const createSecurityToolRouter = (options) => {
    routerOptions = options;
    const executeRealTool = options.executeRealTool;
    return Object.freeze({
      async dispatch(call) {
        const tool = options.tools[call?.name];
        if (
          options.mode === "OBSERVE" &&
          options.verifyRealPaths === true &&
          tool?.operation === "file-read"
        ) {
          const error = new Error("path_execution_not_pinned");
          error.decision = { action: "DENY", reason: error.message };
          throw error;
        }
        callbackCalls += 1;
        return executeRealTool(call, { signal: new AbortController().signal });
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
  return { host, gatewayCalls, routerOptions, callbackCalls: () => callbackCalls };
}

test("host composition pins M5 OBSERVE strict mode and denies before callback or approval", async () => {
  const { host, gatewayCalls, routerOptions, callbackCalls } = setup();
  assert.equal(routerOptions.mode, "OBSERVE");
  assert.equal(routerOptions.verifyRealPaths, true);
  assert.deepEqual(routerOptions.tools.read_public, {
    operation: "file-read",
    pathArg: "path",
  });

  for (const filePath of [
    "public/readable.txt",
    "public/linked/readable.txt",
  ]) {
    await assert.rejects(
      host.dispatch({ name: "read_public", args: { path: filePath } }),
      (error) => error.message === "path_execution_not_pinned",
    );
    assert.equal(callbackCalls(), 0);
    assert.equal(gatewayCalls.length, 0);
    assert.equal(host.pendingApprovals().length, 0);
  }
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
  ]) {
    assert.throws(
      () => setup(overrides),
      (error) => error.message === "M2_SECURITY_GATEWAY_HOST_ROUTER_CALLBACKS_RESERVED",
    );
  }
});
