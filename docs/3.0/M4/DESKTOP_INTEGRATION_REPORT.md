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
| **GET /api/security-center** | **404** on this branch. | Overall status, Gateway, Hook, policy, isolation, tool coverage, and unprotected execution paths remain **UNKNOWN**. |
| **GET /api/e4/status** | **404** on this branch. | E4 runtime status remains **UNKNOWN**; the missing interface is reported. |

The **/api/security-center** payload shape accepted by the adapter is an optional integration boundary, not a new public API contract. It supports exact **protectionStatus** values, Gateway connection status, Hook/isolation/policy state, tool count, unprotected-path list, and live Agent records if an owning backend later supplies them.

## User flows

- **Health check:** Reads the four routes above with an 8-second per-request timeout. **2/2** means the existing audit and Agent-config reads succeeded; it is explicitly not a protection-health result.
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
