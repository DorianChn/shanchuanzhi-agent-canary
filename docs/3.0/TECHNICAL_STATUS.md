# M0 技术协调状态

## 当前状态（2026-10-13 12:15 UTC；实时快照）

- PR #24：OPEN/Draft，base competition/shanchuanzhi-release-readiness，head 62496d4，11/11 checks 成功；M0 未改动或合并。
- M0 PR #30：OPEN/Draft，head 1648277；CI run 38395605172 的 Windows Node 20 Hook interruption 用例失败，Node 22 job 被取消、package-smoke 跳过；其余 jobs 与两个 coordination gate 成功。Issue #32 仍 OPEN。
- PR #31：OPEN/Draft，base main、远端 head da52c17；原 run 38371562917 的 package-smoke 失败。M6 本地 commit 899dbf5 修正 SOURCE_MANIFEST.json 的 package.json 哈希；181 项 Git-tree 本地验证 0 mismatch，但修复未推送、远端 CI 未重跑。
- M2 PR #37：OPEN/Draft、AC3 base，9/9 checks 成功；原生 Codex Shell 仍 UNPROTECTED。
- M3 PR #33：OPEN/Draft、AC3 base，无远端 checks；本地四个 onboarding/install 测试文件 29/29、build 与 diff check 通过，工作树干净；本轮未重跑 live connect-check。
- M4 PR #34：OPEN/Draft、AC3 base，9/9 checks 成功；桌面安全中心/E4 后端 404 仍标 UNKNOWN。
- M9 PR #36：OPEN/Draft、AC3 base，9/9 checks 成功。
- M1 本地提交 f15fdcfa 和 46af1f1；Gateway suite 28/28，Hook harness 定向测试在 Node 20.20.2/22.23.1 各 1/1。PR #30 的失败 head 不含 46af1f1；历史 CI 根因仍待 owner 分析及远端复验。
- M5 本地 commit cd8abea：策略审计语义修复，42/42 定向测试、TypeScript noEmit、diff check 通过；无新远端 PR。
- M6 AC3 候选含 bca895f E4 外部副本完整性修复；fixture evidence 仍 NOT_VERIFIED。PR #31 旧分支修复与 AC3 候选分属不同 worktree。
- M7 本地 commit f17b7e6；候选对 AC3 的 gateway.ts 净差异为零，可靠性/evidence 覆盖保留；84 项中 83 pass、0 fail、1 symlink-permission skip。M1 close commit 未并入，组合 CI 待集成。
- M8 本地 commit b0f30ff 更新中英文 README 限制说明，14 文档/55 链接/13 示例及双语核对通过；未推送。
- 当前开发槽 0/3；M1、M3、M6、M7 已结束本轮工作。VMware、真实模型与安装测试未运行。
- Issues #27/#28/#29/#32/#35 已更新；模块 owner 的本地提交未发布为新远端 PR，M0 不代替模块推送。
- 本地报告为 reports/M0_INITIALIZATION_REPORT.md。未合并 main、未修改其他模块代码、未发布 Release。

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
| M1 | `feature/ac3-security-core` | `ec3bc96` | 本地 P0 修复已提交、聚焦 63/63；远端分支/PR 未创建，交付 BLOCKED | WSL Git worktree |
| M2 | `feature/ac3-execution-isolation` | `a1c239d` | 隔离原型与证据已提交；原生 Shell 仍为 `UNPROTECTED`，没有 Draft PR | WSL Git worktree |
| M3 | `feature/ac3-agent-onboarding` | `8fd4e4f` | AC3 头是 merge-base，两个 onboarding 提交已同步远端；旧 main-based 快照保留在 backup 分支 | Windows Git worktree |
| M4 | `feature/ac3-desktop-security-center` | `fe2c973` | PR #34 头一致、当前 run 全绿；工作树干净 | Windows Git worktree |
| M5 | `feature/ac3-policy-audit` | `6e2730a` | 工作树干净，领先 AC3 跟踪基线 3 个提交；远端发布被 WSL 凭据阻塞 | WSL Git worktree |
| M6 | `feature/ac3-e4-validation` | `da52c17` | 3 个 commit ahead of main，已同步模块远端；包含 `package.json`、E4 验证与报告 artifact，工作树干净 | Windows Git worktree |
| M7 | `feature/ac3-reliability` | `9c05286` | 工作树干净，领先 AC3 跟踪基线 2 个提交；远端发布被 WSL 凭据阻塞；缺 `makensis.exe` | WSL Git worktree |
| M8 | `feature/ac3-open-source-product` | `129ab65` | 两个本地文档提交、工作树干净；无远端 M8 PR/Release | WSL Git worktree |
| M0 | `feature/ac3-m0-coordination` | 滚动 | 协调文档、检查工作流和脚本已推送至 Draft PR #30 | Windows Git worktree |
| M9 | `feature/ac3-m9-integration` | `c9b9190` | 集成计划已在 PR #36 保持 Draft；当前 CI 9/9 通过，旧失败归入 #32 | Windows Git worktree |

比较 AC3 与 main 基线：AC3 独有 46 个 commit，main 独有 4 个。M3 当前为 `8fd4e4f`（工作树干净并已同步远端），merge-base 正好为 AC3 头 `62496d4`，相对 AC3 左右计数 0/2；其旧 main-based 快照 `cf42dde` 保留在 `backup/ac3-agent-onboarding-main-base`。M6 为 `da52c17`（已同步远端、工作树干净），相对 AC3 仍为 46/7，基线待协调；共同历史基点为 `73cfdf9`。M4/M0/M9 新建 worktree 同源于 `62496d4`。工作目录/index 独立；WSL 创建的工作树由 WSL Git 使用，Windows 创建的工作树由 Git for Windows 使用，用另一运行环境查看会把外部绝对路径显示为 prunable。

## GitHub 协作

- [Issue #27](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/27)：M3/M6 基线与 M3/M5/M6/M7 manifest 冲突，OPEN。
- [Issue #28](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/28)：M1/M7 Gateway 冲突，OPEN。
- [Issue #32](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/32)：Hook interruption 子测试曾在 PR #30 Windows Node 20 及 PR #34/#36 Windows Node 22 失败；之后的 #30/#36 CI 通过，M1 Windows Node 22 wrapper 5/5 未复现，根因仍 UNKNOWN，OPEN。
- `.github/workflows/ci.yml` 在 PR 自动跑构建/测试/打包/容器/sponsor 检查。本 PR 加入协作字段与接口冲突 gate；未核实 branch protection 是否强制这些 check。
- Codex Desktop Connector 未暴露 `read_thread`、`wait_threads` 或 `send_message_to_thread`。应用户许可，M0 只读本机 `thread_history` 并用 `codex queue` 调度；最新快照与 worktree/GitHub 对照为 M1/M6/M7 RUNNING，M3/M4/M5/M8 IDLE或本地完成。该本机快照不冒称调用 `read_thread`。

PR [#30](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/30) 为 OPEN/Draft，base `feature/agent-canary-3.0`，当前 head `5aa472b`；run `38386686083` 全 10 项通过、协调 gate `38386686046` 通过。更早的 Windows Node 20 失败仍留在 #32，PR 保持 Draft。

## M0 交付边界

已建立 `main/`（AC3 detached 基线快照）、`agents/M1–M8`、`coordinator/`、`integration/`、`reports/`、`logs/`。根仓库 `main` checkout 保持原状。M0 未改 M1–M8 源码，未合并 main，未发布 Release。WSL 与 Windows 工作树各由对应 Git runtime 读取；交叉 runtime 会显示不兼容指针为 `prunable`，没有执行 `repair/prune`。
