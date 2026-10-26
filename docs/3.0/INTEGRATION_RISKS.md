## Current coordination blockers — 2026-10-26 19:35 UTC

| Priority | Verified cross-module risk | Owner and tracked issue | Required disposition |
| --- | --- | --- | --- |
| P1 | M7's current windows-community.yml in feature/ac3-reliability-ac3 includes pull_request as a trigger for windows-community-installer-lifecycle (job condition at line 429) and defines no concurrency group. If the conflicting PR is repaired, an installer lifecycle can start on a PR without the explicit reserved exclusive slot required by the current API contract. | M7; existing PR #128, Issues #29 and #41. | On the existing M7 branch, require explicit workflow_dispatch plus run_installer_lifecycle=true, serialize the lifecycle on agent-canary-exclusive-e4 with cancel-in-progress=false, and reserve Issue #29 before execution. M0 must not edit M7 workflow. Current PR #128 is CONFLICTING with zero checks; Issue #29's latest readback reports no clean VM and no reserved/running slot, and confirms no lifecycle ran. |
| P1 | Direct M3/M4/M5/M6/M8 PRs fail current exact-source composition against the shared base; M5/M8 also fail ownership-contract evidence. M7 PR #128 is conflicting and has no checks. | M3–M8 owners; existing PRs #120–#123, #128, #129 and Issues #124–#126. | Owners must disposition canonical source anchors and reconcile only on their existing branches; require exact-head direct checks. Keep PRs Draft and do not change M9 pins before exact owner review. |
| P1 | M9 candidate PR #127 is green (12/12) only for its manifest-selected immutable refs. Current local M7/M8 heads differ from the manifest pins, and the current M8 head lacks the exact-head M6 disposition required by the M9 validator. | M7/M8 owners; M6 scoped reviewer; existing Issues #80/#126 and PR #127. | Obtain M7/M8 exact source disposition and M6's scoped M8-head disposition, then update only the M9 manifest to those reviewed SHAs and rerun Ubuntu/Windows composition. |
| P1 | M5 local pack:check is safely blocked before npm because its checker does not prove the child OS-temporary root and explicit npm --prefix installDir invocation; PR #122 additionally fails ownership evidence. | M5 owner; existing PR #122 and Issue #124. | Correct the checker on the existing M5 branch without relaxing temp isolation, then rerun package and direct PR checks. |
| P1 | The default branch still reports a moderate Hono advisory. Existing Dependabot PR #67 updates Hono 4.13.7 to 4.13.13; exact head cda74e9860f1d96d7404871378c0c737535fa77e has 9/9 checks passing but remains OPEN against main. | M7/package owner; existing Issue #70 and PR #67. | Keep the existing remediation PR and issue open until the alert is confirmed resolved or evidence-backed non-applicability is accepted. M0 must not merge main. No reachable serveStatic callsite or actual sensitive-file exposure is currently confirmed. |
| P0 | Protected OBSERVE alias/junction regressions have synthetic evidence, but a first-party host consuming the same M1-bound held identity and product-path TOCTOU denial remain unverified. E4's two synthetic Gateway failures are separate and do not prove an actual protected write. | M1/M2/M4/M5 owners; existing Issues #52 and #118. | Preserve all denial/effect assertions. Require the supported host callsite or an exact host/API blocker, plus alias/path-replacement negative controls and zero-side-effect evidence before closing P0. |

The latest local full matrix is run 20261026T191058924Z: 38 PASS, 9 dependency-install SKIPPED, 9 FAIL, 1 BLOCKED. PR #24 is unchanged; PR #131 at b7a7c4176b20ac5c4ea7036d5792b9f9ba21bdf2 passed 12/12; a local M0 documentation batch is queued for the next 20-minute push window. No module code or exclusive runtime resource was touched.
## Current integration risks — 2026-10-25 06:31 UTC

| Gate | Verified change | Remaining acceptance |
| --- | --- | --- |
| M9 #112 / #117 | M9 exact-source composition on M0 PR #119 head `ac48cdb` passed on Ubuntu and Windows in run `40169026928`; general CI passed 9/9 in `40169026941`. | Integration branch `7b6edae` is an ancestor of feature `b0d8d77` and is five commits behind. Resynchronize the existing M9 branch only after the feature integration candidate is settled; do not create a branch or infer product-host acceptance. |
| M8 #40 / #99 | M8 PR #40 is merged into the feature baseline; current exact-source M9 composition passes. | Sponsor smoke is source/CI evidence only; retain independent service, secret and payment-scope boundaries. |
| M7 #41 | M7 PR #113 is merged; current package/source composition passes. | Windows 11 standard-user, upgrade, cancellation/rollback and EFS lifecycle matrix remains unverified; reserve the exclusive resource before execution. |
| M6 #111 / #57 | M6 PR #111 is merged; evidence intake and bundle verifier source checks pass. | Independent operator lifecycle/tool effects and reviewer receipt are absent; #57 remains open. |
| M1/M2 #52 / #45 / #118 | Current source composition passes, while the protected-read UI remains explicitly UNKNOWN and native Codex Shell is unprotected. | Obtain owner evidence/blocker on #52/#45; keep #118 queued behind M1 P0 work and preserve all effect assertions. |
| M1 #51 / M9 #54 / M7 #70 | Later current runs pass; historical triggers remain UNKNOWN, and the main-target Hono remediation is still separate. | Retain #51/#54 open absent original-trace disposition; keep #70 open until default-branch remediation is accepted. |

Integration order must preserve both ancestry and source provenance: complete owner-reviewed module candidates before final M9 manifest integration, then synchronize the M9 branch with the resulting feature tip and revalidate its explicit pins. Never silently relabel an old module pin as a newer candidate or bypass a failed baseline/owner gate to force a merge. main, PR #24 and Release remain outside this integration authorization.

## Historical integration risks — 2026-10-24 09:48 UTC

| Risk / gate | Priority | Current verified state | Required acceptance |
| --- | --- | --- | --- |
| M9 current-ref integration trigger (#76) | P1 | On current M0 PR #109 head `3d4dd10`, CI passed 9/9 and AC3 coordination passed, while M9 run `40083165982` was skipped. Workflow still checks out PR #36 only. | M9 owner updates the existing workflow so the intended current feature refs run on Ubuntu and Windows; skipped jobs cannot stand in for composition. |
| M8 current-base branch (#40/#99) | P1 | M8 head `60cfe8d` is unchanged; 12 merge-tree conflicts remain and M8 owner disposition is absent. | M8 resolves by ownership, preserves tests/docs/current behavior, posts #99 disposition, and passes current-base checks plus exact-source composition. |
| M7 lifecycle reservation (#41/#29) | P1 | Local M7 workflow diff still auto-enables installer lifecycle on pull_request with no concurrency group; no slot reservation exists and M0 has not run it. | Keep runs behind an explicit reserved/manual gate or implement an owner-reviewed serialized reservation; also fix the 11/7 checksum path mismatch before Setup.exe acceptance. |

## Current integration risks — 2026-10-24 09:31 UTC

| Risk / gate | Priority | Current verified state | Required acceptance |
| --- | --- | --- | --- |
| M9 current-ref integration trigger (#76) | P1 | On M0 PR #109 head `d11c9e3`, standard CI and coordination passed but M9 run `40081829472` was skipped. The current job condition allows only manual dispatch or PR #36 and checks out `refs/pull/36/head`; evidence is in #76 comment `6382577864`. | M9 owner updates the existing workflow trigger/ref contract; a current feature-target event must execute the exact intended composition on Ubuntu and Windows. |
| M8 current-base branch (#40) | P1 | Head remains `60cfe8d`; merge-tree against feature `e4732d9` reports 12 conflicts. M0's latest owner request is #40 comment `6382530045`; M8 has not supplied the #99 disposition. | M8 resolves conflicts by file ownership, preserves tests and current feature behavior, records its #99 disposition, then passes current-base checks and exact-source composition. |
| M7 installer scheduling/checksum (#41/#29) | P1 | Existing uncommitted M7 workflow diff runs installer lifecycle on every PR; the workflow has no concurrency group. The exclusive slot is FREE. Hosted lifecycle previously stopped before Setup.exe because the producer lists 11 checksum paths and the consumer accepts 7. | M7 aligns all checksum paths and retains an explicit/manual reservation gate or serialized slot; M0 must not execute a run while reservation/trigger acceptance is unresolved. |
| Product acceptance | P0/P1 | #52 and #93 remain P0; #41 and #57 remain P1. Source/fixture M9 success does not prove installed-package, clean-VM, or independent product E4 acceptance. | Close each gate only with its own scoped package/runtime/operator evidence; do not promote skipped or source-only checks. |

## Current integration risks — 2026-10-24 09:18 UTC

| Risk / gate | Priority | Current verified state | Required acceptance |
| --- | --- | --- | --- |
| M9 current-ref integration trigger | P1 | Exact M9 composition run `40066875122` passed at pinned refs. Current M0 PR #109 run `40080532927` and PR #24 run `40068981943` are skipped; the workflow only runs for PR #36 or manual dispatch, whose source inputs remain PR #36 plus static pins. | Make the existing workflow execute against the intended current integration ref on both OSes; assert checked-out SHAs and ensure a skipped result cannot be represented as an integration pass. |
| M8 current-base integration (#40/#76) | P1 | Existing PR #40 head `60cfe8d` is based on `416f1ba`; current feature is `e4732d9`. Read-only merge-tree reports 12 conflicts despite GitHub's stale-base `CLEAN` status. M8 disposition on #99 is also pending. | M8 reconciles its existing branch, retains tests and docs, records owner disposition, then passes current-base CI and exact-source M9. |
| Configured OBSERVE target route (#52) | P0 | M3 #107 now contains a configured-target CLI route that binds an M1-held identity and calls M2/M5. Exact source tests cover CLI startup, positive read, sensitive/alias/junction denies, and replacement; M9 `40066875122` passes Ubuntu/Windows. This is source/fixture evidence, not independent installed-package or native-host acceptance. M0 correction is recorded in #52 comment `6382450244`. | M3/M4 owners confirm the intended consumer scope and bind the route to a shipped package/runtime; retain product-wide and native-host `NOT_VERIFIED` boundaries until exact artifact/runtime evidence exists. |
| Shared Hook test disposition (#72) | P1 | M3 current test blob `10cdb80…` differs from reviewed `0e8a225…` by an additive 23-line redaction test and one strengthened assertion; M1 Hook implementation and wrapper blobs match. M0's exact diff summary is #72 comment `6382420684`. | M1 records ACCEPT/REJECT for the exact blob and M9 reflects that owner disposition. |
| Packaged Hook reason redaction (#93) | P0 | M7 #106 fixed BUILD_REPORT status producer/consumer mismatch; installed Hook stdout/log behavior and exact shipped payload redaction remain NOT_VERIFIED. | M1/M7 verify exact packaged/installed bytes and caller-controlled reason sentinels without changing allow/deny/ask or weakening fail-closed behavior. |
| Installer lifecycle and reservation (#41/#29) | P1 | Hosted lifecycle failed before Setup.exe: producer checksum list has 11 paths; consumer allowlist has 7. M7's preserved, uncommitted workflow diff enables lifecycle for every PR without a concurrency group; M0 did not modify it. | Align the complete producer/consumer contract with regressions, restore reservation gating or serialize the exclusive slot, then run the exact artifact lifecycle only after reservation. |
| Independent product E4 (#57) | P1 | No independent product E4 artifact and operator receipt are identified. M6 fixtures/build checks are not product E4. | Independent operator verifies an exact hashed product artifact from a clean checkout and records sanitized results plus mismatch controls. |
| PR #24 / release boundary | M0 | PR #24 remains OPEN/Draft at feature head `e4732d9` and its existing competition base; `main` is untouched. | Preserve the branch and Draft state; no Release is in scope. |

## Current integration risks — 2026-10-24 08:55 UTC

| Risk / gate | Priority | Current verified state | Required acceptance |
| --- | --- | --- | --- |
| M9 composition trigger after PR #36 merge | P1 | Current feature head `e4732d9` received M9 run `40068981943` through PR #24; it was skipped because the workflow condition only admits PR #36 or manual dispatch. Manual dispatch still checks out `refs/pull/36/head` and static module SHAs. Prior M9 exact-source run `40066875122` passed its pinned candidates on Ubuntu/Windows, but does not prove the current feature event. Issue #76 comment `6382290540` records reproduction and owner criteria. | M9 updates its existing integration workflow/ref manifest so a current feature composition run cannot silently skip, prints and asserts the selected M9/M1–M8 SHAs, and passes on Ubuntu and Windows. Keep installer/VM/real-model work outside this source-only gate and under the #29 exclusive reservation.
| M8 current-base integration (#40/#76) | P1 | PR #40 is OPEN/Draft at `60cfe8d`; base field remains `416f1ba`, current feature is `e4732d9`, and read-only merge-tree finds 12 conflicts. GitHub's `clean` mergeability flag is associated with the stale base SHA and is not sufficient evidence for current-base mergeability. M8 owner disposition is also missing on #99. | M8 resolves conflicts on existing PR #40 while preserving feature/M9 and M8-owned behavior; obtain current-base hosted CI and exact-source M9 composition; record the M9/M7 owner disposition. Do not blanket-resolve conflicts or delete tests.
| OBSERVE protected-read product host (#52) | P0 | Synthetic alias/junction and held-identity regressions pass, but no supported first-party host callsite consuming the Gateway-bound protected identity has been demonstrated. No production secret exposure is claimed. | M4 provides the exact shipping callsite plus safe-read and alias/path-replacement evidence, or records the exact host/API blocker. Keep product protection and TOCTOU NOT_VERIFIED until proven.
| Packaged Hook reason redaction (#93) | P0 | PR #106 fixes the BUILD_REPORT status producer/consumer mismatch. Installed Hook stdout/log behavior and exact shipped payload redaction remain NOT_VERIFIED. | M7/M1 verify the exact packaged/installed Hook blob and sanitized caller-controlled reason sentinels without changing allow/deny/ask or fail-closed behavior; keep #93 open until lifecycle evidence exists.
| Installer lifecycle and exclusive-resource guard (#41/#29) | P1 | Latest hosted attempt failed before Setup.exe on a checksum-path mismatch. M7 has an uncommitted workflow diff that would schedule lifecycle on every PR without a concurrency group if published; M0 left it untouched and asked M7 to keep reservation gating. | Correct producer/consumer checksum contract on the owner branch, preserve reservation gating/serialization, then run the real installer lifecycle on the reserved clean VM and record exact artifact hashes. A skipped or pre-Setup failure is not lifecycle acceptance.
| Independent product E4 (#57) | P1 | No independent product E4 report/artifact is supplied; fixture/build evidence is not E4. | Another operator runs the verifier against an exact, hashed product artifact from a clean checkout and records sanitized PASS/FAIL plus mismatch controls. Keep NOT_VERIFIED until then.
| M1 exact review of M3 Hook test (#72) | P1 | Current M3 test blob differs from the M1-reviewed blob; M1 has not ACCEPTed or REJECTed the exact current blob. | M1 records an exact-blob disposition; preserve the interruption, redaction, and no-output assertions. M9 must reflect that disposition in its manifest.
| PR #24 and release boundary | M0 | PR #24 remains OPEN/Draft against `competition/shanchuanzhi-release-readiness`; no `main` merge or Release occurred. | Keep the base and Draft state unchanged during module coordination. No Release is in scope.

## Current integration delta — 2026-10-21 14:31 UTC

The exact refs below supersede earlier snapshots for these gates only; PR #24 and other integration boundaries remain unchanged.

| Gate | Priority | Current verified state | Remaining acceptance |
| --- | --- | --- | --- |
| M4 shared Hook contract (#60) | P1 | M4 local head `f6c3107` restores `test/agent-hook.test.ts` to exact PR base blob `1ecb3ee`; diff against base is empty. Build, base Hook suite 10/10, and M4 runtime-console suite 9/9 pass. M1 rejected the prior weakened blob; M4's new commits are not public yet. | M1 owner read-only review of `f6c3107` is pending. This removes the M4-owned change but does not put the latest M1 Hook contract into the common base; keep that dependency explicit and do not claim product-host acceptance. |
| M1 expiry regression (#62) | P1 | M1 PR #43 exact head `5cb57c9b1b61884ab06d10b2f8a40426941ad0bc`; exact CI `39616423430` and File Store Concurrency `39616423352` both pass. Controlled clock preserves `REQUIRE_APPROVAL`, `EXPIRED`, and zero-callback assertions. | Keep #62 open pending owner issue disposition; this is test-harness stability evidence, not a runtime policy change. |
| M6 lock/raw.log fixes (#66/#58) | P1 | M6 PR #38 exact head `98803607b89f11e24430c461bd91e9c1a0ece9d4`; CI `39616422797` and Windows wrapper `39616422793` both pass. | Scope source confidence to these runs. Product E4, installer, and clean-VM behavior remain NOT_VERIFIED; coordinate exact #58 issue closure separately. |
| Narrow raw.log exception (#58) | P1 | M6 owner ACCEPTed the exact path rule at M6 `9880360` and M9 public `85b598a`; `.gitignore` blob `20550d67` matches, named historical raw.log is trackable, future sibling is ignored. M6 CI `39616422797` and M9 exact composition `39584019108` pass. | M0 may close only this scoped ignore/CI issue in the next batch. M9 local `128ae58` changes no `.gitignore`; its new composition CI is still pending. No E4/installer/VM conclusion. |
| M1/M2 adapter and M9 pin (#61/#52) | P1/P0 | PR #37 exact candidate `d054ceea39a0e4dd040131b4ca2789b85f2c9fe4` has M1 adapter-seam ACCEPT on Issue #61 comment `6318542125`; CI `39586551017` passed 9/9. M9 local commit `128ae58644407453190a2e683083d4a20caa3c7c` pins that M2 SHA; exact-checkout composition passed 8/8, but the commit is not yet pushed. | Push in the next allowed batch, then require exact-head Linux/Windows composition CI. #52 remains OPEN/P0/NOT_VERIFIED for first-party host binding, held identity, and TOCTOU. |
| Protected PR #24 / cadence | M0 | PR #24 remains OPEN/Draft at head `62496d4020bd90ba2eede49b2e80a2bbebb036b4`, base `dc8d0092b35141b295d5ff42873584ed488e4ee7`. | Keep unchanged. Usage was readable at 14:31 UTC: 77% five-hour / 52% weekly; next push no earlier than 14:43 UTC after fresh quota and ref preflight. |

## Current integration delta — 2026-10-21 11:07 UTC

This delta supersedes publication and CI status in the 10:55 snapshot; the remaining host-integration limits there remain current.

| Gate | Priority | Current verified state | Remaining acceptance |
| --- | --- | --- | --- |
| M2/M4 protected host path (#52) | P0 | M2 candidate `d054ceea39a0e4dd040131b4ca2789b85f2c9fe4` is public on existing PR #37; exact-head CI `39586551017` passed all 9 jobs. M0's M4-owned report audit is public at M4 head `7ac3247`; it finds the direct M1 Gateway path is only a controlled SDK fixture that bypasses M2/M5 and the policy route is virtual. | M1 owner disposition on `d054cee` is pending. M1/M5/M2 must agree an identity-verifiable capability before M4 can wire an OBSERVE consumer. Keep M9 on M2 baseline `9db59ed`; product host-held identity and TOCTOU remain NOT_VERIFIED. |
| M1 expired-approval Gateway CI failure (#62) | P1 | PR #34 exact-head run `39589011257` failed once on Ubuntu Node 20 in unchanged `test/gateway.test.ts:22:322`: `pending()[0]` was undefined before expiry and zero-callback assertions. 329 passed, 1 failed, 4 skipped; fail-fast cancelled other jobs. Issue #62 now records one reproduction; root cause UNKNOWN. | M1 classifies/fixes only if a source defect is established; preserve expiry denial and zero-callback assertions. Revalidate exact head after owner action. |
| M4 exact-head CI after report update | P1 | M4 PR #34 head `7ac3247` adds report documentation only. Run `39589011257` failed on the M1 Gateway test above; no M4 product file changed. | Hold CI disposition with M1/#62; do not claim independent failures from fail-fast cancellations. |
| M0 PR #30 coordination evidence | M0 | Head `c703473d067fc4c9a01e26593847334d4de884dd` product CI `39589020855` passed all 9 jobs; ownership-contract run `39589144798` passed. | Keep Draft; no merge or Release. |
| M6 active-stage lock release (#66) | P1 | Exact M6 `560f724` reproduction confirms `release()` permits a second run to start while the first stage is pending. Task is publicly dispatched on existing PR #38; no source fix is yet visible. | M6 owner fix and regression on existing PR #38, exact-head CI, and M9 composition if the pin changes. |
| M6 duplicate-stage E4 race (#63) | P1 | Scoped issue closed after M6 exact CI and M9 Ubuntu/Windows composition passed at the accepted `560f724` source. | Independent product E4 remains NOT_VERIFIED and is tracked separately. |
| M5 worktree foreign E4 edits | P1 | The M5 worktree is locally modified in M6-owned `packaging/windows/auto-e4.mjs` and `test/auto-e4.test.mjs` (48 insertions, 1 deletion) at M5 HEAD `99ab807`; M6 PR #38 remains at `560f724`. No M0 changes were made. | Preserve the uncommitted patch; identify its owner/provenance before M6 #66 work. Do not treat it as M6 branch progress or cherry-pick it without owner review. |

## Current integration delta — 2026-10-21 10:40 UTC

The following exact-ref changes supersede the corresponding rows in the 10:32 snapshot; unlisted gates there remain in effect.

| Gate | Priority | Current verified state | Remaining acceptance |
| --- | --- | --- | --- |
| M2/M4 protected host path (#52) | P0 | Issue body now names M1 Gateway identity, M2 adapter, M4 desktop consumer, and M5 policy ownership. M2 candidate `d054cee` remains local after a remote pack-storage failure; no exact-head hosted CI or public M1 owner disposition. M4's available read-path trace found virtual-console/SDK reads, not a first-party protected OBSERVE consumer. | Publish the candidate in the next allowed batch; M1 reviews its exact public SHA, while M4 supplies the real consumer path and held-identity proof or a concrete host/API blocker. Alias/path-replacement denial, production host binding, and TOCTOU remain NOT_VERIFIED. |
| M6 duplicate-stage E4 race (#63) | P1 | Scoped acceptance is complete and #63 is closed: M6 `560f724` passes exact M6 CI and is consumed by passing M9 Ubuntu/Windows composition run `39584019108`. | No further work for the closed scope. Independent E4 remains NOT_VERIFIED. |
| M6 active-stage lock release (#66) | P1 | Read-only reproduction against exact M6 `560f724` on Windows Node 22.23.1 confirmed that `release()` followed by a second run creation succeeds while the first stage is pending. The temporary directory was removed; no M6 files changed. | M6 records the release contract, adds a preserving regression/fix on existing PR #38, and passes focused, exact-head CI plus M9 composition if the source changes. |
| M9 approved-source composition (#61) | P1 | Exact PR #36 head `85b598a` passes Ubuntu and Windows and pins M6 `560f724`; the composition uses accepted M2 baseline `9db59ed` and excludes candidate `d054cee`. | Keep #61 open for M2 exact public review/CI and any approved pin update. |

## Current integration risk snapshot — 2026-10-21 10:32 UTC

This exact-ref snapshot supersedes earlier snapshots. Hosted checks apply only to the refs consumed by each workflow; they do not prove production-host enforcement, installed-package lifecycle, or independent product E4.

| Gate | Priority | Current verified state | Remaining acceptance |
| --- | --- | --- | --- |
| M2 protected file path / aliases (#52) | P0 | Candidate `d054ceea39a0e4dd040131b4ca2789b85f2c9fe4` remains clean and local-only, six commits ahead of public PR #37 head `2398daee4d0bb3de010f07afe2b79a6fb45df440`; its focused adapter suite passes 8/8. The 10:21 UTC push attempt failed with a GitHub temporary-pack rename/storage error. Internal source review found no adapter path converting M1 denial into allow, but this is not M1 owner acceptance. | Retry on a later 20-minute push batch without force; require exact-head hosted CI and public M1 disposition. First-party host held-identity and TOCTOU remain NOT_VERIFIED. M9 continues to use M2 baseline `9db59ed`. |
| Packaged Hook log privacy (#53) | P0 | M7 PR #39 head `9330005` has hosted build/package evidence; Setup.exe archive extraction and controlled Hook harness passed with matching canonical hash. Installer and clean-VM lifecycle were not run. | Keep #53 OPEN until reachable shipped-copy reconciliation and approved package evidence; reserve the exclusive installer/VM slot through Issue #29 before execution. |
| M3 native Hook denial (#55) | P0 | M9 PR #36 exact head `85b598adfbb168b51e81b1c56e7be8d846784f8d` passes cross-module composition on Ubuntu and Windows (run `39584019108`); M3 deny and positive-control assertions remain in the selected refs. | Keep the Issue open until owner-approved refs and all shipped Hook copies are reconciled; hosted composition does not establish native-host interception. |
| M8 fail-closed Hook contract (#65) | P0 | M9 composition checks the M8 owner-approved distinct Hook blob separately and passes on both platforms in run `39584019108`. | Preserve the reviewed blob and behavior assertions in subsequent exact-ref runs. |
| Exact M9 composition / approved refs (#61) | P1 | PR #36 head `85b598adfbb168b51e81b1c56e7be8d846784f8d` passes composition on Ubuntu/Windows, product CI run `39584019131`, and wrapper run `39584019133`. Its M2 pin is the accepted baseline; candidate `d054cee` is excluded. | Keep #61 OPEN until M1 reviews the public M2 candidate and the accepted exact refs are intentionally updated and rerun. |
| Native Codex Shell, clean-VM installer, independent E4 (#45/#41/#57) | P1 | Native Shell remains UNPROTECTED; clean-VM lifecycle and independent product E4 remain NOT_VERIFIED. No VMware, real-model, or installer execution was initiated by this checkpoint. | Require evidence from the actual supported host, exclusive VM slot, and independent product verification respectively. |
| Protected PR #24 and Release boundary | M0 | PR #24 remains OPEN/Draft at unchanged head `62496d4020bd90ba2eede49b2e80a2bbebb036b4` and base `dc8d0092b35141b295d5ff42873584ed488e4ee7`; `main` is untouched. | Preserve boundary: no merge and no Release. |

## Current integration risk snapshot — 2026-10-21 10:12 UTC

This exact-ref snapshot supersedes earlier snapshots. Local focused evidence is separated from exact-head hosted CI; neither establishes native-host interception, clean-VM installation, or independent E4.

| Gate | Priority | Current verified state | Remaining acceptance |
| --- | --- | --- | --- |
| M2 protected file path / aliases (#52) | P0 | Existing local M2 candidate d054cee is clean, six commits ahead of PR #37, and its focused adapter tests pass 8/8. No hosted CI at that SHA. Coordinator review holds promotion because the candidate is not public; this is not a code-defect finding or official M1 owner review. | Publish the exact candidate on existing Draft PR #37, obtain exact-head hosted CI and public M1 review; keep M9 on baseline 9db59ed meanwhile. Production-host held-file identity and TOCTOU remain NOT_VERIFIED. |
| Packaged Hook log privacy (#53) | P0 | M7 PR #39 head 9330005 has green product/wrapper/package evidence; extracted Setup.exe Hook matches canonical, checksum checks and controlled harness pass; installer was not run. | Resolve hosted M9 composition, reconcile shipped copies, keep clean-VM and independent E4 separate. |
| M3 native Hook denial (#55) | P0 | M3 exact-source checks pass. M9 local composition now passes 8/8 at pinned sources on Windows; exact-head Linux/Windows hosted composition has not run. | Publish the M9 source-scope fix and pass both hosted platforms while retaining deny and positive-control tests. |
| M8 fail-closed Hook contract (#65) | P0 | M8 head 2d5a0ff remains the reviewed source; M9 now checks its distinct Hook blob separately and local composition passes 8/8. | Verify exact-head Linux/Windows M9 jobs and keep M8's accepted blob and behavior assertions. |
| Exact M9 composition / approved refs (#61) | P1 | Local M9 commit 85b598a changes only .gitignore and composition assertions; 8/8 local Windows tests pass using exact workflow source pins. M2 d054cee remains unapproved and excluded. | Publish existing PR #36 update, pass Ubuntu and Windows hosted composition, preserve M2 baseline until public review and CI. |
| Native Codex Shell, clean-VM installer, independent E4 (#45/#41/#57) | P1 | Native Shell UNPROTECTED; clean-VM lifecycle and independent E4 remain NOT_VERIFIED. | Require actual supported-host, exclusive VM, and independent product evidence respectively. |
| Protected PR #24 and Release boundary | M0 | PR #24 remains OPEN/Draft at unchanged head/base; main unchanged; no merge or Release. | Preserve boundary. |
## Current integration risk snapshot — 2026-10-21 09:38 UTC

This exact-ref snapshot supersedes the older dated snapshots below. Green source CI does not establish native-host interception, clean-VM installation, or independent E4.

| Gate | Priority | Current verified state | Remaining acceptance |
| --- | --- | --- | --- |
| M2 protected file path / aliases (#52) | P0 | M5 strict alias denial has synthetic tests; M2 local candidate `d054cee` passes 8/8 focused Windows tests but has no exact-head hosted CI or product-host consumer. M1 review is pending. Product held-file identity and TOCTOU are NOT_VERIFIED. | M1 accepts/rejects exact M2 SHA; then hosted CI. Identify a real supported host consumer or retain the explicit blocked boundary. |
| Packaged Hook log privacy (#53) | P0 | M7 PR #39 head `9330005` has green product/wrapper/package evidence; extracted Setup.exe Hook matches canonical, checksum checks and controlled package harness pass; installer was not run. | Resolve exact M9 composition, then reconcile every reachable shipped copy; keep clean-VM and independent E4 separate. |
| M3 native Hook denial (#55) | P0 | M3 exact-source checks pass at owner-accepted PR #33 source; current whole-tree M9 composition still fails at the M8 adapter equality assertion. | M9 scopes canonical equality to canonical copies, keeps M3 deny plus registered positive control, and passes both platforms. |
| M8 fail-closed Hook contract (#65) | P0 | Historical PR #40 `c1ff677` regression is corrected at current M8 head `2d5a0ff`; M1-reviewed assertions and M8 variant acceptance are recorded. M9 still fails the broader byte-equality assertion. | Exact M9 composition passes both platforms while preserving M8's accepted variant contract. |
| Exact M9 composition / approved refs (#61) | P1 | PR #36 `72249c6` run `39573535645` fails Ubuntu and Windows at the M8 adapter byte-equality assertion. Other platform tests and M8 provenance step pass. M2 `d054cee` remains unapproved/unpinned. | M9 corrects its owner scope; M1 dispositions M2 exact SHA; rerun both platforms on identical accepted refs. |
| M6–M8 shared Windows/E4 inputs (#59) | P1 | Current heads: M6 `560f724`, M7 `9330005`, M8 `2d5a0ff`; M7's M9 packaging/build acceptance is limited to `b058140`. M6 review of M8's shared `test/auto-e4.test.mjs` remains pending. | Record exact shared-file owner decisions, keep selected refs in M9, and pass final Windows/package checks without deleting assertions. |
| Reviewed raw-log ignore exception (#58) | P1 | M0 allows only `20261013T084123Z/raw.log`; M6 #38 `560f724` and M9 #36 `72249c6` still use a broad `**/raw.log` negation. | Align to the exact M0 path; prove the named historical file is trackable and a future sibling remains ignored. |
| M1/M4 shared Hook test and CI (#60) | P1 | M4 PR #34 `fbf2090` run `38698635434` attempt 2 passes all nine checks. Its `test/agent-hook.test.ts` blob `e8ae820` differs from M1 canonical `82ca466`; exact M1 review is pending. | M1 reviews the exact M4 blob or M4 reconciles the M1-owned path; keep all fail-closed assertions. |
| Expired-approval test failure (#62) | P1 | One historical Ubuntu Node 20 failure is followed by a passing rerun and current M1 PR #43 `c016431` exact CI, including Ubuntu 20/22. Root cause remains UNKNOWN. | M1 records an evidence-graded classification; preserve expiry denial and zero callback. |
| Quarantine store retry root cause (#51) | P1 | One baseline retry-exhaustion reproduction; rerun and bounded candidate x10 checks pass. A product lock defect/root cause is not confirmed. | Keep tests and 500-retry bound; retain UNKNOWN absent a causal trace. |
| M4 exact-head CI (#60) | P1 | Current PR #34 exact head is green as above; no M4 product defect is shown. | Close only after shared M1 test ownership is resolved. |
| Windows AI 503 retry (#54) | P1 | Historical Windows Node 22 503 failure remains unexplained; isolated loopback retry check passed, current exact M9 composition still has its separate failure. | Preserve bounded retry and safe diagnostics; do not edit provider/transport without named ownership. |
| Native Codex Shell (#45) | P1 | Actual native Shell remains UNPROTECTED / NOT_VERIFIED; adapter tests do not install or enforce a host hook. | Preserve the boundary until supported-host enforcement is demonstrated. |
| Installer lifecycle (#41) | P1 | No VMware executable/VMX was available; install/upgrade/uninstall/cancel lifecycle is NOT_VERIFIED. | Require an exclusive reachable VM and recorded lifecycle evidence. |
| Independent product E4 (#57) | P1 | Independent external product E4 remains NOT_VERIFIED. | Require an independent run and product artifact; fixtures do not count. |
| M0/M1 shared test in PR #30 (#56) | P2 | CLOSED: M0 PR #30 current diff excludes the M1-owned Hook test; M1 canonical copy remains in PR #43. | No further action for this closed M0/M1 overlap. |
| Protected PR #24 and release boundary | M0 | PR #24 remains OPEN/Draft at unchanged head/base; `main` is unchanged; no merge or Release. | Preserve this boundary. |
## M0 ownership risk delta — 2026-10-15 21:16 UTC

- **M0/M1 PR scope overlap (#56, P2):** PR #30 currently lists M1-owned `test/agent-hook.test.ts`; PR #43 also changes the same canonical path. M1 owner approval is not visible in the PR #30 timeline. No runtime failure is established, but the M0 scope statement and changed-file list differ. Keep #30 Draft until the M1-owned path is removed from the M0 diff or an explicit M1-reviewed exception and accurate PR scope are recorded.
- **M3/M7/M8 activity:** no owner reply or PR-head movement was visible by 21:12. Existing M3 and M7 sessions accepted follow-ups at 21:16; evidence/blocker is due 21:32. This is delivery evidence only, not start/completion evidence.

## M0 risk delta — 2026-10-15 21:06 UTC

- **#55 P1 / M3-to-M9 native Hook contract:** run `38727481764` failed the same unpinned normal `Read` assertion on Windows (`116396823551`) and Ubuntu (`116396823888`): expected `deny`, actual `allow`. The M9 run pins older M1 `b1d7423e70f2d47f43a5ec42e63a650ff93f6dcc`, not current M1 PR #43 `9ef3dc265f9f386508bbeec7ff6d9a264ab1a0a4`; current-head compatibility is NOT_VERIFIED. Require the M3-owned `native_file_execution_not_pinned` denial, unchanged M1 deny assertions, supported-capability positive control, and exact-head M9 rerun. M0 comment `6202315177`; owner evidence/blocker due 21:12 UTC.
- **Local module isolation:** the coordinator clone currently contains only the coordinator Git worktree; `main`, `agents`, and `integration` are empty. Other module worktree paths remain UNKNOWN.
- PR #24 remains OPEN/Draft and unchanged. Usage tab remains open/readable above the stop threshold. Last M0 branch push 20:58 UTC; next push no earlier than 21:19 UTC.

## Current integration risk snapshot (2026-10-15 20:52 UTC)

The following evidence is current as of the M0 checkpoint. Green source CI does not establish product-host, packaged-artifact, installer, or independent E4 acceptance.

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| Product-host protected file execution (#52) | P0 | M5 alias-denial changes are in PR #47 and exact-head CI passes 9/9. M2 has no first-party host consumer; selected-host protected-open/held-handle, current M1/M2/M5 composition, and TOCTOU remain NOT_VERIFIED. | Verify a selected supported host consumes M5 → M2 → M1 against sensitive, alias, and path-replacement cases; then pass exact-head composition. |
| Packaged Hook log privacy (#53) | P0 | No real pinned Setup.exe/payload, manifest, extracted-Hook byte comparison, or extracted-harness canary evidence is recorded. No real-world disclosure is claimed. | M7/M8 provide exact artifact hashes and extracted-harness results; independently verify reachable package copies and retain external E4 as a separate gate. |
| Native Hook unpinned read (#55) | P1 | M3 head be388029 allows where M1 requires native_file_execution_not_pinned denial; M9 composition run 38727481764 fails Ubuntu and Windows. | M3 corrects its owned branch, preserves M1 denies and a supported-capability positive control; M9 reruns both platforms on exact SHAs. |
| Quarantine retry exhaustion (#51) | P1 | M4 run 38698635434 has one actual Ubuntu Node 20 failure after 500 STATE_STORE_BUSY retries; four jobs were cancelled, package-smoke skipped. Root trigger UNKNOWN; no data loss shown. | Preserve retry behavior/assertions; require lock-holder/timing evidence or owner disposition before product changes. |
| Native Codex Shell (#45) | P1 | Actual Desktop Shell remains UNPROTECTED / NOT_VERIFIED. | Keep the visible boundary until supported-host denial is demonstrated. |
| Installer lifecycle (#41) | P1 | Clean-VM lifecycle remains NOT_VERIFIED. | Reserve the exclusive VM slot and record install/upgrade/uninstall/cancel outcomes before PASS. |
| Independent external E4 | P1 | M6 tool and CI checks pass; independent external validation remains NOT_VERIFIED. | Require independent run and artifacts. |
| Windows Node 22 AI retry (#54) | P1 | Current M9 Windows Node 22 product check passes; historical 503 retry trigger remains UNKNOWN. Full M9 composition is separately blocked by #55. | Preserve bounded retries and diagnostics; assign provider/transport source ownership before any future source edit. |
| Local module worktree isolation | P2 / M0 | Only coordinator worktree is visible to Windows Git; WSL is unavailable and agents/ is empty. Other module worktree paths remain UNKNOWN. | Obtain exact paths/branches from owners before claiming local isolation. |
| PR #24 / Release boundary | M0 | PR #24 remains OPEN/Draft and unchanged; no main merge or Release. | Preserve no-merge/no-Release boundary. |

Assigned lanes are M3 #55 and M7/M8 #53; task start is not independently verified. No VMware, real-model, or installer task is running/reserved. The Usage page remains open and readable above the stop threshold. Next M0 push no earlier than 20:58 UTC.

## Archived integration risk snapshot (2026-10-15 18:52 UTC)

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| Product-host protected file execution (#52) | P0 | M1 has an internal held-descriptor Gateway; M2 adapter report says no first-party host is connected. Native-host trial is BLOCKED with zero protected cases. Current exact-head composition, host protected-open, and TOCTOU are NOT_VERIFIED. | Install a selected supported host and verify M5 → M2 → M1 identity/handle enforcement against sensitive, alias, and path-replacement cases; then pass exact-head composition. |
| Packaged Hook-log reachability (#53) | P0 | M7/M8 source/wrapper checks pass and Hook blobs match; no real Windows payload/Setup.exe or extracted-Hook artifact was verified. Shipped artifact reachability and independent E4 are NOT_VERIFIED. | Build from pinned integrated source, record package SHA/manifest, compare extracted Hook bytes to the canonical blob, and run sanitized canary checks from the extracted harness. |
| Native M3 unpinned Read (#55) | P1 | M1 denies; M3 head be38802 allows in M9 run 38727481764 on Ubuntu and Windows. | M3 correction on its existing PR, preserve M1 denies, add supported-capability positive control; M9 repins and passes both platforms. |
| Quarantine retry exhaustion (#51) | P1 | M4 run 38698635434 failed one Ubuntu Node 20 worker after 500 STATE_STORE_BUSY retries. M1 x10 Node 20/22 did not reproduce; trigger UNKNOWN. | Keep retry behavior and assertions; require a failure trace or owner disposition before any production change. |
| Native Codex Shell (#45) | P1 | UNPROTECTED / NOT_VERIFIED on actual Desktop host. | Preserve user-facing boundary until supported-host enforcement is demonstrated. |
| Clean-VM installer lifecycle (#41) | P1 | NOT_VERIFIED. | Reserve the exclusive VM slot before installation testing; record sanitized evidence. |
| Independent external E4 | P1 | NOT_VERIFIED. | Preserve this state until an independent external run and artifacts exist. |
| PR #24 / Release boundary | M0 | PR #24 OPEN/Draft, unchanged at 62496d4; no main merge or Release. | Preserve the existing no-merge/no-Release boundary. |

# M0/M9 集成风险登记

## Current integration risk snapshot (2026-10-15 16:44 UTC)

This table supersedes the older snapshot below. Exact-head CI covers the listed source state; it does not establish actual host interception, shipped-package reachability, installer lifecycle, or independent E4.

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| M1/M3 native Hook read contract (#55) | P1 | M1 #43 `7d6f091` denies an unpinned native `Read`; M3 #33 `be38802` allows it. M9 #36 run `38727481764` fails on Ubuntu and Windows. | M3 changes its owned behavior/test, retains M1's deny assertions, adds a supported-capability positive control; M9 repins the exact M3 SHA and reruns both platforms. |
| Quarantine state-store retry (#51) | P1 | M1 #43 CI and ten-run workflow pass; direct 500-`STATE_STORE_BUSY` retry exhaustion is confirmed, but original lock-holder/timing cause is UNKNOWN. M4 #34 Ubuntu Node 20 run `38698635434` failed this shared test. | Keep all 48 assertions and retry behavior; collect safe owner PID/acquire-release timing if feasible. Make no product fix without reproduced defect evidence. |
| M5 protected open / held handle (#52) | P0 | M5 #47 `373e2c2` CI passes synthetic alias-denial tests; a production host consumer and TOCTOU/handle enforcement are NOT_VERIFIED. | Keep OPEN until first-party host wiring and protected-open/handle evidence are demonstrated. |
| Packaged Hook log privacy (#53) | P0 | M8 #40 `c1ff677` product and wrapper CI pass synthetic sanitization checks; package reachability and independent E4 are NOT_VERIFIED. No actual secret exposure is established. | Reconcile every reachable packaged copy and verify a real package lifecycle; do not infer host protection from wrapper tests. |
| Installer lifecycle (#41) | P1 | M7 #39 `cf4b70f` product and wrapper checks pass; clean-VM install/upgrade/uninstall/cancel rollback are NOT_VERIFIED. | Wait for an exclusive VM reservation; record lifecycle outcomes and sanitized evidence. |
| Native Codex Shell (#45) | P1 | M2 #37 `9db59ed` checks pass, while actual Desktop host policy remains UNPROTECTED / NOT_VERIFIED. | Retain the visible boundary until actual host-enforced denial is demonstrated. |
| External E4 | P1 | M6 #38 `c1fdf3c` product/wrapper checks pass; independent E4 remains NOT_VERIFIED. | Preserve NOT_VERIFIED until an independent E4 run and artifacts exist. |
| Historical Windows Node 22 retry failure (#54) | P1 | M9 #36 `de3799a` product check passes 9/9 including Windows Node 22; current bounded diagnostic test change preserves assertions. The old trigger remains UNKNOWN. | M9 records a disposition against the current head; do not change provider/transport code without an identified owner. |
| PR #24 / release boundary | P2 / M0 | PR #24 is OPEN/Draft and unchanged at `62496d4`; #30 is OPEN/Draft at `3004dcf` with product CI `38769306353` 9/9 and ownership check `38769777348` 1/1. | Preserve no-merge/no-Release boundary. |

## Current integration risk snapshot (2026-10-15 09:31 UTC)

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| M1/M5 native Hook file authorization | P0 | M1 #43 b683d84 denies unpinned native file operations and exact-head CI passes 10/10. M5 #47 carries the change but its current six test jobs fail on the separate #51 quarantine retry path. A hook decision still does not prove host I/O uses the Gateway. | Keep verifyRealPaths=true; require held-file capability routing before allowing native file reads/writes/deletes. |
| #52 OBSERVE alias contract | P0 | Synthetic alias behavior is tested, but no production file host/held-handle route is verified. Current M9 #36 exact head fails its generic path-callback expectation; owner is aligning that test locally with M5 fail-closed semantics. | Keep OPEN until M9 exact-head composition passes and a real product host consumes the registered capability with canonical path/handle identity; retain TOCTOU limits. |
| #53 Hook log privacy | P0 | M7 #39 and M8 #40 exact-head CI pass. M9 #36 composition is failing; no actual credential exposure or external transmission is verified. | Keep OPEN until all reachable/package copies and a real package lifecycle are reconciled; preserve sanitized synthetic evidence. |
| Windows Hook source provenance | P1 | M8 #40 c1ff677 applies eol=lf only to the native Hook; Windows packaging regression and strict raw-byte comparator remain. Exact-head checks pass 11/11 including Windows. | Keep the scoped LF rule and exact-blob assertion; M9 must pin the accepted M8 source. |
| #51 quarantine-store retries | P1 | PR #47 run 38712035551 has one actual Ubuntu 24 / Node 22 failure at 500 STATE_STORE_BUSY retries; five matrix jobs were canceled by fail-fast. Ten separate direct-store repetitions passed, but do not identify the original trigger; lock-owner/timing/I/O cause remains UNKNOWN. | Keep OPEN; retain retries and all assertions; change source only on owner-confirmed reproduction. |
| #41 installer lifecycle | P1 | M7 #39 checks 11/11; no clean-VM lifecycle evidence. | Keep OPEN/HOLD until exclusive VM reservation and install/launch/upgrade/uninstall/cancel-rollback evidence. |
| #45 native Codex Shell | P1 | M2 #37 checks 9/9; actual desktop host policy/callback is unavailable. | Keep OPEN/BLOCKED_NOT_VERIFIED; report UNPROTECTED. |
| M4 security/E4 provider | P1 | M4 #34 test jobs are failing on the #51 quarantine retry path; backend enforcement/E4 provider remains UNKNOWN. | Never map UNKNOWN to PASS; track the test failure through #51. |
| PR #24 / release boundary | P2 / M0 | PR #24 remains OPEN/Draft at unchanged head 62496d4; no merge to main or Release occurred. | Preserve the boundary; continue only through existing Draft PRs and coordinator evidence. |

## Archived integration risk snapshot (2026-10-15 07:31 UTC)



| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| #52 OBSERVE alias contract | P0 | M5 PR #47 head b6a40b4 passes exact-head CI 9/9. M9 PR #36 head 3dfef35 passes exact-head CI 13/13; cross-checkout job 38696382427 passes Ubuntu and Windows 1/1 each against M1 f14aab7, M2 76066cb, M5 b6a40b4, and M9 3dfef35. No production file host/held-handle wiring is verified. | Keep #52 OPEN until a real host uses protected open/handle enforcement; TOCTOU and shipped-host integration remain unverified. |
| #30 ownership evidence check | P1 | PR #30 exact head bd8686e passes product and ownership checks, 10/10 total. | Keep PR OPEN/Draft for review; coordination snapshot is current through this integration batch. |
| #51 store retries | P1 | Historical Windows Node20 reached `RETRY_LIMIT` after 500 busy retries; later exact-source runs pass, but lock owner/timing evidence is absent. | Keep OPEN; root cause UNKNOWN. Preserve all assertions. |
| #41 installer lifecycle | P1 | PR #39 checks 11/11; no clean-VM lifecycle evidence. | Keep OPEN/HOLD until exclusive VM reservation and lifecycle artifacts. |
| #45 native Shell | P1 | PR #37 checks 9/9; actual desktop host policy/callback unavailable. | Keep OPEN/BLOCKED_NOT_VERIFIED; Native Codex Shell remains UNPROTECTED. |
| M4 security/E4 provider | P1 | M4 commit fbf2090 is PR #34 head; it adds a persistent Native Codex Shell UNPROTECTED / BLOCKED_NOT_VERIFIED warning. Focused tests pass 2/2. Run 38698635434 failed the existing Ubuntu Node 20 state-store test with `RETRY_LIMIT` (#51); Ubuntu Node 22/build/sponsor passed, four matrix jobs were cancelled, and package-smoke was skipped. M1 source/test blobs match `f14aab7`. | UI does not imply protection or a live PASS; native shell remains UNPROTECTED. Track the unrelated CI failure through #51; trigger remains UNKNOWN. |
| #53 Hook log sensitive data | P0 candidate | M8 commit d12dd2c is PR #40 head and passes 11/11; it adds strict allowlisted JSONL/timestamp checks and a co-located packaged-payload E4 regression. M7 local 52cc149 directly asserts the packaged positive-control JSONL (focused test 1/1); its CI is pending. | Keep OPEN pending reachable shipped-copy, built package lifecycle, and independent E4 evidence; no actual exposure/transmission claim. |

## Archived integration risk snapshot (2026-10-15 06:05 UTC)

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| #53 Hook log sensitive data | P0 candidate | M1 owner copy verified; M7 `87e0df0` exact-head CI 11/11. M2 `04c7ec7`, M3 `1829e05`, M4 `66e679b`, M5 `a6d610e`, M6 `c1fdf3c`, M8 `454873c`, and M9 `2d3f1da` are remote with their current exact-head checks green. No real secret exposure or external transmission observed. | Keep OPEN until reachable shipped copies and package evidence are reconciled; retain M7 package and M9 composition checks. |
| #52 OBSERVE aliases | P0 | M5's audit found no production file-host consumer. M9 remote head `f87a70f` composes M5 OBSERVE routing with M1's registered-file Gateway in a test fixture; valid reads reach the Gateway and sensitive/external aliases deny before dispatch (4/4 focused tests, build and diff checks pass). M2 is working on an adapter candidate within existing PR #37. | Keep OPEN; synthetic composition does not prove a production host uses the Gateway or protected handles. Production-host enforcement and TOCTOU remain NOT_VERIFIED. |
| #51 store retries | P1 | Ubuntu run `38662965312` attempt 1 and M0 Windows Node20 run `38682225388` both exhaust 500 retries; identical store/test blobs pass in later Windows CI. Local Windows Node22 test and 48-state diagnostic pass. Failed attempts skip final 48-state assertion loop; logs lack lock-owner/duration traces. | Keep OPEN; root cause UNKNOWN. Retain `RETRY_LIMIT` and all 48 assertions; no defensible product fix identified. |
| #32 Hook interruption | P1 | M1/M3/M4/M6/M9 current exact-head CI green; historical direct test mechanism was a one-second fixture window before marker. | CLOSED for the synthetic subprocess marker regression only; historical runner delay UNKNOWN and native-host callback NOT_VERIFIED. |
| #27 M9 E4 composition | P1 | Issue #27 is CLOSED for package manifest ownership and M9 combined validation; M9 exact-head CI 11/11 and M6 verifier compatibility retained. | External E4 remains NOT_VERIFIED and is outside the closed issue scope. |
| #41 installer lifecycle | P1 | PR #39 checks 11/11; no clean-VM lifecycle evidence. | Keep OPEN/HOLD until exclusive resource reservation and lifecycle artifacts. |
| #45 native Shell | P1 | M2 PR #37 checks 9/9; actual desktop host policy/callback unavailable. | Keep OPEN/BLOCKED_NOT_VERIFIED; Native Codex Shell remains UNPROTECTED. |
| M4 security/E4 provider | P1 | M4 PR #34 checks 9/9; provider/IPC absent. | UI remains UNKNOWN; do not show mock PASS. |

## Archived integration risk snapshot (2026-10-15 04:04 UTC)

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| #27 manifest / M9 E4 composition | P1 | M9 `37a09e8` exact CI 11/11; local full npm test 409 pass/0 fail/6 environment skips, build, E4 16/16, package smoke 100 files; M6 verifier byte-identical to `cd55717`. | Keep issue record synchronized; external E4 remains NOT_VERIFIED. |
| #32 Hook interruption | P1 | M3 #33 and M4 #34 current exact heads pass 9/9; interruption fixture remains synthetic, host callback NOT_VERIFIED, historical runner delay UNKNOWN. | Keep OPEN; retain fail-closed assertions and require real host evidence for broader claims. |
| #52 OBSERVE aliases | P0 | M1/M5 changes integrated at M9 `37a09e8`; M1 10/10, M5 9/9, M9 11/11 exact-head checks pass. Synthetic read/write junction tests prove zero approvals/callbacks and unchanged fixtures only. | Keep OPEN until a real filesystem host is identified, opts in to canonical-path checks, and protects open/handle; record TOCTOU limit. |
| #51 store retries | P1 | Ten-run workflow passes; 500 consecutive `STATE_STORE_BUSY` retries reproduce `RETRY_LIMIT`; original lock-owner/timing trigger UNKNOWN. | Keep OPEN and preserve assertions. |
| #45 native Shell | P1 | M2 PR #37 exact checks 9/9; actual desktop host policy and callback unavailable. | Keep OPEN/BLOCKED_NOT_VERIFIED; Native Codex Shell remains UNPROTECTED. |
| #41 installer lifecycle | P1 | PR #39 checks pass 9+2; no exclusive clean-VM lifecycle evidence. | Keep OPEN/HOLD until resource reservation and lifecycle artifact. |
| M4 security/E4 provider | P1 | M4 exact PR #34 checks 9/9 and tests 8/8; no provider or IPC; UI remains UNKNOWN. | Do not represent absent provider as live PASS. |
| quota / push cadence | Scheduling | Usage page remains open/active and readable above 5%; batch began 04:00 UTC. | Stop if unreadable or below 5%; space the next public batch at least 20 minutes after the final write in this batch. |

## Archived integration risk snapshot (2026-10-15 03:31 UTC)

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| #27 M6 package fields and E4 evidence | P1 | M6 `cd55717` is the exact PR #38 head; product checks 9/9 and wrappers 2/2 pass. M9 local `e2e25fb` integrates the byte-identical M6 verifier and implements BLOCKED export propagation, immutable sidecar/snapshot hashes, and stable EEXIST normalization. Negative tests reject a forged sidecar without mutation and preserve an existing sidecar. Build, `e4:test` 16/16 and `verify` 399 pass/6 skip/0 fail pass locally. M6 owner final rereview found no contract gap. | Keep OPEN until next exact-head CI and M9 combined acceptance pass. External E4 remains NOT_VERIFIED; verifier/export path-read TOCTOU remains. |
| [#32](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/32) Hook interruption fixture | P1 | PR #33 run `38672489688` and PR #34 run `38672493385` each pass 9/9; #33 Windows Node20 passes. The former 1s marker window explains the direct fixture failure, not why the historical runner exceeded the window. Synthetic child interruption does not observe native host callback. | Keep OPEN pending M9 combined-baseline review and real host callback evidence; retain fail-closed, no-output, and no-decision assertions. |
| [#52](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/52) OBSERVE file reads through aliases | P0 | PR #47 `c54e7eb` exact-head CI passes 9/9. M1 Gateway file operations use a held/rechecked descriptor, but no native host callback is connected to that Gateway. M5 has no production filesystem-host consumer; its adapter does not open files. | Keep OPEN until the actual filesystem host is shown to enable the canonical-path boundary and protect the open/handle. Preserve hard DENY and TOCTOU limits. |
| PR #40 M8 public documentation accuracy | P2 | Existing-branch docs and PR body were updated through the logged-in web UI; new head `16e3d01c485f039bfa4eedc97523d223340f93e0` run `38674816292` passes all 9 checks. The PR body now records that exact-head success and keeps local GHCR pull/runtime and independent E4 as NOT_VERIFIED. PR remains OPEN/Draft. |
| #51 shared Guard/quarantine store failure | P1 | Ten-run Linux workflow passes, but original lock-holder/timing evidence remains absent and the trigger is UNKNOWN. | Keep OPEN; retain all 48 assertions and do not infer data loss or defect. |
| #45 native Codex Shell | P1 | M2 repo audit found no reproducible fail-open; effective desktop policy/trust/native callback remain unobservable. Native Shell remains UNPROTECTED. | Keep OPEN/BLOCKED_NOT_VERIFIED until supported-host policy, Hook trust, and real sentinel deny/hash evidence exist. |
| #41 installer lifecycle | P1 | Clean-VM lifecycle remains NOT_VERIFIED; exclusive reservation is not recorded. | Keep OPEN/HOLD until the #29 resource reservation and lifecycle evidence are available. |
| External E4 / M4 backend | P1 | External E4 NOT_VERIFIED. M4 confirms there are no providers/IPC for `/api/security-center` or `/api/e4/status`; 404 tests pass 7/7 and UI remains UNKNOWN. | Do not report live PASS until a real backend provider and independent external E4 evidence exist. |
| Exclusive VM/model/installer resources | P2 | Occupancy in other windows remains unknown. | Treat unavailable until owner, worktree, start, and release are recorded on #29. |
| Quota / push cadence | Scheduling | Usage page remains open/readable above the stop line; M0 re-read at 03:31 UTC and keeps it open at the user's request. The quota-checked public-write batch completed at 03:13:51 UTC. | Stop if unreadable or below 5%; next public-write batch no earlier than 03:33:51 UTC. |

## Archived integration risk snapshot (2026-10-15 02:40 UTC)

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| #27 M6 package fields and E4 evidence | P1 | M6 confirmed `e4:auto`, `e4:verify`, `e4:test` exactly match M9 (`MATCH_CONFIRMED`). PR #38 remote head `0908449` checks 11/11; local verifier commit `cd55717` has `e4:test` 16/16 but lacks exact-head CI. M1 owns the separate shared store failure under #51; its ten-run Linux workflow passes. Original RETRY_LIMIT cause remains UNKNOWN; do not infer cause from reruns. | Keep OPEN until `cd55717` exact-head CI and combined manifest/package acceptance. External E4 NOT_VERIFIED. |
| [#51](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/51) shared Guard/quarantine store CI failure | P1 | Ubuntu Node22 `file-state-store` four-process test initially reported `RETRY_LIMIT`; source/test blobs match the AC3 baseline and M6 diff does not touch them. Attempts 2–4 each passed the Ubuntu Node22 full test job consecutively (3 passes); attempt 2 also passed all 9 product jobs and package smoke. M1 confirmed the direct failure path: 500 consecutive `STATE_STORE_BUSY` lock retries end in `RETRY_LIMIT`. The original lock-holder/timing evidence is absent, so the underlying trigger remains UNKNOWN; no data loss or implementation defect is established. M1 accepted path ownership in comment `6182359961`; commit `3828bee` adds the path-scoped ten-run workflow. Run 38668337033 passed on merge candidate `3c8d880` (M1 `3828bee` + base `62496d4`): 10 iterations, each 17 tests / 14 pass / 0 fail / 3 skip, including the four-process test. M0 comment `6182797086` records this owner disposition. | The ten-run Linux workflow and current exact-head PR #38 checks passed; retain all 48 assertions. Keep OPEN because the original trigger remains UNKNOWN. |
| #32 Hook interruption fixture | P1 | M1 confirmed the direct historical failure mechanism on Windows Node20 run `38390302812`: old `spawnSync` fixture had a 1s timeout; why runner startup exceeded 1s remains UNKNOWN. M3 `f9bd818` and M4 `9288de0` port the bounded async fixture on their separate existing branches; both target files passed 10/10 and M3 targeted case passed three times on Windows Node22. Local Node20 is unavailable. Interruption checks no stdout/stderr/decision log but do not run the real host; callback NOT_VERIFIED. M9 combined review is pending. | Keep OPEN pending M9 baseline review and exact-head Windows Node20 CI; retain fail-closed/no-decision/no-output assertions. Native host callback NOT_VERIFIED. |
| #52 OBSERVE read through aliases | P0 | Synthetic sensitive-junction and external-junction paths reached the M5 callback before the local fix; no real data disclosure is claimed. M1 confirms legacy `createRiskPolicyRouter` default behavior is lexical by documented contract. M5 local `c54e7eb` requires explicit `verifyRealPaths:true` for canonical containment and sensitive-target classification; sensitive and escaping junction regressions now deny with zero approvals/callbacks. | Keep OPEN until exact-head CI and real-host opt-in/host-executor protection are evidenced. Preserve legacy compatibility, hard DENY, and TOCTOU limitation. |
| #45 native Codex Shell | P1 | PR #37 checks 9/9 pass. M2 read-only audit found no repo-level fail-open but could not inspect effective host policy/trust or native callback. No WSL distro means M2 Git status/head is unverified; no code/test changes. Native Shell remains UNPROTECTED. | Keep OPEN/BLOCKED_NOT_VERIFIED until host owner supplies effective sandbox/profile and Hook trust/source, followed by a real Desktop Shell sentinel deny/hash check. |
| #41 installer lifecycle | P1 | Clean-VM lifecycle remains NOT_VERIFIED; no exclusive reservation. | Keep OPEN/HOLD pending visible resource reservation and lifecycle evidence. |
| External E4 / M4 backend | P1 | Independent E4 NOT_VERIFIED. M4 confirmed no Console provider/IPC exists for `/api/security-center` or `/api/e4/status`; current runtime-console tests assert 404 (7/7 pass), and UI remains UNKNOWN. | M4 UI is truthful; backend owner must implement verified runtime providers before live status can be shown. External E4 still requires independent evidence. |
| Exclusive VM/model/installer resources | P2 | Occupancy in other windows is unknown. | Treat unavailable until owner/worktree/start/release is recorded on #29. |
| Quota / push cadence | Scheduling | Usage page remains open/readable above stop threshold; exact values are not public. Last push 02:20 UTC. | Stop if quota <5% or unreadable. This batch is due; keep later pushes at least 20 minutes apart. |

M0 PR #30 remote `1a73704` has 9/9 product jobs and a successful coordination run. M1 PR #43 remote `3828bee` has passing standard CI and ten-run store workflow; PR #38 exact head `0908449` has 11/11 checks, which do not cover local `cd55717`. M3/M4 fixture commits and M5/M6 local fixes await the current batch and new exact-head CI. The original store trigger remains UNKNOWN. M9 PR #36 `bc5390d` remains 11/11. PR #24 remains OPEN/Draft, unchanged, with 11/11 checks.

## Archived integration risk snapshot (2026-10-15 00:30 UTC)

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| #27 M6 package fields and E4 evidence | P1 | Comment 6181516836 records two reproduced defects: consistent metadata can falsely claim E4_VERIFIED, and repeated Auto E4 artifact generation overwrites earlier evidence. M6 fix commit 4e39762 has focused tests 18/18; exact PR #38 CI pending. Existing evidence directory is preserved. | Keep OPEN until both regressions pass exact-head CI and M6 owner disposition/M9 combined acceptance are recorded; external E4 NOT_VERIFIED. |
| #32 Hook interruption fixture | P1 | M1 audit comment 6181394646 records passing exact-head and subprocess fixtures; no M3/M4 acknowledgement follows it. Latest checkpoint 6181111750 leaves them UNACKNOWLEDGED/HOLD. | Keep OPEN. Do not edit or reassign until hold state clears. Preserve fail-closed/no-output/no-decision assertions; root cause UNKNOWN and native callback NOT_VERIFIED. |
| #45 native Codex Shell | P1 | M2 audit complete with no justified code change; Issue comment 6181405060 records BLOCKED_NOT_VERIFIED. Native Shell remains UNPROTECTED without supported-host evidence. | Keep OPEN; require actual supported-host evidence or explicit UNPROTECTED/BLOCKED status. |
| #41 installer lifecycle | P1 | Clean-VM installation/launch/upgrade/uninstall/cancel rollback NOT_VERIFIED; comment 6180703085 requests evidence or BLOCKED_RESERVATION; no reply as of00:13. | Keep OPEN/HOLD pending lifecycle evidence and visible exclusive reservation. |
| External E4 | P1 | Verifier CI and synthetic artifacts do not establish independent external E4. | Keep NOT_VERIFIED. |
| M4 backend | P1 | Backend security/E4 remains UNKNOWN. | No PASS claim without backend evidence. |
| Exclusive VM/model/installer resources | P2 | Other-window occupancy unavailable. | Treat unavailable until reservation/release visible on #29. |
| Quota / push cadence | Scheduling | Usage page readable at00:29 UTC and above stop threshold; exact values local-only. Last push00:16 UTC. | Stop if quota <5% or unreadable. Next push no earlier than00:36 UTC. |

PR #30 head `205df8e` has 1/1 coordination check and 9/9 product CI checks passing. M9 PR #36 is clean with 11/11 checks passing; M1 PR #43 is at `4b562be` with 9/9 checks passing. Issue #44 is COMPLETED/CLOSED. PR #24 remains OPEN/Draft at the recorded base/head with 11/11 checks passing; it was not modified or merged.

## Archived snapshot (2026-10-14 22:34 UTC)

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| #27 M6 package fields | P1 | M6 slot released; no owner signoff. M6/M9 three script values match by static read. | Keep OPEN pending explicit M6 disposition and M9 combination; external E4 NOT_VERIFIED. Preserve untracked evidence. |
| #32 Hook interruption fixture | P1 | M3/#33 and M4/#34 slots remain assigned; at 22:34 both worktrees and PR heads unchanged. Task messages were queued; consumption is not verified. Old exact-head CI is green but the copies remain synchronous. | Keep OPEN until each owned copy has the narrow approved timing update and exact-head CI. Preserve fail-closed/no-output/no-decision checks; native callback NOT_VERIFIED and root cause UNKNOWN. |
| #45 native Codex Shell | P1 | Native Shell UNPROTECTED; protocol tests do not prove installed-host enforcement. | Keep OPEN; require actual supported host evidence or show UNPROTECTED/BLOCKED. |
| #41 installer lifecycle | P1 | Clean-VM install/launch/upgrade/uninstall/cancel rollback remains NOT_VERIFIED. | Keep OPEN/HOLD pending lifecycle evidence. |
| External E4 | P1 | Verifier CI and synthetic bundle do not prove independent external E4. | Keep NOT_VERIFIED. |
| M4 backend | P1 | Backend security/E4 endpoints and enforcement remain UNKNOWN. | No PASS claim without backend evidence. |
| Exclusive VM/model/installer resources | P2 | Other-window occupancy unavailable. | Treat unavailable until reservation/release is visible on #29. |
| Quota / push cadence | Scheduling | Usage page readable/open/active at 22:32 UTC, above stop line; exact values local-only. Last push 22:15 UTC. | Stop if quota <5% or unreadable. Next M0 push no earlier than 22:35 UTC; following batch no earlier than 22:55 UTC. |

Issue #32 latest checkpoint comment is `6179870318`. PR #30 head `5685d8e` has product run `38646435036` 9/9 and ownership runs `38646435026`/`38646704479` 1/1. PR #24 remains OPEN/Draft and unchanged with 11/11 checks passing.

## Archived snapshot (2026-10-14 22:14 UTC)

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| #27 M6 package fields | P1 | Active slot released; field-owner reply still absent. M6/M9 `e4:auto`, `e4:verify`, `e4:test` are statically equal only. | Keep OPEN through explicit M6 owner disposition and M9 combined acceptance; external E4 NOT_VERIFIED; preserve local E4 evidence. |
| #32 Hook interruption fixture | P1 | M3/#33 and M4/#34 are active slots. At 22:14 worktrees and PR heads unchanged; exact-head old-fixture CI is green. Owner task messages are queued, but consumption is unconfirmed. | Keep OPEN until owner-authored branch copies and exact-head CI verify the limited timing fix. Keep fail-closed/no-output/no-decision assertions. Root cause UNKNOWN; native callback NOT_VERIFIED. |
| #45 native Codex Shell | P1 | Native Shell remains UNPROTECTED; child-process/protocol tests do not prove installed-host enforcement. | Keep OPEN; do not present a fixture as host coverage. |
| #41 installer lifecycle | P1 | Clean-VM install/launch/upgrade/uninstall/user-cancel rollback remains unverified. | Keep OPEN/HOLD pending clean-VM evidence. |
| External E4 | P1 | Verifier CI and synthetic bundle are not independent external E4. | Keep NOT_VERIFIED. |
| M4 backend | P1 | Security/E4 backend endpoints and enforcement remain UNKNOWN. | Do not claim PASS without backend evidence. |
| Exclusive VM/model/installer resources | P2 | Other-window occupancy unavailable. | Treat as unavailable until reservation/release is visible on #29. |
| Quota / push cadence | Scheduling | Usage page readable and above stop threshold at 22:13 UTC; exact values local-only. Last push 21:55 UTC. | Stop all work if quota <5% or unreadable; next push batch no earlier than 22:15 UTC. |

Issue #32 latest status checkpoint is 6179514296. M3/M4 queued-session acknowledgments are recorded locally only; they are not proof of task completion. PR #30 current head `6f27e16` has product run 38644017236 9/9 and ownership runs 38644017422, 38644355243, 38644503756 each 1/1. PR #24 is unchanged with 11/11 checks passing.

## Archived snapshot (2026-10-14 21:53 UTC)

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| #27 M6 package fields | P1 | M6 slot released at 21:47; owner signoff is still absent. M6/M9 `e4:auto`, `e4:verify`, `e4:test` match by static read only. | Keep OPEN through explicit M6 owner disposition and M9 integration acceptance; external E4 remains NOT_VERIFIED. Preserve M6's untracked evidence directory. |
| #32 Hook interruption fixture | P1 | M1 accepts `d3b64fc` only for timing-fix behavior. M3/#33 and M4/#34 now hold the two active slots; at 21:53 both worktrees are clean and heads unchanged. Their existing exact-head CIs pass, but both copies remain old synchronous blob `1ecb3ee`. | Keep OPEN until each owned branch updates the fixture and passes exact-head CI. Retain fail-closed/no-decision/output/log assertions. Native-host callback and historical root cause remain NOT_VERIFIED/UNKNOWN. |
| #45 native Codex Shell | P1 | Native Shell remains UNPROTECTED; protocol and child-process fixtures do not prove installed-host enforcement. | Keep OPEN until evidence from an actual supported host, or user-facing state remains explicitly UNPROTECTED/BLOCKED. |
| #41 installer lifecycle | P1 | Current evidence still lacks clean-VM install/launch/upgrade/uninstall/user-cancel rollback. | Keep OPEN/HOLD until lifecycle evidence exists. |
| External E4 | P1 | Verifier tests and archived synthetic bundle do not establish independent external E4. | Keep NOT_VERIFIED. |
| M4 backend | P1 | Backend security/E4 endpoints and enforcement remain UNKNOWN. | Do not report PASS without backend evidence. |
| Exclusive VM/model/installer resources | P2 | Occupancy in other Codex windows is unavailable. | Treat as unavailable until #29 records reservation/release. |
| M1 PR description | P2 | #43 body stale-push wording was previously reported to its owner; no correction is confirmed in this checkpoint. | M1 owner retains PR-body ownership. |
| Quota / push cadence | Scheduling | Usage page readable and above stop threshold at 21:53 UTC; exact values are local-only. Last push 21:32 UTC. | Stop all work if quota <5% or unreadable. Next push batch no earlier than 22:13 UTC. |

Issue #32 latest routing comment: 6179220646. Issue #27 slot disposition: 6179220160. PR #30 head `9a8a79e` product CI 38641094976 passed 9/9; ownership runs 38641094955 and 38641613332 each passed 1/1. PR #24 remains OPEN/Draft, unchanged, with 11/11 checks passing.

## Archived snapshot (2026-10-14 21:26 UTC)

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| #27 M6 package fields | P1 | M6/M9 e4:auto, e4:verify, e4:test values match by static read; M6 owner confirmation pending. | Keep OPEN through owner disposition and M9 integration check; external E4 remains NOT_VERIFIED. |
| #32 Hook interruption fixture | P1 | M3 remains on synchronous blob 1ecb3ee; current M1 owner fixture is 6c2d8da. M3 lacks stderr/decision-log checks; subprocess does not observe native-host callback. | Keep OPEN; port only approved asynchronous timing behavior on owned branch, retain fail-closed assertions, rerun exact-head CI; callback remains NOT_VERIFIED. |
| #45 native Codex Shell | P1 | Native Shell remains UNPROTECTED; protocol/child-process fixtures do not prove installed host enforcement. | Keep OPEN until a real supported host blocks a protected synthetic write or all user-facing status explicitly keeps it UNPROTECTED/BLOCKED. |
| #41 installer lifecycle | P1 | NSIS/template CI passed; clean-VM install/launch/upgrade/uninstall/cancel rollback unverified. | Keep OPEN/HOLD pending clean-VM evidence. |
| External E4 | P1 | M6 verifier/archived synthetic bundle is not independent external E4. | Keep NOT_VERIFIED. |
| M4 backend | P1 | Backend security/E4 endpoints and enforcement remain UNKNOWN. | Do not report PASS without backend evidence. |
| Exclusive VM/model/installer resources | P2 | Other-window occupancy unavailable. | Assume unavailable until #29 records reservation/release. |
| M1 PR description | P2 | #43 body still says d26a0c3 awaits push, but current remote head 4b562be descends from it. | Ask M1 owner to correct owner-authored body; M0 does not rewrite it. |

M0 checkpoint comments: #32 6178865306, #27 6178865803. PR #30 head ff9822b has product run 38638309831 (9/9) and ownership runs 38638309677/38638890338 (both 1/1). PR #24 remains OPEN/Draft and unchanged.


## Archived snapshot (2026-10-14 21:06 UTC)

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| #27 package manifest / M6 fields | P1 | M6 与 M9 的 e4:auto、e4:verify、e4:test 静态值一致；M6 owner 确认待回复。 | 保持 OPEN，等 owner 确认/修正并完成 M9 exact-head 验证。外部 E4 仍 NOT_VERIFIED。 |
| #32 Hook interruption fixture | P1 | M3 仍为同步 blob 1ecb3ee；M1 owner 参考为 6c2d8da。M3 当前 fixture 未核 stderr/空决策日志；子进程不能观察 native-host callback。 | 保持 OPEN；各 owner 分支只移植获批异步 marker/interruption 行为，保留 fail-closed 断言并跑 exact-head CI。callback 状态仍 NOT_VERIFIED。 |
| #45 native Codex Shell | P1 | 原生 Shell 仍 UNPROTECTED；协议或子进程测试不能证明宿主已安装可信策略。 | 保持 OPEN，直到真实宿主阻断受保护合成写入，或用户状态明确标为 UNPROTECTED/BLOCKED。 |
| #41 installer lifecycle | P1 | 固定 NSIS/template CI 通过；无 clean-VM 生命周期证据。 | 保持 OPEN/HOLD，直至验证 clean-VM 安装、启动、升级、卸载及用户取消回滚。 |
| External E4 | P1 | verifier 和合成归档不能证明独立外部 E4。 | 保留证据；保持 NOT_VERIFIED，直至获授权的独立运行。 |
| M4 backend state | P1 | 后端安全/E4 endpoint 和 enforcement 仍 UNKNOWN。 | 不将 UNKNOWN 报为 PASS；等待后端证据。 |
| Exclusive VM/model/installer slot | P2 | 本会话无法看到其他窗口占用情况。 | #29 未记录释放/预约前按不可用处理。 |
| Stale M1 PR description | P2 | PR #43 head 4b562be 的祖先含 d26a0c3，但 PR body 仍称该提交待推送。 | 请 M1 owner 修正文案；M0 不改 owner-authored PR 正文。 |

M0 在 21:06 UTC 更新 #32/#27 状态请求：comments 6178530800 与 6178531392。PR #30 head 71c2545 的产品 CI 38635153635 为 9/9，最新 ownership check 38635518024 为 1/1。PR #24 仍 OPEN/Draft 且未变。


## Archived snapshot (2026-10-14 20:46 UTC)

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| Shared package manifest / M6 fields | P1 | M9 candidate preserves the statically reviewed composition; explicit M6 field-owner confirmation is absent. | Keep #27 OPEN until M6 confirms/corrects e4:auto, e4:verify, e4:test and M9 exact-head CI passes. |
| Windows Hook interruption fixture | P1 | M1 disposition is limited to timing-fixture equivalence. M3/M4/M6 branches still use the synchronous marker blob despite green CI. Root cause UNKNOWN. | Keep #32 OPEN; update owner copies or document evidence-backed exceptions, preserve fail-closed assertions, rerun exact heads. Native callback is NOT_VERIFIED. |
| Native Codex Shell | P1 | Current M2 candidate and protocol tests do not establish installed, trusted host enforcement; status is UNPROTECTED. | Keep #45 OPEN until actual host policy denies a protected synthetic write or limitation is documented in user-facing status. |
| Installer lifecycle | P1 | M7 CI compiles the pinned NSIS template; no clean-VM install/launch/upgrade/uninstall/cancel-rollback result. | Keep #41 OPEN/HOLD until runtime lifecycle evidence exists. |
| External E4 | P1 | M6 local evidence and verifier CI do not establish independent external E4. | NOT_VERIFIED; preserve local evidence and obtain external run only under the exclusive schedule. |
| Desktop backend state | P1 | M4 backend security/E4 endpoints and enforcement remain UNKNOWN. | Do not present UNKNOWN as PASS; require actual backend contract evidence. |
| Exclusive VM/model/installer slot | P2 | Other-window occupancy cannot be observed here. | Treat as unavailable until a reservation/release is recorded on #29. |

Issue #46 is CLOSED only for M0/M5 documentation synchronization. Green automation does not close any of the runtime, host, installer, or external-E4 risks above.

## 当前风险快照（2026-10-14 19:12 UTC）

| 风险 | 级别 | 责任与证据 | 状态 |
| --- | --- | --- | --- |
| Shared API contract path | P1 | M0 #30 head `af39e96` contract blob `693d437`；M9 #36 head `6abd4da` passes 9/9 + wrapper 2/2. | Issue #49 CLOSED（仅记录的路径/hash范围） |
| #27 package/M6 composition | P1 | M9 package blob `6b3042`；此前静态核对为 36 个唯一测试路径，保留 AC3 发布字段。M6 对 `e4:auto`/`e4:verify`/`e4:test` 尚无显式 owner 确认。 | OPEN / OWNER CONFIRMATION PENDING |
| #28 Gateway lifecycle | P1 | M7 #39 `4267c61` CI 9/9 + wrapper 2/2；M1 owner review 已读回。 | CLOSED（有限合同范围） |
| #32 Hook interruption | P1 | 当前 #43/#36 测试 blob `6c2d8da`，#37 为异步 marker-wait blob `d3b64fc`，#33/#34/#38 仍为旧 blob `1ecb3ee`。各当前 CI 通过，但不能据此排除历史竞态；M1 的 subprocess fixture 也不能观测 native-host callback。 | OPEN / FIXTURE COORDINATION PENDING |
| #35 Guard quarantine | P0 | 已关闭；结论限同进程、同一 Guard、遵守 AbortSignal 的 callback。 | CLOSED（有限范围） |
| #41 installer lifecycle | P1 | Windows pinned NSIS/template compile 有 CI 证据；clean-VM 安装/启动/升级/卸载/取消回滚无验证。 | OPEN / HOLD / NOT VERIFIED |
| #44 approval expiry | P1 | M1 owner head `4b562be` 与当前 M9 CI 通过；关闭范围仍限对应 expiry regression。 | CLOSED（有限范围） |
| #45 native Shell | P1 | 实际 Windows Codex Shell 没有可信 fail-closed policy enforcement 证据。 | OPEN / UNPROTECTED |
| #46 OBSERVE docs sync | P2 | M0 contract blob `693d437`、M5 report blob `1300b4d` 与 M5 PR #47 描述相互引用；#48 已按有限 hard-deny 证据关闭；#30/#47 exact-head CI 通过。 | DOCUMENTATION ACCEPTANCE MET / GITHUB CLOSE PENDING |
| #48 OBSERVE policy/router | P1 | M5/M1 有限 hard-deny、零审批/零 callback、safe-read/egress 证据。 | CLOSED（有限策略/router范围） |
| External E4 | P1 | M6 自动 verifier CI 不替代独立真实模型/外部 E4 evidence。 | NOT VERIFIED |
| M4 backend state | P2 | 当前安全/E4 后端状态不可用/未核实。 | UNKNOWN |
| quota / push interval | Scheduling gate | 19:10 UTC 用量页可读：5小时 97%、周 64%、113 credits；上批推送 19:04 UTC，下批不早于 19:24 UTC。 | MONITOR |

Do not merge main or PR #24, publish a Release, or claim fixture/CI results as native-host, external-E4, or clean-VM acceptance.

更新日期：2026-10-14。实时风险快照位于首个风险表；旧记录按原时间保留。

## 实时风险快照（2026-10-14 11:56 UTC；额度页 11:50 UTC；PR checks 11:45 UTC）

| 风险 | 级别 | 责任与证据 | 状态 |
| --- | --- | --- | --- |
| #35 Guard quarantine | P0 | CLOSED 范围仍限同进程、同 Guard 实例且 callback 遵守 AbortSignal。 | CLOSED（有限范围） |
| #32 Hook interruption | P1 | #30 当前头 run `38558211885` Windows Node22 失败；#39 run `38558208490` Windows Node20/22 失败，均在旧 M1 interruption marker fixture。M1 owner 的仅测试夹具 patch 已生成，M2/M8 正在应用；该子进程夹具不观测宿主 callback。 | OPEN / CROSS-PR FIX INTEGRATION |
| #44 approval expiry | P1 | M1 `ca24d37` 已推送；PR #43 当前头 CI 9/9 通过，保留过期拒绝、清理、callback=0。 | OPEN / CI PASS; M9组合仍待验 |
| #39 honeypot | P1 | M7 `c9a6b5c` 已推送，旧 resolve 期望已对齐并本地 6/6；当前 #39 只因未整合的 M1 Hook fixture 在 Windows 20/22 失败。 | OPEN / CROSS-PR CI BLOCK |
| #27 manifest / E4 | P1 | M9 `ab382fe` 已推送；#36 当前头 11/11；外部 E4 未验证。 | OPEN / EXTERNAL E4 NOT VERIFIED |
| #28 Gateway lifecycle | P1 | M7 `c9a6b5c` 已推送；#39 等 M1 Hook 修正集成后的新头组合 CI。 | OPEN / CROSS-PR CI PENDING |
| #48 OBSERVE sensitive read | P1 | hard DENY 保持；M5 PR #47 旧头受 Hook 夹具失败影响，等待更新后的组合 CI。 | OPEN / CI PENDING |
| #41 clean-VM install | P1 | 无已验证 clean-VM 快照，本轮未运行安装程序。 | HOLD / NOT VERIFIED |
| #45 native host Shell | P1 | M2 本地 Hook 协议夹具 PASS，但候选 Hook 未安装或信任，未做真实宿主 Shell 验收；官方 Hooks 存在错误/超时后继续执行及专用路径绕过边界。 | OPEN / UNPROTECTED / BLOCKED_NOT_VERIFIED |
| #46 canonical API contract | P2 | API_CONTRACTS 唯一 owner 为 M0；M5/M6 event schema 分离，无消费关系。 | OPEN |
| quota / schedule | 调度门槛 | 网页 11:50 UTC 显示五小时 88%（4小时8分后重置）、周额度 66%（6天后重置）、113 credits；本批四分支更新已推送。 | MONITOR |

下批推送不得早于 12:01 UTC；仅允许快进到已有 PR 分支。PR #24、main 和 Release 未触碰。

## 历史风险快照（2026-10-14 11:26 UTC；GitHub checks 11:24 UTC）

| 风险 | 级别 | 责任与证据 | 状态 |
| --- | --- | --- | --- |
| #35 Guard quarantine | P0 | CLOSED 范围限同进程、同 Guard 实例且 callback 遵守 AbortSignal。 | CLOSED（范围有限） |
| #32 Hook interruption CI | P1 | #30/#37/#40/#47 的当前检查仍含旧 `spawnSync(1000ms)` 入口 marker 断言；M1 当前异步等待入口后再中断版本在 #43 通过相关矩阵。需窄范围向旧分支集成 M1 所有者测试修正。 | OPEN / CROSS-PR FIX PENDING |
| #44 approval expiry | P1 | #43 Ubuntu20/macOS20/macOS22 的精确到期测试失败；M1 已提交 `ca24d37`，将 1ms TTL 换为 60s 并固定当前时钟，保留拒绝、清理、callback=0。 | OPEN / LOCAL FIX |
| #39 honeypot quarantine expectation | P1 | #39 的 6 个测试矩阵因旧测试期待读取 resolve 而失败；M7 `c9a6b5c` 与 M1/M9 错误契约对齐，保留隔离与无副作用断言。 | OPEN / LOCAL FIX |
| #27 manifest / E4 | P1 | #36 远端 head `f125e70` 11/11；M9 本地 `ab382fe` 纳入 M1 exact-expiry 更新。verify 393/399、0 fail、6 环境跳过，package smoke 100 文件，E4 测试 12/12；外部 E4 未验证。 | OPEN / NEW M9 HEAD PENDING; EXTERNAL E4 NOT VERIFIED |
| #28 Gateway lifecycle | P1 | #36 远端 head 11/11；M7 `c9a6b5c` 与 M9 已有期望对齐，待 M7 新 head checks。 | OPEN / LOCAL FIX |
| #48 OBSERVE sensitive read | P1 | M9 当前远端 CI 11/11；M9 local `ab382fe` pending push; M5 PR #47 受旧 Hook 回归影响；敏感读取 hard DENY 未放宽。 | OPEN / NEW HEAD CI PENDING |
| #41 clean-VM install | P1 | 无可核实 clean VM 快照，未运行安装程序。 | HOLD / NOT VERIFIED |
| #45 native host Shell | P1 | 协议测试不能证明原生宿主已安装且 fail-closed；真实 Windows Desktop sentinel 验证仍缺。 | OPEN / UNPROTECTED |
| #46 canonical API contract | P2 | M0 维护唯一契约；M5/M6 event schema 分离，无消费关系。 | OPEN |
| M4 diagnostic truth | P2 | PR #34 9/9；既有 `69ec7f1` 定向 7/7。 | VERIFIED FOR REPORTED CHANGE |
| quota / scheduling | 调度门槛 | 网页约 11:24 UTC 实读五小时 95%、每周 67%、余额 113。 | MONITOR |

11:15:25 UTC 批次已完成。M1 `ca24d37`、M7 `c9a6b5c` 仅本地；下次推送不早于 11:35:25 UTC。main、PR #24 与 Release 未改动。

## 实时风险快照（2026-10-14 11:16 UTC；额度页 11:10 UTC 实读）

| 风险 | 级别 | 责任与证据 | 状态 |
| --- | --- | --- | --- |
| #35 Guard quarantine | P0 | CLOSED 范围限同进程、同 Guard 实例且 callback 遵守 AbortSignal。 | CLOSED（范围有限） |
| #32 Hook interruption | P1 | M1 新 head `4099ee3` 已推送；CI 排队/运行中，marker 历史根因仍 UNKNOWN。 | OPEN / CI PENDING |
| #44 approval expiry | P1 | M1 新 head `4099ee3` 含精确过期零 callback 回归，定向 2/2；#43 CI/M9 组合结果未完成。 | OPEN / CI PENDING |
| #48 OBSERVE sensitive read | P1 | M5 hard DENY 未放宽；M9 `f125e70` 已推送，#36 CI 运行中，尚无组合验收结论。 | OPEN / CI PENDING |
| #41 clean-VM install | P1 | M7 报告 `9088bd2` 无法核实干净快照，安装程序来源未验证；没有运行安装器。 | HOLD / NOT VERIFIED |
| #45 native host Shell | P1 | M2 `d9d775b` 已推送；Hook 协议测试不等于宿主集成，Codex Desktop 原生 Shell 仍 `UNPROTECTED / BLOCKED_NOT_VERIFIED`。 | OPEN / HOST EVIDENCE BLOCKED |
| #27 manifest / E4 | P1 | M9 新 head `f125e70` 已推送；本地 verify 393/399、0 fail、6 环境跳过，100-file package smoke；新 head CI 运行中，外部 E4 未验证。 | OPEN / CI PENDING |
| #28 Gateway lifecycle | P1 | M7 `9088bd2` 已推送；PR #39 checks queued/in progress，未报告失败或通过终结结果。 | OPEN / CI PENDING |
| #46 canonical API contract | P2 | M0 维护 canonical contract；M5/M6 events schema 分离，M6 当前不消费 M5 audit stream。 | OPEN |
| M4 diagnostic truth | P2 | 修复 `69ec7f1` 已推送，定向 7/7；PR #34 新 head checks 尚未结束。 | LOCAL FIX / CI PENDING |
| M9 combined acceptance | P1 | #36 新 head `f125e70`；11:16 UTC 已有 2 checks success、3 in progress、5 queued，未见 failure。 | IN PROGRESS |
| quota / scheduling | 调度门槛 | 网页 11:10 UTC 实读五小时 98%、4h48m 后重置、每周 68%、113 credits。 | MONITOR |
| worktree pointers | P2 | WSL Git worktrees 正常；M6 未跟踪 E4 原始运行目录保持未动。 | MONITOR |

11:15:25 UTC 完成一次 10 分支 fast-forward 批次；下批不得早于 11:35:25 UTC。main、PR #24 和 Release 未改动。VMware/真实模型/安装测试互斥，本轮未运行。

## 历史风险快照（2026-10-14 11:10 UTC；额度页 11:10 UTC 实读）

| 风险 | 级别 | 责任与证据 | 状态 |
| --- | --- | --- | --- |
| #35 Guard quarantine | P0 | Issue #35 CLOSED；证据限同进程、同 Guard 实例且 callback 遵守 AbortSignal，不覆盖跨进程/shared-store 或强制终止。 | CLOSED（范围有限） |
| #32 Hook interruption | P1 | PR #43 旧远端 head `f59ba37` 的 checks 通过；M1 本地 HEAD `4099ee3` 增加精确过期边界回归，但历史 marker 根因仍 UNKNOWN。 | OPEN / COMBINED CI PENDING |
| #44 approval expiry | P1 | M1 精确到期时断言 `EXPIRED`、清除 pending 且 callback 零调用；2 个定向过期测试通过。新测试尚未经过 PR head CI/M9 组合验收。 | OPEN / COMBINED CI PENDING |
| #48 OBSERVE sensitive read | P1 | M5 保留 hard DENY；PR #47 旧 head `cf4e2cd` 检查通过。M9 新组合 head CI 尚未运行，未确认真实数据泄露。 | OPEN / M9 CI PENDING |
| #41 clean-VM install | P1 | M7 `9088bd2` 报告无法核实干净 VM 快照，安装程序来源未验证；未运行安装或变更 VM。 | HOLD / NOT VERIFIED |
| #45 native host Shell | P1 | M2 协议测试不等于宿主集成；Codex Desktop 原生 Shell 仍 `UNPROTECTED / BLOCKED_NOT_VERIFIED`。Issue #45 已收到证据说明评论。 | OPEN / HOST EVIDENCE BLOCKED |
| #27 manifest / E4 | P1 | M9 `f125e70` 本地组合 `npm run verify` 393/399、0 失败、6 环境跳过，100 文件 package smoke；M6 外部 E4 仍 `NOT_VERIFIED`。 | OPEN / COMBINED CI PENDING |
| #28 Gateway lifecycle | P1 | M7 本地 `9088bd2` 和 M1 lifecycle 审核尚未进入当前 PR #39 远端 `5c7d95d` 的 CI。 | OPEN / CANDIDATE CI PENDING |
| #46 canonical API contract | P2 | M0 保持唯一 canonical contract；M5/M6 event schema 分离且 M6 当前不消费 M5 audit stream。 | OPEN |
| M4 diagnostic truth | P2 | M4 本地 `69ec7f1` 将 API 不可用状态显示为 null/null；定向测试 7/7。旧 PR #34 远端 `f301195` 不覆盖新提交。 | LOCAL FIX / CI PENDING |
| M9 combined acceptance | P1 | PR #36 远端 `996073a`；本地 `f125e70` 的 verify 393/399、package smoke 100 文件、E4 测试 12/12 均尚无新 head GitHub CI。 | LOCAL VERIFIED / REMOTE CI PENDING |
| quota / scheduling | 调度门槛 | 网页 11:10 UTC 实读五小时 98%、4h48m 后重置、每周 68%、113 credits。低于 5% 或读数不明时停所有开发/测试/浏览器/GitHub 操作。 | MONITOR |
| worktree pointers | P2 | AC3 子工作树由 WSL Git 管理。M6 未跟踪 `security-lab/e4-runs/20261013T114513Z/` 原样保留。 | MONITOR |

推送只使用已有 PR 分支的快进更新，不 force-push。main 与 PR #24 不变、不合并 Release。VMware、真实模型和安装测试互斥；本轮未运行其中任一项。fixture、CI 与本地组合验证不能替代原生 Shell、外部 E4 或 clean-VM 结果。

## 历史风险快照（2026-10-14 10:51 UTC；额度页 10:50 UTC 实读）

| 风险 | 级别 | 责任与证据 | 状态 |
| --- | --- | --- | --- |
| #35 Guard quarantine | P0 | Issue #35 CLOSED；证据限同进程、同 Guard 实例且 callback 遵守 AbortSignal。跨进程/shared-store 与强制终止不在证据内。 | CLOSED（范围有限） |
| #32 Hook interruption | P1 | PR #43 远端 f59ba37 精确 head 检查 9/9；历史 Hook marker 根因仍 UNKNOWN。M1 正在既有分支核对 #44 回归。 | OPEN / INTEGRATION PENDING |
| #44 approval expiry | P1 | M1 既有报告支持 expiry sweep 与测试观察时序竞争，未证明 Gateway 错误放行；当前追加核对零 callback 的确定性回归覆盖。 | OPEN / COMBINED CI PENDING |
| #48 OBSERVE sensitive read | P1 | PR #47 head cf4e2cd run 38527097304 9/9；敏感读取 hard DENY 不变，M1/M5 host wiring 与 M9 组合验收未闭合。未确认真实泄露。 | OPEN / M9 PENDING |
| #41 M7 reliability | P1 | PR #39 远端 5c7d95d 旧 head 检查 11/11；M7 报告提交 9088bd2 记录候选 VM 无可验证快照且需要密码，旧安装程序产物来源不明。未运行安装或改动 VM。 | HOLD / NOT VERIFIED |
| #45 native host Shell | P1 | PR #37 远端 cb84f43 检查 9/9；M2 正检查 Hook 可表达的失败关闭路径；不覆盖 Codex Desktop 原生 Shell。 | UNPROTECTED / OPEN |
| #27 manifest / E4 | P1 | M9 本地旧候选 5c11113 aggregate verify 391 pass/0 fail/6 环境跳过，100 文件 package smoke；组合 GitHub CI 未运行，M6 外部 E4 仍 NOT_VERIFIED。M7/M8 后续提交未纳入候选。 | OPEN / COMBINED CI PENDING |
| #28 Gateway lifecycle | P1 | M1 owner 审查通过 M7 候选中五个 M1 文件；代码候选 6d978a5、M7 当前提交 9088bd2。PR #39 远端仍 5c7d95d，该旧 head 11/11；新候选 CI pending。 | OPEN / OWNER-APPROVED LOCAL CANDIDATE |
| #46 canonical API contract | P2 | M0 维护唯一 canonical contract；M6 与 M5 event schema 分离且无消费关系。Issue #48 行为闭合仍待验收。 | OPEN |
| M4 diagnostic truth | P2 | M4 提交 69ec7f1 修复审计接口不可用时误导性 0/[]，定向测试 7/7。PR #34 远端旧 head f301195 9/9，不覆盖新提交；后端保护/E4 仍 UNKNOWN。 | LOCAL FIX / CI PENDING |
| M9 combined acceptance | P1 | 本地 integration HEAD 5c11113 相对 PR #36 远端 996073a 有 86 个提交差异、136 个文件改动；本地 verify 与 package smoke 通过但新 head CI 未运行；M7/M8 提交未纳入当前候选。 | LOCAL ONLY / REBASE REVIEW PENDING |
| worktree pointers | P2 | AC3 子工作树 .git 指针使用 WSL 绝对路径；对子工作树须用 WSL Git。根仓库 .git 可由 Windows Git Bash 用于 ref dry-run/推送；避免跨 runtime repair/prune。 | MONITOR |
| quota / scheduling | 调度门槛 | 网页 10:50 UTC 实读五小时 43%、约 9 分钟重置、每周 69%、余额 113。M1 和 M2 当前占用 2 个开发槽；VM/模型/安装互斥槽空闲。 | MONITOR |

VMware、真实模型和安装测试互斥。五小时额度低于 5% 或无法读取时，暂停所有开发、测试、浏览器和 GitHub 操作；确认额度重置后再继续。不得把 fixture、CI 或本地组合验证冒充真实 E4、原生 Shell 或 clean-VM 安装结果。
## 历史风险增量（2026-10-13 16:16 UTC）

| ID | 优先级 | 风险/证据 | 责任与当前动作 | 状态 |
| --- | --- | --- | --- | --- |
| R10 / #35 | P0 | ec3bc96 Guard/Gateway fix 在 PR #43 远端祖先中；current head 89e40cd 的回归测试及 9/9 CI 通过 | M1 确认所有验收标准并给 issue disposition；M0 已记录远端证据，保持 P0 门禁 | OWNER REVIEW |
| #32 | P1 | M1 PR #43 当前 9/9 checks 通过；历史 Windows Hook marker 根因/处置尚未由 owner 关闭 | M1 保留 fail-closed 断言并提交诊断结论 | OPEN |
| #44 | P1 | M1 PR #43 当前 9/9 checks 通过；approval-expiry 历史失败仍待 owner 明确结论 | M1 核对失效语义与请求追踪 | OPEN |
| R11 / #41 | P1 | PR #39 远端 head 65ce028 有 Windows Node20/22、macOS Node20、Windows wrapper 失败；本地 4f3a2c5+WIP 尚未过 CI | M7 推送后验证固定版本 NSIS 安装、编译和测试结果，保留全部门禁 | IN PROGRESS |
| R12 / #45 | P1 | PR #37 子进程范围通过；Codex 原生 Shell 仍 UNPROTECTED | M2 获槽后验证真实宿主 Hook，或如实维持 BLOCKED | OPEN |
| R3 / #27 | P1 | M5 无远端 PR，M6 外部 E4 NOT_VERIFIED，API 合同路径及 manifest 字段未组合验证 | M3/M5/M6/M7 按字段 owner 协调，再由 M9 检查组合 | OPEN |
| R5 | P1 | 本轮未读取其他 Codex 对话；codex queue 对 M1/M7 返回已排队回执，不证明已消费 | 进度只按 GitHub/worktree 交叉核对 | MONITOR |
| quota | P1（调度） | 16:16 UTC 可见读数 13%，约 1h12m 重置 | <=5% 或读数不明时全部暂停；实际低额度暂停须等确认重置 | MONITOR |

| ID | 优先级 | 风险 | 证据 | 责任/处置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| R10 | P1 | M1 PR #43 远端 quarantine 测试失败；同进程 owner 证据未获远端复验 | 远端 d0fd595/run 38399797819 子测试 217 失败；owner 报告本地 Windows Node 22 34/34（quarantine/abort/no-side-effect）；13:40 唯一 push 等 90 秒 exit 1、无文本，远端未变；跨进程未验证 | 保持 #35 P0 独立开放；等待 M1 可审查 head 与 CI，并单独审计历史 P0 的副作用路径 | IN PROGRESS |
| R1 | P1 | M6 package-smoke 本地修复未经过远端 CI | 旧 PR #31 远端 package-smoke 失败；本地 899dbf5 修 SOURCE_MANIFEST 中 package.json SHA，181 项 Git-tree 校验 0 mismatch；PR head 未更新 | M6 owner 发布授权后运行确切 CI job；#27 保持 OPEN | IN PROGRESS |
| R2 | P1 | M1 close 修复和 M7 reliability 变更尚未同一 AC3 集成验证 | M1 本地 Gateway tests 28/28；M7 旧远端 head `f17b7e6` 的 CI 失败，本地候选 `65ce028` 修正 Windows-only compiler check 和 symlink temp-root 处理；M1 commit 未包含在 M7 候选 | M1 保持 API owner；M7 仅改自有 workflow/test；统一候选后跑 Gateway/reliability/CI；#28/#35/#41 | IN PROGRESS |
| R3 | P1 | M3/M5/M6/M7 的共享 package.json 字段与各自 PR 组合结果仍待 AC3 验证 | #27 记录各字段 owner；M3 PR #33 c404b6b 的 9/9（含 package-smoke）通过且契约已补；M5 本地 9ec08d9 无 PR；M6 AC3 PR #38 有 Windows Node 22 测试失败，旧 PR #31 的本地 manifest 修复仍待远端重验；M7 本地 65ce028 未上传 | 字段 owner 最终组合，保留测试与策略；AC3 基线组合验证继续由 #27 跟踪 | IN PROGRESS |
| R9 | P1 | Windows Hook interruption 历史失败根因未知，owner Node20 复验尚缺 | PR #38 run 38397135538 的 Windows Node22 marker 断言失败；M6 本地同子测试1/1、整文件10/10；M1 本地Node22整文件10/10、重复5/5；Node20不可用。没有确定性修复或新提交 | M1 保留 fail-closed 断言；后续获得 Node20 环境时复验，CI失败 disposition 记录于 #32 | OPEN |
| R11 | P1 | M7 修复尚未进入 PR #39 的 CI | 远端 PR head f17b7e6 的 runs 38397157815/38397158016 失败；本地候选 65ce028 已完成但未上传，单次 push 因 non-interactive HTTPS 凭据不可用而被阻止 | 保持 #41 OPEN；不改凭据。Owner 有可用 GitHub 写权限后再发布既有候选并检查新 head CI | BLOCKED |
| R4 | P1（协调环境） | AC3 子工作树 .git 文件指向 WSL 绝对路径；Windows Git 对这些路径不可读，曾报告 not a git repository | M0 使用 WSL Git 管理各 worktree；根仓库 .git 使用 Windows Git Bash 执行远端 ref dry-run/快进推送 | 禁止跨 runtime repair/prune；每个 worktree 使用创建它的 runtime | OPEN |
| R5 | P1 | Desktop 没有原生线程读取/等待 API，任务快照有异步延迟 | M0 经用户许可只读本机 `thread_history` 并通过 `codex queue` 续作；再对照 worktree、GitHub Issue/PR。不能把它描述成调用 `read_thread` | M0 每次排期同时记录快照时间与 GitHub/文件证据；#29 | MONITOR |
| R6 | P2 | 原 `.gitignore` 未覆盖 `.env.*`、临时文件和协调输出 | baseline 检查仅有 `.env`、`*.log` 等 | 本 PR 增加相应模式；密钥仍需 PR/CI secret scanning | FIXED IN THIS PR |
| R7 | P2 | 桌面安全中心后端能力接口当前不可用 | M4 已完成 UI/API adapter，但 `/api/security-center`、`/api/e4/status` 返回 404；相应总防护与 E4 状态仍标为 UNKNOWN | M3/M4 后续按 API 合同接通实际后端；保留 UNKNOWN，不用 mock 覆盖 | OPEN |
| R8 | P2 | PR #24 为 Draft，base 是 readiness 分支，不是 main | GitHub PR 元信息 | 仅作状态对照；协调 PR Draft 指向 AC3，不合并 main、不发 Release | MONITOR |

## 安全边界

- 证据链没有独立可信锚、签名和独立时间戳时不能证明绝对防篡改。
- Gateway 文件读写才记录副作用 `VERIFIED`；命令/MCP/网络成功不是全部副作用证明。
- AI reviewer 只能拒绝/收紧；人工审批和宿主能力不能暴露成 agent 自助接口。
- E4 PASS 只覆盖声明的 artifact 与检查范围；缺失证据要标 UNKNOWN/NOT TESTED。

## 资源冲突

开发并行上限为 2；2026-10-13 16:16 UTC 时 M1/M7 占满 2/2 槽位。无 VMware 或真实模型测试运行证据；下一次安装测试归 M7 独占，PR #39 新 CI 尚未开始。额度 13%、约 1h12m 后重置。最新推送批次 16:02:40 UTC，下一批不早于 16:22:40 UTC。


## Latest risk delta — 2026-10-15 18:24 UTC

This checkpoint supersedes older risk entries in this file for the listed issues. Passing synthetic tests and CI do not establish product-host, package, installer, or independent E4 acceptance.

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| M1/M2/M5 file identity (#52) | P0 | M1 local commit `9ef3dc2` denies generic path-string file callbacks in strict mode; focused 20/20 and build/diff checks reported passing. M2 adapter remains synthetic and has no first-party product host consumer. Remote PR #43 has not yet advanced to the fix. | Publish M1 at the scheduled batch, pass exact-head CI, compose current M1/M2/M5, then demonstrate real host protected-open/handle behavior. Keep OPEN; TOCTOU NOT_VERIFIED. |
| Native Hook unpinned read (#55) | P1 | M3 PR #33 remains `be388029`; M9 run `38727481764` fails Ubuntu and Windows because unpinned native Read returns allow. | M3-owned deny with `native_file_execution_not_pinned`, preserve M1 assertions, add supported-capability positive control, rerun M9 on exact source SHAs. |
| Shared quarantine retry (#51) | P1 | M1 Node 20 and Node 22 x10 runs pass; M4 Ubuntu Node 20 run `38698635434` still has one `RETRY_LIMIT` failure after 500 busy retries. Root trigger UNKNOWN; no data loss shown. | Preserve tests/assertions and retry semantics; claim no root cause without new holder/timing evidence. |
| Packaged Hook privacy (#53) | P0 | Sanitized source-wrapper evidence exists; shipped package reachability and independent E4 are NOT_VERIFIED. No actual secret exposure is claimed. | Verify reachable packaged artifacts and independent E4; keep OPEN. |
| Native Codex Shell (#45) | P1 | M2 PR #37 checks do not prove Desktop-host interception; actual Shell remains UNPROTECTED. | Require host-enforced denial evidence; keep visible boundary. |
| Installer / E4 (#41 and M6) | P1 | M7 clean-VM lifecycle and independent M6 E4 remain NOT_VERIFIED. | Reserve the mutually exclusive VM/install resource and retain independently reviewable artifacts before PASS. |

## Latest integration risk delta — 2026-10-17 10:06 UTC

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| Shared Windows packaging / auto-E4 paths (#59) | P1 | PRs #38/#39/#40 differ on packaging files; M9 #36 has not recorded a confirmed canonical owner map. No security incident is established. | M6/M7/M8 confirm exact primary owners; M9 records selected SHAs and passes Windows package/auto-E4 checks. Keep the issue OPEN until exact-head evidence is attached. |
| M3 native unpinned Read composition (#55) | P1 | M3 #33 remains at `be388029`; M9 #36 remains at `de3799a`, with Ubuntu and Windows composition failures against the current M1 deny contract. | M3 preserves fail-closed denial and a supported-capability positive control; M9 pins exact current M1/M3 SHAs and reruns both platforms. |
| M4 shared quarantine retry (#51) | P1 | PR #34 has a current Ubuntu Node 20 `RETRY_LIMIT` failure after bounded retries; cause remains UNKNOWN. | Preserve tests and retry semantics; require lock-holder/timing evidence before claiming root cause. |
| M0/M9 ignore-rule divergence (#58) | P1 | The M0/M9 `git check-ignore` probes show missing secret/temp/workspace protections on M9; no leak is confirmed, and the scoped E4 evidence exception matches. | M9 reconciles the M0 rules on PR #36, preserves only reviewed exceptions, and posts exact check-ignore results. |
| M1/M5 security-router and store-test overlaps (#51/#52) | P0/P1 | Current M1/M5 PR heads have distinct router blobs; M5 also edits M1's canonical store test. Green individual CI does not prove shared semantics. | Obtain M1/M5 disposition and M9 exact-head composition; preserve deny-before-side-effect and retry assertions. |
| M1 Hook test copies (#56) | P2 | `test/agent-hook.test.ts` appears with distinct blobs across all module PRs, including M0 #30. | M1 defines canonical lineage; owners confirm adapters and keep M0 #30 Draft until its scope is reconciled. |

## Current integration risk snapshot — 2026-10-17 13:09 UTC

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| Product-host protected file execution (#52) | P0 | M1/M5 source and synthetic alias checks exist, but a first-party host consuming the held protected object, handle identity, and TOCTOU behavior are NOT_VERIFIED. | Prove the supported host call path, M1 held-object enforcement, M2 adapter, M5 DENY precedence, and exact-head M9 composition. Keep OPEN until host evidence passes. |
| Packaged Hook-log privacy (#53) | P0 | No actual pinned Setup.exe/manifest, extracted-Hook comparison, or extracted-harness evidence is recorded. Source checks do not prove packaged reachability; no leak is confirmed. | M6/M7/M8 select exact owner-controlled refs; reserve the exclusive installer/VM slot; verify hashes, byte provenance, and sanitized canary outcome. |
| Native Hook unpinned Read (#55) | P1 | M3 #33 `be388029` still disagrees with M1 deny; M9 run `38727481764` fails Ubuntu and Windows and uses a stale M1 pin. | M3 denies and preserves a supported-capability positive control; M9 pins current M1/M3 exact SHAs and passes both composition jobs. |
| Quarantine store retry (#51) | P1 | M4 #34 exact head run `38698635434` exhausts 500 bounded retries in test 163; that PR does not change the failing test. Root trigger UNKNOWN; no data loss established. | M1/M5 resolve test ownership and diagnose with evidence; keep retry bounds and assertions unchanged until a reproduced root cause supports a fix. |
| Ignore-rule drift (#58) | P1 | M9 `.gitignore` lacks reviewed M0 secret/temp/workspace rules; its scoped E4 raw-log exception matches. No committed leak is confirmed. | M9 reconciles on existing PR #36, verifies representative paths and intentional E4 paths, and posts exact evidence. |
| Windows packaging/auto-E4 path overlap (#59) | P1 | M6/M7/M8 packaging files differ; the proposed owner split has no module confirmation. | Obtain exact path-owner dispositions, then have M9 pin the selected SHAs and pass combined package/E4 checks. |
| Clean-VM lifecycle / Native Shell / independent E4 (#41/#45/#57) | P1 | Clean-VM lifecycle and independent product E4 are NOT_VERIFIED; native Codex Shell remains UNPROTECTED. | Preserve visible boundaries; obtain supported-host/runtime or reserved installer/E4 evidence before PASS. |
| Historical Windows Node 22 retry (#54) | P1 | Current ordinary Windows check passes, but historical HTTP 503 trigger remains UNKNOWN. | Keep bounded retries and sanitized diagnostics; require owner/root-cause evidence. |
| Canonical Hook test overlap (#56) | P2 | Current Draft PRs contain distinct `test/agent-hook.test.ts` blobs; M1 is canonical owner. | Obtain M1 lineage/adapter disposition and reconcile M0's shared-path diff before marking PR #30 ready. |
| Release boundary (#24) | M0 | PR #24 remains OPEN/Draft and unchanged; PR #30 is OPEN/Draft. No merge or Release occurred. | Keep both Draft and preserve the no-main-merge/no-Release boundary. |

The current #29 readback has no owner-confirmed active task or exclusive installer/VM/model reservation. M3 #55 and M9 #58 remain requested, not confirmed RUNNING. Activity in other Codex sessions is UNKNOWN; do not infer it from issue comments or unchanged PR heads.

## Current integration risk snapshot — 2026-10-17 14:28 UTC

This snapshot uses exact PR/issue and inspected worktree evidence through the 14:20 UTC owner check. Earlier snapshots are retained as history. In particular, the earlier description of M6/M9 raw.log exceptions as scoped is superseded: their current PR diffs contain a blanket negation for all E4 raw.log files.

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Protected file/host boundary (#52) | P0 / M1, M2, M5, M9 | M1 held-object and M5 deny source paths exist; M2 has no first-party product-host wiring. M3 alias path is a static risk only; no exposure is confirmed. OPEN / NOT_VERIFIED. | Supported host protected-open, held-object identity, alias/path-replacement denial, current exact-head composition. |
| Packaged Hook privacy (#53) | P0 / M6, M7, M8, M9 | M8 source logs fixed decision metadata and has a synthetic co-located payload/caller-canary fixture. Real Setup.exe, manifest, extracted bytes, and installed behavior are NOT_VERIFIED. No leak is confirmed. | Real artifact hashes, extraction identity, sanitized installed-harness result. |
| Native Codex Shell (#45) | P1 / M2 | Candidate Hook not installed at repository root; active Desktop host and invocation telemetry UNKNOWN. UNPROTECTED / BLOCKED_NOT_VERIFIED. | Actual host invocation/sentinel or named unsupported-host blocker. |
| Quarantine retry (#51) | P1 / M1, M5 | M4 #34 run 38698635434 has one Ubuntu Node 20 RETRY_LIMIT after 500 bounded STATE_STORE_BUSY retries; trigger UNKNOWN, no data loss. | M1 reproducible lock/timing diagnosis or explicit blocker; preserve tests and retry bounds. |
| Native Hook read/alias (#55) | P1 / M3, M9 | M3 #33 allows unpinned native Read at source level; M9 run 38727481764 fails Ubuntu/Windows deny expectation with stale M1 pin. No host exposure is established. | M3 fail-closed correction and exact-head M9 rerun. |
| Ignore-rule divergence (#58) | P1 / M0, M6, M9 | M0 PR #30 has one exact reviewed E4 log exception; M6 #38 and M9 #36 still have a blanket raw.log negation. One current log had no common credential/PII-pattern matches; future output is unverified. No leak is confirmed. | M6/M9 align to M0 path-specific rule or reviewed sanitized export; preserve global log ignore. |
| Windows/auto-E4 path ownership (#59) | P1 / M6, M7, M8, M9 | Changed-path overlaps across #36/#38/#39/#40 are recorded in #59; owner split remains unconfirmed. | Each owner confirms exact paths, adapter/reviewer, and M9 consumption plan. |
| Clean-VM / external E4 (#41/#57) | P1 / M7, M6 | Actual clean-VM lifecycle and independent external E4 remain NOT_VERIFIED. | Exclusive installer/VM reservation and independently reviewable artifacts. |
| Historical provider retry (#54) | P1 / M6, M9 | Current Windows Node 22 check passes; historical 503 trigger remains UNKNOWN. | Keep bounded retries; assign provider/transport ownership before edits. |
| Shared Hook test (#56) | P2 / M1 and consuming modules | M1/M3 test blobs encode different unpinned-Read behavior; no tests were removed or weakened. | M1 canonical disposition and owner-approved adapters; keep PR #30 Draft pending its shared-path scope. |

At the 14:20 UTC scheduler readback, no owner-confirmed task or exclusive VMware/real-model/installer reservation was visible. PR #24 remains OPEN/Draft and unchanged. M0 PR #30 head d341932c3cfb589b3fe3ed6cb5ae3c761001f8e7 passed 10/10 exact-head checks; those checks do not close any product/host/installer/E4 gate.

## M4 desktop security-center CI risk — 2026-10-18 00:49 UTC

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| M4 PR #34 exact-head CI (#60) | P1 / M4 integration; M1 owns the shared failing test | Unchanged head `fbf2090` has one actual failed job in `38698635434`: Ubuntu Node 20 test 163 (`RETRY_LIMIT` in M1-owned file-store test, #51). Ubuntu Node 22, Docker, sponsor-smoke passed; macOS/Windows cancelled after fail-fast; package-smoke skipped. Trigger UNKNOWN; no M4 cause or incident inferred. | M1 resolves/diagnoses #51; M4 supplies exact worktree and focused console tests; then rerun full exact-head matrix and package-smoke. Reconcile shared Hook test via #56; keep PR #34 Draft. |

Do not conflate this CI gate with M1 quarantine retry diagnosis #51; preserve all assertions and unsupported/unknown states.

## M9 composition and owner-response risk — 2026-10-18 01:20 UTC

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| M9 exact-head security composition (#55) | P1 / M3 + M9; M1 contract owner | PR #36 head `de3799a` product CI 9/9 and wrapper 2/2 pass, but composition run `38727481764` fails on Ubuntu and Windows. The tracked issue identifies an unpinned native Read contract mismatch; no M3/M9 head change is visible. | M3 preserves explicit deny for unpinned reads and a supported-capability positive control; M9 pins reviewed M1/M3 refs and reruns exact composition. |
| Remaining M9 release gates (#52/#53/#58/#59/#41/#57) | P0/P1 / M1–M9 owners by issue | Open issues still require protected-path/host evidence, real packaged-Hook evidence, reviewed ignore rules, M6–M8 shared-path ownership, clean-VM lifecycle, and independent E4. | Keep M9 Draft; do not mark final integration PASS until each owner-specific artifact/check is recorded. |

This checkpoint does not infer a production bypass, leak, data loss, successful installation, or independent E4 result.
## M0 integration risk update — 2026-10-18 02:20 UTC

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| M5 protected-path alias and shared-file contract (#52) | P0 / M5 implementation, M1 canonical contract, M9 composition | PR #47 head 373e2c2 product CI 9/9 including package-smoke; synthetic alias fixtures are documented. PR #47 also changes M1-owned router and shared test paths. Product-host wiring, held-object use, TOCTOU, and M1 disposition are NOT_VERIFIED/pending. No actual exposure is claimed. | M1 reviews shared-path semantics; M5 preserves hard denials and owner boundaries; M9 runs exact-head composition and records host evidence. Keep OPEN. |
| M1/M4/M5 shared Hook tests (#56) | P2 / M1 canonical owner; M0 coordination | PR #30, #34, and #47 change M1-owned test/agent-hook.test.ts; M5 copy differs from M1 current head. | M1 records canonical test disposition; keep #30 Draft until its diff and scope are reconciled. |
| M9 cross-module composition (#55 and #36) | P1 / M3 + M9; M1 interface owner | PR #36 product CI 9/9 and wrapper 2/2 pass; composition run 38727481764 still fails on Ubuntu and Windows. | M3 preserves fail-closed unpinned-read behavior and positive control; M9 pins reviewed heads and reruns both composition jobs. Do not mark integration PASS. |

This checkpoint does not establish a production bypass, sensitive-data exposure, successful host integration, installer acceptance, or independent E4 result.

## M0 P0 evidence checkpoint — 2026-10-18 05:16 UTC

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Protected-path alias / first-party host enforcement (#52) | P0 / M1 contract, M2 host adapter, M5 policy, M9 composition | Read-only audit reports synthetic junction denial with `verifyRealPaths` enabled, but M2 PR #37's adapter call is only in a check harness and does not add a core host callsite. Baseline `src/agent-integrations.ts:31` marks native tools OUT_OF_SCOPE. Real host use, protected-open/held-object, and TOCTOU remain NOT_VERIFIED. No real bypass is asserted. | M2 supplies the actual host consumer/path and protected-object evidence; M1 reviews any contract change; M9 reruns exact reviewed heads. Keep OPEN. |
| Sensitive Hook log data in shipped package (#53) | P0 / M7 package evidence, M8 docs/source, M9 acceptance | Current Windows verifier uses a synthetic temp payload, compiles only, reports `installerExecuted=false`, and deletes the output; workflow has no artifact upload. An older unsigned candidate.3 hash exists without a tracked Setup.exe and with GUI install NOT_VERIFIED. No current extracted-Hook proof or real disclosure is established. | M7 uses the scheduled installer/VM slot to locate/build only from authentic inputs and capture sanitized, hash-bound evidence or name the missing artifact; M8 owns any Hook-source correction. Keep OPEN. |

M1 + M3 reached the 05:20 UTC boundary. At 05:40, no new M2/M7 PR head or owner evidence was visible; those lanes continued through 06:00. At 06:00 no M2/M7 result was visible, so M2 was paused and M1 owned #52 through 06:20 while M7 continued #53. At 06:20 M1's registered worktree was still clean and no owner result was visible; M1 is paused with work preserved, M2 resumed #52 through 06:40, and M7 retained the exclusive installer/VM slot. At 06:40 no M2/M7 result was visible; both are paused by schedule with work preserved, and the installer/VM slot is released. M1 now works #51 and M8 works the source/logging half of #53 through 07:00. No P0 gate is closed by synthetic tests or source inspection.
## M0 #52 host-integration scheduling update — 2026-10-18 03:00 UTC

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| First-party host use of execution isolation (#52) | P0 / M2 adapter + host integration; M1 Gateway contract; M5 policy; M9 composition | M5 PR #47 alias/path fix has exact-head CI 9/9. No M2 worktree or new M2 implementation is verified in the inspected clone; held-object use, protected-open, and TOCTOU remain NOT_VERIFIED. | M2 confirms existing path and wires through the current M1 contract; M1 reviews any public interface change; M9 runs exact-head composition. Keep OPEN. |

No production bypass or real exposure is claimed. Synthetic path-alias evidence is not host-enforcement acceptance.
## M0 cross-module status — 2026-10-18 03:40 UTC

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Unpinned native Hook read (#55) | P1 / M3 behavior, M1 contract, M9 composition | M3 #33 head be388029 exact CI passes 9/9, but the branch-local contract allows an unpinned normal Read; M1 requires native_file_execution_not_pinned denial. M9 run 38727481764 fails Ubuntu/Windows. | M3-owned fail-closed correction plus supported-capability positive control; M9 repins reviewed M3 SHA and reruns both composition jobs. Preserve M1 tests; keep #55 OPEN. |
| First-party isolated host (#52) | P0 / M2 adapter, M1 Gateway, M5 policy, M9 composition | M5 #47 is green 9/9. M2 path and host consumer remain unverified; protected-open/held-handle and TOCTOU remain NOT_VERIFIED. | Resume M2 after exact existing path is reported; use current M1 contract; M9 composition and host evidence required. Keep #52 OPEN. |

No production bypass, real disclosure, or installed-host enforcement is claimed.

## M0 07:00 UTC cross-module risk checkpoint — 2026-10-18

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| First-party host enforcement for protected paths (#52) | P0 / M2 host adapter, M1 Gateway contract, M5 policy, M9 composition | Adapter call remains in a synthetic/check harness. First-party host callsite, protected-open/held-object, and TOCTOU are NOT_VERIFIED. No real bypass is claimed. | M2 supplies the exact consumer and deny-before-callback proof or named missing owner/path; M1 reviews contract changes; M9 composes exact reviewed SHAs. |
| Caller data in packaged Hook logs (#53) | P0 / M7 package evidence, M8 source/logging, M9 acceptance | Source wrapper logs fixed fields and current reason tokens are static; no caller-data leak was reproduced. Actual Setup.exe/manifest/extracted-Hook evidence is still absent. | M7 provides hash-bound artifact and harness evidence or precise blocker. Do not treat source tests as package acceptance. |
| M6–M8 Windows packaging overlap (#59) | P1 / M6 E4, M7 packaging, M8 docs/Hook copy, M9 composition | No exact path-owner acceptance is visible; M9 composition run 38727481764 failed on Ubuntu and Windows at the current recorded refs. | Owners confirm exact canonical paths and M9 pins the reviewed SHAs before composition rerun. Preserve each module's tests and semantics. |

No production bypass, real disclosure, data loss, successful installation, or independent E4 result is inferred by this checkpoint.

## M0 exact-head M9 readiness checkpoint — 2026-10-18 11:18 UTC

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Protected-path first-party host enforcement (#52) | P0 / M2 adapter, M3 host integration, M1 Gateway contract, M5 policy, M9 | M3 PR #33 contains a Gateway-backed synthetic MCP self-test at `src/codex-connection-mcp.ts:21,35`, but it uses `files: []` and fixed callbacks; M3 `src/agent-integrations.ts:64,69` marks native tools OUT_OF_SCOPE. M2 adapter invocations remain check-script-only. No protected user-file host route is proven. | M3 host -> M5 router -> M2 fixed-resource adapter -> M1 held-file dispatch; prove alias deny-before-callback and unchanged target bytes, or name the exact missing API/owner. Keep OPEN / NOT_VERIFIED. |
| Caller data in packaged Hook logs (#53) | P0 / M7 packaging, M8 Hook copy, M9 acceptance | A published candidate4 Community ZIP input and pinned toolchain hashes are available, but no current M7-built Setup.exe, manifest, extracted-Hook comparison, or packaged harness readback is visible. | M7 supplies its own exact-source hash-bound build and extraction chain. Published candidate4 assets are inputs, not M7 acceptance evidence. Keep OPEN / NOT_VERIFIED. |
| M9 cross-module native Read gate (#55/#36) | P1 / M3 Hook, M1 contract, M9 | M9 head `de3799a`; run `38727481764` fails Windows and Ubuntu because M3's unpinned normal Read returns allow instead of deny. The workflow pins M1 `b1d7423`, stale vs current PR #43 `9ef3dc2`. | M3 preserves the denial assertion and positive control; M9 then updates to exact reviewed heads and reruns both platforms. |
| M6–M8 packaging ownership/pins (#59) | P1 / M6 E4, M7 packaging, M8 docs/copies, M9 | No visible per-path owner/reviewer confirmation from M8 or affected M6/M7 owners. Current M6/M7/M8 heads remain #38 `c1fdf3c`, #39 `cf4b70f`, and #40 `c1ff677`. | Confirm primary owner and reviewer per intersecting path, then M9 consumes exact reviewed SHAs. Do not infer signoff from CI. |
| Root secret/temp ignore rules in M9 (#58) | P1 / M0 canonical rules, M9 integration | Current M9 diff still lacks the complete reviewed M0 secret/temp set; M0's narrow historical log exception does not establish broad log safety. No leak is confirmed. | M9 reconciles root rules while retaining only path-specific sanitized evidence exceptions; verify representative paths on exact head. |
| M4 exact-head desktop checks (#60) | P1 / M4 UI/tests, M1 shared Hook test | PR #34 head `fbf2090`; run `38698635434` has one M1-owned Ubuntu Node 20 test failure, with other platform checks cancelled/passed and package-smoke skipped. No M4 causation is established. | M4 supplies focused M4-owned behavior evidence; rerun exact-head matrix after M1 resolves #51. |

No production bypass, sensitive disclosure, successful package installation, external E4 acceptance, or fully green M9 composition is inferred by this checkpoint.

## M0 07:20 UTC integration readiness checkpoint — 2026-10-18

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Protected-path host enforcement (#52) | P0 / M2, M1, M5, M9 | M2's synthetic adapter harness remains the only verified adapter callsite; first-party host/open-object/TOCTOU evidence is absent. | Keep NOT_VERIFIED; require exact host callsite and deny-before-callback proof or named blocker, then exact-head M9 composition. |
| Packaged Hook log privacy (#53) | P0 / M7, M8, M9 | Source wrapper uses fixed-field JSONL and current reason tokens; no caller-data leak reproduced. Current Setup.exe/manifest/extracted-Hook proof remains absent. | M7 must supply hash-bound package evidence or precise blocker; package and isolated VM gates stay open. |
| M6–M8 shared Windows/E4 paths (#59) | P1 / M6, M7, M8, M9 | No exact owner acceptance is visible; M9 composition remains failed on Ubuntu/Windows at recorded refs. | M6 confirms E4 files; M7 confirms installer paths; M8 confirms docs/Hook copy; M9 pins reviewed exact SHAs. Preserve each module's checks and semantics. |
| M3 native Hook unpinned-read contract (#55) | P1 / M3, M1, M9 | PR #33 current head be388029 does not yet have the requested owner correction; prior M9 run reports expected deny / actual allow. | M3-owned fix plus supported-capability positive control; rerun exact reviewed heads in M9 without changing the assertion. |

No production bypass, real disclosure, data loss, successful installation, or independent E4 result is inferred.

## M0 07:40 UTC integration gate audit — 2026-10-18

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| M9 composition exact-source pin (#36/#55) | P1 / M9 integration, M1 contract, M3 Hook | M9 workflow checks out M1 ancestor b1d7423, not current PR #43 head 9ef3dc2; M3 pin be388029 matches PR #33. Prior run 38727481764 fails both platforms and does not prove exact-current-M1 behavior. | M9 reruns unchanged assertions against exact current reviewed heads and records all SHAs; M3 supplies native_file_execution_not_pinned deny plus positive control. |
| M6–M8 Windows/E4 ownership (#59) | P1 / M6 E4, M7 packaging, M8 docs/Hook copy, M9 | PR file lists confirm shared packaging/test paths; no owner acceptance is visible. M1 retains canonical Hook wrapper/test semantics. | M6 confirms E4 paths; M7 owns installer semantics; M8 names its exact copies/adapters; M9 consumes reviewed refs. No transfer inferred. |
| Quarantine retry exhaustion (#51) | P1 / M1 store, M4 CI, M9 | Historical four-process test exhausted 500 STATE_STORE_BUSY retries; trigger remains UNKNOWN. | M1 provides a bounded current-head reproduction/diagnostic without changing production locks or retry cap. |

No production bypass, real disclosure, data loss, successful installation, or independent E4 result is inferred.

## M0 08:00 UTC integration gate checkpoint — 2026-10-18

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Protected-path first-party host enforcement (#52) | P0 / M2 host adapter, M1 Gateway contract, M5 policy, M9 composition | PR #37 remains at `9db59ed`; only the synthetic/check harness is verified. No first-party callsite or deny-before-callback evidence is visible. | M2 supplies the exact host consumer and alias-denial evidence, or names the missing path/API/owner. Preserve fail-closed behavior and module ownership. Keep OPEN / NOT_VERIFIED. |
| Caller data in packaged Hook logs (#53) | P0 / M7 package evidence, M8 source/logging, M9 acceptance | PR #39 remains at `cf4b70f`; current hash-bound Setup.exe, manifest, and extracted-Hook comparison remain absent. Static/source checks do not establish package acceptance. | M7 supplies current artifact provenance and extraction evidence or the precise blocker. No install on the daily host. Keep OPEN / NOT_VERIFIED. |
| M6–M8 Windows packaging/E4 path ownership (#59) | P1 / M6 E4, M7 packaging, M8 docs/Hook copy, M9 composition | No exact owner acceptance is visible; PR #38/#39/#40 shared paths remain unresolved. M9 composition must consume exact reviewed refs. | Confirm canonical owners, adapter/reviewer boundaries, and exact M9 SHAs; no ownership transfer by inference. |
| Quarantine concurrency retry exhaustion (#51) | P1 / M1 store, M4 CI, M9 | Historical 4-process × 12-call test exhausted 500 retries on Ubuntu Node 20; current trigger remains UNKNOWN. | M1 supplies the bounded diagnostic/result while preserving all assertions, locks, fail-closed behavior, and retry cap. |

No production bypass, real disclosure, data loss, successful installation, or independent E4 result is inferred by this checkpoint.

## M0 08:20 UTC integration gate checkpoint — 2026-10-18

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Protected-path first-party host enforcement (#52) | P0 / M2 host adapter, M1 Gateway contract, M5 policy, M9 composition | No new public result during M2's 08:00–08:20 lane; PR #37 remains `9db59ed`. Synthetic adapter checks do not prove first-party host enforcement. | Keep OPEN / NOT_VERIFIED; require exact host callsite and deny-before-callback proof or named missing owner/path. |
| Caller data in packaged Hook logs (#53) | P0 / M7 package evidence, M8 source/logging, M9 acceptance | No new package result during M7's 08:00–08:20 lane; PR #39 remains `cf4b70f`. Current package/manifest/extracted-Hook chain remains unverified. | Keep OPEN / NOT_VERIFIED; require current hash-bound artifact evidence or a precise blocker. No daily-host install. |
| Unpinned native Hook read (#55) | P1 / M3 behavior, M1 contract, M9 composition | PR #33 remains `be38802`; required unpinned normal Read denial and supported positive-control result are not newly verified. | M3 implements the exact denial and preserves assertions; M9 consumes the reviewed SHA and reruns unchanged composition. |
| M6–M8 Windows/E4 ownership (#59) | P1 / M6 E4, M7 packaging, M8 docs/Hook copy, M9 | Exact path ownership remains unresolved; PR #38 remains `c1fdf3c`. | M6 confirms per-path primary owner/reviewer and M9 exact-SHA plan; preserve M7 installer and M1 Hook boundaries. |

No production bypass, real disclosure, data loss, successful installation, or independent E4 result is inferred by this checkpoint.

## M0 quota-gate recovery — 2026-10-18 08:27 UTC

- The 08:25 quota read timed out twice and screenshot fallback was rejected, so the planned M0 push was held and M3/M6 were sent emergency stop messages. The existing Usage tab recovered at 08:27 UTC and showed 64% five-hour / 94% weekly; the remaining 08:20–08:40 M3/M6 slot was resumed. Queue delivery is not proof of work start.
- Pause receipts: M3 `01a14e1f-2393-7910-a54b-094b8e44bb9d`, M6 `01a14e1f-25fc-7891-a6ea-8ed8959d98d9`. Resume receipts: M3 `01a14e20-16a8-7290-a844-fb7671c3e59b`, M6 `01a14e20-18e8-7a13-948c-086bc64ac4ff`.
- No module source or PR #24 change occurred during the gate. The M0 docs batch remains local pending fresh push preflight; last M0 push is 08:05 UTC.

## M0 08:40 UTC integration gate checkpoint — 2026-10-18

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Protected-path first-party host enforcement (#52) | P0 / M2 host adapter, M1 Gateway contract, M5 policy, M9 composition | No new public evidence in M2's prior lane; PR #37 remains `9db59ed`. A synthetic harness is not a product host callsite. | M2 implements the M2-owned call path with deny-before-callback alias proof or identifies the exact absent host API/owner. Keep OPEN / NOT_VERIFIED. |
| Caller data in packaged Hook logs (#53) | P0 / M7 package evidence, M8 source/logging, M9 acceptance | No new package evidence in M7's prior lane; PR #39 remains `cf4b70f`. Current artifact provenance and extracted-Hook comparison remain absent. | M7 supplies current hash-bound artifact chain or precise blocker and owner deliverable. No daily-host install. Keep OPEN / NOT_VERIFIED. |
| Unpinned native Hook read (#55) | P1 / M3 behavior, M1 contract, M9 composition | No new PR #33 result; required denial and positive-control proof remain unverified. | Resume M3 for the exact policy-preserving fix and rerun M9 against reviewed exact heads. |
| M6–M8 Windows/E4 ownership (#59) | P1 / M6 E4, M7 packaging, M8 docs/Hook copy, M9 | No new M6 owner confirmation; M9 exact reviewed refs still depend on explicit path responsibility. | Preserve ownership boundaries and require exact per-path owner/reviewer plus M9 pin plan. |

No production bypass, real disclosure, data loss, successful installation, or independent E4 result is inferred by this checkpoint.

## M0 09:02 UTC integration gate checkpoint — 2026-10-18

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Protected-path first-party host enforcement (#52) | P0 / M2 host adapter, M1 Gateway contract, M5 policy, M9 composition | No visible M2 PR/Issue result in the 08:40–09:00 lane; PR #37 remains `9db59ed`. A synthetic harness is insufficient. | Keep OPEN / NOT_VERIFIED until real host callsite and deny-before-callback alias proof or exact missing API/owner. |
| Caller data in packaged Hook logs (#53) | P0 / M7 package evidence, M8 source/logging, M9 acceptance | No visible M7 package result in the 08:40–09:00 lane; PR #39 remains `cf4b70f`. Current artifact provenance/extracted-Hook chain remains unverified. | Keep OPEN / NOT_VERIFIED until hash-bound package and extracted-Hook evidence or precise blocker. |
| Quarantine concurrency retry exhaustion (#51) | P1 / M1 store, M4 CI, M9 | Historical Ubuntu Node20 4x12 run exhausted 500 retries; current trigger remains UNKNOWN. | M1 runs current exact test with bounded diagnostics without changing locks, assertions, fail-closed behavior, or retry cap. |
| M6–M8 Windows/E4 path ownership (#59) | P1 / M6 E4, M7 packaging, M8 docs/Hook copy, M9 | Exact M8 path-owner confirmation remains absent; M9 exact reviewed pins depend on explicit ownership. | M8 names its precise paths/adapters; M6/M7 retain E4/installer ownership; M9 pins reviewed exact SHAs. |

No production bypass, real disclosure, data loss, successful installation, or independent E4 result is inferred by this checkpoint.

## M0 quota-gate recovery — 2026-10-18 09:11 UTC

- The 09:10 pre-push Usage read timed out, so the planned push was held and M1/M8 received a temporary stop message. After switching back to the existing Usage tab, a fresh read at about 09:11 showed 64% five-hour / 94% weekly; M1/M8 resumed the remainder of their current slot, preserving their work.
- Pause receipts: M1 `01a14e47-3b66-75b1-9e54-dcb99b736b65`, M8 `01a14e47-3da4-7f72-ad17-73ebced603b6`. Resume receipts: M1 `01a14e48-393c-7ad0-90f7-a843f17f2439`, M8 `01a14e48-3b71-7dc2-99e1-392b5b1040d6`. Delivery does not prove task start.
- No module source or PR #24 write occurred during the gate. The M0 documentation batch may continue only after fresh quota and PR/ref/scope preflight.

## M0 09:26 UTC integration gate checkpoint — 2026-10-18

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Protected-path first-party host enforcement (#52) | P0 / M2 host adapter, M1 Gateway contract, M5 policy, M9 composition | No visible M2 result; PR #37 remains `9db59ed`. Synthetic harness is insufficient for first-party host enforcement. | Keep OPEN / NOT_VERIFIED until a real host callsite and deny-before-callback alias proof or exact missing API/owner. |
| Caller data in packaged Hook logs (#53) | P0 / M7 package evidence, M8 source/logging, M9 acceptance | No visible M7 artifact; PR #39 remains `cf4b70f`. Current hash-bound artifact/manifest/extracted-Hook chain remains absent. | Keep OPEN / NOT_VERIFIED until current package evidence or precise blocker. |
| Quarantine concurrency retry exhaustion (#51) | P1 / M1 store, M4 CI, M9 | Run `38698635434` has one actual failed Ubuntu Node 20 test 163; macOS/Windows Node 20/22 were cancelled, Ubuntu Node 22 passed. Trigger remains UNKNOWN. | M1 provides current exact-run bounded diagnostics; preserve locks, assertions, fail-closed behavior, and 500 cap. |
| Unpinned native Hook read (#55) | P1 / M3 behavior, M1 contract, M9 composition | PR #33 still lacks visible exact correction/positive-control result. | M3-owned denial with exact reason and supported positive control; M9 consumes reviewed exact SHA. |
| M4 security center exact-head verification (#60) | P1 / M4 UI/tests, M1 shared Hook test, M0 gate | PR #34 run has one M1-owned Ubuntu Node 20 failure; remaining platform checks were cancelled or passed, package-smoke skipped. No M4 causation established. | M4 provides focused M4-owned test evidence without editing M1 shared files; full exact-head matrix only after #51 owner resolves. |
| M6–M8 Windows/E4 ownership (#59) | P1 / M6 E4, M7 packaging, M8 docs/Hook copy, M9 | M8 path-owner result remains absent; exact reviewed refs still need owner acceptance. | M8 names exact paths/adapters; M6/M7 retain E4/installer semantics; M9 pins reviewed exact SHAs. |

No production bypass, real disclosure, data loss, successful installation, or independent E4 result is inferred by this checkpoint.

## M0 exact-head CI update — 2026-10-18 11:50 UTC

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Quarantine concurrency retry exhaustion (#51) | P1 / M1 store, M4 exact-head CI, M0 coordination | M0 PR #30 head `a1b0f8da79f9c0c3cd5e9dea365a0ab07928364e` run `39124717837` failed Ubuntu 24.04 / Node 22.23.3 test 163 in `test/file-state-store.test.ts`: 500 `STATE_STORE_BUSY` retries reached `RETRY_LIMIT`; build passed, 321 passed / 1 failed / 4 skipped. Other Node matrix jobs were cancelled and package-smoke skipped by fail-fast; sponsor-smoke, docker-build, and ownership check passed. No data loss or corruption is established. | Keep OPEN/P1; M1 preserves the retry cap, assertions, production lock and fail-closed behavior, and compares exact failure timing/lock diagnostics before any implementation change. |## M0 11:58 UTC active-lane checkpoint — 2026-10-18

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Protected-path first-party host enforcement (#52) | P0 / M2 adapter, M3 host, M1 Gateway, M5 policy, M9 | The 11:38–11:58 M2/M3 slot ended without visible PR-head or Issue-result movement; private workspace activity remains UNKNOWN. M3 is paused by schedule, M2 continues in its owned adapter path. | M2 provides its exact seam/tests or a precise contract blocker; M3 later consumes the seam in its owned host path. Keep OPEN/P0/NOT_VERIFIED until deny-before-callback alias evidence and a registered-file positive control are composed. |
| Caller data in packaged Hook logs (#53) | P0 / M7 package, M8 Hook copy, M9 acceptance | M7 is assigned a build-only provenance chain using the published candidate4 ZIP and pinned official NSIS/Node inputs. No fresh Setup.exe/manifest/extracted-Hook chain is yet verified. | Require source/input/tool hashes, exact Setup.exe hash, manifest, extracted Hook comparison, and packaged harness result. No install, VM, or VMware run is reserved. Keep OPEN/P0/NOT_VERIFIED. |

## M0 M9 composition status — 2026-10-18 12:04 UTC

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Exact-ref M9 security composition (#36/#55) | P1 / M3 Hook, M1 contract, M9 workflow | Current PR #36 head de3799a has 11/13 checks green; both compose-current-module-refs jobs fail in run 38727481764 (Ubuntu and Windows). The reproduced mismatch remains M3 unpinned native Read expected deny / actual allow; M9 still pins stale M1 b1d7423 versus current M1 PR #43 head 9ef3dc2. | M3 retains the fail-closed denial and supported-capability positive control; M9 updates reviewed exact refs and reruns both OS jobs. Keep #55/#36 OPEN; host routing remains NOT_VERIFIED. |

## M0 #51 exact-head follow-up — 2026-10-18 12:11 UTC

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Quarantine concurrency retry exhaustion (#51) | P1 / M1 store, M0 CI coordination | M0 PR #30 head 2566220 run 39126103158 passes 9/9, including the Ubuntu Node22 test 163 that failed on prior docs-only head a1b0f8d in run 39124717837. Store/test sources did not change between these M0 commits; the observed failure is intermittent, with trigger UNKNOWN. | Keep OPEN/P1 for M1 diagnosis; preserve lock, fail-closed behavior, assertions, and retry cap. No data loss/corruption is established. |

## M0 12:29 UTC lane handoff — 2026-10-18

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Protected-path host enforcement (#52) | P0 / M2 adapter, M3 host, M1 Gateway, M5 policy, M9 | M2's final checkpoint ended with no visible PR/Issue result; M2 is paused by schedule, private state UNKNOWN. No host route/alias evidence is established. | Keep OPEN/P0/NOT_VERIFIED; next M2 slot requires exact adapter files/tests or API blocker, then M3 composes without editing M1 shared tests. |
| Packaged Hook data disclosure (#53) | P0 / M7, M8, M9 | M7's checkpoint ended without current Setup.exe/manifest/extracted-Hook evidence; M7 is paused by schedule, private state UNKNOWN. | Keep OPEN/P0/NOT_VERIFIED; require source-bound build/hash/harness chain; no install or VM claim. |
| Unpinned native Read contract (#55) | P1 / M3 behavior, M1 contract, M9 | M3 is active on PR #33 to deny unpinned native Read with the canonical reason and preserve a supported-capability positive control. | Keep OPEN until M3 exact-head evidence passes and M9 consumes the reviewed SHA; M3 does not edit M9 workflow or M1 shared Hook tests. |
| Quarantine retry exhaustion (#51) | P1 / M1 store | M1 is active comparing M0 exact-head failure 39124717837 with pass 39126103158; trigger remains UNKNOWN and no data loss/corruption is established. | Preserve assertions, lock/fail-closed behavior, and retry cap; require bounded cause/diagnostic or precise blocker. |

## M0 #51 CI confirmation — 2026-10-18 12:32 UTC

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Quarantine concurrency retry exhaustion (#51) | P1 / M1 store, M0 CI coordination | After failure on docs-only M0 head a1b0f8d (run 39124717837), two consecutive docs-only exact heads 2566220 and b7b6e14 passed 9/9, including the Ubuntu Node22 state-store test. Source/test did not change. | Trigger remains UNKNOWN despite passing reruns. Keep OPEN/P1 for M1 bounded diagnosis or blocker; preserve all assertions, production lock/fail-closed behavior, and retry cap. No data loss/corruption is established. |

### M0 scheduler update — 2026-10-18 12:54 UTC

#59 has a visible 12:49–13:09 UTC read-only assignment to M6 and M8 for path-level primary-owner/reviewer mapping across PRs #38/#39/#40. The assigned comparison must state M9's exact consuming SHAs (`#38 c1fdf3c`, `#39 cf4b70f`, `#40 c1ff677`) and identify any missing M6/M7 confirmation. No result is visible yet and private execution is UNKNOWN; keep #59 OPEN/P1. M1 #51 and M3 #55 are schedule-held while this two-lane window runs. No install, VM, VMware, or real-model resource is reserved.

### M0 #59 patch-level cross-check — 2026-10-18 12:59 UTC

Paginated current-head patches confirm that #38/#39/#40 overlap on the Hook wrapper and two tests, and that each PR alters the M1-owned `test/agent-hook.test.ts`. M1 review is required for the shared test and Hook semantics; M6 owns the E4 test contract; M7 owns packaging/lifecycle behavior; M8's fixture/docs/consumer changes require the relevant owner review. `package.json` fields and the shared `.gitattributes` purpose still need named owner confirmation. M9 pins #38/#39/#40 exactly but has a stale M1 pin (`b1d7423...` vs current #43 `9ef3dc2...`). Keep #59 OPEN/P1 pending the owner map and confirmations; no source/test changes were made by M0.

### M0 M9 exact-pin blocker — 2026-10-18 13:02 UTC

Issue #61 tracks the M9 workflow's stale M1 source pin at PR #36 head `de3799a...` (`b1d7423...` versus current PR #43 head `9ef3dc2...`) and the exact-head remediation after M1/M3 confirmation. Run `38727481764` is historical and fails both composition platforms; its log identifies the M3 unpinned native Read assertion failure. Keep #61 OPEN/P1 and PR #36 Draft until the owner-reviewed M1 ref is pinned and #55 is fixed with the positive control preserved. M0 did not edit module code or weaken checks.

### M0 P0 scheduler update — 2026-10-18 13:10 UTC

M2 #52 and M7 #53 are assigned as the only two active lanes through 13:29. M2 must provide a real supported first-party protected-file host path and alias-denial/positive-control evidence, or a precise owner/API blocker. M7 must provide a source/tool/hash-bound build and extracted-Hook harness chain or a precise missing input; this slot authorizes no installation, VM, or VMware test. M6/M8 #59, M1 #51, and M3 #55 are paused with work preserved; private status remains UNKNOWN. The P0 issues stay OPEN/NOT_VERIFIED until evidence is visible.

### M0 quota hold/recovery — 2026-10-18 13:30 UTC

A transient Usage-page timeout at 13:19:55 caused a hold on #52/#53 and all pushes. Two successful reads at 13:29:42 and 13:30:19 showed 92% five-hour / 81% weekly; M2/M7 then resumed under a fresh 13:30–13:50 assignment. The browser issue is reported; the Usage tab remains open. No module source was changed during the hold.

### M0 13:40 exact-head readback

PR #30's docs-only head `8e44dad` passes product CI 9/9 and coordination CI 1/1. PR #24 remains unchanged. M2 #52 / M7 #53 are still assigned through 13:50; public PR refs are unchanged at this checkpoint, with private work status UNKNOWN. Both P0 gates remain OPEN/NOT_VERIFIED.

### M0 quota recovery checkpoint — 2026-10-18 13:55 UTC

A second transient Usage timeout triggered a conservative hold. Two successful reads at 13:53:31 and 13:54 returned 92% / 81%, matching the prior 5-hour / weekly order, so M2/M7 were resumed for 13:55–14:15 under new Issue receipts. Their P0 issues remain OPEN/NOT_VERIFIED until evidence is visible; no product files were changed by M0.

### M0 14:15 P0 status

M2 #52 and M7 #53 are active through 14:28 after a quota-triggered pause and confirmed recovery. No public issue result or PR head movement is visible yet; keep both P0 risks OPEN/NOT_VERIFIED. No product source or test changes were made by M0.

### M0 14:21 quota recovery

A transient Usage timeout held the scheduled docs push and both P0 lanes. A fresh read at 14:20 returned 92% / 81%, and M2/M7 resumed under new Issue receipts. No product source changes or P0 acceptance evidence were made during the hold.

### M0 current M9 gate readback — 2026-10-18 15:41 UTC

This checkpoint supersedes earlier live-state snapshots for the listed refs. GitHub issue titles/states and PR heads were read directly; private worktree activity remains UNKNOWN.

| Gate | Priority / owners | Verified current state | M9 requirement |
| --- | --- | --- | --- |
| Exact module pin and Hook behavior composition (#55/#61) | P1 / M1, M3, M9 | #55 and #61 remain OPEN. PR #36 is OPEN/Draft at de3799aae540f58173acec4ab3f7a1fe98593aa7. Run 38727481764 failed both Ubuntu and Windows composition jobs. M3 PR #33 remains at be3880298e1c6766024ecbce5f6dbc23c4d2daa1; M1 PR #43 is at 9ef3dc265f9f386508bbeec7ff6d9a264ab1a0a4. The recorded run is historical and does not validate these current refs. | Obtain owner-reviewed exact pins, preserve the unpinned-Read deny and positive control, then pass both composition jobs on the reviewed refs. Keep #55/#61 and PR #36 open until evidence is attached. |
| M6–M8 Windows packaging ownership (#59) | P1 / M6, M7, M8, M9 | #59 remains OPEN; no owner confirmation is recorded in this checkpoint. | Record path-level primary owner/reviewer and exact selected PR SHAs before M9 pins; pass combined Windows packaging and auto-E4 checks. |
| Secret/temp ignore-rule alignment (#58) | P1 / M0, M9 | #58 remains OPEN. | Reconcile reviewed M0 rules in PR #36 and attach exact check-ignore evidence, preserving only reviewed E4 exceptions. |
| Active P0 evidence (#52/#53) | P0 / M2, M7, M9 | #52 is currently titled OBSERVE symlink/junction alias denial; #53 is packaged native-hook log privacy. Both remain OPEN. The only active lanes are M2 and M7 for 15:39–15:59 UTC; no module-head change was visible at resume. | Keep both P0s NOT_VERIFIED until source-bound evidence is visible. Their active slot does not clear any M9 pin, packaging, host-path, or independent-E4 gate. |

No module code, tests, or workflow files were changed by M0.

### M0 P0 lane refresh — 2026-10-18 16:00 UTC

| Gate | Priority / owners | Current evidence | M9 impact |
| --- | --- | --- | --- |
| OBSERVE aliases and protected host path (#52) | P0 / M5 policy, M1 contract, M2 adapter, M9 | #52 remains OPEN. M2 is assigned only host-path/adapter evidence through 16:20 UTC; the prior slot produced no visible PR or issue-result change. Private state is UNKNOWN. | Keep NOT_VERIFIED until the supported host callsite, alias deny-before-callback, allowed control, and exact-head composition are visible. |
| Packaged Hook caller-data privacy (#53) | P0 / M7 packaging, M9 | #53 remains OPEN. M7 is assigned source-bound package and extracted-harness evidence through 16:20 UTC; the prior slot produced no visible public result. Private state is UNKNOWN. | Keep NOT_VERIFIED until Setup.exe/manifest hashes, extracted Hook byte comparison, and canary result or exact blocker are attached. |
| Exact M9 composition (#55/#61) | P1 / M1, M3, M9 | PR #36 remains at de3799aae540f58173acec4ab3f7a1fe98593aa7; historical run 38727481764 failed both Ubuntu and Windows. #55/#61 remain OPEN. | M9 stays gated; current owner-reviewed exact refs and passing composition jobs are still required. |

The 16:00 slot does not authorize a third lane or change the public PR #24 baseline.

### M0 coordinator-clone divergence — 2026-10-19 00:22 Asia/Shanghai

| Risk | Priority | Verified state | Required handling |
| --- | --- | --- | --- |
| Duplicate M0 coordinator clone | P2 | Desktop/Agent-Canary-Dev/coordinator is a separate clean Git clone. Its local HEAD 09924da is 195 commits behind current PR #30 remote d88cdff and one commit ahead; it changes six coordination documents. Desktop main and agents directories are empty. | Preserve the local commit and do not push/reset it. Continue from the Documents coordinator worktree aligned to PR #30. Reconcile any unique text deliberately before using the duplicate clone. |
| Missing visible module worktrees | P2 | The common Documents repository registers M0, M1, M5, M8, and M9. M2/M3/M4/M6/M7 worktrees are not visible there. | Treat separate module worktrees as UNKNOWN until verifiable; do not claim all-worktree acceptance from distinct PR refs alone. |

The M2/M7 slot does not clear the M9 exact-pin or independent-E4 gates.

## M0 integration checkpoint — 2026-10-19 00:48 Asia/Shanghai

- M9 PR #36 remains OPEN/Draft at de3799aae540f58173acec4ab3f7a1fe98593aa7. Historical exact run 38727481764 failed Ubuntu and Windows composition on the M3 unpinned native Read assertion.
- #55 is assigned to M3 for the fail-closed behavior and positive control; #61 is assigned to M1 for the owner-confirmed source SHA. Neither has a new public result yet. M9 exact-ref composition remains BLOCKED / NOT_VERIFIED.
- P0 #52 protected-host/held-handle and alias/TOCTOU evidence, and #53 packaged-hook log privacy evidence remain OPEN / NOT_VERIFIED. M2/M7 are paused this slot.
- M6–M8 packaging ownership (#59), independent E4 (#57), and exact-head CI alignment (#60) remain separate open gates. No release readiness is claimed.

## M0 P0 lane checkpoint — 2026-10-19 01:05 Asia/Shanghai

- #52 still lacks independently verified first-party host consumption of the M1 held-object Gateway path and protected-open/alias evidence. M2 is assigned to a bounded host/adapter evidence task; synthetic seams remain insufficient.
- #53 still lacks independently verified source-bound Setup.exe/payload hashes, extracted-Hook comparison, and extracted-harness result. M7 is assigned to gather those artifacts or name the concrete blocker. No clean-VM/install claim is made.
- M1/#61 and M3/#55 had no public result by the slot end and are paused by schedule; private workspace activity remains UNKNOWN.
- M9 #36 stays OPEN/Draft and BLOCKED / NOT_VERIFIED. The M1 source confirmation (#61), M3 behavior fix (#55), M6–M8 packaging owner map (#59), independent E4 (#57), and exact-head CI alignment (#60) remain open.

## M0 P0 checkpoint — 2026-10-19 01:25 Asia/Shanghai

- M2/M7 public slots ended without PR-head movement or new evidence; private state UNKNOWN. Their work is preserved and paused by schedule.
- M5 now checks its owned policy/consumer boundary for #52; M8 checks its owned Hook copies and responsibility boundary for #53/#59. No claim is made that these tasks have started privately.
- The protected product host, held-open object/alias behavior, actual packaged Hook bytes/harness, and independent product E4 remain NOT_VERIFIED. M9 exact-ref composition stays blocked on #55/#61 plus packaging/owner gates.

## M0 integration checkpoint — 2026-10-19 01:45 Asia/Shanghai

- M9 remains BLOCKED / NOT_VERIFIED on #55 and #61: no M3 fix or M1 owner-confirmed exact source SHA is publicly available yet.
- P0 host-path/held-object evidence (#52) and packaged-hook evidence (#53) remain missing after their scheduled M2/M5 and M7/M8 windows; private work is UNKNOWN.
- M6 independent product E4 (#57), M6–M8 shared packaging signoff (#59), and M4 exact-head CI recovery (#60/#51) remain open. No security acceptance, release readiness, merge, or Release is claimed.

## M0 integration checkpoint — 2026-10-19 02:05 Asia/Shanghai

- M1/M3 produced no public results during their slot; M9 #36 still lacks current owner-confirmed exact pins and the M3 fail-closed fix. Private status UNKNOWN.
- M4 #60 remains open on one actual retry-exhaustion failure owned diagnostically by M1/#51; M4 may not edit the canonical M1 test or weaken retries.
- M6 #57 lacks independent product E4 provenance and result; M6 is tasked to identify artifact/runner or block precisely.
- P0 host and package evidence (#52/#53) and packaging owner signoff (#59) remain separate open gates.

## M0 P0 checkpoint — 2026-10-19 02:25 Asia/Shanghai

- M4/M6 slots ended without public evidence; M4 exact-head CI and M6 independent product E4 remain open. Private task status is UNKNOWN.
- M2/M7 resume for bounded #52/#53 evidence. No product host consumer or actual extracted package result is established.
- M9 exact-ref composition remains blocked on #55/#61 plus packaging-owner and independent E4 gates. No release readiness is claimed.
## M0 P0 checkpoint — 2026-10-19 02:45 Asia/Shanghai

- M2/M7 produced no public host/package evidence in their latest slots; private state is UNKNOWN.
- M5/M8 are assigned bounded owner-evidence tasks on their existing branches. The P0 acceptance remains unverified until real host-consumer/protected-open evidence (#52) and source-bound package/extracted-Hook evidence (#53) exist.
- M9 exact-ref composition, packaging ownership #59, and independent E4 #57 remain open; no release readiness is claimed.

## M0 evidence checkpoint — 2026-10-19 03:05 Asia/Shanghai

- M5/M8 produced no public evidence in the 18:45–19:05 window; their shared worktrees remain clean at the recorded PR heads and private activity is UNKNOWN. P0 host-consumption and packaged-hook-log gates #52/#53 remain NOT_VERIFIED.
- M1/M3 are assigned for 19:05–19:25 to resolve the exact M9 source-review ref and unpinned-native-Read contract. This does not authorize M9 pin refresh until the M1 source SHA is owner-confirmed and the M3 behavior/tests are verified.
- M9 composition remains blocked by #55/#61 plus independent E4, packaging ownership, and exact-head CI. No release readiness is claimed.
## M0 evidence checkpoint — 2026-10-19 03:25 Asia/Shanghai

- M1/M3 produced no public result in the 19:05–19:25 slot; PR #43/#33 remain at the recorded heads. Private activity is UNKNOWN. The M9 exact-source confirmation and unpinned native-Read contract gate remain open.
- M2/M7 now have the 19:25–19:45 slot for real host-consumer and source-bound package evidence. Their source checks cannot establish real host or extracted-package acceptance without those artifacts.
- M9 remains blocked by #55/#61 plus P0 #52/#53, independent E4, packaging ownership, and exact-head integration gates. No release readiness is claimed.

## M0 evidence checkpoint — 2026-10-19 03:45 Asia/Shanghai

- M2/M7 produced no public host-consumer or package evidence in the 19:25–19:45 slot; their issue gates remain open and private activity is UNKNOWN.
- M4/M6 are assigned for 19:45–20:05 to report M4-owned exact-head status and independent M6 product E4 provenance. Any M1-owned canonical CI failure must remain with M1; fixture evidence cannot be promoted to product E4 PASS.
- P0 #52/#53 and M9 integration remain unresolved. No release readiness is claimed.

## M0 evidence checkpoint — 2026-10-19 04:05 Asia/Shanghai

- M4/M6 produced no public evidence in the 19:45–20:05 slot. Exact-head build status and independent product E4 remain unresolved; no result is inferred from private activity.
- M1/M3 resumed 20:05–20:25 for the M9 source-ref and native Read contract gates. M9 exact-ref composition remains blocked until owner confirmation and a passing direct contract test exist.
- P0 #52/#53, M9 composition, M4 exact-head CI, and independent E4 #57 remain open. No release readiness is claimed.

## M0 evidence checkpoint — 2026-10-19 04:25 Asia/Shanghai

- M1/M3 again produced no public result in 20:05–20:25; the M9 exact-source confirmation and native-Read contract remain open. Private activity is UNKNOWN.
- M5/M8 resume for 20:25–20:45 to provide P0 policy-denial/host-consumer and Hook/logging provenance evidence. Synthetic policy tests alone cannot prove production host consumption or shipped-log privacy.
- M9 and P0 #52/#53 remain blocked; M7 still owns Windows packaging and M6 independent E4 remains unverified. No release readiness is claimed.

## M0 cross-owner risk — 2026-10-18 20:31 UTC

PR #40's changed paths cross M1, M6, and M7 ownership boundaries; packaging/windows/build-contract.mjs has no explicit owner row, and .gitattributes purpose is unresolved. No submitted PR review was found at the audit time. Hook source blob equality across M1/M8 reduces source divergence risk but does not prove shipped-package inclusion. Keep #59 open and PR #40 Draft pending per-file owner signoff, package reachability evidence, and exact M9 checks.

## M0 checkpoint — 2026-10-19 04:45 Asia/Shanghai

M5/M8 produced no public result in 20:25–20:45; P0 #52/#53 remain NOT_VERIFIED. The M8 Hook blob matches M1, but shipped payload is unknown. PR #40 still has cross-owner M1/M6/M7 path changes and no review entries as of the read-only audit. M7/M8 are paired for 20:45–21:05 to establish per-file disposition; M9 must remain Draft until M1/M6/M7 signoff and package evidence are present.
## M9 integration hold: M1/M5 shared paths and M6 E4 handoff — 2026-10-20 20:51 UTC

- Remote PR #43 head 38a09a073ea8871036e60a62b160fdb376487b20 is OPEN/Draft; M0 focused security-router test 21/21 and exact-head Actions checks 11/11 pass.
- Remote PR #47 remains OPEN/Draft at 373e2c2c16e404ad6fc1c28170d7ccc5f5e8c13c; its checks pass, but current M5 uncommitted edits have not been validated at a commit/CI head. The PR still overlaps M1-owned security-router, security-router tests, and agent-hook tests.
- M1 reported PR #43 as canonical on Issue #56. M0 verified PR #47 has a policy-level path_execution_not_pinned DENY under verifyRealPaths that is non-overridable in OBSERVE; the earlier M0 claim that PR #47 lacked any effective gate was retracted publicly. M1 must confirm the full integrated call chain and whether a duplicate router guard is required. #56 remains OPEN for owner-contract reconciliation; no PR is approved to merge.
- M5 currently has four policy-owned modified paths plus two M6-owned E4 paths in its local worktree. M0 opened P1 Issue #63 and instructed M5 to freeze/preserve the E4 patch, never stage it in PR #47, pending M6 owner review. Do not treat M5 dirty files as M6 evidence.
- M9 entry gate: keep PR #43/#47 Draft; reconcile #56; hand off or resolve #63 within M6 ownership; validate only exact, clean module commits with focused tests and exact-head CI; then re-run M9 interface/packaging integration checks. No integrated release readiness is claimed.
## M5 exact local policy checkpoint — 2026-10-20 21:02 UTC

M5 commits 7ac04a7 and bc6c409 now contain only M5-owned policy source/tests. M0 focused checks passed (49/49) and build passed at this local state. Exact-head CI is not yet available because the commits have not been pushed. Two M6-owned E4 files remain dirty in the M5 worktree and are excluded from both M5 commits. M9 must validate those M5 commits only after push/CI, then integrate M6 E4 ownership separately under Issue #63.
## M1/M5 exact-head CI after the 21:04 UTC batch — 2026-10-20 21:05 UTC

M1 PR #43 head 5e9e22d and M5 PR #47 head bc6c409 are pushed. M1 local focused file-state-store suite passed 17/17; M5 local focused policy tests passed 49/49 and build passed. Exact-head CI for both commits is running. PR #47 contains no M6 E4 paths; M5 worktree still has those two paths uncommitted. M9 integration remains held pending CI, Issue #56 path disposition, and M6 Issue #63 owner validation.
## P1 M1 state-store contention remains an M9 gate — 2026-10-20 21:07 UTC

PR #43 head 5e9e22d fails exact-head Ubuntu Node 22 file-store x10 (run 39497366090). Trace shows workers 0/1 completed 12 lock acquisitions/releases each, while workers 2/3 exhausted 500 retries; one retry trace shows EEXIST throughout and lock inode stable while state identity changes. Starvation is plausible but unconfirmed. Keep Issue #51 OPEN/P1 and M9 integration blocked on the owner finding, correctness fix, preserved assertions, and a passing exact-head Ubuntu Node 22 x10 check. Windows 10/10 does not substitute for the failing Ubuntu gate.

## 21:20 UTC cross-module gate refresh

- **P1 / #51:** exact PR #43 head `5e9e22d` has a failing Ubuntu Node 22 file-store x10 run. Source inspection shows production lock acquisition fails closed immediately on `EEXIST`; the fixed 2 ms backoff and 500-attempt limit are in the test harness. The failure trace supports possible test-worker scheduling starvation, but does not prove root cause or data loss. Keep #51 OPEN until M1 establishes a cause or labels it unresolved, preserves every assertion, and exact-head Ubuntu Node 22 x10 plus standard CI pass.
- **P0 / #52:** PR #47 has a local policy test/build pass but its exact-head CI still has macOS Node 20 pending. Synthetic path alias/recheck fixtures do not establish a first-party M2 callsite using a Gateway-issued identity-bound handle. Keep #52 OPEN/P0/NOT_VERIFIED pending owner-approved contract, M1 binding evidence, M2 host proof, safe-read control, and exact-head CI.
- **P1 integration / #56:** PR #43/#47 have six overlapping changed paths confirmed by current GitHub file inventories. M5 has published its no-exception disposition. M1 canonical-content disposition and M0/M5 PR reconciliation remain outstanding; do not delete or weaken canonical security gates. M9 remains held until these ownership gates and #51/#52 acceptance are resolved.
## 2026-10-20 21:57 UTC — exact-source Hook and M9 gate revalidation

### P0 — #55 M3 native Hook permits an unpinned Read

PR #36 head `de3799aae540f58173acec4ab3f7a1fe98593aa7`, run `38727481764`, fails the same exact-source subtest on Ubuntu (`116396823888`) and Windows (`116396823551`). With a synthetic normal file and no held-file capability, M1 returns `deny` and the M3 source snapshot returns `allow`. The workflow consumes old M1 SHA `b1d7423e70f2d47f43a5ec42e63a650ff93f6dcc`; current PR #43 is `5e9e22d3feb4c3be4d4e7e50e0b34ec5a8803c96`, and PR #33 remains `be3880298e1c6766024ecbce5f6dbc23c4d2daa1`. This demonstrates a synthetic Hook decision failure, not a proven host data exposure. M1 owns canonical Hook semantics; do not let M0 or M3 modify M1-owned Hook paths without owner approval. #55 is OPEN/P0.

### P1 — #61 M9 source/review pins are stale

M1 previously approved source SHA `38a09a073ea8871036e60a62b160fdb376487b20`. Current M1 HEAD `5e9e22d` descends from it and changes only the lock diagnostic test and report; M1 confirmation is requested before M9 updates its source and review pins. Keep the M9 workflow's consumed SHAs explicit and rerun both platforms only after the M3/M1 behavior contract is resolved. #61 stays OPEN/P1; PR #36 remains Draft.

### P0 — #52 alias/policy checks are not product-host proof

M5 PR #47 exact-head CI run `39500126875` passed 9/9 at `e3662e9ca7363504eea7dd5e3262352018519a56`. This validates the PR's CI gate, not a first-party host consuming an M1 identity-bound held-file capability. The product host callsite and independent E4 status remain NOT_VERIFIED; #52 stays OPEN/P0. Do not infer protection from the synthetic adapter composition.
### Pending local owner review — M3 Hook patch (2026-10-20 22:00 UTC)

M3 has an uncommitted candidate fix in M1-owned `src/agent-hook.ts` and `test/agent-hook.test.ts`, while two docs-only commits are ahead on the existing PR #33 branch. The candidate appears to align unpinned native file operations with M1's deny contract and adds a synthetic Gateway positive control, but M1 has not yet reviewed it. Treat the patch as unaccepted and untested: do not publish it or claim #55/M9 acceptance until M1 explicitly approves the precise shared-path changes, focused tests pass, and M9 reruns both platforms on exact reviewed refs. Keep the current fail-closed gate intact.
## 2026-10-20 22:02 UTC — M3 #33 candidate is published, owner review pending

PR #33 moved from `be38802` to `9841bd8527af724664b70dc30b0c372878c81075`. Exact-head CI `39504984014` is 7/8 passing with Windows Node 22 pending. M3 reports local build and 34/34 focused tests passed. The commit changes M1-owned `src/agent-hook.ts` and `test/agent-hook.test.ts` to deny unpinned native file operations and add a Gateway positive control. M1 owner approval is pending; do not treat local/CI results as a file-ownership exception or production-host proof. M3's report needs correction because it currently says no M1/M9 files were edited.

PR #36 still pins M1 `b1d7423` and M3 `be38802`; run `38727481764` failed the same unpinned Read comparison on both platforms. M9 must wait for M1 review, completed PR #33 CI and exact owner pins before rerunning both composition jobs. PR #36 remains Draft; #55 remains OPEN/P0 and #61 OPEN/P1.

The M3 push occurred at 22:01:22 UTC, earlier than the scheduled 22:04 batch. No corrective force-push or rollback was made. Further publication is held until at least 22:21:22 UTC.
**CI correction, 2026-10-20 22:03 UTC:** PR #33 exact-head run `39504984014` is now 9/9 successful at `9841bd8527af724664b70dc30b0c372878c81075`; the formerly pending Windows Node 22 job passed. The M1 owner disposition and M9 current-ref composition gate remain outstanding.

### M1 + M3 coordination delta — 2026-10-20 22:08 UTC

M1's test-only lock trace is committed locally and the focused concurrency test passes 1/1, but the pre-existing M4 CI retry failure remains unresolved. M3 has documented the M1-owned Hook/test overlap in issue #55 comment `6302851065`; explicit M1 owner disposition and exact-ref M9 reruns remain required. PR #33's current exact-head CI is green, but does not resolve the ownership or product-host integration risks.

### P0 host-path finding — 2026-10-20 22:14 UTC

M1 confirmed the current OBSERVE console uses a virtual executor; the separate temporary-file demo reaches Gateway but not the product OBSERVE/M2/M5 path. A first-party host-to-held-file binding remains NOT_VERIFIED. M0 routed the desktop host entrypoint to M4 and retained M2/M5/M1 responsibilities for adapter, policy and Gateway respectively. Issue #52 evidence: comment `6302972946`. M9 exact-ref composition and alias/path-replacement no-side-effect evidence remain required.

### M7 installer payload evidence update — 2026-10-21 07:54 UTC

The exact M7 hosted build artifact `12309135499` from run `39517510296` at source `b0581407def769946fa710f55cd1d0986ce0cf3b` contains a hashed Setup.exe, build report, payload manifest, canary result, and staged Hook sidecar. The staged Hook hash matches its canonical M7 source blob; the controlled wrapper canary passes with zero unsafe callback starts and unchanged protected fixture. This establishes staged-payload/build evidence only. Setup.exe's internal Hook was not extracted, and no installer or VM test was run; issue #53 therefore remains OPEN/P0/NOT_VERIFIED for the installed artifact.

## 2026-10-21 09:10 UTC - M7 Setup extraction evidence and M9/M2 gates

### P0 - #53 packaged Hook/logging evidence

M7 PR #39 exact head 9330005b2e15c521b9645a728d34e9477d8d6340 passed product CI run 39573529208 and Windows Community wrapper run 39573529232. Artifact 12332644890 was downloaded and all SHA256SUMS entries were checked. The workflow tested and extracted the actual Setup.exe archive without executing the installer. The extracted Hook Git blob is the canonical M1 blob d6f93249306b7966259cab463dd39475728ef338; the package-derived controlled canary passed with no caller canaries, unchanged protected fixture, zero unsafe callback starts, and seven fault cases. This supersedes the 07:54 entry for the newer M7 exact head. No VM lifecycle or third-party host test is claimed. #53 remains OPEN until the composed exact refs pass and reachable-copy acceptance is complete.

M8 PR #40 at 2d5a0ffe1e93dcc93673a3fd2de5a6bf71ac09d3 carries the M1-approved distinct adapter blob 544b5eb76633469b7185c4ea77d85d7f1754393e, accepted in #65 comment 6308270032. It preserves permissionDecision; reason normalization is display metadata only. M9 must verify this owner-approved variant by its exact blob and behavioral/log-schema contract, not require canonical byte identity.

### P0 - #52 product host protection remains NOT_VERIFIED

M2 exact local candidate d054ceea39a0e4dd040131b4ca2789b85f2c9fe4 passes the existing focused synthetic adapter tests 8/8 on Windows Node 22.23.1. Its five changed paths are within the M2 adapter, tests, and report; no first-party product-host callsite was added. M2's audit found no supported shipping consumer and the package allowlist excludes execution-isolation/**; M4 found only a virtual console read. This is not protected desktop OBSERVE file access or TOCTOU evidence. M1 exact disposition and d054 hosted CI are absent; keep it unpublished and keep #52 OPEN/P0.

### P1 - #61 current M9 exact-head composition failure

PR #36 head 72249c617687571f88f5c3a8a688245cbace65e6 run 39573535645 fails the same Hook byte-identity assertion on Ubuntu and Windows because it incorrectly includes M8's owner-approved distinct adapter. The canonical M1/M2/M5/M7/M9 files match; M8's accepted blob differs. Keep all security assertions; M9 should scope byte identity to canonical copies and verify M8 by its reviewed blob and contract. M2 candidate d054 remains unpinned pending M1 ACCEPT/REJECT or a concrete blocker and exact-head hosted CI. Keep #61 OPEN/P1 until these gates and both-platform composition pass.

PR #24 remains OPEN/Draft at the unchanged base/head; main was not modified. No merge or Release was made.

## M0 2026-10-21 11:14 UTC exact-source gate update

### Closed scoped gate — P0 #53 packaged Hook logging
M7's hosted artifact from PR #39 head 9330005b2e15c521b9645a728d34e9477d8d6340 (run 39573529232, artifact 12332644890) passed verified checksums and static Setup.exe extraction with installerExecuted=false. The extracted Hook is the canonical M1 blob d6f93249306b7966259cab463dd39475728ef338; its package-derived synthetic harness passed seven fault cases with caller canaries absent, zero unsafe callback starts, and an unchanged protected fixture. Exact M9 composition at PR #36 head 85b598adfbb168b51e81b1c56e7be8d846784f8d passed Ubuntu/Windows in run 39584019108. Branch-copy comparison found M1/M2/M4/M5/M6/M7/M9 canonical blobs, M3 only omitted a non-functional comment and retains canary tests, while M8's distinct adapter has exact M1 acceptance. #53 is CLOSED for this scoped logging/composition gate only; #41 clean VM, #52 host/held-identity/TOCTOU, and #57 independent E4 remain separate.

### Open P1/P0 gates
- #52 remains OPEN/P0: no first-party desktop OBSERVE path has been verified consuming an M1-bound held-file identity through M2/M5; alias/path-replacement controls remain required.
- #59 remains OPEN/P1: M9 composition passes on the accepted pin set, but M6's review of M8's shared auto-E4 test contribution and the active-stage lifecycle fix #66 remain pending.
- #60 remains OPEN/P1: M1's exact review is still needed for M4's changed M1-owned Hook test. PR #34's current run 39589011257 failed once in the unchanged M1 Gateway expiry test before the expiry/no-callback assertions. Track cause under #62 as UNKNOWN; do not infer M4 regression.
- #62 remains OPEN/P1 / UNKNOWN after one new CI reproduction; retain the expiry-denial and zero-callback assertions.
## Current integration delta — 2026-10-21 14:11 UTC

| Gate | Priority | Current verified state | Remaining acceptance |
| --- | --- | --- | --- |
| #62 M1 expired-approval failure | P1 | Read-only diagnosis: PR #34 failure used TTL=5 ms and stopped at `pending()[0].requestId`; M1 `pending()` sweeps expired entries. The current M1 regression asserts REQUIRE_APPROVAL, EXPIRED, and callback=0. Timing/setup race is plausible, not proven; Issue #62 remains OPEN/UNKNOWN and M1 source was not changed. | M1 owner disposition citing whether this is a test-setup race or remains unknown; retain all denial and no-side-effect assertions. |
| #66 M6 active-stage lock | P1 | Local M6 candidate `c7c19e2` adds an active-stage guard to `release()` and tests lock retention, blocked reacquisition, and reacquisition after safe completion. Module-reported focused test 1/1 and Auto E4 9/9 pass. Public PR #38 is still at `560f724`. | Push through existing PR #38 at the next scheduled batch; exact-head hosted CI and M9 composition after accepted pin update. Product E4/VM remains NOT_VERIFIED. |
| #52 product OBSERVE identity path | P0 | M2 candidate `d054cee` and CI are available, but there is no M1 owner review or first-party product host consuming a Gateway-bound held identity. | M1 exact candidate disposition and a supported M2/M4/M5 product call path with alias/path-replacement and TOCTOU evidence. Keep OPEN/NOT_VERIFIED. |
| M0 exact-head CI | M0 | PR #30 at `54a2d6b`; ownership runs `39613426714` and `39613440990` pass. `gh pr checks` still reports macOS Node 22 pending on product run `39613426261`; other listed jobs pass. | Await exact job completion; keep PR #30 Draft and report pending honestly. |

## M0 Hook-test ownership delta — 2026-10-21 14:16 UTC

Issue #60 remains OPEN/P1. M0's read-only comparison found PR #34's shared M1-owned Hook test blob `e8ae8202492fc44fbb13c7ee855198ac8e62f436` removes the normalized-log allowlist/redaction test, permits Read where M1's PR #43 blob `82ca4662e0a6c4269011ff8eba9470f2a26ccc39` denies it, and drops Write/Delete deny plus log/canary/unchanged-file assertions. The interruption test title claims no tool callback without a callback-counting fixture. No runtime bypass is established; the evidence shows the current test blob does not preserve M1's reviewed security contract. M0 recorded the exact review in Issue #60 comment `6318294814`; M1 owner disposition or M4 reconciliation remains required before promotion.

Issue #62 remains OPEN/P1 / UNKNOWN. The 5 ms test fixture and Gateway pending sweep are consistent with a timing/setup race, but the failed dispatch type is not recorded. M0 posted this bounded diagnosis in Issue #62 comment `6318299115`; no test deletion, policy weakening, or product source fix is claimed.

## 2026-10-21 14:19 UTC integration delta

| Gate | Current verified state | Remaining acceptance |
| --- | --- | --- |
| #65 M8 fail-closed adapter | CLOSED for exact-source M9 composition. M1's existing Issue #65 comment accepts M8 Hook blob `544b5eb…` as a distinct display-reason/logging adapter; M1 canonical blob is `d6f9324…`. No formal PR review is recorded. | Keep the acceptance scoped to the named path and behavior; no native-host or whole-PR claim. |
| #59 shared M6–M8 E4 inputs | M6 reviewed M8's test addition as additive but not an Auto E4 lifecycle or artifact-write regression. M6 fix `c7c19e2` is local only; M9 plan is to add the exact M6 Auto E4 suite after public exact-head M6 CI passes. | Push M6 via existing PR #38, obtain exact-head CI, then update/run existing M9 PR #36 pins and Ubuntu/Windows composition. |
| #62 M1 expired approval | One historical failure stopped at `pending()[0].requestId` with 5 ms TTL before EXPIRED/no-callback assertions. Timing/setup race plausible, not proven. M1 is now investigating deterministic setup while retaining all assertions. | Review minimal M1-owned change and exact targeted test evidence; keep OPEN/UNKNOWN until evidence supports a disposition. |
| #58 M6 raw.log ignore scope | M0's exact exception is the reviewed 20261013 fixture; M6 and M9 formerly had broad `raw.log` exceptions. M6 is adjusting only its existing branch and will prove named-path vs future-sibling behavior. | Exact M6 validation, then exact M9 counterpart; do not broaden log exceptions. |
| #52 protected identity / host path | Still OPEN/P0 / NOT_VERIFIED; synthetic alias denials do not establish a product host consuming an M1-bound held identity or TOCTOU resistance. | Require first-party host/callsite and exact alias/replacement controls; keep hard denials meanwhile. |

Quota at this checkpoint was readable: 77% five-hour / 52% weekly. Next push no earlier than 14:23 UTC after re-reading the Usage tab and checking current PR #24 and branch heads.

## 2026-10-21 14:21 UTC status correction

- M0 PR #30 run `39613426261` has now completed all 9/9 jobs successfully; the 14:11 “macOS Node 22 pending” note is superseded. Ownership runs `39613426714` and `39613440990` also pass 1/1 each.
- M6 local commits `c7c19e2` (#66) and `9880360` (#58) are clean and ready for ordinary fast-forward delivery on the existing PR #38 branch; hosted checks have not yet run on either new commit.
- M1 is still examining #62; no M1 owner root-cause claim or source patch exists. Keep the issue open unless deterministic evidence changes that state.

## 2026-10-21 14:28 UTC integration delta

| Gate | Current verified state | Remaining acceptance |
| --- | --- | --- |
| #61 M1/M2 adapter seam | M1 posted exact-SHA ACCEPT for M2 d054ceea on Issue #61 comment 6318542125; M2 exact-head CI run 39586551017 passed 9/9. Scope is adapter mapping and denial propagation only. | M9 must update the existing M2 pin and pass exact-source composition; product host/held identity/TOCTOU remain NOT_VERIFIED under #52. |
| #60 M4 shared Hook tests | M0 comparison identified weakened assertions; M4 is working in its existing PR #34 branch to reconcile the file. No M4 commit or new hosted run yet. | Preserve unpinned Read/Write/Delete deny, policy precedence, redaction/canaries, fixture preservation, timeout/failure/interruption assertions, and actual callback counting. |
| #62 M1 expiry test | M1 pushed a controlled-clock test-only fix at `5cb57c9`; local Gateway suite passed 32/32. | Exact-head M1 CI runs 39616423430 and 39616423352 are queued; retain OPEN until those complete. |
| #66 M6 active-stage lock | M6 pushed the release guard/regression as `c7c19e2` on PR #38; M6's second commit `9880360` addresses #58. Local focus 1/1, Auto E4 9/9. | M6 exact-head CI 39616422797 and wrapper 39616422793 are queued. After pass, M9 may update the M6 pin and add its full Auto E4 test. Product E4 remains NOT_VERIFIED. |
| #58 raw.log scope | M6 exact exception is pushed; M9 already has the exact exception and verified both paths locally. | Keep open until M6 current-head CI passes and re-read both branch rules. |

Usage was readable at 14:28 UTC (77% five-hour / 52% weekly). The current parallel pair is M9 #61 pin/composition and M4 #60 test-contract reconciliation. M0 monitors M6 exact-head CI; no exclusive VMware/installer/real-model slot is reserved.

## 2026-10-21 14:47 UTC integration delta

| Gate | Current verified state | Remaining acceptance |
| --- | --- | --- |
| #52 protected file identity / TOCTOU | OPEN/P0/NOT_VERIFIED. M1 capability `7279336307fc7aacd46119405858d4fd91499757` and M2 synthetic replacement regression `2dcaedd0a368a99b4b0e14bbcd2416d2dc6ea33a` are pushed. M2's follow-on adapter commit `eed2c0884f524d37c25d317888e1d289122c440d` is local, unpushed, and passes its focused contract-double tests 11/11; it forwards the exact M1-issued capability through M5's callback context and denies missing/stale/replaced inputs without a path fallback. M5 commit `ed304e399ec237a47e03830e5013695ddcc10dd6` is local, unpushed; build, 61/61 focused tests, and exact M1 Gateway + M5 router safe-read/replacement-before-effect composition passed locally. | Next batch must publish M2/M5 and obtain exact-head CI. Tests use contract doubles/custom composition, not a first-party product host. M4 still has no host callsite consuming the protected handle. Keep hard denies; no product-host or full TOCTOU acceptance yet. |
| #53 Hook artifact/log consistency | CLOSED for packaged-Hook logging/redaction and exact-source composition. M7 PR #39 head 9330005b and Windows wrapper run 39573529232 produced artifact 12332644890; Setup SHA-256 028397a8..., extracted Hook blob equals canonical M1 d6f93249..., and the 7-fault extracted-package harness passed with no installer execution. M9 current head 128ae58 exact composition run 39619376708 passed. | Keep the closure scoped. Installer execution, clean-VM lifecycle, third-party host activation, held-identity/TOCTOU, and product E4 remain separate NOT_VERIFIED gates (#41, #52, #57). |
| #60 shared M1 Hook test ownership | M4 PR #34 restores the shared test blob to the PR base. Run `39619445389` fails only at the base interruption marker assertion on Windows Node 22 before allow/callback assertions (329 pass, 4 skip). The base fixture has a 1-second `spawnSync` deadline with no ready handshake. M1 canonical blob `82ca4662e0a6c4269011ff8eba9470f2a26ccc39` contains the fix, but its other Read/Write/Delete DENY assertions require newer M1 source semantics. | M1 REJECTED copying the full canonical test and ACCEPTED only a readiness-handshake port for the interruption subtest. M4 completed local commit `fde972cd8d4c17ead4a18187fa4b273482bddd2d` on existing #34; it changes only `test/agent-hook.test.ts`, preserves M4 source expectations and adjacent tests, and passes build + Hook 10/10 + diff check. Keep OPEN/P1 pending push and exact-head hosted CI. |
| #61 M9 source composition | M9 PR #36 exact-source composition `39619376708` and Windows wrapper `39619376801` passed with M1-accepted M2 public SHA `d054ceea...`. | Keep OPEN until the open PR path is fully reviewed; this pin does not cover M2's newer unpushed local commit or establish host identity/TOCTOU under #52. |
| #62 expiry test | M1 exact-head test and concurrency runs `39616423430` / `39616423352` passed at `5cb57c9...`. Root cause of the historical failure remains UNKNOWN; no production bypass is established. | Keep OPEN/P1 with unknown historical cause; preserve EXPIRED and zero-callback assertions. |
| #58 raw-log exception | M6 exact-head CI `39616422797` and M9 exact-source composition `39619376708` passed; both use the exact historical-path exception. | Keep OPEN until the PRs are reviewed/merged. These source checks do not establish an E4 artifact, installer, or clean-VM result. |

Usage was readable at 15:03 UTC (77% five-hour / 52% weekly). M2 adapter, M4 test patch, and M5 verifier commits are locally complete; the next batch is no earlier than 15:23 UTC after fresh quota/ref preflight. M7 confirmed #53 remains CLOSED within the packaged-Hook evidence scope. No main merge, PR #24 edit, Release, or exclusive VMware/real-model/installer use is authorized or claimed.

## 2026-10-21 15:21 UTC candidate owner-review delta

| Gate | Current verified state | Remaining acceptance |
| --- | --- | --- |
| #52 protected file identity / TOCTOU | M1 ACCEPTED exact M2 adapter `eed2c0884f524d37c25d317888e1d289122c440d` and M5 strict verifier `ed304e399ec237a47e03830e5013695ddcc10dd6`; M9 synthetic composition candidate passed 8/8. These refs are still local and not covered by hosted CI. | First-party host/callsite and production held-identity/TOCTOU evidence are missing. Keep OPEN/P0/NOT_VERIFIED and preserve hard denies. |
| #60 M4 interruption fixture | M1 ACCEPTED only the bounded readiness-handshake excerpt. M4's local commit `fde972cd8d4c17ead4a18187fa4b273482bddd2d` changes only the shared test file and passes build + Hook 10/10. | Publish at the next quota/ref-cleared batch and require exact-head hosted CI; no Hook product defect is established by the prior fixture race. |
| #61 exact-source composition | M9 local commits `2fda9462acd9c40462fc04ff5583b30c31606223` and `222bb3e408f93a5122c4a9c5f7d83d814045245b` pin M1 `7279336307fc7aacd46119405858d4fd91499757`, M2 `eed2c0884f524d37c25d317888e1d289122c440d`, and M5 `ed304e399ec237a47e03830e5013695ddcc10dd6`. M1 accepted the adapter/verifier seams; exact-source test passed 8/8. | Obtain exact-head M9 composition and product CI after refs publish. M9 product run still has one explicit skip; this does not establish a production-host callsite. |

All commits in this delta were local at the time of writing. The next push must wait until 15:23 UTC and a fresh readable Usage/ref preflight. PR #24 remains untouched; #53 closure remains limited to packaged-Hook logging/redaction evidence.

## 2026-10-21 15:29 UTC post-push CI correction

| Gate | Current verified state | Remaining acceptance |
| --- | --- | --- |
| #52 protected file identity / TOCTOU | Exact M2 `eed2c08` CI passed. Exact M5 `ed304e3` CI failed on macOS Node 22 because the contract-double fixture's lexical temp path differed from `realpath`; the runtime returned DENY. M9 Windows composition passed and the Ubuntu composition job was still in progress; full M9 product CI was also still in progress at this read. | M5 is normalizing only the test fixture path. Rerun exact M5 head after that fix. First-party host/callsite and production TOCTOU evidence remain missing; keep OPEN/P0/NOT_VERIFIED. |
| #60 interruption fixture | M4 fix is public at `fde972c`; exact-head CI is still queued. | Wait for exact-head CI; preserve the minimal M1-approved test-only scope. |
| #61 exact-source composition | M9 public head `222bb3e` contains exact M1/M2/M5 candidate pins and the updated owner-review SHA. Composition run `39625263712` and Windows wrapper `39625263762` report success, but the Ubuntu composition job remains in progress. Full product CI later completed successfully in run `39625263733`. | Record the final Ubuntu job result before closing #61. This proves synthetic source composition only, not product host integration. |

This supersedes the previous paragraph stating the listed candidate commits were all local: all five branches above were pushed in the 15:23 UTC batch. The 15:23 quota read was 77% five-hour / 52% weekly. Next push is no earlier than 15:43:24 UTC after a new Usage and exact-ref preflight.

## 2026-10-21 15:31 UTC exact-head and candidate update

| Gate | Current verified state | Remaining acceptance |
| --- | --- | --- |
| #52 M5 strict-path test fixture | M5 local commit `bbce79aa086b39b51422cc72471c23c963778650` changes only the temporary test workspace to its canonical realpath; local target test 1/1, focused suite 61/61, build, and diff check passed. The public PR remains at `ed304e3`; the exact-head CI failure is run `39625248736` and the local fix has not yet been published or host-validated. | Publish in the next allowed batch, then require fresh macOS/all-platform CI. Runtime denial remains correct; first-party host/callsite and production TOCTOU remain NOT_VERIFIED. |
| #59 / M6 candidate | M6 PR #38 exact head is `98803607b89f11e24430c461bd91e9c1a0ece9d4`; CI `39616422797` passed all nine jobs and wrapper `39616422793` passed both jobs. PR #38 has no review. M9 has been assigned the M9-owned candidate pin/full Auto E4 suite change; owner acceptance remains pending. | Require M6 owner ACCEPT/REJECT for this exact SHA and scope before marking the owner gate accepted. Do not infer acceptance from CI. |
| #61 exact-source composition | Run `39625263712` reports overall success and Windows composition success, but its Ubuntu composition job is still in progress. M9 wrapper `39625263762` passed Ubuntu and Windows; product CI `39625263733` passed all nine jobs. | Wait for the Ubuntu composition job to reach a final conclusion; keep product-host and installer evidence claims separate. |
| #60 interruption fixture | M4 run `39625260637` remains queued overall; macOS Node 20 is still queued and other listed jobs passed. | Wait for the queued job and overall run to finish. |

Usage was readable at 15:29 UTC: 77% five-hour / 52% weekly; the Usage tab remains open. Do not push before 15:43:24 UTC; then re-read Usage, exact remote refs, and PR #24 before any batched fast-forward.

## 2026-10-21 15:35 UTC M1 host-callsite owner review

M1 reviewed its exact public head `7279336307fc7aacd46119405858d4fd91499757` without changes. Its Gateway issues and verifies opaque capabilities bound to the registered file/tool/path and held identity, with a recheck before reading. The current CLI → Console → demo path is not evidence of a product M1/M2/M5 strict composition; the protected MCP entry constructs M5 routing without an M1 capability consumer. M2's adapter has no product-source caller and is not exposed through the package export/files boundary. M1 also states its held-FD check is not an OS-atomic path/effect transaction; cross-process mutation remains a residual TOCTOU limit.

Issue #52 remains OPEN/P0/NOT_VERIFIED; M0 recorded this evidence and owner routing in verified comment `6319888766`. M2 is tasked with resolving the M2-owned adapter import boundary without editing shared unapproved package metadata. M3/M4 must identify the owner of the actual CLI/Console callsite; M4 Console-page ownership is tentative in the ownership table. Acceptance requires a supported M1 → M2 → M5 strict read, safe-read positive control, alias and path-replacement denial before callback/effect, path-only hard DENY in OBSERVE, and exact-head tests/CI. A product bypass or incident is not established.

M9 #59 candidate commit `e2114a12b1e5bfcefd2932fef06bb6ae44116c14` is local on the existing branch only: M6 pin `9880360`, complete Auto E4 suite added beside the retained bundle verifier, and explicit `M6_OWNER_ACCEPTANCE_STATUS=PENDING`. Agent-reported local checks passed: M9 8/8, M6 bundle 16/16, Auto E4 9/9, M3 27/27, M7 2/2, M8 3/3, syntax and diff check. YAML parser validation and hosted CI remain pending; no M6 acceptance is inferred from these checks.

## 2026-10-21 15:39 UTC M2/M4 owner-boundary result

M2's existing clean PR #37 worktree at `eed2c0884f524d37c25d317888e1d289122c440d` confirms there is no safe M2-only package-export change: the adapter is in `execution-isolation/gateway-adapter/`, while package `exports` only exposes `./sdk` and `files` omits the adapter. A package dry-run confirms it is absent. The proposed subpath export and files inclusion affect shared `package.json`, whose current owners are M3/M5/M6/M7; M2 must approve the adapter target, and M3/M4 own/confirm the host callsite. M2 made no source change.

M4's existing #34 branch has local documentation commit `803a015` only (not yet published). Its source audit records that `/api/runtime3/action` exercises a synthetic temporary-file Gateway but bypasses M2/M5; `/api/policy/action` uses a virtual static-text callback and performs no filesystem read. The M4 checkout lacks M1 capability APIs, the M2 adapter, and M5 strict-router context. M4 owns Console page/UI/support tests; `src/ai/console.ts` host routing is tentatively assigned to M3 with M4 as companion. No partial or path-only integration was added.

Issue #52 therefore remains OPEN/P0/NOT_VERIFIED pending: (1) M3/M4 route-owner confirmation, (2) M3/M5/M6/M7 review of any shared package metadata export plus M2 approval of the adapter, (3) supported M1 → M2 → M5 strict host composition with positive safe-read and alias/path-replacement denials before effect, and (4) exact-head tests/CI. Cross-process TOCTOU remains a separate unproven boundary.

## 2026-10-21 15:50 UTC integration risk refresh

| Gate | Priority | Current verified state | Remaining acceptance |
| --- | --- | --- | --- |
| First-party protected I/O and held identity (#52) | P0 | M1/M2/M5 code seams and M9 synthetic candidate exist; M3 explicitly owns the protected Console backend route and M4 retains UI/page ownership. Exact current PR heads: M1 `7279336`, M2 `eed2c08`, M3 `535d429`, M5 `bbce79a`, M9 `6c9c794`. | Issue remains OPEN / NOT_VERIFIED until a supported real host consumes M1→M2→M5 strict authorization; verify safe-read positive control and alias/path replacement denial before callback/effect. OS-atomic cross-process TOCTOU is not proven. Wait for current exact M9 hosted CI. |
| Packaged Hook logging/redaction (#53) | P0 scoped gate | CLOSED on verified M7 artifact/extraction and controlled harness evidence; no credential incident is claimed. | Closure is limited to packaged Hook logging/redaction and the exact-source evidence in #53. It does not prove installer execution, native-host file I/O, clean VM, or independent E4. |
| M3 native Hook contract (#55) | P0 | M3 #33 remains at `535d429`; latest M9 #36 candidate `6c9c794` is pushed and hosted composition checks are queued/running. | Require final Ubuntu and Windows exact-head results with M3 deny plus supported-capability positive control intact; do not infer completion from earlier M9 heads. |
| M8 fail-closed contract (#65) | P0 scoped gate | CLOSED after M1-reviewed M8 exact source and earlier M9 composition passed both platforms. Current M9 revision has not yet completed hosted CI. | Preserve exact reviewed M8 adapter blob and fail-closed behavior; keep current M9 run separate from the historical closure evidence. |
| M7 clean-VM lifecycle (#41) | P1 | M7 #39 `9330005` CI 9/9, Windows wrapper 2/2, NSIS 3.13 template compile and static package extraction evidence pass; `installerExecuted=false`. | Install, first launch, upgrade, uninstall, cancel/rollback, ordinary-user and EFS cases remain NOT_VERIFIED/HOLD. Schedule the exclusive clean VM/installer slot in #29 before runtime work. |
| Independent product E4 (#57) | P1 | M6 exact PR #38 head `9880360` and M9's bounded owner-approved Auto E4 source pin are identified. | Independent product-level run and artifact remain NOT_VERIFIED; Auto E4 source tests do not satisfy this gate. |
| Native Codex Shell (#45) | P1 | Still UNPROTECTED / NOT_VERIFIED. | Require evidence from the actual supported Shell host; adapter-only behavior is insufficient. |
| Other open reliability/ownership issues (#51/#59/#60/#62) | P1 | All remain open as of the 15:48 UTC GitHub read. | Preserve failure assertions and owner boundaries; close only on exact reproduction/owner disposition and current checks. |
| Updated branch CI | P1 | PR #30 `72c07fa`, #34 `803a015`, #47 `bbce79a`, #36 `6c9c794` have fresh workflows queued/running. | Record final exact-head jobs before claiming green; fix failures only in owned files without weakening gates. |
| Protected PR #24 / release boundary | M0 | PR #24 OPEN/Draft, unchanged head/base; no merge or Release. | Keep this boundary intact. |
## 2026-10-21 15:54 UTC exact-head risk correction

| Gate | Priority / state | Current evidence | Remaining acceptance |
| --- | --- | --- | --- |
| First-party protected I/O (#52) | P0 OPEN / NOT_VERIFIED | M9 exact source composition is green, but is synthetic/co-located. M3 owns the Console backend route; the M2 package adapter boundary is awaiting M2 exact-target confirmation and shared package approvals. | Wire a supported host through M1→M2→M5 strict authorization; verify positive read, alias/path-replacement denial before effect, path-only denial, and current exact-head tests. Production held identity and cross-process TOCTOU remain distinct unproven boundaries. |
| M3 Hook composition (#55) | P0 CLOSED within scope | M9 exact composition run `39628598419` passes Ubuntu/Windows at head `6c9c794`; product `39628598572` and wrapper `39628598435` pass. | No work remains for this synthetic exact-ref issue. Host integration remains #52. |
| M9 approved refs (#61) | P1 CLOSED within scope | Current approved-source set and exact M9 product/wrapper/composition all pass; M6 acceptance is explicitly recorded at comment `6320039569`. | Do not infer product-host, VM, installer, or independent E4 from these checks. |
| Packaged Hook redaction (#53) / M8 fail-closed composition (#65) | P0 scoped gates CLOSED | Verified exact package extraction/harness and M8-specific accepted behavior; no disclosure incident is claimed. | Separate host, clean-VM, TOCTOU, and independent E4 gates remain. |
| M7 clean-VM lifecycle (#41) | P1 OPEN / HOLD | M7 product CI 9/9 and wrapper 2/2, NSIS 3.13 compile and static package extraction pass; `installerExecuted=false`. | Schedule and run the clean-VM lifecycle matrix; no resource is reserved. |
| M6 independent E4 (#57), Native Shell (#45), retry/ownership (#51/#59/#60/#62) | P1 OPEN | Exact current issues remain open; M6 is investigating #66 and reviewing its shared test ownership slice. | Resolve in owner-controlled changes with current exact-head checks; preserve all fail-closed assertions. |
| New M0/M4/M5/M9 changes | CI GREEN | PR #30 runs `39628572250` (9/9) + `39628572253` (1/1); #34 `39628588520` (9/9); #47 `39628583087` (9/9); #36 composition `39628598419` (2/2), product `39628598572` (9/9), wrapper `39628598435` (2/2). | Retain the exact SHA links; further branch changes need their own exact-head checks. |
## 2026-10-21 16:00 UTC update

- **#52 P0 remains OPEN / NOT_VERIFIED.** M1 confirms a strict capability path exists but there is still no real first-party host consumer. M2's strict-only facade candidate is local at `3ba2df7`; M5 gives bounded API-shape ACCEPT. M5/M6/M7 have accepted the exact proposed delta, with M7 requiring its checker allowlist fix. M2 and M7 are implementing those owner-approved changes in parallel. After their exact refs are composed, real Console wiring, safe-read positive control, alias/path-replacement denial before effect, path-only denial, and exact-head CI are required. Cross-process OS-atomic TOCTOU remains unproven.
- **#66 P1 is CLOSED within its exact lock-lifecycle scope.** M6 head `9880360`, regression `c7c19e2`, exact CI 9/9, Windows wrapper 2/2, and focused regression 1/1 were verified; comment `6320408968`. Product E4 and clean-VM gates remain separate and open.
- **M7 clean-VM lifecycle #41 remains OPEN / HOLD.** Static package extraction is not installer execution; `installerExecuted=false`; no exclusive VM/installer resource is reserved.
- **M9 checks at `6c9c794` are GREEN** (product 9/9, wrapper 2/2, Ubuntu/Windows composition 2/2). This does not close #52, #41, native Shell #45, or independent E4 #57.
- **Package manifest not changed.** M2's revised facade candidate and M5/M6/M7 bounded reviews are local/source-level evidence; M2 manifest update and M7 checker fix are the active two-lane work. No package export is published until all required owners accept the same exact delta.


## 2026-10-21 16:05 UTC package boundary follow-up

- M5/M6/M7 gave bounded ACCEPT for the same M2 strict-facade API shape. M2's final local package commits are `e312ab9` and `e312398`; M7's exact checker fix is local at `f1adbfd`. These are separate existing PR branches, not yet an exact combined hosted run.
- M7's checker update allows only the facade and its runtime dependency and retains rejection for other unexpected package paths. Its local `pack:check` passed on the current package, which does not yet include M2's manifest delta. M2's dry-run confirms the two approved runtime paths, but its `pack:check` remains pending until the exact checker/package combination is tested.
- #52 remains OPEN/P0/NOT_VERIFIED: no first-party protected host consumer exists. The M2 package subpath alone does not complete Console wiring, validate the injected factory as the actual M5 router, prove protected I/O effects, or establish OS-atomic TOCTOU. Require exact combined package checks and then real route positive/negative controls before reducing the gate.

## 2026-10-21 16:17 UTC exact-review and shared-Hook CI follow-up

- M1 reviewed M2 local facade/manifest candidate through e312398. Adapter semantics are ACCEPT WITH CONDITIONS, but the package manifest commit e312ab9 is REJECTED as a security boundary because security-gateway-adapter.mjs is shipped and can be loaded by filesystem path to obtain the lower-level capability/callback surface. exports does not hide packed files. M2 is fixing the package behind the stable strict facade; keep #52 OPEN/P0/NOT_VERIFIED until exact packed-artifact review and host evidence.
- PR #30 exact head 3b4c758db7f188170e625adafa0eceb69c24229f has hosted CI run 39632423578 fail on Windows Node 22 in the shared Hook interruption assertion (ETIMEDOUT expected, false observed). M0's focused local suite on the exact coordinator checkout was 9/10: interruption passed locally, while the prior fixture-read assertion failed (deny vs expected allow). Root cause remains UNKNOWN. M0 posted exact evidence to existing Issue #60 comment 6320772813; M1 owns shared Hook semantics. No tests or security policy were weakened.
- The 16:10 UTC push batch advanced M0/M7 branches and moved public M2 only to facade commit 3ba2df7; M2 manifest commits remain local pending the M1 finding and M2 repair. Next push batch cannot occur before 16:30 UTC. At the last Usage read, five-hour quota was 77%; PR #24 remained OPEN/Draft at its unchanged head/base.
## 2026-10-22 16:24 UTC M2 package review and M3 protected-read candidate

- M2 local candidate on existing `feature/ac3-execution-isolation` is `be66cf8f4c1a60f093740577796ec5cd633e1d93`, clean and three commits ahead of public `3ba2df7b82d956c592dc689294c522813014bbd1`. M1 re-reviewed the actual packed artifact and returned **ACCEPT WITH CONDITIONS**: only the self-contained `gateway-adapter.mjs` is shipped; the low-level implementation is private and absent; package-name deep import and direct file URL import both fail for the omitted implementation. The trusted host must supply the real M5 router factory. This is package/API evidence only; external OS-atomic TOCTOU remains unproven.
- M3's existing `feature/ac3-agent-onboarding` has local commit `429cd73c03273bc77f3781b489f541e396cd9361`, clean and one commit ahead of its remote. Its fixed `protected_read` path uses the public M2 facade, M5 router, and M1 held-file capability; absent owner interfaces return `UNKNOWN` without a path fallback. Build passed, focused tests 4/4, and `git show --check` passed. A separate cross-worktree candidate probe passed safe read and denied alias/inode replacement before callback/evidence, but M3's branch lacks the owner APIs, so this is not unified exact-source/Codex-host proof. Keep #52 OPEN/P0/NOT_VERIFIED pending M9 exact-source integration and supported-host evidence.
- M7 PR #39 remains OPEN/Draft at `f1adbfd95430f1193c8aabb7de195ed1dcee1f9e`; exact-head CI run `39632431622` was still queued at this checkpoint. M7 is now adapting only its owned package policy/tests to allow the newly reviewed single facade file and reject the omitted implementation and all unexpected adapter files. The M7 lane is local only; no push yet.
- Usage Overview reads 77% five-hour / 52% weekly; tab `336903978` remains open. PR #24 remains OPEN/Draft, base `dc8d0092b35141b295d5ff42873584ed488e4ee7`, head `62496d4020bd90ba2eede49b2e80a2bbebb036b4`, unchanged. Last push batch was 16:10 UTC; next batch is not before 16:30 UTC and requires fresh quota, PR #24, and remote-ref preflight. No merge, Release, installer/VM, or real-model run.

## 2026-10-21 16:29 UTC M7 package-check dependency

M7's local package checker candidate now admits only the M2 strict facade. M2's separate branch still has the older package-smoke policy, so publishing M2 alone would not validate the adapter artifact. Issue #68 tracks an isolated M9 run of the actual M2 pack with the exact M7 checker. Do not treat M7's own 90-file package smoke as evidence for M2's tarball; keep Issue #52 OPEN/P0 until the host path gates also pass.

## 2026-10-21 16:45 UTC M9 exact-source candidate and remaining P0 boundaries

M9's existing branch has local commit `24dcfd1aed2a9ba9ddd7aecd7b92e78f3947ee19`, pinning M1 `7279336`, M2 `be66cf8`, M3 `429cd73`, M5 `bbce79a`, M6 `9880360`, M7 `cdae8ba`, and M8 `2d5a0ff`. The real M2 packed artifact passes the exact M7 policy/checker in a disposable checkout, and local M9 packed-facade composition passes 8/8. M1 security-contract review and hosted exact-head CI remain pending; M2 `be66cf8` must be published before a PR #36 update triggers the pinned workflow.

The M9 fixture proves a synthetic protected read through the packed public facade and injected exact M5 router, denies fixed-path aliases before callback, and denies a same-path replacement before Gateway evidence. Existing M1/M2/M5 tests retain junction/path-only deny controls. This is still source-fixture evidence: no first-party production host callsite, installed host behavior, or OS-atomic concurrent-mutation proof is established. Issue #52 stays OPEN/P0/NOT_VERIFIED. M3's separate Windows Node 20 CI failure is the fixture teardown ordering tracked in PR #33 comment `6321265739`; it is not classified as a protected-read assertion failure.

## M0 current exact-source risks — 2026-10-22 12:40 UTC

- **P0 #52 — unresolved first-party route:** M4 issues the status request, but the current M3 backend lacks its route. M9 exact head `7c8d808` passes cross-module synthetic composition on Ubuntu/Windows; this is not the product Console host path or OS-atomic TOCTOU evidence.
- **P1 #69 — M2 package-smoke:** OPEN; the exact public facade exists, but its separate package-smoke policy gate remains unresolved. Do not widen allowlists or skip checks.
- **P1 #70 — Hono GHSA-5r4p-p66f-jhc7:** OPEN with existing Dependabot PR #67. Current default lock has vulnerable Hono 4.13.7 via runtime MCP SDK dependency; GitHub code search found no `serveStatic` use in repository source, so exploitability in this app is unconfirmed. M7 owns package/release verification.
- **M9 PR description:** stale against current head `7c8d808`; it still says the packed M2 candidate is not included, although current exact-head composition tests it. Refresh the PR evidence text before final review.

## M0 exact-source checkpoint — 2026-10-22 13:00 UTC

- **#52 P0 remains OPEN / NOT_VERIFIED.** Current M3 Console backend lacks `/api/security-center`; M4's UI request exists. M1 held-file, M2 public-facade, and M5 strict-router contracts are individually present and exercised in M9 synthetic composition, but first-party Console host wiring and OS-atomic TOCTOU remain unverified.
- The 12:40–13:00 M3+M5 slot ended with no owner-authored response/head movement. Exactly M1+M3 are active 13:00–13:20 to confirm held identity and implement the route.
- M9 PR #36 exact head `7c8d808` has successful Ubuntu/Windows composition, product CI 9/9, and wrapper 2/2. Its PR body still contains stale claims and needs an owner refresh before final integration review.
- P1 #69 (M2 package smoke), #70 (Hono GHSA), #71 (M3 Windows teardown), and #72 (M1 exact Hook review) remain queued behind P0. #53 remains closed only for its packaged Hook logging scope.


## 2026-10-23 05:36 UTC bounded risk update

- **#75 P1 CI availability — mitigation verified, issue closed:** exact M8 head passes sponsor-smoke, full CI and wrapper. Deterministic EADDRINUSE injection verifies the failure mode and retry. The hosted run's original port owner is unknown; the probe-close/child-bind race is plausible, not proven as the only cause. No security acceptance is inferred.
- **#54 P1 Windows Node 22 provider retry — OPEN / UNKNOWN:** exact current head and one targeted run pass, but the historical hosted failure lacks request-count/error-code evidence. M9 owns test diagnostics; provider/transport code ownership remains open.
- **#70 P1 Hono GHSA — OPEN:** current PR #67 exact CI including package-smoke is green and bumps transitive Hono to 4.13.13. Default branch remains on 4.13.7, which falls in the official advisory affected range `>=4.12.4, <4.13.11`; patched version is 4.13.11. Static search found no `serveStatic` callsite but is not proof of non-reachability. Do not merge; issue remains until default-branch/advisory state is rechecked. Source: https://github.com/advisories/GHSA-5r4p-p66f-jhc7.
- **#45 P1 native Codex Shell — OPEN / UNPROTECTED:** M2 is reviewing the current host boundary and user-facing claims; no new native model run is authorized or reported. Keep protection status explicit.

## 2026-10-23 05:42 UTC integration gate delta

- M2 #45 remains UNPROTECTED / NOT_VERIFIED until native Shell OS enforcement is verified; the committed text update is disclosure only.
- M9 #49 owner-contract parity is corrected locally, but integration remains pending publication and current-head CI. The full composition result is not transferable across mismatched M2/M8 pins.
- Push batches are limited to one every 5 minutes; quota below 5% or unreadable stops work before any new push.
## 2026-10-23 05:51 UTC gate update

- M9 contract parity is resolved at current head; hosted composition is green, but this only clears #49 documentation drift and does not prove protected file-read host wiring.
- M2 PR #37 is red on the unchanged M1 file-state-store concurrency test at exact head; parent passed. Keep #51 OPEN and the trigger UNKNOWN until owner evidence exists. Do not claim corruption or suppress RETRY_LIMIT.
- #52 held-identity product path and #57 independent E4 remain NOT_VERIFIED. The VMware/real-model/installer resource remains unreserved.

## 2026-10-23 05:55 UTC P0 and independent E4 gate

- M1's exact M2-head disposition is limited to API/adapter compatibility; it does not prove a first-party host callsite or OS-atomic held-file identity.
- M5 policy tests and M4 UI/virtual-console paths must not be presented as product OBSERVE file-read protection without the exact supported consumer path and held-identity controls.
- M6's current evidence gap is independent product E4 provenance and receipt; M7's hosted package/lifecycle artifacts do not satisfy the separate acceptance.
- Resource log correction: hosted installer lifecycle run 39904585994 was completed under PR #39 at 05:16 UTC, without a #29 reservation record. No workflow is active now; slot is free for a future explicitly reserved run.
## 2026-10-23 16:22 UTC — M9 composition remains blocked

| Gate | Priority | Current evidence | Remaining acceptance |
| --- | --- | --- | --- |
| M2/M3 Hook parity and reason projection (#88/#89/#72) | P0 | Current M9 exact-head run 39978172198 fails both Ubuntu and Windows; M2 and M3 Hook blobs are d6f93249306b7966259cab463dd39475728ef338 while M1 canonical is b7ed4aba70a597f4f63a05decc6de1b32f67372e. Caller-controlled synthetic reasons reach stdout for allow/deny/ask. | M2/M3 reconcile owned copies with M1 canonical or secure an M1-reviewed contract; decisions unchanged; all output canaries absent; exact M9 rerun green. |
| Registered held-file read (#87) | P1 | Current exact-source test still expects OBSERVE_ONLY and receives DENY / path_execution_not_pinned on both platforms. | M2 capability-bound adapter + M5 strict-router integration with M1 contract review; retain all sensitive-path, alias, and path-only denials. |
| M8 current candidate review (#59) | P1 | Current M8 dedicated workflow test passes, but issue #59 remains open for exact M6 shared E4 test disposition and M1 review of new Hook-output test. | M6 and M1 exact-blob ACCEPT/REJECT; M9 composition on final reviewed refs. |
| Independent product acceptance (#52/#57) | P0/P1 | Separate from the synthetic composition run; both remain NOT_VERIFIED. | Verify first-party held identity and protected-path behavior, and independent E4 receipt/provenance. |

Historical exact-source run `39986788529` was 15/20 on Ubuntu and Windows. It was superseded by current-ref composition run `40066875122`, whose Ubuntu and Windows jobs both completed successfully on head `cbb2e7db38eee0dc1a23e6e7804ff77d0088d84f`. This closes that source-composition gate only; product-host, packaged installer, and independent E4 acceptance remain open.

## 2026-10-24 07:32 UTC — historical M1 interruption-test flake closed

| Gate | Priority | Verified state | Remaining acceptance |
| --- | --- | --- | --- |
| Windows Hook interruption test timing (#32) | P1 | Closed after M1 identified the old fixed 1-second marker window as a test-harness timing failure, merged the asynchronous bounded-marker correction through PR #43, and current-base CI run `40072794731` passed Windows Node 20/22 and package-smoke. | This closes the historical test-harness flake only. Synthetic subprocess coverage does not prove native-host callback interception; product host acceptance remains under #52. |

## 2026-10-24 07:42 UTC — M7 lifecycle checksum contract still blocks acceptance

| Gate | Priority | Verified state | Remaining acceptance |
| --- | --- | --- | --- |
| Installer lifecycle input contract (#41) | P1 | M7 branch `ab9b03f` still has an 11-path producer and a strict 7-path consumer. M0 recorded the four exact missing paths and ordered-list regression request in #41 comment `6381585159`; no install run was started. The existing uncommitted workflow diff also enables lifecycle on every pull request without a concurrency group; M0 flagged the #29 reservation risk in comment `6381618783`. | M7 must synchronize the exact ordered lists without wildcard/bypass, preserve all existing validation, run exact-head CI/build, and keep lifecycle behind an explicit reservation gate or serialized slot before execution. |

| Auto E4 stale-lock race (#78) | P1 | Closed after exact-source review of merged PR #39: stale locks fail closed; release compares held-file identity and exact parsed owner fields; concurrent and replacement tests plus exact PR CI pass. | Independent product E4 remains NOT_VERIFIED under #57/#80. |

## 2026-10-24 07:45 UTC — M6 Draft targeting boundary

| Gate | Priority | Verified state | Remaining acceptance |
| --- | --- | --- | --- |
| M6 legacy E4 Draft (#31) | — | Older PR #31 remains OPEN/Draft against `main`; the E4 runner, guide, and evidence paths are present in current feature history, and newer PR #38 is merged into feature. | No `main` merge or PR retarget by M0. Authored source evidence remains separate from independent product E4 tracked by #57/#80. |

## 2026-10-23 16:33 UTC — Current exact-source integration result

| Gate | Priority | Current evidence | Remaining acceptance |
| --- | --- | --- | --- |
| Hook parity and output redaction (#88/#89/#72) | P0 | Run 39986788529 fails on both Ubuntu and Windows; M2/M3 reasons for allow/deny/ask reach stdout, and M2/M3 Hook blobs differ from M1 canonical. | M2/M3 owner changes or M1-reviewed contract; preserve decisions; all output canaries absent; exact M9 rerun green. |
| Registered held-file read (#87) | P1 | Positive read still returns DENY / path_execution_not_pinned instead of OBSERVE_ONLY on both OSes. | M2 capability-bound adapter plus M5 strict-router integration and M1 contract review; all path, alias, and no-capability denials retained. |
| M8 current-candidate review (#59) | P1 | Current M8 dedicated step passed, but exact M6 shared-test disposition and M1 Hook-output test review remain open. | M6/M1 exact-blob dispositions and final M9 composition. |
| Product host / independent E4 (#52/#57) | P0/P1 | Separate acceptance gates remain NOT_VERIFIED. | Actual supported host-held identity/security behavior and independent E4 evidence. |

Current exact-source composition remains 15/20 on both Ubuntu and Windows; no M9 completion claim is supported.

## 2026-10-24 05:54 UTC — post-M9 exact-source risk update

| Gate | Priority | Verified state | Remaining acceptance |
| --- | --- | --- | --- |
| M3/M5 public route (#81) | P1 | Closed: M3 #107 plus exact-source M9 run `40066875122` passed Ubuntu/Windows export, fixed-probe, and protected-read composition checks. | Product-host use and real protected-open remain separate under #52. |
| M1/M2/M5 held-read chain (#87) | P1 | Closed: exact M9 run `40066875122` passed packed-M2 positive OBSERVE read and sensitive/link/hard-link alias denials on Ubuntu/Windows with no callback/approval side effects. | First-party product-host adoption and OS-level TOCTOU remain open under #52. |
| M8 module merge (#40/#99) | P1 | M8 PR #40 remains Draft at `60cfe8d`; reviewed source CI and M9 composition pass. M8 owner disposition is missing; PR's recorded base SHA `416f1ba` predates feature `f313e5f`. | Record exact M7 build-contract/provenance disposition and reconcile the post-M9 base before merge. |
| Product/installed acceptance (#52/#93/#41/#57) | P0/P1 | Still OPEN/NOT_VERIFIED; exact source CI does not establish host interception, installed Hook runtime, clean-VM lifecycle, or independent E4. | Require the actual supported-host, package-runtime, clean-VM and independent E4 evidence for the relevant gate. |

## 2026-10-24 06:03 UTC — bounded offline demo gate

| Gate | Priority | Verified state | Remaining acceptance |
| --- | --- | --- | --- |
| Offline demo / Community staging (#102) | P1 | Closed: M8 clean-worktree build and six-case offline runner pass at exact PR #40 head; M7 build evidence and M9 Ubuntu/Windows exact composition pass with the fixed M8 blob. | No installer execution or independent E4 claim; those remain #41/#57/#93. |

## 2026-10-24 06:15 UTC — installer lifecycle remains blocked

| Gate | Priority | Verified state | Remaining acceptance |
| --- | --- | --- | --- |
| M7 hosted installer lifecycle (#41) | P1 | Workflow `40068894360` passed both wrapper regressions and Community build evidence, then failed before Setup.exe with `SHA256SUMS_PATH_UNEXPECTED`; artifact says installer not executed. Exact producer checksum set has 11 paths while consumer allowlist has 7. | M7 aligns the exact path sets without wildcards/check bypass, reruns current-source CI/build evidence, then reserves one installer slot for a new lifecycle attempt. Windows 11, ordinary-user, upgrade, cancel rollback, EFS, and independent E4 remain unverified. |

## 2026-10-24 09:51 UTC — current release PR checks

| Gate | Priority | Verified state | Remaining acceptance |
| --- | --- | --- | --- |
| Current-ref M9 composition (#76) | P1 | PR #24 exact-head run `40068981943` and M0 PR #109 exact-head run `40083853294` both skipped composition. On #109 head `0543e82`, standard CI `40083853286` passed 9/9 and ownership evidence `40083853320` passed. M0 recorded the paired reproduction in #76 comment `6382817912`. | M9 updates the existing trigger/ref contract and obtains successful exact-source Ubuntu/Windows results on intended current refs; skipped status never closes the gate. |
| PR #24 current-head CI | P1 | Head `e4732d9`; standard CI `40068981954` passed 9/9 and Community/wrapper run `40068981872` passed. Current-ref composition `40068981943` and installer lifecycle were skipped. | M9 must run the intended current refs on both OSes; M7 must fix the checksum contract and reserve a serialized installer attempt before lifecycle acceptance. |
| M8 reconciliation (#40/#99) | P1 | PR #40 remains Draft at `60cfe8d`, based on `416f1ba`; read-only merge-tree against `e4732d9` still reports 12 conflicts and the M8 owner disposition is absent. | M8 resolves the existing branch against the current base by ownership, posts its #99 disposition, and passes current-base checks plus exact-source composition. |
| Product acceptance (#52/#93/#41/#57) | P0/P1 | Separate host, packaged-Hook, clean-VM lifecycle, and independent E4 acceptance remain NOT_VERIFIED. | Each owner supplies artifact/runtime/operator evidence for its own acceptance scope; source CI and skipped jobs do not close these gates. |

## 2026-10-25 06:01 UTC — current integrated feature risks

| Gate | Priority | Verified state | Required next evidence |
| --- | --- | --- | --- |
| Protected file identity / OS-atomic TOCTOU (#52) | P0 | M1 source fixtures pass; product-host held-identity consumption and atomic replacement race remain NOT_VERIFIED. | M1 supplies exact supported host/build, effective trusted integration state, safe-read positive control, alias/junction/replacement denials before callback, zero effects, and OS-atomic TOCTOU control, or a precise blocked boundary. |
| Native Codex Shell (#45) | P1 | M2 protocol fixture denies; native host path remains UNPROTECTED / BLOCKED_NOT_VERIFIED. | M2 demonstrates host-observable deny with trusted active policy and unchanged inert target, or documents exact unsupported host capability and visible boundary. |
| E4 synthetic Gateway canary failures (#118) | P1 | Reproduced twice at product baseline: both scenarios end `GATEWAY_EXECUTION_FAILED_EFFECTS_NOT_ROLLED_BACK`; fixture targets stay unchanged. | M1 owns diagnosis after #52 slot; preserve quarantine, explicit denial, and zero-effect assertions. |
| M6 independent product E4 (#57) | P1 | Developer SELF_CHECK and 41/41 evidence tests are not independent install/model acceptance; separate reviewer receipt absent. | Authenticated artifact provenance, clean independent installed-product run, and distinct signed reviewer receipt. |
| M7 installer lifecycle (#41) | P1 | Prior hosted install/uninstall bounded job passed; Windows 11, standard-user, upgrade/cancel rollback, EFS, and independent acceptance remain unverified. | Owner-reviewed current-source lifecycle run and explicit environment/limitation report; keep installer/VM resource serialized. |
| Full local verification | P1 | One-click run: build passed; 506/518 suite tests passed, one Python-dependent failure, 11 skipped; 41/41 E4 self-check passed. | Provide the pinned Python runtime to reproduce the builder regression; do not convert missing prerequisites to PASS or skip the assertion. |
| Current M9 composition | P1 | Exact-head M0 PR #119 run 40165627637 passed Ubuntu/Windows; M9 integration PR #36 and repair PR #117 are merged. | Keep composition bound to immutable current refs and rerun when module source heads change; green composition alone does not close the product-level gates above. |
## 2026-10-25 06:01 UTC — branch comparison correction

M4 and M5 current source/test contents are already present in PR #24's feature tree (verified by exact Git blob identity); M5 follow-up PR #94 is merged. M7 `bba0f0f` is also already an ancestor of the feature tree. The old M7 reliability branch has a stale divergent graph and must not be merged wholesale. Remaining M4/M5/M7 risks are their scoped host/lifecycle acceptance gates, not missing duplicate source changes.
## 2026-10-25 06:08 UTC — one-click automation completeness

The one-click runner now executes each local stage independently and verifies a generated evidence bundle even when the synthetic E4 command returns FAIL. Latest run: build PASS, full suite 506/518 (one unusable-Python prerequisite failure, 11 skipped), package-content check PASS, E4 self-check 41/41 PASS, generated bundle verification PASS, and two repeatable synthetic Gateway failures remain open under #118. Product E4 remains NOT_VERIFIED.

## 2026-10-25 13:50 UTC — current M9 and owner acceptance risks

| Gate | Priority | Verified state | Remaining acceptance |
| --- | --- | --- | --- |
| Exact M9 candidate composition (#124/#125) | P1 | Candidate SHA `b5b9f71` passed exact-source composition on Ubuntu and Windows in run `40198737633`, including M3 `9169552`, M4 `5d975b7`, M5 `dde81d6`, and M6 `fae72ea`. PRs #120/#121/#123 still show older feature-base manifest failures; candidate dispatch does not rewrite those checks. | M5 approved-baseline sync and M1 policy review; current PR events must consume an accepted current M9 source before module PRs leave Draft. |
| M5 package/test coverage (#122/#124) | P1 | M5 `npm test` at `dde81d6` reports 500 total (489 pass, 0 fail, 11 skipped) but its package script omits current-base `test/m9-security-composition.test.ts`. `npm run pack:check` fails ENOENT in `scripts/check-sdk-types.mjs:9` for the unpacked package metadata. Read-only merge-tree shows conflicts in `docs/RISK_POLICY.md`, `package.json`, and `test/policy-management.test.ts`. | M5 owner synchronizes/resolves the existing branch, preserves the full base test list, repairs package-check path, and reruns exact-head tests. M1 reviews the exact policy diff. |
| Synthetic Gateway quarantine behavior (#118) | P1 | Product baseline `b0d8d77` run `20261025T133314087Z`: two E4 cases fail with `GATEWAY_EXECUTION_FAILED_EFFECTS_NOT_ROLLED_BACK`; protected fixtures remain unchanged. Full suite has 0 failed tests and 11 skipped. | M1 fixes/evaluates the race on the existing branch; require decoy result, immediate quarantine, subsequent DENY/NOT_STARTED, byte-identical target, session positive control, and Windows/Linux regressions. Keep P0 #52 separately OPEN. |
| Product-held path and native Shell (#52/#45) | P0/P1 | M1 source audit finds no reproduced source defect; product host/OS-atomic behavior remains BLOCKED/NOT_VERIFIED. M2 protocol evidence does not attest a trusted active native Shell boundary; feature remains UNPROTECTED. | Obtain supported-host effective policy/Hook evidence and harmless native sentinel controls, or retain explicit blocked/unprotected product status. No global trust/ACL/sandbox change was made. |
| Clean-VM installer lifecycle (#41) | P1 | Current source checks are not installer evidence; no current clean VM lifecycle receipt is attached. | Reserve the exclusive VMware/installer slot, then complete install/upgrade/cancel/uninstall/EFS controls with matched current artifact and receipt. |
| Independent product E4 (#57) | P1 | One-click E4 and M9 composition are automated source/evidence checks; independent operator/reviewer receipt and real-model call remain absent. Product E4 is NOT_VERIFIED. | Obtain authenticated artifact/source provenance, clean isolated product run with real tool call, and separate signed reviewer receipt. |

The one-click matrix is available at `coordinator/security-lab/e4-one-click-runs/20261025T133313640Z/full-matrix/AC3_ALL_ONE_CLICK_RESULT.md`. It reported 33 PASS, 9 SKIPPED, and 4 FAIL. Do not interpret the green M9 candidate as closing clean-VM, product-host, real-model, or independent-review gates.

## 2026-10-25 13:53 UTC — worktree metadata ownership

| Gate | Priority | Verified state | Remaining acceptance |
| --- | --- | --- | --- |
| M4/M7 worktree administration | P2 | M4 and M7 are separate working directories with the expected branch/origin, but their `.git` files point into the pre-existing Windows-E4 repository's worktree metadata, outside the coordinator repository. M4 is clean; M7 is 3 commits ahead with a dirty `.gitignore`. A separate M7-followup worktree exists under the coordinator repository. | Preserve both worktrees and M7 changes. Confirm owner/metadata handoff before any migration; do not unregister or relocate them during active work. |

## 2026-10-26 05:11 UTC — module source-root ambiguity (#126)

| Risk | Priority | Evidence | Gate |
| --- | --- | --- | --- |
| M1–M8 distinct source ancestry | P1 | Reflogs name separate `origin/feature/ac3-*` creation refs; exact common ancestors and left/right counts are recorded in #126. | Owners declare one canonical base or a reviewed intentional exception. Preserve existing branches and dirty files; update exact M9 pins only after owner review and terminal composition checks. |

This is a history/integration risk; no module code failure or data loss is claimed. PR #24 and `main` remain protected.

## 2026-10-26 20:02 UTC — merge-tree simulation against current feature baseline

The M0 one-click runner now simulates committed M1–M8 source merges against baseline `34fbe6d35d4dea30795525bf538f97194758c6c4`, without modifying refs or worktrees. Current result: M5 conflicts in `docs/RISK_POLICY.md`, `package.json`, and `test/policy-management.test.ts`; M7 conflicts in `.github/workflows/windows-community.yml`, `INSTALLER_ACCEPTANCE.md`, and `package.json`; M1–M4, M6, and M8 have no textual conflicts. GitHub reports #122 as mergeable despite the local simulation; its stored PR base SHA is `b0d8d77c1f13a6f3ee3a9270ddd4fc0507ff4097`, while the target branch is now `34fbe6d35d4dea30795525bf538f97194758c6c4`. Keep the discrepancy open for owner reconciliation; M0 did not resolve conflicts or alter module branches.

## 2026-10-26 20:18 UTC — exact-head one-click refresh

| Gate | Priority | Current verified state | Required owner action |
| --- | --- | --- | --- |
| Synthetic Gateway quarantine (#118) | P1 | Run `20261026T200804848Z`: both `GW-CANARY-BLOCK` and `CANARY-SESSION-ISOLATION` fail with `GATEWAY_EXECUTION_FAILED_EFFECTS_NOT_ROLLED_BACK`; fixture state unchanged. Product E4 remains NOT_VERIFIED. | M1 fixes the triggering decoy-read cancellation ordering while preserving quarantine, follow-up DENY, zero effects, and positive controls; rerun focused Windows/Linux cases. |
| Direct module composition (#124/#125/#126) | P1 | PRs #120–#123 are still based on stored SHA `b0d8d77…`; exact-source composition fails. Candidate M9 PR #127 is green at `635f8bc…`, but its current M7/M8 pins do not match local owner heads. | Owners reconcile common-source ancestry and provide exact commit disposition; M9 updates pins only after required reviews. |
| M5/M7 branch integration (#126) | P1 | `merge-tree` against current `34fbe6d…` reports M5 conflicts in `docs/RISK_POLICY.md`, `package.json`, `test/policy-management.test.ts`, and M7 conflicts in `.github/workflows/windows-community.yml`, `INSTALLER_ACCEPTANCE.md`, `package.json`. | M5 and M7 resolve conflicts on their existing branches without dropping commits or weakening security gates; rerun direct checks. |
| M5 package verification (#124/#122) | P1 | One-click safely BLOCKED `pack:check` before npm because explicit `--prefix installDir` safety is not proven. | M5 updates the owner checker to prove a child OS-temp install root and npm `--prefix`; rerun package/type checks. |
| M7 Community artifact provenance (#41/#126) | P1 | Build-only run `40392406497` produced an unsigned installer with SHA-256 `d22e72bf…`; 11/11 internal checksum entries match. Its build report binds M8 `24b86517…`, while M9 pins `1c94ed4…` and the current M8 head is `685520c…`; lifecycle job was skipped. | M7 aligns its exact M8 source selection with the reviewed M9 candidate, rebuilds, then runs the matched artifact only in the reserved clean-VM slot. Do not treat this artifact as current-source install evidence. |
| Default-branch Hono advisory (#70/#67) | P1 | Dependabot alert remains open for Hono `4.13.7` on `main`; existing PR #67 at `cda74e9…` passes 9/9 checks but has not been applied to the default branch. | Keep the advisory OPEN until the existing remediation reaches the default branch and GitHub confirms the alert resolved; no merge was attempted. |
| Product E4 and external environment (#29/#41/#57) | P1 | Clean VM, matched installer receipt, real-model tool call, and independent reviewer receipt remain absent; no exclusive VM/model/installer test was started. | Reserve and record the exclusive slot and exact artifact/VM before any installer/model run; obtain independent signed review separately. |

The fresh full-matrix report is `coordinator/security-lab/e4-one-click-runs/20261026T200804542Z/full-matrix/AC3_ALL_ONE_CLICK_RESULT.md`. Its 44 PASS rows do not close these owner or product acceptance gates. PR #24 and `main` remain protected.

## 2026-10-26 20:43 UTC — direct-composition validation root cause

The one-click run `20261026T203606810Z` completed with 43 PASS, 9 dependency-install SKIPPED, and 13 FAIL/BLOCKED rows. Failed direct-composition job logs for PRs #120/#121/#122/#123/#129 all stop at exact-source manifest validation before the integration tests run. Their event-base M9 manifest still expects older exact source refs (M3 `0d61b43`, M4 `892d329`, M5 `cca42cd`, M6 `2a88d8b`, M8 `1c94ed4`), while the corresponding current PR heads are M3 `9169552`, M4 `5d975b7`, M5 `dde81d6`, M6 `fae72ea`, and M8 `685520c`. M5 PR #122 additionally fails ownership evidence because it lacks approved common-source baseline `e4732d9745bb4fbbebf6896a35b4657ad82abd73`; M8 PR #129 ownership evidence also remains failed. These are source-anchor/ownership gates. They do not prove module integration tests passed, and M0 must not weaken the exact-source validator.

The existing M9 candidate PR #127 passes composition for the refs in its own manifest but remains Draft until M7/M8 owners disposition their newer heads and the M6-scoped M8 review is supplied. Do not advance pins or merge #127 based only on local heads. M7 PR #128 remains conflicting; local merge-tree also shows M5 conflicts in `docs/RISK_POLICY.md`, `package.json`, `test/policy-management.test.ts` and M7 conflicts in `.github/workflows/windows-community.yml`, `INSTALLER_ACCEPTANCE.md`, `package.json`. Owners must reconcile on their existing branches, then provide exact-head CI and reviewed refs.
