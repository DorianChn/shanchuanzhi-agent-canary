## M0 ownership routing — 2026-10-16 04:23 UTC

- src/tokens.ts and test/tokens.test.ts are not assigned in the active M1–M9 ownership table. Do not infer they share ownership or root cause with M1's src/file-state-store.ts.
- Exact-head run 38850021718 exposed a distinct Windows Node 22 token-registry lock timeout. Issue #51 supplemental comment 6208031338 asks the existing M1/M4 lock-triage owners to confirm remit or route the source owner by 04:32 UTC. Until confirmed, ownership of the token-registry lock remains UNKNOWN; M0 makes no source change.

## M0 ownership review — 2026-10-15 21:16 UTC

- M1 retains ownership of canonical `test/agent-hook.test.ts`. PR #30 currently includes this path via the interruption-fixture change associated with `b92bde4`; M1 PR #43 also modifies it. The PR #30 timeline contains no visible M1 disposition/review, so authorization is UNKNOWN. Issue #56 tracks M0 PR-scope reconciliation. Do not treat this overlap as a transfer of file ownership.
- M0 owns only its coordination PR scope/reconciliation and may not make additional edits to M1 test semantics. Keep PR #30 Draft until its diff excludes this M1-owned file or M1 records an explicit shared-path exception and the PR body is corrected.
- M3 retains its Hook copy/tests and #55 correction; M7 owns real package/payload evidence for #53 and coordinates M8's copy proof there. The 21:16 follow-ups were queued to existing M3/M7 sessions; task start remains unverified until owner evidence or branch movement appears.

## M0 ownership delta — 2026-10-15 21:06 UTC

- M3 retains ownership of its Hook copy/tests and the correction under #55. M9 owns composition tests; do not change M1 or M9 files from the M3 lane. The failing M9 run `38727481764` used M1 pin `b1d7423e70f2d47f43a5ec42e63a650ff93f6dcc`; current M1 PR #43 head is `9ef3dc265f9f386508bbeec7ff6d9a264ab1a0a4`, so current-head composition still needs proof.
- M7 owns real installer/payload artifact work for #53; M8 owns its shipped Hook/logging copy. PR #39/#40 heads were unchanged at 21:03 and no module owner path or artifact was reported.
- Under `Agent-Canary-Dev`, only `coordinator` has a Git worktree. `main`, `agents`, and `integration` are empty; do not claim M1–M8 local isolation until owners provide exact paths and branch refs.

## Current remote ownership snapshot (2026-10-15 20:52 UTC)

| Module | Existing branch / PR | Exact remote head | Owner and current boundary |
| --- | --- | --- | --- |
| M0 | feature/ac3-m0-coordination / #30 | ff01b6ce04310afa1fb56233931a70a47624b0b1 | Coordination docs, issue status, API contracts, and cross-module gates only; no product source changes. |
| M1 | feature/ac3-security-core / #43 | 9ef3dc265f9f386508bbeec7ff6d9a264ab1a0a4 | Gateway, Guard, canonical Hook contract, and quarantine store. Owns #51 diagnosis and #52 contract review. |
| M2 | feature/ac3-execution-isolation / #37 | 9db59ed8f2deae905edcb2179982f8bcb594167c | Execution adapter and host-hook integration. No first-party host consumer is verified; native Shell remains UNPROTECTED (#45). |
| M3 | feature/ac3-agent-onboarding / #33 | be3880298e1c6766024ecbce5f5dbc23c4d2daa1 | Onboarding and its Hook copy/tests. Owns #55 fail-closed correction and supported-capability positive control. |
| M4 | feature/ac3-desktop-security-center / #34 | fbf20907c6accffc37246eddf04f8599060d99ea | Desktop security UI/tests; shared-store retry investigation routes to M1 #51. |
| M5 | feature/ac3-policy-audit / #47 | 373e2c2c16e404ad6fc1c28170d7ccc5f5e8c13c | Policy/router and alias-denial regressions. Owns source fix; product-host protected-open remains NOT_VERIFIED (#52). |
| M6 | feature/ac3-e4-validation-ac3 / #38 | c1fdf3cfd936805c6888c7b1c3c5603797b4cbc9 | E4 verifier/schema/bundle. Independent external E4 remains NOT_VERIFIED. |
| M7 | feature/ac3-reliability-ac3 / #39 | cf4b70f5130175582fffdfc65bd7c6847450867b | Reliability/installer payload and lifecycle evidence. Owns package/payload artifact in #53; clean-VM lifecycle remains NOT_VERIFIED (#41). |
| M8 | feature/ac3-open-source-product / #40 | c1ff677cc56cd159cc983042e5dfcec5dc93f3ad | Open-source/docs and canonical Hook/logging copy. Owns its shipped-copy reconciliation for #53. |
| M9 | feature/ac3-m9-integration / #36 | de3799aae540f58173acec4ab3f7a1fe98593aa7 | Integration composition and assigned test/ai.test.ts diagnostics. Must wait for M3 #55 before repinning. Provider/transport source ownership is unresolved if a future source change is required. |

All active module PRs listed here target feature/agent-canary-3.0 at 62496d4020bd90ba2eede49b2e80a2bbebb036b4. Legacy M6 PR #31 targets main and remains outside AC3. This Windows clone exposes only the M0 coordinator worktree; agents/ is empty and WSL has no installed distribution. Do not claim independent local module worktrees until each owner provides its exact path and branch.

## Archived remote ownership snapshot (2026-10-15 20:25 UTC)

| Module | Existing branch / PR | Exact remote head | Owner and current boundary |
| --- | --- | --- | --- |
| M0 | feature/ac3-m0-coordination / #30 | a91cc4f031864d26b544150195ae26e393f4f601 | Coordination docs and cross-module contracts only. Product CI 9/9 and refreshed-description ownership check 1/1 pass. |
| M1 | feature/ac3-security-core / #43 | 9ef3dc265f9f386508bbeec7ff6d9a264ab1a0a4 | Gateway, Hook contract, quarantine store. #52 host-adoption evidence and #51 UNKNOWN diagnosis remain open. |
| M2 | feature/ac3-execution-isolation / #37 | 9db59ed8f2deae905edcb2179982f8bcb594167c | Execution adapter; native Codex Shell remains UNPROTECTED. |
| M3 | feature/ac3-agent-onboarding / #33 | be3880298e1c6766024ecbce5f6dbc23c4d2daa1 | Onboarding and Hook behavior copy; owns #55 correction and positive control. |
| M4 | feature/ac3-desktop-security-center / #34 | fbf20907c6accffc37246eddf04f8599060d99ea | Desktop security UI and tests; shared-store failure routes to M1 #51. |
| M5 | feature/ac3-policy-audit / #47 | 373e2c2c16e404ad6fc1c28170d7ccc5f5e8c13c | Policy/router semantics; product-host protected-open remains NOT_VERIFIED. |
| M6 | feature/ac3-e4-validation-ac3 / #38 | c1fdf3cfd936805c6888c7b1c3c5603797b4cbc9 | E4 tooling/bundle; independent external E4 remains NOT_VERIFIED. |
| M7 | feature/ac3-reliability-ac3 / #39 | cf4b70f5130175582fffdfc65bd7c6847450867b | Reliability/installer evidence; real payload artifact proof requested for #53, clean-VM lifecycle remains NOT_VERIFIED. |
| M8 | feature/ac3-open-source-product / #40 | c1ff677cc56cd159cc983042e5dfcec5dc93f3ad | Open-source/product documentation and canonical Hook/logging copy; synthetic CI passes but real package reachability for #53 remains NOT_VERIFIED. |
| M9 | feature/ac3-m9-integration / #36 | de3799aae540f58173acec4ab3f7a1fe98593aa7 | Integration composition; waits for M3 #55 before repin. |

All listed PRs are OPEN/Draft and target feature/agent-canary-3.0 at 62496d4020bd90ba2eede49b2e80a2bbebb036b4. Legacy M6 PR #31 targets `main`; it is outside the AC3 candidate set and remains untouched. In this local clone, `git worktree list` exposes only the M0 coordinator worktree. Other module local worktree paths are unavailable here; do not infer local isolation from remote PR branches or visibility in other Codex windows.

## Archived remote ownership snapshot (2026-10-15 20:12 UTC)

# 模块文件所有权表

## Current ownership and worktree snapshot (2026-10-15 16:44 UTC)

| Module | Existing branch / PR head | Verified worktree in coordinator clone | Ownership / active disposition |
| --- | --- | --- | --- |
| M0 | `feature/ac3-m0-coordination` / #30 remote `3004dcf` | `ac3-coordinator-recovery`, clean worktree with one local docs commit `631b4cf` pending push | Owns coordination docs/status only; does not edit module product code. |
| M1 | `feature/ac3-security-core` / #43 `7d6f091` | `ac3-m1-security-recovery`, clean and remote-synced | Owns Gateway, Guard, canonical Hook contract/logging, and quarantine store. Active #51 diagnostics; no product fix absent reproduction. |
| M2 | `feature/ac3-execution-isolation` / #37 `9db59ed` | Not listed in this coordinator clone; other-window worktree state UNKNOWN | Owns execution-isolation adapter. Native Codex Shell remains UNPROTECTED (#45). |
| M3 | `feature/ac3-agent-onboarding` / #33 `be38802` | Not listed in this coordinator clone; other-window worktree state UNKNOWN | Owns onboarding and its Hook behavior/test copy. Active #55 fail-closed correction and positive control. |
| M4 | `feature/ac3-desktop-security-center` / #34 `fbf2090` | Not listed in this coordinator clone; other-window worktree state UNKNOWN | Owns desktop UI/tests; shared retry failure routes to M1 #51, with no separate UI defect established. |
| M5 | `feature/ac3-policy-audit` / #47 `373e2c2` | `ac3-m5-policy-recovery` | Owns policy/router semantics and tests. Synthetic path-alias checks pass; production protected-open/held-handle path remains NOT_VERIFIED (#52). |
| M6 | `feature/ac3-e4-validation-ac3` / #38 `c1fdf3c` | Not listed in this coordinator clone; other-window worktree state UNKNOWN | Owns E4 tooling/bundle. Independent external E4 remains NOT_VERIFIED. |
| M7 | `feature/ac3-reliability-ac3` / #39 `cf4b70f` | Not listed in this coordinator clone; other-window worktree state UNKNOWN | Owns reliability and installer evidence; clean-VM lifecycle remains NOT_VERIFIED (#41). |
| M8 | `feature/ac3-open-source-product` / #40 `c1ff677` | `ac3-m8-recovery` | Owns open-source/docs and packaged Hook documentation. Package reachability and independent E4 remain NOT_VERIFIED (#53). |
| M9 | `feature/ac3-m9-integration` / #36 `de3799a` | `ac3-m9-recovery` | Owns cross-module composition and integration tests, including assigned `test/ai.test.ts` diagnostics. Waits for M3 #55 before repinning; no provider/transport ownership is assigned. |

All module PRs remain separate and open; current CI and acceptance boundaries are summarized in `TECHNICAL_STATUS.md`. GitHub reports PRs #33/#34/#36/#37/#38/#39/#40/#43/#47 all target `feature/agent-canary-3.0` at `62496d4020bd90ba2eede49b2e80a2bbebb036b4`; GitHub compare checks confirm that exact SHA is the merge base for every head. This verifies branch provenance, not local worktree isolation. The coordinator worktree list contains M1/M5/M8/M9; M2/M3/M4/M6/M7 are not present in this clone, so their local worktree state remains UNKNOWN. PR #24 remains OPEN/Draft and untouched; no main merge or Release occurred.

## Coordinator ownership note (2026-10-15 11:18 UTC)

- **M3** owns its onboarding branch and Hook test copy. M1 owner review found M3 wrapper executable behavior differs only by a comment. M3 owns fixing Issue #55: its current ordinary unpinned Read allows where M1 denies; preserve M1 assertions and advance existing PR #33.
- **M9** owns the composition workflow and integration tests. Commit `1616335` is pushed to PR #36; product/wrapper checks pass, but the M1/M3 contract gate fails. Local follow-up `de3799a` disables matrix fail-fast so future Windows results remain visible; it is not pushed. M9 may edit only M9-owned integration files.


## Current ownership and worktree snapshot (2026-10-15 10:44 UTC)

| Module | Current checkout / PR | Ownership and acceptance status |
| --- | --- | --- |
| M0 | `ac3-coordinator-recovery` / `feature/ac3-m0-coordination`; #30 `4ff3251`, 10/10 | Owns coordination documents, issue/status snapshots, and schedule; never edits module source. |
| M1 | `ac3-m1-security-recovery` / `feature/ac3-security-core`; remote #43 `b1d7423`, standard CI/package 9/9, dedicated file-store stress run failed; no local commits ahead | Owns Gateway/Guard, canonical native-Hook logging contract/tests, and file-state-store implementation/tests. #53 exact-field/caller+reason canary regression and #51 per-attempt metadata diagnostics pass exact-head standard CI. Source review found no FIFO/fair lock queue; fixed 2 ms polling makes worker starvation plausible but unproven. Dedicated run `38719879606` still fails at retry exhaustion; no holder or underlying trigger is identified. |
| M2 | No M2 worktree visible in the current coordinator clone; existing branch `feature/ac3-execution-isolation`, #37 `9db59ed`, 9/9 | Owns the execution-isolation adapter. Native Codex Shell remains UNPROTECTED/NOT_VERIFIED; CI does not prove host interception. |
| M3 | No M3 worktree visible in the current coordinator clone; existing branch `feature/ac3-agent-onboarding`, #33 `be38802`, 9/9 | Owns onboarding and its branch-local Hook test copy. |
| M4 | No M4 worktree visible in this coordinator clone; existing branch `feature/ac3-desktop-security-center`, #34 `fbf2090`; one Ubuntu Node 20 test failure, four matrix jobs cancelled | Owns desktop UI and its tests. Run 38698635434 checked merge ref `0237411`; only Ubuntu Node 20 failed in the concurrent file-state-store test (`RETRY_LIMIT`). Three cancelled jobs had completed `npm test` successfully; Windows Node 22 was cancelled before steps. Ubuntu Node 22, Docker, and sponsor passed; package smoke was skipped. The same test exhausts retries on M1 Ubuntu Node 22; root cause remains UNKNOWN. Backend provider/IPC acceptance remains UNKNOWN. |
| M5 | `ac3-m5-policy-recovery` / `feature/ac3-policy-audit`; remote #47 `373e2c2`, 9/9 | Owns policy/audit semantics. M1 approved and reviewed test-only sparse lock/state metadata diagnostics scoped to each quarantine attempt; exact-head CI passes. M5 does not own the store implementation. |
| M6 | No M6 worktree visible in the current coordinator clone; existing branch `feature/ac3-e4-validation-ac3`, #38 `c1fdf3c`, 11/11 | Owns E4 verifier/schema and `e4:*` contract fields. External E4 remains NOT_VERIFIED. |
| M7 | No M7 worktree visible in the current coordinator clone; existing branch `feature/ac3-reliability-ac3`, #39 `cf4b70f`, 11/11 | Owns Windows packaging/reliability. Clean-VM install/launch/upgrade/uninstall remains NOT_VERIFIED. |
| M8 | `ac3-m8-recovery` / `feature/ac3-open-source-product`; #40 `c1ff677`, 11/11 | Owns public docs/community and its wrapper copy. Windows LF/blob checks pass; packaged callback and clean-VM runtime are separate acceptance gates. |
| M9 | `ac3-m9-recovery` / `feature/ac3-m9-integration`; #36 `4f31bab`, 13/13 checks pass; issue #54 OPEN | Owns integration tests and manifest composition; M0 explicitly routed `test/ai.test.ts` to M9. Commit `4f31bab` adds failure-only request-count and allowlisted error-code diagnostics without weakening assertions or changing provider/transport; exact-head composition, wrapper, product, and package checks now pass 13/13. Ownership of `src/ai/provider.ts` and `src/ai/transport.ts` remains unresolved; M9 must not edit them without owner confirmation. |

All active module PRs target `feature/agent-canary-3.0` at `62496d4020bd90ba2eede49b2e80a2bbebb036b4`. PR #24 is OPEN/Draft with 11/11 checks passing; it remains untouched and unmerged. The usage page stays open in tab 336903483. No `main` merge or Release occurred.

## Archived ownership and worktree snapshot (2026-10-15 10:07 UTC)

| Module | Current checkout / PR | Ownership and acceptance status |
| --- | --- | --- |
| M0 | `ac3-coordinator-recovery` / `feature/ac3-m0-coordination`; #30 `3eee1fc`, 10/10 | Owns coordination documents, issue/status snapshots, and schedule; never edits module source. |
| M1 | `ac3-m1-security-recovery` / `feature/ac3-security-core`; remote #43 `169d644`, standard CI/package 9/9, dedicated file-store stress check failed; local `02994d1` is one commit ahead | Owns Gateway/Guard, canonical native-Hook logging contract/tests, and file-state-store implementation/tests. #53's exact-field/caller+reason canary regression is committed locally; wrapper/test syntax and isolated canary smoke pass, full test blocked by missing dependencies. #51 retry root remains UNKNOWN; M1 authorized M5's bounded metadata-only diagnostics. |
| M2 | No M2 worktree visible in the current coordinator clone; existing branch `feature/ac3-execution-isolation`, #37 `9db59ed`, 9/9 | Owns the execution-isolation adapter. Native Codex Shell remains UNPROTECTED/NOT_VERIFIED; CI does not prove host interception. |
| M3 | No M3 worktree visible in the current coordinator clone; existing branch `feature/ac3-agent-onboarding`, #33 `be38802`, 9/9 | Owns onboarding and its branch-local Hook test copy. |
| M4 | No M4 worktree visible in the current coordinator clone; existing branch `feature/ac3-desktop-security-center`, #34 `fbf2090`, one Ubuntu Node 20 failure | Owns desktop UI and its tests. Four fail-fast-cancelled matrix jobs are not independent failures; backend provider/IPC acceptance remains UNKNOWN. |
| M5 | `ac3-m5-policy-recovery` / `feature/ac3-policy-audit`; remote #47 `bbe7efc`, 9/9; local `3b59ef4` is one commit ahead | Owns policy/audit semantics. M1 approved the test-only sparse lock/state metadata diagnostics; diff checks pass, focused test is blocked by missing `tsx`. M5 does not own the store implementation. |
| M6 | No M6 worktree visible in the current coordinator clone; existing branch `feature/ac3-e4-validation-ac3`, #38 `c1fdf3c`, 11/11 | Owns E4 verifier/schema and `e4:*` contract fields. External E4 remains NOT_VERIFIED. |
| M7 | No M7 worktree visible in the current coordinator clone; existing branch `feature/ac3-reliability-ac3`, #39 `cf4b70f`, 11/11 | Owns Windows packaging/reliability. Clean-VM install/launch/upgrade/uninstall remains NOT_VERIFIED. |
| M8 | `ac3-m8-recovery` / `feature/ac3-open-source-product`; #40 `c1ff677`, 11/11 | Owns public docs/community and its wrapper copy. Windows LF/blob checks pass; packaged callback and clean-VM runtime are separate acceptance gates. |
| M9 | `ac3-m9-recovery` / `feature/ac3-m9-integration`; #36 `1f577c5`, 11 success, 1 failure, 1 skipped | Owns integration tests and manifest composition. Both current-module composition jobs pass; Windows Node 22 `test/ai.test.ts:102` is the remaining CI failure. Component ownership of `src/ai/provider.ts`/`transport.ts` is not explicit here; M0 must route it before source changes. |

All active module PRs target `feature/agent-canary-3.0` at `62496d4020bd90ba2eede49b2e80a2bbebb036b4`. PR #24 is OPEN/Draft with 11/11 checks passing; it remains untouched and unmerged. The usage page stays open in tab 336903483. No `main` merge or Release occurred.

## Archived ownership and worktree snapshot (2026-10-15 06:41 UTC)

| Module | Existing branch / worktree | Current remote PR head and checks | Ownership / coordination |
| --- | --- | --- | --- |
| M1 | `feature/ac3-security-core` / `agents/M1-security` | #43 `f14aab7`; 10/10 | Owns Gateway/router, canonical native-Hook logging contract, and canonical Hook test. #53 owner-copy allowlist/canary passed. #51 diagnostics found no evidence-backed source fix; root remains UNKNOWN. |
| M2 | `feature/ac3-execution-isolation` / original WSL `agents/M2-isolation`; recovery `agents/M2-isolation-win` | Remote #37 `76066cb`; exact-head CI running | Owns execution-isolation adapter and branch-local wrapper copy. #53 wrapper matches M1 blob `d6f9324`. #52 candidate adds three M2-owned adapter/test/report files; local syntax/build/focused-test/diff checks passed. Its checker uses M2's older policy tree and does not validate M5 #47 semantics. Original WSL checkout preserved. Native Codex Shell remains UNPROTECTED/BLOCKED_NOT_VERIFIED. |
| M3 | `feature/ac3-agent-onboarding` / `agents/M3-onboarding` | #33 `1829e05`; 9/9 | Owns onboarding and its branch-local Hook test copy; wrapper/canary change passes focused 11/11, build, syntax, and diff checks. |
| M4 | `feature/ac3-desktop-security-center` / `agents/M4-desktop-security-center` | #34 `66e679b`; 9/9 | Owns desktop UI and tests; #53 wrapper matches M1 contract and canary is in `test/runtime-console.test.ts`. No provider/IPC; UI remains UNKNOWN. |
| M5 | `feature/ac3-policy-audit` / `agents/M5-policy` | #47 `a6d610e`; 9/9 | Owns policy/audit and `security-router` semantics. Read-only #52 audit found no production filesystem-host consumer; `risk-policy` denies sensitive/outside aliases before callback with `verifyRealPaths`, but `security-router.decide()` currently masks explicit DENY as `UNCHANGED` under OBSERVE and lacks M9's per-component symlink rejection. Owner review/focused reconciliation is next; do not change through M0. |
| M6 | `feature/ac3-e4-validation-ac3` / `agents/M6-e4-ac3` | #38 `c1fdf3c`; 11/11 | Owns verifier/schema and `e4:*`; wrapper matches M1 contract and canary is in `test/auto-e4.test.mjs` (6/6). Existing untracked 16-file E4 report preserved; external E4 remains NOT_VERIFIED. |
| M7 | `feature/ac3-reliability-ac3` / original WSL `agents/M7-reliability-ac3` | #39 `87e0df0`; 11/11 | Owns Windows packaging. #53 packaged-wrapper E4/log-canary regression passes; clean-VM lifecycle NOT_VERIFIED. |
| M8 | `feature/ac3-open-source-product` / original WSL `agents/M8-ecosystem`; recovery `agents/M8-ecosystem-win` | Remote #40 `454873c`; 9/9 | Owns public docs/community and branch wrapper copy. Raw wrapper is confirmed reachable via Windows installer build and E4 source harness. Wrapper equals M1 blob `d6f9324`; branch test equals M1 canonical `6c2d8da`, restoring only the missing canary input/assertion. Build and target test 10/10 pass. Original WSL checkout preserved. GHCR pull/runtime and independent E4 NOT_VERIFIED. |
| M0 | `feature/ac3-m0-coordination` / `coordinator` | #30 `494890c`; product checks pass; ownership check has both a failure and success | Owns coordination docs/issue/CI schedule; product source unchanged. Keep ownership check unresolved until a fresh exact-head run passes. P1 #51 remains OPEN with root cause UNKNOWN. |
| M9 | `feature/ac3-m9-integration` / `integration` | Remote #36 `f87a70f`; 11/11 | Owns integration tests/manifest composition. Review confirms the current M9 test tree differs from M5 #47 in OBSERVE `decide()` projection and generic symlink handling; M2 candidate is absent from M9 CI. No M9 change is justified until M5 resolves semantics and M2 makes its adapter available on the existing PR. Synthetic tests do not verify a production host. External E4 remains NOT_VERIFIED. |

All active module PRs remain OPEN/Draft and target `feature/agent-canary-3.0` at `62496d4020bd90ba2eede49b2e80a2bbebb036b4`. PR #24 remains OPEN/Draft at base `dc8d0092b35141b295d5ff42873584ed488e4ee7` and head `62496d4020bd90ba2eede49b2e80a2bbebb036b4`, with 11/11 checks passing; it was not changed or merged. The quota page remains open.

## Archived ownership and worktree snapshot (2026-10-15 04:04 UTC)

| Module | Existing branch / worktree | Current remote PR head and checks | Ownership / coordination |
| --- | --- | --- | --- |
| M1 | `feature/ac3-security-core` / `agents/M1-security` | #43 `f14aab7`; 10/10 exact-head checks pass | Gateway/router owner; explicit `verifyRealPaths:true` hard-denies read/write junction aliases before callbacks. 20/20 focused route tests. Native host callback remains NOT_VERIFIED. |
| M2 | `feature/ac3-execution-isolation` / WSL-managed `agents/M2-isolation` | #37 `0f2c10c`; 9/9 pass | Owns execution-isolation adapter; native Codex Shell remains UNPROTECTED/BLOCKED_NOT_VERIFIED. WSL worktree status not newly verified. |
| M3 | `feature/ac3-agent-onboarding` / `agents/M3-onboarding` | #33 `f9bd818`; 9/9 pass | Owns onboarding and its Hook-test copy. Synthetic tests do not prove host callback; #32 remains OPEN. |
| M4 | `feature/ac3-desktop-security-center` / `agents/M4-desktop-security-center` | #34 `e939f04`; 9/9 pass | Owns desktop UI and tests; runtime-console 8/8. No security/E4 provider or IPC; UI remains UNKNOWN. |
| M5 | `feature/ac3-policy-audit` / `agents/M5-policy` | #47 `0fdbd92`; 9/9 pass | Owns policy/audit. Focused policy suite 30/30; OBSERVE retains non-overridable DENY. No production filesystem host consumer. |
| M6 | `feature/ac3-e4-validation-ac3` / `agents/M6-e4-ac3` | #38 `cd55717`; 9 product checks+2 wrappers pass | Owns verifier/schema and `e4:*`; verifier files are byte-identical in M9. External E4 remains NOT_VERIFIED. |
| M7 | `feature/ac3-reliability-ac3` / WSL-managed `agents/M7-reliability-ac3` | #39 `4267c61`; 9+2 pass | Owns reliability/Windows packaging. Clean-VM lifecycle NOT_VERIFIED; exclusive installer/VM test not run. |
| M8 | `feature/ac3-open-source-product` / WSL-managed `agents/M8-ecosystem` | #40 `16e3d01`; 9/9 pass recorded | Owns public docs/community. Local GHCR pull/runtime and independent E4 NOT_VERIFIED. |
| M0 | `feature/ac3-m0-coordination` / `coordinator` | #30 OPEN/Draft; prior head `76f9a2f` checks 9+1 passed; this snapshot is included in the current update batch | Owns coordination docs, issue/PR status, schedule and canonical contract; does not edit module source. |
| M9 | `feature/ac3-m9-integration` / `integration` | #36 `37a09e8`; 11/11 exact-head checks pass | Owns integration tests and manifest composition. Local full 409 pass/0 fail/6 environment skips, build, E4 16/16, package smoke 100 files. M6 verifier unchanged. |

All active module PRs remain OPEN/Draft and target `feature/agent-canary-3.0` at `62496d4020bd90ba2eede49b2e80a2bbebb036b4`. PR #24 remains OPEN/Draft at its separate readiness base and was not changed or merged. The usage page remains open. Do not edit main, merge PR #24, or publish a Release.

## Archived ownership and worktree snapshot (2026-10-15 03:31 UTC)

| Module | Existing branch / worktree | Current remote PR head and checks | Ownership / coordination |
| --- | --- | --- | --- |
| M1 | `feature/ac3-security-core` / `agents/M1-security` | #43 `3828bee`; CI and ten-run store workflow pass | Gateway/Guard/Hook owner. Real file Gateway holds and rechecks descriptors; focused Gateway/router tests 48/48 and build pass. No native host callback consumer found; host integration remains NOT_VERIFIED. |
| M2 | `feature/ac3-execution-isolation` / WSL-managed `agents/M2-isolation` | #37 `0f2c10c`; 9/9 pass | Owns execution-isolation adapter. Audit found no repo-level fail-open; native Codex Shell remains UNPROTECTED/BLOCKED_NOT_VERIFIED (#45). Worktree Git state not verifiable without WSL. |
| M3 | `feature/ac3-agent-onboarding` / `agents/M3-onboarding` | #33 `f9bd818`; 9/9 pass, Windows Node20 passes | Owns onboarding and branch-local Hook test. #32 remains OPEN for M9 combination and host callback evidence; historical runner delay remains UNKNOWN. |
| M4 | `feature/ac3-desktop-security-center` / `agents/M4-desktop-security-center` | #34 `9288de0`; 9/9 pass | Owns desktop UI and branch-local Hook test. Current Console has no security/E4 provider or IPC; UI remains UNKNOWN, runtime-console 7/7. |
| M5 | `feature/ac3-policy-audit` / `agents/M5-policy` | #47 `c54e7eb`; 9/9 pass | Owns policy/audit and generic adapter. Adapter passes `verifyRealPaths`; no production filesystem-host consumer exists in M5. #52 remains OPEN pending real-host evidence. |
| M6 | `feature/ac3-e4-validation-ac3` / `agents/M6-e4-ac3` | #38 `cd55717`; 9 product checks and 2 wrappers pass | Owns E4 verifier/schema and three `e4:*` fields. Focused tests 16/16; fields match M9. Owner review approved M9's minimal preflight adaptation retaining M9's lock recovery and atomic writer; review complete. Preserve untracked evidence; external E4 remains NOT_VERIFIED. |
| M7 | `feature/ac3-reliability-ac3` / WSL-managed `agents/M7-reliability-ac3` | #39 `4267c61`; 9 product checks and 2 wrappers pass | Owns reliability/Windows packaging. Clean-VM lifecycle remains NOT_VERIFIED (#41); no WSL state inspection or exclusive installer/VM test. |
| M8 | `feature/ac3-open-source-product` / WSL-managed `agents/M8-ecosystem` | #40 `16e3d01`; exact-head run `38674816292` passes 9/9 | Owns public docs/community. Release/compatibility, scope, and PR CI summary were corrected on the existing branch via web UI. Read-back confirms OPEN/Draft and no E4 verification claim. |
| M0 | `feature/ac3-m0-coordination` / `coordinator` | #30 remote `9b8d8d1`; local HEAD `6fbefbb` plus uncommitted coordination refresh | Owns coordination docs, canonical contract, schedule, issue/PR status; does not edit module source. Local updates are not pushed. |
| M9 | `feature/ac3-m9-integration` / `integration` | Remote #36 `bc5390d`; local clean `e2e25fb` | Owns integration/risk aggregation. Local build, `e4:test` 16/16, `verify` (399 pass/6 skip/0 fail), and package smoke 100 files pass. M6 owner final review accepted; exact-head CI pending. |

All active module PRs #30/#33/#34/#36/#37/#38/#39/#40/#43/#47 target the same base commit `62496d4020bd90ba2eede49b2e80a2bbebb036b4`. PR #24 remains OPEN/Draft at base `dc8d0092b35141b295d5ff42873584ed488e4ee7` and head `62496d4020bd90ba2eede49b2e80a2bbebb036b4`, with 9 product and 2 wrapper checks passed; it remains unchanged. Existing WSL-managed `/mnt/c/...` worktrees are not to be pruned or operated using Windows Git; the WSL distribution is unavailable. The quota-checked public-write batch completed at 03:13:51 UTC; next public batch no earlier than 03:33:51 UTC.

## Archived ownership and worktree snapshot (2026-10-15 02:10 UTC)

| Module | Existing branch / worktree | Current remote PR head and checks | Ownership / coordination |
| --- | --- | --- | --- |
| M1 | `feature/ac3-security-core` / `agents/M1-security` | PR #43 remote `3828bee`; standard CI 9/9 and dedicated store workflow passed. | Owns Gateway/Guard, Hook, and (M1 accepted in #51 comment `6182359961`) `src/file-state-store.ts` plus `test/file-state-store.test.ts` for quarantine persistence. Workflow run 38668337033 ran on merge candidate `3c8d880` (M1 `3828bee` + base `62496d4`): 10/10 iterations, each 17 tests / 14 pass / 0 fail / 3 skip. M1 confirms #51 direct failure (500 `STATE_STORE_BUSY` retries → `RETRY_LIMIT`); the original trigger remains UNKNOWN as recorded in `6182797086`. For #32, old Windows Node20 marker failure was caused by the old fixture's 1s `spawnSync` timeout; underlying runner delay remains UNKNOWN. Existing fix `46af1f1` is in PR #43 ancestry and current M1/CI checks pass; M9 combined-baseline review pending. No native host callback proof; #32 remains OPEN. |
| M2 | `feature/ac3-execution-isolation` / WSL-managed `agents/M2-isolation` | PR #37 remote `0f2c10c`; 9/9 pass; local worktree HEAD/status not verified (no WSL distro available). | Owns execution isolation adapter. M2 read-only audit found no repo-level fail-open. Native Codex Shell remains UNPROTECTED / BLOCKED_NOT_VERIFIED (#45): current session policy, Hook trust/source, and native callback need host-owner evidence and a real shell sentinel test. No files/tests changed. |
| M3 | `feature/ac3-agent-onboarding` / `agents/M3-onboarding` | PR #33 `d9364cc`; 9/9 pass | Owns onboarding and its branch-local Hook test copy. #32 remains UNACKNOWLEDGED/HOLD; M0 requested branch-head/ownership/evidence acknowledgment in comment `6182264822`; no branch edit authorized. |
| M4 | `feature/ac3-desktop-security-center` / `agents/M4-desktop-security-center` | PR #34 `69ec7f1`; 9/9 pass | Owns desktop UI and branch-local Hook test copy. #32 remains UNACKNOWLEDGED/HOLD; M0 requested branch-head/ownership/evidence acknowledgment in comment `6182264822`; backend security/E4 UNKNOWN. |
| M5 | `feature/ac3-policy-audit` / `agents/M5-policy` | PR #47 `7d5df63`; 9/9 pass | Owns policy/audit fields; sensitive-read hard DENY remains. M6 separately ACCEPTed the three `e4:*` field definitions; combined package acceptance remains tracked in #27. |
| M6 | `feature/ac3-e4-validation-ac3` / `agents/M6-e4-ac3` | PR #38 `0908449`; initial run `38662965312` had one Ubuntu Node 22 `RETRY_LIMIT` failure; attempts 2–4 passed the Ubuntu Node 22 full test job consecutively (3 passes); attempt 2 passed all 9 product jobs; wrapper `38662965329` 2/2 | Owns E4 verifier/schema and `e4:*` fields; M6 accepted `e4:auto`, `e4:verify`, and `e4:test`. `file-state-store` source/test blobs match the base and M6 diff does not touch them; M6 Windows focused run passed 3/3. The green reruns do not establish the original failure's root cause. Preserve untracked evidence. |
| M7 | `feature/ac3-reliability-ac3` / WSL-managed `agents/M7-reliability-ac3` | PR #39 `4267c61`; 11/11 pass | Owns Windows packaging/reliability except M6-owned `packaging/windows/auto-e4.mjs` and `packaging/windows/e4-hook-faults.mjs`. Clean-VM install/launch/upgrade/uninstall/cancel rollback remains NOT_VERIFIED (#41). |
| M8 | `feature/ac3-open-source-product` / WSL-managed `agents/M8-ecosystem` | PR #40 `139e7f2`; 9/9 pass | Owns open-source experience/docs. A current read-only WSL status command is still pending without output; leave its worktree untouched. |
| M0 | `feature/ac3-m0-coordination` / `coordinator` | PR #30 remote `fd7a65d`; exact-head product CI 9/9 and coordination check pass. | Owns coordination docs, canonical contract and schedule; does not edit module source. |
| M9 | `feature/ac3-m9-integration` / `integration` | PR #36 remote `bc5390d` CI 11/11 | Owns integration/risk aggregation. Read-only audit ACCEPTed E4 script/path compatibility and API semantics; Hook fixture alignment and external E4/native host/clean-VM gates remain open. |

The active PR set #30/#33/#34/#36/#37/#38/#39/#40/#43/#47 uses the same AC3 base commit `62496d4020bd90ba2eede49b2e80a2bbebb036b4`; PR #24 remains OPEN/Draft, base `competition/shanchuanzhi-release-readiness` at `dc8d0092b35141b295d5ff42873584ed488e4ee7`, head `feature/agent-canary-3.0` at `62496d4020bd90ba2eede49b2e80a2bbebb036b4`, 11/11 checks, unchanged. Distinct M0–M9 worktree paths and expected module branches are present in `git worktree list`. Windows Git reports several WSL-managed `/mnt/c/...` entries as prunable because their gitdir paths belong to the other runtime; do not prune or repair them from Windows Git. Keep the detached scratch and legacy worktrees intact. M9 head `bc5390d` was pushed in the 01:16 UTC batch; M0 head `fd7a65d` and M1 head `3828bee` were pushed in the 01:56 UTC batch. M0 local doc commit `f98c662` awaits the next batch, no earlier than 02:16 UTC. M8's pending WSL status command remains unresolved and its worktree is untouched.

## Archived ownership and worktree snapshot (2026-10-14 22:55 UTC)

| Module | Existing branch / worktree | Current PR head and checks | Ownership / coordination |
| --- | --- | --- | --- |
| M1 | feature/ac3-security-core / agents/M1-security | #43 `4b562be`; CI 38620584097 passed | Owns Gateway/Guard and Hook semantics/tests. M1 accepts `d3b64fc` only for timing-fixture behavior; no native callback proof. |
| M2 | feature/ac3-execution-isolation / agents/M2-isolation | #37 `0f2c10c`; CI 38561262930 passed | Owns isolation adapter. Native Shell remains UNPROTECTED (#45); worktree is WSL-managed. |
| M3 | feature/ac3-agent-onboarding / agents/M3-onboarding | #33 `d9364cc`; CI 38555297535 passed 9/9 | Owns onboarding and branch-local test copy. #32 assignment UNACKNOWLEDGED/HOLD since22:55; branch unchanged. |
| M4 | feature/ac3-desktop-security-center / agents/M4-desktop-security-center | #34 `69ec7f1`; CI 38555299339 passed 9/9 | Owns desktop UI and branch-local test copy. #32 assignment UNACKNOWLEDGED/HOLD since22:55; backend security/E4 UNKNOWN. |
| M5 | feature/ac3-policy-audit / agents/M5-policy | #47 `7d5df63`; CI 38617317812 passed 9/9 | Owns policy/audit fields; sensitive-read hard DENY remains. |
| M6 | feature/ac3-e4-validation-ac3 / agents/M6-e4-ac3 | #38 `ed82f06`; CI 38555297615 passed 9/9 | Owns E4 verifier/schema and e4:* fields. No active slot; #27 owner signoff pending. Preserve untracked evidence. |
| M7 | feature/ac3-reliability-ac3 / agents/M7-reliability-ac3 | #39 `4267c61`; CI 38596572303 passed 9/9, wrapper 38596572179 passed 2/2 | Owns Windows packaging/reliability. #41 remains NOT_VERIFIED/HOLD. |
| M8 | feature/ac3-open-source-product / agents/M8-ecosystem | #40 `139e7f2`; CI 38561307114 passed 9/9 | Owns public docs/community; Release unpublished. |
| M0 | feature/ac3-m0-coordination / coordinator | #30 `b000cc8`; product 38648712858 passed 9/9, ownership 38648712873/38649025874 passed 1/1 | Owns coordination docs, canonical contract and schedule; does not edit module source. Last push 22:35 UTC. |
| M9 | feature/ac3-m9-integration / integration | #36 `6abd4da`; CI 38620602632 passed 9/9, wrapper 38620603071 passed 2/2 | Owns integration/risk aggregation; external E4/native Shell/clean-VM remain outside CI proof. |

At22:55 UTC, M3 and M4 worktrees are clean at their listed heads and each #32 task is marked UNACKNOWLEDGED/HOLD. Stop messages were queued; consumption is unknown. No replacement development task is scheduled until the hold state is clear, preserving the two-task concurrency cap. M6 owner disposition remains pending. No branch was created or rewritten.

## Archived snapshot (2026-10-14 22:34 UTC)

| Module | Existing branch / worktree | Current PR head and checks | Ownership / coordination |
| --- | --- | --- | --- |
| M1 | feature/ac3-security-core / agents/M1-security | #43 `4b562be`; CI 38620584097 passed | Owns Gateway/Guard, Hook semantics and Hook tests. M1 accepts `d3b64fc` only for timing-fixture behavior; no native callback proof. |
| M2 | feature/ac3-execution-isolation / agents/M2-isolation | #37 `0f2c10c`; CI 38561262930 passed | Owns isolation adapter. Native Shell remains UNPROTECTED (#45). |
| M3 | feature/ac3-agent-onboarding / agents/M3-onboarding | #33 `d9364cc`; CI 38555297535 passed 9/9 | Owns onboarding and branch-local test copy. Active slot 1/2 on #32; queued task receipt does not confirm work started. |
| M4 | feature/ac3-desktop-security-center / agents/M4-desktop-security-center | #34 `69ec7f1`; CI 38555299339 passed 9/9 | Owns desktop UI and branch-local test copy. Active slot 2/2 on #32; backend security/E4 remains UNKNOWN. |
| M5 | feature/ac3-policy-audit / agents/M5-policy | #47 `7d5df63`; CI 38617317812 passed 9/9 | Owns policy/audit fields; sensitive-read hard DENY remains. |
| M6 | feature/ac3-e4-validation-ac3 / agents/M6-e4-ac3 | #38 `ed82f06`; CI 38555297615 passed 9/9 | Owns E4 verifier/schema and `e4:*` fields. No active slot; explicit #27 owner confirmation pending. Preserve untracked evidence. |
| M7 | feature/ac3-reliability-ac3 / agents/M7-reliability-ac3 | #39 `4267c61`; CI 38596572303 passed 9/9, wrapper 38596572179 passed 2/2 | Owns Windows packaging/reliability. Manifest owner review accepted; #41 remains NOT_VERIFIED/HOLD. |
| M8 | feature/ac3-open-source-product / agents/M8-ecosystem | #40 `139e7f2`; CI 38561307114 passed 9/9 | Owns public docs/community; Release unpublished. |
| M0 | feature/ac3-m0-coordination / coordinator | #30 `6f27e16`; product 38644017236 passed 9/9, ownership 38644017422/38644355243/38644503756 passed 1/1 | Owns coordination docs, contract, Issues, CI/quota/schedule; does not edit module source. Last push 21:55 UTC. |
| M9 | feature/ac3-m9-integration / integration | #36 `6abd4da`; CI 38620602632 passed 9/9; wrapper 38620603071 passed 2/2 | Owns integration/risk aggregation; external E4/native Shell/clean-VM remain outside CI proof. |

At 22:14 UTC, M3/M4 worktrees were clean at their listed PR heads. M0 queued the #32 task into both existing Codex sessions at 22:11 UTC; queue receipts are not completion evidence. M6 remains outside the two active slots with #27 signoff pending. No branch was created, rebased, or rewritten.

## Archived snapshot (2026-10-14 21:53 UTC)

| Module | Existing branch / worktree | Current PR head and checks | Ownership / coordination |
| --- | --- | --- | --- |
| M1 | feature/ac3-security-core / agents/M1-security | #43 `4b562be`; CI 38620584097 passed | Owns Gateway/Guard, Hook semantics and Hook tests. M1 accepts `d3b64fc` only for timing-fixture behavior; this does not prove native-host callbacks. |
| M2 | feature/ac3-execution-isolation / agents/M2-isolation | #37 `0f2c10c`; CI 38561262930 passed | Owns isolation adapter. Native Shell remains UNPROTECTED (#45). |
| M3 | feature/ac3-agent-onboarding / agents/M3-onboarding | #33 `d9364cc`; CI 38555297535 passed 9/9 | Owns onboarding and its branch-local test copy. Active slot 1/2: #32 minimal async fixture port, no owner progress/head change at 21:53. |
| M4 | feature/ac3-desktop-security-center / agents/M4-desktop-security-center | #34 `69ec7f1`; CI 38555299339 passed 9/9 | Owns desktop UI and its branch-local test copy. Active slot 2/2: #32 minimal async fixture port; backend security/E4 remains UNKNOWN. |
| M5 | feature/ac3-policy-audit / agents/M5-policy | #47 `7d5df63`; CI 38617317812 passed 9/9 | Owns policy/audit fields; sensitive-read hard DENY remains. |
| M6 | feature/ac3-e4-validation-ac3 / agents/M6-e4-ac3 | #38 `ed82f06`; CI 38555297615 passed 9/9 | Owns E4 verifier/schema and `e4:*` fields. Slot released; explicit owner confirmation in #27 remains pending. Preserve untracked E4 evidence. |
| M7 | feature/ac3-reliability-ac3 / agents/M7-reliability-ac3 | #39 `4267c61`; CI 38596572303 passed 9/9, wrapper 38596572179 passed 2/2 | Owns Windows packaging/reliability. Manifest owner review accepted; #41 remains NOT_VERIFIED/HOLD. |
| M8 | feature/ac3-open-source-product / agents/M8-ecosystem | #40 `139e7f2`; CI 38561307114 passed 9/9 | Owns public docs/community; Release unpublished. |
| M0 | feature/ac3-m0-coordination / coordinator | #30 `9a8a79e`; product 38641094976 passed 9/9, ownership 38641094955 and 38641613332 passed 1/1 | Owns coordination docs, canonical contract, Issues, CI/quota/schedule; does not edit module source. Last push 21:32 UTC; next no earlier than 22:13 UTC. |
| M9 | feature/ac3-m9-integration / integration | #36 `6abd4da`; CI 38620602632 passed 9/9; wrapper 38620603071 passed 2/2 | Owns integration/risk aggregation; external E4/native Shell/clean-VM remain outside CI proof. |

At 21:53 UTC, M3 and M4 worktrees were clean and at their listed PR heads. Their exact-head CI results are automated evidence only; #32 remains OPEN until each owner’s branch copy is updated and rechecked. M6 is not an active slot but its #27 owner confirmation remains pending. No module branch was created, rebased or rewritten. Preserve the M6 untracked E4 evidence directory.

## Archived snapshot (2026-10-14 21:26 UTC)

| Module | Existing branch / worktree | Current PR head and checks | Ownership / coordination |
| --- | --- | --- | --- |
| M1 | feature/ac3-security-core / agents/M1-security | #43 4b562be; CI 38620584097 passed | Owns Gateway/Guard and Hook semantics. #43 body still has stale d26a0c3 push statement. |
| M2 | feature/ac3-execution-isolation / agents/M2-isolation | #37 0f2c10c; CI 38561262930 passed | Owns isolation adapter. Native Shell remains UNPROTECTED (#45). |
| M3 | feature/ac3-agent-onboarding / agents/M3-onboarding | #33 d9364cc; CI 38555297535 passed | Owns onboarding and its test-file copy. Latest status request #32 comment 6178865306; clean worktree at last read. |
| M4 | feature/ac3-desktop-security-center / agents/M4-desktop-security-center | #34 69ec7f1; CI 38555299339 passed | Owns desktop UI; backend security/E4 UNKNOWN. Fixture copy queued. |
| M5 | feature/ac3-policy-audit / agents/M5-policy | #47 7d5df63; CI 38617317812 passed | Owns policy/audit fields; sensitive-read hard DENY remains. |
| M6 | feature/ac3-e4-validation-ac3 / agents/M6-e4-ac3 | #38 ed82f06; CI 38555297615 passed | Owns E4 verifier/schema and e4:* fields. M0 field comparison matches M9; owner confirmation requested in #27 comment 6178865803. Preserve untracked E4 evidence. |
| M7 | feature/ac3-reliability-ac3 / agents/M7-reliability-ac3 | #39 4267c61; CI 38596572303 passed 9/9, wrapper 38596572179 passed 2/2 | Owns Windows packaging/reliability. Manifest owner review accepted; #41 remains NOT_VERIFIED/HOLD. |
| M8 | feature/ac3-open-source-product / agents/M8-ecosystem | #40 139e7f2; CI 38561307114 passed | Owns public docs/community; Release unpublished. |
| M0 | feature/ac3-m0-coordination / coordinator | #30 ff9822b; product 38638309831 passed 9/9, ownership 38638309677 and 38638890338 passed 1/1 | Owns coordination docs, contract, Issues, CI/quota/schedule; does not edit module source. |
| M9 | feature/ac3-m9-integration / integration | #36 6abd4da; CI 38620602632 passed 9/9; wrapper 38620603071 passed 2/2 | Owns integration/risk aggregation; external E4/native Shell/clean-VM still outside CI proof. |

M3/M6 remain the two assigned module slots; M4/M6 fixture-copy work stays queued. M6's untracked E4 directory remains untouched. No module branch was created, rebased, or rewritten.


## Archived snapshot (2026-10-14 21:06 UTC)

| Module | Existing branch / worktree | Current PR head and exact-head checks | Ownership / coordination |
| --- | --- | --- | --- |
| M1 | feature/ac3-security-core / agents/M1-security | #43 4b562be; CI 38620584097 passed | Owns Gateway/Guard and Hook semantics. Subprocess cannot observe native-host callbacks; correct stale PR-body claim. |
| M2 | feature/ac3-execution-isolation / agents/M2-isolation | #37 0f2c10c; CI 38561262930 passed | Owns isolation adapter. Native Codex Shell remains UNPROTECTED under #45. |
| M3 | feature/ac3-agent-onboarding / agents/M3-onboarding | #33 d9364cc; CI 38555297535 passed | Owns onboarding and branch-local test copy. #32 comment 6178530800 requests minimal approved async fixture port and exact-head CI. Worktree clean at d9364cc. |
| M4 | feature/ac3-desktop-security-center / agents/M4-desktop-security-center | #34 69ec7f1; CI 38555299339 passed | Owns desktop UI. Backend security/E4 remains UNKNOWN; fixture update queued. |
| M5 | feature/ac3-policy-audit / agents/M5-policy | #47 7d5df63; CI 38617317812 passed | Owns policy fields/audit schema. M0 owns canonical root contract; sensitive-read hard DENY remains. |
| M6 | feature/ac3-e4-validation-ac3 / agents/M6-e4-ac3 | #38 ed82f06; CI 38555297615 passed | Owns E4 verifier/schema and e4:* fields. M0 field comparison matches M9; owner confirmation requested in #27 comment 6178531392. Preserve untracked E4 evidence. |
| M7 | feature/ac3-reliability-ac3 / agents/M7-reliability-ac3 | #39 4267c61; CI 38596572303 passed 9/9; wrapper 38596572179 passed 2/2 | Owns Windows packaging/reliability. Owner review accepts M7 manifest fields; #41 lifecycle remains NOT_VERIFIED/HOLD. |
| M8 | feature/ac3-open-source-product / agents/M8-ecosystem | #40 139e7f2; CI 38561307114 passed | Owns public documentation/community experience; no Release is published. |
| M0 | feature/ac3-m0-coordination / coordinator | #30 71c2545; product 38635153635 passed 9/9; ownership 38635518024 passed 1/1 | Owns coordination docs, canonical contract, Issues, CI, quota, and schedule; does not edit module product source. |
| M9 | feature/ac3-m9-integration / integration | #36 6abd4da; CI 38620602632 passed 9/9; wrapper 38620603071 passed 2/2 | Owns integrated candidate/risk aggregation; CI does not clear external E4, native Shell, or clean-VM gates. |

M0/M1/M3/M6/M9 worktrees were locally checked in this checkpoint. M3 is clean at d9364cc. M6 retains untracked security-lab/e4-runs/20261013T114513Z/ and it must not be altered. Other ownership stays as previously recorded; no module branch was created or rewritten.


## Archived snapshot (2026-10-14 20:46 UTC)

| Module | Branch / worktree | Current PR head and exact-head CI | Ownership status |
| --- | --- | --- | --- |
| M1 | feature/ac3-security-core / agents/M1-security | #43 4b562be, 9/9 | Owns Gateway/Guard, Hook semantics, and test/agent-hook.test.ts. #32 disposition is limited to timing-fixture behavior. |
| M2 | feature/ac3-execution-isolation / agents/M2-isolation | #37 0f2c10c, 9/9 | Owns execution-isolation adapter; native Shell remains UNPROTECTED. |
| M3 | feature/ac3-agent-onboarding / agents/M3-onboarding | #33 d9364cc, 9/9 | Owns host onboarding and its Hook-fixture branch copy; current M3 checkpoint asks for the approved minimal update and exact-head CI. |
| M4 | feature/ac3-desktop-security-center / agents/M4-desktop-security-center | #34 69ec7f1, 9/9 | Owns desktop UI; backend security/E4 stays UNKNOWN. |
| M5 | feature/ac3-policy-audit / agents/M5-policy | #47 7d5df63, 9/9 | Owns policy fields and audit schema; canonical root contract remains M0-owned; #46 is CLOSED for documentation only. |
| M6 | feature/ac3-e4-validation-ac3 / agents/M6-e4-ac3 | #38 ed82f06, 9/9 | Owns E4 verifier/schema and package fields e4:auto/e4:verify/e4:test; explicit #27 signoff remains pending. Preserve the untracked run directory; its Hook-fixture copy remains queued. |
| M7 | feature/ac3-reliability-ac3 / agents/M7-reliability-ac3 | #39 4267c61, 9/9; wrapper 2/2 | Owns Windows packaging/reliability; clean-VM lifecycle remains NOT_VERIFIED/HOLD. |
| M8 | feature/ac3-open-source-product / agents/M8-ecosystem | #40 139e7f2, 9/9 | Owns public docs/community experience; release remains unpublished. |
| M0 | feature/ac3-m0-coordination / coordinator | #30 50801a0; product 38632104799 9/9, ownership 38633006905 1/1 | Owns coordination docs, canonical contract and schedule; does not edit module product code. |
| M9 | feature/ac3-m9-integration / integration | #36 6abd4da, product 9/9, wrapper 2/2 | Owns integration candidate and risk aggregation; cannot declare external E4/native Shell/clean-VM from CI alone. |

All ten active worktrees are separate and resolve to AC3 merge-base 62496d4020bd90ba2eede49b2e80a2bbebb036b4. Native Windows Git verifies M0, M1, M3-M6, and M9; WSL Git with explicit git-dir/work-tree verifies M2, M7, and M8. Cross-runtime prunable output is not grounds for repair/prune. M6's untracked security-lab/e4-runs/20261013T114513Z/ remains untouched.



规则：模块未提交修改由该模块保管。表按实际分支和当下改动路径建立；未被文件证据确认的范围标注“暂定”。路径外改动先建 Issue 并由 owner 协调。不要用 reset、clean 或 checkout 覆盖其他工作树。

## 当前 ownership snapshot（2026-10-14 19:18 UTC）

| 模块 | 分支 / 工作树 | 检查到的内容 | 独占范围或主要职责 | 共享接口/冲突 |
| --- | --- | --- | --- | --- |
| M1 | `feature/ac3-security-core` / `agents/M1-security` | PR #43 `4b562be`; run `38620584097` 9/9; owner contract under M1 path | Gateway/Guard API、Hook 安全执行链及其测试 | M1 owns `test/agent-hook.test.ts`; #32 tracks old fixture on #33/#34/#38; #28/#44 closed for limited scopes |
| M2 | `feature/ac3-execution-isolation` / `agents/M2-isolation` | PR #37 `0f2c10c`; run `38561262930` 9/9 | execution-isolation 原型、报告与测试 | binder rejects missing/unknown surfaces; native Codex Desktop Shell remains `UNPROTECTED / NOT VERIFIED` (#45) |
| M3 | `feature/ac3-agent-onboarding` / `agents/M3-onboarding` | PR #33 `d9364cc`; run `38555297535` 9/9 | 宿主发现、预览/安装/恢复适配 | #27 manifest fields; interface owner authors semantics, M0 records canonical summary |
| M4 | `feature/ac3-desktop-security-center` / `agents/M4-desktop-security-center` | PR #34 `69ec7f1`; run `38555299339` 9/9; backend endpoints UNKNOWN/UNSUPPORTED | `src/ai/console-page.ts` 与桌面 UI 行为（暂定） | 只经受保护 Console API；不以 mock 覆盖 UNKNOWN |
| M5 | `feature/ac3-policy-audit` / `agents/M5-policy` | PR #47 `7d5df63`, run `38617317812` 9/9; report blob `1300b4d` | 策略管理、审计 schema、策略测试 | sensitive-read hard DENY; M0 owns root canonical file; #46 documentation criteria met pending close; #48 closed for limited scope |
| M6 | `feature/ac3-e4-validation-ac3` / `agents/M6-e4-ac3` | PR #38 `ed82f06`; run `38555297615` 9/9; external E4 NOT_VERIFIED | E4 schema、verifier、机器报告 | 原始 run 留本地；#27 manifest composition; legacy PR #31 remains separate main-based track |
| M7 | `feature/ac3-reliability-ac3` / `agents/M7-reliability-ac3` | PR #39 `4267c61`; run `38596572303` 9/9, wrapper `38596572179` 2/2 | `packaging/windows/`、scripts、可靠性/打包验证 | #41 clean-VM/user lifecycle remains HOLD/NOT VERIFIED; Gateway lifecycle coordinates with M1 under #28 |
| M8 | `feature/ac3-open-source-product` / `agents/M8-ecosystem` | PR #40 `139e7f2`; run `38561307114` 9/9 | README、贡献/安全/支持/开源文档（暂定） | 文档必须如实描述安全覆盖边界；未发布 Release |
| M0 | `feature/ac3-m0-coordination` / `coordinator` | Remote PR #30 `af39e96`; run `38617312991` 9/9 + ownership `38617313009` 1/1; coordinator documentation refresh is local and unpushed | `docs/3.0/*` 协调文档、Issue/CI/额度/排程 | Canonical shared API doc; does not edit M1–M8 product source |
| M9 | `feature/ac3-m9-integration` / `integration` | PR #36 `6abd4da`; run `38620602632` 9/9 + wrapper `38620603071` 2/2 | 跨模块集成验收及风险跟踪 | #27/#32 remain open; external E4/native Shell/clean-VM remain unverified |

M0–M8/M9 current worktree HEADs all resolve to merge-base `62496d4020bd90ba2eede49b2e80a2bbebb036b4`; each has a distinct path and expected feature branch. The M6 untracked `security-lab/e4-runs/20261013T114513Z/` evidence directory is preserved unchanged. Current checks do not change file ownership or expand host/VM acceptance.

## 历史分支与验收状态快照（2026-10-14 11:45 UTC）

以下以本机 Git worktree HEAD 与 GitHub 当前 PR head/CI 交叉核对；模块工作区由其 owner 保管。

| 模块 | 当前工作树 HEAD | GitHub 状态与下一门槛 |
| --- | --- | --- |
| M1 | `ca24d37` | PR #43 OPEN/Draft，9/9 current-head checks pass; exact-expiry fixture fix verified remotely. |
| M2 | `d9d775b` | PR #37 OPEN/Draft; inherited Hook test fixture remains stale; #45 native Shell remains UNPROTECTED. |
| M3 | `d9364cc` | PR #33 OPEN/Draft，9/9 current-head checks；#42 CLOSED。 |
| M4 | `69ec7f1` | PR #34 OPEN/Draft，9/9 current-head checks；后端 endpoint UNKNOWN/UNSUPPORTED。 |
| M5 | `bcbec98` | PR #47 OPEN/Draft; owner fix absent, stale Hook test preflight verified; preserve sensitive-read DENY. |
| M6 | `ed82f06` | PR #38 OPEN/Draft，9/9 current-head checks；外部 E4 NOT_VERIFIED。 |
| M7 | `c9a6b5c` | PR #39 OPEN/Draft; Windows Node20/22 fail only at inherited M1 Hook fixture; clean-VM/install remains HOLD/NOT VERIFIED. |
| M8 | `4c11981` | PR #40 OPEN/Draft；current run failed inherited M1 synchronous marker test；未发布 Release。 |
| M0 | `9aee510` | PR #30 OPEN/Draft; only Windows Node22 fails inherited M1 interruption fixture; next push after 12:01 UTC. |
| M9 | `ab382fe` | PR #36 OPEN/Draft，11/11 current-head checks pass; local verify 393/399, 0 fail/6 skip, package smoke 100 files, E4 tests 12/12. |

AC3 PR #24 与模块候选均以共同基线 `62496d4020bd90ba2eede49b2e80a2bbebb036b4` 为验收起点。`git worktree list` 显示 M0/M1–M9 使用不同目录和预期分支；另保留 M1 detached scratch `f2f2d10`、M6 旧 main-based worktree/PR #31、M7 旧分支 `feature/ac3-reliability`（HEAD `9c05286`），不清理不替换。Git worktree 列表以 WSL Git 管理；Windows Git 对部分路径显示 prunable 时禁止跨 runtime repair/prune。

## 共享路径规则

| 路径 | owner | 协调规则 |
| --- | --- | --- |
| `src/runtime/gateway.ts` | M1（Guard/Gateway 契约与安全实现）、M7（可靠性实现） | 已有可见重叠：M1 增加 quarantine callback cancellation；M7 `close()` 增加幂等关闭及资源关闭错误。M1 review 是契约门；最终集成须保留两侧不变量并由 #28 验证 |
| `package.json` | M3、M5、M6、M7（M3/M5/M7 字段已确认；M6 需要显式确认当前 `e4:*` 字段） | 不覆盖对方字段；#27 记录字段、原因和组合结果 |
| `src/ai/console.ts` | M3（接入路由）、M4（安全中心配套），暂定 | 路由/响应变更列出协作模块并更新 API 契约 |
| `src/runtime/evidence.ts` | M1（写入调用）、M6（schema/验证），暂定 | 事件语义变更列出协作模块并保留拒绝/执行/副作用边界 |
| `test/agent-hook.test.ts`, `security-lab/claude-native-hook.mjs` | M1 canonical; module-local wrapper copies follow their PR owner | M1 owns canonical Hook/interruption semantics and wrapper-log contract. A branch owner may add only a synthetic canary input/log-exclusion assertion in that branch's existing CI-run test copy to exercise its own wrapper; preserve every fail-closed/interruption assertion and keep M1's worktree untouched. Any broader fixture or semantic change requires M1 review; do not change shared test configuration to evade ownership. |
| `test/honeypot-runtime.test.ts` | M7 场景/恢复验证；M1 Gateway 错误契约 | M7 维护隔离、恢复及副作用场景；错误码期望遵循 M1 Gateway 契约，并与 M9 验收保持一致 |

每模块只提交自己的分支。遇到未归属路径先更新本表；不能通过复制或重命名接口来规避冲突。M3 PR #33 与 M6 PR #38 均基于 AC3；M6 旧 PR #31 仍是独立 main-based 轨道。M0 不替模块 rebase 或覆盖提交；M5 `cf4e2cd` 仍待远端验收，M6 外部 E4 和 M7 clean-VM 安装仍未验证。M0 仅协调，不替模块发布。


## Owner disposition — 2026-10-15 18:24 UTC

- **M1** owns `src/security-router.ts` and `test/security-router.test.ts`. Its local `9ef3dc2` change makes `verifyRealPaths:true` fail closed for generic file path callbacks; it does not alter M5 policy files. The existing branch/worktree remains `feature/ac3-security-core`; current M1 checkout is clean and one commit ahead of PR #43's remote head.
- **M2** owns `execution-isolation/gateway-adapter/*`; the current adapter is a synthetic fixed-read bridge to M1 Gateway, with no first-party product host integration verified.
- **M5** continues to own `src/risk-policy.ts` and policy/router regressions. **M9** owns current-source cross-module composition. For #52, M0 tracks the contract and evidence boundary; M0 does not edit M1/M2/M5 product code.
- No source ownership changes were made. Shared contract changes must be made by the owning module and reflected here/API_CONTRACTS.md before other modules adapt.

## Shared Windows packaging path ownership — 2026-10-17, pending owner signoff

Issue #59 records the current overlap across M6/M7/M8 and the M9 aggregate. M0's proposed primary boundaries are:

| Shared path(s) | Proposed primary owner | Adapter/review boundary |
| --- | --- | --- |
| `packaging/windows/README.md`, `build.mjs`, `e4-hook-faults.mjs`, `prepare.mjs`, `test/windows-packaging.test.mjs` | M7 | M6/M8 may request changes through M7; M7 preserves installer, reparse, and lifecycle checks. |
| `packaging/windows/auto-e4.mjs`, `test/auto-e4.test.mjs` | M6 for E4 verifier/evidence semantics | M7 may change only package invocation/wrapper integration with M6 review; preserve E4 evidence meaning. |
| M8-owned product documentation and shipped Hook/logging copy | M8 | Claims remain limited to verified package reachability and fixed-field logging evidence. |
| M9 combined source refs and composition checks | M9 | M9 records exact source SHAs and consumes owner-controlled files; it does not change their semantics without owner signoff. |

This table is a coordination proposal, not a completed ownership transfer. M6/M7/M8 confirmation is pending on Issue #59; update this table if an owner identifies a different exact path boundary.

## Shared security/test path dispositions — 2026-10-17, owner review pending

| Path(s) | Canonical owner | Other-module change rule |
| --- | --- | --- |
| `.gitignore` | M0 | M9 consumes the reviewed rules on its aggregate branch; preserve only reviewed, path-specific evidence exceptions. Issue #58. |
| `src/security-router.ts`, `test/security-router.test.ts` | M1 for the canonical protected-path contract | M5 policy/router variants require M1 review and exact-head M9 composition; preserve explicit DENY, alias containment, and deny-before-side-effect checks. Issue #52. |
| `src/file-state-store.ts`, `test/file-state-store.test.ts` | M1 for quarantine-store implementation and canonical regression | M5's diagnostic test-only additions require M1 disposition; do not infer the retry root cause or move tests without owner signoff. Issue #51. |
| `test/agent-hook.test.ts` | M1 for canonical Hook/interruption assertions | Module copies may adapt only with owner-approved scope and must preserve fail-closed coverage; reconcile M0 #30's copy before removing Draft status. Issue #56. |

These entries record the existing owner map and current overlap evidence; they do not authorize M0 to edit M1/M5/M9 product source or tests.
