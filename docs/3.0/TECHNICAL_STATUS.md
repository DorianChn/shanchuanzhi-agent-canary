# M0 技术协调状态

## 当前状态（2026-10-13 13:44 UTC；GitHub 与 owner 快照）

- PR #24 仍 OPEN/Draft，base `competition/shanchuanzhi-release-readiness`、head `62496d4`；9 项 CI 与 2 项 wrapper 检查全部通过，未修改或合并。
- M0 PR #30 为 OPEN/Draft，head b032bc9；主 CI run 38406894449 为 9/9，ownership/contract gates 38407210960 与 38407356617 均通过。
- M1 PR #43 远端 head 仍为 `d0fd595`；run `38399797819` 在 Ubuntu Node 22 的 quarantine honeypot 子测试 217 失败。M1 owner 报告本地 test-only commit `dc4d7fa` 与定向 Windows Node 22 34/34 通过；一次 push 退出 1 且没有捕获到错误文本，远端未更新。Issue #35 历史 P0 仍 OPEN，当前 head 未得到修正后的远端 CI 验收。
- M2 PR #37 为 OPEN/Draft，9/9 检查通过；原生 Codex Shell 仍 UNPROTECTED。
- M3 PR #33 head `c404b6b`，run `38400488378` 为 9/9，PR 含 owner 编写的 onboarding API 契约。Issue #42 已根据当前 head 的 package-smoke 与契约验收证据关闭为 completed；跨模块 manifest 协调继续由 #27 跟踪。
- M4 PR #34 与 M9 PR #36 当前各 9/9 检查通过；桌面安全中心/E4 后端 404 仍 UNKNOWN。
- M5 `feature/ac3-policy-audit` 本地 HEAD `9ec08d9`，工作树干净且领先 AC3 五个提交；push 超过两分钟无输出后由 owner 停止，GitHub 无分支/PR。
- M6 PR #38 head `bca895f` 的 Windows Node 22 测试失败；外部 E4 证据仍 NOT_VERIFIED。
- M7 PR #39 仍在远端 `f17b7e6`，wrapper 与跨平台测试 jobs 失败。Owner 本地候选 `65ce028`；一次普通 push 因非交互 HTTPS 凭据不可用而被阻止，Issue #41 OPEN。
- M8 PR #40 head `b0f30ff`，9/9 检查通过。
- M1 与 M6 的继续工作已排入原有 Codex 会话，预留 2/2 槽；GitHub head 尚未改变，M6 本地出现新 E4 run-artifact 目录，owner 仍在验证。VMware、真实模型和安装测试均无预约。下一批 push 不早于 14:00 UTC。
- 当前快照报告保存在 `reports/M0_INITIALIZATION_REPORT.md`。未合并 main、未修改 M1–M8 模块源码或发布 Release。

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
| M1 | `feature/ac3-security-core` | `dc4d7fa` | PR #43 远端仍为 `d0fd595` 且 CI 失败；本地 test-only 修正确认定向 34/34（owner 报告），push 未成功；#35 保持 OPEN | WSL Git worktree |
| M2 | `feature/ac3-execution-isolation` | `a1c239d` | PR #37 OPEN/Draft，9/9 checks；隔离原型与证据已提交，原生 Shell 仍为 `UNPROTECTED` | WSL Git worktree |
| M3 | `feature/ac3-agent-onboarding` | `c404b6b` | PR #33 9/9 checks；M3 API 契约已写入；旧 main-based 快照保留在 backup 分支 | Windows Git worktree |
| M4 | `feature/ac3-desktop-security-center` | `fe2c973` | PR #34 头一致、当前 run 全绿；工作树干净 | Windows Git worktree |
| M5 | `feature/ac3-policy-audit` | `9ec08d9` | 工作树干净，领先 AC3 五个提交；上传因无输出超过两分钟后停止；无远端分支/PR | WSL Git worktree |
| M6 | feature/ac3-e4-validation-ac3 (另有旧 PR #31 分支) | bca895f | AC3 PR #38 当前 head；Windows Node 22 测试失败，外部 E4 证据 NOT_VERIFIED。旧 PR #31 另有本地 manifest 修复待远端复验 | Windows Git worktree |
| M7 | `feature/ac3-reliability-ac3` | `65ce028` | 本地修复候选；PR #39 远端 `f17b7e6` CI 失败；push 被非交互凭据阻止，#41 OPEN | WSL Git worktree |
| M8 | `feature/ac3-open-source-product` | `b0f30ff` | PR #40 当前 head，9/9 checks 通过；未发布 Release | WSL Git worktree |
| M0 | feature/ac3-m0-coordination | b032bc9 | PR #30 主 CI 9/9、ownership/contract gate 通过；本地有后续状态文档待下一批推送 | Windows Git worktree |
| M9 | `feature/ac3-m9-integration` | `996073a` | 集成计划在 Draft PR #36；9/9 checks 通过 | Windows Git worktree |

初始 main 与 AC3 快照存在不同历史；M3 当前 PR #33 head `c404b6b` 已基于 AC3 `62496d4`，旧 main-based 快照 `cf42dde` 保留在 `backup/ac3-agent-onboarding-main-base`。M6 旧 PR #31 分支仍为 main-based `da52c17`；独立 AC3 PR #38 使用 `bca895f`，manifest 与字段组合继续由 #27 跟踪。M4/M0/M9 worktree 基于 `62496d4`。工作目录/index 独立；WSL 创建的工作树由 WSL Git 使用，Windows 创建的工作树由 Git for Windows 使用，用另一运行环境查看会把外部绝对路径显示为 prunable。

## GitHub 协作

- [Issue #27](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/27)：M3/M6 基线与 M3/M5/M6/M7 manifest 冲突，OPEN。
- [Issue #28](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/28)：M1/M7 Gateway 冲突，OPEN。
- [Issue #32](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/32)：Hook interruption 历史失败仍 OPEN；PR #30 当前 head 全绿，但不能据此证明模块 owner 的所有组合边界均已修复。
- [Issue #35](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/35)：quarantine P0 保持 OPEN；M1 最新修正仍仅在本地，PR #43 远端 head 未改变。
- [Issue #41](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/41)：M7 可靠性 CI 失败保持 OPEN；本地修正待可用上传路径和新 head CI。
- [Issue #42](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/42)：已依据 M3 head `c404b6b`、run `38400488378` 9/9（含 package-smoke）及 PR 内 M3 契约章节关闭为 completed。旧 `cf42dde` manifest 证据留作历史。
- `.github/workflows/ci.yml` 在 PR 自动跑构建/测试/打包/容器/sponsor 检查。本 PR 加入协作字段与接口冲突 gate；未核实 branch protection 是否强制这些 check。
- Codex Desktop Connector 未暴露 `read_thread`、`wait_threads` 或 `send_message_to_thread`。应用户许可，M0 曾只读本机 `thread_history` 并用 `codex queue` 调度；具体模块进度以对应 worktree 与 GitHub refs/Issues/PR 为准，不把本机记录说成原生 `read_thread`。

PR [#30](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/30) 为 OPEN/Draft，base `feature/agent-canary-3.0`，当前 GitHub head `6d61483`；run `38403657526` 全 9 项通过，ownership/contract gate `38403657775` 通过。PR 描述已更新为 13:25 UTC 的核验快照，PR 保持 Draft。

## M0 交付边界

已建立 `main/`（AC3 detached 基线快照）、`agents/M1–M8`、`coordinator/`、`integration/`、`reports/`、`logs/`。根仓库 `main` checkout 保持原状。M0 未改 M1–M8 源码，未合并 main，未发布 Release。WSL 与 Windows 工作树各由对应 Git runtime 读取；交叉 runtime 会显示不兼容指针为 `prunable`，没有执行 `repair/prune`。
