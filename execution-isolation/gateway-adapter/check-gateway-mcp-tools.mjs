import assert from "node:assert/strict";
import { createGatewayMcpTools } from "./create-gateway-mcp-tools.mjs";

const metadata = Object.freeze({
  "m2.workspace.read": Object.freeze({
    approvalRequired: true,
    risk: "READ_ONLY",
  }),
  "m2.workspace.write": Object.freeze({
    approvalRequired: true,
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

assert.throws(
  () => createGatewayMcpTools({}, backend),
  { name: "TypeError", message: "M2_GATEWAY_MCP_REGISTRATIONS_EMPTY" },
);
assert.throws(
  () =>
    createGatewayMcpTools(
      { "bad/tool-id": { approvalRequired: true, risk: "READ_ONLY" } },
      backend,
    ),
  { name: "TypeError", message: "M2_GATEWAY_MCP_TOOL_ID_INVALID" },
);
assert.throws(
  () =>
    createGatewayMcpTools(
      { "m2.invalid": { approvalRequired: true, risk: "UNKNOWN" } },
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
  "M2_GATEWAY_MCP_BINDER_PASS (FIXED_IDS; SAME_ARGS_AND_SIGNAL; NO_RUNTIME_ISOLATION_CLAIM)\n",
);
