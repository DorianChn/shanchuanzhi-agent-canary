# M3 protected-host adoption status

Date: 2026-10-22
Status in this M3 worktree: `BLOCKED / UNKNOWN`
Policy: fail closed; no path-only fallback.

## Implemented M3 boundary

The connection-check MCP server now offers one fixed `protected_read` tool for the temporary file `agent-canary-public.txt`. The trusted host binds that exact relative path and passes the call through M2's public `createSecurityGatewayHostAdapter` facade, which composes the M5 `createSecurityToolRouter` and M1 Gateway capability methods. The server returns only a fixed marker after the protected read; it does not return arbitrary file contents.

The helper reports `UNKNOWN` unless the public facade can be loaded, M1 capability methods are present, M5 composition succeeds, and the fixed safe-read positive control actually returns the expected marker. It never catches a failure and retries with a generic `executeRealTool` path. The M3 regression checks assert that aliases and same-path inode replacement do not increment the observed M5 execution callback count, do not add M1 Gateway evidence, and do not change either file's bytes. Those two cases execute only when the full owner API composition is available; an incomplete composition is explicitly kept `UNKNOWN`.

## Exact current worktree evidence

| Owner | Local candidate checked | Relevant interface state |
| --- | --- | --- |
| M3 | `feature/ac3-agent-onboarding` at `535d429faef7ae0e15bbf9b382d639280045f338` | `src/runtime/gateway.ts` returns no `bindFileReadCapability`, `verifyFileReadCapability`, or `readFileWithCapability`; `src/risk-policy.ts` has no `fileReadCapability` provider; `package.json` exports `./sdk` only and has no `./gateway-adapter` self export. |
| M1 | `feature/ac3-security-core` at `7279336307fc7aacd46119405858d4fd91499757` | The separate M1 candidate implements the three held-file capability methods over its registered file identity. These methods are not in the checked M3 source tree. |
| M2 | `feature/ac3-execution-isolation` at `be66cf8f4c1a60f093740577796ec5cd633e1d93` | The separate M2 candidate exposes only `createSecurityGatewayHostAdapter` through the public `./gateway-adapter` subpath. This M3 worktree does not contain that manifest/export change. |
| M5 | `feature/ac3-policy-audit` at `bbce79aa086b39b51422cc72471c23c963778650` | The separate M5 candidate accepts and verifies the trusted `fileReadCapability` provider; the checked M3 `risk-policy.ts` does not contain that contract. |

The checked M3 source uses its own older Gateway and policy router, and its package manifest does not resolve the M2 public subpath. The new fail-closed preflight therefore returns `M1_HELD_FILE_CAPABILITY_UNAVAILABLE` on this M3 head before any M5 callback or Gateway dispatch. This is an exact API-composition blocker, not evidence that a protected read succeeded or that a bypass occurred.

## Cross-worktree candidate compatibility probe

A local probe invoked the M3-owned host composer with the exact M1 Gateway, M2 public facade module, and M5 router functions from the refs in the table above. It passed the fixed-file positive read, then denied an alias and same-path inode replacement. The alias and replacement each had M5 callback delta `0`, M1 evidence delta `0`, and preserved the original/replacement bytes as expected. The result summary is in [PROTECTED_HOST_CANDIDATE_PROBE.json](PROTECTED_HOST_CANDIDATE_PROBE.json).

This proves those owner APIs can compose through the M3 adapter in one local process. The probe injected the facade/router dependencies because the M3 package self-export and M1 implementation are absent from the checked M3 tree. It did not run `runCodexConnectionCheck()` or the spawned Codex CLI against one unified exact-source tree. Consequently the default M3 checkout remains `BLOCKED / UNKNOWN`; M9 still owns the unified source-pin and actual host-check gate.

## Required follow-up for #52

1. M9 must compose exact reviewed M1, M2, M3, and M5 refs, including the M2 public facade manifest and the M1/M5 source implementations.
2. Run the M3 connection-check host against that composed tree and require one fixed-file safe-read marker via M5 callback count `1`.
3. On that same tree, require path alias and same-path replacement attempts to deny with M5 callback delta `0`, M1 evidence delta `0`, and unchanged relevant bytes.
4. Keep #52 P0/OPEN/NOT_VERIFIED until those exact composition checks and the separately required product-host protected-open / held-object evidence pass. This temporary checker does not establish protection of user workspace files or native Codex tools.
