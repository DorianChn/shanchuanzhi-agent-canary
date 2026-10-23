import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const fixturePath = new URL("./contract-fixture.json", import.meta.url);
const fixture = JSON.parse(readFileSync(fileURLToPath(fixturePath), "utf8"));

assert.equal(fixture.schema, "agent-canary.m2.gateway-adapter-proposal.v1");
assert.equal(fixture.status, "BINDER_IMPLEMENTED_BACKEND_NOT_INTEGRATED");
assert.equal(fixture.sources.m0PullRequestNumber, 30);
assert.equal(fixture.sources.m0PullRequestState, "OPEN_DRAFT");
assert.equal(fixture.sources.m0PullRequestHead, fixture.sources.m0ContractCommit);
assert.equal(fixture.sources.m1PullRequestNumber, 43);
assert.equal(fixture.sources.m1PullRequestState, "OPEN_DRAFT");
assert.equal(fixture.sources.m1PullRequestHead, fixture.sources.m1ImplementationCommit);
assert.equal(fixture.gatewaySeam.factory, "createTrustedExecutionGateway(GatewayOptions)");
assert.equal(fixture.gatewaySeam.agentEntry, "agent.dispatch(ToolCall, signal?)");
assert.equal(fixture.gatewaySeam.toolCall.name, "mcp_tool");
assert.equal(fixture.gatewaySeam.registration.map, "GatewayOptions.mcpTools");
assert.equal(fixture.gatewaySeam.registration.fixedAtGatewayConstruction, true);
assert.equal(fixture.gatewaySeam.registration.noDynamicRegistrationObserved, true);
assert.equal(fixture.gatewaySeam.gatewayOwnsAuthorization, true);
assert.match(fixture.gatewaySeam.registration.descriptor.execute, /AbortSignal/);
assert.deepEqual(fixture.gatewaySeam.registration.descriptor.riskValues, [
  "READ_ONLY", "WRITE", "EXECUTE", "NETWORK", "SENSITIVE_DATA", "DESTRUCTIVE",
]);

const order = fixture.gatewaySeam.callbackInvocationOrder;
assert.deepEqual(order, [
  "normalize_and_bound_request",
  "initial_guard_check",
  "queued_guard_recheck",
  "exact_mcp_tool_lookup_and_policy",
  "one_use_operator_approval_if_required",
  "repeat_policy_and_final_guard_check",
  "evidence_capacity_check_and_RUNNING_record",
  "invoke_registered_callback_with_gateway_abort_signal",
]);
assert.equal(fixture.gatewaySeam.cancellation.callbackReceivesGatewayAbortSignal, true);
assert.deepEqual(fixture.gatewaySeam.cancellation.directExecutionSources, [
  "dispatch caller cancellation", "gateway deadline", "guard quarantine", "gateway close",
]);
assert.equal(fixture.gatewaySeam.cancellation.approvedExecution.operatorApproveSignature, "approve(requestId)");
assert.equal(fixture.gatewaySeam.cancellation.approvedExecution.originalDispatchSignalRetained, false);
assert.deepEqual(fixture.gatewaySeam.cancellation.approvedExecution.sources, [
  "gateway deadline", "guard quarantine", "gateway close",
]);
assert.equal(fixture.gatewaySeam.cancellation.approvedExecution.ownerDecisionRequired, true);
assert.equal(fixture.gatewaySeam.callbackMayIgnoreSignal, true);
assert.equal(fixture.gatewaySeam.callbackSideEffectEvidenceOnSuccess, "NOT_VERIFIED");

assert.equal(fixture.currentM2Executor.acceptsGatewayAbortSignal, false);
assert.equal(fixture.currentM2Executor.workerRequestResponseProtocol, "NOT_DEFINED");
assert.equal(fixture.currentM2Executor.fixedToolIdToExecutableResourceMap, "NOT_DEFINED");
assert.deepEqual(fixture.proposal.callbackBinding, {
  toolId: "exact host-selected constructor registration ID, bound by the host adapter",
  arguments: "forward the Gateway-provided validated object unchanged",
  abortSignal: "forward the identical Gateway-provided AbortSignal object unchanged",
  agentMaySelectExecutable: false,
  agentMaySelectResources: false,
});
assert.equal(fixture.minimumM1OwnerQuestions.length, 2);
assert.match(fixture.minimumM1OwnerQuestions[1], /dispatch cancellation.*pending approval.*after approval/i);
assert.equal(fixture.proposal.publicM1ApiChangeProposed, false);
assert.equal(fixture.proposal.implementationStatus, "NOT_INTEGRATED");
assert.equal(
  fixture.proposal.callbackBinder.path,
  "execution-isolation/gateway-adapter/create-gateway-mcp-tools.mjs",
);
assert.equal(
  fixture.proposal.callbackBinder.testPath,
  "execution-isolation/gateway-adapter/check-gateway-mcp-tools.mjs",
);
assert.equal(fixture.proposal.callbackBinder.fixedMetadataAndBackendAreSeparateInputs, true);
assert.equal(fixture.proposal.callbackBinder.strictArgsIdentityForwarding, true);
assert.equal(fixture.proposal.callbackBinder.strictAbortSignalIdentityForwarding, true);
assert.equal(fixture.proposal.callbackBinder.appContainerBackendImplemented, false);
assert.equal(fixture.proposal.callbackBinder.m1GatewayCallTested, false);
assert.equal(fixture.gatewayIntegration, "NOT_INTEGRATED");
assert.equal(fixture.nativeCodexShell, "UNPROTECTED");
assert.equal(fixture.fixtureIsHostOrGatewayProof, false);

process.stdout.write("M2_GATEWAY_ADAPTER_FIXTURE_PASS (BINDER_ONLY; NO GATEWAY OR HOST INTEGRATION)\n");
