# M4 Desktop Integration Report

Date: 2026-10-13
Branch: **feature/ac3-desktop-security-center**
Base: **feature/agent-canary-3.0** at **62496d4020bd90ba2eede49b2e80a2bbebb036b4**

## Integration approach

M4 extends the existing local Console page in **src/ai/console-page.ts**. It does not create another desktop product. The page continues to call the incumbent Console API and retains the existing Host/Origin checks, **x-canary-csrf** header, and operator checks. **src/ai/console.ts** is unchanged.

A new M4-owned **src/ai/security-center-adapter.ts** validates the four exact protection statuses and is serialized into the current inline page. The browser and Node tests use the same adapter functions. Values outside the exact allowlist become **UNKNOWN**.

## Backend data observed

| Source | Current result | UI use |
| --- | --- | --- |
| **GET /api/state** | **200**; response includes the latest 100 recorded events. | Event timeline only. Existing aggregate counters are audit-event counters, not current protection metrics. |
| **GET /api/agents** | **200**; returns configuration detection plus a demo-install section and an explicit demonstration scope. | Only supported Agent configuration detections are shown. **installed**, **status: PARTIAL**, and the always-detected **custom** placeholder are not treated as live connection or protection evidence. |
| **GET /api/policy/state** | **200**; reports **mode**, **guardState**, and scope **VIRTUAL_EXECUTORS**. | Displays the actual Console demo mode with its virtual-executor scope; does not populate live Agent policy or protection state. |
| **GET /api/runtime3** | **200**; reports the controlled SDK demo identity, coverage, and current demo Guard state. | Displays only the scoped demo Guard value; it does not populate product-wide Canary isolation or protection state. |
| **GET /api/security-center** | **404** on this branch. | Overall status, Gateway, Hook, product-wide Agent policy/isolation, tool coverage, and unprotected execution paths remain **UNKNOWN**. Scoped Console demo values are displayed separately. |
| **GET /api/e4/status** | **404** on this branch. | E4 runtime status remains **UNKNOWN**; the missing interface is reported. |

The **/api/security-center** payload shape accepted by the adapter is an optional integration boundary, not a new public API contract. It supports exact **protectionStatus** values, Gateway connection status, Hook/isolation/policy state, tool count, unprotected-path list, and live Agent records if an owning backend later supplies them.

## User flows

- **Health check:** Reads the four existing routes (**/api/state**, **/api/agents**, **/api/policy/state**, **/api/runtime3**) plus the two optional security/E4 routes with an 8-second per-request timeout. **4/4** means those existing read APIs are readable; it is explicitly not a protection-health result.
- **Events:** Refreshes every 10 seconds while the tab is visible. Empty data is labeled as an empty recent-record range.
- **Intercept explanation:** Uses the actual event kind and sanitized reason; the adapter drops arguments, paths, tokens, and unrelated event fields.
- **Diagnostic export:** Produces **agent-canary.security-diagnostic.v1**. The JSON contains status values, source outcomes, Agent detection booleans, and event kind/time explanations. It omits event arguments, reason text, raw configuration paths, and secrets.
- **E4 entry:** Opens a panel with **npm run build && node --import tsx --test test/auto-e4.test.mjs** and a copy action. This local script is not the full external E4 process and is not run by the Console. Full E4 status/run APIs are missing, so the panel stays **UNKNOWN**.

## Ownership and API boundary

Modified M4 files:

- **src/ai/console-page.ts**
- **src/ai/security-center-adapter.ts** (new)
- **test/runtime-console.test.ts**
- **docs/3.0/M4/UX_ACCEPTANCE.md**
- **docs/3.0/M4/DESKTOP_INTEGRATION_REPORT.md**
- **docs/3.0/M4/UI_TEST_RESULTS.md**

No **src/ai/console.ts**, **package.json**, M1 Gateway/Hook code, M2 isolation code, M0 coordination file, or M3 integration implementation was changed.

**API-Contract-Change: no.** The UI probes optional read routes but adds no route, response field, or server behavior. No M1/M2 security-execution logic was changed.

## Remaining integration work

- M1/M3/M5 owners need to provide a real read-only Console status response for Gateway, Hook, connected Agents, current policy, Canary isolation, protected tools, and unprotected paths.
- M6/M7 coordination needs to expose a safe E4 run/status capability if Console is expected to launch the full automation.
- The headless browser emitted the diagnostic download request and generated the JSON payload, but cancelled the final file write. The UI now says to check the browser download list; an ordinary interactive browser download was not verified.

## 2026-10-21 M0 source audit for M4: OBSERVE protected-read host boundary

This source/contract audit was conducted for M0 integration coordination and is recorded here under M4 file ownership; it is not a disposition from the M4 owner. The current first-party desktop Console has no supported OBSERVE file-read callsite that consumes the M1-bound protected identity through the M2 adapter. No safe M4 wiring change is available against the current contracts. Do not connect a path-only callback by disabling strict path checks or label a demo read as product protection.

### M4 entrypoint evidence

- The desktop entry remains `src/ai/cli.ts::registerAICommands` → `src/ai/console.ts::startAIConsole`. `startAIConsole` constructs `createRuntimeDemo()` and `createPolicySandbox()`.
- `POST /api/runtime3/action` calls `runtime3.action`. `src/runtime/demo.ts::createRuntimeDemo` performs real temporary-file I/O through a directly constructed `createTrustedExecutionGateway`; its `read` action dispatches the fixed `public.txt` fixture. The demo is explicitly `DEMO_REAL_TEMPORARY_FILE_IO_NO_AGENT_MODEL` with `REGISTERED_CAPABILITIES_ONLY` coverage. It bypasses both the M2 adapter and the OBSERVE policy router, so it is not the required first-party OBSERVE consumer.
- `POST /api/policy/action` calls `sandbox.action`. `src/ai/policy-demo.ts::createPolicySandbox` sets up `VIRTUAL_EXECUTORS`; its `read` callback returns the static value `Public README` and performs no file read. OBSERVE in this sandbox does not establish a real host read.
- The existing `src/protected-mcp.ts::serveProtectedMCP` is a standalone STDIO server built around caller-supplied callbacks. It does not import or compose the M2 Gateway adapter and has no callsite from the desktop Console.
- `src/ai/console.ts` does not register `/api/security-center` or `/api/e4/status`; the earlier M4 local API check recorded both as 404. There is therefore no live desktop API route that supplies or executes the required capability.

### Adapter and identity contract evidence

At the reviewed public Draft PR heads, M2 #37 is `d054ceea39a0e4dd040131b4ca2789b85f2c9fe4`, M1 #43 is `c016431875a7783f579aa93cd135459ea954d560`, and M5 #47 is `99ab80770d8004ef85f13f2d5c0f48f934607603`.

- M2's `execution-isolation/gateway-adapter/security-gateway-adapter.mjs::createSecurityGatewayAdapter` accepts fixed relative path strings and forwards `gateway.agent.dispatch({ name: "read_file", args: { path } }, signal)`. Its `createSecurityGatewayHostAdapter` requires `mode: OBSERVE` and `verifyRealPaths: true`, but the M2 PR report states the adapter has no first-party product caller and the binder/backend are not integrated.
- M1's public Gateway holds and revalidates registered file identity internally, but its returned object does not expose an opaque per-file identity capability for M5 to validate. The M2 callback supplies only a path string.
- M5's current strict router rejects generic path-based file callbacks with `path_execution_not_pinned` before invoking the callback. The M2 host helper preserves that strict setting, so the current adapter shape cannot provide a successful strict-mode safe-read control. Weakening that check would invalidate the security boundary.

### Required dependencies and acceptance

1. M1 must review and define a host-only capability bound to a registered held file identity, or an equivalent identity-verifiable API.
2. M5 must review a contract that validates that capability and continue rejecting unverified path-only callbacks.
3. M2 must update its adapter/host composition contract to carry the reviewed capability, then demonstrate its exact call shape and fail-closed behavior.
4. After those dependencies are available and pinned, M4 can wire the supported Console OBSERVE entrypoint and add an end-to-end positive safe-read control plus negative sensitive-alias, symlink/junction, and path-replacement controls. Rejections must occur before callback dispatch and before any approval is created.
5. M0 coordinates the owner-reviewed contract and M9 pin/check sequence. Until then, product OBSERVE file-read consumption remains `NOT_VERIFIED`.

This assessment is a source/contract audit only. No host file-read, installer, VM, or real-model action was performed, and no M4 runtime test was run for this report-only update.

## 2026-10-21 Issue #60: M1 canonical Hook contract dependency

M1 rejected PR #34's shared Hook-test blob `e8ae8202492fc44fbb13c7ee855198ac8e62f436`: it changes a native unpinned `Read` from deny to allow and removes the `Write`/`Delete`, normalized-log redaction, caller-canary absence, and fixture-preservation assertions. M1's accepted test blob remains `82ca4662e0a6c4269011ff8eba9470f2a26ccc39` on branch head `5cb57c9b1b61884ab06d10b2f8a40426941ad0bc`.

### Reproduction and source comparison

In an isolated, reverted comparison, I temporarily ran the M1 test blob against PR #34's current source after `npm run build`, then ran `node --import tsx --test test/agent-hook.test.ts`. The focused suite produced **10/11 passing**; the unpinned native-file test failed on `Read` with actual `allow`, expected `deny` (test line 41). The M4 worktree was restored afterward; its canonical M1-owned test path was not retained as a change.

The failure matches the exact source-ref difference:

| Ref | `src/agent-hook.ts` blob | `src/security-router.ts` blob | Relevant behavior |
| --- | --- | --- | --- |
| PR #34 base `7ac32473a2b15207d6d88e0884d5d5271599a7c7` | `f1bd9916255be22c9dc69aebec3b4448d571b118` | `6add375324f909e83da1fd2c14fc181ed738e535` | No unpinned-native-operation denial is present; the reproduced in-workspace native `Read` receives `ALLOW`. |
| M1 branch `5cb57c9b1b61884ab06d10b2f8a40426941ad0bc` | `76f7bf6314046777ee1615873e5de4621671ea15` | `183d1f8443498568e9d49143e746f0bc274faa2c` | Adds `native_file_execution_not_pinned` denial and preserves path/policy-denial precedence. |

### M4 boundary and required decisions

M4's owned `src/ai/security-center-adapter.ts` is a presentation adapter: it consumes an optional read-only security-center payload, accepts only exact status values, and keeps missing protection data `UNKNOWN`. The current Console has no native Hook invocation or `/api/security-center` backend route. The M4-owned `test/runtime-console.test.ts` passed **9/9**; its absent-backend cases confirm the UI does not infer Hook protection from demo or configuration data. Therefore an M4 UI adapter cannot supply the missing Hook authorization behavior or make the canonical Hook test pass on PR #34's current source ref.

Required owner decisions before integration:

1. **M1:** identify the exact source ref that provides canonical unpinned `Read`/`Write`/`Delete` denial and its accepted shared Hook-test blob; M4 will not change the canonical test or Hook/Gateway implementation.
2. **M5:** confirm how its policy-owned risk rules preserve M1's hard-denial precedence and how that state is exposed to the optional read-only security-center response. The UI will continue to show `UNKNOWN` until a backend owner supplies verified state.
3. **M0/M9:** compose only after those owner decisions are recorded, then rerun the exact PR #34 source/test combination.

No M4 source adapter can resolve this branch dependency without taking ownership of M1 authorization or inventing backend status. No cross-module code change, GitHub comment, or push was made for this finding.

## 2026-10-21 Issue #60: PR #34 base-file restoration

On M4 commit `91d46e9807e796f83c709d35bf4b04ed7e9df97c`, `test/agent-hook.test.ts` was restored byte-for-byte to the requested common-base blob `1ecb3ee8b45f1fbe942a25bcd5ce696f82534601` from `62496d4020bd90ba2eede49b2e80a2bbebb036b4`. `git diff 62496d4020bd90ba2eede49b2e80a2bbebb036b4...HEAD -- test/agent-hook.test.ts` is empty; M4 no longer changes the M1-owned test in its PR diff.

After this restoration, `npm run build` passed, `node --import tsx --test test/agent-hook.test.ts` passed **10/10**, and `node --import tsx --test test/runtime-console.test.ts` passed **9/9**. The 10/10 Hook result exercises the older common-base test contract, which allows an in-workspace native `Read`; it does **not** validate M1's newer unpinned-file denial contract. M1's accepted Hook test blob `82ca4662e0a6c4269011ff8eba9470f2a26ccc39` and corresponding denial implementation are not yet in the common base. Therefore the green M4-base suite does not resolve #60 or establish the M1 contract on the M4 integration ref.

Before M9 treats the combined branch as accepted, M1 must provide the exact integrated source and canonical-test refs, and M5 must confirm any policy-owned decision/status interface preserves M1's hard-denial precedence. M4's UI continues to report missing live Hook status as `UNKNOWN`. The temporary dependency junction and build output used for local tests were removed; no M5 worktree or remote PR state was changed.

## 2026-10-21 15:38 UTC Issue #52 first-party Console route recheck

M4 PR #34 is still at `fde972cd8d4c17ead4a18187fa4b273482bddd2d`, clean, with merge base `62496d4020bd90ba2eede49b2e80a2bbebb036b4`. The exact candidate refs checked for this audit are M1 PR #43 `7279336307fc7aacd46119405858d4fd91499757`, M2 PR #37 `eed2c0884f524d37c25d317888e1d289122c440d`, and M5 PR #47 `ed304e399ec237a47e03830e5013695ddcc10dd6`.

### Current M4 call chain

- `src/ai/cli.ts::registerAICommands` starts `src/ai/console.ts::startAIConsole`. The Console handler at `src/ai/console.ts` constructs both `createRuntimeDemo()` and `createPolicySandbox()`; `POST /api/runtime3/action` calls `runtime3.action`, and `POST /api/policy/action` calls `sandbox.action`.
- `src/runtime/demo.ts::createRuntimeDemo` makes a real read only from its own synthetic temporary workspace by directly constructing `createTrustedExecutionGateway`. Its `read` action dispatches the fixed `public.txt` fixture; it does not call the M2 adapter or M5 OBSERVE router.
- `src/ai/policy-demo.ts::createPolicySandbox` calls this M4 checkout's `src/security-router.ts::createSecurityToolRouter`, but its `executeRealTool` is virtual and returns static `Public README`; it performs no filesystem read.
- The M4 checkout has no `createSecurityGatewayAdapter` / `createSecurityGatewayHostAdapter`, `bindFileReadCapability`, `verifyFileReadCapability`, `readFileWithCapability`, or `fileReadCapability` references. Its local router predates the exact M5 strict capability contract.

### Dependency and ownership blocker

- M1's current candidate adds the host-only Gateway methods that issue, verify, and consume the opaque capability, but those methods are absent from M4's checked-out `src/runtime/gateway.ts`.
- M2's exact adapter exists at `execution-isolation/gateway-adapter/security-gateway-adapter.mjs` only on PR #37's candidate tree; that path is absent from the M4 tree. The candidate package manifest exports only `./sdk` and its published `files` allowlist omits `execution-isolation/`, so there is no currently declared package import boundary that exposes this adapter to a packaged consumer.
- M5's exact strict router accepts the verified capability provider and forwards the verified capability in callback context, while M4's checked-out `src/security-router.ts` has no such API. Importing the local M4 router would not implement the accepted strict contract.
- Ownership remains split: M4 owns `src/ai/console-page.ts`, `src/ai/security-center-adapter.ts`, `test/runtime-console.test.ts`, and `docs/3.0/M4/*`. The coordinator map assigns `src/ai/console.ts` route integration to M3 with M4 as the Security Center companion, marked tentative; it also requires confirming the owner of any additional host callback file before editing it. M4 can identify the Console entrypoint but cannot safely implement this backend route without the missing dependency import boundary and route-owner confirmation.

No implementation was added: wiring a direct path callback, the demo Gateway, or the virtual sandbox would bypass at least one accepted security boundary. #52 remains `OPEN/P0/NOT_VERIFIED`.

### #52 acceptance needed to resume M4 host wiring

1. Confirm M3 as owner of the `src/ai/console.ts` host route (or record an explicit M3/M4 shared-file handoff), and keep M4 responsible for the Console UI behavior.
2. Pin the exact M1/M2/M5 candidate refs in an integration source tree that the supported desktop build/package actually includes; agree on and test an import/export boundary for the M2 adapter rather than reaching into an omitted source-only path.
3. Through the real Console request path, demonstrate one registered safe read using M1's bound capability through M2 and M5 strict `OBSERVE` with `verifyRealPaths:true`.
4. Preserve hard denial for path-only, sensitive-alias, symlink/junction-alias, and path-replacement cases. Each negative case must show no file-effect callback and no approval creation, with target content/hash unchanged.
5. Run focused owner tests and exact-head hosted CI on the composed refs, then let M9 pin that exact composition. This remains bounded synthetic/product-route evidence; it must not be described as an OS-wide atomic path/open guarantee or as closed TOCTOU without separate evidence.

This recheck used public candidate source and the existing M4 checkout only. No host user-file read, installer, VM, or real-model test was performed; no M1/M2/M5 source or tests were changed.

## 2026-10-22 Issue #52 current M4 consumer gate

This checkpoint supersedes older dependency hashes in the Issue #52 notes above. Exact refs checked: M4 PR #34 `d5b84c4e035e8e51ab383d03c0b8ba0cb7bf9c84`; M3 PR #33 `465bd606ed376054e5d9ae63b30f090dab7aec75`; M1 PR #43 `a5eff766ebe041bc2c6cc13758827d5a96205de9`; M2 PR #37 `099ad64e4a09330920cbd40847adec3fe631e91e`; M5 PR #47 `e6bb5cfaf5e3a55497ab300da3bf14bbb4b4b3d2`. All are open Draft PRs at this checkpoint.

### Current callsite and supported seam

- M4's first-party entry remains `src/ai/cli.ts::registerAICommands` → `src/ai/console.ts::startAIConsole`. In this exact M4 source, `POST /api/runtime3/action` calls `runtime3.action`; that runtime performs a read only against its fixed temporary demo fixture. `POST /api/policy/action` calls `sandbox.action`; its read result comes from a virtual callback. There is no M4 Console file-read route and its `GET /api/security-center` returns 404. The current M3 candidate adds that GET status route, but no M4 read action route.
- M1's exact PR #43 candidate exposes `bindFileReadCapability`, `verifyFileReadCapability`, and `readFileWithCapability` on its Gateway. M2's exact PR #37 `createSecurityGatewayAdapter` binds the exact fixed tool/path to that M1 capability, verifies it at dispatch and callback time, and reads through `readFileWithCapability`. Its `createSecurityGatewayHostAdapter` composes this with M5's strict `OBSERVE` router. This is a supported candidate seam, but it is not called by M4's product Console route.
- M2's exact PR #37 candidate bundles the protected adapter behind the public `./gateway-adapter` subpath and exports only `createSecurityGatewayHostAdapter`; its low-level `createSecurityGatewayAdapter` remains private. M4's current PR #34 package manifest and Console source do not import or call that public M2 adapter. M4's checked-out route/router sources also do not compose the exact M2/M5 host adapter contract.
- The M2 `securityCenterStatusProvider` is a status provider for its candidate fixed bindings. Exposing it through a GET route can report binding/policy state or `UNKNOWN`; that status does not prove that a first-party file-read action called the adapter or that a callback returned bytes through M1's held identity.
- M3 PR #33 at `465bd606ed376054e5d9ae63b30f090dab7aec75` exposes `securityCenterStatusProvider` through `GET /api/security-center`; its route tests cover default `UNKNOWN`, status sanitization, and failed/invalid-provider fallback. The same exact M3 `src/runtime/gateway.ts` lacks all three M1 capability methods, and M3's `src/ai/console.ts` has no `file-read` callsite. Its status-only route does not itself execute a protected file read. M0 additionally reports a local exact-M1/M2/M3 composition harness with safe-read success and alias denial/zero side effects; treat that as synthetic cross-worktree evidence, not a first-party M4 Console callsite.

### M4 UI behavior and minimum consumer contract

M4 now presents `产品 OBSERVE 文件读取 · NOT_VERIFIED` separately from the backend Gateway status. The M4 adapter keeps this field `NOT_VERIFIED` even when a supplied snapshot says the Gateway binding is `PROTECTED`; neither that summary nor the temporary runtime/virtual policy demos can promote it. A backend `DENY` remains `DENY` in the policy result, while contradictory allow/executed fields are rendered as `POLICY_CONFLICT`. Missing, unsupported, or malformed security-center data remains `UNKNOWN`.

To move the M4 consumer field from `NOT_VERIFIED`, all of the following must be demonstrated on a composed source ref:

1. M3 owns the real Console route and retains one trusted M1 Gateway, exact M2 security adapter, and M5 strict `OBSERVE` router instance; the adapter must be reachable through a reviewed host/package import seam.
2. The UI action submits only an allowlisted fixed tool/path. The route calls M2's adapter dispatch; no direct `fs` callback, path-only route callback, virtual policy callback, or runtime demo is presented as the product read.
3. An end-to-end positive safe-read case returns the expected fixture through `readFileWithCapability`. Path-only input, sensitive aliases, symlink/junction escapes, and path replacement must deny before the file-effect callback and before approval creation; each negative case preserves target bytes/hash.
4. M4's existing security-center UI consumes M3's GET status route when that route is composed, preserving its scoped/UNKNOWN fields. M4 displays real request results (`DENY` stays denied; unavailable or unrecognized data stays `UNKNOWN`) and keeps the separate product-consumer status `NOT_VERIFIED` until the above read-route tests and exact source pins pass.
5. M9 pins the exact M1/M2/M3/M4/M5 source refs and records hosted checks. Do not interpret this bounded host composition as an OS-wide atomic file-open/TOCTOU guarantee.

Focused M4 verification is required for the UI/adapter assertions. This checkpoint did not run a protected product file read and does not close Issue #52. Issue #52 remains `OPEN/P0/NOT_VERIFIED` for first-party consumer and host/TOCTOU evidence.
