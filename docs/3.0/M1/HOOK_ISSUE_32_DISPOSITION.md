# M1 disposition — Issue #32 exact CI recurrence

Review date: 2026-10-23

## Decision

**ROOT CAUSE UNKNOWN.** The exact CI run reproduces a failure in an M1-owned Hook interruption test fixture on Windows Node 20. It does not establish that a product permission decision was emitted, that a host tool callback ran, or that PR #30 caused the failure. Keep Issue #32 **OPEN / P1**. No Hook assertion or policy was changed in this review, and no test was rerun.

## Exact run and failure

- PR #30 head evaluated by run `39891131432`: `624cd5e855eeb08c21d7260a1e4ae5697c2f3445`. The workflow checked out merge commit `b82f582ec52eafbee4e60af44672981e073ea9ae` against base `62496d4020bd90ba2eede49b2e80a2bbebb036b4`.
- Windows Node 20 job `120210892310` ran on Windows Server 2025. In `test/agent-hook.test.ts`, test `native lab wrapper interruption emits no allow decision and invokes no tool callback` failed with `false !== true`. Totals were 321 passed, 1 failed, 4 skipped. The other seven listed jobs passed; package-smoke was skipped after the failure.
- The exact test blob was `1ecb3ee8b45f1fbe942a25bcd5ce696f82534601`. Its lines 50-54 use `spawnSync` with a 1-second timeout, then assert the synthetic child-entry marker exists before checking stdout. The failed `false !== true` is the marker-presence assertion. The following stdout assertion was not reached. This records failure to observe the fixture marker in that run; it is not evidence of an emitted allow decision or an actual tool callback.
- The PR #30 file comparison contains no `test/agent-hook.test.ts`, `src/agent-hook.ts`, or `security-lab/claude-native-hook.mjs` changes. This recurrence therefore does not show that M0's documentation/coordinator changes modified the M1 test or Hook runtime.

## Current M1 source comparison

Current public M1 PR #43 head: `16084bb6362138eb7ebe1a323130d4609321c30c`.

- Current `test/agent-hook.test.ts` blob: `82ca4662e0a6c4269011ff8eba9470f2a26ccc39`. Its interruption fixture uses asynchronous `spawn`, waits up to 10 seconds for the marker, holds the synthetic child beyond the wrapper's 2-second internal timeout, then interrupts it and checks for empty stdout/stderr and no decision log. Its source comment states that this subprocess cannot count a native host callback. This is a revised test harness and a narrower observable claim; it does not identify why the older one-second fixture failed on this runner.
- Current `src/agent-hook.ts` blob `76f7bf6314046777ee1615873e5de4621671ea15` and wrapper blob `d6f93249306b7966259cab463dd39475728ef338` differ from the exact PR #30 run's blobs `f1bd9916255be22c9dc69aebec3b4448d571b118` and `88c1003f0ab4a027f3b4ad576c312888862eb202`. The failed run is not an exact execution of the current M1 Hook source set.
- No product-host callback observation is present in this CI log. Do not convert the synthetic marker failure into a claim of allow, callback execution, sensitive-file access, or data exposure.

The source comparison cannot distinguish among child-start/import timing, Windows runner scheduling, or behavior in the older Hook source. Retain **UNKNOWN** until an exact current-source run or other diagnostic evidence isolates the cause. Keep the fail-closed checks intact.

## Evidence

- [PR #30 run 39891131432](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/39891131432), Windows Node 20 job 120210892310.
- [Issue #32](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/32).

## 2026-10-23 M0 CI run 39897597172 — old fixture recurrence

The new M0 run evaluated PR #30 head `8202a83e78c0600d6b6f6196bd08c63bda18214b`. That exact commit changes only `docs/3.0/TECHNICAL_STATUS.md`; it does not change the M1 Hook source, native wrapper, or interruption test.

- Windows Node 20 job `120231512420` failed `native lab wrapper interruption emits no allow decision and invokes no tool callback` at `test/agent-hook.test.ts:54:53` with `false !== true`. The failed assertion is the synthetic child-entry marker check; later output/decision assertions were not reached.
- The run reports 321 passed, 1 failed, 4 skipped; `package-smoke` was skipped. No other cancelled or skipped matrix job is counted as failed.
- The run's test blob is the older `1ecb3ee8b45f1fbe942a25bcd5ce696f82534601`. Current M1 PR #43 has test blob `82ca4662e0a6c4269011ff8eba9470f2a26ccc39`; it uses an asynchronous marker handshake and external interruption after the synthetic child enters, then checks empty output and no decision log. The two blobs are not the same fixture source.
- This recurrence supports only **ROOT CAUSE UNKNOWN** for the old synthetic marker failure. It does not demonstrate a permission allow, native callback, protected-file read, or Issue #52 regression. Keep Issue #32 **OPEN / P1** and retain all current assertions. No CI rerun or test change was made for this disposition.

Evidence: [M0 CI run 39897597172](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/39897597172).

