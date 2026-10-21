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
