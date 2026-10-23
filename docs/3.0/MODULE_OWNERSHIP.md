## M0 exact-head ownership snapshot — 2026-10-23 00:28 UTC

GitHub readback at 00:28 UTC: all active AC3 module PRs are OPEN/Draft. PRs #30, #33, #36–#40, #43 and #47 target `feature/agent-canary-3.0` at `62496d4020bd90ba2eede49b2e80a2bbebb036b4`; PR #34 targets M1 PR #43 at `6886d6eef3beb972bc8f4c797584b0f522483870`. Legacy M6 PR #31 targets `main` and is outside this AC3 ownership map. This snapshot supersedes older exact-head tables below and does not assert acceptance beyond the recorded evidence.

| Module | Existing branch / PR | Remote head at snapshot | M0-recorded ownership boundary |
| --- | --- | --- | --- |
| M0 | `feature/ac3-m0-coordination` / #30 | `b65a85ee3cc1a81d24a74f62d29002032e9ff218` | Coordination docs, issue tracking, interface contracts; no module source/tests. |
| M1 | `feature/ac3-security-core` / #43 | `6886d6eef3beb972bc8f4c797584b0f522483870` | Gateway, Guard, canonical Hook and file-store contracts; no reproducible M1-owned bypass found; host adoption and OS-atomic proof remain NOT_VERIFIED (#52). |
| M2 | `feature/ac3-execution-isolation` / #37 | `67428139e53c3f63a1101b4f94e84b291cbb1196` | Execution adapter and host-hook integration; native Shell remains UNPROTECTED / BLOCKED_NOT_VERIFIED (#45). |
| M3 | `feature/ac3-agent-onboarding` / #33 | `c7b7772c9d62e138e1cc6deed7c43104eaccafa6` | Onboarding, Hook copy/tests, and fixed Console route; absent trusted composition fails closed to UNKNOWN; exact M9 composition pending. |
| M4 | `feature/ac3-desktop-security-center` / #34 | `4f83140807a48bfe0d3273e2493a2124f533b8a0` | Desktop security UI/tests; explicitly says UI does not consume M3 probe and keeps status NOT_VERIFIED. |
| M5 | `feature/ac3-policy-audit` / #47 | `12b2499a1f7b8525f3bf2d7659249c1bd8e881ed` | Policy/router and alias-denial regressions; no concrete reproducible defect found in audit. |
| M6 | `feature/ac3-e4-validation-ac3` / #38 | `3578e7ba10b2fd160efa0e4683aba863c666db8a` | E4 verifier/schema/bundle; target mutation now hard-fails; product-level independent E4 remains NOT_VERIFIED (#57). |
| M7 | `feature/ac3-reliability-ac3` / #39 | `f20e307458f4c703459621fd48e44a9e806f03bb` | Reliability/installer payload and lifecycle evidence; bounded worker-phase telemetry pushed; exact CI passed and Windows Community lifecycle is running; root cause remains unknown (#41). |
| M8 | `feature/ac3-open-source-product` / #40 | `854de50d94637caf3f334de7d28dcdcaddd88f9f` | Open-source/docs and canonical shipped Hook/logging copy; protected-read verification limits clarified; exact CI and wrapper regressions passed. |
| M9 | `feature/ac3-m9-integration` / #36 | `fe246f1d97a06149d366989ac9dd169b05006754` | Public head still pins prior M7/M8 refs; exact-source refresh for newly published owner heads is in progress. |
20:47 UTC delta: PR #30 advanced to `b0b3aec824eec181d8d28d343e6a173377b4a878`; the 20:47 GitHub scan showed M1–M9 still at the heads listed above.
21:07 UTC delta: PR #30 advanced to `cae786222f596c9cd0a49af90ad1d9e68e8a1aba`; the 21:07 GitHub scan showed M1–M9 still at the heads listed above.
21:28 UTC delta: PR #30 advanced to `d37191dd88a957aa22d05bd3578c2922140c7a39`; a 21:28 GitHub readback confirmed M1–M9 remain at the heads listed above. PR #24 remains unchanged.
21:40 UTC delta: a fresh GitHub readback confirms M1–M9 remain at the listed heads; PR #30 remains at d37191dd88a957aa22d05bd3578c2922140c7a39. M1/M4 have no owner-reported work evidence by the 21:40 checkpoint.
21:47 UTC delta: PR #30 advanced to `4c166176ac0598dc2fe2d16d6a0a7b9dcfb4bc19`. M1 #43 and M4 #34 were rechecked at 21:43 and remain at the listed heads; the 21:40 scan still has the other module heads unchanged.
22:00 UTC delta: a 21:59:45 GitHub scan confirms M1–M9 remain at the listed heads, all OPEN/Draft. M1/M4 have no owner-reported status by 22:00; the follow-ups and due time are in TECHNICAL_STATUS.md.
22:08 UTC delta: PR #30 advanced to `e0d0d8b1b64296e85df7caa64412491ef32860d1`; a 22:08 GitHub scan confirms all M1–M9 remain at the listed heads, OPEN/Draft.
22:20 UTC delta: the M1–M9 head scan remains unchanged; M1/M4 have no owner-reported evidence by 22:20. The next status checkpoint is 22:40 UTC.
22:28 UTC delta: PR #30 advanced to `e12e7b3c25c10db6af0b084571280aeed0ae5d98`; the 22:28 GitHub readback confirms M1–M9 remain at the listed heads, OPEN/Draft.
22:40 UTC delta: the M1–M9 head scan remains unchanged; M1/M4 supplied no owner-reported status or work evidence by the checkpoint. Next status is due 23:00 UTC.
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

## Latest observed PR and worktree register — 2026-10-17 12:50 UTC

| Module | Existing PR / exact GitHub head | Worktree in the inspected common repository | Read-only status |
| --- | --- | --- | --- |
| M0 | #30 `554dde8ed7a218c0e6e499f311d89408bd524fb5` (two docs-only commits are local and pending the next scheduled push) | `ac3-coordinator-recovery` / `feature/ac3-m0-coordination` | Two local documentation commits ahead; no other changed paths. |
| M1 | #43 `9ef3dc265f9f386508bbeec7ff6d9a264ab1a0a4` | `ac3-m1-security-recovery` / `feature/ac3-security-core` | Clean; local branch matches origin. |
| M2 | #37 `9db59ed8f2deae905edcb2179982f8bcb594167c` | Not listed by this repository's `git worktree list` | Other local path/state UNKNOWN; request owner confirmation. |
| M3 | #33 `be3880298e1c6766024ecbce5f6dbc23c4d2daa1` | Not listed by this repository's `git worktree list` | Other local path/state UNKNOWN; request owner confirmation. |
| M4 | #34 `fbf20907c6accffc37246eddf04f8599060d99ea` | Not listed by this repository's `git worktree list` | Other local path/state UNKNOWN; request owner confirmation. |
| M5 | #47 `373e2c2c16e404ad6fc1c28170d7ccc5f5e8c13c` | `ac3-m5-policy-recovery` / `feature/ac3-policy-audit` | Clean; local branch matches origin. |
| M6 | #38 `c1fdf3cfd936805c6888c7b1c3c5603797b4cbc9` | Not listed by this repository's `git worktree list` | Other local path/state UNKNOWN; request owner confirmation. |
| M7 | #39 `cf4b70f5130175582fffdfc65bd7c6847450867b` | Not listed by this repository's `git worktree list` | Other local path/state UNKNOWN; request owner confirmation. |
| M8 | #40 `c1ff677cc56cd159cc983042e5dfcec5dc93f3ad` | `ac3-m8-recovery` / `feature/ac3-open-source-product` | Clean; local branch matches origin. |
| M9 | #36 `de3799aae540f58173acec4ab3f7a1fe98593aa7` | `ac3-m9-recovery` / `feature/ac3-m9-integration` | Clean; local branch matches origin. |

All listed module PRs remain OPEN/Draft on `feature/agent-canary-3.0`. “Not listed” means only that no worktree for that branch is registered in this inspected common repository; it does not prove the owner has no other clone. M0 did not create, move, reset, or remove module worktrees. Ask each owner for the exact path and branch before marking independent local isolation VERIFIED.

## Additional local-path search — 2026-10-17 13:07 UTC

A read-only search of dated immediate project folders under `C:\Users\36712\Documents\Codex` found no additional `ac3-*` module checkouts beyond the registered M0/M1/M5/M8/M9 worktrees; the separate E4 and Glama folders are not M1–M8 worktrees. The desktop `Agent-Canary-Dev\agents` directory is empty, and `C:\Users\36712\.codex\worktrees` does not exist. M2/M3/M4/M6/M7 paths therefore remain NOT_VERIFIED in the inspected locations; this is not a claim that no checkout exists elsewhere. Do not create replacement branches or move any existing folder to make the registry look complete.
22:46 UTC delta: PR #30 advanced to `a11760106fd75e60f288d7d14f6397ce02d8f1e4`; exact-head product and coordination CI passed 9/9 and 1/1. The 22:49 GitHub scan found M1–M9 heads unchanged; M1/M4 evidence checkpoint remains due at 23:00 UTC.

23:00 UTC delta: PR #30 remains at `a11760106fd75e60f288d7d14f6397ce02d8f1e4` with exact-head CI 10/10 green; the next local M0 docs commit is `505474b` and awaits the 23:06:25 push window. M1 #43 and M4 #34 remain at their recorded heads without GitHub-visible work evidence; next checkpoint is 23:20 UTC.

23:09 UTC delta: PR #30 advanced to `1017e515ebe8a1ca88d8617f83d2ac7c6881275f`; exact-head product CI 9/9 and coordination 1/1 passed. The 23:00 owner checkpoint found no GitHub-visible M1/M4 work evidence; next is due 23:20 UTC.

23:20 UTC delta: the full M1–M9 PR scan shows unchanged heads; M1/M4 have no GitHub-visible owner evidence by the checkpoint. PR #30 remains at `1017e515` with 10/10 exact-head checks green; the pending local M0 doc commit is `3b7266b`.

23:29 UTC delta: PR #30 advanced to `40cf838608ed1541f259c814d4c504ef6c87d3ee`; exact-head product CI 9/9 and coordination 1/1 passed. The next M0 push window is no earlier than 23:46:47 UTC.

23:40 UTC delta: the full M1–M9 scan shows unchanged PR heads and no GitHub-visible M1/M4 work evidence by the deadline. PR #30 remains at `40cf838608ed1541f259c814d4c504ef6c87d3ee` with 10/10 checks green; next owner checkpoint is 00:00 UTC.

23:49 UTC delta: PR #30 advanced to `ae24b65963e8b0480b06997075e7bd2b5e6a1f7a`; exact-head product CI 9/9 and coordination 1/1 passed. M1 #43 and M4 #34 remained at their recorded heads in the 23:49 scan.

00:00 UTC delta (2026-10-18): the full M1–M9 PR scan is unchanged. The inspected M1 worktree is clean at its remote head; no M4 worktree is registered in this clone. M1/M4 were asked to report their actual path and exact work evidence or blocker by 00:20 UTC.

00:09 UTC delta (2026-10-18): PR #30 advanced to `3dda114f061ab69b30629546ee5bda166197c03d`; exact-head product CI 9/9 and coordination 1/1 passed. Next M1/M4 owner checkpoint is 00:20 UTC.

00:20 UTC delta (2026-10-18): the M1–M9 PR scan remains unchanged. The inspected M1 worktree is clean at origin; no M4 worktree is registered in this clone. Next owner checkpoint is 00:40 UTC.

00:29 UTC delta (2026-10-18): PR #30 advanced to `44ef54f3ac8a4e2b82d6f15de1224c22f2bde0e1`; exact-head product CI 9/9 and coordination 1/1 passed. The next owner checkpoint is 00:40 UTC.

## M4 desktop security-center ownership — 2026-10-18, pending owner confirmation

| Paths | Primary owner | Coordination boundary |
| --- | --- | --- |
| `src/ai/console-page.ts`, `src/ai/security-center-adapter.ts`, `test/runtime-console.test.ts`, `docs/3.0/M4/*`, `security-lab/claude-native-hook.mjs` | M4 | M4 maintains the desktop security-center behavior and its focused UI/runtime verification. Preserve explicit unsupported/unknown states when host APIs are unavailable. Track the unchanged exact-head CI failure in Issue #60. |
| `test/agent-hook.test.ts` | M1 | PR #34 also changes this path. M1 owns canonical Hook/interruption semantics; any M4 adaptation must be M1-reviewed and preserve assertions. Reconcile the PR #30/#34 overlap through Issue #56. |

This records the currently visible PR #34 file list; it does not confirm an unlisted local M4 worktree or transfer ownership. M0 does not edit these paths.
## M0 observed shared-path overlap — 2026-10-18 02:20 UTC

PR #47 changed files include M1-owned src/security-router.ts, test/security-router.test.ts, test/file-state-store.test.ts, and test/agent-hook.test.ts. Its src/agent-hook.ts blob matches the current M1 PR #43 blob, while test/agent-hook.test.ts differs. M1 owns canonical semantics for the shared paths listed above; #51/#52/#56 require owner disposition. This observation does not transfer ownership or authorize M0 to edit product code/tests. M1 was asked to review the exact changes or provide a blocker by 02:40 UTC.
## M0 M2 P0 integration assignment — 2026-10-18 03:00 UTC

M2 remains owner of its existing execution-isolation adapter paths under PR #37 / branch feature/ac3-execution-isolation. No corresponding M2 worktree is registered in the inspected clone, so the exact local path and implementation state remain UNKNOWN. M0 queued M2 to report path/branch/SHA and work on first-party host integration through the existing M1 Gateway contract. M1 remains owner of the public Gateway/API; this assignment does not transfer shared-path ownership or authorize API changes.
## M0 M3 contract lane — 2026-10-18 03:40 UTC

M3 remains the owner of its existing src/agent-hook.ts behavior and branch-local Hook tests on PR #33 / feature/ac3-agent-onboarding. The current exact head is be3880298e1c6766024ecbce5f5dbc23c4d2daa1; no M3 worktree is registered in the inspected clone, so the owner's actual work path remains UNKNOWN. M3's assignment does not transfer M1's canonical fail-closed contract or shared-test ownership.

## M0 exact-path ownership update — 2026-10-18 10:02 UTC

The current PR #37 changed-file list includes `test/agent-hook.test.ts`, an M1-owned canonical Hook test also present in PRs #30/#33/#34/#47. The visible overlap set is therefore #30/#33/#34/#37/#47, with PR #43 the canonical M1 owner branch. This is a path-ownership finding only; it does not establish a semantic defect in PR #37 and is not grounds to remove tests or assertions. M1 must include #37 in the file-by-file disposition tracked by Issue #56. M2's #52 work remains restricted to M2-owned execution-isolation paths and the existing adapter contract; any shared-contract change requires the M1 owner.

## M0 M6–M8 exact overlap matrix — 2026-10-18 10:25 UTC

Current GitHub changed-file lists at PR heads #38 `c1fdf3cfd936805c6888c7b1c3c5603797b4cbc9`, #39 `cf4b70f5130175582fffdfc65bd7c6847450867b`, and #40 `c1ff677cc56cd159cc983042e5dfcec5dc93f3ad` show these exact intersections:

| PR pair | Shared paths |
| --- | --- |
| #38 / #39 | `package.json`; `packaging/windows/auto-e4.mjs`; `security-lab/claude-native-hook.mjs`; `test/agent-hook.test.ts`; `test/auto-e4.test.mjs` |
| #38 / #40 | `.gitattributes`; `security-lab/claude-native-hook.mjs`; `test/agent-hook.test.ts`; `test/auto-e4.test.mjs` |
| #39 / #40 | `packaging/windows/README.md`; `packaging/windows/build.mjs`; `packaging/windows/e4-hook-faults.mjs`; `packaging/windows/prepare.mjs`; `security-lab/claude-native-hook.mjs`; `test/agent-hook.test.ts`; `test/auto-e4.test.mjs`; `test/windows-packaging.test.mjs` |

All three PRs change `security-lab/claude-native-hook.mjs`, `test/agent-hook.test.ts`, and `test/auto-e4.test.mjs`. This inventory records path overlap only; M0 has not inferred primary owners for the M6–M8 paths or found a semantic defect. M1 remains canonical owner of Hook semantics and `test/agent-hook.test.ts`. Issue #59 asks M8 to propose a file-by-file primary owner/reviewer map and obtain M6/M7 confirmation before M9 pinning.

## M0 P0 #52 per-path ownership update — 2026-10-18 11:38 UTC

| Path / responsibility | Owner | Boundary and current state |
| --- | --- | --- |
| `src/runtime/gateway.ts`, canonical held-file API, canonical Hook semantics and `test/agent-hook.test.ts` | M1 | Owns public held-handle behavior and shared fail-closed assertions; no API change without M1 review. |
| `execution-isolation/gateway-adapter/**` | M2 | Owns the fixed-resource adapter. Current visible calls are check scripts; M2 must not edit M1 or M3 paths. |
| `src/codex-connection-mcp.ts`, `src/codex-connection-check.ts`, M3 onboarding tests | M3 | Owns the Codex onboarding test host. Its current Gateway self-test has `files: []` and fixed callbacks; it does not prove protected user-file access or native-tool coverage. |
| `src/security-router.ts`, `test/security-router.test.ts` | M1 | Owns the canonical protected-path router and fail-closed tests; M5 changes to these shared paths require M1 review. |
| `src/risk-policy.ts`, `src/policy-management.ts`, `test/risk-policy.test.ts`, `test/policy-management.test.ts` | M5 | Owns policy semantics, policy/audit management, and their tests; the caller callback is not a held-file guarantee. |
| `.github/workflows/m9-cross-module-composition.yml` | M9 | Owns exact-source pins and composition gates; do not update workflow from an M2/M3 lane. |

For Issue #52, the current proposed composition boundary is M3 host -> M5 router -> M2 fixed-resource adapter -> M1 Gateway held-file dispatch. This is a scheduling/interface candidate only, not an owner-approved public API or evidence that the route is implemented. M2 and M3 have separate 11:38–11:58 assignments; each must stay within its owned paths. #52 remains OPEN/P0/NOT_VERIFIED.

## M0 M6–M8 patch-level ownership cross-check — 2026-10-18 12:59 UTC

The current exact PR heads remain #38 `c1fdf3cfd936805c6888c7b1c3c5603797b4cbc9`, #39 `cf4b70f5130175582fffdfc65bd7c6847450867b`, and #40 `c1ff677cc56cd159cc983042e5dfcec5dc93f3ad`. A paginated GitHub changed-file read confirms the existing overlap matrix above; this patch review adds proposed boundaries, pending M6/M7/M8 confirmation:

| Shared paths / patch behavior | Proposed primary owner | Required review / boundary |
| --- | --- | --- |
| `package.json`: #38 adds `e4:auto`, `e4:verify`, `e4:test`; #39 adds `reliability.test.mjs` to the test command | M6 owns the E4 script fields; M7 owns its reliability test-list addition | M6 and M7 confirm exact field ownership and the integrated command. |
| `packaging/windows/auto-e4.mjs`: #38 adds create-once E4 artifact guards; #39 uses the durable writer | M6 owns E4 report/artifact semantics; M7 owns durable packaging writes | Cross-review the write contract; keep no-overwrite and atomicity guarantees. |
| `security-lab/claude-native-hook.mjs` | M1 owns canonical Hook/log semantics; each module owns only its branch copy/consumer | The current PR patches use the same allowlisted log shape. M6/M7/M8 confirm copy and shipped-consumer use; M1 reviews any semantic change. |
| `test/agent-hook.test.ts` | M1 owns canonical Hook/interruption assertions | All three PRs change this M1-owned path. M6/M7 interruption-harness and M8 canary-fixture edits require explicit M1 review; preserve all assertions. |
| `test/auto-e4.test.mjs` | M6 owns the E4 test contract | M7 stale-lock recovery and M8 packaged-wrapper canary additions require M6 review; M1 also reviews any Hook semantic assertion. |
| `packaging/windows/README.md`, `build.mjs`, `e4-hook-faults.mjs`, `prepare.mjs`, `test/windows-packaging.test.mjs` | M7 owns installer/package behavior | M8 documentation or wrapper-consumer changes route through M7; preserve lifecycle and package checks. |
| `.gitattributes` | Pending M6/M8 path-purpose confirmation | Do not infer ownership from the shared path alone; record exact attribute and reason before any integration. |

M9 remains the owner of its workflow pins. At this read, #36 pins M6/M7/M8 to the exact current #38/#39/#40 heads, but M1 remains pinned to `b1d7423e70f2d47f43a5ec42e63a650ff93f6dcc` while current #43 is `9ef3dc265f9f386508bbeec7ff6d9a264ab1a0a4`; the #55 native-Read contract also remains unresolved. Do not repin or merge M9 until owners confirm these boundaries and exact-ref composition passes.
## Read-only PR #40 cross-owner audit — 2026-10-18 20:31 UTC

PR #40 remains at c1ff677cc56cd159cc983042e5dfcec5dc93f3ad. Its current changed-file list includes:
- M7-owned packaging paths from the existing proposal: packaging/windows/README.md, build.mjs, e4-hook-faults.mjs, prepare.mjs, and test/windows-packaging.test.mjs.
- M6-owned E4 path: test/auto-e4.test.mjs.
- M1-owned canonical assertion path: test/agent-hook.test.ts.
- packaging/windows/build-contract.mjs, which has no explicit file-level owner in the current table.
- .gitattributes, whose path purpose/owner remains unconfirmed.

M8's security-lab/claude-native-hook.mjs and M1 PR #43's same path both resolve to blob d6f93249306b7966259cab463dd39475728ef338. This proves source-blob parity at those refs only, not packaged inclusion or installed/extracted identity.

The PR review-list read returned no submitted reviews at 20:32 UTC; required issue-based M1/M6/M7 path signoff is still pending. M8 must provide a per-file intent/owner/reviewer map and shipment path, and stop further changes to other modules' owned files pending signoff. No ownership transfer is inferred by this inventory.

## M7/M8 reconciliation slot — 2026-10-18 20:45 UTC

Issue #59 assigns M7 and M8 together for 20:45–21:05 to reconcile PR #40's observed path overlap. M7 must confirm ownership and review disposition for packaging/windows/build-contract.mjs and the M7 package paths; M8 must identify the exact hunks, branch purpose and owner approvals. M1 retains test/agent-hook.test.ts and Hook semantics; M6 retains test/auto-e4.test.mjs/E4 semantics; .gitattributes purpose/owner remains pending. No ownership transfer or approval is assumed until the respective owner confirms in #59.

## M6/M7 ownership-only slot — 2026-10-19 21:20 UTC

Issue #59 assigns M6 and M7 for 21:20–21:40 on existing PRs #38/#39. This is a request for each module to confirm or correct its own boundary, not an ownership change by M0. M6 is asked to identify the exact auto-E4 semantic/test files it owns and the M7 wrapper changes requiring review; M7 is asked to confirm/correct the proposed Windows packaging paths and identify the owner of packaging/windows/build-contract.mjs and .gitattributes. As of the 21:24 public check, PR #38/#39 remained at c1fdf3cfd936805c6888c7b1c3c5603797b4cbc9 / cf4b70f5130175582fffdfc65bd7c6847450867b with no new owner disposition visible. #59 remains OPEN/P1; #53 package acceptance and M9 pinning remain blocked pending M8/M1/M6/M7 decisions and actual Windows evidence. No shared-source edits are authorized in this slot.

## M6/M7 ownership slot midpoint — 2026-10-19 21:30 UTC

At midpoint, PR #38/#39 remain at their scheduled heads and have no submitted reviews. M0 posted #59/6277755621 restating the path-specific ACCEPT/CORRECT decisions due by 21:40. No shared code has changed and no M8 approval is inferred. #59 remains OPEN/P1; #53 acceptance and M9 pins remain gated.

At 21:36, PR #38/#39 and their review lists were still unchanged. M0 posted #59/6277918396 with a four-minute reminder to provide path-specific confirmation or a named owner blocker. Usage was 56% five-hour / 62% weekly. Owner decisions remain NOT_VERIFIED.

## M6/M7 lane end — 2026-10-19 21:40 UTC

The 21:20–21:40 ownership-only slot ended with no public M6/M7 owner decision, blocker, PR movement, or review. No ownership transfer is recorded. The proposed M6 E4/test and M7 packaging boundaries remain unconfirmed; `packaging/windows/build-contract.mjs` lacks a named owner and `.gitattributes` purpose/owner is unresolved. M8's disposition remains separately required before closing #59 or allowing M9 to pin the combined sources. Issue receipt #59/6278012285; #59 remains OPEN/P1.

## M1/M5 canonical path clarification — 2026-10-20 20:10 UTC

- The preceding P0 #52 table separates M1 canonical ownership of src/security-router.ts and test/security-router.test.ts from M5 ownership of src/risk-policy.ts, src/policy-management.ts, and their tests. M1 continues to own test/agent-hook.test.ts.
- PR #47 currently changes those three M1-owned paths also present in PR #43. The security-router implementation/test patches differ; this is an ownership and integration conflict, not a verified production exploit. Keep existing PR #47 contents for owner review; do not delete or weaken tests.
- M1 was directly queued to record a per-path disposition on #56. Until that review is visible, new M5 edits stay within its policy-owned files; no ownership transfer is inferred.
## M6 checkout addition — 2026-10-20 21:05 UTC

The earlier dated snapshots remain historical. Since then M0 added the detached worktree C:/Users/36712/Documents/Codex/2026-10-15/ac3-m6-e4-review at the existing remote PR #38 head c1fdf3cfd936805c6888c7b1c3c5603797b4cbc9. This is not a new branch; the worktree is clean and detached. M6 owns packaging/windows/auto-e4.mjs and test/auto-e4.test.mjs. M5 may preserve a candidate patch in its own worktree but must not commit those paths to PR #47.

## M0 file-level owner routing — 2026-10-20 22:17 UTC

- **M1 canonical security paths:** `src/agent-hook.ts`, `test/agent-hook.test.ts`, `src/file-state-store.ts`, and `test/file-state-store.test.ts`, plus the Gateway/held-file contract. Any cross-module diff to these paths requires explicit M1 file-level review before it is accepted for integration.
- **M3 onboarding paths:** onboarding/host-detection and connection-check code, onboarding reports, and `docs/3.0/M3/*`. The earlier table shorthand “Hook copy/tests” does not transfer canonical M1 Hook/test ownership. PR #33 currently changes two M1-owned Hook paths; the M1 disposition remains pending.
- **M4 desktop console paths:** `src/ai/console-page.ts`, `src/ai/security-center-adapter.ts`, `test/runtime-console.test.ts`, and `docs/3.0/M4/*` are within M4's existing PR #34 scope. For P0 #52, M4 is accountable for naming the actual desktop OBSERVE host/build entrypoint; the precise owner of any additional host callback file must be confirmed before that file is changed.
- **Demo boundary:** `src/ai/policy-demo.ts` uses a virtual OBSERVE executor, and `src/runtime/demo.ts` is a temporary-file Gateway demo. Neither path is accepted as evidence of a first-party OBSERVE-to-M2/M5/M1 production host integration.

## Current Hook adapter ownership clarification - 2026-10-21 09:06 UTC

M1 retains ownership of canonical Hook authorization/logging semantics and canonical shared security assertions. M8 owns its separate logging/consumer adapter and its branch-local tests. M1's exact acceptance of M8 blob 544b5eb76633469b7185c4ea77d85d7f1754393e is recorded in Issue #65 comment 6308270032; M8 must preserve the decision field and cannot use reason normalization to grant authorization. This is an approved variant, not a transfer of M1 semantics or a canonical byte-copy claim.

M9 owns the integration test boundary: compare byte-identical canonical copies only where that identity is an approved requirement, and validate the M8 adapter by its exact reviewed blob plus its owner-approved behavioral/logging contract. M7's actual Setup.exe payload currently uses the canonical M1 blob, verified by artifact 12332644890 and Issue #53 comment 6312265610.

This clarification supersedes older dated ownership rows or snapshots that characterize M8's Hook file as an identical copy of the M1 canonical wrapper. It does not authorize changes to M1-owned security behavior or tests.

## M0 worktree and shared-file readback — 2026-10-21 10:55 UTC

- The common repository worktree inventory contains separate M1-M8 worktree paths, all with merge base `62496d4020bd90ba2eede49b2e80a2bbebb036b4` against `origin/feature/agent-canary-3.0`. M4 and M7 are inside `Agent-Canary-Dev/agents`; M1, M2, M3, M5, M6, and M8 remain in their existing `Documents/Codex` paths. No worktree was moved or replaced.
- M6's existing PR #38 worktree is detached at `560f724292d285a43fcc4a0b0c8f50f9f08a6f79`; it has no working-tree edits. M0 did not create a new feature branch or attach it to a branch.
- The M5 worktree has an uncommitted patch in M6-owned `packaging/windows/auto-e4.mjs` and `test/auto-e4.test.mjs`. Preserve it in place; M5 must not commit those paths to PR #47. The patch has not been attributed to an active M6 task and is not part of M6 PR #38 head `560f724`.
- The current M4 path audit is recorded in M4-owned `docs/3.0/M4/DESKTOP_INTEGRATION_REPORT.md` by local docs commits `2b803c1` and `7ac3247`, pending the next shared push. This is M0-coordinated evidence, not M4 owner acceptance or a transfer of M1/M2/M5 interface ownership.

## M1/M6 lane and exact CI ownership update — 2026-10-21 11:07 UTC

- M1 retains ownership of `src/runtime/gateway.ts` and `test/gateway.test.ts`. PR #34 exact-head run `39589011257` failed once in unchanged `test/gateway.test.ts:22:322` before the expired-approval and zero-callback assertions; Issue #62 was updated to one current reproduction with unknown cause. This does not transfer the test or API ownership to M4.
- M6/#66 is publicly dispatched on existing PR #38 branch `feature/ac3-e4-validation-ac3` at `560f724`. M6 owns `packaging/windows/auto-e4.mjs` and `test/auto-e4.test.mjs`; preserve the existing M5 worktree patch and resolve its provenance before any reuse.
- M4 report commit `7ac3247` remains a documentation-only M0 audit recorded in an M4-owned path; it does not constitute owner acceptance or alter shared-file ownership.

## M0 exact Hook-copy and shared-test readback — 2026-10-21 11:14 UTC

M1 remains the semantic owner of the canonical native Hook, Gateway denial behavior, and shared Hook security assertions. Exact current public refs show M1/M2/M4/M5/M6/M7/M9 Hook wrapper blob d6f93249306b7966259cab463dd39475728ef338. M3's wrapper blob ae23875d91c246c0fa833137e71c949bad9bd3cc differs only by omission of a non-functional explanatory comment; M3's current test/agent-hook.test.ts contains synthetic caller/body canaries and assertions that those values do not enter JSONL. M8's wrapper blob 544b5eb76633469b7185c4ea77d85d7f1754393e is a separately M1-accepted logging/consumer adapter; preserve permissionDecision and keep reason normalization non-authorizing.

M1 owner disposition remains required before integration for M2 PR #37 candidate d054ceea39a0e4dd040131b4ca2789b85f2c9fe4 and for M4 PR #34's changed M1-owned test/agent-hook.test.ts blob e8ae8202492fc44fbb13c7ee855198ac8e62f436. The latter is tracked by #60. No cross-module ownership transfer is inferred from a passing CI run or a branch copy.
## M0 M1–M8 ownership and worktree readback — 2026-10-21 16:40 UTC

All eight module paths are separate checkouts. Each local branch has the same merge base `62496d4020bd90ba2eede49b2e80a2bbebb036b4` with its recorded `origin/feature/agent-canary-3.0` ref. This is a filesystem snapshot; it does not expose private Codex thread activity.

| Module | Existing branch | Local HEAD | Working tree | Current file ownership reminder |
|---|---|---|---|---|
| M1 | `feature/ac3-security-core` | `7279336` | clean | Gateway held-file and canonical Hook/security assertions. |
| M2 | `feature/ac3-execution-isolation` | `be66cf8` | clean; 3 commits ahead of public PR #37 head `3ba2df7` | Public single-file Gateway facade and package manifest; M5 router is trusted host input. |
| M3 | `feature/ac3-agent-onboarding` | `429cd73` | clean | Onboarding/host adapter and `test/codex-connection-check.test.ts`; current Windows Node 20 teardown fix belongs here. |
| M4 | `feature/ac3-desktop-security-center` | `803a015` | clean | Desktop security-center/UI paths; M1 retains canonical Hook test semantics. |
| M5 | `feature/ac3-policy-audit` | `bbce79a` | two modified M6-owned files preserved | Policy/router paths only; do not commit `packaging/windows/auto-e4.mjs` or `test/auto-e4.test.mjs` on M5. |
| M6 | `feature/ac3-e4-validation-ac3` | `9880360` | clean | Auto E4 verifier and evidence semantics. |
| M7 | `feature/ac3-reliability-ac3` | `cdae8ba` | clean | Installer/package policy; exact checker allows only M2 public facade. |
| M8 | `feature/ac3-open-source-product` | `2d5a0ff` | clean | Open-source/product docs and reviewed logging adapter. |

M9 remains on its existing `feature/ac3-m9-integration` branch; local candidate `24dcfd1aed2a9ba9ddd7aecd7b92e78f3947ee19` changes only its composition workflow/test and is not yet published. Do not move worktrees, create replacement branches, or commit cross-owned files. The M5 dirty E4 files remain untouched pending M6 ownership.

## M0 P0 #52 route-owner ruling — 2026-10-22 06:04 UTC

This ruling resolves the prior tentative ownership of the desktop route. It is a file assignment, not an API or security-semantics transfer.

- **M3 backend/host route:** owns `src/ai/console.ts` read-only status handler and capability binding, plus the existing M3 protected-host adapter/probe and its tests.
- **M4 Security Center consumer:** owns `src/ai/console-page.ts`, `src/ai/security-center-adapter.ts`, and `test/runtime-console.test.ts`; it consumes the M3 route and displays missing or invalid protection data as `UNKNOWN`.
- **Owner-controlled interfaces:** M1 retains Gateway/Hook semantics and held-file capability; M2 retains the public Gateway adapter/fixed file map and package export; M5 retains strict OBSERVE/router semantics; M6 owns E4 verification/status schema; M7 owns installer and shipped-payload evidence; M9 owns exact-source integration. M3/M4 use adapters and do not edit these owner APIs or files.
- For #52, the route is read-only. It may expose only status fields already accepted by `docs/3.0/API_CONTRACTS.md`; no raw arguments, file contents, secrets, tokens, or absolute user paths. Do not substitute a demo or path-only fallback. Keep #52 OPEN/P0/NOT_VERIFIED until exact M1/M2/M3/M5 composition and M4 consumer checks pass.

## M0 owner-routing addendum — 2026-10-22 18:05 UTC

- M9 owns diagnostics and regression assertions in `test/ai.test.ts` for Issue #54. On current M9 head `c8bf076a5520e2831fb561bf5680351f745de85a`, the 503-then-success loopback fixture passes and asserts exactly two requests; the historical Windows Node 22 failure at old head `1f577c56ea89cc362db66ebf3ca18ad05962c898` remains unexplained from available logs.
- No module owner is currently assigned for `src/ai/provider.ts` or `src/ai/transport.ts`. This is an ownership gap, not an implicit M9/M1 transfer. Do not change these source files until an explicit component owner is named. M0 records and routes the gap only.

## M0 exact module-head refresh — 2026-10-22 21:29 UTC

| Module | Existing Draft PR branch | Exact public head at this readback | Ownership/status reminder |
|---|---|---|---|
| M1 | #43 `feature/ac3-security-core` | `c67b15f76973a2333ce523dd58d5b7439ab40702` | Held identity/Gateway and canonical Hook semantics; CI previously green. |
| M2 | #37 `feature/ac3-execution-isolation` | `92a9562a44ad395ec33d5afd74c394d7f0863c85` | Candidate Hook now says native Shell UNPROTECTED; exact CI green; no host proof. |
| M3 | #33 `feature/ac3-agent-onboarding` | `545958391c44e4a8207e77881e76b615476adf6c` | Docs boundary synced; exact CI queued; M3 owns connection-check route and tests. |
| M4 | #34 `feature/ac3-desktop-security-center` | `6d5b05b4ca634dd5727b62f621f783f8e56586b5` | UI consumes status; first-party protected-read result remains NOT_VERIFIED. |
| M5 | #47 `feature/ac3-policy-audit` | `c9003234913a0ccccca56fe2a36fb1ce3dacb2de` | OBSERVE hard-denial/policy owner; preserve existing hard-deny assertions. |
| M6 | #38 `feature/ac3-e4-validation-ac3` | `5f1649f600a7038d4688cdf703d1e502f3af3a91` | Artifact report published; independent product E4 remains NOT_VERIFIED. |
| M7 | #39 `feature/ac3-reliability-ac3` | `868842b1b7d76cf94a8d84a5f76c6acd4ca67f50` | Package static hash proof available; clean-VM lifecycle remains blocked. |
| M8 | #40 `feature/ac3-open-source-product` | `5bf5d4f0a1fee8b4d7ef72ec474e9ca7a7ba9d3d` | Latest M7 artifact indexed; exact CI and wrapper green. |
| M9 | #36 `feature/ac3-m9-integration` | `8ebb206e124e76501441690e3da9249472244503` | Prior exact composition green; waiting to pin current M2/M3/M6/M8 heads. |

All module changes remain on existing Draft PR branches. PR #24 stays untouched at its fixed head/base; this refresh records GitHub heads only and does not claim merge, product-host, VM, or release acceptance.
## M0 current branch and ownership snapshot — 2026-10-22 21:53 UTC

| Module | Existing PR branch | Local worktree head | Scope / current state |
|---|---|---:|---|
| M0 | `feature/ac3-m0-coordination` / #30 | `fc42a78` | Coordination docs, issue tracking, ownership and API contracts. |
| M1 | `feature/ac3-security-core` / #43 | `6886d6e` | Gateway, Guard, canonical Hook and state-store contracts; #51 owner. Exact CI 9/9 and concurrency workflow 2/2 green. |
| M2 | `feature/ac3-execution-isolation` / #37 | `92a9562` | Execution isolation and host-hook adapter; native host remains unprotected/unverified. |
| M3 | `feature/ac3-agent-onboarding` / #33 | `34b526d` | Onboarding and Hook copy/tests; protected-read route is explicitly blocked pending supported owner APIs. Exact CI 9/9 green. |
| M4 | `feature/ac3-desktop-security-center` / #34 | `264bc28` (local) | Desktop Security Center UI/tests; owner merged latest M1 base, 11/11 targeted tests/build/diff-check green; hosted CI pending publication. |
| M5 | `feature/ac3-policy-audit` / #47 | `c900323` | Policy/router variants and alias-denial regressions; canonical shared files require M1 review. |
| M6 | `feature/ac3-e4-validation-ac3` / #38 | `5f1649f` | E4 verifier/schema/bundle; independent product E4 remains NOT_VERIFIED. |
| M7 | `feature/ac3-reliability-ac3` / #39 | `868842b` | Reliability, Windows installer/payload and lifecycle evidence; VM/install execution is gated. |
| M8 | `feature/ac3-open-source-product` / #40 | `5bf5d4f` | Open-source/docs and shipped Hook/logging copy. |
| M9 | `feature/ac3-m9-integration` / #36 | `8ebb206` | Exact-ref composition only; working tree has local integration-owned candidate edits, not yet committed. |

Each M1–M8 directory is a distinct worktree with its existing PR branch attached; local HEADs match their remote owner branch commits. This snapshot records ownership; it does not claim native host, installer lifecycle, product-host protected-read, or independent E4 acceptance.

## M0 ownership refresh — 2026-10-22 21:58 UTC

| Module | Existing PR branch | Public/local head | Scope / current state |
|---|---|---:|---|
| M0 | `feature/ac3-m0-coordination` / #30 | `fa1f8ae` | Coordination docs/contracts; exact product CI 9/9 and coordination check pass. |
| M1 | `feature/ac3-security-core` / #43 | `6886d6e` | Gateway, Guard, Hook, state store; exact CI 9/9 and concurrency 2/2 pass. #51 remains open because the original trigger is unknown. |
| M2 | `feature/ac3-execution-isolation` / #37 | `92a9562` | Execution isolation and host-hook adapter; native host remains UNPROTECTED/NOT_VERIFIED. |
| M3 | `feature/ac3-agent-onboarding` / #33 | `34b526d` | Onboarding and Hook docs/tests; protected-read POST remains blocked/not active; exact CI 9/9 pass. |
| M4 | `feature/ac3-desktop-security-center` / #34 | `264bc28` | Desktop UI/tests; exact CI 9/9 pass on updated M1 base; targeted tests 11/11. |
| M5 | `feature/ac3-policy-audit` / #47 | `c900323` | Policy/router variants and alias-denial regressions; canonical shared files require M1 review. |
| M6 | `feature/ac3-e4-validation-ac3` / #38 | `5f1649f` | E4 verifier/schema/bundle; independent product E4 remains NOT_VERIFIED. |
| M7 | `feature/ac3-reliability-ac3` / #39 | `868842b` | Reliability, Windows installer/payload and lifecycle evidence; VM/install execution remains gated. |
| M8 | `feature/ac3-open-source-product` / #40 | `5bf5d4f` | Open-source/docs and shipped Hook/logging copy. |
| M9 | `feature/ac3-m9-integration` / #36 | `8ebb206` | Scratch exact composition passed 11/11 on current M1/M3/M4 pins; M9 local commit `8506fef` updates only the workflow pins, composition assertions, and exact-source report; it is not yet published. |

All module branches remain separate Draft PRs; the current exact composition is test evidence, not a merge or product-host/E4 acceptance. M1–M8 source ownership is unchanged.
## M0 ownership refresh — 2026-10-22 22:02 UTC

| Module | Existing PR branch | Current public/local head | Scope / current state |
|---|---|---:|---|
| M0 | `feature/ac3-m0-coordination` / #30 | `b7a0fe2` | Coordination docs/contracts; coordination check passed and exact product CI 9/9 is green. |
| M1 | `feature/ac3-security-core` / #43 | `6886d6e` | Gateway/Guard/Hook/store; exact CI 9/9 and concurrency 2/2 pass. #51 stays open due original trigger UNKNOWN. |
| M2 | `feature/ac3-execution-isolation` / #37 | `92a9562` | Host-hook adapter; native host remains UNPROTECTED/NOT_VERIFIED. |
| M3 | `feature/ac3-agent-onboarding` / #33 | `34b526d` | Onboarding/Hook docs; protected-read POST blocked; exact CI 9/9 pass. |
| M4 | `feature/ac3-desktop-security-center` / #34 | `264bc28` | Desktop UI/tests; exact CI 9/9 pass on updated M1 base. |
| M5 | `feature/ac3-policy-audit` / #47 | `c900323` | Policy/router variants and alias-denial tests; shared files require M1 review. |
| M6 | `feature/ac3-e4-validation-ac3` / #38 | `5f1649f` | E4 verifier/schema/bundle; independent product E4 NOT_VERIFIED. |
| M7 | `feature/ac3-reliability-ac3` / #39 | `4f986cc` local | Invalid installer compile outputs now fail closed; local tests/build green; awaiting push and exact CI. Clean-VM lifecycle remains gated. |
| M8 | `feature/ac3-open-source-product` / #40 | `5bf5d4f` | Open-source/docs and shipped Hook/logging copy. |
| M9 | `feature/ac3-m9-integration` / #36 | `8506fef` | Exact current source pins pushed; CI 9/9, wrapper 2/2, and exact-source composition 2/2 green; composition pins M7 at 868842b pending the new M7 candidate. |

No module source ownership changed. M4/M7 are isolated worktrees in the separate Windows-E4 Git common directory; other listed coordinator branches remain on their own worktrees.
## M0 ownership refresh — 2026-10-22 22:08 UTC

| Module | Existing PR branch | Current public/local head | Scope / exact state |
|---|---|---:|---|
| M0 | `feature/ac3-m0-coordination` / #30 | refreshed in this batch | Coordination docs/contracts; prior exact CI and coordination check are green. |
| M1 | `feature/ac3-security-core` / #43 | `6886d6e` | Alias scenario denied on Windows; focused tests 21/21; no fail-open found. #52 remains P0/NOT_VERIFIED for host and TOCTOU boundaries. |
| M2 | `feature/ac3-execution-isolation` / #37 | `92a9562` | Host-hook adapter; exact CI 9/9; native host remains UNPROTECTED/NOT_VERIFIED. |
| M3 | `feature/ac3-agent-onboarding` / #33 | `34b526d` | Onboarding/Hook docs; exact CI 9/9; protected-read POST blocked/not active. |
| M4 | `feature/ac3-desktop-security-center` / #34 | `264bc28` | Desktop UI/tests; exact updated-base CI 9/9. |
| M5 | `feature/ac3-policy-audit` / #47 | `c900323` | Policy/router variants and alias-denial regressions; shared files require M1 review. |
| M6 | `feature/ac3-e4-validation-ac3` / #38 | `5f1649f` | E4 verifier/schema/bundle; independent product E4 NOT_VERIFIED. |
| M7 | `feature/ac3-reliability-ac3` / #39 | `4f986cc` | Non-empty regular-file installer compile evidence fix pushed; hosted exact CI pending. |
| M8 | `feature/ac3-open-source-product` / #40 | `5bf5d4f` | Open-source/docs and shipped Hook/logging copy. |
| M9 | `feature/ac3-m9-integration` / #36 | `8506fef` | Exact CI 9/9, wrapper 2/2, composition 2/2; next required repin is M7 `4f986cc` after exact M7 CI.

M4 and M7 remain isolated worktrees in the separate Windows-E4 Git common directory. No file ownership changed.
## M0 ownership refresh — 2026-10-22 22:13 UTC

| Module | Existing PR branch | Current public/local head | Scope / exact state |
|---|---|---:|---|
| M0 | `feature/ac3-m0-coordination` / #30 | refreshed in this batch | Coordination docs/contracts; preceding exact CI 9/9 and coordination check green. |
| M1 | `feature/ac3-security-core` / #43 | `6886d6e` | Windows symlink scenario denied; focused tests 21/21; #52 remains P0/NOT_VERIFIED for host/TOCTOU. |
| M2 | `feature/ac3-execution-isolation` / #37 | `92a9562` | Host-hook adapter; exact CI 9/9; native host UNPROTECTED/NOT_VERIFIED. |
| M3 | `feature/ac3-agent-onboarding` / #33 | `34b526d` | Onboarding/Hook docs; exact CI 9/9; protected-read POST blocked. |
| M4 | `feature/ac3-desktop-security-center` / #34 | `264bc28` | Desktop UI/tests; updated-base exact CI 9/9. |
| M5 | `feature/ac3-policy-audit` / #47 | `c900323` | Policy/router alias denials; shared canonical files require M1 review. |
| M6 | `feature/ac3-e4-validation-ac3` / #38 | `5f1649f` | E4 verifier/schema/bundle; Issue #57 verifier audit in progress; independent product E4 NOT_VERIFIED. |
| M7 | `feature/ac3-reliability-ac3` / #39 | `4f986cc` | Non-regular NSIS output fix; exact CI 9/9 + Windows wrapper 3/3 green. Clean-VM lifecycle remains blocked. |
| M8 | `feature/ac3-open-source-product` / #40 | `5bf5d4f` | Open-source/docs and shipped Hook/logging copy. |
| M9 | `feature/ac3-m9-integration` / #36 | `8506fef` public; `f63adc7` local | M7=4f exact-source scratch 11/11; M7 package contract 2/2; local pin/report candidate not pushed pending cadence.

No module source ownership changed. M4/M7 remain isolated in the Windows-E4 Git common directory; M9 and M0 use separate worktrees.
## Current public module refs — 2026-10-22 22:30 UTC

| Module | Owner scope | Open PR / branch | Exact public head | Integration state |
|---|---|---|---|---|
| M0 | Coordination, contracts, ownership, CI/issue evidence | #30 `feature/ac3-m0-coordination` | `7c481fb216c5e26ad638c23d621f89755122eea2` | Coordination audit green; product Windows Node 20 fails only on stale M1 Issue #32 fixture. |
| M1 | Security core, Hook/Gateway, protected reads | #43 `feature/ac3-security-core` | `6886d6eef3beb972bc8f4c797584b0f522483870` | Corrected interruption fixture, exact CI 9/9; #32/#52 acceptance boundaries remain open. |
| M2 | Execution isolation and host adapter | #37 `feature/ac3-execution-isolation` | `92a9562a44ad395ec33d5afd74c394d7f0863c85` | Exact package composition validated; native Codex Shell remains UNPROTECTED/NOT_VERIFIED. |
| M3 | Agent onboarding and Hook setup | #33 `feature/ac3-agent-onboarding` | `34b526d4d63f28c09400e0130b09ead13d394aca` | Exact CI 9/9; protected-read POST remains unsupported/blocked. |
| M4 | Desktop security-center UI | #34 `feature/ac3-desktop-security-center` | `264bc288dc92a75e424e366a070420f8d7e2e131` | Based on M1 `6886d6e`; exact CI 9/9. |
| M5 | Policy and audit | #47 `feature/ac3-policy-audit` | `c9003234913a0ccccca56fe2a36fb1ce3dacb2de` | Existing public candidate; shared canonical-path decisions remain M1-owned. |
| M6 | E4 bundle verifier and lifecycle | #38 `feature/ac3-e4-validation-ac3` | `15e1663eac9c3932165fca9b39587115345f289c` | Exact CI 9/9 + Windows wrapper 2/2; independent product-level E4 still NOT_VERIFIED. |
| M7 | Reliability and Windows packaging | #39 `feature/ac3-reliability-ac3` | `4f986cc83bc62a1d2b23175ee5a0a77b82837310` | Exact CI 9/9 + Windows wrapper 3/3; clean-VM lifecycle remains OPEN/P1. |
| M8 | Open-source UX and documentation | #40 `feature/ac3-open-source-product` | `5bf5d4f0a1fee8b4d7ef72ec474e9ca7a7ba9d3d` | Exact source is covered by M9 composition; no ownership changes. |
| M9 | Cross-module source pins, contracts and composition | #36 `feature/ac3-m9-integration` | `129075c8c01588c872c0f8c96c343bff7ee35358` | Exact CI 9/9 + wrapper 2/2 + composition Ubuntu/Windows 2/2; pins current M1–M8 heads including M6 `15e1663`. |

All listed module PRs are OPEN/Draft and target PR #24 head `62496d4020bd90ba2eede49b2e80a2bbebb036b4`, except M4 #34 which is intentionally based on the current M1 #43 head `6886d6eef3beb972bc8f4c797584b0f522483870`. PR #24 itself remains OPEN/Draft and unchanged. M4/M7 retain their separate shared Git common directory; M0/M9 and the other owner worktrees remain isolated by existing worktree/branch ownership.

## Exact refs and owner activity delta — 2026-10-22 22:41 UTC

| Module | Public PR head | Current local owner ref | Disposition |
|---|---|---|---|
| M0 / #30 | 713ba6f7a91de389bd3ab5fe651fcb0ae4521b83 | same | Coordination only; product CI and coordination audit are pending on this head. |
| M2 / #37 | 67428139e53c3f63a1101b4f94e84b291cbb1196 | same | Owner docs clarify platform API vs active native-host evidence; exact CI is pending. |
| M3 / #33 | 34b526d4d63f28c09400e0130b09ead13d394aca | same | Audit/targeted tests/build pass; no new change. Issue #55 is closed. |
| M5 / #47 | c9003234913a0ccccca56fe2a36fb1ce3dacb2de | 12b2499a1f7b8525f3bf2d7659249c1bd8e881ed | Local alias-before-.. fix; M1 review and hosted exact CI pending. Issue #52 stays OPEN/P0. |
| M8 / #40 | 5bf5d4f0a1fee8b4d7ef72ec474e9ca7a7ba9d3d | 35aa22f3087ed1859da19acbf12cc4c767dd4f3d | Local evidence-index correction; hosted exact CI pending. Issue #53 closed only for its narrow acceptance scope. |

The remaining M1, M4, M6, M7, and M9 public heads remain those in the 22:30 UTC snapshot above. M5/M8 local commits are owner work on their existing branches and have not been published as of this delta. No M0 action modifies module-owned product files.

## Published candidate delta — 2026-10-22 22:44 UTC

| Module | Public PR head | Exact checks |
|---|---|---|
| M0 / #30 | 0f197f51df4de071c62d94a48a0e62619caddd62 | product CI queued; coordination in progress |
| M2 / #37 | 67428139e53c3f63a1101b4f94e84b291cbb1196 | exact CI 9/9 success |
| M5 / #47 | 12b2499a1f7b8525f3bf2d7659249c1bd8e881ed | exact CI in progress; P0 issue #52 remains open |
| M8 / #40 | 35aa22f3087ed1859da19acbf12cc4c767dd4f3d | exact CI and Windows wrapper in progress |

M1, M3, M4, M6, M7, and M9 public heads are unchanged from the 22:30 snapshot. M1 is reviewing the M5-owned candidate without transferring M5 file ownership. M9 scratch composition is being prepared against candidate refs; it must not promote them to integration pins before their exact hosted checks finish.

## Exact validation delta — 2026-10-22 22:47 UTC

| Module / PR | Public head | Exact hosted result | Local owner result |
|---|---|---|---|
| M0 / #30 | 0f197f51df4de071c62d94a48a0e62619caddd62 | CI 39867084564 9/9; coordination 39867084565 1/1 | Coordination docs only |
| M2 / #37 | 67428139e53c3f63a1101b4f94e84b291cbb1196 | CI 39866513817 9/9 | Focused Hook protocol/build/diff-check pass |
| M5 / #47 | 12b2499a1f7b8525f3bf2d7659249c1bd8e881ed | CI 39867073839 9/9 | Risk-policy 42/42; router 23/23; build/diff-check pass |
| M8 / #40 | 35aa22f3087ed1859da19acbf12cc4c767dd4f3d | CI 39867080161 9/9; wrapper 39867080178 2/2 | Docs 14/14 checks; Auto E4 5/5; extracted harness pass |
| M1 / #43 | 6886d6eef3beb972bc8f4c797584b0f522483870 | CI 39860277883 9/9 | Gateway suite 36/36; alias denied; no source change |

All remain separate OPEN/Draft PRs except that this table does not change PR state. Issue #52 remains OPEN/P0. M9 exact-candidate composition is still pending.

## M9 exact-source scratch result — 2026-10-22 22:49 UTC

M9's uncommitted scratch composition passed 11/11 using the public exact candidates M1 6886d6e, M2 6742813, M3 34b526d, M4 264bc28, M5 12b2499, M6 15e1663, M7 4f986cc, and M8 35aa22f against M9 baseline 129075c. This is not yet a public M9 pin or hosted M9 CI result. Only after its owner-scoped pin/report change is locally validated should the existing M9 branch advance; the synthetic composition does not establish product-host enforcement.

## M9 owner candidate delta — 2026-10-22 22:52 UTC

M9 local commit 219d74e17dab061e2e97fa31c7c27c00fa633c34 pins the exact public M2/M5/M8 candidates and the previously green M1/M3/M4/M6/M7 refs. It changes only the M9 workflow, composition test SHA map, and exact-source report. Local composition is 11/11; focused security suite is 3 pass / 1 existing skip. It remains one commit ahead of public PR #36, and hosted exact M9 CI is pending publication.

## M6/M7 integration audit — 2026-10-22 22:55 UTC

M6 exact head `15e1663eac9c3932165fca9b39587115345f289c` remains unchanged; its verifier's same-Buffer hash/parse boundary passed 18/18 focused tests, but product E4 remains NOT_VERIFIED and Issue #57 stays OPEN/P1. M7 canonical Hook and M8 adapter blobs are distinct; the M6 verifier does not conflate them. M7's lifecycle audit found hosted Windows install/uninstall smoke can supplement evidence but cannot replace a Windows 11 clean-VM/cancel-rollback matrix. No installer or VM ran; Issue #41 stays OPEN/P1/HOLD. No module ownership or module source changed.

## Hosted integration and CI triage — 2026-10-22 23:00 UTC

M9 PR #36 exact head `219d74e17dab061e2e97fa31c7c27c00fa633c34` passed CI run `39868531791` (9/9), wrapper run `39868531597` (2/2), and exact-source composition run `39868531673` (Ubuntu/Windows 2/2). M0 PR #30 exact head `0953bcfa2dc1968b09979dc88769ad46b85511d9` passed coordination run `39868523446` (1/1); product CI `39868523458` has 7 success, 1 Windows Node 20 fixture failure, and 1 skipped package-smoke. M1 triage reproduced the inherited 1-second marker timing race in old blob `1ecb3ee`; current owner PR #43 uses async marker polling at blob `82ca466`. No module code changed. Issues #32 and #52 remain open in their respective owner scopes.

M0 documentation-only successor head `fa8b83cd69eaf66c294d9f011c1a618ab7bd3312` passed exact product CI run `39869440716` 9/9 with the same inherited fixture blob. Preserve the earlier failure record as an intermittent timing regression; #32 remains open pending propagation of the owner-authored robust test to affected branch snapshots.
