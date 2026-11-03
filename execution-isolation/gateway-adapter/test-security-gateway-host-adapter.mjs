import assert from "node:assert/strict";
import test from "node:test";
import { createSecurityGatewayHostAdapter } from "./gateway-adapter.mjs";

function setup(overrides = {}, { beforeFinalCapabilityCheck } = {}) {
  const gatewayCalls = [];
  const records = new WeakMap();
  const fixtureBytes = Buffer.from("synthetic fixed read");
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
      return Promise.resolve({ content: Buffer.from(fixtureBytes).toString("utf8") });
    },
  });
  let routerOptions;
  let callbackCalls = 0;
  let approvalCalls = 0;
  let policyInspectionCalls = 0;
  let routerDispatchCalls = 0;
  const createSecurityToolRouter = (options) => {
    routerOptions = options;
    const executeRealTool = options.executeRealTool;
    return Object.freeze({
      inspectPolicy(call) {
        policyInspectionCalls += 1;
        const provider = options.fileReadCapability;
        const capability = provider.resolve(call);
        const allowed = capability !== undefined && provider.verify(capability, call, "file-read");
        return { action: allowed ? "ALLOW" : "DENY", mode: options.mode };
      },
      async dispatch(call) {
        routerDispatchCalls += 1;
        const provider = options.fileReadCapability;
        const decision = this.inspectPolicy(call);
        if (decision.action !== "ALLOW") {
          if (decision.action === "APPROVAL_REQUIRED") approvalCalls += 1;
          const error = new Error("path_execution_not_pinned");
          error.decision = { action: "DENY", reason: error.message };
          throw error;
        }
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
        // Match M5's strict-router path: execute a held read through the provider,
        // never through the generic path-string callback.
        return provider.readFileWithCapability(capability, call);
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
    approvalCalls: () => approvalCalls,
    policyInspectionCalls: () => policyInspectionCalls,
    routerDispatchCalls: () => routerDispatchCalls,
    readFixtureBytes: () => Buffer.from(fixtureBytes),
    replaceRegisteredResource() {
      resourceCurrent = false;
    },
  };
}

test("host composition passes the exact M1 capability through M5 and keeps aliases denied", async () => {
  const { host, gatewayCalls, routerOptions, callbackCalls, approvalCalls, policyInspectionCalls, readFixtureBytes } = setup();
  const originalBytes = readFixtureBytes();
  assert.equal(routerOptions.mode, "OBSERVE");
  assert.equal(routerOptions.verifyRealPaths, true);
  assert.deepEqual(routerOptions.tools.read_public, {
    operation: "file-read",
    pathArg: "path",
  });
  assert.equal(typeof routerOptions.fileReadCapability.resolve, "function");
  assert.equal(typeof routerOptions.fileReadCapability.verify, "function");
  assert.equal(typeof routerOptions.fileReadCapability.readFileWithCapability, "function");

  const status = host.securityCenterStatusProvider();
  assert.deepEqual(status, {
    protectionStatus: "PARTIALLY_PROTECTED",
    gateway: { protectionStatus: "PROTECTED", connectionStatus: "CONNECTED" },
    hook: { protectionStatus: "UNKNOWN" },
    canaryIsolation: { protectionStatus: "UNKNOWN" },
    policy: {
      name: "M2 fixed file reads / M5 OBSERVE",
      protectionStatus: "PROTECTED",
    },
    protectedToolCount: 1,
    unprotectedExecutionPaths: null,
    coverage: "M2_FIXED_FILE_READS_ONLY",
  });
  assert.equal(policyInspectionCalls(), 1, "status checks only M5's side-effect-free policy inspection");
  assert.equal(callbackCalls(), 0, "status must not start the host callback");
  assert.equal(gatewayCalls.length, 0, "status must not dispatch through M1");
  assert.equal(approvalCalls(), 0, "status must not request human approval");
  assert.equal(host.pendingApprovals().length, 0);

  const call = { name: "read_public", args: { path: "public/readable.txt" } };
  const capability = routerOptions.fileReadCapability.resolve(call);
  assert.deepEqual(await host.dispatch(call), { content: "synthetic fixed read" });
  assert.equal(callbackCalls(), 0, "M5's strict held read must bypass the generic callback");
  assert.equal(approvalCalls(), 0);
  assert.equal(gatewayCalls.length, 1);
  assert.equal(gatewayCalls[0].capability, capability);
  assert.equal(gatewayCalls[0].call.name, "read_public");
  assert.equal(host.pendingApprovals().length, 0);

  await assert.rejects(
    () => host.dispatch({ name: "read_public", args: { path: "public/linked/readable.txt" } }),
    (error) => error.message === "M2_SECURITY_GATEWAY_PATH_NOT_REGISTERED",
  );
  assert.equal(callbackCalls(), 0, "unregistered aliases never reach the generic callback");
  assert.equal(gatewayCalls.length, 1);
  assert.equal(host.pendingApprovals().length, 0);

  await assert.rejects(
    () => host.dispatch({ name: "read_public", args: { path: "public/sensitive-alias/credentials.txt" } }),
    (error) => error.message === "M2_SECURITY_GATEWAY_PATH_NOT_REGISTERED",
  );
  assert.equal(callbackCalls(), 0, "sensitive aliases must be denied before the callback");
  assert.equal(approvalCalls(), 0, "hard-denied aliases must not request approval");
  assert.equal(gatewayCalls.length, 1, "sensitive aliases must be denied before M1 read effects");
  assert.equal(host.pendingApprovals().length, 0, "hard-denied aliases must not create approvals");
  assert.deepEqual(gatewayCalls[0].call.args.path, "public/readable.txt");
  assert.deepEqual(readFixtureBytes(), originalBytes, "denied aliases leave fixture bytes unchanged");
});

test("replacement after capability resolution is denied before M5 callback or M1 read", async () => {
  let composition;
  composition = setup({}, {
    beforeFinalCapabilityCheck() {
      composition.replaceRegisteredResource();
    },
  });
  const originalBytes = composition.readFixtureBytes();
  const before = composition.host.securityCenterStatusProvider();
  assert.equal(before.protectedToolCount, 1);
  await assert.rejects(
    composition.host.dispatch({ name: "read_public", args: { path: "public/readable.txt" } }),
    (error) => error.message === "path_execution_not_pinned",
  );
  assert.equal(composition.callbackCalls(), 0);
  assert.equal(composition.approvalCalls(), 0);
  assert.equal(composition.gatewayCalls.length, 0);
  assert.equal(composition.host.pendingApprovals().length, 0);
  assert.deepEqual(composition.readFixtureBytes(), originalBytes, "path replacement denial leaves fixture bytes unchanged");
  assert.deepEqual(composition.host.securityCenterStatusProvider(), {
    protectionStatus: "UNKNOWN",
    gateway: { protectionStatus: "UNKNOWN", connectionStatus: "UNKNOWN" },
    hook: { protectionStatus: "UNKNOWN" },
    canaryIsolation: { protectionStatus: "UNKNOWN" },
    policy: {
      name: "M2 fixed file reads / M5 OBSERVE",
      protectionStatus: "UNKNOWN",
    },
    protectedToolCount: 0,
    unprotectedExecutionPaths: null,
    coverage: "M2_FIXED_FILE_READS_ONLY",
  });
  assert.equal(composition.callbackCalls(), 0, "status recheck must remain read-only after path replacement");
  assert.equal(composition.approvalCalls(), 0, "status recheck must not request approval");
  assert.equal(composition.gatewayCalls.length, 0, "status recheck must not invoke the M1 read");
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

test("OBSERVE host adapter checks fixed M1 capability before policy dispatch", async () => {
  const composition = setup();
  const call = { name: "read_public", args: { path: "public/readable.txt" } };

  await assert.rejects(
    () => composition.host.dispatch({ name: "read_public", args: { path: "public/linked/readable.txt" } }),
    (error) => error.message === "M2_SECURITY_GATEWAY_PATH_NOT_REGISTERED",
  );
  assert.equal(composition.routerDispatchCalls(), 0);
  assert.equal(composition.policyInspectionCalls(), 0);
  assert.equal(composition.callbackCalls(), 0);
  assert.equal(composition.approvalCalls(), 0);
  assert.equal(composition.gatewayCalls.length, 0);

  composition.replaceRegisteredResource();
  await assert.rejects(
    () => composition.host.dispatch(call),
    (error) => error.message === "M2_SECURITY_GATEWAY_CAPABILITY_INVALID",
  );
  assert.equal(composition.routerDispatchCalls(), 0, "a stale owner binding is denied before OBSERVE policy dispatch");
  assert.equal(composition.policyInspectionCalls(), 0);
  assert.equal(composition.callbackCalls(), 0);
  assert.equal(composition.approvalCalls(), 0);
  assert.equal(composition.gatewayCalls.length, 0, "stale identity cannot reach M1 read");
  assert.deepEqual(composition.readFixtureBytes(), Buffer.from("synthetic fixed read"));
});
