# M9 exact-source composition snapshot — 2026-10-23

This snapshot records the source revisions pinned by the M9 composition workflow. The workflow checks out each source independently and validates the checked-out SHA before running the focused owner regressions and M9 composition tests.

| Module | PR | Exact source SHA | M9 coverage |
| --- | --- | --- | --- |
| M1 Gateway | #43 | `fa369069241bf81d32c7f39d31a61806efa55fe4` (current public PR head; exact checks 11/11 passed) | Uses native Windows realpath resolution to expand NTFS short-name aliases before protected-resource identity checks; local Windows Gateway suite passes 38/38 |
| M2 isolation | #37 | `b4aae52340e5eff5d9da4929f1bd59133048930c` (current public PR head; exact checks 9/9 passed) | Owner report records conditional review of M3 test blob `a01e1f7`; M2 package/facade are unchanged. This does not establish real product-host user-file protection |
| M3 onboarding | #33 | `12ab8c9056a4f8d35c2508d966352f72950fd895` (current public PR head; exact checks 9/9 passed) | Adds a packed M5 policy-denial case; full M3 suite owner-reported 354 pass / 5 skip / 0 fail. M3 CI does not invoke the four-case packaged-consumer test; M9 executes it locally |
| M4 desktop security center | #34 | `d62557a03883c459cce6bec60b36686128ccf73d` (current public PR head; exact checks 9/9 passed) | Preserves keyboard focus and selected-event explanation across refresh; status consumer remains read-only and first-party host read is NOT_VERIFIED |
| M5 policy | #47 | `7fa47e8d82e4b92307a4429ea743931b4600ac90` (current public PR head; exact checks 9/9 passed; report-only successor to code head `f05edaeeabff2e261bf563fb0782d7b9bc500645`) | Records a conditional M3 consumer review; the new M3 denial-path test is executed by M9 but is not covered by that prior exact-test disposition |
| M6 E4 | #38 | `032ecfdbc107e5afd11d17ccc250a11f5aa9c3fc` (current public PR head; exact-head CI and wrapper 11/11 passed) | Adds regression assertions that external-copy mismatch rejection preserves the archived source byte-for-byte |
| M7 reliability | #39 | `97bb8de315f2c19edbaa4d6536abc50876fecffd` (current public PR head; exact-head CI and wrapper checks 12/12 passed) | Adds a product-E4 artifact provenance audit document only; runtime and regression tests are unchanged. Issue #41 remains OPEN/P1/HOLD for clean-VM, standard-user, EFS, first-launch, rollback, and upgrade acceptance |
| M8 open-source product | #40 | `f321df3041e2a101661da686a6ccbe6a222b4d24` (current public PR head; exact checks 11/11 passed) | Hardens docs validation for TypeScript-generated `dist` examples; Hook provenance, LF checkout and sanitized JSONL regressions remain pinned |

## Owner-review boundaries

- M1 Issue #52 comment `6349691761` approves the exact historical M2 source `099ad64e4a09330920cbd40847adec3fe631e91e` for the M1 Gateway/M2 adapter API contract only, with historical M1 review base `a5eff766ebe041bc2c6cc13758827d5a96205de9`. Current M2 `b4aae52340e5eff5d9da4929f1bd59133048930c` descends from that reviewed source; it is a report-only successor and the package/facade blobs are unchanged. This does not broaden the historical review to new M2 runtime behavior or establish first-party host wiring. Current M1 `fa369069241bf81d32c7f39d31a61806efa55fe4` includes the NTFS short-name alias denial fix. Its committed owner disposition still approves only M2 adapter-to-M1 capability API compatibility; it does not accept M1's current read implementation, first-party host integration, or TOCTOU protection.
- M1 Issue #72 comment `6347268881` reviewed M3 source `27d4a20a20894c7b779edf68d8bf79685bc0e69b` for three Hook-related blobs only, with the same historical M1 review base. M9 checks those same blobs remain unchanged in the current M3 source; this is not an M1 review of the newer M3 Console route or its tests.
- M6 Issue #59 comment `6346660246` reviewed exact M8 source `72b4aab0fb5cb2dd4cd3b75ee8a73ad22dd001db` and M6 lifecycle contract source `2cebabc81d7908c04ddfa10378fa1d3427b92cf4`. Historical M8 `35aa22f3087ed1859da19acbf12cc4c767dd4f3d` added evidence-index documentation, and M8's current exact head `f321df3041e2a101661da686a6ccbe6a222b4d24` adds a documentation-validation guard; M9 confirms the M6-reviewed `test/auto-e4.test.mjs` blob remains identical. The former M6 pin `15e1663eac9c3932165fca9b39587115345f289c` retained the full reviewed lifecycle test blob. Prior M6 `3578e7ba10b2fd160efa0e4683aba863c666db8a` added regression tests to that file; M9 checks every previously reviewed line remains in order. Public M6 code head `82d4e25a210a4c6d1f2c7f8e6d94ce56af1cd56b` added a verifier regression for ambiguous E4 report cases; current exact head `418d25862d0849e99b620c9610bd5dd7809f3648` adds only independent acceptance audit documentation. Neither successor broadens the historical M6/M8 review. These scoped dispositions do not accept unrelated changes in current module heads.
- Historical M6 exact-head CI run `39864322034` and wrapper run `39864322029` were green at their older source (9/9 CI, 2/2 wrapper). Public code head `82d4e25` exact checks were green in run `39899528596`; current PR #38 head `418d258` exact CI run `39903623790` and wrapper run `39903623779` completed with 11/11 successful reported checks. These source checks do not establish installer, clean-VM, real-model, or external E4 behavior.
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
| M5 / PR #47 | `8d1b832f46db363dd8ba5cdd7d573baa89e9a46d` |
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

## M7/M8 exact-source refresh — 2026-10-23 (prior M7 pin)

M7 and M8 advanced to new public refs. M7 `f20e307458f4c703459621fd48e44a9e806f03bb` below is a historical pin, superseded by the M7 follow-up section; M8 remains at the same exact source.

| Module | Exact public owner ref |
| --- | --- |
| M1 / PR #43 | `6886d6eef3beb972bc8f4c797584b0f522483870` |
| M2 / PR #37 | `67428139e53c3f63a1101b4f94e84b291cbb1196` |
| M3 / PR #33 | `c7b7772c9d62e138e1cc6deed7c43104eaccafa6` |
| M4 / PR #34 | `4f83140807a48bfe0d3273e2493a2124f533b8a0` |
| M5 / PR #47 | `8d1b832f46db363dd8ba5cdd7d573baa89e9a46d` |
| M6 / PR #38 | `3578e7ba10b2fd160efa0e4683aba863c666db8a` |
| M7 / PR #39 (historical) | `f20e307458f4c703459621fd48e44a9e806f03bb` |
| M8 / PR #40 | `854de50d94637caf3f334de7d28dcdcaddd88f9f` |

M7 adds fixed-path, bounded lifecycle phase telemetry for installer receipt creation and tests exact-toggle behavior. The M9 workflow now executes the telemetry-off positive control, exact-toggle marker test, non-exact-toggle negative control, and lifecycle smoke contract regression at the pinned M7 SHA. These are unit/source checks; they do not run Setup.exe, an installer, or a VM. M8's update is documentation-only and explicitly states the first-party protected-read route remains NOT_VERIFIED unless a trusted composition bootstrap is present and an end-to-end read is proven.

The exact detached M7/M8 worktrees were checked at the two SHAs above. After the refresh began, live GitHub status showed M7 exact CI run `39878031913` passed while its wrapper run `39878031868` remained in progress; M8 exact CI run `39878036234` and wrapper run `39878038319` passed. Local test outcomes are:

- Exact M7 receipt telemetry cases in `packaging/windows/test-worker.mjs`: **3/3 passed**; the targeted lifecycle smoke contract in `test/reliability.test.mjs`: **1/1 passed** using the repository's `--import tsx` loader.
- Exact M7 `npm run pack:check -- --package-root <exact M2 worktree>`: passed for **91 files**.
- Exact M8 provenance/LF cases: **2/2 passed**; sanitized co-located JSONL positive control: **1/1 passed**.
- Exact-source `node --import tsx --test test/m9-cross-module-composition.test.mjs`: **11/11 passed** with all eight source roots detached at their listed SHAs and the exact M2 packed artifact.
- `node --import tsx --test test/m9-security-composition.test.ts`: **3 passed, 1 existing skip**. The skipped M9 product-source case predates the M1 capability API; the exact source behavior is covered by the cross-module composition harness.

Hosted M9 Ubuntu/Windows exact-source composition remains required. Issue #41 remains OPEN / P1 / HOLD; Issue #52 remains OPEN / P0 / NOT_VERIFIED. No live installer, VM, model, production host hookup, or OS-atomic acceptance was performed.

## M7 exact-source follow-up — 2026-10-23

The public M7 PR #39 head advanced from `f20e307458f4c703459621fd48e44a9e806f03bb` to `436d95c0d867e96c7e91a6bf2aceaa6d03d48a3e`. M9 changed only its M7 source pin and M7-specific regression coverage; M1–M6 and M8 pins remain unchanged. The detached M7 worktree was verified at the new SHA.

The new M7 commit adds `durable-files.mjs` to the worker files copied into the installer payload, selects the IDOK default for the silent integrity-receipt failure dialog, and adds regressions for the full worker-module closure and rollback/abort behavior. Exact-source Windows compatibility results:

- `node --test --test-name-pattern="Windows payload build copies every local worker module dependency|record-install keeps normal behavior when M7 phase telemetry is disabled|record-install emits only the final fixed marker when the exact M7 toggle is enabled|record-install does not enable M7 phase telemetry for non-exact toggle values" packaging/windows/test-worker.mjs`: **4/4 passed**.
- `node --test --test-name-pattern="prepare output and build instructions pass the pinned ZIP and required source commit SHA|Windows payload E4 checks the co-located privacy-safe hook wrapper|silent receipt failure chooses a safe default then still rolls back and aborts" test/windows-packaging.test.mjs`: **3/3 passed**.
- `npm run pack:check -- --package-root <exact M2 worktree>`: passed for **91 files**.
- Exact-source M9 composition with M7 `436d95c0d867e96c7e91a6bf2aceaa6d03d48a3e` and all other pinned modules unchanged: **11/11 passed**.

The new M7 exact CI run `39879983009` completed successfully. Wrapper run `39879983018` passed the Ubuntu and Windows wrapper regressions and Windows build-evidence job, but its Windows installer lifecycle job **failed**. The [GitHub-hosted wrapper run](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/39879983018) has lifecycle result artifact ID `12469982378` (not build artifact ID `12470152465`). The coordinator-local copy at `reports/m7-lifecycle-436d95c/INSTALLER_LIFECYCLE_RESULT.json` records source `436d95c0d867e96c7e91a6bf2aceaa6d03d48a3e`, provenance PASS, silent install PASS (3,848 manifest files, exit 0), and duplicate-candidate refusal PASS. Overall status is FAIL because `OWNED_INSTALL_FILES_REMAIN_AFTER_UNINSTALL`. Runner was GitHub-hosted Windows Server 2025; standard-user token was not asserted, and EFS, in-place upgrade, cancellation rollback, real model/native agent, and Windows 11 client were not tested or verified. Keep Issue #41 OPEN / P1 / HOLD; this is not installer acceptance. M9's hosted composition remains pending because this pin update is local and has not been pushed.

The local tests cover source/payload fixtures only; they did not run Setup.exe, an installer, or a VM. The separate owner-hosted run above did execute an installer and failed its uninstall-cleanup check. No separate issue is needed for this pin-only compatibility follow-up; document it in PR #36. The lifecycle failure belongs to existing Issue #41. Issue #74 is CLOSED and its acceptance history remains unchanged. Issue #41 remains OPEN / P1 / HOLD.

## M7 exact-source lifecycle correction — 2026-10-23

PR #39's public head is now `7c348622e6c94e6f583044832c4a415c6a19c209`; M9 refreshed only its M7 pin. This M7 change runs the normal silent NSIS uninstall with `/S`, waits up to 30 seconds for the temporary-copy uninstaller's terminal effects before checking files and registration, and prevents failure cleanup from launching a second uninstaller after the normal uninstall has started.

Exact detached-source local checks:

- Exact M7 `test/reliability.test.mjs` lifecycle smoke contract: **1/1 passed**.
- Exact M7 worker dependency-closure and receipt telemetry regressions: **4/4 passed**.
- Exact M7 Windows packaging regressions, including silent receipt failure rollback/abort: **3/3 passed**.
- M2 exact-source `npm run build`: **passed**; exact M7 `npm run pack:check -- --package-root <M2 exact source>`: **passed, 91 files**.
- Exact-source M9 composition with M7 `7c348622e6c94e6f583044832c4a415c6a19c209` and the other seven pinned refs unchanged: **11/11 passed**. The test used the refreshed M9 working tree based on `fe639266416a7a393806c9df2961150fa5863a83`; the local pin refresh itself was not yet committed at test time.

The [M7 exact CI run](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/39882121780) passed all 9 checks. The [Windows Community wrapper run](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/39882121777) passed all 4 checks, including the hosted lifecycle job; its lifecycle result is artifact ID `12471007071`. The artifact records `PASS_BOUNDED_GITHUB_HOSTED_INSTALL_UNINSTALL`, exact source `7c348622e6c94e6f583044832c4a415c6a19c209`, provenance PASS, silent install PASS with 3,848 manifest files, duplicate-candidate refusal PASS, and silent uninstall PASS. The uninstall completion wait was 910 ms; owned files, registration and shortcuts were removed, the unknown sentinel was preserved, and residue count was 0.

The hosted runner was Windows Server 2025 build 26100; standard-user token behavior was not asserted. Windows 11 client, EFS, in-place upgrade, cancellation rollback, and real model/native-agent behavior remain untested or unverified. This is a bounded hosted lifecycle pass, not full installer/product acceptance. Issue #41 remains OPEN / P1 / HOLD; M9 does not close it. Issue #74 remains CLOSED. M9's own hosted composition check remains pending because this pin refresh is local and has not been pushed.

One initial pack-check attempt invoked M2's package checker from the M2 worktree and failed its M2 package policy check. That was the wrong command for the M7 integration gate; rerunning M7's `pack:check` from the exact M7 worktree against the same M2 source passed with 91 files. The failed invocation is not a failing M7 regression.

## Previous M1/M3/M4/M5 exact-source refresh and ordinary CLI check — 2026-10-23

At this prior checkpoint, the M9 map used these exact owner commits. The later M3/M4 refresh is recorded below:

| Module | Exact public source SHA |
| --- | --- |
| M1 / PR #43 | `e8be92d2d813ab2e9fe47d3ab6874439a6328441` |
| M2 / PR #37 | `67428139e53c3f63a1101b4f94e84b291cbb1196` |
| M3 / PR #33 | `b85c4ad4de92fdcdf48e65e664c149b9de347b4f` (public predecessor) |
| M4 / PR #34 | `4bd982201db594100de862d314240c7d0ff3d3e0` (public predecessor) |
| M5 / PR #47 | `8d1b832f46db363dd8ba5cdd7d573baa89e9a46d` (public exact source) |
| M6 / PR #38 | `3578e7ba10b2fd160efa0e4683aba863c666db8a` |
| M7 / PR #39 | `7c348622e6c94e6f583044832c4a415c6a19c209` |
| M8 / PR #40 | `854de50d94637caf3f334de7d28dcdcaddd88f9f` |

The M9 exact-source harness starts the built M3 `ai console --port 0` CLI with no injected dependencies and calls its authenticated protected-read endpoint. It verifies that the standalone M3 package has neither the M5 `./policy-router` nor M2 `./gateway-adapter` export and that Node rejects both self-package subpaths with `ERR_PACKAGE_PATH_NOT_EXPORTED`. The expected route result is the sanitized `M3_FIXED_TEMP_PROBE_ONLY / UNKNOWN / OWNER_ADAPTER_UNAVAILABLE` envelope, with no `agent-canary-console-probe-*` directory in the isolated temp root. The default bootstrap awaits all three package imports before returning Gateway/router factories, so missing owner exports fail before protected-read Gateway or router construction. The console itself may create its separate integration demo workspace; the assertion is limited to the protected-read probe directory.

The existing injected M1/M2/M5 fixture resolves the Gateway through the exact M1 public `./sdk` package subpath, the packed M2 facade through its public package subpath, and the router through the exact M5 public `./policy-router` package subpath. The workflow builds M1 and M5 before resolving these built exports. It retains its fixed safe-marker positive control and sensitive-path, alias, and path-replacement denials, callback counts, approval queues, evidence counts, and fixture hashes. This remains synthetic runtime composition evidence. M3's new default loader now uses these public contracts; the standalone M3 package still lacks the M5 and M2 exports, so its ordinary no-injection route remains UNKNOWN. M9 does not assemble a combined package to prove all three public self-references resolve from M3's default loader, and does not add a private import/API or synthetic package shim. The synthetic positive fixture is not a product-bootstrap pass.

Exact detached worktrees were SHA-checked before use. Local focused checks:

- M1 `npm run build` and `node --import tsx --test test/gateway.test.ts`: **build passed; 36/36 passed**.
- M2 `npm ci`, `npm run build`, `npm pack`, then install the packed artifact in an isolated consumer: **passed**; artifact `dorianchn-agent-canary-1.2.7.tgz` came from exact M2 `67428139e53c3f63a1101b4f94e84b291cbb1196`.
- M3 `b85c4ad4de92fdcdf48e65e664c149b9de347b4f`: `npm ci`, `npm run build`, and `node --import tsx --test test/onboarding.test.ts test/codex-connection-check.test.ts test/agent-hook.test.ts test/security-center-route-m3.test.ts`: **40/40 passed**.
- M4 `npm ci`, `npm run build`, and `node --import tsx --test test/runtime-console.test.ts`: **11/11 passed**.
- M5 `npm ci`, `npm run build`, and `node --import tsx --test test/risk-policy.test.ts test/policy-router-export.test.ts`: **43/43 passed**; the test resolves `./policy-router` to the exact built public entry.
- M9 `node --import tsx --test test/m9-cross-module-composition.test.mjs` was rerun with M3 `b85c4ad4de92fdcdf48e65e664c149b9de347b4f`, M5 `8d1b832f46db363dd8ba5cdd7d573baa89e9a46d`, the other six exact module roots, and the packed M2 artifact: **12/12 passed**. This includes the no-injection M3 CLI UNKNOWN/no-probe case and injected fixed-marker positive plus sensitive, alias, path-replacement, and no-capability DENY controls via M1 `./sdk`, M2's packed export, and M5 `./policy-router`.

M3 `b85c4ad` and M5 `8d1b832` were subsequently published to their owner PRs. Hosted M9 CI had not run against that prior pin set. The first M9 attempt stopped after 3 tests because the exact M1 scratch worktree did not yet have dependencies installed (`ERR_MODULE_NOT_FOUND` for `@modelcontextprotocol/sdk`). After `npm ci` in that exact M1 worktree, M1 gateway tests and the full exact-source M9 composition passed. This was local environment preparation, not a source regression.

M4 exact source still has no first-party caller for the protected-read POST. Issue #52 remains OPEN / P0 / NOT_VERIFIED for product-host wiring, held-identity consumption, and concurrent/OS-atomic TOCTOU. The fixed temp marker applies to this synthetic test only; it does not establish protection for user files or the desktop. Hosted M9 CI remains pending for this pin refresh; no merge, push, live host, VM, model, or installer acceptance is implied.

## Previous M3/M4 status-route and read-only UI refresh — 2026-10-23

GitHub PR heads were verified after publication: M3 PR #33 is `f8c4092de804ff32639c92caef4f2615f0a37347`, M4 PR #34 is `7fe375d75ea8ca219abcae2e5cbc40d7b1b2e33b`, and M5 PR #47 is `8d1b832f46db363dd8ba5cdd7d573baa89e9a46d`. The full M9 exact-source map used for the rerun is:

| Module | Exact source SHA |
| --- | --- |
| M1 | `e8be92d2d813ab2e9fe47d3ab6874439a6328441` |
| M2 | `67428139e53c3f63a1101b4f94e84b291cbb1196` |
| M3 | `f8c4092de804ff32639c92caef4f2615f0a37347` |
| M4 | `7fe375d75ea8ca219abcae2e5cbc40d7b1b2e33b` |
| M5 | `8d1b832f46db363dd8ba5cdd7d573baa89e9a46d` |
| M6 | `3578e7ba10b2fd160efa0e4683aba863c666db8a` |
| M7 | `7c348622e6c94e6f583044832c4a415c6a19c209` |
| M8 | `854de50d94637caf3f334de7d28dcdcaddd88f9f` |

M3's exact `/api/security-center` GET uses only the injected snapshot-provider seam. The M9 route-to-consumer fixture verifies missing and invalid CSRF stop before the provider call, the valid read returns a sanitized snapshot, and the status request does not load protected-read dependencies or create the separate fixed-marker probe directory. M3 downgrades a scope-free provider `PROTECTED` aggregate to `UNKNOWN`, retains only the scoped Gateway result, and keeps Hook and Canary isolation `UNKNOWN`.

The same sanitized M3 response is consumed by the exact M4 browser adapter bundle. M4 validates the status-only payload, redacts private paths and tokens, keeps the aggregate `UNKNOWN`, and leaves first-party OBSERVE reads `NOT_VERIFIED`; the M3-normalized response has no explicit coverage label, so the UI displays coverage as `UNKNOWN`. The exact M4 page reads `GET /api/security-center` and its script contains no call to `POST /api/security-center/protected-read`. This is a synthetic provider fixture exercising route and display contracts, not a live M2 provider or a product-host protection result.

The M9 fixed-marker positive and sensitive-path/alias/path-replacement DENY tests remain a separate synthetic execution fixture. Those results do not arise from the M4 UI display test and do not establish protection for user files, desktop paths, or a first-party host. M3's ordinary no-injection CLI protected-read route remains `UNKNOWN` when the standalone M3 package lacks M5/M2 public subpaths. M9 does not assemble a combined package or add a private import/API shim to turn this into a product-bootstrap pass.

Exact local checks on the published owner heads:

- M3 `f8c4092de804ff32639c92caef4f2615f0a37347`: `npm run build` passed; `node --import tsx --test test/security-center-route-m3.test.ts` passed **9/9**.
- M4 `7fe375d75ea8ca219abcae2e5cbc40d7b1b2e33b`: `npm run build` passed; `node --import tsx --test test/runtime-console.test.ts` passed **12/12**, including status payload validation, UNKNOWN downgrade, redaction, and the UI's no-POST assertion.
- M9 `node --import tsx --test test/m9-cross-module-composition.test.mjs`: rerun against the eight exact sources above; the route-to-consumer subtest passed after correcting a test-only evaluator wrapper, and the complete suite passed **13/13**.

The initial targeted M9 attempt had one test-harness failure (`Unexpected token 'const'`): the wrapper treated M4's generated adapter script as an expression even though it begins with declarations. The harness now evaluates the exact generated script and returns its adapter object; the focused route-to-consumer test then passed 1/1. This was a harness issue, not a source test failure. The final full-suite rerun supersedes that initial attempt.

The workflow now pins the published M3/M4 heads and runs their exact route and UI owner regressions before the M9 composition suite. Hosted M9 CI for this refreshed pin set remains pending. No standalone `actionlint` or YAML parser was available locally, so the workflow file was not independently parsed; `git diff --check` and the local exact-source tests are separate checks. Issue #52 remains OPEN / P0 / NOT_VERIFIED for first-party host wiring, held-identity consumption, and concurrent/OS-atomic TOCTOU. No product protection, VM, model, installer, or release acceptance is claimed.

## M2 PR #37 exact-head refresh — 2026-10-23

GitHub reports PR #37 OPEN at exact public head `1c050abace5af6e09b7b934730f2361b78f9d938`. Comparing it with the prior M9 M2 pin `67428139e53c3f63a1101b4f94e84b291cbb1196` shows exactly two changed files: `execution-isolation/codex/native-host-hook-evidence.json` and `execution-isolation/reports/NATIVE_SHELL_BYPASS_REPORT.md` (45 insertions, no deletions). The additions are M2's report of a current Windows MXC capability probe and its bounded interpretation; M9 did not independently rerun that host probe. No package manifest, runtime source, test, Hook, policy, or package-export file changed. The exact PR #37 run `39866513817` remains evidence for the old `6742813` head only; this report does not claim hosted M2 CI for `1c050ab`.

The current M2 head is a documentation-only descendant of both the historical M1-reviewed adapter source and the prior M2 package candidate. The M1 approval remains limited to the historical adapter-to-Gateway API contract and is not treated as a new approval of unrelated runtime behavior. The new host-probe record remains `UNPROTECTED / BLOCKED_NOT_VERIFIED`; it adds no host-enforcement or product-protection claim.

The exact source map for this rerun was:

| Module | Exact source SHA |
| --- | --- |
| M1 | `e8be92d2d813ab2e9fe47d3ab6874439a6328441` |
| M2 | `1c050abace5af6e09b7b934730f2361b78f9d938` |
| M3 | `f8c4092de804ff32639c92caef4f2615f0a37347` |
| M4 | `7fe375d75ea8ca219abcae2e5cbc40d7b1b2e33b` |
| M5 | `8d1b832f46db363dd8ba5cdd7d573baa89e9a46d` |
| M6 | `3578e7ba10b2fd160efa0e4683aba863c666db8a` |
| M7 | `7c348622e6c94e6f583044832c4a415c6a19c209` |
| M8 | `854de50d94637caf3f334de7d28dcdcaddd88f9f` |

Local exact-source checks:

- From the M2 checkout at `1c050abace5af6e09b7b934730f2361b78f9d938`, `npm run build` passed and `npm pack --json` produced `dorianchn-agent-canary-1.2.7.tgz` (91 files). Its SHA-256 was `40e05911461c55c2668c9f504160dd15df3983d38861dffbd856f27cca531c8`; the tarball was installed in an isolated consumer and supplied to M9.
- From exact M7 `7c348622e6c94e6f583044832c4a415c6a19c209`, `npm run pack:check -- --package-root C:\Users\36712\Desktop\Agent-Canary-Dev\agents\M2` passed for 91 files.
- With the exact roots above and the new packed M2 artifact, `node --import tsx --test test/m9-cross-module-composition.test.mjs` passed **13/13**. This run used M9 worktree HEAD `85d4d8dbb95f0a3a3c975c2754610926f277500d` with the local M2 pin refresh applied; it covers packed-M2 positive, deny, alias, path-replacement, no-capability, and M3/M4 status-display controls.

These are local source/package composition results only. Hosted M9 CI for this refreshed pin set remains pending, and all prior product-host, native Shell, Issue #52, VM/model/installer boundaries remain unchanged.

## Previous M1/M4/M7 documentation successor pin refresh — 2026-10-23

At that refresh, the workflow and pinned-source guard targeted the owner documentation successors: M1 `e1e3d4fed83c853328d5e2720ac89a7be29c3571`, M4 `ec12e53ca881e106f5666f6b2b9b586a56d485b2`, and M7 `1448a46ce43a2211e14be70fcd9c256b21d74c1f`. M1's delta from the previously tested pin is documentation only (`SECURITY_REGRESSION_RESULTS.md` and the two owner disposition reports); M4 adds only `docs/3.0/M4/DESKTOP_INTEGRATION_REPORT.md`; M7's successor changes only `INSTALLER_ACCEPTANCE.md`. M7's hosted installation/lifecycle smoke was run against runtime source SHA `7c348622e6c94e6f583044832c4a415c6a19c209`, so the documentation successor is not a new installer execution or E4 result.

Local M9 exact-source composition on Windows passed **13/13** after packing M2 `1c050abace5af6e09b7b934730f2361b78f9d938` into an isolated consumer. The exact source map is M1 `e1e3d4f`, M2 `1c050ab`, M3 `f8c4092`, M4 `ec12e53`, M5 `8d1b832`, M6 `3578e7b`, M7 `1448a46`, and M8 `854de50`. This validates the synthetic package/API contracts, fixed-marker positive and deny cases, M3 status route to the read-only M4 display, and sanitized evidence controls. It does not validate the first-party host read, real user-file protection, native Shell enforcement, OS-atomic TOCTOU, clean-VM installation, or independent product E4. Hosted M9 CI for this refreshed source set has not run yet; PR #52 remains OPEN/P0/NOT_VERIFIED and PR #41 remains OPEN/P1/HOLD.

## M3 no-probe regression successor — 2026-10-23

M3 PR #33 is public at exact head `8104ab30eed5245eb61eeebb1075b915e8557b46`. Its owner CI run [39894590306](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/39894590306) passed 9/9 checks. The M3 successor changes only `docs/3.0/M3/ONBOARDING_API_CONTRACT.md` and `test/security-center-route-m3.test.ts`. The regression instruments `mkdtempSync` for the protected-read probe prefix and asserts that the default no-injection route makes zero matching calls, alongside the existing no-residue check. This narrows the test evidence for the fail-closed `UNKNOWN / OWNER_ADAPTER_UNAVAILABLE` result; it does not establish a product host or real user-file protection.

Local verification at the exact M3 head: `npm run build` passed; `node --import tsx --test test/security-center-route-m3.test.ts` passed 9/9. The M9 exact-source composition test passed 13/13 on Windows with M1 `e1e3d4f`, M2 `1c050ab`, M3 `8104ab3`, M4 `ec12e53`, M5 `8d1b832`, M6 `3578e7b`, M7 `1448a46`, and M8 `854de50`. It used the exact M2 packed artifact (SHA-256 `40e05911461c55c2668c9f504160dd15df3983d38861dffbd856f27cca531c8`) in an isolated consumer and M9 working tree based on `88acbf7` with the new M3 pin.

M9 changed only its M3 exact-source pin in the workflow and pinned-source guard; all other module pins are unchanged. The M9 successor remains local, so hosted M9 checks for this source set are pending. These results cover synthetic API/package composition and fixture behavior only. They do not establish first-party host reads, real user-file protection, native Shell enforcement, OS-atomic TOCTOU, clean-VM installation, or independent product E4. Issue #52 remains OPEN / P0 / NOT_VERIFIED and Issue #41 remains OPEN / P1 / HOLD.

## M7 exact documentation evidence successor — 2026-10-23

M7 PR #39 is OPEN/Draft at public head `1ab085abc6a242be563912a423ff1ee7f11e7127`. The commit changes only `INSTALLER_ACCEPTANCE.md` relative to `1448a46ce43a2211e14be70fcd9c256b21d74c1f`; M7 runtime and regression-test files are unchanged. The M9 checkout, exact-SHA assertions, and source map now pin `1ab085`.

The exact hosted evidence recorded by the updated M7 report belongs to source `1448a46`: CI run `39893792149` passed 9/9, Windows Community wrapper run `39893792191` passed 4/4, and lifecycle artifact `12475873203` reports `PASS_BOUNDED_GITHUB_HOSTED_INSTALL_UNINSTALL`. It records install/uninstall on a GitHub-hosted Windows Server 2025 runner, duplicate-target rejection, 3,848 installed files, zero owned-file residue, and preservation of an unknown sentinel. This is bounded hosted-runner evidence; the docs-only `1ab085` commit did not execute the installer. Clean Windows 11 VM, standard-user token, EFS, first launch, cancellation/failure rollback, in-place upgrade, and real Agent/model behavior remain NOT_VERIFIED or untested.

Local verification at the exact M7 pin `1ab085`:

- M7 `npm run pack:check -- --package-root <M2 exact package>` passed for 91 files. The exact M2 package was built from `1c050ab` and installed in an isolated consumer.
- The pinned M7 lifecycle-contract, worker, and Windows-packaging regression commands passed 1/1, 4/4, and 3/3.
- `node --import tsx --test test/m9-cross-module-composition.test.mjs` passed 13/13 on Windows using exact M1 `e1e3d4f`, M2 `1c050ab`, M3 `8104ab3`, M4 `ec12e53`, M5 `8d1b832`, M6 `3578e7b`, M7 `1ab085a`, and M8 `854de50` sources. Exact M1–M5 roots were built and the exact M2 package was packed into an isolated consumer. This is synthetic source/package composition only.

M9 hosted CI for this pin refresh remains pending until this local successor is pushed. Issue #41 remains OPEN / P1 / HOLD; Issue #52 remains OPEN / P0 / NOT_VERIFIED. No installer, VMware, model, production-host, or external E4 test was run.

## M6 exact verifier successor pin refresh — 2026-10-23

M6 PR #38 is OPEN/Draft at public head `82d4e25a210a4c6d1f2c7f8e6d94ce56af1cd56b`. Relative to the prior M9 pin `3578e7ba10b2fd160efa0e4683aba863c666db8a`, this successor changes only `docs/3.0/E4_GITHUB_PRODUCT_ARTIFACT_AUDIT_2026-10-22.md`, `docs/3.0/E4_TEST_MATRIX.md`, `security-lab/e4/verify-bundle.mjs`, and `security-lab/e4/verify-bundle.test.mjs`. The runtime change rejects ambiguous E4 report cases; the test file adds focused regression coverage. M9's workflow checkout and exact-source guard now pin `82d4e25a210a4c6d1f2c7f8e6d94ce56af1cd56b`.

M6 exact-head hosted CI run [39899528596](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/39899528596) completed successfully with 9/9 jobs. Local tests at the exact M6 source passed: `node --test security-lab/e4/verify-bundle.test.mjs` (21/21) and `node --test test/auto-e4.test.mjs` (11/11). The M9 exact-source synthetic composition test passed 13/13 with M1 `e1e3d4f`, M2 `1c050ab`, M3 `8104ab3`, M4 `ec12e53`, M5 `8d1b832`, M6 `82d4e25`, M7 `1ab085a`, and M8 `854de50`. These checks validate source and fixture-level behavior only; they are not an external E4 run, real-model result, product-host proof, installer acceptance, or VMware test.

Issue states observed during this refresh: #41 OPEN/P1 (HOLD), #52 OPEN/P0 (NOT_VERIFIED), #53 CLOSED/P0, and #57 OPEN/P1. M9 made no issue-state changes. The synthetic evidence boundary and prior M6/M8 review scope are unchanged.

## M3 exact packaged-owner consumer gate — 2026-10-23

M3 PR #33 is OPEN/Draft at public head `e3e7584cd186728b1756df3542af9aff13937a36`. Compared with the prior M9 pin `8104ab30eed5245eb61eeebb1075b915e8557b46`, the commit adds only `test/packaged-owner-consumer.test.mjs`. The M9 workflow now checks out and exact-SHA-guards this head, then runs the new owner test after exact M1/M3/M5 builds and the exact M2 package has been packed. It passes `M1_ROOT`, `M2_PACKED_ROOT`, `M3_ROOT`, and `M5_ROOT` as explicit paths.

Local validation against the exact source set passed: `npm run build` for M1 `e1e3d4f`, M2 `1c050ab`, M3 `e3e7584`, and M5 `8d1b832`; M3 `node --test test/packaged-owner-consumer.test.mjs` passed 3/3; M3 `node --import tsx --test test/security-center-route-m3.test.ts` passed 9/9; M9 `node --import tsx --test test/m9-cross-module-composition.test.mjs` passed 13/13 with the exact M1–M8 pins listed above. The packed-consumer fixtures check byte identity for public owner exports. Missing M2/M5 exports return sanitized `UNKNOWN` without creating the fixed probe; the M3 route regressions additionally verify rejection before Gateway/router/callback construction.

This exercises synthetic package composition and a fixed temporary marker only. It does not verify reads of real Agent user files, first-party product-host wiring, Native Codex Shell protection, or OS-level race prevention. Issue #52 remains OPEN / P0 / NOT_VERIFIED. This local refresh did not run hosted M9 CI or alter the separate Sponsor smoke failure in run `39900492675` / Issue #75.

## Earlier M1–M8 pin composition and Windows tar correction — 2026-10-23

The M9 pin sweep checked current OPEN/Draft owner PR heads and their exact-head CI results before advancing pins. The workflow checkout refs, exact-source SHA guard, and module map target this source set. M1 `fa369...`, M3 `12ab8...`, and M6 `418d...` are public and their exact-head hosted checks pass. M7 is pinned to a committed local docs-only successor `97bb...`; PR #39 still points to public head `1ab...`, and exact-head checks for `97bb...` are pending publication:

The status sentence above and the table below are preserved as an earlier snapshot before M6 `032ecfd` and M7 `97bb8de` became public heads. The final pin verification section below records the current refs and hosted evidence.

| Module / PR | Pinned head / publication state | Exact-head hosted checks | Owner delta since previous M9 pin |
| --- | --- | --- | --- |
| M1 / #43 | `fa369069241bf81d32c7f39d31a61806efa55fe4` | 11/11 exact-head checks passed; local Windows Gateway test 38/38 | Switches to `fs.realpathSync.native` to expand NTFS short names before protected identity checks; adds a short-name alias regression |
| M2 / #37 | `b4aae52340e5eff5d9da4929f1bd59133048930c` | 9/9 passed | Adds the M2 owner's conditional packaged-consumer review report; package/facade blobs are unchanged |
| M3 / #33 | `12ab8c9056a4f8d35c2508d966352f72950fd895` | 9/9 exact-head checks passed; owner reports 354 pass / 5 skip / 0 fail; M9 packaged test 4/4 locally | Adds a packaged M5 policy-denial case and asserts no M5 callback or M1 held read after denial; owner CI does not invoke this packaged test |
| M4 / #34 | `d62557a03883c459cce6bec60b36686128ccf73d` | 9/9 passed | Preserves event focus and selected explanation after refresh |
| M5 / #47 | `7fa47e8d82e4b92307a4429ea743931b4600ac90` | 9/9 passed | Report-only successor to code head `f05edae`; records a conditional review of the earlier M3 consumer test |
| M6 / #38 | `032ecfdbc107e5afd11d17ccc250a11f5aa9c3fc` (public exact head) | 11/11 passed: CI run `39904576948`, wrapper run `39904576958` | Adds 3 regression-test lines confirming mismatch rejection preserves the original archive bytes |
| M7 / #39 | `97bb8de315f2c19edbaa4d6536abc50876fecffd` (public exact head) | 12/12 passed: CI run `39904585997`, wrapper run `39904585994` | Adds the E4 artifact provenance audit document only; runtime and regression tests are unchanged |
| M8 / #40 | `f321df3041e2a101661da686a6ccbe6a222b4d24` | 11/11 passed | `scripts/check-docs.mjs` enforces the build prerequisite for TypeScript `dist` examples |

The exact M2 owner package/facade files are unchanged at public head `b4aae52`. The M2 `ACCEPT_WITH_CONDITIONS` disposition in that commit names the earlier M3 test blob `a01e1f75d360eed45a3789bb27722c6dd17ecf30`; it does not explicitly review M3's newly added policy-denial test. The M5 report-only head `7fa47e8` likewise records a conditional review of the earlier M3 test and its prior lack of a packaged M5 denial case. M9 now executes the new denial case with exact owner sources, but this local integration result does not broaden either historical owner disposition or claim real Agent host wiring/user-file access. M9 run `39901460198` was the first hosted attempt; it launched the earlier three-case test but failed at tar extraction before assertions because Git for Windows tar parsed `C:` as a remote host. A successful hosted rerun is still pending.

### Local validation at these exact source heads

- Builds passed for M1, M2, M3, M4, and M5.
- M1 Gateway regression passed 37/37; M3 focused onboarding/Hook/route regressions passed 41/41; M4 runtime-console regressions passed 13/13; M5 risk-policy, export, and policy-management regressions passed 58/58.
- M6 bundle verifier passed 21/21 and Auto E4 passed 11/11 at exact M6 head `032ecfd`; M7 selected package/positive-control regressions passed 3/3 at exact M7 head `97bb8de`; M8 provenance/LF tests passed 2/2 and sanitized JSONL test passed 1/1.
- Exact M3 `test/packaged-owner-consumer.test.mjs` is rerun against M3 `12ab8c9`, exact M2 `b4aae52`, M1 `fa36906`, and M5 `7fa47e8`; results are recorded in the successor section below. The Windows workflow selects `C:\Windows\System32\tar.exe` ahead of Git for Windows tar.
- Exact M9 composition passed 13/13 with the M1–M8 heads in the table above.
- `git diff --check` passed before the local M9 commit.

The M3 owner test is unchanged. M9's Windows workflow step now uses `pwsh`, places `Windows\System32` first on `PATH`, asserts that `tar.exe` resolves to the Windows-native executable, and then runs the test. This addresses the prior M9 Windows run `39901460198`, where Git for Windows tar treated the archive's `C:` drive prefix as a remote host. That prior hosted run remains failed; a new hosted M9 run is required to verify this workflow correction.

The local tests prove exact-source package/API behavior and fixture-level results only. They do not prove real Agent user-file reads, first-party host wiring, native Shell enforcement, or OS-atomic TOCTOU. Issue #52 remains OPEN / P0 / NOT_VERIFIED; Issue #41 remains OPEN / P1 / HOLD. No issue or PR state was changed.

## M1 NTFS short-name alias denial successor — 2026-10-23

M1 owner commit `fa369069241bf81d32c7f39d31a61806efa55fe4` is present on the local M1 branch but is not yet published: PR #43 remains OPEN/Draft at `27c417627b0e89e9db999025b65b25e12f0f1d7f`, and GitHub has no check runs for the local SHA. The M9 workflow and exact-source test pin now target `fa369069241bf81d32c7f39d31a61806efa55fe4`, ready to consume after publication.

The M1 change uses `fs.realpathSync.native` when resolving the workspace root, registered resources, and held-path revalidation. Its Windows regression obtains the NTFS short name with `cmd.exe /c dir /x` and confirms that an alias for a synthetic credential fixture is rejected before registration. On the exact M1 branch head, `npm run build` and `node --import tsx --test test/gateway.test.ts` passed; the Windows-only short-name case ran and passed, for 38/38 total.

The exact M9 composition regression passed 13/13 against M1 `fa369069241bf81d32c7f39d31a61806efa55fe4` and the unchanged M2–M8 pins listed above. This is local synthetic/source evidence. Hosted M1 CI for `fa369069` and hosted M9 CI with this pin remain pending publication; the prior M9 run `39901460198` still records the independent Windows tar-path failure addressed by the preceding workflow fix. Issue #52 remains OPEN / P0 / NOT_VERIFIED.

## Current exact M1–M8 pin verification and M9 local composition — 2026-10-23

The final pin sweep verified that M1–M8 PRs are OPEN/Draft and their exact heads are available. M6 PR #38 is public at `032ecfdbc107e5afd11d17ccc250a11f5aa9c3fc`; exact-head CI run `39904576948` and wrapper run `39904576958` both passed 11/11. This commit adds three regression-test lines that confirm rejecting a tampered external copy leaves the archived evidence byte-identical. M7 PR #39 is public at `97bb8de315f2c19edbaa4d6536abc50876fecffd`; exact-head CI run `39904585997` and wrapper run `39904585994` both passed 12/12. It adds only `docs/3.0/M7_E4_ARTIFACT_PROVENANCE_2026-10-23.md`; hosted lifecycle evidence remains bounded and does not establish clean-VM, standard-user, EFS, rollback, or upgrade acceptance.

Local validation at these exact source heads:

- `npm run build` passed in M1 `fa369...`, M2 `b4aae...`, M3 `12ab8...`, and M5 `7fa47...`.
- M6 verifier tests passed 21/21 and Auto E4 lifecycle tests passed 11/11 at exact head `032ecfdbc107e5afd11d17ccc250a11f5aa9c3fc`.
- M3 `test/packaged-owner-consumer.test.mjs` passed 4/4 using M1 `fa369...`, an isolated npm package built from exact M2 `b4aae...`, M3 `12ab8...`, and M5 `7fa47...`. On Windows, the test process resolved `tar` to `C:\Windows\System32\tar.exe`, matching the workflow's native-tar guard.
- M9 `node --import tsx --test test/m9-cross-module-composition.test.mjs` passed 13/13 with the exact M1–M8 heads in the table. This is source/API and synthetic-fixture composition, not a real Agent host read or production protection result.
- `git diff --check` passed for the M9 workflow, exact-source test, and this report.

At this verification snapshot, PR #36 remains OPEN/Draft at remote head `9f3b7d8c7617be84859a7f9d480b83328f05475b`; this M9 pin successor is local and has not been pushed or hosted. The integration work does not change Issue #52's OPEN/P0/NOT_VERIFIED disposition or Issue #41's OPEN/P1/HOLD status. It does not establish real Agent user-file protection, first-party host wiring, native Shell enforcement, OS-atomic TOCTOU, clean-VM installation, or external E4 acceptance.
