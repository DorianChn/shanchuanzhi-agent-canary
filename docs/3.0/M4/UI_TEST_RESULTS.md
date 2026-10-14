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

## GitHub Actions

- Before this follow-up, run **38382540617** passed all checks on M4 head **d60dc9d**.
- Run **38383827901** on commit **109da61** exposed an M4 test mistake: the test expected a static **4/4** string although the UI computes the readable count at runtime. The assertion was corrected in **8319a67**; no product behavior changed in that fix.
- Follow-up for that assertion: the health summary numerator is computed from the four existing read-only sources (**state**, **agents**, **policyState**, **runtime3**) whose status is **AVAILABLE**, then rendered dynamically as **count/4**. The regression test now asserts this allowlist, the availability filter, and the dynamic template instead of treating the runtime numerator as static HTML. The same test retains its CSRF, operator identity, replay-control, and real-quarantine assertions.
- Current local rerun: the named security/quarantine subtest passed **1/1**; **npm run build** passed; **npm test** passed with **330** total, **325** passed, **5** skipped, **0** failed.
- Run **38384289575** on **8319a67** passed **docker-build**, **sponsor-smoke**, and Ubuntu/macOS Node.js 20/22 tests. Windows Node.js 22 failed in the unchanged M1-owned **test/agent-hook.test.ts:54** interruption test (**false !== true**); Windows Node.js 20 was cancelled by fail-fast and **package-smoke** was skipped. This M1 test is outside the M4 diff and was not changed.
- Before this report-only commit, PR #34 head was **0613057** (**06130575b5d11abe612cb13b14bcd4d71b052208**), OPEN/Draft. M0 confirmed run **38385403836** for that head passed all **9/9** checks.
- The older failed run on head **8319a67** was caused by the unchanged M1 Hook interruption test in **test/agent-hook.test.ts:54** on Windows Node.js 22; it was not an M4 failure. Run **38385403836** supersedes that older failed result for the validated head. The earlier M4 assertion failure was on **109da61** and was corrected in **8319a67**.
- Local Windows **npm test** passes all 330 tests as recorded above.
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
