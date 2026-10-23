# M9 exact-source composition snapshot — 2026-10-23

This snapshot records the source revisions pinned by the M9 composition workflow. The workflow checks out each source independently and validates the checked-out SHA before running the focused owner regressions and M9 composition tests.

| Module | PR | Exact source SHA | M9 coverage |
| --- | --- | --- | --- |
| M1 Gateway | #43 | `6886d6eef3beb972bc8f4c797584b0f522483870` (current PR head; exact CI green) | Held-Gateway regression and synthetic protected-read composition; lock-metadata denial maps to fail-closed BUSY |
| M2 isolation | #37 | `67428139e53c3f63a1101b4f94e84b291cbb1196` | Exact CI run `39866513817` passed 9/9; docs-only delta from the prior pin; package build, tarball facade, package policy and synthetic composition |
| M3 onboarding | #33 | `c7b7772c9d62e138e1cc6deed7c43104eaccafa6` (current PR head) | Trusted Console bootstrap is required for the fixed synthetic protected-read action; M3-only and incomplete composition fail closed before probe/Gateway/router work. Local build and route regressions passed 8/8; a production bootstrap is not established |
| M4 desktop security center | #34 | `4f83140807a48bfe0d3273e2493a2124f533b8a0` (current PR head) | Security-center copy/status assertions clarified against the M3 fixed-probe boundary; first-party host read remains NOT_VERIFIED |
| M5 policy | #47 | `12b2499a1f7b8525f3bf2d7659249c1bd8e881ed` | Exact CI run `39867073839` passed 9/9; risk-policy source and regression changes verify deterministic DENY skips optional review, approval and execution callbacks |
| M6 E4 | #38 | `3578e7ba10b2fd160efa0e4683aba863c666db8a` (current PR head) | Adds a failure when a model fixture mutates its target; M9 now checks the historical lifecycle assertions remain intact while allowing additive regression coverage |
| M7 reliability | #39 | `f20e307458f4c703459621fd48e44a9e806f03bb` (current public PR head) | Bounded installer receipt phase markers; M9 reruns exact-toggle unit regressions. No real installer/VM acceptance; Issue #41 remains OPEN/HOLD |
| M8 open-source product | #40 | `854de50d94637caf3f334de7d28dcdcaddd88f9f` (current public PR head) | Documents first-party Security Center protected-read as NOT_VERIFIED; existing Hook provenance, LF checkout and sanitized JSONL regressions remain pinned |

## Owner-review boundaries

- M1 Issue #52 comment `6349691761` approves the exact historical M2 source `099ad64e4a09330920cbd40847adec3fe631e91e` for the M1 Gateway/M2 adapter API contract only, with historical M1 review base `a5eff766ebe041bc2c6cc13758827d5a96205de9`. Current M2 `67428139e53c3f63a1101b4f94e84b291cbb1196` descends from that reviewed source, but the exact-source approval does not cover later M2 changes. Current M1 `6886d6eef3beb972bc8f4c797584b0f522483870` descends from the historical review base; the comment does not accept the new M1 read implementation, a first-party host integration or TOCTOU protection.
- M1 Issue #72 comment `6347268881` reviewed M3 source `27d4a20a20894c7b779edf68d8bf79685bc0e69b` for three Hook-related blobs only, with the same historical M1 review base. M9 checks those same blobs remain unchanged in the current M3 source; this is not an M1 review of the newer M3 Console route or its tests.
- M6 Issue #59 comment `6346660246` reviewed exact M8 source `72b4aab0fb5cb2dd4cd3b75ee8a73ad22dd001db` and M6 lifecycle contract source `2cebabc81d7908c04ddfa10378fa1d3427b92cf4`. Historical M8 `35aa22f3087ed1859da19acbf12cc4c767dd4f3d` is a descendant with only `E4_EVIDENCE_INDEX.md` changed since prior pin `5bf5d4f0a1fee8b4d7ef72ec474e9ca7a7ba9d3d`; latest M8 `854de50d94637caf3f334de7d28dcdcaddd88f9f` adds documentation only, and the M6-reviewed `test/auto-e4.test.mjs` blob remains identical. The former M6 pin `15e1663eac9c3932165fca9b39587115345f289c` retained the full reviewed lifecycle test blob. Current M6 `3578e7ba10b2fd160efa0e4683aba863c666db8a` adds regression tests to that file; M9 checks every previously reviewed line remains in order. These scoped dispositions do not accept unrelated changes in current module heads.
- M6 current exact-head hosted CI run `39864322034` and wrapper run `39864322029` are green (9/9 CI, 2/2 wrapper). This does not establish installer, clean-VM, real-model or external E4 behavior.
- M2 candidate `67428139e53c3f63a1101b4f94e84b291cbb1196` exact CI run `39866513817` passed all nine checks. M5 candidate `12b2499a1f7b8525f3bf2d7659249c1bd8e881ed` exact CI run `39867073839` passed all nine checks. Historical M8 candidate `35aa22f3087ed1859da19acbf12cc4c767dd4f3d` exact CI run `39867080161` passed all nine checks and wrapper run `39867080178` passed 2/2; current M8 head `854de50d94637caf3f334de7d28dcdcaddd88f9f` has exact CI run `39878036234` and wrapper run `39878038319` passed. These owner CI runs do not replace the final M9 hosted exact-source composition run.

## Current-head pre-integration checks

- On the local Windows host, the prior M2 `92a9562` `npm run build` passed. M7 `868842b` `npm run pack:check -- --package-root <M2 source>` passed for that M2 source (91 packaged files); candidate M2 `6742813` is docs-only from the prior pin and has exact hosted CI above.
- M6 `15e1663` local bundle-verifier tests passed 18/18 and Auto E4 lifecycle tests passed 9/9. Prior M8 `5bf5d4f` local provenance/LF checks passed 2/2 and the sanitized JSONL positive-control test passed 1/1; candidate M8 `35aa22f` is docs-only from that pin and has exact hosted CI above.
- M3 PR #33 public head `545958391c44e4a8207e77881e76b615476adf6c` completed exact-head CI run `39857317515` with all nine checks passing, including package-smoke. Follow-up `42559bcbd6223c035014d982d1be3ed420d39e3f` was pushed and its exact-head CI run `39858638467` passed all nine checks; focused M3 tests passed 11/11. The later docs-only point `34b526d4d63f28c09400e0130b09ead13d394aca` recorded a blocked Console consumer contract. Current PR head `c7b7772c9d62e138e1cc6deed7c43104eaccafa6` adds a fixed protected-read action behind trusted composition bootstrap; its local build and focused route tests passed 8/8, while product bootstrap remains unverified.
- M1 PR #43 current head `6886d6eef3beb972bc8f4c797584b0f522483870` fixes Windows lock-metadata `EPERM`/`EACCES` classification to fail-closed `BUSY`. The targeted local Windows regression `four concurrent processes preserve every quarantine without lost writes` passed 1/1; exact-head CI run `39860277883` passed all nine checks and repeated Ubuntu lock tests run `39860277943` passed 2/2.
- M4 PR #34 merge candidate `264bc288dc92a75e424e366a070420f8d7e2e131` has parents `0930ca5` and M1 `6886d6e`; its owner reports M4-only diff, `npm run build`, `runtime-console.test.ts` 11/11, and `git diff --check` pass locally. Our detached exact worktree independently passed the same build and focused tests 11/11. Exact-head run `39861054645` passed all 9/9 checks, including package-smoke and Windows Node 20/22. The prior 0930 run `39859348367` failed Windows Node 20 and 22 in `four concurrent processes preserve every quarantine without lost writes` (`STATE_STORE_IO`) before M1 6886 was included. The fresh M9 composition at exact M4 264 passed 11/11 locally. Hosted M9 Ubuntu/Windows composition and any M9 push remain pending.
- M7 PR #39 current head `4f986cc83bc62a1d2b23175ee5a0a77b82837310` passed exact CI run `39862638143` (9/9) and Windows Community run `39862638184` (3/3, including pinned NSIS/install evidence and wrapper checks). Local exact M7 `pack:check` against M2 passed for 91 package files; the two M7 package-contract/positive-control regressions used by M9 passed 2/2. The full M9 composition with this new M7 pin passed 11/11. These checks do not establish clean-VM installer lifecycle; Issue #41 remains OPEN / NOT_VERIFIED.

## Latest coordination batch — 2026-10-22 23:25 UTC

- M4 PR #34 advanced to `0a1fc1393c2ae837e7cecbb59e9c935380fa4930`. This is a documentation-only first-party host feasibility checkpoint; its worktree was clean and `git diff --check` passed before push. No runtime behavior or M1–M3 source was changed. The first-party protected-read path remains NOT_VERIFIED and Issue #52 remains OPEN / P0.
- M7 PR #39 advanced to `15aaeb369f843414ffd0fa1c733c461e698ea07b`. Owner-local Node regression, PowerShell AST check and `git diff --check` passed. Exact-head CI run `39871737371` passed; corrected Windows Community wrapper run `39871737372` is queued. The workflow now passes GitHub validation far enough to create a run; its installer/lifecycle result remains pending. No installer ran in the failed prior workflow and no lifecycle artifact exists for it. Issue #41 remains OPEN / P1 / HOLD.
- M4 PR #34 advanced to `0a1fc1393c2ae837e7cecbb59e9c935380fa4930`; exact-head CI run `39871742345` passed. The commit is a documentation-only host feasibility checkpoint; no runtime behavior changed and Issue #52 remains OPEN / P0 / NOT_VERIFIED.
- M0 PR #30 advanced to `1880996eb7aec54b475e88ab052925e03737d570`; exact-head CI run `39871748142` and coordination run `39871748256` passed. Its prior exact CI product workflow still has one Windows Node 22 fixture failure; that failure remains documented without deleting or weakening tests.
- At the 23:25 UTC checkpoint M9 pinned the then-public M4/M7 heads. The 23:31 follow-up below supersedes that M7 pin with the owner’s local lifecycle fix; the updated exact-source composition must pass before publication.

## M7 lifecycle failure and follow-up — 2026-10-22 23:31 UTC

- Windows Community run `39871737372` parsed and all wrapper/build-artifact jobs passed, but lifecycle job `120148781596` failed before executing the installer. Artifact `windows-community-installer-lifecycle-15aaeb369f843414ffd0fa1c733c461e698ea07b` reports `installerExecuted=false`, `installerSHA256=null`, and a PowerShell Boolean parameter conversion failure. No installation or uninstall was performed in this run; Issue #41 remains OPEN / P1 / HOLD.
- M7 owner fixed the cause in commit `28aa87378a1682b0dca6b28178955ad5a7fc6e84`: validate `RUNNER_TEMP` with an explicit non-empty string predicate, and add a regression. Focused Node test, PowerShell AST, Boolean-binding smoke with a real path string, and `git diff --check` passed locally. The fix is pushed; exact-head hosted CI and lifecycle rerun are in progress.
- M9 workflow and test pins now target M4 `0a1fc1393c2ae837e7cecbb59e9c935380fa4930` and M7 `28aa87378a1682b0dca6b28178955ad5a7fc6e84`. The refreshed exact-source composition passed locally 11/11 on Windows after packing and installing the M2 candidate tarball; exact hosted M9 checks are in progress.

## Publication and hosted verification — 2026-10-22 23:32 UTC

- M7 PR #39 exact head `28aa87378a1682b0dca6b28178955ad5a7fc6e84` triggered CI run `39872617730` and Windows Community wrapper run `39872617770`; both are currently in progress. The earlier run `39871737372` remains a failure before installer execution, so Issue #41 stays OPEN / P1 / HOLD until the new artifact is checked.
- M9 PR #36 exact head `92b987eee16e1a0e3467b74fa2f14158a96bd951` triggers exact-source composition run `39872622190`, product CI `39872622179`, and Windows Community wrapper `39872622221`; all are currently in progress. Its local exact-source composition at the pinned M4/M7 refs passed 11/11.
- Issue #41 comment `6353684141` records the prior lifecycle failure and M7 fix. PR #24 remains untouched; no merge or Release was performed.

## Evidence limits

M4 coverage verifies the exact desktop adapter's redacted snapshot shape and conservative `UNKNOWN` values using synthetic input. The M9 protected-read composition also uses test fixtures and explicit adapters. These checks do not prove the first-party product host wires M1's held-file capability, M2's public facade and M5's router into a live execution path. They do not establish OS-atomic or concurrent TOCTOU safety. Issue #52 remains OPEN / P0 / NOT_VERIFIED until that product-host evidence exists.

The M3 `aa6f1a5` source exposes `createConnectionCheckRuntime()` with typed, construction-time seams and a synchronous Guard quarantine subscription. The exact-source M9 test invokes that runtime builder with the real M1 Gateway factory, packed M2 facade and M5 router from the pinned source roots. At these pins, the synthetic fixed safe-read positive control succeeds; alias and replaced-path controls are denied before another M5 callback or M1 read event, approval queues remain empty, and fixture SHA-256 values remain unchanged. This is synthetic fixture composition, not a live external-host callback or OS-atomic TOCTOU acceptance.

### Previous P1 blocker: M3 Guard quarantine subscription mismatch — resolved at the pinned source

At the former M3 pin `bf40d1309e571338b3f36152226ec44b082e5037`, focused M9 composition was 1/2 and the full suite was 10/11. The failing test, `M3 connection-check runtime composes M1 held Gateway, packed M2 public facade, and exact M5 router`, reported `GATEWAY_QUARANTINE_SUBSCRIPTION_FAILED`.

The former call path was M3 `createConnectionCheckRuntime()` creating its Guard at `agents/M3/src/codex-connection-mcp.ts:151`, then passing it into the M1 Gateway factory at lines 159–161. M1 called `options.guard.subscribeQuarantine(quarantineSession)` in `agents/M1/src/runtime/gateway.ts:327`; the catch at lines 330–332 closed held resources and threw the error. M3 owner commit `aa6f1a5f0ee410b3c883fbe0c60e89020273966a` adds the method to `AgentGuard` (`agents/M3/src/containment.ts:122–136`) and synchronously notifies subscribers on quarantine transitions. M9 uses no shim and changes no M1–M5 interface or source.

At the prior M2 source pin `099ad64e4a09330920cbd40847adec3fe631e91e`, with exact M1 `c67b15f76973a2333ce523dd58d5b7439ab40702`, M3 `aa6f1a5f0ee410b3c883fbe0c60e89020273966a`, and M5 `c9003234913a0ccccca56fe2a36fb1ce3dacb2de`, the focused M9 command passed 2/2 and the full command passed 11/11. This is historical evidence for those exact refs. Before the latest candidate refresh, a full M9 composition passed 11/11 against M1 `6886d6e`, M2 `92a9562`, M3 `34b526d`, M4 `264bc288`, M5 `c900323`, M6 `15e1663`, M7 `4f986cc`, and M8 `5bf5d4f`. The isolated exact-source scratch composition passed 11/11 against M1 `6886d6e`, M2 `6742813`, M3 `34b526d`, M4 `264bc288`, M5 `12b2499`, M6 `15e1663`, M7 `4f986cc`, and M8 `35aa22f`; it used a temporary copy of the harness with only the SHA map substituted and a packed M2 candidate artifact. After updating the tracked M9 pin map to those refs, the tracked composition test also passed 11/11. `test/m9-security-composition.test.ts` passed 3 tests with 1 existing skip because the local M9 source predates the M1 capability API; exact candidate coverage is in the cross-module test. Hosted M9 Ubuntu/Windows checks for this refreshed pin set remain pending. Product-host hookup and OS-atomic/concurrent TOCTOU remain unverified.

The prior M5 pin `c900323` preserved deterministic hard DENY behavior without invoking optional `reviewDecision`. The current candidate `12b2499` changes the policy source and its regression; exact hosted CI passed 9/9 and the refreshed M9 composition passed 11/11. No exact owner-approval claim is made for this candidate. These results do not change the M3/M1 product-host evidence limit.

The M6 source-checkout E4 tests do not prove a built installer, clean-VM lifecycle, real-model execution or independent external E4 validation.

## Hosted exact-source readback — 2026-10-22 23:41 UTC

- Public M9 PR #36 head `92b987eee16e1a0e3467b74fa2f14158a96bd951` completed all three checks: composition run `39872622190` passed on Ubuntu and Windows, product CI `39872622179` passed, and Windows Community wrapper `39872622221` passed.
- The exact-source pins include M4 `0a1fc1393c2ae837e7cecbb59e9c935380fa4930` and M7 `28aa87378a1682b0dca6b28178955ad5a7fc6e84`. This hosted composition verifies the synthetic fixture/source boundary only. It does not prove live product-host adoption, held-file identity in the production callback, or OS-atomic/concurrent TOCTOU safety; Issue #52 remains OPEN/P0/NOT_VERIFIED.
- M7's exact CI passed (`39872617730`), but its Windows Community run (`39872617770`) hit a 10-second SourceForge NSIS download timeout before artifact creation; the lifecycle job was skipped. Issue #41 remains OPEN/P1/HOLD. A one-time full rerun is scheduled so the dependent installer lifecycle job can run if its build succeeds.
## Follow-up hosted commit verification — 2026-10-22 23:47 UTC

- The documentation-only M9 successor `dd9397d6acae54665f1729caa3f1f6bf220dc881` has green exact checks: product CI `39873559666` (9/9), Windows Community wrapper `39873559661` (2/2), and cross-module composition `39873559792` (Ubuntu and Windows).
- M7 run `39872617770` attempt 2 now has a successful package/build-evidence artifact (`12467527001`); exact lifecycle job `120154658964` is still running. No lifecycle acceptance is claimed until its terminal artifact and result are inspected.
- Issue #52 remains OPEN/P0/NOT_VERIFIED for live host consumption and OS-atomic/concurrent TOCTOU gaps.
## Hosted exact-source readback — 2026-10-22 23:56 UTC

- M9 PR #36 exact head `3caa11662bfb100befff7e4539796a92494699a6` passed product CI run `39874157638` (9/9), Windows Community wrapper `39874157655` (2/2), and cross-module composition `39874157553` (Ubuntu and Windows).
- The composition still pins M7 `28aa87378a1682b0dca6b28178955ad5a7fc6e84`. M7 has since pushed test-only lifecycle evidence instrumentation at `d1bc00b0f1d2b1c8e108ed83dafc27ede1eb1bd8`; refresh the exact M7 pin after its current hosted result is inspected. These checks are synthetic source/fixture composition, not live first-party host adoption or OS-atomic/concurrent TOCTOU proof; Issue #52 remains OPEN/P0/NOT_VERIFIED.
- M7's next exact CI run `39874915884` and the single Windows Community lifecycle run `39874915881` are active. The prior attempt-2 evidence confirms the setup process started and timed out after 180 seconds; the new instrumentation records that accurately. Issue #41 remains OPEN/P1/HOLD until a valid lifecycle result and separate VM acceptance exist.

## Exact-source refresh queued — 2026-10-23 00:00 UTC

- M4 has a new M4-owned commit `db3c0ee11d989a25b73a2d65246142a780f3ef6a` and M7 has public test instrumentation `d1bc00b0f1d2b1c8e108ed83dafc27ede1eb1bd8`. This M9 candidate still pins the prior M4/M7 commits, so the passing 3caa116 composition is historical for those exact pins. Refresh pins after the current M7 lifecycle run and M3 host-route work reach reviewable refs.
- M2 remains at `67428139e53c3f63a1101b4f94e84b291cbb1196` with an explicitly `UNPROTECTED / BLOCKED_NOT_VERIFIED` native Shell boundary; Issue #45 comment #6354018926 records why no product-host claim is made.
- M3 is actively working only on its M3 Console-route contract/source; no new endpoint or first-party protected-read test is in the candidate yet. Keep Issue #52 OPEN/P0/NOT_VERIFIED until exact-source composition and host checks prove the controls.

## Hosted checks and pending source refresh — 2026-10-23 00:05 UTC

- M9 PR #36 exact head `624237162459e021cf4d66bc3d253da1443c1404` passed CI `39875500080` (9/9), wrapper `39875500104` (2/2), and composition `39875500110` on Ubuntu and Windows. The workflow passed against its currently pinned refs only.
- The pin map still references M4 `0a1fc13` and M7 `28aa873`. Current public M4 is `db3c0ee11d989a25b73a2d65246142a780f3ef6a`; current public M7 is `d1bc00b0f1d2b1c8e108ed83dafc27ede1eb1bd8`. M3's new route is local/unpushed and needs review. Refresh the exact-source pins only after those owner heads are stable, then rerun composition.
- M7's current lifecycle artifact still fails with a confirmed started-but-incomplete setup process; M3's probe route is not yet pinned. Issue #52 stays OPEN/P0/NOT_VERIFIED and Issue #41 stays OPEN/P1/HOLD.

## First exact-source refresh — 2026-10-23 (previous M7/M8 pins)

At this earlier snapshot, PR #36 was OPEN and Draft at `fe246f1d97a06149d366989ac9dd169b05006754`; its base was `feature/agent-canary-3.0` at `62496d4020bd90ba2eede49b2e80a2bbebb036b4`. The following M7/M8 refs are historical and were superseded by the latest exact-source refresh below.

| Module | Exact public owner ref |
| --- | --- |
| M1 / PR #43 | `6886d6eef3beb972bc8f4c797584b0f522483870` |
| M2 / PR #37 | `67428139e53c3f63a1101b4f94e84b291cbb1196` |
| M3 / PR #33 | `c7b7772c9d62e138e1cc6deed7c43104eaccafa6` |
| M4 / PR #34 | `4f83140807a48bfe0d3273e2493a2124f533b8a0` |
| M5 / PR #47 | `12b2499a1f7b8525f3bf2d7659249c1bd8e881ed` |
| M6 / PR #38 | `3578e7ba10b2fd160efa0e4683aba863c666db8a` |
| M7 / PR #39 | `f4a7f91815236a87e81319d0c3512d57031b149e` |
| M8 / PR #40 | `35aa22f3087ed1859da19acbf12cc4c767dd4f3d` |

Local Windows validation used newly created detached worktrees whose `HEAD` values were checked against all eight exact refs above:

- Exact M2 `npm ci`, `npm run build`, and `npm pack` completed; the packed candidate was installed into a disposable consumer. M7 `npm run pack:check -- --package-root <exact M2 worktree>` passed for 91 files.
- `node --import tsx --test test/m9-cross-module-composition.test.mjs`: **11/11 passed** using those detached exact refs and the packed M2 candidate artifact.
- `node --import tsx --test test/m9-security-composition.test.ts`: **3 passed, 1 skipped**. The existing skip states that local M9 product source predates the M1 capability API; exact candidate behavior is exercised by the composition harness.
- Exact M3 `npm run build` and `node --import tsx --test test/security-center-route-m3.test.ts`: build passed and **8/8 passed**. The route test covers missing/incomplete bootstrap failing closed; it does not prove a production bootstrap exists.
- Exact M4 `npm run build` and `node --import tsx --test test/runtime-console.test.ts`: build passed and **11/11 passed**.
- Exact M6 `node --test test/auto-e4.test.mjs`: **11/11 passed**; `node --test security-lab/e4/verify-bundle.test.mjs`: **18/18 passed**. This includes the new target-mutation failure case.
- Exact M7 `test/windows-packaging.test.mjs` package-contract and co-located E4 positive-control cases: **2/2 passed**.

During the first exact-source run, the M9 gate failed because it required the complete historical M6 test-file blob to remain byte-identical. Current M6 `3578e7b` added two security regressions to that same file, changing the blob while retaining its prior content. M9 now checks that every historical line remains present, in order, in the current candidate file, while permitting additive regression cases. The exact M6 regression suite passed 11/11, and the full exact-source composition then passed 11/11. No M6 test was removed or weakened.

These are local fixture/source and owner-regression results. They do not establish a live Desktop/host bootstrap, native Codex Shell protection, OS-atomic or concurrent TOCTOU safety, installer lifecycle acceptance, clean-VM acceptance, or independent external E4. Keep Issue #52 OPEN / P0 / NOT_VERIFIED and Issue #41 OPEN / P1 / HOLD.

## Latest exact-source refresh — 2026-10-23

M7 and M8 advanced to new public refs. The M9 harness and workflow now pin these exact owner heads:

| Module | Exact public owner ref |
| --- | --- |
| M1 / PR #43 | `6886d6eef3beb972bc8f4c797584b0f522483870` |
| M2 / PR #37 | `67428139e53c3f63a1101b4f94e84b291cbb1196` |
| M3 / PR #33 | `c7b7772c9d62e138e1cc6deed7c43104eaccafa6` |
| M4 / PR #34 | `4f83140807a48bfe0d3273e2493a2124f533b8a0` |
| M5 / PR #47 | `12b2499a1f7b8525f3bf2d7659249c1bd8e881ed` |
| M6 / PR #38 | `3578e7ba10b2fd160efa0e4683aba863c666db8a` |
| M7 / PR #39 | `f20e307458f4c703459621fd48e44a9e806f03bb` |
| M8 / PR #40 | `854de50d94637caf3f334de7d28dcdcaddd88f9f` |

M7 adds fixed-path, bounded lifecycle phase telemetry for installer receipt creation and tests exact-toggle behavior. The M9 workflow now executes the telemetry-off positive control, exact-toggle marker test, non-exact-toggle negative control, and lifecycle smoke contract regression at the pinned M7 SHA. These are unit/source checks; they do not run Setup.exe, an installer, or a VM. M8's update is documentation-only and explicitly states the first-party protected-read route remains NOT_VERIFIED unless a trusted composition bootstrap is present and an end-to-end read is proven.

The exact detached M7/M8 worktrees were checked at the two SHAs above. After the refresh began, live GitHub status showed M7 exact CI run `39878031913` passed while its wrapper run `39878031868` remained in progress; M8 exact CI run `39878036234` and wrapper run `39878038319` passed. Local test outcomes are:

- Exact M7 receipt telemetry cases in `packaging/windows/test-worker.mjs`: **3/3 passed**; the targeted lifecycle smoke contract in `test/reliability.test.mjs`: **1/1 passed** using the repository's `--import tsx` loader.
- Exact M7 `npm run pack:check -- --package-root <exact M2 worktree>`: passed for **91 files**.
- Exact M8 provenance/LF cases: **2/2 passed**; sanitized co-located JSONL positive control: **1/1 passed**.
- Exact-source `node --import tsx --test test/m9-cross-module-composition.test.mjs`: **11/11 passed** with all eight source roots detached at their listed SHAs and the exact M2 packed artifact.
- `node --import tsx --test test/m9-security-composition.test.ts`: **3 passed, 1 existing skip**. The skipped M9 product-source case predates the M1 capability API; the exact source behavior is covered by the cross-module composition harness.

Hosted M9 Ubuntu/Windows exact-source composition remains required. Issue #41 remains OPEN / P1 / HOLD; Issue #52 remains OPEN / P0 / NOT_VERIFIED. No live installer, VM, model, production host hookup, or OS-atomic acceptance was performed.
