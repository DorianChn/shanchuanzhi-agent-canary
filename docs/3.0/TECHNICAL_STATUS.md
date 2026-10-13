# M0 技术协调状态

## 当前状态（2026-10-13 16:03 UTC；实时快照）

- PR #24：OPEN/Draft，base competition/shanchuanzhi-release-readiness，head 62496d4，未合并；最近核对 11/11 checks 通过。
- M0 PR #30：OPEN/Draft，head d23f1ae；当前头 10/10 checks 通过。最新推送批次为 16:02:40 UTC；下次推送不早于 16:22:40 UTC。
- M1：活跃槽位 1/2；PR #43 head 89e40cd，当前头 9/9 checks 通过。新提交是回归测试；P0 #35 的修复/验收仍未完成，#32/#44 仍 OPEN；工作树两份回归报告保留未提交修改。
- M7：活跃槽位 2/2；PR #39 远端仍为 65ce028，当前 CI 有 Windows Node20/22、macOS Node20 和 Windows wrapper 失败。实际工作树分支 feature/ac3-reliability-ac3 HEAD de9ec56，比远端多 2 个提交，另有 4 个修改文件及未跟踪 NSIS 安装脚本；真实 makensis/安装验收待完成。
- M2：PR #37 OPEN/Draft、9/9 checks 通过；Codex 原生 Shell 仍 UNPROTECTED，P1 #45 OPEN，排队等待槽位。
- M3：PR #33 9/9 checks 通过，#42 已关闭；M4：PR #34 9/9 checks 通过；M8：PR #40 9/9 checks 通过。三者 IDLE。
- M5：feature/ac3-policy-audit 本地干净、5 commits ahead，无远端 PR；API_CONTRACTS.md 路径及 package.json 字段仍须按 #27 协调。
- M6：PR #38 head bca895f 的旧 CI 为 7 pass、Windows Node22 1 fail、package-smoke 1 skipped；外部 E4 仍 NOT_VERIFIED。M6 工作树有未跟踪 security-lab/e4-runs/20261013T114513Z/，保持原样，不把它当作已验证证据。
- M9：PR #36 仍 OPEN/Draft、head 996073a；其集成描述已按本快照更新，M9 只维护门禁和风险，不改 M1–M8 源码。
- 并行开发上限为 2；当前仅 M1、M7 活跃（2/2）。额度页面读数 13%，约 1 小时 22 分钟后重置；每 60 秒轮询。低于或等于 5%、或读数不清时全部暂停；真实低额度暂停仅在确认五小时额度已重置后恢复。
- VMware/真实模型测试未运行；M7 负责下一次安装测试的独占资源时段，实际安装测试是否已开始尚待其回报。未合并 main、未合并 PR #24、未发布 Release。
- 本节为当前权威快照；下方较早记录按原时间保留作历史证据。
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
| M1 | feature/ac3-security-core | 89e40cd | PR #43 当前头 9/9 checks 通过；两份回归报告有未提交修改；#35/#32/#44 未闭环 | WSL Git worktree |
| M2 | feature/ac3-execution-isolation | a1c239d | PR #37 OPEN/Draft、9/9 checks；原生 Shell 仍 UNPROTECTED，#45 等待槽位 | WSL Git worktree |
| M3 | feature/ac3-agent-onboarding | c404b6b | PR #33 9/9 checks；#42 已关闭；工作树快照不变 | Windows Git worktree |
| M4 | feature/ac3-desktop-security-center | fe2c973 | PR #34 9/9 checks；工作树快照不变 | Windows Git worktree |
| M5 | feature/ac3-policy-audit | 9ec08d9 | 本地干净、5 commits ahead；无远端 PR；契约路径及 package.json 字段由 #27 协调 | WSL Git worktree |
| M6 | feature/ac3-e4-validation-ac3（另有旧 PR #31 分支） | bca895f | PR #38 旧 CI 7 pass/1 Windows Node22 fail/1 package-smoke skipped；有未跟踪 E4 run 文件；外部 E4 NOT_VERIFIED | Windows Git worktree |
| M7 | feature/ac3-reliability-ac3 | de9ec56 | PR #39 远端 65ce028；本地多 2 commits、4 个已修改文件及 1 个未跟踪 NSIS 安装脚本；真实安装验收待完成 | WSL Git worktree |
| M8 | feature/ac3-open-source-product | b0f30ff | PR #40 当前头，9/9 checks 通过；未发布 Release | WSL Git worktree |
| M0 | feature/ac3-m0-coordination | d23f1ae | PR #30 当前头，10/10 checks 通过；下批推送不早于 16:22:40 UTC | Windows Git worktree |
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
