# M2 to M1 Gateway Adapter Compatibility Proposal

Status: `BINDER_IMPLEMENTED_BACKEND_NOT_INTEGRATED`; the M2-local registration binder exists, but no isolation backend or M1 Gateway instance uses it yet.

Review checkpoint: 2026-10-14 04:26 UTC.

## Read-only sources

- M0 contract: coordinator worktree commit `19ee8ca`, `docs/3.0/API_CONTRACTS.md`. GitHub read-only fetch at 04:26 UTC confirmed public PR #30 is OPEN/Draft and its head is the same contract commit.
- M1 implementation: `feature/ac3-security-core` worktree commit `2276526cc70f4a13539e2172efae1fe3b4be16dd`; worktree was clean at inspection. GitHub read-only fetch at 04:25 UTC confirmed public PR #43 is OPEN/Draft and its head is the same commit.
- The inspected M1 Gateway branch is local module state. This proposal does not claim its code is merged into the AC3 base.

## Existing Gateway seam

M0 names `createTrustedExecutionGateway(GatewayOptions)` and `agent.dispatch(ToolCall, signal?)` as the single agent execution entry. In the inspected M1 implementation, `GatewayOptions.mcpTools` is copied into a private map at construction. A map entry is a host-owned registration keyed by exact tool ID:

```ts
{
  execute: (args: Record<string, unknown>, signal: AbortSignal) => Promise<unknown>;
  approvalRequired: boolean;
  risk?: "READ_ONLY" | "WRITE" | "EXECUTE" | "NETWORK" | "SENSITIVE_DATA" | "DESTRUCTIVE";
}
```

An agent request uses `name: "mcp_tool"` with `args.tool` equal to that exact registered ID and an object-valued `args.arguments`. The Gateway resolves the ID from its constructor-time map. Missing IDs, malformed arguments, and denied risks do not call the registered callback. There is no observed dynamic registration method.

The inspected callback order is security-significant:

1. `agent.dispatch` normalizes and bounds the request and performs an initial Guard check.
2. After serialization/queue admission, Gateway rechecks Guard and evaluates its policy against the exact registered MCP descriptor.
3. Required operator approval is represented by a one-use pending request; a caller-provided argument cannot grant it.
4. Immediately before execution, Gateway re-evaluates policy, performs the final Guard check, checks evidence capacity, and records `RUNNING`.
5. Only then does Gateway call the registered `execute(args, gatewayAbortSignal)` callback.
6. The callback result is recorded with M1’s existing evidence semantics; MCP success is `NOT_VERIFIED` for side effects.

M1 owns all authorization, approval, Guard, evidence, and fixed-resource registration decisions. The M2 adapter must not expose `operator`, duplicate policy, change the fixed resource set, or invoke the isolated worker directly from an agent-facing path.

## M2 implementation gap

The current M2 `AppContainerLauncher.Run` accepts a profile SID, absolute executable, argv, working directory, environment, and timeout. It is synchronous and exposes no `AbortSignal`, cancellation handle, or per-call JSON worker protocol. The current prototype also has no fixed mapping from Gateway tool IDs to worker executable/argv and authorized resource grants.

Therefore the M1 callback shape is clear enough to implement a narrow registration binder, but the existing M2 executor is not yet a compatible backend. The binder at `create-gateway-mcp-tools.mjs` separates fixed host metadata from an injected backend and forwards the exact registered ID, args object, and Gateway signal. It does not adapt `AppContainerLauncher.Run`, define the worker wire format, or establish a fixed tool/resource map. Treating an arbitrary in-process JavaScript callback as an AppContainer executable, or claiming the binder itself is an isolation backend, would be unsafe. No M1 public API change is proposed.

## M2-local callback binder and backend proposal

The host can pass exact tool IDs and static approval/risk metadata to `createGatewayMcpTools(fixedToolMetadata, backend)` and supply the returned map as Gateway `mcpTools` at construction. The binder puts each ID in a closure and freezes the Gateway-shaped descriptor. Its callback forwards the unchanged args object and the identical Gateway `AbortSignal` to the injected backend. The backend must resolve each ID through a host-fixed table, launch a versioned worker protocol in the supported isolated executor, and terminate/await its owned process job when the signal aborts. The binder rejects agent-controlled metadata fields such as executable paths; the backend must also avoid deriving executable paths, working directories, or ACL grants from per-call args.

For the M2 binder only, each host-fixed metadata record also requires `executionSurface: "M2_ISOLATED_WORKER" | "NATIVE_CODEX_SHELL"`. This is adapter metadata, not a change to M1's public Gateway descriptor. The surface must come from the trusted host registrar's fixed registration table, never from agent input. Missing or unknown surfaces fail construction with `M2_GATEWAY_MCP_METADATA_INVALID`; `NATIVE_CODEX_SHELL` fails with `M2_NATIVE_SHELL_UNPROTECTED` before the binder returns a callback. The tool ID is not used to guess the surface: a protected M2 worker may use the ID `Bash`, while a native Shell registration under any ID is rejected if the trusted registrar marks its actual surface. The marker does not prove the backend is isolated; the backend and registration provenance remain host integration responsibilities.

```text
MCP request
  -> M1 agent.dispatch
  -> M1 policy / approval / final Guard + evidence gate
  -> M1 registered callback: execute(args, signal)
  -> M2 adapter for the exact fixed tool ID
  -> M2 broker and fixed worker/resource table
  -> isolated process result
```

The M2 callback binder is implemented and locally tested, but it is not connected to an M1 Gateway instance. The broker, worker protocol, real AppContainer bridge, and process cancellation handle are not implemented. A successful binder test or contract fixture is not proof of Gateway integration, AppContainer isolation, or native Shell protection.

The binder does not infer execution surface from a registration ID. It allows ID `Bash` only when trusted host metadata classifies it as `M2_ISOLATED_WORKER`, and refuses any registration marked `NATIVE_CODEX_SHELL` with `M2_NATIVE_SHELL_UNPROTECTED` during construction. Missing/unknown surface metadata also fails closed. This only constrains registrations routed through the M2 binder and correctly classified by a trusted registrar; it does not intercept Desktop's direct Shell tool or prove the injected backend is isolated. Codex supports a local `PreToolUse` Hook for matching `Bash`/`exec_command`; an explicit `hookSpecificOutput.permissionDecision: "deny"` can block that call when the Hook runs. Non-managed Hooks require review and trust of the exact current definition, and project-local Hooks load only when the project `.codex/` layer is trusted. This is not a fail-closed boundary: callback errors/timeouts or malformed/unsupported output may leave the tool call unblocked; MCP Hook errors, missing servers, or unavailable tools do not block the operation, and some specialized paths can bypass default Hooks. The repository fragment is not installed, and Desktop loading/trust state is unknown. Native Shell therefore remains `UNPROTECTED` / `BLOCKED_NOT_VERIFIED` until a real Desktop-host test proves a protected-path denial. [Codex Hooks](https://learn.chatgpt.com/docs/hooks)

## Minimum M1 owner decision

Please confirm these two points before M2 binds a future broker to this seam:

1. **Registration seam:** is the existing constructor-time `GatewayOptions.mcpTools[exactToolId].execute(args, signal)` callback the intended and sufficient M1 integration point for an M2 per-tool adapter, with all authorization left in Gateway and no new public Gateway option?
2. **Approval cancellation:** is it intentional that `agent.dispatch` cancellation is not retained across `REQUIRE_APPROVAL` and `operator.approve(requestId)`? If the original signal must cancel the pending/approved operation, M1 owns any pending-state or public API change; M2 will then forward the callback signal unchanged.

If the existing registration seam is confirmed and current approval cancellation is intentional, M2 can implement its worker/broker protocol privately and supply callback entries without changing M1 APIs. If M1 requires a first-class isolated-executor field or different approval cancellation, M1 must own any public type/contract change; M2 must not add it unilaterally.

## M2 regression fixture boundary

`contract-fixture.json` and `check-contract-fixture.mjs` pin the observed public callback shape, authorization/cancellation order, M0/M1 public PR heads, and `BINDER_IMPLEMENTED_BACKEND_NOT_INTEGRATED` status. `check-gateway-mcp-tools.mjs` asserts fixed IDs and metadata plus strict identity forwarding for args and `AbortSignal`. These checks do not import M1’s separate worktree, run a Gateway call, simulate approval as real authorization, or prove that a worker is isolated.

Until the broker, resource map, cancellation bridge, and combined M1/M2 test are implemented and reviewed, mark Gateway integration `NOT_INTEGRATED` and native Codex Shell `UNPROTECTED / BLOCKED_NOT_VERIFIED` (#45).

## Approval cancellation nuance

In the direct no-approval path, M1 links the caller-provided `agent.dispatch` signal to the callback controller, along with Gateway deadline, Guard quarantine, and `close()` cancellation. The approval path has a narrower contract: `operator.approve(requestId)` currently has no signal parameter and calls the approved callback without retaining the original `dispatch` signal. M2 can forward only the callback signal it receives; it cannot infer cancellation of an already-pending approval.

The M1 API contract states the callback type but does not specify whether cancellation of the original dispatch should withdraw a pending approval or cancel execution after approval. This is a second, concrete owner question because it changes when the isolated worker must be terminated.
