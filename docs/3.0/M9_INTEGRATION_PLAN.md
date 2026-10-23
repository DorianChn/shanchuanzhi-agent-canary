# M9 最终集成计划

## 当前 exact-source composition 快照（2026-10-23）

- 当前 M1–M8 exact source pins、模块级覆盖、owner 审阅范围及证据限制见 [M9 exact-source composition snapshot](M9_EXACT_SOURCE_COMPOSITION_2026-10-23.md)。
- 当前 M9 exact-source pins 为 M3 #33 本地候选 `bfcf85e`、M4 #34 `721c25b`、M5 #47 `8bb14c6`、M6 #38 `98a4833`、M7 #39 `5a7540b`，其余 M1/M2/M8 详见 snapshot 表。M3 新候选尚未推送，故没有该 SHA 的 hosted CI；先前 M3 hosted CI `39919260164` 只覆盖旧 SHA `b8b471f3`，失败于 `approval expires with no actual callback` 中 `pending()[0].requestId` 为 `undefined`，未到达过期审批断言。M4 run `39919282220` 为 9/9 success，M5 run `39918480015` success。M9 本地精确组合 16/16 不能替代 M3 hosted CI。
- M1 PR #43 与 M2 PR #37 已合入 `feature/agent-canary-3.0`，merge commits 分别为 `f0b4ee800672c3b702fa6d48201f74642d724cc5` 与 `49af6d3dd57d9f091c95f489ead27f4f03c941a9`；M9 仍固定其精确模块源 heads `fa369069` 与 `db98c7d5`。合入共享基线不等于产品安全验收：Issue #52 仍 OPEN / P0 / NOT_VERIFIED；合成接口通过不代表 first-party product-host wiring、真实用户文件保护或 OS-atomic TOCTOU 已验收。
- PR #36 run `39920983998`（composition）、`39920984006`（CI）和 `39920984084`（wrapper）均成功，但它们来自旧 M6 `392a7c2`、M7 `97bb8de` pins，且 M3 pin 当时为 `b8b471f3`；不得用来证明当前 M3/M6/M7 pins 的 M9 hosted composition。新候选需等 M3 源提交先推送、再推送 M9 后触发并核对 hosted CI。

## M9 exact-source refresh：M6、M7 — 2026-10-23

- 本地 M9 分支 `feature/ac3-m9-integration` 起点与远端一致，为 `dddbdd48719b3075587f2dedca6eff76eff3c282`。已核对 M1–M8 的实际 PR #43/#37/#33/#34/#47/#38/#39/#40 heads；精确 SHA 和 owner CI 摘要见 [M9 exact-source composition snapshot](M9_EXACT_SOURCE_COMPOSITION_2026-10-23.md) 最新小节。
- M6 #38 新 head `98a4833250434de905611ace71bfe8094554d417` 将独立 E4 receipt 绑定 product-run identity；其 exact-head CI `39920790310` 和 wrapper `39920790439` 均成功。M7 #39 新 head `5a7540b0b041d10e6d562aa528f79a2cfdea987a` 刷新 product E4 provenance 文档；其 exact-head CI `39920944820` 和 wrapper `39920944771` 均成功。M6 修改 receipt schema/verifier，M7 仅修改 provenance 文档；M7 的 M6-conditional helper blob 未变化。
- PR #36 上一次 hosted composition `39920983998`、CI `39920984006` 和 wrapper `39920984084` 均成功，但工作流当时 checkout 的 M6/M7 仍为旧 SHA `392a7c24697fd8925e3022616aad054922efb38f` / `97bb8de315f2c19edbaa4d6536abc50876fecffd`。这些是旧 pin 的历史结果，不覆盖新 exact-source composition。
- 本轮仅修改 M9 workflow、M9 composition SHA map 与 M9 报告；新 exact-source roots 下 focused composition 为 16/16，`git diff --check` 通过。提交后由 M0 按五分钟批次统一推送；新 M9 hosted CI 结果待推送触发后记录。

## M9 M3 local-head refresh and M1/M2 merge record — 2026-10-23

- M9 exact M3 pin 已更新到 owner 本地候选 `bfcf85e7d1a6870973181b988f2e7b6aefdf5c37`；该 M3 提交尚未推送，当前没有该 SHA 的 hosted CI。M9 所需发布顺序是先让 M3 精确提交可从 GitHub checkout，再推送 M9 并核对新 hosted composition。
- M1 PR #43 已合入 base `feature/agent-canary-3.0`，merge commit `f0b4ee800672c3b702fa6d48201f74642d724cc5`；M2 PR #37 已合入同一 base，merge commit `49af6d3dd57d9f091c95f489ead27f4f03c941a9`。两个 PR head refs 未变，M9 exact pins 仍为 M1 `fa369069241bf81d32c7f39d31a61806efa55fe4`、M2 `db98c7d5d409aa390ef539c96a209d6daba8d793`。
- Issue #52 保持 OPEN / P0 / NOT_VERIFIED。M1/M2 合并及 M9 合成组合测试均不证明 first-party product-host wiring、真实用户文件保护或 OS-atomic TOCTOU。
- 上轮 published M3 `b8b471f3ceba9ec0ca9e270ac430f14d6a917e3b` 的 hosted run `39919260164` 失败，是历史 SHA 的 CI 结果。M3 新本地候选新增 fixed-probe denial controls；在此候选上运行 M9 focused composition **16/16 通过**。此局部组合不替代 M3 exact-head CI、产品宿主验收或外部 E4。

## M9 精确 head 与契约/风险复核（2026-10-15 00:38 UTC）

> GitHub API 只读核对；本节更新 M9/M0 的精确 head 与 checks。下方 00:18 UTC 快照现作为历史记录；本轮不重跑本地测试。

- PR #36 为 OPEN/Draft，base 为 feature/agent-canary-3.0（62496d4020bd90ba2eede49b2e80a2bbebb036b4），远端 head 与本地 M9 branch 一致，为 8f713a29356380f5c8ec6d4360a3579f323de315。该精确 head 的产品 CI run 38661011533 为 9/9 jobs success；Windows Community wrapper run 38661011554 为 2/2 jobs success。
- M0 PR #30 当前 head 为 e94f630038144c68aedb3ff5358c473e80dfc0f0，base 仍为 62496d4020bd90ba2eede49b2e80a2bbebb036b4。该 head 的根路径 API_CONTRACTS.md blob 为 0d51c4019ae292b34054398f1fc9dfa7fc24f594；M9 副本仍为 693d437856a2d879983de4fb16497090128aa1d9。通用兼容规则与从 TrustedExecutionGateway 起的接口语义正文在规范化换行后逐字相同；blob 差异位于协调/状态快照，未发现接口语义冲突。根路径 canonical 由 M0 所有，本轮未改写或 cherry-pick M0 文件/分支。
- GitHub issue 状态复核：#27、#32、#41、#45 为 OPEN，#48 为 CLOSED。仍按各 Issue 的有限范围处理；#32 Hook fixture 协调、#41 clean-VM HOLD、#45 Native Codex Shell UNPROTECTED 不因 M9 CI 通过而解除。外部独立 E4 仍为 NOT_VERIFIED。
- 未修改 M1–M8 代码、Issue/PR 文案或其他模块工作树；没有重新运行本地测试、没有推送或合并。

## M9 第二阶段本地集成验证（2026-10-15 00:26 UTC）

- 在 integration worktree、分支 feature/ac3-m9-integration 上验证候选 HEAD 9c7af262131a792aeb811a587b6e83e026ba4a20（父提交 6abd4da78f161577bff90a5d18fd0d3ec329fdd3）；开始前工作树干净、无未合并索引项。环境：Node.js v22.23.1、npm 10.9.8。
- 精确命令 npm run verify：退出码 0；tsc build 通过；npm test 共 399 项，393 pass、0 fail、6 skip；内含 npm run pack:check 通过，package smoke check 生成并检查 dorianchn-agent-canary-1.2.7.tgz（100 files）。
- 精确命令 npm run e4:test：退出码 0；12 项 pass、0 fail、0 skip。该命令只运行 node --test security-lab/e4/verify-bundle.test.mjs 的本地合成 bundle 校验测试，不构成 M6 owner signoff 或外部独立 E4 验收。
- 本轮没有运行真实模型、VMware、操作系统安装器或 clean-VM 测试。M6 owner signoff 仍未确认；外部独立 E4 为 NOT_VERIFIED；Native Codex Shell 仍 UNPROTECTED / 真实宿主验收 NOT_VERIFIED；clean-VM 安装、升级、卸载及取消回滚仍 NOT_VERIFIED。
- 验证结果对应上述产品候选 HEAD 9c7af262。本段只作为 M9 文档记录并在其后本地提交；该文档提交不在本次验证覆盖的 HEAD 上，且未推送，因此没有新的远端 CI 证据。PR #24、main、其他模块工作树和 Issue/PR 文案均未触碰。

## M6 本地 P1 修复状态（2026-10-15 00:29 UTC）

- M6 owner 在其现有分支报告了本地提交 4e397627c635b75a0e3b6384136d39d078802b72（父提交 ed82f06）：修复 verifier 接受一致伪造的 E4_VERIFIED 分类，以及 Auto E4 重跑覆盖既有证据两项 P1。
- M6 owner 报告的定向验证为 18/18；M9 未重跑该测试。保留 M6 owner 原始 run 输出/证据供后续审查与 CI 对照，M9 本次只记录摘要，没有复制、覆盖或删除该证据。
- 该修复提交尚未推送，远端 CI pending；本次仅更新 M9 所有的集成计划，没有 cherry-pick M6 代码。M6 owner signoff 仍未确认。
- 外部独立 E4 验收仍为 NOT_VERIFIED。M9 的 npm run e4:test 是本地合成 bundle verifier 测试，不能替代 M6 外部独立 E4，也不能据此将 E4 状态标记为 VERIFIED。

## M6 Hook fixture 候选与 exact-head 验收（2026-10-15 01:04 UTC）

- M6 owner 在原分支 `feature/ac3-e4-validation-ac3` 的候选提交为 `09084490bc17af13cd4589ebb344c7a46e2d0881`，父提交为 `4e397627c635b75a0e3b6384136d39d078802b72`。PR #38（Draft）已推送至该 head，base 为 `62496d4020bd90ba2eede49b2e80a2bbebb036b4`；该提交只修改 `test/agent-hook.test.ts`。M9 不直接 cherry-pick 或合入这项 M6 源改动。
- **ACCEPT（仅 manifest/API 兼容性）**：M6 candidate `package.json` blob `9981817e8d38f5ab3c015fcbe19f18852d5f459c` 与其父提交相同；M9 `package.json` blob 为 `6b3042bbe7ba5b14a904c7d04fca9a9011a47883`。双方 e4 脚本值一致：`e4:auto=npm run build && node security-lab/e4/run.mjs`、`e4:test=node --test security-lab/e4/verify-bundle.test.mjs`、`e4:verify=node security-lab/e4/verify-bundle.mjs`。M6 的 31 个 `npm test` 路径均包含在 M9 的 36 个路径中，且两边路径无重复。M0 PR #30 当前 head `bdad252960cb95c94ecb0612238f69f76273b69f` 的 canonical `docs/3.0/API_CONTRACTS.md` blob 为 `0d51c4019ae292b34054398f1fc9dfa7fc24f594`；M9 副本 blob 为 `693d437856a2d879983de4fb16497090128aa1d9`。E4 schema、证据链锚定及缺少证据不得判 PASS 等契约语义相同；blob 差异是状态快照漂移，不是接口语义冲突。此结论不代表运行时 E4 验收。
- **Hook fixture 暂不接入**：M6 candidate 的 `test/agent-hook.test.ts` blob 为 `d3b64fc265da5c24e45cbdd1c24abecc467c4a5d`；M9 当前 fixture 与 M1 PR #43 当前 head `a2206d3985db25adcbaad24ee9788c900ee5c2cb` 的文件 blob 均为 `6c2d8da18e1832bc738d141cd811b4b3f047756e`。Issue #32 仍 OPEN，故保留 M1 owner fixture，等待 owner 协调后再评估。M6 子进程夹具的 no-decision、no-output、termination 断言不计数或观察 native host callback。
- M6 owner 报告本地 Hook 定向验证 10/10、E4 定向验证 18/18；M9 未重跑。上述数字仅作为 owner 报告记录，保留原始 run 输出/报告供后续复核。
- PR #38 exact-head product CI run `38662965312` **失败**：Ubuntu Node 22 的 `npm test` 中 `four concurrent processes preserve every quarantine without lost writes` 报 `RETRY_LIMIT`，结果为 322 pass、1 fail、4 skipped；fail-fast 后 `package-smoke` 被跳过。失败位于 file-state-store 并发测试，而该 M6 提交只改 Hook fixture；当前证据不足以归因二者因果。Windows Community wrapper run `38662965329` 成功，2/2 jobs。PR #38 因 product CI 失败不能记为 exact-head CI green。
- Issue #27 与 #32 仍 OPEN。M6 owner signoff 尚未独立确认；native host callback 与外部独立 E4 仍为 `NOT_VERIFIED`；Native Codex Shell 仍 `UNPROTECTED`；clean-VM 安装、升级、卸载及取消回滚仍 `NOT_VERIFIED/HOLD`。上述 owner 本地测试、manifest 检查及 wrapper 结果均不替代这些验收，也不改变其状态。

## 历史 M9 集成快照（2026-10-15 00:18 UTC）

> 本节为 00:15–00:17 UTC 的历史 GitHub head/check/Issue/文件树快照。M9 与 M0 的较新精确 head/check 状态见上方 00:38 UTC 复核；其他 2026-10-14 记录亦为历史证据。CI 通过仅证明对应提交的自动化检查，不代表模块 owner signoff、跨分支组合验收或外部环境验收。

- M9 PR #36 为 OPEN/Draft，远端 head `6abd4da78f161577bff90a5d18fd0d3ec329fdd3`：产品 CI run `38620602632` 9/9，wrapper run `38620603071` 2/2。M0 PR #30 为 OPEN/Draft，head `68f3fa237464b68781d182e42ec8a854e29a4c05`：当前 checks 10/10，runs `38657007478`、`38657007532`。
- 当前模块 PR head 与各自 checks：

| 模块 | PR / head | 当前 checks | 与 M9 `6abd4da` 相比，源 PR 变更路径中 blob 不同的路径 |
| --- | --- | --- | --- |
| M1 | #43 `4b562bed` | 9/9，run `38620584097` | `SECURITY_REGRESSION_RESULTS.md` |
| M2 | #37 `0f2c10cb` | 9/9，run `38561262930` | `execution-isolation/codex/native-host-hook-evidence.json`、`execution-isolation/reports/NATIVE_SHELL_BYPASS_REPORT.md`、`test/agent-hook.test.ts` |
| M3 | #33 `d9364cc5` | 9/9，run `38555297535` | `ONBOARDING_TEST_REPORT.md`、`package.json` |
| M4 | #34 `69ec7f19` | 9/9，run `38555299339` | 无；其相对基线变更路径与 M9 blob 相同 |
| M5 | #47 `7d5df632` | 9/9，run `38617317812` | `POLICY_AUDIT_REPORT.md`、`package.json`、`test/agent-hook.test.ts` |
| M6 | #38 `ed82f061` | 9/9，run `38555297615` | `package.json` |
| M7 | #39 `4267c61b` | 11/11，runs `38596572179`、`38596572303` | `RELEASE_READINESS.md`、`STABILITY_REPORT.md`、`package.json`、`test/agent-hook.test.ts`、`test/gateway.test.ts`、`test/honeypot-runtime.test.ts` |
| M8 | #40 `139e7f27` | 9/9，run `38561307114` | `test/agent-hook.test.ts` |

以上 PR 均为 OPEN/Draft，base 为 `feature/agent-canary-3.0`。路径不同表示当前源 PR 与 M9 组合树的内容还不完全一致；`package.json` 是有意汇总的共享路径，其余报告/证据/测试差异仍按 owner 和下列契约门槛处理。此审计未修改 M1–M8 文件，也没有在此提交后重跑上述 CI。

### 契约、manifest 与未决验收

- M0 当前 canonical `docs/3.0/API_CONTRACTS.md`（M0 #30 head `68f3fa2`）blob 为 `0d51c4019ae292b34054398f1fc9dfa7fc24f594`；M9 当前副本 blob 为 `693d437856a2d879983de4fb16497090128aa1d9`。通用兼容规则及 `## TrustedExecutionGateway` 起的接口语义正文逐字相同（规范化换行后）；差异是顶部协调/PR/Issue 快照，不是接口语义冲突。M1 owner 文件 `docs/3.0/M1/GATEWAY_API_CONTRACT.md` 在 M1 #43 与 M9 中的 blob 一致。根路径 canonical 由 M0 所有，本轮没有改它。
- PR #36 与 PR #30 branches diverged，共同 merge-base 为 `62496d4020bd90ba2eede49b2e80a2bbebb036b4`（M9 ahead 99、behind 92）。M0 更新 API 快照的提交 `46557842` 与 `29514121` 同时修改多个 M0 协调文档；不应把 M0 分支或这些多文件提交整颗并入 M9。若需同步单一路径，应由 M0 owner 给出路径级更新并复核。
- M9 `package.json` blob 为 `6b3042bbe7ba5b14a904c7d04fca9a9011a47883`，包含 36 个不同的 `npm test` 路径；当前 PR manifest 中的测试路径及脚本名均已被 M9 汇总覆盖。保留 version `1.2.7`、CLI `bin`、`files`、`./sdk`，并包含 M5 `./policy` 与 M6 E4、M7 reliability 脚本。各模块 PR 均未改 `package-lock.json`。Issue #27 仍 OPEN，M6 owner 的字段签收与组合验收尚未记录；不能由 manifest 字段存在或 M6 独立 CI 通过替代。
- Hook fixture 仍需 owner 协调：M1 #43 与 M9 的 `test/agent-hook.test.ts` blob 为 `6c2d8da1`；M2/M5/M7/M8 为 `d3b64fc2`；M3/M4/M6 为 `1ecb3ee8`。Issue #32 仍 OPEN。M9 保留 M1 owner 版本；模块分支的独立绿色 CI 不表示这些共享路径已完成组合验收。
- Issue #28、#46、#48、#49 当前 CLOSED，均只限其记录的验收范围；Issue #32、#41、#45 当前 OPEN。M6 外部独立 E4 为 `NOT_VERIFIED`；Native Codex Shell 仍 `UNPROTECTED`，真实桌面宿主验证为 `NOT_VERIFIED`；clean-VM 安装、升级、卸载及取消回滚均 `NOT_VERIFIED`。M4 后端安全/E4 状态仍为 `UNKNOWN`。
- 本节记录的 M9 远端 head `6abd4da` 通过了其当时的 11/11 checks；本次计划文档更新尚未 push，也没有新 head CI。PR #24、`main` 与 Release 均未触碰。

## 历史快照：P1 #49 契约路径收敛（2026-10-14 16:56 UTC）

- M0 PR #30 head `a469e37` owns canonical root `docs/3.0/API_CONTRACTS.md`; current checks are 10/10.
- M1 PR #43 head `d26a0c3` keeps its Gateway/Guard contract under `docs/3.0/M1/GATEWAY_API_CONTRACT.md`; exact-head checks are 9/9.
- This M9 worktree replaces the old M1-only root file with the M0 canonical contract and preserves the exact M1 owner file under the M1 path. This revision changes documentation only; no M1–M8 source or tests were edited.
- GitHub PR #36 remains at remote head `ab382fe`; its previous 9/9 checks and 2/2 wrapper do not validate this revision. Keep Issue #49 OPEN until the branch is pushed and its current-head checks pass.

初始基线：`feature/agent-canary-3.0` `62496d4020bd90ba2eede49b2e80a2bbebb036b4`。本文件建立候选集成门槛和顺序；当前本地候选组合状态及限制见下方验收记录。这里的本地组合不表示源 PR 已通过评审或可以发布。

## 历史本地候选组合验收记录（2026-10-14）

- 从 M9 初始本地 HEAD `996073ad38aed23bf3c9f8e928857dcf5c6072bb` 开始，在现有 `feature/ac3-m9-integration` 分支按 no-ff 合入下表八个初始候选头，第一轮组合 HEAD 为 `845743d99f634ccdc7e17b43b2ab8c3993e2001b`；共同候选基线为 `feature/agent-canary-3.0` `62496d4020bd90ba2eede49b2e80a2bbebb036b4`。随后将 M2 后续本地候选 head `4875d84d71817f768d806954424e30df603fc287`（父 `558eccb9867d574a3fa0f39212a28913c6f57a85`）合入，M9 merge commit 为 `83d72684adefb01b0420b9be593de35bd11f2afd`；再将 M2 脱敏提交 `b38b1ab1286ab82027d7cdeb8144aa77dab0759c`（父为 4875d84）合入，M9 merge commit 为 `cd6deb0a8f08f0e47cdd27b1d7ab37d714ac24dc`。之后合入 M1 owner-side review 报告 tip `738a7838e7377290d4ed51da4e41f0a7d14e319b`（父 `56f55f77ebf7d1c45b015cba29a783658726d225`），M9 merge commit 为 `259553a97fe3aef0cd69e58144676b31192a861f`；此 M1 follow-up 只改报告文档。当前 M9 候选分支 HEAD 为 `259553a97fe3aef0cd69e58144676b31192a861f`。

| 模块 | 来源 PR | 候选 head | M9 本地 merge commit |
| --- | --- | --- | --- |
| M1 Security Core | #43 | f59ba37c2fd9d1b5e181e067f80981f8920ef16a（代码）；738a7838e7377290d4ed51da4e41f0a7d14e319b（基于 f59 的 owner review 报告 tip） | c474ff4f1b03168ec2623b5190868cef9797fa2a（代码）；259553a97fe3aef0cd69e58144676b31192a861f（报告 follow-up） |
| M5 Policy | #47 | cf4e2cdbedd0020e5b5132598af6f845a8214fc4 | 4f04a8a4b9ef6826ce805bfe1214b634463acb64 |
| M2 Execution Isolation | #37 | cb84f43b1b2bd30ec56ef784d2d35868aedae56e（初始）；4875d84d71817f768d806954424e30df603fc287（后续）；b38b1ab1286ab82027d7cdeb8144aa77dab0759c（报告脱敏） | 471a746eb8f21d47a72f885afbf0bb22475361b5（初始）；83d72684adefb01b0420b9be593de35bd11f2afd（后续）；cd6deb0a8f08f0e47cdd27b1d7ab37d714ac24dc（报告脱敏） |
| M3 Onboarding | #33 | 54facf027b32f3eef4a737e4cf51a3cbca9f4f63 | f17290fbc163ebab4805e7cb78c11eb2ddfd235f |
| M4 Desktop Center | #34 | f30119521e2a844233d276a62ed67c03687f6014 | 71cff82b263e13cd2b9cf9ad886d38d3830393df |
| M6 E4 | #38 | d513810ada9b4375e555d1799e8984ccb09bd1d4 | de0a11680d577b4b77ab68ed1fd5a87fb3974c20 |
| M7 Reliability | #39 | 5c7d95db6062118eaf90a5004b18f6ebe7c6b238 | 220ddf303fdb69f25be494a2dc67ce44ce92c5cc |
| M8 Open Source | #40 | b0f30ff1b677a7bbaabcf4e9322f751cd1025135 | 845743d99f634ccdc7e17b43b2ab8c3993e2001b |

- 初始 M3 与 M7 仅在 package.json 的 test 脚本发生冲突；在 M9 集成分支做了加法式合并，保留双方测试入口及已有 M5/M6/M7 脚本。后续 M2 commit 4875 只触及 execution-isolation 自有路径，没有 manifest 冲突；M2 b38 与 M1 738a follow-up 仅改报告文档。没有手改 M1–M8 产品实现或测试断言；package-lock.json 未变。
- 在功能组合 HEAD `83d72684adefb01b0420b9be593de35bd11f2afd` 上运行 `npm run verify`，退出码为 0：TypeScript build 通过；npm test 共 397 项，391 通过、0 失败、6 项因平台/环境条件跳过；Windows WinForms launcher 检查仅编译、通过。verify 内的 `npm run pack:check` 通过，生成含 100 个文件的 `dorianchn-agent-canary-1.2.7.tgz`，并对临时 npm 包运行类型检查、CLI help 和 self-test。输出日志：`/tmp/m9-verify-4875d84.log`。之后 M2 b38 与 M1 738a 均为报告文档变更；没有因这些文档变更重跑完整 verify，因此该统计对应功能组合 HEAD 83d，而不是当前含报告更新的 HEAD 259。
- M2 专项协议测试（主 npm test 列表未包含此文件）通过；使用 Node.js v22.23.1 执行仓库相对路径 `node execution-isolation/codex/test-pre-tool-use.mjs`。结果确认合成事件拒绝、malformed event 拒绝、告警写失败仍返回 deny、原始命令未写日志；输出继续标记 `boundaryStatus=UNPROTECTED`、`nativeShellAcceptance=BLOCKED_NOT_VERIFIED`。日志：`/tmp/m9-m2-hook-4875d84.log`。该协议测试没有调用真实宿主 Shell。
- 合入并更新本计划后，node scripts/check-docs.mjs 复核通过：14 份文档、55 个本地链接、13 个代码示例、4 个 Issue 模板。没有运行 VMware、真实模型或操作系统安装测试。
- 默认 WSL Git 曾因 CRLF 归一化差异将全树路径显示为已修改；未改写、清理或重置工作树。本轮开始时使用 `GIT_OPTIONAL_LOCKS=0 git -c core.autocrlf=true status --short --branch` 核对，HEAD 为 `259553a97fe3aef0cd69e58144676b31192a861f`，仅本 M9 计划文档有待提交改动。
- 这仍是本地候选组合，不把 Draft 源 PR 标为验收完成。M2 follow-up `b38b1ab` 与 M1 owner-report tip `738a783` 均未 push；没有针对这两项或当前组合 HEAD `259553a` 的远端 CI 证据。PR #24 与 main 未改变，本轮未 push。

### 尚未满足的 fail-closed 与外部验收门槛

- P0 #35 虽已关闭，其 M0 澄清仅覆盖同进程、同一 Guard、且遵守 AbortSignal 的 callback；不能推断为更广的宿主隔离保证。P1 #32 的 owner disposition 未完；此前 runner 归因仅为 PLAUSIBLE/未确认，根因仍 UNKNOWN。
- 最近一次只读状态核对时 P1 #27、#28、#32、#44、#45、#48 仍开放或未解决。#28 仍 OPEN 且阻塞组合验收：M1 owner report 记录的 Windows Node 22 定向测试为 51/51，证据基于 M1 代码 head `f59ba37`，不代表 M1+M7 CI。M7 owner audit 进一步确认，当前 M7 PR #39 分支不包含 M1 close/quarantine 提交 `f15fdcf` 与 `2276526`（二者共有基线 `62496d4`），且 M7 的 `src/runtime/gateway.ts`、`test/gateway.test.ts` 相对 M1 代码有实际差异；M7 报告正在纠正。待 M1 owner handoff 与 M7 branch integration 后，才进行组合验证；当前不得将 #28 标为已解决。M2 最新证据仍将 Desktop Native Codex Shell 标为 UNPROTECTED / BLOCKED_NOT_VERIFIED：候选 Hook 片段没有安装或确认加载/信任；没有执行真实 Desktop native Shell sentinel，也没有观察到宿主决策。M2 的 synthetic hook 协议拒绝不能证明真实宿主受保护。#32 owner disposition 未完，旧 runner 归因仅为 PLAUSIBLE/未确认；#44 owner disposition 未完，approval-expiry 解释也仅为 PLAUSIBLE/未确认，相关根因均未确认。
- Issue #48 仍为 OPEN。M5 PR #47 head cf4e2cd 的独立 CI run 38527097304 为 9/9，M1 PR #43 head f59ba37 的 run 38522973084 为 9 jobs 全绿；M9 功能组合 HEAD 83d7268 的 aggregate verify 通过（397 total、391 pass、0 fail、6 env skip，覆盖仓库级 build/test/package smoke）。这些结果证明各 PR head 的独立 CI 和该功能组合的仓库级测试通过，但不证明真实 M1+M5 宿主接线或运行时行为。合并候选远端 CI 与真实 M1+M5 宿主接线验收仍 pending；保持相关路径 fail-closed，不因本地组合通过而宣称 Issue #48 门禁解除。
- M6 外部独立 E4 仍为 NOT_VERIFIED；本轮测试的 Auto E4 部分使用合成 fixture，不是外部独立性证据。M7 clean-VM 安装、升级、卸载和取消回滚仍未验证；未启动或运行操作系统安装程序。npm package smoke 的临时 npm 包检查不代表原生安装器验证。没有真实安装或 VMware 证据，不能据打包 smoke 宣称这些门槛通过。
- 因此当前结果是本地组合的 build、test、package smoke 和 docs check 通过；评审、契约、开放 Issue、组合后远端 CI 以及上述未覆盖运行环境门槛仍待解决。本分支未推送，未合并 main 或 PR #24，未发布 Release。

## 历史调度快照（2026-10-13 11:07 UTC）

> 本节为历史快照。后续 #28 owner audit 确认当前 M7 分支尚未纳入 M1 close/quarantine 代码，且 Gateway 文件有实际差异；以文档前部记录的当前阻塞状态为准。

- P0 #35 是 M9 的前置阻断：在 Guard quarantine 后，已有 Gateway callback 曾保持未 aborted 并产生合成 marker。M1 本地 commit `ec3bc96` 增加同步 `subscribeQuarantine`；同一 Guard 实例的活动 callback 回归与 Windows Node 20.20.2 聚焦 63/63 通过，但远端 PR/CI 尚未确认。收到可审查 PR 与相关 CI 证据前，不集成 Gateway，也不关闭 #35。
- #28 中 M1 是本轮 `src/runtime/gateway.ts` 唯一写入者。M7 只继续 packaging/scripts/M7 测试；后续合并时保留 M1 的活动执行 abort/Guard 复查与 M7 的资源关闭语义。
- M4 Draft PR #34 当前 head `fe2c973` 的 run `38386967113` 列出的 9/9 checks 通过；此前 `8319a67` 的 Windows Node 22 Hook interruption 失败未修改过。M4 本地全量测试 330 项中 325 通过、5 跳过；报告现已提交 PR。
- M9 自身 Draft PR #36 head `c9b9190` 的 run `38386657562` 9/9 通过；此前 head `28473cc` 的 run `38385128369` 曾在 Windows Node 22 同一 Hook 子测试失败（`false !== true`）。M1 在 Windows Node 22 做 5 次 wrapper 诊断未复现；测试不覆盖真实宿主 callback，#32 根因仍 UNKNOWN，不能据后续绿色 CI 关闭。
- 当前开发槽为 M1、M6、M7（3/3）。M6 在独立 AC3 worktree 移植自身 3 个 commits，旧 PR #31 保持 main base；M1 查验失败诊断输出；M7 确认 package manifest owner。M5/M7 的远端 push 曾受 WSL Git 凭据阻塞；M5 当前 IDLE，M7 不重试 push。M8 文档本地两次提交完成但尚无远端 PR。#35 在 M1 P0 修复有可审查 PR/CI 前仍是集成门槛。
- 不启动 VMware、真实模型或安装测试；当前互斥资源槽空闲。每次需要此槽时先在 #29 登记负责人、测试类型、时间和释放条件。

## M9 边界

- 只在 `feature/ac3-m9-integration` 工作树整合通过评审的模块 PR，并保存源 PR、commit SHA、CI 与验收证据。
- 不直接改 M1–M8 工作树，不合并 main，不合并 PR #24，不发布 Release。
- Draft PR 在责任模块、契约、冲突 Issue、测试证据和 CI 都可复核后才可转 Ready。

## 集成门槛

1. M3/M6 明确把工作移到 AC3 基线的方案并在 PR 显示 merge-base/commit 证据；M3/M5/M6/M7 按 #27 认领 `package.json` 字段。
2. M1/M7 按 #28 确认 Gateway 合同与可靠性改动顺序；Gateway API 与 Hook fail-closed 条件写入契约。
3. 每个模块 PR 包含测试命令和报告路径/链接、`API-Contract-Change` 字段、共享路径协调声明。未知和未测试结果原样保留。
4. GitHub 上对应模块 PR 的现有 CI checks 为 green；M0 检查 PR 差异、契约声明、责任路径与冲突 Issue。
5. 一次只把已验收模块变更引入本分支；记录 PR URL、head SHA、集成 commit 和后续回归结果。

## 推荐集成次序

| 阶段 | 模块 | 门槛 |
| --- | --- | --- |
| 0 | 基线/所有权 | 先解决 #27；工作树迁移不覆盖未提交内容 |
| 1 | M1 Gateway + Hook | 完成 #28 的接口决策，Gateway 拒绝/审批/证据契约冻结 |
| 2 | M5 Policy + M2 Isolation | Policy 不能绕过 Guard；隔离执行经 Gateway 授权，异常状态不 fail-open |
| 3 | M3 Onboarding + M4 UI | 预览/hash/备份/恢复安全；UI 只通过 CSRF/operator 保护的 API |
| 4 | M6 E4 | 按固定 Evidence v0.1 schema 验证，报告限制和 artifact hash |
| 5 | M7 Reliability | 文件、生命周期、Windows 安装/打包验证与前述接口同时成立 |
| 6 | M8 Open Source | README、贡献和支持描述与实际能力、发布状态一致 |

顺序可因依赖证据调整，但必须更新 Issue 和本计划，不做跨模块隐式 cherry-pick。

## 资源调度记录

- 同时运行的开发任务最多 3 个；开始/暂停/结束时登记模块、分支、负责人/线程引用、开始和释放时间。当前工具集合无 `read_thread`/`wait_threads`，M0 使用本机 thread-history 快照核对状态，并用本机 `codex queue` 续作；GitHub Issue/PR 与 worktree 用于交叉验证。
- VMware、真实模型、安装测试共享单个互斥资源槽；槽被占用时其他两类任务排队。
- M9 每轮整合使用唯一测试槽记录，记下环境、命令、输入 artifact、原始报告位置和结果，不以重试覆盖第一次失败。

## 最终验收矩阵

| 范围 | 必须证据 |
| --- | --- |
| 安全执行 | 未登记能力拒绝；Guard quarantine 前后复查；审批为宿主能力；拒绝未启动 executor |
| Hook/Canary | timeout/error/malformed evidence fail closed；敏感值不进普通日志；命中有可追踪处置 |
| Policy | 模式不能覆盖 containment；未登记、敏感和破坏性操作保留明确拒绝/审批语义 |
| UI/接入/安装 | CSRF/origin/operator 检查保持；预览/hash 不符拒绝；恢复不覆盖后续用户编辑 |
| E4/证据 | schema、链、expected head 条件和限制明确；PASS 有绑定 artifact 的报告 |
| 可靠性/打包 | build 与跨平台 CI 通过；安装、关闭和损坏/中断场景有真实测试结果 |
| 开源体验 | 命令/支持/安全报告路径可用；不把候选构建说成已发布版本 |
| 仓库状态 | PR #24 及 readiness base 未被改变；M1–M8 改动可追溯；无 secrets/logs/temp 误入 |
