# M1 triage: file-store retry exhaustion on PR #30 run 39883325047

Reviewed: 2026-10-23 (UTC)

## Disposition

The direct failure is the concurrent test worker exhausting its bounded lock-busy retry loop. The underlying lock-holder or timing trigger remains **UNKNOWN**. This occurrence does not establish a lost update, state corruption, or a reproducible M1 implementation defect. No source or test change is justified by the available evidence; keep Issue #51 OPEN / P1.

## Exact occurrence

- PR #30 was OPEN / Draft at head `3b2de62f320cb4bcc615247d445b067d1074b1ea`, based on `62496d4020bd90ba2eede49b2e80a2bbebb036b4`.
- Product CI run `39883325047`, failing job `120185593824`: Ubuntu 24.04, Node.js `v20.20.2`. `npm ci` and `npm run build` passed; `npm test` failed.
- Subtest 163, `four concurrent processes preserve every quarantine without lost writes`, failed after about 2.19 seconds. Its child reported `Error: RETRY_LIMIT` from the inline worker script for scope `worker:1:`. That script retries `store.quarantine(...)` at most 500 times, continuing only on `STATE_STORE_BUSY`, with a fixed 2 ms timer between attempts.
- The suite summary was 321 passed, 1 failed, 4 skipped. `Promise.all` rejected on the failed worker, so the final aggregate assertion over all 48 worker/scope writes did not execute.
- The captured test has no lock-owner, lock-hold-duration, or retry-timeline trace. The log confirms the retry-exhaustion path but does not identify which process owned the lock, how long it was held, or the store state after the competing workers settled.

## Source comparison

PR #30 changes only M0's `docs/3.0/TECHNICAL_STATUS.md`. The exact run's M1-owned blobs are `src/file-state-store.ts` `29b0839be9bee3cb8cd5250a60f7b07addb7e4fe` and `test/file-state-store.test.ts` `df2084977173c63a27f374135b995a3f9f2ad939`.

The current M1 worktree's corresponding blobs are `1122bcdb143edaa83738f65f7bf3a114b03c12f3` and `fdecb15ae56efa58e653847a8f7161a976645e68`. The only store-source difference from the run is Windows-specific classification of secondary `EPERM` / `EACCES` metadata errors while checking a competing lock. The Linux `EEXIST` → `STATE_STORE_BUSY` path exercised by this run is unchanged. The current diagnostic test variant preserves the 500-retry bound and all 48 final state assertions, while adding lock/timing traces and staggering waits from 2–8 ms. Its prior passing ten-run result is non-reproduction under that changed schedule, not an explanation of this fixed-2-ms occurrence.

`transaction()` acquires an exclusive `wx` lock before reading and replacing the state snapshot. On the observed Linux path, the child receives `STATE_STORE_BUSY` when exclusive lock creation reports `EEXIST`; it does not proceed through that attempt to write a snapshot. This makes retry exhaustion the confirmed direct path, but the available failure run cannot distinguish a prolonged holder from other timing or filesystem causes. No post-failure aggregate state readback is present, so the log neither proves nor disproves a lost write by another worker.

## Acceptance boundary

This evidence is consistent with Issue #51's existing acceptance: keep the retry limit, all quarantine assertions, and visible failure; classify the direct retry-exhaustion path while retaining UNKNOWN for the underlying trigger without lock-holder/timing evidence. Preserve the prior ten-run Linux diagnostic evidence and exact green PR #38 CI as separate validation; neither one explains this occurrence.

No test was rerun for this triage. No GitHub comment, issue change, or push was made.
