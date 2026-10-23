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

## 2026-10-22 20:29 UTC Issue #52 post-M3-route consumer recheck

Exact hosted heads rechecked: M4 PR #34 `83a3abc0b85e783c34d79392e50015ed8f24e184`, M3 PR #33 `465bd606ed376054e5d9ae63b30f090dab7aec75`, M2 PR #37 `099ad64e4a09330920cbd40847adec3fe631e91e`, M1 PR #43 `a5eff766ebe041bc2c6cc13758827d5a96205de9`, and M5 PR #47 `e6bb5cfaf5e3a55497ab300da3bf14bbb4b4b3d2`.

### Observed route/API boundary

- M3's `src/ai/console.ts::startAIConsole` now accepts `securityCenterStatusProvider` and serves it through `GET /api/security-center`. It sanitizes scoped Gateway/policy status and falls back to `UNKNOWN`. Its route exposes status only: the exact source has no `file-read` API or protected read `POST` callsite.
- On the same M3 ref, `src/runtime/gateway.ts` does not expose M1's `bindFileReadCapability`, `verifyFileReadCapability`, or `readFileWithCapability`. M3's existing `POST /api/runtime3/action` still calls the temporary Runtime demo, and `POST /api/policy/action` calls the virtual policy sandbox. Neither is a product OBSERVE file read.
- M1 #43 supplies the three Gateway capability methods. M2 #37's public package subpath `@dorianchn/agent-canary/gateway-adapter` exports `createSecurityGatewayHostAdapter`, which accepts a trusted Gateway, fixed file-read bindings, and the strict M5 router factory/options and returns `dispatch` plus `securityCenterStatusProvider`. M5 #47's current strict router consumes the verified file-read capability context and preserves hard denial. These candidate contracts are available separately, but the current M3 host source does not instantiate that exact M1/M2/M5 composition for an action route.
- M4's current `src/ai/console.ts` has no file-read POST route and no import/call of M2's host adapter. M4's UI already polls `GET /api/security-center` and runs `securityCenterAdapter.adaptSecuritySnapshot`; it can display M3's scoped status when composed. A `PROTECTED` Gateway binding/status is not evidence that a user-facing M4 read action dispatched through M2 and returned data using M1's held identity.
- The existing M4 UI field and diagnostic keep product OBSERVE file reading `NOT_VERIFIED`; the M4 test fixture now matches M3's sanitized scoped provider response (`PARTIALLY_PROTECTED` overall, `PROTECTED` Gateway) and asserts the consumer remains `NOT_VERIFIED`. Missing M3 route and M3 route-without-provider remain distinct (404 versus 200/UNKNOWN), both non-proof states. The denial display test keeps `DENY` and its risk list intact.

### Next owner and blocker

Next owner is **M3 for the first-party host/read route**, after **M0/M9 pin an exact-source integration of M1 Gateway + M2 host adapter + M5 strict router into the supported M3 host build**. M1 owns the Gateway capability source, M2 owns the adapter/package contract, and M5 owns strict policy behavior. M4 owns only the UI display/consumer contract and keeps `NOT_VERIFIED` until the real M3 Console route has positive safe-read and zero-side-effect negative controls for path-only input, sensitive aliases, symlink/junction escapes, and path replacement. No M4 runtime or shared API was changed for this recheck; no product file read was performed. Issue #52 remains `OPEN/P0/NOT_VERIFIED`.

## 2026-10-22 21:36 UTC M4 status-only endpoint distinction

Exact refs rechecked for this M4-owned UI/doc follow-up: M4 PR #34 `6d5b05b4ca634dd5727b62f621f783f8e56586b5`, M1 PR #43 `c67b15f76973a2333ce523dd58d5b7439ab40702`, M2 PR #37 `92a9562a44ad395ec33d5afd74c394d7f0863c85`, M3 PR #33 `545958391c44e4a8207e77881e76b615476adf6c`, and M5 PR #47 `c9003234913a0ccccca56fe2a36fb1ce3dacb2de`. These refs were open Draft PR heads at the time of the check.

The M3 `GET /api/security-center` contract accepts no read request and only returns the optional status provider's normalized snapshot (or `UNKNOWN`). The separately exposed fixed protected-read MCP probe is not called by the desktop page. M4 therefore keeps `firstPartyObserveReadStatus` at `NOT_VERIFIED`, including when a provider reports a connected or protected Gateway. The UI now states that the status GET does not perform file I/O and that an MCP probe, Gateway binding status, Runtime temporary-file demo, or virtual policy read does not prove this desktop OBSERVE path.

The focused runtime-console test asserts both the `NOT_VERIFIED` label and the status-only/API-versus-product-read explanation. This M4 change adds no route, execution callback, or shared API field and performs no product file read. The first-party consumer gate remains with M3: expose a reviewed Console action route that invokes the composed M1 Gateway / M2 adapter / M5 strict-router path and returns only sanitized status/result; prove a safe-read positive control and zero-side-effect negative controls before any M4 display promotion. Issue #52 remains `OPEN/P0/NOT_VERIFIED`.

## 2026-10-22 23:22 UTC M4 consumer feasibility against current public heads

The current public Draft heads were read from GitHub: M1 PR #43 `6886d6eef3beb972bc8f4c797584b0f522483870`, M2 PR #37 `67428139e53c3f63a1101b4f94e84b291cbb1196`, M3 PR #33 `34b526d4d63f28c09400e0130b09ead13d394aca`, M4 PR #34 `264bc288dc92a75e424e366a070420f8d7e2e131`, and M5 PR #47 `12b2499a1f7b8525f3bf2d7659249c1bd8e881ed`. All five were `OPEN` and Draft when checked.

### Exact host and adapter evidence

- M4's actual server entry is `src/ai/console.ts::startAIConsole`. At the checked M4 head, `POST /api/runtime3/action` at line 82 calls the temporary `runtime3.action`, while `POST /api/policy/action` at line 94 calls the virtual `sandbox.action`. The M4 page has no backend OBSERVE read action, and M4's package manifest exports only `./sdk`; it has no `./gateway-adapter` export or `execution-isolation` package file.
- M3's current public `src/ai/console.ts` has `GET /api/security-center` at lines 152–155, which returns only `securityCenterStatusProvider` output (or `UNKNOWN`). Its only action callsites remain `/api/runtime3/action` at line 184 and `/api/policy/action` at line 196. The status endpoint does not execute or return file contents.
- M3's current public `src/runtime/gateway.ts` defines `createTrustedExecutionGateway` at line 38 but has no `bindFileReadCapability`, `verifyFileReadCapability`, or `readFileWithCapability` method. Thus its current desktop host cannot provide M1's required held identity to the adapter.
- M1's current public PR does provide those three Gateway capability methods. M2's current public PR packages `@dorianchn/agent-canary/gateway-adapter`; the facade exports `createSecurityGatewayHostAdapter`. That adapter is a usable candidate seam when its dependencies are composed: it requires `mode: 'OBSERVE'` and `verifyRealPaths: true`, and routes reads through the M1 capability API. However, the M2 subpath and file are not in the current M4 or M3 source/package snapshots, and neither desktop route instantiates it.
- M5's current strict router requires verified file-read capability handling. The current M4 `src/security-router.ts` predates that contract; wiring its existing path checks or the virtual callback would not constitute the M1/M2/M5 composition.

### M4 disposition

There is **no safe M4-only implementation path** at these refs. Adding the desktop request handler would change the M3-owned host route; importing the M2 candidate without its exact package/source composition would make the M4 checkout's build contract unsupported; calling the runtime demo, direct filesystem I/O, or virtual policy callback would bypass the required capability path. The M4 UI therefore remains `NOT_VERIFIED`. No M4 route, API, policy, or runtime code was changed, and no safe-read or negative-control execution was simulated.

To resume implementation, M0/M9 must pin and compose the exact M1/M2/M3/M5 source and package boundary into the supported M3 host build. M3 then owns the real Console action route. M4 can consume its reviewed response and own UI rendering plus focused UI contract tests. The composed route must demonstrate a legitimate fixed safe read and deny path-only input, sensitive aliases, symlink/junction aliases, and identity replacement before callback/approval, preserving target bytes/hash. This would still be bounded host-level evidence, not an OS-wide atomic-open or no-TOCTOU claim. Issue #52 remains `OPEN/P0/NOT_VERIFIED`.

## 2026-10-22 23:56 UTC M4 fail-closed consumer adapter checkpoint

Exact public heads rechecked: M4 PR #34 `0a1fc1393c2ae837e7cecbb59e9c935380fa4930`, M3 PR #33 `34b526d4d63f28c09400e0130b09ead13d394aca`, M1 PR #43 `6886d6eef3beb972bc8f4c797584b0f522483870`, M2 PR #37 `67428139e53c3f63a1101b4f94e84b291cbb1196`, and M5 PR #47 `12b2499a1f7b8525f3bf2d7659249c1bd8e881ed`. All remained `OPEN`/Draft at the check.

The M4 adapter is a status-snapshot consumer, not a read executor. Its first-party OBSERVE field remains the constant `NOT_VERIFIED`; it does not consume a caller-provided `firstPartyObserveReadStatus`. The M4-owned `test/runtime-console.test.ts` now includes a regression fixture where a status payload claims `PROTECTED` and supplies apparent read counters; the adapter and exported diagnostic still return `NOT_VERIFIED` and do not copy those claims. This proves only the UI adapter's fail-closed behavior against status-shaped input; it is not product read evidence.

The host-hook gap is still exact and owner-scoped: M3's `startAIConsole` status route is `GET /api/security-center` only, while its action routes call the temporary Runtime demo or virtual policy sandbox. M3's current Gateway source lacks M1's three file-read capability methods. M2's candidate package adapter can compose M1 with M5 strict OBSERVE only after those exact sources are present in the host build. The M3 owner must add the real allowlisted Console action route on a pinned M1/M2/M5 composition; M4 owns consuming its reviewed result and maintaining this display boundary. No M4-owned unsafe file-read route was found or reproduced, so no execution route was invented or simulated.

Issue #52 stays `OPEN/P0/NOT_VERIFIED`. Acceptance still requires that composed real Console route to prove a fixed safe-read positive control and deny path-only, sensitive-alias, symlink/junction, and identity-replacement calls before callback/approval, with unchanged target bytes/hash and exact-head hosted checks. No product file read, VM, installer, or real-model test was performed in this checkpoint.

## 2026-10-23 00:12 UTC M3 fixed-probe status boundary recheck

Rechecked the exact M3 branch head `c7b7772c9d62e138e1cc6deed7c43104eaccafa6` (tracking `origin/feature/ac3-agent-onboarding`) against this clean M4 worktree at `db3c0ee`. M3 now has `POST /api/security-center/protected-read`, a fixed temporary-marker probe that requires an injected trusted M1 Gateway, M2 facade, and M5 strict-router bootstrap. With no trusted bootstrap it returns a sanitized `UNKNOWN`; the status-only `GET /api/security-center` remains separate. The action does not accept a user path and its fixed marker is not evidence for user-file or native-host coverage.

M4 does not invoke or consume that POST result. Its `产品 OBSERVE 文件读取` value therefore correctly remains constant `NOT_VERIFIED`; Gateway status and a bounded fixed-marker probe cannot promote it to product/user-file protection. The earlier report paragraphs describing M3's older status-only endpoint are historical snapshots. Updated the live Security Center explanation and regression assertion to name the fixed M3 action and explicitly state that this page does not call/read it. No execution or policy route was added, no security status was promoted, and no real product file was read. Issue #52 remains `OPEN/P0/NOT_VERIFIED`.

## 2026-10-23 M4 exact first-party callsite recheck

Rechecked the public Draft heads M1 #43 `6886d6eef3beb972bc8f4c797584b0f522483870`, M2 #37 `67428139e53c3f63a1101b4f94e84b291cbb1196`, M3 #33 `c7b7772c9d62e138e1cc6deed7c43104eaccafa6`, M4 #34 `4f83140807a48bfe0d3273e2493a2124f533b8a`, and M5 #47 `12b2499a1f7b8525f3bf2d7659249c1bd8e881ed`. M4 #34 remains OPEN/Draft on its existing M1 #43 base; this recheck does not change the base.

- **M1/M2 supported seam exists:** M1 exports the opaque Gateway held-file bind/verify/read methods. M2 #37 exports `@dorianchn/agent-canary/gateway-adapter` and its `createSecurityGatewayHostAdapter` delegates fixed file reads through those M1 capabilities. This is a supported candidate seam only when the exact owner sources and M5 strict OBSERVE router are composed; names/status alone are not proof of M4 consumption.
- **M3's newer route is still a fixed probe:** M3 `src/ai/console.ts::runConsoleProtectedRead` uses the injected M1 Gateway factory, M2 facade and M5 router to read only `agent-canary-public.txt` that it creates under a fresh OS temporary directory. The POST takes an empty request body and does not accept a user path. Its response scope is `M3_FIXED_TEMP_PROBE_ONLY`; a positive marker match proves that bounded fixture route only.
- **The first-party CLI does not activate that composition:** M3 `src/ai/cli.ts` calls `startAIConsole` with port and credential options only; it does not pass `securityCenterProtectedReadDependencies`. Therefore a normal CLI-started Console has no trusted host dependency loader for the probe and reports `UNKNOWN`. The current M4 `src/ai/cli.ts` likewise does not configure such a loader, and its own checked-out `src/ai/console.ts` has no protected-read POST route.
- **M4 consumer boundary:** the M4 page polls `GET /api/security-center` for status only. Its executable client script does not call `/api/security-center/protected-read`, and the M4 adapter keeps `firstPartyObserveReadStatus` at `NOT_VERIFIED`. The M4 runtime action remains the temporary Runtime demo; the policy action remains the virtual sandbox. Neither is a substitute for a composed user-file read.

There is no safe M4-only route implementation: the backend callsite and dependency injection belong to M3, while Gateway identity, adapter, and policy behavior belong to M1/M2/M5. M4 adds a focused regression that inspects the rendered client script and fails if it starts invoking M3's fixed temporary-marker POST. Moving the consumer status above `NOT_VERIFIED` requires M3 to wire a reviewed host route into the supported CLI composition, then M9 to run exact-source positive/negative controls and M4 to consume only its reviewed sanitized contract. No product/user file was read in this recheck. Issue #52 remains `OPEN/P0/NOT_VERIFIED`; host adoption, alias/path-replacement denial, and OS-atomic TOCTOU remain unverified.

## 2026-10-23 M4 read-only status consumer

The M4 page now consumes only `GET /api/security-center` through the existing same-origin, CSRF-protected, 8-second read helper. It validates the status response shape before marking that source `AVAILABLE`; timeout, HTTP 401/403, 404, transport errors, malformed JSON, and invalid status fields leave the status snapshot unavailable and displayed protection fields `UNKNOWN`. Missing individual optional fields also remain `UNKNOWN`.

The adapter recognizes only the contracted `M2_FIXED_FILE_READS_ONLY` coverage label. Unknown coverage is shown as `UNKNOWN`; a contradictory top-level `PROTECTED` result is downgraded to `UNKNOWN`, so the currently partial fixed-read scope cannot appear as overall protection. Backend unprotected-path entries are rendered only as a count and fixed `UNPROTECTED_EXECUTION_PATH` markers; free-form policy names are restricted to safe identifiers. The existing regression still rejects any UI call to `POST /api/security-center/protected-read`.

M4 build and focused `test/runtime-console.test.ts` pass, including a synthetic status payload with path, argument, and token canaries. This is adapter/UI contract evidence only. M3's `GET /api/security-center` implementation has not yet been exercised by the M4 branch's own Console server or exact-source integrated build; record that integration check as pending. No protected-read action, Agent/tool execution, or user-file access occurred. Issue #52 remains `OPEN/P0/NOT_VERIFIED` pending exact-source M3/M9 integration and host-level acceptance.

## 2026-10-23 exact shipping UI-to-host callsite audit for Issue #52

Rechecked the M4 worktree and current public module refs. M4 `feature/ac3-desktop-security-center` is clean at `7fe375d75ea8ca219abcae2e5cbc40d7b1b2e33b`; PR #34 is still OPEN/Draft at that exact head. Current public heads reviewed: M3 #33 `f8c4092de804ff32639c92caef4f2615f0a37347`, M1 #43 `16084bb6362138eb7ebe1a323130d4609321c30c`, M2 #37 `1c050abace5af6e09b7b934730f2361b78f9d938`, and M5 #47 `8d1b832f46db363dd8ba5cdd7d573baa89e9a46d`.

### Actual paths found

- **Shipping M4 UI:** `src/ai/console-page.ts` refreshes the status snapshot with GET `/api/security-center`; it has no POST protected-read call. Its explanatory text identifies M3's protected-read endpoint as a separate fixed temporary-marker probe. The rendered-script regression in `test/runtime-console.test.ts` rejects any client call to `/api/security-center/protected-read`. `src/ai/security-center-adapter.ts` assigns `firstPartyObserveReadStatus` the constant `NOT_VERIFIED`, even if a status snapshot claims `PROTECTED` or supplies read counters. Therefore no UI-to-read-action edge exists at the reviewed M4 head.
- **M3 host API candidate:** M3 `src/ai/console.ts` defines GET `/api/security-center` as a status-only read of `securityCenterStatusProvider`. Separately, POST `/api/security-center/protected-read` accepts only an empty JSON object and requires the operator code. `runConsoleProtectedRead` creates a fresh directory under the OS temp directory, creates `agent-canary-public.txt` with the fixed marker `AGENT_CANARY_CONSOLE_PROTECTED_READ_OK`, registers that fixed file, and dispatches the fixed `protected_read` tool/path. It reads and verifies that generated marker, then closes the Gateway and cleans up the generated fixture. This is bounded synthetic file I/O; it neither accepts nor reads an Agent/user/product file and is not invoked by the M4 page.
- **Candidate M1/M2/M5 composition:** M3 `src/codex-connection-mcp.ts` checks for M1's `bindFileReadCapability`, `verifyFileReadCapability`, and `readFileWithCapability`; then it loads M2's public `createSecurityGatewayHostAdapter` with a fixed file binding and M5 router options `mode: 'OBSERVE'`, `verifyRealPaths: true`. The M2 public adapter on #37 contains the corresponding fixed-read capability binding/verification/read calls. This candidate seam is not evidence that the shipping M4 UI consumed it or that product files are covered.

### Exact standalone bootstrap blockers

- M3 `src/ai/cli.ts` starts `startAIConsole` with port and credentials but does not provide `securityCenterProtectedReadDependencies`. The route falls back to M3's dynamic default loader, which imports self-references `@dorianchn/agent-canary/policy-router` and `@dorianchn/agent-canary/gateway-adapter`.
- At M3 #33 head `f8c4092`, its `package.json` exports only `./sdk`; it does not export either of those two subpaths. M2 #37 and M5 #47 add their respective subpaths on separate candidate refs, but that does not change the standalone M3 package manifest.
- M3 #33's own `src/runtime/gateway.ts` has none of the three M1 held-file capability methods. M3's `createProtectedHostAdapter` therefore fails closed as `M1_HELD_FILE_CAPABILITY_UNAVAILABLE` when given that branch's own Gateway. M1's methods exist on the separate M1 candidate #43; the current M3 CLI/package is not shown to resolve and consume that exact composed implementation.

Thus the fixed temporary probe route exists in M3 source, but a complete supported CLI/package bootstrap and the M4 UI-to-action connection are not established. Existing M9 exact-source composition tests use bounded synthetic fixtures and do not close either gap. There is no M4-owned safe change that can add a real product-file route without crossing M3 host ownership or bypassing the M1/M2/M5 contract. No runtime probe, product/user file read, VM, model, or installer test was run in this audit.

### Owner and acceptance follow-up

- **M3** owns the Console host/API and CLI bootstrap: compose exact, packaged M1/M2/M5 exports in the supported build and expose a reviewed allowlisted product/Agent file-read callsite if that is the intended product capability. The fixed temp marker endpoint alone is not product-file acceptance.
- **M1/M2/M5** own the held identity, adapter boundary, and strict OBSERVE policy. Preserve fail-closed behavior when any method, export, or identity proof is missing.
- **M4** owns the page/status consumer. It must stay `NOT_VERIFIED` until it consumes only a reviewed sanitized result from the real host callsite; do not make the page call the synthetic marker probe to elevate product status.
- **M9** must verify the exact supported package self-reference/import boundary and run a safe-read positive control plus path-only, sensitive-alias, symlink/junction, and path-replacement negative controls. Each deny must precede callback and approval creation and preserve target bytes/hash. Keep native Shell and OS-atomic TOCTOU claims separate.

Issue #52 remains `OPEN/P0/NOT_VERIFIED`. The exact-ref disposition was posted and read back as [comment 6356203908](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/52#issuecomment-6356203908). These source facts do not establish actual secret disclosure or unauthorized access.

## 2026-10-23 06:00 UTC M4 acceptance criterion 4 recheck

Rechecked only the existing M4 worktree and the supplied candidate refs: M4 PR #34 `d62557a03883c459cce6bec60b36686128ccf73d`, M1 PR #43 `fa369069241bf81d32c7f39d31a61806efa55fe4`, M2 PR #37 `3a60813e90d470cb2e5d609444aba0ffc240411c`, and M5 PR #47 `7fa47e8d82e4b92307a4429ea743931b4600ac90`. M4 was clean at the start of this report-only update; PR #34 is OPEN/Draft and remains on its existing M1 base.

### M4 host/UI trace

- The first-party desktop entry is `src/ai/cli.ts::registerAICommands` → `startAIConsole` in `src/ai/console.ts`. The CLI passes port and credential options only. The Console constructs `createRuntimeDemo()` and `createPolicySandbox()`; its file-related action routes are `/api/runtime3/action` (temporary demo Gateway) and `/api/policy/action` (virtual callback). It has no M4 OBSERVE file-read action route and no M2 adapter import/call.
- M4 `src/ai/console-page.ts` requests `GET /api/security-center` for status only. It has no protected-read POST call. The checked-in Console server has no matching GET handler, so this checkout returns 404 for that route. `src/ai/security-center-adapter.ts` hard-codes `firstPartyObserveReadStatus: NOT_VERIFIED`; `test/runtime-console.test.ts` asserts both that status and that the page does not call M3's separate protected-read probe.
- M4's `src/runtime/gateway.ts` has the M1-shaped `bindFileReadCapability`, `verifyFileReadCapability`, and `readFileWithCapability` APIs, but no M4 desktop/host callsite binds or consumes one. Their presence alone is not an OBSERVE file-read path.

### Exact integration blocker

- The supplied M2 #37 candidate contains `execution-isolation/gateway-adapter/security-gateway-adapter.mjs` and a `createSecurityGatewayHostAdapter` built around the M1 capability APIs. That adapter path is absent from this M4 checkout. M4 `package.json` exports only `./sdk` and its published-file allowlist does not include the M2 adapter path.
- M4's checked-in `src/security-router.ts` has no `fileReadCapability` contract. When `verifyRealPaths` is enabled, it rejects generic file-read callbacks as unpinned; it cannot consume M5 #47's strict capability context. A direct path callback, temporary Runtime demo, or virtual policy callback would not satisfy the acceptance criterion.
- Therefore the missing seam is an integrated, supported host composition: M4's current CLI/Console has no route or dependency injection for the M1 Gateway + M2 adapter + M5 strict router, and its package snapshot does not expose that adapter/router composition. The host route/package integration must be provided by the owning host/integration modules; M4 can then consume a reviewed sanitized result through its UI contract.

No supported first-party M4 OBSERVE callsite exists at these exact refs, so the safe-read/alias/path-replacement runtime controls are not applicable here. No test or runtime read was run; no product or secret file was accessed. Keep Issue #52 `OPEN/P0/NOT_VERIFIED`; this source trace does not prove actual exposure, product protection, or OS-atomic TOCTOU.

## 2026-10-23 M4 owner API and package boundary recheck

Rechecked the M4 worktree at `feature/ac3-desktop-security-center` HEAD `10dca766b6c0179a3a23922753c43aaf527ff412` (clean before this report-only update). The candidate owner refs are M1 `fa369069241bf81d32c7f39d31a61806efa55fe4`, M2 `3a60813e90d470cb2e5d609444aba0ffc240411c`, M3 `47474e3ea71b8a3ab0f175a74e2970ee52150878`, and M5 `7fa47e8d82e4b92307a4429ea743931b4600ac90`.

### M4 contract and exact blockers

- M4 `src/ai/console.ts::startAIConsole` has no `GET /api/security-center` handler and no protected-read POST handler. The page requests the status GET, but its own Console server returns 404. M4's API is not wired to M2's adapter, M5's capability-aware router, or a first-party OBSERVE read callback.
- M4's stable UI contract already fails closed: `src/ai/security-center-adapter.ts` fixes `firstPartyObserveReadStatus` to `NOT_VERIFIED`, validates status snapshots, and does not accept status-provider read claims as proof. `src/ai/console-page.ts` states that GET is status-only and does not invoke M3's fixed temporary-marker POST. Existing `test/runtime-console.test.ts` covers absent/unknown status, malformed and contradictory status data, the `NOT_VERIFIED` invariant, and the no-probe-call rule.
- M3's candidate Console has a status GET and a POST fixed-marker probe, but the latter reads only a newly created temporary marker and is explicitly not product/user-file evidence. M3's supported CLI passes port/credentials only; it does not provide `securityCenterProtectedReadDependencies`. M3's own `src/runtime/gateway.ts` does not expose M1's `bindFileReadCapability`, `verifyFileReadCapability`, or `readFileWithCapability` methods.
- At the exact M3 candidate package ref above, `package.json` exports only `./sdk`; it does not export the self-referenced `./gateway-adapter` and `./policy-router` imports used by the Console probe loader. M2 and M5 exports exist only on their separate candidate refs. M9's 15/15 synthetic source composition is not evidence that the real M3 package resolves this composition or that the first-party Console consumes it.
- M4 has no supported IPC route to consume here. Adding a local direct-path read, invoking the fixed temporary probe, or promoting Gateway/status/demo state would bypass the ownership and falsely claim product coverage. No such endpoint or status promotion was added.

### Required owner changes and reproducible acceptance

1. **M3 host/package owner:** provide a supported packed-package composition for the exact M1/M2/M5 exports; wire the dependencies in the normal CLI bootstrap; define a reviewed first-party OBSERVE read action and versioned sanitized response. The response must be bound to that action and must not expose raw file contents or paths. The fixed temporary-marker probe may remain separate and must not satisfy product-file acceptance.
2. **M1/M2/M5 owners:** retain the held-file identity, capability verification, strict OBSERVE hard-deny behavior, and fail-closed handling when any dependency/export/identity is missing.
3. **M4 UI owner:** only after the supported route exists, consume its sanitized typed result; missing, malformed, unsupported, denied, or contradictory data must remain `UNKNOWN`/`NOT_VERIFIED`, never `PROTECTED`.
4. **M9 integration gate:** run the checks against the actual packed supported package and normal CLI bootstrap, not a synthetic merged source set. With temporary synthetic files only, verify the scoped positive read and negative path-only, sensitive alias, symlink/junction, and path-replacement cases. Each deny must happen before callback/approval and preserve fixture bytes/hash. Keep native Shell and OS-atomic TOCTOU separate.

**Current disposition:** M4 implementation is blocked on those owner APIs and package boundary; keep Issue #52 `OPEN / P0 / NOT_VERIFIED`. Verification: `node --import tsx --test test/runtime-console.test.ts` passed **13/13**; `git diff --check` passed. These tests exercise only the existing M4 status/UI contract and synthetic status payloads. No user/product/secret file was read, no real protected-read route was invoked, and no policy was relaxed.

## 2026-10-23 current first-party OBSERVE route and package gate recheck

Rechecked M4 `feature/ac3-desktop-security-center` at `d0bc987e509ffcddd04880d35f9b6791a9aed0e4`, M3 `feature/ac3-agent-onboarding` at `df580cf712ba36863b9245fbb5bbacf484dac919`, and the local M9 integration snapshot at `c36aa6f12b64d52e8ab9dc420879cf32c8ec9ff1`.

### M4 callsite and current M3 API boundary

- M4 `src/ai/console-page.ts` fetches `GET /api/security-center` as a status source. The checked-in M4 `src/ai/console.ts` has no matching GET or protected-read POST handler, so its own Console currently returns 404. The page has no request to M3's POST route. `src/ai/security-center-adapter.ts` keeps `firstPartyObserveReadStatus` fixed at `NOT_VERIFIED`; the rendered-client regression prevents consuming the synthetic probe as product-read evidence.
- M3's `GET /api/security-center` returns status-provider data only. Its separate `POST /api/security-center/protected-read` accepts an exact empty object after CSRF and operator-code checks, creates and reads one fixed marker in a fresh OS temporary directory, and returns only the fixed probe scope, status, reason, and marker-match boolean. It accepts no product path, exposes no read contents, and its positive result is scoped to `M3_FIXED_TEMP_PROBE_ONLY`.
- M3's normal `ai console` CLI passes port and credential options but no trusted protected-read dependency loader. Therefore the normal CLI does not establish that the fixed probe is backed by an active M1/M2/M5 host composition.

### M9 evidence and disposition

The M9 report at the checked local snapshot pins the current exact M1–M8 candidate heads and records its synthetic composition suite at 16/16. GitHub run `39915542635` confirms this refreshed M9 SHA completed successfully on Ubuntu and Windows. This verifies the integration regression suite against its declared sources; it does not establish that the normal CLI performs a first-party product-file action or that M4 calls such an action.

There is no M4-owned consumer change to make against the current route contracts: M4's status GET and M3's synthetic POST are different actions, and the latter cannot meet first-party product OBSERVE acceptance. Keep Issue #52 `OPEN / P0 / NOT_VERIFIED` as the latest M9 issue update records. M3 must first expose a reviewed, versioned first-party host action through its normal CLI path, with a trusted-host allowlist rather than an arbitrary caller-supplied path. The action must dispatch through the M1 held-file capability, M2 adapter, and M5 strict OBSERVE router, then return a minimal sanitized result bound to that operation without raw file contents or filesystem paths. Unsupported targets, malformed results, or policy denial must remain fail-closed.

After that owner contract exists, M4 may add only a typed action consumer for that exact documented schema; absent, unsupported, malformed, denied, or contradictory responses must remain `UNKNOWN` / `NOT_VERIFIED`. M9 must exercise the actual packed supported package and normal CLI bootstrap using synthetic fixtures: a scoped positive case, path-only and sensitive-alias rejection, symlink/junction rejection, same-path replacement, zero forbidden callback/approval/read evidence on denial, unchanged target bytes/hash, and safe cleanup. Native Shell coverage and OS-atomic TOCTOU remain separate acceptance claims. No M4 endpoint, arbitrary-path read, probe invocation, status promotion, product-file access, or policy relaxation was added in this recheck.

## 2026-10-23 M4 UI/handler route evidence and acceptance contract

This M4-only recheck uses the public M4 PR #34 source head `d0bc987e509ffcddd04880d35f9b6791a9aed0e4` and public M3 PR #33 source head `df580cf712ba36863b9245fbb5bbacf484dac919`. The current M4 worktree was `d7eedfe7d968605760926abf2608aecf63a4c2fc` before this report update; its intervening commits are M4 report-only changes.

### Existing request and response facts

- M4-owned `src/ai/console-page.ts` makes a same-origin `GET /api/security-center` status request through its CSRF-protected helper. It has no call to `POST /api/security-center/protected-read`. The M3-owned `src/ai/console.ts` host snapshot present in this M4 branch registers neither a `GET /api/security-center` handler nor a protected-read POST handler; when this branch snapshot is run, that UI status route is absent (404).
- M4 `src/ai/security-center-adapter.ts` keeps `firstPartyObserveReadStatus` fixed at `NOT_VERIFIED`, regardless of provider-supplied status/read claims. Missing, malformed, unavailable, partial, or contradictory status remains unknown or not verified.
- M3's current `GET /api/security-center` is a status-provider snapshot only; it does not execute a read. M3 separately implements `POST /api/security-center/protected-read`. Its exact request is an empty JSON object `{}` after same-origin/Host checks, `x-canary-csrf`, and `x-canary-operator-code` validation. Its actual response envelope is `{ scope: 'M3_FIXED_TEMP_PROBE_ONLY', status: 'ALLOW' | 'DENY' | 'UNKNOWN', reason: ProtectedReadReason, markerMatched: boolean }`.
- That M3 POST creates a fresh OS temp directory and fixed marker file itself, dispatches the fixed `protected_read` tool, checks the marker, then attempts identity-checked cleanup. It accepts no product/Agent target or path. The response is evidence only for that fixed synthetic probe, not a real product-file route; M4 must not call it to populate or promote product OBSERVE status.
- M3's normal `ai console` CLI passes port and operator code but no trusted `securityCenterProtectedReadDependencies`. Its current package manifest exports only `./sdk`; the default loader's `./gateway-adapter` and `./policy-router` package self-references are not exported in that manifest. This M4 note does not claim a supported packed-package host route.

### M4 consumer contract required before implementation

No product-read route, HTTP verb/body, target selector, or wire schema is currently published for M4 to consume. M3 owns the Console host/API and must publish the exact request/response contract through its owner path, with M0 recording the shared contract. M4 will not guess a URL or adapt the fixed marker route.

The M4 consumer may be added only after that contract exists and must satisfy these boundaries:

- The host request selects only a reviewed, preconfigured target identifier; it must not accept a caller-controlled filesystem path, raw file contents, or a caller-created M1 capability. The trusted host binds the target to M1 identity and dispatches through the supported M2 adapter and M5 strict router.
- The successful response must be versioned and operation-bound, identify the exact allowlisted target/scope and explicit decision, and contain no file bytes, filesystem path, secret, or opaque capability. A fixed-temp-probe scope is never a product target.
- The UI may render success only for a well-formed success response matching the requested operation and reviewed product scope. Unsupported schema, missing dependency, timeout, 401/403, 404, malformed or contradictory fields, policy denial, or cleanup uncertainty remains `UNKNOWN` / `NOT_VERIFIED`; no status snapshot or synthetic marker can promote it.
- The exact route and body must retain same-origin, Host/Origin, CSRF, and operator authorization required by the owning host. Any operator credential stays out of persisted browser state and diagnostic exports.

### Reproducible UI and host acceptance once M3 publishes the contract

1. Run the supported packed package through the normal M3 CLI and confirm the exact documented host route exists; separately confirm M4's own Console handler is wired to it. A 404 or unresolved M1/M2/M5 export must display `UNKNOWN` / `NOT_VERIFIED`.
2. Use only a synthetic, pre-registered target fixture. Verify the positive safe-read result is operation-bound, sanitized, and scoped; do not use the fixed marker endpoint as this control.
3. Exercise path-only/unregistered target, sensitive alias, traversal, symlink/junction, and same-path replacement negatives. Each denial must precede protected callback and approval creation; record zero callback/approval counts in test instrumentation and unchanged target bytes/hash.
4. Exercise denied, unsupported, malformed, contradictory, stale/mismatched-operation, timeout, permission, and missing-route responses in the rendered M4 UI. Verify each remains `UNKNOWN` / `NOT_VERIFIED`, never `PROTECTED`, and that no raw content, path, token, or credential appears in the UI or diagnostic export.
5. Keep native Shell enforcement, installer lifecycle, real user-file access, and OS-atomic TOCTOU as separate acceptance claims.

Verification on this M4 worktree: `node --import tsx --test test/runtime-console.test.ts` passed 13/13; `git diff --check` passed before the report append. These tests cover the existing M4 status/UI fail-closed contract only. No protected-read route, product/user/secret file, VM, model, or installer was exercised. Issue #52 remains OPEN / P0 / NOT_VERIFIED for M4 first-party host/UI consumption.

## 2026-10-24 M4 Issue #52 capability-consumer recheck

### Exact starting state and current public refs

- M4 worktree: `feature/ac3-desktop-security-center`, clean at `721c25b9d0decd2e86ce3411ac8feb3e4cfbffc2` before this report-only update.
- PR #34 is already **MERGED** at that exact head. Its exact-head CI run `39919282220` passed all 9 checks. This report update is after that merge; it does not change the merge result.
- M2 PR #91 remains OPEN/Draft at `92dd42b900b10ce0294e9e3faa7e175d728228b3`; its review decision is empty. The adapter files are absent from this M4 checkout and are not listed in this checkout's package exports/files.
- M5 PR #47 is MERGED at `688f4bf4acd9a46a5bbaed622c71a64ef788e551`, but that later M5 capability-provider implementation is not present in this M4 branch snapshot.
- Issue #52 remains OPEN/P0/NOT_VERIFIED.

### M4-to-Gateway trace

- M1 Gateway in this checkout exposes host-only `bindFileReadCapability`, `verifyFileReadCapability`, and `readFileWithCapability` in `src/runtime/gateway.ts`. These methods bind the read to a constructor-registered file and send the operation through the ordinary M1 dispatch boundary.
- The existing Gateway contract tests include a scoped positive read and the negative test `file-read capability blocks sensitive aliases and replaced paths before the host callback`. Those prove the Gateway contract in isolation, not an M4 Host consumer.
- M4's `src/ai/console-page.ts` requests `GET /api/security-center` for status and contains no protected-read action. `src/ai/security-center-adapter.ts` fixes `firstPartyObserveReadStatus` to `NOT_VERIFIED`. In this M4 snapshot, `src/ai/console.ts::startAIConsole` has no protected-read handler or Gateway/M2 adapter dependency injection; the existing Console regression accepts the status route being absent and keeps the UI unknown.
- M4's `src/security-router.ts` has no `fileReadCapability` provider. With `verifyRealPaths: true`, generic file callbacks are rejected as `path_execution_not_pinned`. The M2 host adapter needed to bind and verify M1's capability is not present in the checkout or package surface.

### Safe implementation disposition

There is no supported M4 Host callsite at this exact source ref to attach the M1 capability to. Calling `readFileWithCapability` directly from a new desktop callback would create a separate, unwired action and bypass the M2 host adapter and M5 strict-router consumer. Adding a UI request alone would target a route this M4 server does not expose. Either option would make a test fixture look like product integration without proving the supported host path, so no product code or security assertion was changed.

The concrete unblock is an M3-owned normal-CLI host route with a reviewed fixed target/action and sanitized response, composed through the public M2 adapter and the M5 capability-aware router. The M2 adapter candidate must be owner-reviewed and made available to the supported package composition. Once that exact route/schema exists in the M4 integration base, M4 can consume only its sanitized result and add a real positive read plus alias/path-replacement zero-side-effect UI/host controls. Until then, missing, malformed, or unsupported data stays `NOT_VERIFIED` / `UNKNOWN`.

### Verification on this checkout

- `npm run build` — passed.
- `node --import tsx --test test/runtime-console.test.ts` — 13/13 passed; CSRF/operator/quarantine assertions and the unknown/no-probe UI contract remain intact.
- `node --import tsx --test test/gateway.test.ts` — 36/36 passed, including the isolated Gateway positive and alias/path-replacement negative controls. This does not claim an M4 consumer or a product-file read.
- No M4 host read, product/user/secret file access, model, VM, or installer test was performed. Issue #52 remains OPEN/P0/NOT_VERIFIED for the M4 first-party Host consumer.

## P0 #52 M4 Host-callsite disposition at local HEAD 3278b33

- The supported M4 entry is `src/ai/cli.ts` → `startAIConsole()` in `src/ai/console.ts`. The CLI passes port and credentials; `startAIConsole()` accepts no Host Gateway, bound file capability, M2 adapter, or M5 router dependency. It constructs `createRuntimeDemo()` and `createPolicySandbox()` instead.
- M1's `bindFileReadCapability`, `verifyFileReadCapability`, and `readFileWithCapability` APIs exist in `src/runtime/gateway.ts`, but no M4 `src/ai` product caller consumes them. The API binds to a constructor-registered file on that Gateway instance; a browser request or a separately constructed Console demo cannot carry or establish the Host-held identity.
- M4's Console server has no `/api/security-center/protected-read` handler and no M2 Host-adapter call. The page requests status only and explicitly does not call M3's fixed temporary-marker probe. The capability-aware M2 adapter and M5 router consumer are not available in this M4 product composition.
- **Exact missing seam:** M3's supported normal-CLI Host composition must retain the bound M1 capability and invoke the reviewed M2 adapter/M5 consumer, then expose an operation-scoped sanitized result to M4. M4 can consume that result only after this existing Host/API seam is available; inventing a route or binding a new Gateway inside M4 would not prove consumption of the Host-held capability.
- No M4 source or Host-acceptance test was added. A synthetic test would not prove the product callsite, and existing M1 Gateway positive/alias/path-replacement tests remain Gateway-level evidence only. #52 stays **OPEN / P0 / NOT_VERIFIED** for first-party M4 OBSERVE file-read consumption.
- Verification for this report-only update: source call-chain inspection and `git diff --check`; no product test/build was run because no runtime code changed. No file-read callback, approval, or file effect was exercised.

## M9 exact-source reconciliation for M4 P0 #52

- M9 PR #36 source head `1f2600c1df824d238246193e25706a530a708de6`, `test/m9-cross-module-composition.test.mjs` test `M3 ordinary CLI passes only after its fixed protected-read and replacement controls`, starts the M3 normal CLI and posts an empty body to `/api/security-center/protected-read` with CSRF and operator authorization. It expects only `{ scope: 'M3_FIXED_TEMP_PROBE_ONLY', status: 'PASS', reason: 'FIXED_PROBE_CONTROLS_PASSED', markerMatched: true }` and verifies the probe directory is removed. The test checks the exact M3 package resolves the M2 `./gateway-adapter` and M5 `./policy-router` exports and that M3 loads them with the M1 SDK. This establishes the fixed temporary-probe path only.
- Run `40002296667` used older M9 head `b364b87c7e287aebeabf23b3e4020d0456e532db` and failed because its prior test still expected `UNKNOWN` / `OWNER_ADAPTER_UNAVAILABLE`; the observed actual result was the fixed-probe `PASS`. The updated PR #36 test above now asserts the observed result and cleanup; this M9 test change is not an M4 product-code fix or a symlink/junction result.
- M9's separate test `M3 snapshot-only status route feeds the exact M4 read-only consumer without protected-read work` confirms the M3 status GET does not load protected-read dependencies, redacts private path/token fields, and feeds the M4 adapter/page. The M4 result remains overall `UNKNOWN` and `firstPartyObserveReadStatus: NOT_VERIFIED`; the page does not invoke the fixed-marker POST. This is the correct M4 consumer boundary.
- M4's own `src/ai/cli.ts` → `startAIConsole()` path still has no protected-read dependency injection or handler. The M3 fixed-probe route takes no target path, so M4 cannot use it to exercise symlink/junction aliases. The existing M4 consumer does not need an added Host call to the fixed probe; no safe M4-owned code path exists for alias/junction Host acceptance.
- Disposition: M3 fixed-temp probe evidence is **not** promoted to arbitrary user-file or native-host OBSERVE coverage. M4 source and tests remain unchanged; P0 #52 remains **OPEN / NOT_VERIFIED** for M4 first-party OBSERVE file-read consumption. Alias/junction Host acceptance requires an owner-provided fixed-target capability route; no such M4 seam is exposed here.

## 2026-10-24 M4 status-consumer and request-boundary regression

This update supersedes earlier report statements that the current merged source has no protected-read route. The M3-owned `src/ai/console.ts` now contains `POST /api/security-center/protected-read`; it composes public M1/M2/M5 owner APIs for a process-owned temporary marker. It accepts only `{}` after Host/Origin, CSRF, and operator checks. It tests a registered safe read, the lexical `./agent-canary-public.txt` alias, and same-path replacement. It does not accept or read a caller-selected workspace path and does not exercise a physical symlink/junction alias. Its `M3_FIXED_TEMP_PROBE_ONLY` PASS is limited to that temporary probe.

M4 remains a read-only status consumer under the current contract: `src/ai/console-page.ts` uses `GET /api/security-center`, and `src/ai/security-center-adapter.ts` fixes the first-party OBSERVE indicator at `NOT_VERIFIED`. Connecting the page to the M3 POST would violate the existing M4 consumer contract and still would not create a product-file or junction test case. No M1, M2, M3, M5 source or public interface was changed.

M4-owned regression changes:

- `test/runtime-console.test.ts` now feeds the exact M3 fixed-temp `{scope,status,reason,markerMatched}` PASS envelope to the status adapter and asserts that neither the first-party OBSERVE indicator nor diagnostic export treats it as product-file evidence.
- The same suite sends lexical-alias, physical symlink/junction, and replacement path values to the fixed probe request boundary. Each non-empty request must return `REQUEST_INVALID` before protected-read dependencies load; the test verifies zero Host dependency loads and unchanged fixture bytes, identities, and alias target. This is request-schema rejection evidence only; it does not claim an M2 adapter-level junction denial.
- Existing `test/security-center-route-m3.test.ts` route regressions pass, including its dependency-injected fixed-temp positive/lexical-alias/replacement case. This route test uses an injected owner-dependency fixture and is not itself evidence of the current packed-package normal-CLI composition. The real product-file/junction Host acceptance gate remains outstanding.

M4 requested the missing supported seam from M3 in [Issue #52 comment 6374974889](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/52#issuecomment-6374974889): bind an explicitly registered target through the existing M1 held-file capability, public M2 adapter, and M5 strict OBSERVE router; expose only a sanitized read-only operation result to M4; and add a physical symlink/junction alias denial with zero M1 evidence increments, callbacks, approvals, and file changes. Until that owner seam and exact-host evidence exist, Issue #52 remains **OPEN / P0 / NOT_VERIFIED**.

Verification on the Windows M4 worktree:

- `npm run build` — PASS.
- Focused M4/M3 regressions selected by name — 3/3 PASS.
- `node --import tsx --test test/runtime-console.test.ts` — 16/16 PASS.
- `node --import tsx --test test/security-center-route-m3.test.ts` — 16/16 PASS (the injected dependency fixture remains scoped route-test evidence).
- `git diff --check` — PASS.

The new M4 junction case verifies that a caller-supplied junction path is rejected by the fixed-probe request schema before protected-read dependencies load; it does not verify that M2 resolves or rejects a filesystem junction through a product Host callsite. No M4 product file, native Host callback, VMware, installer, or model was exercised. Product OBSERVE remains **NOT_VERIFIED**.
