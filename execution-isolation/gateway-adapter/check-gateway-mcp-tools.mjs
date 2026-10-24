import assert from "node:assert/strict";
import { createGatewayMcpTools } from "./create-gateway-mcp-tools.mjs";

const metadata = Object.freeze({
  "m2.workspace.read": Object.freeze({
    approvalRequired: true,
    executionSurface: "M2_ISOLATED_WORKER",
    risk: "READ_ONLY",
  }),
  "m2.workspace.write": Object.freeze({
    approvalRequired: true,
    executionSurface: "M2_ISOLATED_WORKER",
    risk: "WRITE",
  }),
});

let backendCalls = 0;
let received;
const backend = Object.freeze({
  executeIsolated(toolId, args, signal) {
    backendCalls += 1;
    received = { toolId, args, signal };
    return Promise.resolve({ ok: true, toolId });
  },
});

const gatewayTools = createGatewayMcpTools(metadata, backend);
assert.deepEqual(Reflect.ownKeys(gatewayTools), [
  "m2.workspace.read",
  "m2.workspace.write",
]);
assert.equal(Object.getPrototypeOf(gatewayTools), null);
assert.equal(Object.isFrozen(gatewayTools), true);
assert.equal(gatewayTools["m2.workspace.read"].approvalRequired, true);
assert.equal(gatewayTools["m2.workspace.read"].risk, "READ_ONLY");
assert.equal(gatewayTools["m2.workspace.write"].approvalRequired, true);
assert.equal(gatewayTools["m2.workspace.write"].risk, "WRITE");
assert.equal(Object.isFrozen(gatewayTools["m2.workspace.read"]), true);
assert.equal("m2.workspace.missing" in gatewayTools, false);

const args = { workspaceId: "fixed-workspace" };
const controller = new AbortController();
const result = await gatewayTools["m2.workspace.read"].execute(
  args,
  controller.signal,
);
assert.deepEqual(result, { ok: true, toolId: "m2.workspace.read" });
assert.equal(received.toolId, "m2.workspace.read");
assert.strictEqual(received.args, args);
assert.strictEqual(received.signal, controller.signal);

controller.abort();
assert.equal(received.signal.aborted, true);

const callsBeforeInvalidArgs = backendCalls;
await assert.rejects(
  gatewayTools["m2.workspace.read"].execute([], new AbortController().signal),
  { name: "TypeError", message: "M2_GATEWAY_MCP_ARGUMENTS_INVALID" },
);
await assert.rejects(
  gatewayTools["m2.workspace.read"].execute({}, {}),
  { name: "TypeError", message: "M2_GATEWAY_MCP_SIGNAL_INVALID" },
);
assert.equal(backendCalls, callsBeforeInvalidArgs);

const alreadyAborted = new AbortController();
alreadyAborted.abort();
await assert.rejects(
  gatewayTools["m2.workspace.read"].execute({}, alreadyAborted.signal),
  { name: "AbortError", message: "M2_GATEWAY_MCP_ABORTED" },
);
assert.equal(backendCalls, callsBeforeInvalidArgs);

// A registration ID alone does not identify the execution surface. The host
// may register a protected M2 executor under the conventional "Bash" ID.
const protectedBashTools = createGatewayMcpTools(
  {
    Bash: {
      approvalRequired: true,
      executionSurface: "M2_ISOLATED_WORKER",
      risk: "EXECUTE",
    },
  },
  backend,
);
assert.equal(typeof protectedBashTools.Bash.execute, "function");
const protectedBashResult = await protectedBashTools.Bash.execute(
  {},
  new AbortController().signal,
);
assert.deepEqual(protectedBashResult, { ok: true, toolId: "Bash" });
assert.equal(received.toolId, "Bash");

assert.throws(
  () => createGatewayMcpTools({}, backend),
  { name: "TypeError", message: "M2_GATEWAY_MCP_REGISTRATIONS_EMPTY" },
);
assert.throws(
  () =>
    createGatewayMcpTools(
      {
        "bad/tool-id": {
          approvalRequired: true,
          executionSurface: "M2_ISOLATED_WORKER",
          risk: "READ_ONLY",
        },
      },
      backend,
    ),
  { name: "TypeError", message: "M2_GATEWAY_MCP_TOOL_ID_INVALID" },
);
const callsBeforeNativeShellRegistration = backendCalls;
assert.throws(
  () =>
    createGatewayMcpTools(
      {
        Bash: {
          approvalRequired: true,
          executionSurface: "NATIVE_CODEX_SHELL",
          risk: "EXECUTE",
        },
      },
      backend,
    ),
  { name: "TypeError", message: "M2_NATIVE_SHELL_UNPROTECTED" },
);
assert.equal(
  backendCalls,
  callsBeforeNativeShellRegistration,
  "native Shell registration must be rejected before its callback can reach the backend",
);
assert.throws(
  () =>
    createGatewayMcpTools(
      {
        "m2.invalid": {
          approvalRequired: true,
          executionSurface: "M2_ISOLATED_WORKER",
          risk: "UNKNOWN",
        },
      },
      backend,
    ),
  { name: "TypeError", message: "M2_GATEWAY_MCP_METADATA_INVALID" },
);
assert.throws(
  () =>
    createGatewayMcpTools(
      {
        "m2.invalid": {
          approvalRequired: true,
          executionSurface: "M2_ISOLATED_WORKER",
          risk: "READ_ONLY",
          executable: "agent-controlled",
        },
      },
      backend,
    ),
  { name: "TypeError", message: "M2_GATEWAY_MCP_METADATA_INVALID" },
);
assert.throws(
  () => createGatewayMcpTools(metadata, { executeIsolated: "not-a-function" }),
  { name: "TypeError", message: "M2_GATEWAY_MCP_BACKEND_INVALID" },
);

process.stdout.write(
  "M2_GATEWAY_MCP_BINDER_PASS (EXPLICIT_SURFACE; PROTECTED_BASH_ID; NATIVE_SHELL_DENIED_BEFORE_BACKEND; SAME_ARGS_AND_SIGNAL; NO_RUNTIME_ISOLATION_CLAIM)\n",
);
