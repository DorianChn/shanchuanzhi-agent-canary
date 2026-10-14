# M0 技术协调状态

## 当前状态（2026-10-14 06:23 UTC；GitHub、worktree 与额度页实核）

- **PR #24**：OPEN/Draft，base `competition/shanchuanzhi-release-readiness`，head `feature/agent-canary-3.0` / `62496d4`；updatedAt 未变化，本轮未修改。
- **M0 PR #30**：head `bcedbae`，所有当前显示检查通过。本地协调文档正在更新；下一次既有分支推送不早于 06:24 UTC。
- **M1 PR #43**：远端 head `2276526`，9/9 检查通过。M1 现有分支本地新增 commit `f59ba37`，只修改 M1-owned `test/security-router.test.ts`；非敏感 file-read taint fixture 定向测试 16/16、diff-check 通过，尚未推送。#32/#44 OPEN；#48 等待 M5/M9 组合检查。
- **M2 PR #37**：head `08c93bc`；Windows Node 20 的 M1-owned Hook marker 断言为唯一真实失败；Windows Node 22 与 macOS Node 20 因 fail-fast 取消。#45 的原生 Desktop Shell 仍 UNPROTECTED；M2 当前在既有分支处理宿主边界。
- **M3 PR #33**：head `54facf0`，9/9 通过；最终 AC3 diff 只增 M3 onboarding contract，不改 M0 canonical API contract。#27 package/manifest 组合检查仍待完成。
- **M4 PR #34**：head `f301195`，9/9 通过；后端 endpoint 仍 UNKNOWN/UNSUPPORTED。
- **M5 PR #47**：head `f8291c9`；策略定向测试 44/44、TypeScript no-emit、diff-check 通过。全矩阵 Ubuntu Node 22 仍在 security-router 旧 sensitive-read/OBSERVE flow 失败，返回 `observe_sensitive_data_blocked`；五项因 fail-fast 取消。保留硬拒绝和零 callback/approval；未观察到真实数据泄露。
- **M6 PR #38**：head `d513810`，9/9 通过；验证的是合成归档证据，外部 E4 NOT_VERIFIED。
- **M7 PR #39**：head `5c7d95d`，主矩阵 9/9、Windows/Ubuntu wrapper 2/2 通过。PR 描述与 Issue #41 已更新并读回；#41 保持 OPEN 等待集成。clean-VM 安装、首次启动、升级、卸载及真实取消回滚仍 NOT VERIFIED/HOLD。
- **M8 PR #40**：head `b0f30ff`，9/9 通过；没有发布 Release。
- **M9 PR #36**：head `996073a`，9/9 通过，但尚未把 M1–M8 候选组合运行最终验收。
- **开放跨模块门槛**：#27 manifest/package 组合；#28 M1/M7 Gateway 生命周期；#32 Hook 修复进共同基线；#41 M7 集成/安装验收；#44 approval expiry 共同基线复验；#45 native Shell；#46 canonical OBSERVE contract；#48 M1/M5 route test integration。#35 仅在同进程、同 Guard、callback 配合 AbortSignal 范围内 CLOSED。
- **排程与额度**：M2 #45 为当前在做的模块代码任务；M1 #48 测试修正已本地提交，等下个推送批次；M7 只完成状态元数据同步。额度页 06:16 UTC 实读五小时剩余 94%（约 4h42 后重置）、每周 77%、余额 113。低于 5% 或读数不可用时暂停所有 M0–M8 工作，确认重置后恢复。最近推送约 06:02–06:04 UTC；下一批不早于 06:24 UTC。
- 本会话没有 `read_thread` / `send_message_to_thread` 工具；进度以 worktree、PR、CI、Issue 可验证状态为准。未合并 main 或 PR #24，未发布 Release，M0 未改 M1–M8 产品源码。

## 历史快照（2026-10-14 05:17 UTC；保留原始核验记录）

- PR #24：OPEN/Draft，head 62496d4，base competition/shanchuanzhi-release-readiness；未修改、未合并。PR #30 仍 OPEN/Draft，head 9300f80；本批 M0 文档已推送，run 38515050934 的节点矩阵、package-smoke、Docker、sponsor 与 ownership-contract-evidence 当前均通过。
- M1：PR #43 head 2276526，run 38502266488 为 9/9；Hook interruption 测试采用异步 marker wait。Issue #32 和 #44 保持 OPEN，需将修复纳入基线并验证；未发现实际审批绕过或宿主 callback 证据。
- M2：PR #37 head 08c93bc 已推送。run 38515077665 只有 Windows Node 20 真正失败（test/agent-hook.test.ts marker 断言）；macOS Node 20 与 Windows Node 22 因 fail-fast 取消，其余通过。该失败属于 M1 测试，见 #32。Windows CLI sandbox 的 :workspace 合成哨兵写入成功仅证明允许路径可写；未证明拒绝路径、Desktop Shell 或 Hook，原生桌面仍 UNPROTECTED，#45 OPEN。
- M3：PR #33 远端仍为 c404b6b。候选 54facf0 的净 PR diff 仅新增 docs/3.0/M3/ONBOARDING_API_CONTRACT.md，不改共享 docs/3.0/API_CONTRACTS.md；这符合模块细节与 M0 canonical contract 分离的所有权约定。已更正此前错误留言；现有提交待下一批推送并触发 CI。
- M4：PR #34 head f301195 已推送，run 38515082347 全部 9 jobs 通过；保留未实现后端 API 为 UNKNOWN/UNSUPPORTED。
- M5：现有分支 feature/ac3-policy-audit 已建立 Draft PR #47，head f8291c9。targeted policy tests 44/44、TypeScript no-emit 与 diff-check 通过；run 38515368157 的 Ubuntu Node 22 在 security-router 的 same-Guard flow 测试失败，报 observe_sensitive_data_blocked；其他 5 个测试 job 被 fail-fast 取消，Docker/sponsor 通过，package-smoke 跳过。P1 #48 跟踪 M1/M5 行为与测试冲突；P2 #46 跟踪 M5 OBSERVE contract 与 M0 canonical 文档同步。M5 最终 PR diff 不改共享 contract 路径；其报告中的 duplicate-path 说明待 M5 owner 校正。未发现真实数据泄露。
- M6：PR #38 head d513810，run 38512550585 为 9/9；PR 描述已补当前证据。该结果只验证归档的 synthetic E4 bundle，不代表真实模型/外部 E4 验收；状态 BLOCKED / NOT_VERIFIED。
- M7：PR #39 head 5c7d95d，CI run 38510356534 为 9/9，wrapper run 38510356548 两个平台通过。PR 与 #41 已补状态，Issue #41 保持 OPEN 等候集成；clean-VM 安装、升级、卸载与真实用户取消回滚仍 NOT VERIFIED / HOLD。
- M8：PR #40 head b0f30ff，run 38397180263 为 9/9；PR 描述已补当前 CI。未发布 Release。
- 本批对已有分支作 fast-forward push：M0、M2、M4；未新建模块分支，未合并 main 或 PR #24。下次 branch push 不早于 05:32 UTC，按 20 分钟批次。
- 05:16 UTC 左右读取使用额度页：5 小时剩余 73%，约 34 分钟后重置；周额度 80%，余额 113。低于 5% 或无法读数时暂停开发、测试、浏览器与 GitHub 操作，等确认额度重置后继续。
- 当前工具清单没有 read_thread/send_message_to_thread；没有删除或读取 8 个引用聊天，也不声称其会话状态。当前协调只按 worktree、远端 refs、Issues、PR 与 CI 实况记录。M0 未观察到 VMware、真实模型或安装测试预约；不能据此断言其他聊天没有运行这些测试。
- M9 集成 worktree/branch 已存在，等待 M1–M8 契约与候选门禁满足后再集成。

## 历史状态（2026-10-14 04:36:33 UTC；该时间点的快照）

- PR #24：OPEN/Draft，base `competition/shanchuanzhi-release-readiness`，head `62496d4020bd90ba2eede49b2e80a2bbebb036b4`；11/11 checks 通过。未修改或合并。
- PR #30：OPEN/Draft，M0 head `19ee8ca` 已于 04:14 UTC 推送；run `38510345880` 为 7 pass、Windows Node 20 1 fail、Windows Node 22 cancelled、package-smoke skipped。失败是旧基线 `spawnSync` 1 秒等待窗口未等到 marker；Node 22 job 日志为 322 pass、0 fail 后被取消。M1 PR #43 的更新代码 Windows Node 20/22 检查通过；#32 保持 OPEN，等待集成后的基线 CI 验收。
- 当前两个开发槽是 M3 与 M4。M3 正将 owner-authored onboarding 契约交接到 M3 专属附录、清除共享契约路径重叠；M4 审核 OBSERVE/Guard 状态展示是否保留拒绝、隔离与 UNKNOWN。两者只在各自 worktree/文件所有权内工作。
- M2 commit `63b9c08` 已加入 M2 Gateway callback binder seam 与 fixture；8 个 M2-owned 文件、定向检查通过，当前本地未推送。PR #37 远端仍为 `a1c239d`；该 binder 不集成 AppContainer，原生 Codex Shell 仍 `UNPROTECTED`，宿主验收仍 `BLOCKED_NOT_VERIFIED`。
- M5 commit `9f33f97` 保留显式 DENY、禁止 OBSERVE 放行 `SENSITIVE_DATA`；后续 commit `f8291c9` 添加已登记 `sensitive-read` 拒绝、零回调/零审批请求和敏感 egress 日志脱敏测试，并移除 M5 分支重复的公共契约文件。定向测试 44/44、TypeScript no-emit、diff check 通过。M5 尚无远端 PR/CI，P0 仍 OPEN。
- M6 commit `d513810` 比 PR #38 远端 head `bca895f` 超前 1、落后 0；现有 PR 为 OPEN/Draft。此前 12/12 verifier 回归通过，PR 的当前旧头 CI 有 M1-owned Windows Node 22 interruption marker 失败，package-smoke skipped；M6 候选不含 Hook 改动。原始 E4 证据未跟踪且不随 PR 上传，外部 E4 仍 `NOT_VERIFIED`；VMware、真实模型和安装测试未运行。
- M6 commit `d513810` 已完成 bundle verifier 修复与审计：聚焦回归 12/12 通过；sidecar 漂移、元数据不一致与 ZIP 字节篡改在临时副本中均被拒绝；原始 16 文件 E4 目录未改。PR #38 远端仍是旧 head `bca895f`（7 pass、M1-owned Windows Node 22 Hook marker fail、package-smoke skipped）。真实 E4 仍 `NOT_VERIFIED`。
- M7 commit `5c7d95d` 已推送至 PR #39；新 run `38510356534` 与 wrapper run `38510356548` 合计 11/11 checks 通过。该修复改用 `MUI_CUSTOMFUNCTION_ABORT AgentCanaryAbortCleanup`，保留 `MUI_ABORTWARNING` 与 `RollbackInstall`。定向测试 8 pass/1 skip、可靠性套件 43 pass/3 skip；本机没有固定 NSIS 3.13 编译器，真实编译和 VM 安装仍未验证。
- M1 PR #43 head `2276526`，run `38502266488` 为 9/9 通过。M1 核查确认 #30 Windows Node 20 失败、Node 22 取消；失败来自旧基线的一秒启动窗口，不表示 Hook 放行。M1 当前异步测试等待实际 marker，并验证无输出、无决策日志、无 allow；M7 不修改 Hook 路径。
- M3 PR #33、M4 PR #34、M8 PR #40 当前头均为 9/9 checks 通过；M9 最终集成尚未完成。
- 04:36 UTC 用量页：五小时剩余 73%，1h14m 后重置；周额度 80%，额度余额 113。若五小时剩余低于 5% 或读数不可确认，暂停开发、测试与 GitHub 操作；恢复前确认五小时额度已实际重置。
- 本批远端 push 包含 M0 与 M7 两个分支，协调时点为 04:14 UTC；下一批不得早于 04:34:50 UTC。模块提交/CI 准备期间继续按 20 分钟一批安排。
- `main` worktree 存在大量未提交改动；本轮未在其中编辑或清理，所有模块更新留在各自 worktree。VMware、真实模型、安装测试互斥；当前没有此类本地测试预约。未合并 main、未合并 PR #24、未发布 Release。

## 历史快照（2026-10-13 16:16 UTC；保留作记录）

- PR #24：OPEN/Draft，base competition/shanchuanzhi-release-readiness，head 62496d4，未合并；最近核对 11/11 checks 通过。
- M0 PR #30：OPEN/Draft，远端 head d23f1ae、CI 10/10 通过；本地协调快照已提交到 da25925，待下个推送批次。最新推送为 16:02:40 UTC；下次不早于 16:22:40 UTC。
- M1：活跃槽位 1/2；PR #43 head 89e40cd，9/9 checks 通过。P0 修复提交 ec3bc96 已在该远端祖先中；当前回归测试通过。#35 保持 OPEN，等待 M1 确认剩余缺口或 owner disposition；#32/#44 仍 OPEN。M1 本地 HEAD b0478b9 是证据文档更新。
- M7：活跃槽位 2/2；PR #39 远端仍为 65ce028，现有 CI 有 Windows Node20/22、macOS Node20 与 Windows wrapper 失败。本地 HEAD 4f3a2c5（比远端多 4 个提交），含固定 NSIS 编译器安装 workflow；工作树干净，新候选 CI 尚未运行/验证。
- M2：PR #37 OPEN/Draft、9/9 checks 通过；Codex 原生 Shell 仍 UNPROTECTED，P1 #45 OPEN，等待槽位。
- M3：PR #33 9/9 checks 通过，#42 已关闭；M4：PR #34 9/9 checks 通过；M8：PR #40 9/9 checks 通过。三者 IDLE。
- M5：feature/ac3-policy-audit 本地干净、5 commits ahead，无远端 PR；API_CONTRACTS.md 路径及 package.json 字段按 #27 协调。
- M6：PR #38 head bca895f 的旧 CI 为 7 pass、Windows Node22 1 fail、package-smoke 1 skipped；外部 E4 仍 NOT_VERIFIED。未跟踪 E4 run 目录保持本地。
- M9：PR #36 OPEN/Draft、head 996073a，9/9 checks 通过；描述已刷新为两项并行和当前门禁。
- 并行开发上限 2；当前仅 M1、M7 活跃（2/2）。额度页 13%，约 1 小时 12 分钟后重置；监控每 60 秒轮询。<=5% 或读数不清时全部暂停，实际低额度暂停只在确认五小时额度重置后恢复。
- VMware/真实模型测试未运行。M7 负责下一个独占安装测试窗口；CI 验证尚未开始。未合并 main、未合并 PR #24、未发布 Release。
- 本节为当前权威快照；较早记录按原时间保留作历史证据。
## 基线与 PR #24

- 总仓库 checkout：`main`，HEAD `146be17ea924d09a78ceff90b83006cdd40dfc43`。
- AC3 开发基线：`feature/agent-canary-3.0` HEAD `62496d4020bd90ba2eede49b2e80a2bbebb036b4`。
- PR #24：OPEN、Draft、mergeable；base `competition/shanchuanzhi-release-readiness`（`dc8d0092b35141b295d5ff42873584ed488e4ee7`），head AC3 `62496d4...`。不是已合并 main。
- 检查时 `gh pr checks 24` 的 11 项全部通过：3 OS × Node 20/22 测试矩阵 6 项、package smoke、Docker build、sponsor smoke、2 wrapper regression。之后状态可能变化，以 PR checks 为准。

## 工具检查

| 工具 | 观察结果 |
| --- | --- |
| Git for Windows | 2.54.0 |
| GitHub CLI | 2.102.0；`gh auth status` 显示已登录 DorianChn，未记录/输出 token |
| Codex CLI | 0.162.0-alpha.17.2 |
| Node.js / npm | 22.23.1 / 10.9.8 |
| Python | Windows `python`/`python3` 为 Store stub，`py` 不存在；WSL Python 3.14.4 可用 |

## 工作树矩阵

| 模块 | 分支 | HEAD | 当前改动快照 | 路径环境 |
| --- | --- | --- | --- | --- |
| M1 | feature/ac3-security-core | b0478b9 | PR #43 remote 89e40cd、9/9 checks；fix commit ec3bc96 is in remote ancestry; #35 owner disposition pending | WSL Git worktree |
| M2 | feature/ac3-execution-isolation | a1c239d | PR #37 OPEN/Draft、9/9 checks；原生 Shell 仍 UNPROTECTED，#45 等待槽位 | WSL Git worktree |
| M3 | feature/ac3-agent-onboarding | c404b6b | PR #33 9/9 checks；#42 已关闭；工作树快照不变 | Windows Git worktree |
| M4 | feature/ac3-desktop-security-center | fe2c973 | PR #34 9/9 checks；工作树快照不变 | Windows Git worktree |
| M5 | feature/ac3-policy-audit | 9ec08d9 | 本地干净、5 commits ahead；无远端 PR；契约路径及 package.json 字段由 #27 协调 | WSL Git worktree |
| M6 | feature/ac3-e4-validation-ac3（另有旧 PR #31 分支） | bca895f | PR #38 旧 CI 7 pass/1 Windows Node22 fail/1 package-smoke skipped；有未跟踪 E4 run 文件；外部 E4 NOT_VERIFIED | Windows Git worktree |
| M7 | feature/ac3-reliability-ac3 | 4f3a2c5 | PR #39 remote 65ce028; four local commits ahead, clean; pinned NSIS CI setup awaits new remote run | WSL Git worktree |
| M8 | feature/ac3-open-source-product | b0f30ff | PR #40 当前头，9/9 checks 通过；未发布 Release | WSL Git worktree |
| M0 | feature/ac3-m0-coordination | da25925 local; d23f1ae remote | PR #30 current remote CI 10/10 pass; next batch >=16:22:40 UTC | Windows Git worktree |
| M9 | feature/ac3-m9-integration | 996073a | 集成计划在 Draft PR #36；当前头 9/9 checks 通过 | Windows Git worktree |

初始 main 与 AC3 快照存在不同历史；M3 当前 PR #33 head `c404b6b` 已基于 AC3 `62496d4`，旧 main-based 快照 `cf42dde` 保留在 `backup/ac3-agent-onboarding-main-base`。M6 旧 PR #31 分支仍为 main-based `da52c17`；独立 AC3 PR #38 使用 `bca895f`，manifest 与字段组合继续由 #27 跟踪。M4/M0/M9 worktree 基于 `62496d4`。工作目录/index 独立；WSL 创建的工作树由 WSL Git 使用，Windows 创建的工作树由 Git for Windows 使用，用另一运行环境查看会把外部绝对路径显示为 prunable。

## GitHub 协作

- [Issue #27](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/27)：M3/M6 基线与 M3/M5/M6/M7 manifest 冲突，OPEN。
- [Issue #28](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/28)：M1/M7 Gateway 冲突，OPEN。
- [Issue #32](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/32)：Hook interruption 历史失败仍 OPEN；M1当前 async 测试10/10、M6对PR #38旧spawnSync/1秒版本5/5通过，但均未复现远端marker缺失，根因UNKNOWN。
- [Issue #35](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/35)：quarantine P0 保持 OPEN；M1 最新修正仍仅在本地，PR #43 远端 head 未改变。
- [Issue #41](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/41)：M7 可靠性 CI 失败保持 OPEN；候选65ce028正按失败日志验证，后续需新 head CI。
- [Issue #44](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/44)：P1 gateway approval-expiry CI 失败；M1按精确源版本复现与归因，OPEN。
- [Issue #42](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/42)：已依据 M3 head `c404b6b`、run `38400488378` 9/9（含 package-smoke）及 PR 内 M3 契约章节关闭为 completed。旧 `cf42dde` manifest 证据留作历史。
- `.github/workflows/ci.yml` 在 PR 自动跑构建/测试/打包/容器/sponsor 检查。本 PR 加入协作字段与接口冲突 gate；未核实 branch protection 是否强制这些 check。
- Codex Desktop Connector 未暴露 `read_thread`、`wait_threads` 或 `send_message_to_thread`。应用户许可，M0 曾只读本机 `thread_history` 并用 `codex queue` 调度；具体模块进度以对应 worktree 与 GitHub refs/Issues/PR 为准，不把本机记录说成原生 `read_thread`。

PR [#30](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/30) 仍 OPEN/Draft，base `feature/agent-canary-3.0`，远端 head `1179ed1`。当前头检查 10/10 通过。上一头 `0091759` 的 run `38421264751` 中 macOS Node22 job 等待 15 分钟后被取消，`runner_id=0` 且无步骤日志；`package-smoke` 跳过，故仅记为 runner 分配结果未知。

## M0 交付边界

已建立 `main/`（AC3 detached 基线快照）、`agents/M1–M8`、`coordinator/`、`integration/`、`reports/`、`logs/`。根仓库 `main` checkout 保持原状。M0 未改 M1–M8 源码，未合并 main，未发布 Release。WSL 与 Windows 工作树各由对应 Git runtime 读取；交叉 runtime 会显示不兼容指针为 `prunable`，没有执行 `repair/prune`。
