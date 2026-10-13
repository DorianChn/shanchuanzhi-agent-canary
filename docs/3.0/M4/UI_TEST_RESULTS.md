# M4 UI Test Results

Date: 2026-10-13
Worktree: **agents/M4-desktop-security-center**
Branch: **feature/ac3-desktop-security-center**

## Build and automated tests

| Command | Result |
| --- | --- |
| **npm ci** | Passed; installed 102 locked packages; npm reported 0 vulnerabilities. |
| **npm run build** | Passed (**tsc**). |
| **node.exe --import tsx --test test/runtime-console.test.ts** | Passed: 5 tests, 0 failures. |
| **npm test** | Passed: 330 tests total, 325 passed, 5 skipped, 0 failed. |
| **impeccable.cmd detect --json src/ai/console-page.ts src/ai/security-center-adapter.ts** | Returned **[]**. |
| **git diff --check** | Passed; no whitespace errors. |

## GitHub Actions baseline before scoped-field follow-up

Workflow run **38381813852** completed with an overall failure:

- **docker-build**, **sponsor-smoke**, and the Ubuntu Node.js 20/22 test jobs passed.
- **test (windows-latest, 20)** failed in the unmodified M1-owned test/agent-hook.test.ts, test *native lab wrapper interruption emits no allow decision and invokes no tool callback* (line 54; assertion reported false !== true). This file is not part of the M4 diff.
- The remaining macOS and Windows matrix jobs were cancelled after the failure, so remote cross-platform CI is incomplete. The local full suite passed as recorded above.
- A documentation-only rerun, **38382237574**, passed every job: Docker, package smoke, sponsor smoke, and all Linux/macOS/Windows Node.js 20/22 test jobs.
- A further run, **38382540617**, also passed every job on the prior M4 source head **d60dc9d**. The scoped-field changes in this follow-up are not included in those runs; they receive a new PR CI run after push.
- The first Windows Node.js 20 failure did not reproduce on the reruns; its cause is unconfirmed.
The full suite's fixture/install tests ran as part of **npm test**; no real installer, VMware VM, or real model was launched.

## Local API verification

A local Console was started from the built **dist** output. With its CSRF token, requests returned:

- **/api/state**: **200**, latest 100 audit events.
- **/api/agents**: **200**, configuration detection and the demo-scoped response.
- **/api/policy/state**: **200**, mode **BALANCED**, scope **VIRTUAL_EXECUTORS**; rendered only as Console sandbox mode.
- **/api/runtime3**: **200**, controlled SDK demo scope with initial Guard **SAFE**; rendered separately from product-wide isolation.
- **/api/security-center**: **404**.
- **/api/e4/status**: **404**.

The page kept product-wide protection, Gateway, Hook, Canary isolation, live Agent policy, tool count, and unprotected paths at **UNKNOWN**. It showed the two available scoped values (**BALANCED** virtual-executor policy and demo Guard **SAFE**) with explicit scope text. The health check reported **4/4** existing read APIs available; the two missing optional APIs remained unsupported.

## Browser rendering and interactions

Chrome headless was driven through local DevTools Protocol because the connected Browser MCP Chrome extension was disconnected.

- Desktop screenshot: **1440 × 1150**; main security summary, source warnings, Agent detections, and real audit-event list rendered.
- Mobile viewport: **390 × 844 CSS pixels**. **documentElement.scrollWidth** was 390; the security section and facts grid had no horizontal overflow.
- Real event selection populated the Chinese explanation panel.
- The E4 entry opened and showed **UNKNOWN**, without starting a test.
- The one-click health action completed and retained **UNKNOWN** product-wide protection status. The refreshed UI now counts all four existing read APIs.
- The diagnostic action generated and parsed **agent-canary.security-diagnostic.v1**; the payload retained **UNKNOWN** statuses and omitted raw paths and event reason text.
- A trusted headless click emitted **Browser.downloadWillBegin** and transferred the report bytes, then Chrome reported the download as **canceled**; no file appeared in the configured download directory. Interactive browser file saving remains unverified, and the UI now says to check the browser download list.

## Failure and empty-state coverage

- Unit tests cover exact status allowlisting, demo Agent status rejection, redacted report contents, timeout, **403**, **404**, malformed response, and server-unavailable classification.
- The live page showed the expected unsupported-route warnings for the current backend.
- The event interface returned data during this run; an empty event response was covered by the UI copy and adapter behavior, but not produced by modifying the user's audit store.
- Real timeout and permission-denied HTTP responses were classified in tests; those server conditions were not induced against the running local Console.

## Resource boundary

No VMware test, real-model test, full Auto E4 run, or real installation test was started. M4 changed no M1/M2 execution logic.
