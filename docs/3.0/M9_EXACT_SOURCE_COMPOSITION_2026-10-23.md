# M9 exact-source composition snapshot — 2026-10-23

## M9 exact-source follow-up — 2026-10-24

The M9 worktree at `4ae37d33862a5db3a1030346be168d876281dd7c` now pins M2 PR #91 `26cdb8781e57a05f57362e3078d77ce18614481c` (tree `d47d82af42266d9cb0c3a3895b180c1c23aeb980`), M6 PR #100 `dbebc961ebde25433cf216da2c41d6b082b4be2e` (tree `96434dfb5e37a553fb6bfc2d3ee5449000ff9ae5`), M7 PR #96 `e18b9d377905c79efd584993e84a55d48ff3891b` (tree `95a57dc4e7d318451b1f39c1efaf44fee1822698`), and M8 PR #40 `90fcde07775d4109f6e1b1b4b52d1975723dd979` (tree `6c2c96e46bf19cac2ac7154cbfd4efc9ee27e82f`). Historical merged PR #37 and #84 fetch refs remain unchanged for source provenance. Older dated entries below are retained as snapshots; these exact refs supersede their earlier “current candidate” descriptions.

M9's exact-source composition test retains the M2 caller-reason regression for `allow`, `deny`, and `ask`: each decision must remain unchanged and its synthetic reason canary must be absent from stdout, stderr, and JSONL. The M7 Hook copy is pinned to the exact M1 canonical blob `b7ed4aba70a597f4f63a05decc6de1b32f67372e`. The M9 workflow runs M7's exact-head Windows CRLF Hook regression, the new exact M7/M8 offline-source regression, and the current M8 Hook output suite. Local M2 Hook tests passed 16/16, M6 verifier and complete Auto E4 tests passed 44/44 at `dbebc961`, M7 focused tests passed 5/5 at `e18b9d3`, M8 Hook-output tests passed 6/6, the M7/M8 exact-source composition gate passed 2/2, M9 TypeScript build passed, and `git diff --check` passed.

The complete local M9 exact-source composition suite did **not** pass. At the exact M6 `dbebc961` candidate, the package-export gate finds `./policy` and `./policy-router` in addition to the expected `./gateway-adapter` and `./sdk`. The unchanged Auto E4 preservation gate also reports only 2 of the reviewed 193 source lines preserved in order. Both checks remain enabled; M9 composition tests registered after those gates were not reached. The standalone exact M6 verifier and full Auto E4 suites still pass 44/44; those owner tests do not satisfy either M9 integration gate. M6 PR #100 hosted checks were pending at the time of this run and are not reported as passed.

**Issue #102 follow-up:** earlier M7 hosted run `40046523568` failed at `acceptance:offline` on the older M7 candidate `cf478f5fce4dde3229dcd11e86db14be85e65cce`. Current M7 PR #96 head `e18b9d377905c79efd584993e84a55d48ff3891b` keeps the old tracked reproduction-kit file blob `71ba0f00f31583c4227cd937972e6f9a677898ca`, but its Community builder no longer packages that stale copy. The builder requires M8 SHA `90fcde07775d4109f6e1b1b4b52d1975723dd979`, retrieves `run-offline-demo.mjs` from that exact commit, verifies blob `3428f297c28845ae054c0ca63aa6c5c4d7ef785f`, and records the M8 SHA/blob in build provenance. The workflow fetches and verifies PR #40's exact head. The updated M7 regression builds a candidate ZIP and checks the staged and zipped file bytes against the exact M8 Git blob; it passed locally. The M9 exact-source gate now passes 2/2, including Guard rejection, quarantine, post-trip write rejection, unchanged target content, and M7 builder provenance. The prior offline mismatch is resolved in the current source path; current hosted Community acceptance for e18 was not independently verified here. No M7 source, M6 lifecycle assertion, or security gate was weakened.

This is local source/test evidence plus hosted run state supplied by M0 coordination. M9 remains OPEN/Draft; the M9 branch was not pushed by this follow-up.

This snapshot records the source revisions pinned by the M9 composition workflow. The workflow checks out each source independently and validates the checked-out SHA before running the focused owner regressions and M9 composition tests.

## Current exact-source CI — 2026-10-23 14:23 UTC

PR #36 is at exact head `2d762b13794398a2dd46aa7cadeb1bff1b6c2c8e`. The workflow's M5 source pin now matches the actual squash-merge commit `f0e90c99033a6304748ac79fe106439ca4bd2e06`; both Ubuntu and Windows reached the exact-source composition suite.

Each platform reports **17 tests: 14 passed, 3 failed, 0 skipped**. The same three failures occur on both platforms:
1. M2 tracked Hook blob differs from M1's canonical Hook blob.
2. M2 Hook emits the synthetic caller-controlled reason canary to stdout for allow/deny/ask (P0 Issue #88); the M1 sanitization control passes.
3. M2/M5 denies the registered positive held-file read as `path_execution_not_pinned` (P1 Issue #87); the no-capability path-only denial control passes.

All 15 other hosted PR checks pass. No test or security assertion was removed or weakened. Issues #87 and #88 now contain the current CI result and owner acceptance criteria. M5's audit found no safe M5-only relaxation; the held-read path requires an M2 capability-bound adapter read or a jointly reviewed M1/M2/M5 API change.

The source matrix still uses historical M8 `84ee6a7a8d65706f694b7949e82fd8c83cc11523` only for the scoped M6 review regression. Current M8 PR #40 head `1abdfe3890c6c263eea667789deb7eab5038e828` is not yet composed. M8 hosted checks pass, but exact-file M1 review of its new output regression test remains pending.

M9 remains OPEN/Draft. Keep the integration gate open until the M2/M1 owner changes and review are recorded, the current M8 head is included, and exact-head composition passes. Separate product acceptance gates such as Issues #52, #41, #45, and #57 remain distinct; these source-tree checks do not establish clean-VM lifecycle or independent product E4. PR #24 remains OPEN/Draft; no main merge or Release action occurred.

## Local exact-source follow-up — 2026-10-23 15:00 UTC (awaiting hosted CI)

The M9 worktree still has remote parent `2d762b13794398a2dd46aa7cadeb1bff1b6c2c8e`; these local M9-owned changes are not hosted evidence yet. The workflow now checks current M8 PR #40 head `1abdfe3890c6c263eea667789deb7eab5038e828` separately from historical M8 `84ee6a7a8d65706f694b7949e82fd8c83cc11523`. Its exact-source candidate assertion passed locally, and the six-case `security-lab/claude-native-hook-output.test.mjs` had passed on that candidate. The current M8 lifecycle test blob is `607c1c065c66caa792c62f2cdd45d6c6223f3d24`, replacing the M6-reviewed `d8909264ea2d924d611ca01a4daa73829ab67d1d`; Issue #59 is OPEN pending M6's exact current disposition. M1 review of the new M8 output-test blob remains pending.

The added exact-source M3 checks expose a separate P0: current M3 merge source `611f9fca14706a1110a1f0a39e8488f4ff28d2a9` uses Hook blob `d6f93249306b7966259cab463dd39475728ef338`, which differs from the current M1 canonical blob `b7ed4aba70a597f4f63a05decc6de1b32f67372e`. On the exact M3 Hook, the synthetic caller-controlled reason appears on stdout for allow, deny, and ask; the M1 control stays clear and all decisions remain unchanged. Local targeted M9 run: the M8 candidate check passed; the M3 output-sanitization check failed on those three stdout canaries as expected. Issue #89 is OPEN/P0. Issue #72 is OPEN pending M1 review of the exact merged M3 blobs. This is source-tree evidence only; it does not establish package or installer exposure.

The remote 14/17 result above remains the latest hosted M9 composition evidence at the time of this 15:00 UTC checkpoint. A full exact-head hosted rerun is pending publication of these M9-owned workflow, test, and report updates; until owner fixes and exact-source CI pass, M9 remains blocked by P0 output handling and unresolved M2/M5 compatibility failures. No failing assertion was removed or weakened.

## Exact-head hosted result — 2026-10-23 15:09 UTC

PR #36 exact head `4cc4565a46c4fb760d891f00a11431a8afd666e3`, run [39975045227](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/39975045227), completed on Ubuntu and Windows. Both platforms report **20 tests: 15 passed, 5 failed, 0 skipped**. Failures are identical: (1) pinned M2/M5/M7/M9 Hook copies do not match current M1 canonical; (2) M2 exact Hook reason canaries reach stdout (P0 #88); (3) current M3 Hook differs from M1 canonical (reopened #72); (4) M3 exact Hook reason canaries reach stdout (P0 #89); and (5) the registered M2/M5 positive held-file read is denied as `path_execution_not_pinned` (P1 #87). All five gates remain enabled.

The current M8 PR #40 candidate is separately pinned; its six-case Hook-output test and the M9 exact candidate assertion pass. General CI, package smoke, wrapper regressions, Windows installer lifecycle, and the AC3 ownership-contract check pass. The PR description's required evidence and ownership fields are present; coordination run [39975677845](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/39975677845) passes.

M9 remains OPEN/Draft. Issues #87/#88/#89 contain current exact-head evidence; M6 disposition on the changed M8-owned E4 test file (#59) and M1 exact review of current merged M3 Hook files (#72) remain pending. Product acceptance Issues #52 and #57 are still separate and NOT_VERIFIED. No first-party product-host protection, OS-atomic TOCTOU, clean-VM installer acceptance, or independent product E4 is claimed. PR #24 remains OPEN/Draft and unchanged.

## Exact-source checkpoint — 2026-10-23 14:07 UTC (historical; superseded above)

The current workflow checks out M1 at feature tip `7cd34454c4bd6aa7176e0e076f5333639e3ccd5d`, M2 at merged PR #37 commit `49af6d3dd57d9f091c95f489ead27f4f03c941a9`, M3 at `611f9fca14706a1110a1f0a39e8488f4ff28d2a9`, M4 at `d0f61987c2a06acb47a7187142bc303101af0ad4`, M5 at merged PR #47 commit `f0e90c99033a6304748ac79fe106439ca4bd2e06`, M6 at `a6f4a889ec16b4f2c78f91d630e657eea7319dbd`, and M7 at `8689d8fbbcdded4735d0e5aa328805f398a2862a`. The M8 checkout remains the historical source `84ee6a7a8d65706f694b7949e82fd8c83cc11523` used only to verify the scoped M6 review regression; current M8 PR #40 head `1abdfe3890c6c263eea667789deb7eab5038e828` is not yet included in the M9 exact-source matrix.

M5 PR #47 was squash-merged, so its pre-merge implementation commit `6695e0470d7ceef1485f912ac61237fc91860cd8` is not an ancestor of the merged M5 checkout. The workflow now pins the actual M5 merge commit and retains the ancestry assertion against that exact source.

The local exact-source suite at old M9 head `20b384f30a24ee0ece73b205abc1e8e6d011a0de` was **14/17 passed, 3 failed**: (1) M2's Claude host Hook blob differs from M1's canonical Hook blob; (2) the M2 Hook prints a caller-controlled decision reason to stdout in allow/deny/ask cases (P0 Issue #88); and (3) the registered M2/M5 positive held-file read is denied as `path_execution_not_pinned` (P1 Issue #87). Negative controls remain enabled. Hosted run `39965738477` for remote head `20b384f` failed its Ubuntu and Windows jobs before composition tests because of the stale M5 pin. At that historical checkpoint the correction had not yet been hosted; see the current exact-source CI section above for the result at the corrected head.

## Exact-source M1/M2 + M3/M5 integration result — 2026-10-23

The following results are a historical candidate snapshot and are superseded for current source refs by the recheck above. Do not interpret its old PR-head and merge-state labels as current status.

M9's working workflow and focused test now pin both merged M1/M2 sources to feature baseline `daa17efb70ba8c67b485e9269ec461138fd86f7c`, and M5 to PR #47 candidate `f33b4a770f6c6f05a3d291c0bd2f4f01989d9964`. The M5 candidate descends from the exact M1/M2 baseline and contains STRICT fix `6695e0470d7ceef1485f912ac61237fc91860cd8`, coordinated M3 adapter patch `243b83e893960e02a3a6348995dd417b29b3b320`, and the M0 API contract. The M3 adapter is exercised from this exact M5 tree; the separate M3 source remains only as the standalone fail-closed fixture.

Local Windows verification on exact M5 PR #47 source:

- `npm run build -- --pretty false`: **passed**.
- `node --import tsx --test test/risk-policy.test.ts test/policy-router-export.test.ts test/policy-management.test.ts test/codex-connection-check.test.ts`: **70/70 passed**.
- Exact M2 merged feature source was packed and installed into an isolated package consumer. From exact M5 source, `node --test test/packaged-owner-consumer.test.mjs`: **4/6 passed, 2 failed**. Both failures are positive protected-read controls: the injected fixed-marker composition returns `OWNER_POLICY_DENIED` where `FIXED_PROBE_CONTROLS_PASSED` is expected, and the held-file onboarding positive control returns `PROTECTED_HOST_DISPATCH_DENIED` where `HELD_FILE_POSITIVE_CONTROL` is expected. The remaining denial-before-callback and missing-export cases passed. These failures preserve fail-closed behavior but mean the exact M1/M2/M3/M5 positive package composition is not accepted.
- M9's exact-source suite stops at its reviewed-source guard: the M3 `test/agent-hook.test.ts` blob is `04419e519983ba77ee98fd8b019ef3440c80ab51`, not M1's reviewed blob `cc4e03b939ea6b18f427bb2f9ac026cca5314c63`. The current M3 candidate removed a previously reviewed positive held-file Gateway test. The guard remains unchanged; this needs renewed M1 review or restoration by the owner.

The PR #47 hosted checks reported by coordination are green (13 product jobs plus ownership-contract run `39945894340`), but they do not supersede the two local package-consumer failures or the M1 review-blob mismatch. Current M9 evidence demonstrates only synthetic source/package composition; it does **not** establish first-party host semantics, actual desktop routing, user-file protection, or TOCTOU safety. Keep the integration gate open until the positive consumer paths work without weakening security assertions and the changed M3 reviewed scope receives owner disposition.

| Module | PR | Exact source SHA | M9 coverage |
| --- | --- | --- | --- |
| M1 Gateway | #43 (merged) | `daa17efb70ba8c67b485e9269ec461138fd86f7c` (merged feature baseline) | M9 checks the exact integrated feature tree, including the M1 alias and held-file Gateway changes. The historical M1 review remains limited to its cited API/file scopes; no product-host or TOCTOU acceptance |
| M2 isolation | #37 (merged) | `daa17efb70ba8c67b485e9269ec461138fd86f7c` (same merged feature baseline) | The exact M2 public facade is packed from the merged tree. Historical M1 review covers only the adapter-to-Gateway contract; no first-party host acceptance |
| M3 onboarding | #33 (merged) | `cac8f4627aceb5dd3732036129e42ade7e4790e9` (standalone fail-closed fixture) | M9 retains this standalone fixture for missing-export checks. The coordinated M3 adapter change is separately tested from exact M5 PR #47 source `f33b4a7`; package/host tests remain synthetic |
| M4 desktop security center | #34 | `d62557a03883c459cce6bec60b36686128ccf73d` (current public PR head; exact checks 9/9 passed) | Preserves keyboard focus and selected-event explanation across refresh; status consumer remains read-only and first-party host read is NOT_VERIFIED |
| M5 policy | #47 (open draft) | `f33b4a770f6c6f05a3d291c0bd2f4f01989d9964` (exact PR head at refresh) | Includes M5 STRICT omitted/false correction `6695e047`, coordinated M3 adapter patch `243b83e`, and the M0 API contract. M9 runs exact-source policy, M3 host, and synthetic packaged-consumer regressions; hosted M9 composition and real host acceptance remain separate gates |
| M6 E4 | #38 | `032ecfdbc107e5afd11d17ccc250a11f5aa9c3fc` (current public PR head; exact-head CI and wrapper 11/11 passed) | Adds regression assertions that external-copy mismatch rejection preserves the archived source byte-for-byte |
| M7 reliability | #39 | `97bb8de315f2c19edbaa4d6536abc50876fecffd` (current public PR head; exact-head CI and wrapper checks 12/12 passed) | Adds a product-E4 artifact provenance audit document only; runtime and regression tests are unchanged. Issue #41 remains OPEN/P1/HOLD for clean-VM, standard-user, EFS, first-launch, rollback, and upgrade acceptance |
| M8 open-source product | #40 | `f321df3041e2a101661da686a6ccbe6a222b4d24` (current public PR head; exact checks 11/11 passed) | Hardens docs validation for TypeScript-generated `dist` examples; Hook provenance, LF checkout and sanitized JSONL regressions remain pinned |

## Owner-review boundaries

- The current M9 source matrix pins M1 and M2 to the same merged feature tree `daa17efb70ba8c67b485e9269ec461138fd86f7c`; the M5 candidate `f33b4a770f6c6f05a3d291c0bd2f4f01989d9964` descends from that exact base. The M3 adapter and packaged-consumer candidate tests run against the M3 files in the exact M5 tree. These checks compose exact code and a synthetic package fixture; they do not establish production host wiring or first-party OS/user-file protection.

- M1 Issue #52 comment `6349691761` approves the exact historical M2 source `099ad64e4a09330920cbd40847adec3fe631e91e` for the M1 Gateway/M2 adapter API contract only, with historical M1 review base `a5eff766ebe041bc2c6cc13758827d5a96205de9`. Historical M2 `b4aae52340e5eff5d9da4929f1bd59133048930c` descends from that reviewed source; its report-only successor left the package/facade blobs unchanged. This does not broaden the historical review to new M2 runtime behavior or establish first-party host wiring. The merged M1/M2 feature baseline `daa17efb70ba8c67b485e9269ec461138fd86f7c` includes the NTFS short-name alias denial fix. The owner disposition still approves only M2 adapter-to-M1 capability API compatibility; it does not accept M1's current read implementation, first-party host integration, or TOCTOU protection.
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

## Exact public-candidate composition and receipt-tool package boundary — 2026-10-23

This section supersedes the earlier exact-source table above for the M2, M3, and M6 pins. M9's exact-source test and workflow now target these published owner PR heads:

| Module / PR | Exact candidate SHA | Candidate-specific note |
| --- | --- | --- |
| M1 / #43 | `fa369069241bf81d32c7f39d31a61806efa55fe4` | Gateway protected-resource identity candidate |
| M2 / #37 | `3a60813e90d470cb2e5d609444aba0ffc240411c` | Exact public head; its exact-head CI run `39907522136` contains the file-state concurrency failure tracked as Issue #51 |
| M3 / #33 | `47474e3ea71b8a3ab0f175a74e2970ee52150878` | Exact public head; exact-head CI run `39911107983` passed 9/9 |
| M4 / #34 | `d62557a03883c459cce6bec60b36686128ccf73d` | Existing read-only Security Center consumer candidate |
| M5 / #47 | `7fa47e8d82e4b92307a4429ea743931b4600ac90` | Exact public policy-router candidate |
| M6 / #38 | `392a7c24697fd8925e3022616aad054922efb38f` | Exact public receipt-verifier candidate |
| M7 / #39 | `97bb8de315f2c19edbaa4d6536abc50876fecffd` | Existing exact source pin |
| M8 / #40 | `84ee6a7a8d65706f694b7949e82fd8c83cc11523` | Exact public candidate; includes sponsor smoke isolation/cleanup changes as well as documentation |

M3's current `package.json` exports only `./sdk`. It does not publish `./gateway-adapter` or `./policy-router`. M2 owns the former export and M5 owns the latter. The M3 `test/packaged-owner-consumer.test.mjs` creates a temporary synthetic manifest by additively combining the M3, M1, M2, and M5 export maps, copies exact owner bytes, packs that temporary tree, and then exercises the unpacked result. That test artifact is not the M3 PR package or an already-supported aggregate npm package. The separate M9 runtime composition tests also compose independently checked-out owner modules and an exact packed M2 facade under dependency injection; they do not make the M3 package manifest additive.

At the exact M3/M1/M2/M5 heads, the synthetic consumer test covers: package resolution and byte identity for the M1 `./sdk`, M2 `./gateway-adapter`, and M5 `./policy-router` entries; a fixed temporary marker positive read with cleanup; a stale M1 capability denied by the M5 router before either the M5 callback or M1 held-file read; `UNKNOWN` with no probe when either the M2 or M5 export is absent; M2 rejection of a lexical alias and a replaced held-file path before policy callback dispatch; and M1 capability-binding rejection of a sensitive symlink alias before M5 router creation. These are exact-source, synthetic package/fixture cases. They do not establish a shipped composite package, real Codex/product-host wiring, reads of users' real files, native Shell enforcement, OS-atomic race prevention, or external E4 acceptance.

M6's exact `package.json` keeps `security-lab/e4/verify-bundle.mjs` behind the repository-only `e4:verify` script. Its published `exports` contains only `./sdk`, and its npm `files` allowlist is `dist`, `README.md`, `README.zh-CN.md`, and `LICENSE`. A dry-run package preview at M6 `392a7c2` listed no `security-lab/e4` files, including the independent receipt schema and verifier tests. Therefore consumers of the npm package do not receive the receipt verifier CLI or receipt schema; those remain checkout tooling. A verifier unit-test pass would establish verifier logic against test fixtures only, not the existence or validity of an independent reviewer receipt.

M9's focused gate now asserts the exact M3 export boundary, the owner-export distinction, and the M6 npm allowlist/package-preview exclusion. Issue #52 remains OPEN/P0/NOT_VERIFIED until supported product-host wiring and real protected-resource behavior are independently demonstrated; the M1 API disposition does not satisfy that gate. Issue #57 remains OPEN/P1/NOT_VERIFIED until a separately produced and reviewed E4 receipt is present and verified. Synthetic composition, M6's verifier code, and the fact that the verifier itself is excluded from npm must not be used to close either issue.

### Local exact-source rerun

- `npm run build` passed in the exact M1 `fa369069`, M2 `3a60813`, M3 `47474e3`, and M5 `7fa47e8` worktrees.
- M3 `test/packaged-owner-consumer.test.mjs` passed **6/6** with the exact M1/M2/M3/M5 sources. The test consumed a real npm tarball created from exact M2 `3a60813`; its six cases include the positive marker, M5 denial, missing-M2/M5 fail-closed controls, replaced-path/alias denial, and sensitive symlink rejection.
- M6 `node --test security-lab/e4/verify-bundle.test.mjs` passed **26/26** at `392a7c2`. These are verifier fixture regressions; no independent reviewer ran E4 here.
- M9 `node --import tsx --test test/m9-cross-module-composition.test.mjs` passed **15/15** with exact roots M1 `fa369069`, M2 `3a60813`, M3 `47474e3`, M4 `d62557a`, M5 `7fa47e8`, M6 `392a7c2`, M7 `97bb8de`, and current public M8 `84ee6a7`. This run includes M6 `npm pack --dry-run --json` and confirmed 90 candidate package files with no `security-lab/e4` entry.
- M8 PR #40 was verified at public head `84ee6a7a8d65706f694b7949e82fd8c83cc11523`; the M9 pin is advanced from `f321df3` to that exact commit. At the time of the hosted check snapshot, M8's MacOS Node 20 and Windows Node 20/22 jobs were still pending; its other listed jobs had passed.
- M2 exact head `3a60813` remains subject to its hosted concurrency failure in run `39907522136` (Issue #51). M3 exact head `47474e3` passed its owner workflow run `39911107983` (9/9). M9's changes here are local only; PR #36 has not been pushed or hosted on this refreshed pin set.

The exact M3 package remains SDK-only even though its temporary test tarball adds owner export entries. The M6 verifier remains repository-only despite its passing fixture tests. These package boundaries and evidence limits are now enforced by M9-owned assertions.

## Repinned owner candidates and exact package readiness gate — 2026-10-23

This section supersedes the prior M2/M3/M4/M6/M8 pin snapshot above. The M9 workflow and exact-source test now pin the currently published owner candidates:

| Module / PR | Exact owner SHA |
| --- | --- |
| M1 / #43 | `fa369069241bf81d32c7f39d31a61806efa55fe4` |
| M2 / #37 | `db98c7d5d409aa390ef539c96a209d6daba8d793` |
| M3 / #33 | `df580cf712ba36863b9245fbb5bbacf484dac919` |
| M4 / #34 | `d0bc987e509ffcddd04880d35f9b6791a9aed0e4` |
| M5 / #47 | `7fa47e8d82e4b92307a4429ea743931b4600ac90` |
| M6 / #38 | `392a7c24697fd8925e3022616aad054922efb38f` |
| M7 / #39 | `97bb8de315f2c19edbaa4d6536abc50876fecffd` |
| M8 / #40 | `84ee6a7a8d65706f694b7949e82fd8c83cc11523` |

The exact M2 public facade is `createSecurityGatewayHostAdapter`, exported at `./gateway-adapter`. The M5 owner package declares `./policy-router` with `types: ./dist/policy-router.d.ts` and JS `import`/`default: ./dist/policy-router.js`; both files exist and `dist` is in its `files` allowlist. The M5 owner reports that its actual 94-file npm tarball imports successfully and approves this export for a single integrated package. This verifies the M5-owned package boundary only; it does not turn the standalone M3 package into that aggregate package.

At exact M3 head `df580cf712ba36863b9245fbb5bbacf484dac919`, the real-package opt-in gate packs the unchanged M3 checkout and returns `NOT_READY` for its 96-file candidate. The M9 regression invokes that gate against exact M1 `fa369069`, M2 `db98c7d5`, and M5 `7fa47e8` roots and asserts its exact result:

1. `M1: integrated target bytes differ from the exact owner (./dist/sdk.d.ts)`
2. `M2: integrated package does not export ./gateway-adapter`
3. `M5: integrated package does not export ./policy-router`

The gate's exit code 1 is the expected result for this candidate, and the surrounding M9 test passes only when the machine-readable `NOT_READY`, M3 package SHA, 96-file count, and all three issue strings match. PR #33 by itself therefore does not produce a supported packaged M1/M2/M5 composition. M3's synthetic merged-tarball test remains explicitly labeled as a synthetic composition fixture: it exercises exact owner export bytes and injected fixture behavior, but does not publish M2's `./gateway-adapter` or M5's `./policy-router` from the M3 package. M9's separate runtime fixtures are also synthetic and do not prove first-party host wiring or real user-file access.

M6's `security-lab/e4/verify-bundle.mjs` and receipt schema remain repository-only tooling omitted by the npm `files` allowlist; the released CLI/package must not be described as including that verifier. The verifier checks receipts against fixtures, but no independent product-level E4 run or receipt is established here.

### Exact-source validation and hosted checks

- M9 `node --import tsx --test test/m9-cross-module-composition.test.mjs` passed **16/16** using the exact M1–M8 roots above. This includes the expected-NOT_READY real-package assertion, explicit M3 SDK-only/M2-and-M5 export boundaries, M5 target and allowlist assertions, M6 package preview exclusion, and the existing source/API and synthetic fixture checks.
- The M3 synthetic owner-consumer suite had previously passed **6/6** against the exact M1/M2/M3/M5 heads, consuming a real npm tarball from M2 `db98c7d5`; those results remain synthetic and do not override the M3 real-package gate.
- The exact owner-head hosted workflows are green at the pins above: M1 runs `39903113727` and `39903113558` (including its file-store tests), M2 run `39913491343`, M3 run `39913500554`, M4 run `39913504965`, M5 run `39902163975`, M6 run `39910433154` plus wrapper run `39910433046`, M7 run `39904585997` plus wrapper run `39904585994`, and M8 run `39911831058` plus wrapper run `39911831084`. These owner checks do not establish that the M9 combined workflow has run at the refreshed pins.
- The M9 changes are local until the coordinator's next push batch. PR #36's current hosted checks do not yet validate this refreshed workflow; a new M9 CI run is required after publication.

Issue #52 remains **OPEN / P0 / NOT_VERIFIED** because the package fixtures do not prove supported product-host wiring, real protected-resource reads, or OS-atomic TOCTOU behavior. Issue #57 remains **OPEN / P1 / NOT_VERIFIED** pending a separately produced and independently reviewed E4 receipt. Neither issue was closed or modified. The exact M3 package gate and these issue states are M9 integration acceptance controls; no synthetic pass may be presented as a shipped package or independent E4 result.

## Exact remote-head refresh for M3, M4, and M5 — 2026-10-23

The M9 workflow and exact-source composition map now pin the currently published owner PR heads below. The prior section's M3/M4/M5 hashes and owner-run summary are historical snapshots and are superseded for the current M9 candidate.

| Module / PR | Exact remote owner head | Owner CI evidence at refresh |
| --- | --- | --- |
| M1 / #43 | `fa369069241bf81d32c7f39d31a61806efa55fe4` | Existing exact-head CI evidence; not rerun here |
| M2 / #37 | `db98c7d5d409aa390ef539c96a209d6daba8d793` | Existing exact-head CI evidence; not rerun here |
| M3 / #33 | `b8b471f3ceba9ec0ca9e270ac430f14d6a917e3b` | Run `39919260164` failed in Ubuntu Node 22 `npm test` |
| M4 / #34 | `721c25b9d0decd2e86ce3411ac8feb3e4cfbffc2` | Run `39919282220` passed all 9 checks |
| M5 / #47 | `8bb14c6b38dc2cc76bdf915442dc8048d30ff76d` | Run `39918480015` succeeded |
| M6 / #38 | `392a7c24697fd8925e3022616aad054922efb38f` | Existing exact-head CI evidence; not rerun here |
| M7 / #39 | `97bb8de315f2c19edbaa4d6536abc50876fecffd` | Remote head remains this SHA. Local candidate `868842b1b7d76cf94a8d84a5f76c6acd4ca67f50` has successful CI run `39815479316` and wrapper run `39815479411`, but is not published and is therefore not pinned here. |
| M8 / #40 | `84ee6a7a8d65706f694b7949e82fd8c83cc11523` | Existing exact-head CI evidence; not rerun here |

M3's failing subtest is `approval expires with no actual callback` in `test/gateway.test.ts`. The test fails while reading `s.runtime.operator.pending()[0].requestId`: `pending()[0]` is `undefined`, producing `TypeError: Cannot read properties of undefined (reading 'requestId')`. The test configures `approvalTtlMs: 5`; failure occurs before the subsequent `approve(id)` assertion that expects `/EXPIRED/`. This points to an unverified timing-sensitive test boundary, not a confirmed product root cause. The M3 owner must diagnose it; M9's local pass does not replace the failed hosted M3 run.

The exact M3 commit adds an incompatible-provider fail-closed regression; the exact M5 commit adds a Gateway held-file capability adapter and focused tests. The exact M4 commit changes only its host-ownership route-audit document relative to the prior M9 pin. The current M3 package remains an expected `NOT_READY` candidate: its 96-file package lacks the M2 `./gateway-adapter` and M5 `./policy-router` exports and has the recorded M1 `./sdk` declaration mismatch. M5's adapter unit tests do not establish first-party product-host wiring.

### Local exact-source validation

- M3 `node --import tsx --test test/onboarding.test.ts test/codex-connection-check.test.ts test/agent-hook.test.ts test/security-center-route-m3.test.ts`: **43/43 passed** at `b8b471f3`.
- M5 `node --import tsx --test test/risk-policy.test.ts test/policy-router-export.test.ts test/policy-management.test.ts`: **59/59 passed** at `8bb14c6b`.
- M9 `node --import tsx --test test/m9-cross-module-composition.test.mjs`: **16/16 passed** against the exact M1–M8 remote heads in the table. The exact M1/M2/M5 package build and M2 tarball were prepared in an M9-owned temporary validation directory and removed after the run; no other module source tree was edited.
- `git diff --check` passed for the M9-owned changes.

These checks cover owner-source, package-boundary, API, and synthetic fixture composition only. M1/M3/M4/M5 product-file security closure remains `NOT_READY / NOT_VERIFIED` per owner evidence; first-party host wiring, real user-file protection, native Shell interception, OS-atomic TOCTOU, clean-VM lifecycle, and external E4 remain unverified. Issue #52 remains OPEN/P0/NOT_VERIFIED. M9 PR #36's hosted workflow has not run against these refreshed pins because this candidate remains local pending the coordinator's push batch.

## Exact remote-head refresh for M6 and M7 — 2026-10-23

This section supersedes the M6/M7 entries in the previous table. The M9 workflow and source map now target the current public PR heads. The other six refs were re-read from their public PRs and are unchanged from the previous exact-head refresh.

| Module / PR | Exact remote owner head | Owner CI evidence at refresh |
| --- | --- | --- |
| M1 / #43 | `fa369069241bf81d32c7f39d31a61806efa55fe4` | Existing exact-head CI evidence; no new run in this refresh |
| M2 / #37 | `db98c7d5d409aa390ef539c96a209d6daba8d793` | Existing exact-head CI evidence; no new run in this refresh |
| M3 / #33 | `b8b471f3ceba9ec0ca9e270ac430f14d6a917e3b` | Run `39919260164` remains failed in Ubuntu Node 22; owner diagnosis remains outstanding |
| M4 / #34 | `721c25b9d0decd2e86ce3411ac8feb3e4cfbffc2` | Run `39919282220` passed all 9 checks |
| M5 / #47 | `8bb14c6b38dc2cc76bdf915442dc8048d30ff76d` | Run `39918480015` succeeded |
| M6 / #38 | `98a4833250434de905611ace71bfe8094554d417` | Exact-head CI run `39920790310` and wrapper `39920790439` both succeeded |
| M7 / #39 | `5a7540b0b041d10e6d562aa528f79a2cfdea987a` | Exact-head CI run `39920944820` and wrapper `39920944771` both succeeded |
| M8 / #40 | `84ee6a7a8d65706f694b7949e82fd8c83cc11523` | Existing exact-head CI evidence; no new run in this refresh |

M6's new head changes the receipt schema and verifier to bind the independent E4 receipt to product-run identity. M7's new head updates only the product-E4 provenance document. The M7 helper blob checked by the conditional M6 review remains unchanged at `89e8a04ed026af146a712517144f560aefe92a0d`; this only preserves that narrow source condition, not a broad M6 acceptance of the current M7 head.

PR #36 hosted workflow run `39920983998` (composition), CI run `39920984006`, and wrapper `39920984084` all succeeded on the earlier M9 head `dddbdd48719b3075587f2dedca6eff76eff3c282`. That workflow checked out the old M6 `392a7c24697fd8925e3022616aad054922efb38f` and M7 `97bb8de315f2c19edbaa4d6536abc50876fecffd`; it is historical old-pin evidence and does not validate the new M6/M7 heads.

The local focused command `node --import tsx --test test/m9-cross-module-composition.test.mjs` passed **16/16** with exact M1–M8 roots from the table above, including the exact M2 npm tarball installed into a disposable consumer. `git diff --check` passed. Only M9 workflow refs/assertions, the M9 test SHA map, and M9 reports changed. A new hosted M9 run is pending the coordinator's next push batch. Package fixtures remain synthetic; M1/M3/M4/M5 product-file closure, real protected reads, OS-atomic TOCTOU, clean-VM lifecycle, and external independent E4 remain `NOT_READY / NOT_VERIFIED`.

## M3 local-head refresh and M1/M2 merge record — 2026-10-23

This section supersedes the M3 pin in the preceding table. The exact M1/M2 source pins remain their unchanged module PR heads, now merged into the shared AC3 base as recorded below.

| Module / PR | Exact source pin | Current availability / CI evidence |
| --- | --- | --- |
| M1 / #43 | `fa369069241bf81d32c7f39d31a61806efa55fe4` | PR merged into `feature/agent-canary-3.0` as `f0b4ee800672c3b702fa6d48201f74642d724cc5`; source branch head is unchanged |
| M2 / #37 | `db98c7d5d409aa390ef539c96a209d6daba8d793` | PR merged into `feature/agent-canary-3.0` as `49af6d3dd57d9f091c95f489ead27f4f03c941a9`; source branch head is unchanged |
| M3 / #33 | `bfcf85e7d1a6870973181b988f2e7b6aefdf5c37` | Local owner candidate, not pushed yet; no hosted CI for this SHA |
| M4 / #34 | `721c25b9d0decd2e86ce3411ac8feb3e4cfbffc2` | Run `39919282220` passed all 9 checks |
| M5 / #47 | `8bb14c6b38dc2cc76bdf915442dc8048d30ff76d` | Run `39918480015` succeeded |
| M6 / #38 | `98a4833250434de905611ace71bfe8094554d417` | Exact-head CI `39920790310` and wrapper `39920790439` succeeded |
| M7 / #39 | `5a7540b0b041d10e6d562aa528f79a2cfdea987a` | Exact-head CI `39920944820` and wrapper `39920944771` succeeded |
| M8 / #40 | `84ee6a7a8d65706f694b7949e82fd8c83cc11523` | Existing exact-head evidence; not rerun for this refresh |

M3 candidate `bfcf85e` updates the Console protected-read flow and adds fixed-probe denial controls to its route and packaged-consumer tests. The M9 focused composition passed **16/16** with this exact local M3 source; its synthetic `codex-connection-mcp` positive-control still asserts that unchanged runtime's `ALLOW / HELD_FILE_POSITIVE_CONTROL` result. This does not assert the separate Console flow's positive status or real product-host wiring. The standalone M3 package gate remains `NOT_READY`; the package export map is still SDK-only. The earlier M3 run `39919260164` failed at the old published M3 SHA `b8b471f3ceba9ec0ca9e270ac430f14d6a917e3b` and is not evidence for or against the new local candidate.

M1 PR #43 and M2 PR #37 merge commits are recorded above, but merge completion does not resolve Issue #52. It remains **OPEN / P0 / NOT_VERIFIED** pending supported first-party host wiring, real protected-resource behavior, and OS-atomic TOCTOU evidence. PR #36 hosted runs `39920983998`, `39920984006`, and `39920984084` used the earlier M3/M6/M7 pins and therefore do not validate this source set. M3 CAC8 is now public; its M1-reviewed test-blob mismatch blocks current local composition as recorded in the refresh section below.

## Published M3 refresh and M9 gate result — 2026-10-23

This refresh supersedes the preceding M3 pin; the M9 exact-source check exposed a review-boundary mismatch and is not green.

| Module / PR | Exact public source head | Evidence at refresh |
| --- | --- | --- |
| M1 / #43 | `fa369069241bf81d32c7f39d31a61806efa55fe4` | Merged to the feature base as `f0b4ee800672c3b702fa6d48201f74642d724cc5`; source pin unchanged |
| M2 / #37 | `db98c7d5d409aa390ef539c96a209d6daba8d793` | Merged to the feature base as `49af6d3dd57d9f091c95f489ead27f4f03c941a9`; source pin unchanged |
| M3 / #33 | `cac8f4627aceb5dd3732036129e42ade7e4790e9` | Public/open; `gh run list --commit` returned no hosted runs and `gh pr checks 33` reported none at refresh |
| M4 / #34 | `721c25b9d0decd2e86ce3411ac8feb3e4cfbffc2` | Merged to the feature base |
| M5 / #47 | `8bb14c6b38dc2cc76bdf915442dc8048d30ff76d` | Hosted CI run `39918480015` succeeded (9/9) |
| M6 / #38 | `98a4833250434de905611ace71bfe8094554d417` | Merged to the feature base; independent product E4 and Issue #57 remain NOT_VERIFIED |
| M7 / #39 | `5a7540b0b041d10e6d562aa528f79a2cfdea987a` | Public/open; exact-head CI and wrapper runs `39920944820` / `39920944771` succeeded |
| M8 / #40 | `84ee6a7a8d65706f694b7949e82fd8c83cc11523` | Public/open. The local successor `4fb07ed5abebf642a22df2a05bd8bdc9a4ea1f50` is unpushed and unverified, so it is not pinned |

The M9 workflow and composition test source map now pin M3 `cac8f4627aceb5dd3732036129e42ade7e4790e9`; the workflow runs the exact M3 focused tests and the M9 composition test checks M3's `check:integrated-package` result. The exact M9 run was attempted with exact M1–M8 roots, including temporary detached source clones at the published M5/M7/M8 SHAs where the shared owner worktrees had unpublished successors. It fails at the existing M1-to-M3 review guard: M1-reviewed M3 blob `test/agent-hook.test.ts` was `cc4e03b939ea6b18f427bb2f9ac026cca5314c63`, while current M3 is `04419e519983ba77ee98fd8b019ef3440c80ab51`. M3's CAC8 change removes the positive held-file Gateway test from that file and adds it to `test/security-center-route-m3.test.ts`; it also adds quarantine-subscriber tests. This relocation may preserve that positive fixture, but the recorded M1 disposition did not review the new test blob. M9 keeps the exact review guard unchanged pending an M1 owner disposition; no product-security failure is inferred from this test-blob mismatch.

The root `package.json` was not edited in this partial refresh. PR #36 is still conflicting against feature baseline `75c2119f31928daf54041a4be714a892cc93e0e2`, including `package.json`; the M9 branch also lacks M3 `scripts/check-integrated-package.mjs` and `test/security-center-route-m3.test.ts`, plus M5 `src/policy-router.ts` and `test/policy-router-export.test.ts`. Adding those root commands/exports before their owner files and the shared manifest conflict are reconciled would create dangling package entries. The exact M3 and M5 canonical tests remain run directly from their separate owner checkouts in the M9 workflow. No full rebase/merge was attempted; shared runtime, packaging, and canonical-test conflicts remain assigned to their respective owners.

Issue #52 remains **OPEN / P0 / NOT_VERIFIED**; product-host hookup, real protected-resource access, and OS-atomic TOCTOU remain unverified. Issue #57 and independent product E4 remain **NOT_VERIFIED**. The M9 new-pin hosted composition has not run. No PR was pushed or merged.

## Current merged-source matrix after M7 merge — 2026-10-23

This section supersedes the earlier “current” tables above. The exact source pins for merged modules use GitHub's actual merge commits, not an old owner branch head or an unpublished local candidate. For M1 and M2, the M9 harness uses the shared current feature baseline at the M7 merge commit.

| Module / PR | M9 test source pin | GitHub source state at refresh | M9 interpretation |
| --- | --- | --- | --- |
| M1 / #43, #82 | `8689d8fbbcdded4735d0e5aa328805f398a2862a` | Merged feature baseline. Separate sanitizer PR #83 head `afd049246e027f414c6a53ee3e4355444718efd7` remains OPEN/Draft and is not part of this baseline. All 14 reported checks for #83 pass at refresh; the candidate is still unmerged. | Merged baseline is test input. #83 is `CI_GREEN / OPEN / NOT_MERGED`; it is not represented as an integrated PASS. |
| M2 / #37 | `8689d8fbbcdded4735d0e5aa328805f398a2862a` | Merged feature baseline. | Exact shared-baseline test input. |
| M3 / #33 | `611f9fca14706a1110a1f0a39e8488f4ff28d2a9` | PR head `96d688d725292092dfc4e7ba940e9edfa8354e1e`; merged at `611f9fca14706a1110a1f0a39e8488f4ff28d2a9`. | Exact merge commit test input. |
| M4 / #34 | `d0f61987c2a06acb47a7187142bc303101af0ad4` | PR head `721c25b9d0decd2e86ce3411ac8feb3e4cfbffc2`; merged at `d0f61987c2a06acb47a7187142bc303101af0ad4`. | Exact merge commit test input. |
| M5 / #47 | `f0e90c99033a6304748ac79fe106439ca4bd2e06` | PR head `688f4bf4acd9a46a5bbaed622c71a64ef788e551`; merged at `f0e90c99033a6304748ac79fe106439ca4bd2e06`. | Exact merge commit test input. |
| M6 / #38 | `a6f4a889ec16b4f2c78f91d630e657eea7319dbd` | PR head `98a4833250434de905611ace71bfe8094554d417`; merged at `a6f4a889ec16b4f2c78f91d630e657eea7319dbd`. | Exact merge commit test input. Independent product E4 remains `NOT_VERIFIED`. |
| M7 / #84 | `8689d8fbbcdded4735d0e5aa328805f398a2862a` | PR head `a0b2968ca18bf4264ff93789abb65c1dc1c2e4cf`; merged at `8689d8fbbcdded4735d0e5aa328805f398a2862a`. | Exact merge commit and shared M1/M2 baseline. |
| M8 / #40 | Historical scoped-test pin `84ee6a7a8d65706f694b7949e82fd8c83cc11523` | Current public PR head `ba3f6feffcc191d8d526a6cd8e44cdb88c44bcd6` is OPEN/Draft and DIRTY, with failed hosted checks. | The workflow's historical pin is used only to preserve the narrow M6-reviewed test-source assertion. M8's current PR candidate is `NOT_VERIFIED`; no unverified local candidate is pinned or described as PASS. |

At refresh, PR #83's exact head had successful ownership evidence, all Ubuntu/Windows/macOS test jobs, Windows wrapper regressions, package smoke, Docker/sponsor smoke, Windows build evidence, and installer lifecycle checks. It remains a draft/open candidate, so CI success alone does not make its sanitizer changes part of the M9 merged-source baseline. PR #40 remains stale and conflict-marked; its failed checks are not hidden by the historical M8 compatibility pin.

The M9 workflow and `test/m9-cross-module-composition.test.mjs` now pin the merged SHAs above and label the historical M8 ref explicitly. This updates exact source identity only. It does not approve any new Hook/test blob, expand historical M1/M6 review scope, close Issue #52 or #57, or establish product-host wiring, real protected-file operations, OS-atomic TOCTOU, clean-VM installer acceptance, or independent E4. The M9 workflow has not yet run on these refreshed pins; hosted M9 acceptance remains `NOT_VERIFIED` until the updated candidate is published and its exact-head checks complete.

The ordinary merge of `origin/feature/agent-canary-3.0` at `8689d8fbbcdded4735d0e5aa328805f398a2862a` was attempted in the existing M9 worktree and stopped because it produced 31 conflicts in shared/module-owned files outside the M9 ownership boundary. The merge was aborted with the branch returned clean to its prior HEAD; no other module files were resolved or changed. M9-owned source-pin updates can be verified locally, but PR #36 still requires coordinator-owned conflict reconciliation before its branch is current with the feature baseline.

## M1 #83 merged baseline and current M9 verification — 2026-10-23

This is the latest source-state record and supersedes the preceding merged-source matrix. GitHub reports the current `feature/agent-canary-3.0` tip as `7cd34454c4bd6aa7176e0e076f5333639e3ccd5d`. M1 PR #83 merged at 12:58:27 UTC. M9 now checks each merged module using its actual feature merge commit as the source root; the exact owner PR head remains separate provenance. The workflow fetches those owner heads and the composition test verifies both commit trees, including whether the owner tree is identical to the merged tree.

| Module / PR | M9 source root: actual merge commit | Owner PR head | Owner tree | Merge tree | Tree relation / status |
| --- | --- | --- | --- | --- | --- |
| M1 / #83 | `7cd34454c4bd6aa7176e0e076f5333639e3ccd5d` | `afd049246e027f414c6a53ee3e4355444718efd7` | `9d99965f0a7bf57d4a0714d241c6270e5c3148e9` | `9d99965f0a7bf57d4a0714d241c6270e5c3148e9` | MATCH; MERGED; exact PR-head hosted checks succeeded. |
| M2 / #37 | `49af6d3dd57d9f091c95f489ead27f4f03c941a9` | `db98c7d5d409aa390ef539c96a209d6daba8d793` | `e2c81e61a72ecc472a7988f26e0b2614d4995f0d` | `add5837de7426566e124756b052ad1686d6ed308` | DIFFERENT; MERGED. |
| M3 / #33 | `611f9fca14706a1110a1f0a39e8488f4ff28d2a9` | `96d688d725292092dfc4e7ba940e9edfa8354e1e` | `66a2baf3568aa65e5d5a423a8c215545a4293c39` | `66a2baf3568aa65e5d5a423a8c215545a4293c39` | MATCH; MERGED. The package includes the M2 facade, omits the M5 policy-router export, and has no `check:integrated-package` script; M9 does not call it a complete combined-package pass. |
| M4 / #34 | `d0f61987c2a06acb47a7187142bc303101af0ad4` | `721c25b9d0decd2e86ce3411ac8feb3e4cfbffc2` | `490c8629beb1c93f8c133c4adf5948fd58f71802` | `991354de1703fd0d72dac36f5c07c8369d12134f` | DIFFERENT; MERGED. |
| M5 / #47 | `f0e90c99033a6304748ac79fe106439ca4bd2e06` | `688f4bf4acd9a46a5bbaed622c71a64ef788e551` | `aa102e622a14abb5fc484f0a1ed777da289bc141` | `6c83bcb4ffe226bc3a52f5fcfac485c6b8324fdd` | DIFFERENT; MERGED; exact-source M2/M5 held-read composition currently fails as detailed below. |
| M6 / #38 | `a6f4a889ec16b4f2c78f91d630e657eea7319dbd` | `98a4833250434de905611ace71bfe8094554d417` | `cfcb8e59252860d975e97459a3e0d7ab7ddca258` | `bbb5eea8678ebfaaa1826bd529079cf16e6bdeda` | DIFFERENT; MERGED; independent product-level E4 remains NOT_VERIFIED (Issue #57 OPEN/P1). |
| M7 / #84 | `8689d8fbbcdded4735d0e5aa328805f398a2862a` | `a0b2968ca18bf4264ff93789abb65c1dc1c2e4cf` | `ed48c9630a2c083f8fed3781a8dd550ce84f119c` | `e1916366719310e1f912a6802bc3040df8fe512f` | DIFFERENT; MERGED. The current M7 package-smoke workflow adds reliability tests after the exact revision pinned by M2 CI; the package-policy implementation scripts remain byte-identical, and M9 runs the current M7 reliability regressions separately. |
| M8 / #40 | Historical scoped-test pin `84ee6a7a8d65706f694b7949e82fd8c83cc11523` | Current PR head `ba3f6feffcc191d8d526a6cd8e44cdb88c44bcd6` | — | — | OPEN/Draft/DIRTY with failed, cancelled, or skipped hosted checks. Current M8 candidate is NOT_VERIFIED; the historical pin covers only the narrow M6-reviewed test source. |

### Current review and composition blockers

- M1 accepted exact M3 Hook blobs at M3 head `27d4a20a20894c7b779edf68d8bf79685bc0e69b` in [Issue #72 comment 6347268881](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/72#issuecomment-6347268881); Issue #72 was later closed for that exact source. Current merged M3 tree `611f9fca14706a1110a1f0a39e8488f4ff28d2a9` has different blobs for `src/agent-hook.ts`, `test/agent-hook.test.ts`, and `security-lab/claude-native-hook.mjs`. The source and wrapper differences are comments, while the test file was reorganized. The historical hashes still match their reviewed commit, but the disposition does not extend to these current blobs: current M1-to-M3 status is NOT_VERIFIED pending a fresh M1 exact-blob review.
- The M9 canonical-copy parity regression remains FAIL. Current M1 canonical wrapper blob is `b7ed4aba70a597f4f63a05decc6de1b32f67372e`; the actual M2 #37 merge source `49af6d3dd57d9f091c95f489ead27f4f03c941a9`, M5 #47 merge source `f0e90c99033a6304748ac79fe106439ca4bd2e06`, M7 #84 merge source `8689d8fbbcdded4735d0e5aa328805f398a2862a`, and local M9 source all retain wrapper blob `d6f93249306b7966259cab463dd39475728ef338`. The first failing comparison is M2. M8 is not included in this byte-parity loop: its distinct wrapper blob `544b5eb76633469b7185c4ea77d85d7f1754393e` is separately accepted by M1 in [Issue #65 comment 6308270032](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/65#issuecomment-6308270032), and the M9 exact-blob test passes for that narrow adapter contract. This M9 failure concerns the canonical copies in M2/M5/M7/M9 versus the current M1 source; no Hook copy or security behavior was changed here.
- The exact-source M2/M5 positive held-read regression is FAIL / P1. M2 actual merge source `49af6d3dd57d9f091c95f489ead27f4f03c941a9`, [`execution-isolation/gateway-adapter/gateway-adapter.mjs`](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/49af6d3dd57d9f091c95f489ead27f4f03c941a9/execution-isolation/gateway-adapter/gateway-adapter.mjs), `createSecurityGatewayAdapter`, provides `resolve` and `verify` on `fileReadCapability`; its separate `executeRealTool` invokes M1's held-file read. M5 actual merge source `f0e90c99033a6304748ac79fe106439ca4bd2e06`, [`src/security-router.ts`](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/f0e90c99033a6304748ac79fe106439ca4bd2e06/src/security-router.ts) (`hasValidHeldFileRead`) and [`src/risk-policy.ts`](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/f0e90c99033a6304748ac79fe106439ca4bd2e06/src/risk-policy.ts) (`hasValidFileReadCapability`), requires `readFileWithCapability` on the injected provider. The M2 provider exposed to M5 does not supply that method, so the exact M9 positive control receives `DENY / path_execution_not_pinned` instead of `OBSERVE_ONLY`. The owners must reconcile the shared provider contract; M9 does not accept the denial as successful composition and does not modify either module.

Two other failures from the first run used M9 assertions that described PR owner trees instead of actual merged trees; those assertions are now aligned without weakening module checks:

- The M6 export assertion now expects the actual M6 merge tree's pre-existing M2 `./gateway-adapter` export and verifies it matches the exact M2 merge package. The M6 verifier and schema exclusion from the npm package remain asserted and passed.
- M2's CI refers to M7 reusable workflow commit `167ebe81b76cc434facdaa3ddc62b42b9843951a`. That commit is in the exact M7 PR owner history but is not an ancestor of the actual M7 merge commit. M9 now checks that provenance in the owner PR history, reads the exact pinned workflow, compares the package-policy script blobs with the actual M7 merge tree, and checks the current M7 reliability step. All these checks passed; none were skipped.

### Local verification and limits

- `npm run build` passed in the M9 worktree and exact merged-source roots M1 `7cd34454c4bd6aa7176e0e076f5333639e3ccd5d`, M2 `49af6d3dd57d9f091c95f489ead27f4f03c941a9`, M3 `611f9fca14706a1110a1f0a39e8488f4ff28d2a9`, M4 `d0f61987c2a06acb47a7187142bc303101af0ad4`, and M5 `f0e90c99033a6304748ac79fe106439ca4bd2e06`. These local builds used existing M9 dependencies through validation-worktree junctions; they are not clean-install evidence.
- `node --import tsx --test test/m9-cross-module-composition.test.mjs` ran with actual merged source roots M1 `7cd34454c4bd6aa7176e0e076f5333639e3ccd5d`, M2 `49af6d3dd57d9f091c95f489ead27f4f03c941a9`, M3 `611f9fca14706a1110a1f0a39e8488f4ff28d2a9`, M4 `d0f61987c2a06acb47a7187142bc303101af0ad4`, M5 `f0e90c99033a6304748ac79fe106439ca4bd2e06`, M6 `a6f4a889ec16b4f2c78f91d630e657eea7319dbd`, M7 `8689d8fbbcdded4735d0e5aa328805f398a2862a`, and historical scoped-test M8 `84ee6a7a8d65706f694b7949e82fd8c83cc11523`: 16 tests, 14 passed, 2 failed, 0 skipped. The failures are canonical Hook-copy parity (M2 `d6f932...` versus M1 `b7ed4a...`) and the M2/M5 positive held-read composition (`DENY / path_execution_not_pinned`). M1-to-M3 review remains NOT_VERIFIED. Exact M8 accepted-adapter blob, M6 merged package export/exclusion, and M7 historical-workflow provenance checks passed.
- M7 package smoke passed against the exact M2 merge package (103 files). Selected M7 reliability/lifecycle test passed 1/1, and the four focused M7 worker/telemetry regressions passed 4/4. The M2 CI reusable-workflow pin `167ebe81b76cc434facdaa3ddc62b42b9843951a` remains an exact source in the M7 owner PR history, while its package-policy files are byte-identical to the actual M7 merge tree.
- PR #36 remains hosted at head `30fd82a305c0c7f1ba88715f0b4e9bd80566da4f`; the existing M9 local branch is at `87e2997c587929afbfb744ae57ade78ceaca86c1`, preserving its two local commits. The ordinary merge attempt at `8689d8fbbcdded4735d0e5aa328805f398a2862a` was aborted after 31 conflicts outside M9 ownership. The current feature tip `7cd34454c4bd6aa7176e0e076f5333639e3ccd5d` is therefore not merged into this M9 branch. Updated hosted M9 acceptance remains NOT_VERIFIED until coordinator-owned conflict reconciliation and an exact-head hosted run.

## Feature baseline synchronization candidate — 2026-10-23

The existing M9 branch was ordinarily merged with `origin/feature/agent-canary-3.0` at `7cd34454c4bd6aa7176e0e076f5333639e3ccd5d`. Merge commit `712cb5a320f20ce8aed384661fe88a61e71c3e46` and report commit `72dd92fe483c84d67c7b78dff1ccffac094b08b2` are local; no push or PR update was made.

### Conflict resolution map

All 31 merge conflicts were resolved to the current feature-side module implementation/test, except `package.json`, which retains that exact feature manifest and adds only M9's existing `test/m9-security-composition.test.ts` test registration.

- M0/shared baseline (3): `.gitignore`, `docs/3.0/API_CONTRACTS.md`, `package.json`.
- M5 (8): `POLICY_AUDIT_REPORT.md`, `docs/RISK_POLICY.md`, `src/policy-management.ts`, `src/risk-policy.ts`, `src/security-router.ts`, `test/policy-management.test.ts`, `test/risk-policy.test.ts`, `test/security-router.test.ts`.
- M6 (3): `docs/3.0/E4_TEST_MATRIX.md`, `security-lab/e4/verify-bundle.mjs`, `security-lab/e4/verify-bundle.test.mjs`.
- M6/M7/M8 shared E4 integration paths (2): `packaging/windows/auto-e4.mjs`, `test/auto-e4.test.mjs`.
- M7 (13): `.github/workflows/windows-community.yml`, `INSTALLER_ACCEPTANCE.md`, `RELEASE_READINESS.md`, `STABILITY_REPORT.md`, `packaging/windows/build.mjs`, `packaging/windows/e4-hook-faults.mjs`, `packaging/windows/installer.nsi.in`, `packaging/windows/prepare.mjs`, `packaging/windows/test-worker.mjs`, `packaging/windows/worker.mjs`, `scripts/verify-installer-template.mjs`, `test/reliability.test.mjs`, `test/windows-packaging.test.mjs`.
- M1 (1): `test/gateway.test.ts`.
- M3 (1): `test/runtime-console.test.ts`.

The final M9-only tree differs from the feature tip in these six paths: `.github/workflows/m9-cross-module-composition.yml`, `docs/3.0/M9_EXACT_SOURCE_COMPOSITION_2026-10-23.md`, `docs/3.0/M9_INTEGRATION_PLAN.md`, `package.json`, `test/m9-cross-module-composition.test.mjs`, and `test/m9-security-composition.test.ts`. No M8 candidate source was promoted. Nineteen old M8/public-experience paths from the M9 branch were restored to the current feature tree: `.github/ISSUE_TEMPLATE/bug_report.yml`, `.github/ISSUE_TEMPLATE/config.yml`, `.github/ISSUE_TEMPLATE/feature_request.yml`, `.github/ISSUE_TEMPLATE/product_feedback.yml`, `.github/pull_request_template.md`, `COMPATIBILITY.md`, `CONTRIBUTING.md`, `E4_EVIDENCE_INDEX.md`, `GETTING_STARTED.md`, `README.md`, `README.zh-CN.md`, `RELEASE_NOTES_DRAFT.md`, `SECURITY.md`, `SECURITY_TESTING.md`, `SUPPORT.md`, `THIRD_PARTY_NOTICES.md`, `UPGRADING.md`, `USER_TEST_PLAN.md`, and `scripts/check-docs.mjs`.

M9's old `test/ai.test.ts` delta was also restored to feature. Its prior M9 commit `4f31bab` added only failure-context request-count and allowlisted provider error-code diagnostics to a single-provider 503 retry fixture. The historical M0 routing record assigned those diagnostics to M9 under Issue #54, but the test is not an M9 cross-module composition regression; no AI provider or transport implementation is owned by M9. The old Windows Node 22 trigger remains UNKNOWN, and this merge does not claim to diagnose it.

### Candidate validation

- `npm run build`: PASS.
- `node --import tsx --test --test-reporter=spec test/m9-security-composition.test.ts`: 4/4 PASS.
- Exact-source M9 composition with M1 `7cd34454c4bd6aa7176e0e076f5333639e3ccd5d`, M2 `49af6d3dd57d9f091c95f489ead27f4f03c941a9`, M3 `611f9fca14706a1110a1f0a39e8488f4ff28d2a9`, M4 `d0f61987c2a06acb47a7187142bc303101af0ad4`, M5 `f0e90c99033a6304748ac79fe106439ca4bd2e06`, M6 `a6f4a889ec16b4f2c78f91d630e657eea7319dbd`, M7 `8689d8fbbcdded4735d0e5aa328805f398a2862a`, and historical scoped M8 `84ee6a7a8d65706f694b7949e82fd8c83cc11523`: 16 total, 14 passed, 2 failed, 0 skipped. The failures remain unmodified: canonical Hook byte parity (M2 `d6f93249306b7966259cab463dd39475728ef338` vs M1 `b7ed4aba70a597f4f63a05decc6de1b32f67372e`) and the positive M2/M5 held-read returning `DENY / path_execution_not_pinned` instead of `OBSERVE_ONLY`. The latter remains the P1 blocker described above.
- The full staged `git diff --check` reports trailing whitespace in three incoming feature-owned reports (`docs/3.0/E4_GITHUB_PRODUCT_ARTIFACT_AUDIT_2026-10-22.md`, `docs/3.0/M1/HOOK_ISSUE_32_DISPOSITION.md`, and `docs/3.0/M6_E4_INDEPENDENT_ACCEPTANCE_AUDIT.md`). These files match the feature source and were not modified by M9. The M9-only delta is checked separately before commit.
- The ordinary merge was committed locally as 712cb5a320f20ce8aed384661fe88a61e71c3e46 (parents: M9 55e8a230bb219633d2988cf1d272b4d75e2c48d3, feature 7cd34454c4bd6aa7176e0e076f5333639e3ccd5d). It has not been pushed. No failure assertion was deleted, skipped, or weakened.

## Issue #88 P0 — M2 Hook reason-output regression

The exact merged M2 source is `49af6d3dd57d9f091c95f489ead27f4f03c941a9` (M2 owner head `db98c7d5d409aa390ef539c96a209d6daba8d793`); its `security-lab/claude-native-hook.mjs` blob is `d6f93249306b7966259cab463dd39475728ef338`. The current M1 canonical Hook blob is `b7ed4aba70a597f4f63a05decc6de1b32f67372e`. M2's npm `files` allowlist does not include `security-lab/claude-native-hook.mjs`, so the new regression explicitly exercises a byte-identical copy of the exact M2 source-tree Hook in a disposable fixture; it does not claim that this Hook is present in M2's npm tarball.

The M9-owned test invokes both exact M1 and M2 Hook copies with synthetic `allow`, `deny`, and `ask` decisions and a distinct reason canary for each. It asserts that decisions stay unchanged and that each canary is absent from stdout, stderr, and JSONL. The M1 canonical control passes. Against M2 `49af6d3`, all three decisions are preserved and JSONL/stderr stay clear, but all three synthetic reason markers appear in stdout. The new test therefore fails with direct evidence for P0 #88; the test does not change M2 behavior or lower any security assertion.

The exact-source M9 composition suite now has **17 tests: 14 passed, 3 failed, 0 skipped**. The three failures are the existing canonical Hook byte mismatch (M2 `d6f932...` versus M1 `b7ed4a...`), the new Issue #88 P0 stdout-leak regression, and the existing M2/M5 positive held-read composition returning `DENY / path_execution_not_pinned` instead of `OBSERVE_ONLY` (P1). No failing assertion was removed, skipped, or weakened. `npm run build` was rerun after this test-only addition and passed; the new composition run used a freshly packed M2 merge tree `49af6d3` installed into a disposable consumer.
## Current exact-head hosted result — 2026-10-23 15:25–15:30 UTC

M9 PR #36 head 0d3beaa9dae5a33cb3e0a4dbfa50a6c8f9a71de5 completed composition run 39978172198 with FAILURE on Ubuntu and Windows. Both exact-source jobs ran 20 tests: 15 passed, 5 failed, 0 skipped. The report-only M9 commit did not change the composition workflow or test source from code head 4cc4565a46c4fb760d891f00a11431a8afd666e3.

The same five assertions fail on both platforms:
1. Pinned M2/M5/M7/M9 Hook copies differ from the current M1 canonical blob.
2. P0 Issue #88: M2 Hook synthetic caller-controlled reason canaries appear on stdout for allow, deny, and ask.
3. M3 Hook source differs from the current M1 canonical blob.
4. P0 Issue #89: M3 Hook synthetic reason canaries appear on stdout for allow, deny, and ask.
5. P1 Issue #87: the registered M2/M5 held-file positive read returns DENY / path_execution_not_pinned instead of OBSERVE_ONLY.

Current M8 PR #40 source was included in this workflow and its dedicated test step passed. The separate CI run 39978172153, Windows Community wrapper 39978171989, and AC3 coordination run 39978254905 passed. Issues #87, #88, and #89 remain OPEN; current M8 shared-test disposition #59 and current M3 exact-file review #72 remain OPEN. Product acceptance #52 and independent E4 #57 remain NOT_VERIFIED and are separate from synthetic composition.

A local worktree audit at 2026-10-23 16:22 UTC found no owner implementation repair for these failures: M2 remains clean at db98c7d; M3 has only a test commit and uncommitted test change; M5 and M6 have only test-only commits. M0 did not edit M1-M8 implementation. Keep M9 OPEN/Draft until owners fix and review their owned changes and exact-source composition passes.
## Current exact-head hosted result — 2026-10-23 16:28–16:31 UTC

M9 PR #36 current head a2f478864250c0ec1bc79866074ce855bfba38ae is report-only. The exact-source run 39986788529 completed FAILURE on both Ubuntu and Windows. Each platform ran 20 tests: 15 passed, 5 failed, 0 skipped. The same five failures remain:
1. M2/M5/M7/M9 Hook copies differ from M1 canonical.
2. P0 #88: M2 caller-controlled reason canaries appear on stdout for allow, deny, and ask.
3. M3 Hook differs from M1 canonical.
4. P0 #89: M3 caller-controlled reason canaries appear on stdout for allow, deny, and ask.
5. P1 #87: registered held-file read returns DENY / path_execution_not_pinned instead of OBSERVE_ONLY.

Both OS jobs passed the exact M1 held-Gateway, M3 build/focused onboarding, M5 policy, M6 Auto E4 lifecycle, and current M8 PR #40 dedicated steps; only the final M9 composition regression step failed. For this head, CI 39986788654, Windows Community wrapper 39986788596, and AC3 coordination runs 39986788527 and 39987253619 passed. The failing assertions and denial controls remain intact. Current M8's exact PR checks remain green, while #59 and #72 owner dispositions remain open.

No code-source change was included in a2f; the result confirms the five blockers on the report-only rerun. M9 remains OPEN/Draft.

## Refreshed exact M2/M5/M6/M7/M8 candidate composition — 2026-10-24 01:19 UTC

This local run used M9 `f8d4244fbbe8793dfec54202110cb4b4ab815e63`, M1 baseline `7cd34454c4bd6aa7176e0e076f5333639e3ccd5d`, M2 PR #91 `26cdb8781e57a05f57362e3078d77ce18614481c`, M3 PR #90 `0ebc49a3e688e10ffa643dd9275bd12cc31c13a9`, M4 PR #98 `892d3290338fe811da127f8f51ab91de0b9fc18b`, M5 PR #94 `cca42cd1762f995e92454d55ffa5e63951e39144`, M6 PR #100 `dbebc961ebde25433cf216da2c41d6b082b4be2e`, M7 PR #96 `e18b9d377905c79efd584993e84a55d48ff3891b`, historical M8 provenance `84ee6a7a8d65706f694b7949e82fd8c83cc11523`, and current M8 PR #40 `90fcde07775d4109f6e1b1b4b52d1975723dd979`.

The full M9 exact-source composition passed **20/20 tests** after reproducing the workflow's M2 package path: M2 was built, packed with `npm pack`, and installed into an isolated consumer using `--ignore-scripts --no-audit --no-fund`; both `M2_PACKED_ROOT` and `M2_CONSUMER_ROOT` were set. All workflow review-evidence variables were also supplied. The separate M7/M8 offline Community gate passed **2/2** against those exact candidate heads. The M9 TypeScript build, `node --check test/m9-cross-module-composition.test.mjs`, and `git diff --check` passed. M6's exact-source Auto E4 plus receipt-verifier owner tests previously passed **44/44** at the same M6 SHA.

The former M6 export false alarm is resolved without requiring an exact two-key set: the exact M6 candidate has the coordinated four entries `./sdk`, `./gateway-adapter`, `./policy`, and `./policy-router`; M9 asserts the SDK and Gateway mappings against M1/M2 and the additive policy mappings against M5. It still asserts that the E4 verifier is checkout-only and excluded from the npm package. The brittle 2/193 historical line-subsequence comparison is now a nine-scenario Auto E4 checklist: each reviewed scenario remains discoverable in the current M6 test body with its relevant safety assertions. The historical M6 fixture blob check remains exact, all **318 lines of the exact M6 candidate test file** are left intact, and no failure assertion or safety policy was removed.

The historical M8 source and current M8 candidate are intentionally distinct. Historical M8 `84ee6a7` retains Hook blob `544b5eb`; current M8 `90fcde0` carries the M1-canonical Hook blob `b7ed4ab`. The historical raw-byte provenance test reads both the Hook and `build-contract.mjs` from the pinned historical commit and asks Git for that commit's EOL attribute, preserving byte-for-byte evidence without confusing the current checkout with historical source. Current-candidate checks remain separate.

M7's exact current Community builder is compatible with current M8's Issue #102 offline-demo fix. The M7/M8 gate confirms M8's exact offline demo blob `3428f297c28845ae054c0ca63aa6c5c4d7ef785f` contains Guard rejection and post-quarantine safety assertions, and M7 PR #96 pins and stages that exact blob from M8. M7's repository copy is not treated as the source artifact; the builder fetches and records the separately pinned M8 source SHA/blob. The previous stale-copy concern is therefore not a current exact-candidate blocker.

These results are local candidate-composition evidence only. They do not represent hosted checks for a newly pushed M9 head, and do not convert historical scoped approvals into broader product acceptance. M9 remains OPEN/Draft until the refreshed commit is pushed and its hosted checks finish.

## M7 runtime-packaging candidate refresh — 2026-10-24 01:28 UTC

M7 PR #96 advanced from `e18b9d377905c79efd584993e84a55d48ff3891b` to local owner commit `fcc205d56bd4d59adf765b51c7eff7aa50d02ed0` (tree `8e492896eebe016dba9a48a23a3a401ef17ecb9a`). M9 now pins that exact commit in its source matrix, workflow checkout, exact-head guards, Community offline gate, and candidate/tree provenance. The commit descends from e18b9d3. M9's exact M7 runtime gate locks all 37 Community JavaScript paths, rejects a missing or extra `.js` file and missing `sdk.d.ts`, checks the builder's inventory validation, and preserves the same negative controls in M7's owner test source. The source runtime contract blob is pinned as `d8e03e4d697930ed87eb979a8ae3b611cd888a24`. CI now runs the complete exact-head `node --test test/windows-packaging.test.mjs` suite as well as the existing focused regressions.

Local validation used a clean detached checkout materialized from the local M7 `fcc205d` commit because the owner worktree contains unrelated uncommitted workflow edits and an untracked fixture; those owner-worktree changes were left untouched. With the locally installed CPython 3.11.15 supplied explicitly, the full M7 Windows packaging suite passed **25 tests, 0 failed, 1 platform skip** (Windows symlink privilege is not assumed). Its offline source-fetch check used a temporary local bare mirror containing the already checked-out exact M8 PR #40 object `90fcde07775d4109f6e1b1b4b52d1975723dd979`; direct GitHub fetch stalled in this environment, so this local test does not claim live GitHub reachability.

Against M7 `fcc205d` and the unchanged exact M1–M6/M8 roots, M9's offline Community composition passed **2/2** and the full M9 exact-source composition passed **21/21**, including the M2 packed consumer roots and all review-evidence variables. The new M9 runtime-contract test passed as part of the composition. Hosted checks for the fcc205d source are not yet available; M9 remains OPEN/Draft and the refresh is committed locally without pushing.

## M7 exact-head refresh — 2026-10-24 01:39 UTC

GitHub PR #96 was re-read at head `bfff4e786c215dcf4a36cad41fb5ea08900d14a4`, tree `324da33a8a5f788f79b5f2ae8cd69e6655e13eb2`, directly descended from the previously pinned M7 head `fcc205d56bd4d59adf765b51c7eff7aa50d02ed0`. The owner change is limited to `test/windows-packaging.test.mjs`: the Windows build-contract test now skips on non-Windows platforms. M9 updates its current M7 owner/tree/source-base/PR provenance and exact checkout, test guards, and offline composition pin. No M7 source or package manifest/lock was edited.

Local validation against a clean detached checkout of exact M7 `bfff4e7`:
- `npm run build` passed; `node --test test/windows-packaging.test.mjs` passed **25**, failed **0**, skipped **1** because Windows symlink privilege is not assumed; `npm audit --audit-level=high` found **0 vulnerabilities**.
- `npm run pack:check` against exact M2 PR #91 `26cdb8781e57a05f57362e3078d77ce18614481c` passed with the candidate's **103 files**.
- M9 M7/M8 offline Community source composition passed **2/2**; full exact-source M1–M8 M9 composition passed **21/21** using the M2 packed consumer and all existing review-evidence variables.
- Exact M6 bundle verifier suite passed **29/29** and the complete Auto E4 suite passed **15/15**. M6 export and Auto E4 assertions remain unchanged.
- M9 `npm run build` and `git diff --check` passed.

The M7 packaging regression's source-fetch check stalled when it attempted direct GitHub access locally. The passing local rerun used a temporary bare mirror populated from the exact current M8 PR #40 checkout and a process-scoped Git URL rewrite; it validates exact SHA/blob staging locally, not live remote fetch reachability. Hosted M9 checks for the refreshed M7 pin have not run because this M9 update remains local and unpushed.

The previously observed M9 candidate lockfile audit blocker remains open: hosted `npm audit --audit-level=high` reported **2 high and 3 moderate** vulnerabilities against M9's stale candidate lock. The exact M7 lock audit is clean, but M9 has not substituted or edited the M7-owned lockfile and has not relaxed the audit threshold. Resolve only when the owner lock update is incorporated into the integration candidate.


## M7 hosted-head refresh — 2026-10-24 01:57 UTC

GitHub PR #96 advanced to exact head `40d024fb6089cd72a186107912bd6baed824f301`, tree `23297aabffb18665fe3cc62af47746a1a28922d1`, directly descended from the previously recorded `bfff4e786c215dcf4a36cad41fb5ea08900d14a4`. M9 updates only its current M7 checkout ref, exact-SHA guards, current-candidate commit/tree/source-base provenance, and the M7/M8 offline composition expectation. Historical M7 merge provenance is unchanged. The refresh preserves the exact 37-path runtime contract and the `sdk.d.ts` presence gate.

Local validation against the exact M7 40d source and current M8 PR #40 head `90fcde07775d4109f6e1b1b4b52d1975723dd979`:
- Full M9 exact-source composition passed **21/21**, with the workflow's packed M2 consumer roots and all review-evidence variables supplied.
- M9 M7/M8 offline Community composition passed **2/2**, including the M8 Guard rejection source and M7 pinned-blob compatibility assertion.
- M7 `npm run build` passed; complete `node --test test/windows-packaging.test.mjs` passed **25**, failed **0**, skipped **1** (Windows symlink privilege is unavailable); M7 high-severity npm audit found **0 vulnerabilities**; M7 pack check against exact M2 completed with **103 files**.
- The source-fetch test used a temporary local bare mirror populated from the exact M8 PR #40 object after direct GitHub fetch stalled locally. This proves local exact SHA/blob staging, not live GitHub fetch reachability.

This is local evidence only: the M9 pin refresh has not been pushed, so there is no hosted M9 result for this head. The existing M9 candidate lockfile audit blocker remains unchanged (the earlier candidate audit reported 2 high and 3 moderate vulnerabilities); no owner lockfile was copied or changed and the audit threshold remains intact. M9 remains OPEN/Draft pending owner/base integration and hosted checks.


## Live M7/M8, M9 hosted checks, and feature baseline — 2026-10-24 02:05 UTC

Current GitHub refs were verified directly:
- M7 PR #96 is OPEN/Draft at `40d024fb6089cd72a186107912bd6baed824f301` (tree `23297aabffb18665fe3cc62af47746a1a28922d1`). Required current-head hosted checks, including Ubuntu/Windows wrapper regressions and Windows Community build evidence, are green; installer lifecycle remains skipped.
- M8 PR #40 is OPEN/Draft at `90fcde07775d4109f6e1b1b4b52d1975723dd979` (tree `6c2c96e46bf19cac2ac7154cbfd4efc9ee27e82f`).
- M9 PR #36 still points remotely to `4cfd6734a080b07461aa99d724d917f6cea8e8d3`. The current M9 local commit is `84eb7a9bc8090b8a069ca7a73bb9629c5cfdc234`, an unpushed child of that remote head.
- The live `feature/agent-canary-3.0` head is `051c5cfacaeb57a8d3075c9267dadcaa52632326`. Since M9's merge base `7cd34454c4bd6aa7176e0e076f5333639e3ccd5d`, four feature commits are absent from the local M9 branch: M3 #90 `e850cfbbf239efd5070b4e35018c859951371625`, M2 #91 `ed443094987a86fe411231b527fa4116ae784951`, M5 #94 `f1216a6f41d744a9841bf20232f689a1706e8e43`, and M4 #98 `051c5cfacaeb57a8d3075c9267dadcaa52632326`. M9 has not replayed this baseline while M7 remains unmerged.

Issue #99's source adaptation is present in the current exact M8 candidate: M7 `40d024f` and M8 `90fcde0` have the same `packaging/windows/build-contract.mjs` blob `cd39752ecbbd88849a365dea210e242ba90ca786`. M8's `prepare.mjs`, `build.mjs`, and owner tests select `security-lab/claude-native-hook.mjs` through the allow-listed `sourcePath` adapter and retain the M1 canonical blob/SHA checks. M9 asserts exact M7/M8 build-contract blob equality, and its local current-source exact composition passed **21/21** with the M2 packed consumer and review evidence; the M7/M8 offline source gate passed **2/2**. M9 build passed. However, Issue #99 remains OPEN: the latest PR #40 comments do not record an M8-owned #99 coordination disposition, and current M9 Ubuntu/Windows hosted composition has not run on the refreshed local head.

The latest hosted M9 run available is `40050059398`, attached to remote M9 head `4cfd673` and its older M7 pin `fcc205d56bd4d59adf765b51c7eff7aa50d02ed0` (M8 candidate pin `90fcde0`). Windows completed the full composition job successfully. Ubuntu failed earlier in M7's full packaging suite at test 3: the stale fcc205d test expected `NODE_CHECKSUM_MISMATCH`, but the build contract rejected the non-Windows platform with its usage error; the remaining M9 composition steps were skipped. The refreshed M7 `40d024f` test explicitly skips that Windows-only invocation on non-Windows, but this fix has not yet been exercised in an M9 hosted matrix because the local M9 refresh is unpushed.

The same remote head's Windows Community wrapper run `40050059270` fails on `npm audit --audit-level=high` on both Ubuntu and Windows due to **2 high and 3 moderate** dependency advisories in the stale feature-baseline lock. The audit threshold remains unchanged and the M7-owned lockfile remains untouched; track resolution through Issue #97. No M9 push, M7/M8 source edit, feature-baseline replay, or issue update was made in this check.

## Feature baseline sync after M7 merge — 2026-10-24

M7 PR #96 was squash-merged into `feature/agent-canary-3.0`; the verified feature head is `e903e5c174084b71d97982f6d7da042c1a552294`. M9 started this sync at `b003e5988b58ea0a1d6ee3beb107bd08a2097728`, whose merge base was `7cd34454c4bd6aa7176e0e076f5333639e3ccd5d`. The M9 branch now contains a local merge commit with the feature head as its second parent; the merge had **zero conflicts**. Relative to the new feature head, the only M9-owned paths are `.github/workflows/m9-cross-module-composition.yml`, `docs/3.0/M9_EXACT_SOURCE_COMPOSITION_2026-10-23.md`, `docs/3.0/M9_INTEGRATION_PLAN.md`, `package.json`, `test/m9-community-offline-composition.test.mjs`, `test/m9-cross-module-composition.test.mjs`, and `test/m9-security-composition.test.ts`.

The M9 exact-source refs remain M7 PR #96 `40d024fb6089cd72a186107912bd6baed824f301` and M8 PR #40 `90fcde07775d4109f6e1b1b4b52d1975723dd979`; the historical M8 review source remains a separate provenance pin. The pre-sync M9 head `b003e59` hosted Ubuntu and Windows exact-composition checks passed. Its wrapper audit still fails on the stale feature lock (**2 high, 3 moderate**); the exact M7-owned lock audit passed. These hosted results apply to `b003e59`, not the local baseline-sync merge.

Local validation of the merged worktree: `npm run build` passed and `git diff --cached --check` passed. This sync is local and unpushed; no M1–M8-owned source was edited. Hosted checks for the synced M9 tree are still pending.

## 2026-10-24 11:03 Asia/Shanghai — stable M8 source pin and refreshed M9 matrix

- M7 follow-up candidate `37034a971d00477a8aa3d57f34773c125939ec92` keeps immutable reviewed M8 source commit `24b8651730d57d860ba136e77db1526031abb1fc`; its workflow and builder separately validate that the fetched current PR #40 head descends from the pin and carries the same exact demo blob `3428f297c28845ae054c0ca63aa6c5c4d7ef785f`. Candidate provenance records both commits and blobs. This removes the self-invalidating requirement to make the M7 pin equal the latest PR head after baseline synchronization.
- M9 exact-source refs are refreshed to M1 `f18f1deec15b81f0d61ef18dbf0f91f50acef1b6`, M6 `7e263867979e5b52044febd64ed785ad6b192e82`, M7 `37034a971d00477a8aa3d57f34773c125939ec92`, and M8 current candidate `39c8048f93118657e13a7f37eabafa756aa25f94`; historical merged-source and M8 review provenance remains separately pinned.
- Local exact-source M9 composition passed **21/21** against the refreshed module roots. M7/M8 offline source gate passed **2/2**. `git diff --check` passed. M7 packaging checks passed 24 with 1 permission-dependent symlink skip; the candidate-build portion could not run locally because Python is unavailable. Exact-head hosted CI is required after the coordinated push.
- These tests are source/package fixtures. They do not establish real product-host consumption, OS-atomic TOCTOU, independent product E4, or installed clean-VM lifecycle acceptance. Issues #52, #57, and #93 remain open pending their distinct evidence; no security threshold was weakened.

## 2026-10-24 11:27 Asia/Shanghai — M7 merge and M6/M8 candidate refresh

- M7 source-contract PR #104 (`37034a971d00477a8aa3d57f34773c125939ec92`) was merged into `feature/agent-canary-3.0` as `eb78dcef6eb1bd501606244771880bb41d6f0b43`. PR #24 remains OPEN/Draft on its unchanged release-readiness base; its head follows the shared feature branch. No main merge or Release occurred.
- The M6 #100 branch was synchronized to that feature head at `2975f3fc88929cacf268e80a503667b440ea519a` (tree `c1cae38a069255f346b85c8e9ec708c56e91e16c`); M8 #40 at `3e68383b2063d5a9224cb15a67eea2777d4539df` (tree `b2fcbd8f8bf5e4bafca3a44a8a65d6d5cdadbc90`). M9's local feature sync is `75efe2a13bb85901ef1fd65cb889f881912f0860`; exact-source workflow and tests now pin those current M6/M8 candidate heads while retaining M7's immutable `37034a9` candidate and the separate reviewed M8 source pin `24b8651`.
- Local M9 `npm run build` passed and the exact M7/M8 offline-source composition gate passed **2/2**. On this Windows host, the focused packaging suite in each M6 and M8 worktree reported **24 passed, 1 failed, 1 skipped**; the single failure is an environment prerequisite stating the required Python runtime is unavailable, and the skip is the permission-dependent symlink case. No test or security condition was weakened. Exact hosted checks are required after publication.
- This snapshot does not resolve first-party host/TOCTOU Issue #52, independent product E4 Issue #57, or M7 installer-lifecycle Issue #93. The installer-lifecycle job on #104 was skipped, so no clean-VM lifecycle acceptance is claimed.

## 2026-10-24 12:04 Asia/Shanghai — exact M1/M8 candidate refresh

- M1 PR #101 is now published at `47501fc090ee67f7f96d84d231c7ce7cc70379cd`. Its Windows Gateway regression uses an asserted hard-link replacement race against the held descriptor; the test does not claim OS-level atomic path/open/read. Current PR checks pass on Ubuntu, macOS, and Windows Node 20/22, and Windows Community build/wrapper checks pass; installer lifecycle remains skipped.
- M8 PR #40 is published at `60cfe8d976a42d0f635d4be93ca24c00e81246d5`. Its hosted checks pass, including both Hook output runtimes and Windows Community build/wrapper checks; installer lifecycle remains skipped. The exact M8 candidate `test/auto-e4.test.mjs` blob is `d1705c204ef3f511ee4828e90b35731b36f92238`; M9's former `607c1c0` expected blob was stale and has been replaced with the exact current candidate blob while keeping the M6 owner-disposition assertion open.
- M9 now pins exact M1 `47501fc` and M8 `60cfe8d` candidates, and checks their trees/blobs. With M2–M5 built at their pinned SHAs and the exact M2 package packed and installed into an isolated consumer, local M9 exact-source composition passed **23/23** and the M7/M8 offline Community gate passed **2/2**. M9 `npm run build` and `git diff --check` passed.
- The local runs used the M9 worktree at `8186ca5` with the pending M9 source-pin diff; the M9 change is not yet published, so no hosted result applies to this refreshed matrix. PR #36's latest green hosted composition still pins the older M8 `3e68383`; rerun both Ubuntu and Windows jobs after publishing the refreshed M9 head.
- Issues #52 (product-host identity/TOCTOU), #57 (independent product E4), #80 (M6 owner disposition for E4 semantics), #93 (clean-VM install lifecycle), and #99 (current exact M8 composition plus owner disposition) remain OPEN. Passing fixture/package composition does not close those environment or ownership gates. PR #24 and `main` remain untouched.
