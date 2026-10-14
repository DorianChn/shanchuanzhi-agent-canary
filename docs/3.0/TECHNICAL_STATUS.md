# M0 技术协调状态

## 当前状态（2026-10-14 05:04 UTC；GitHub、worktree 与额度页实核）

- PR #24：OPEN/Draft，base competition/shanchuanzhi-release-readiness，head 62496d4020bd90ba2eede49b2e80a2bbebb036b4，mergeable；未修改或合并。
- PR #30：OPEN/Draft，head 16a9142。当前 run 38512532532 有 7 jobs 通过、Windows Node 20 全量测试 1 个失败（321 pass/1 fail/4 skip）、package-smoke 跳过；失败仍是 M1-owned test/agent-hook.test.ts:54 的中断 marker 断言。M1 PR #43 的独立 head 2276526 为 9/9 通过，但尚未进入 PR #30 的 base；Issue #32 保持 OPEN，等待集成后的基线验收。M0 run 38512532426 的 AC3 coordination 检查通过。
- 最近一轮两个开发槽确实由 M3 与 M4 同时占用并已完成。M3 commit 54facf0（本地 ahead 1）：契约移至 docs/3.0/M3/ONBOARDING_API_CONTRACT.md，修正文档中的未验证发行命令，并修复连接检查 limits 文案；build 通过、Windows Node 22 定向测试 14/14、共享契约路径净 diff 为零。P2 修复待推送和 PR #33 CI。
- M4 commit f301195（本地 ahead 1）：OBSERVE/敏感数据、DENY/ALLOW 与 QUARANTINED/ALLOW 冲突显示为 POLICY_CONFLICT，保留后端原状态与 callback 数；build、定向测试 6/6、diff check 通过。两个未实现 API 的 CSRF GET 实测返回 404，UI 保持 UNKNOWN/UNSUPPORTED；待推送和 PR #34 CI。
- M1 当前槽处理 #32 的精确 CI 头比较；#44 的 5ms TTL 测试竞态已在 PR #43 修正，run 38502266488 的 9 个工作（Node 20/22 跨 Windows/macOS/Ubuntu、package smoke 等）全绿，待 M0 本批关闭 #44。#32 保持 OPEN，等修复进入 PR #30 基线后复验。
- M2 当前槽核验 #45：本地提交 10a608f 已记录 Hooks 不提供 fail-closed 保证；M0 实读原生 Windows CLI 与 elevated 设置，M2 正做 CLI sandbox 合成哨兵尝试。未触碰全局配置；桌面原生 Shell 集成仍 UNPROTECTED，验收未完成。
- M5 commit f8291c9 已在 feature/ac3-policy-audit 远端；44/44 policy tests、TypeScript no-emit 与 diff check 通过。仍待创建 P0 Issue 与 Draft PR；明确 DENY、OBSERVE 下 SENSITIVE_DATA 拒绝，真实宿主接入未证明。
- M6 PR #38 head d513810，run 38512550585 的 9 个 CI jobs 全部通过；PR 正文仍引用早期 M1 Hook 失败，待校正。verifier 回归 12/12；sidecar 漂移、元数据不一致及 ZIP 篡改在临时副本中被拒绝。PR 包含归档 synthetic run 20261013T084123Z；另一份 20261013T114513Z 的 16 个原始文件仍仅在本地。外部 E4 仍 BLOCKED / NOT_VERIFIED；真实模型、外部复现、VMware 与安装验收未做。
- M7 PR #39 head 5c7d95d，CI run 38510356534 与 Windows Community wrapper run 38510356548 均通过；后一项实际执行固定 NSIS 编译器安装与模板编译，Ubuntu reliability tests 也通过。Issue #41 仍 OPEN，候选修复待 PR 集成；clean-VM 安装、首次运行、升级和卸载仍 NOT_VERIFIED / HOLD。
- M8 PR #40 head b0f30ff，run 38397180263 成功；PR 正文仍写 CI pending，待更新。未发布 Release。
- PR #37、#38、#39、#40 均 OPEN/Draft、base feature/agent-canary-3.0；不合并 main 或 PR #24。M9 worktree/branch feature/ac3-m9-integration 已建立，最终集成仍待执行。
- 04:59 UTC 用量页实读：5 小时剩余 73%，50 分钟后重置；周额度 80%，额度余额 113。低于 5% 或读数不可用时暂停开发、测试与 GitHub 操作，直到确认 5 小时额度实际重置。
- 上次远端 push 批次约为 04:37 UTC；本次 GitHub 写入集中于 05:00 UTC 批次，下一批不得早于 05:20 UTC。VMware、真实模型和安装测试互斥；当前没有预约。main worktree 未动；未合并 main、未合并 PR #24、未发布 Release。

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
