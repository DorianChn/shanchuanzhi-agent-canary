# M0 技术协调状态

## 当前状态（2026-10-13 11:56 UTC；以本快照与实时 GitHub/worktree 状态为准）

- PR #24：OPEN/Draft，base competition/shanchuanzhi-release-readiness，head feature/agent-canary-3.0 / 62496d4；11/11 checks 成功。M0 未改动、未合并。
- M0 PR #30：OPEN/Draft，AC3 base，head 3e32ccc；最近 CI run 38390302812 中 Windows Node 20 失败于 test/agent-hook.test.ts:54 的 Hook interruption 用例，其余 10 项成功，package-smoke 跳过；独立 ownership gate 38390835616 成功。P1 #32 保持 OPEN，根因 UNKNOWN。
- M6 PR #31：OPEN/Draft、base main、head da52c17；run 38371562917 的 8 项成功、package-smoke 失败（files:181,mismatches:[package.json]）。旧 PR 未改动；M6 正在自己的 AC3 候选 worktree 查因/修复。M6 E4 文件副本完整性修复已本地提交 bca895f。
- M2 PR #37：OPEN/Draft、AC3 base，9/9 checks 成功；原生 Codex Shell 仍为 UNPROTECTED，AppContainer 范围仅限已测试子进程操作。
- M3 PR #33：OPEN/Draft、AC3 base，当前没有 CI checks；HEAD 8fd4e4f。后续需补充聚焦本地验证/远端 CI 证据。
- M4 PR #34：OPEN/Draft、AC3 base，9/9 checks 成功；安全中心/E4 后端接口 404，产品状态继续标为 UNKNOWN。
- M9 PR #36：OPEN/Draft、AC3 base，9/9 checks 成功；最终集成门槛与风险排程已建立。
- M1 本地 Gateway close 修复 f15fdcfa 已提交，Gateway 聚焦测试 28/28、TypeScript build 和 diff check 通过；M1 正在定位 #32 Hook 中断失败。Node 20 在当前环境不可用；本地 Node 22 合成诊断尚不能证明历史 CI 根因。
- M5 本地策略审计语义修复 cd8abea 已提交；聚焦策略测试 42/42、TypeScript noEmit 和 diff check 通过。远端 Draft PR 仍未建立，WSL 凭据阻塞此前 push，未重试。
- M7 在自己的 AC3 候选 worktree 处理与 M1 close 生命周期的兼容性，当前活动中；没有改 M1 worktree。
- M8 双语 README 覆盖范围/限制说明已提交 b0f30ff；14 份文档、55 个本地链接、13 个示例检查及双语主题核对通过；本地干净，未推送。
- 开发槽 3/3：M1 #32、M6 #31 package-smoke、M7 Gateway 兼容。M8 已完成并释放槽。当前无 VMware、真实模型或安装测试占用。
- 工具面无原生 Codex read_thread；按用户授权读取本地 thread_history_1.sqlite 并用 codex queue 续作，再以 GitHub/worktree 交叉核对；不声称调用了原生工具。
- 协调文档工作区本轮尚待提交/同步至 PR #30；未合并 main、未改模块源码、未发布 Release。

## 历史状态快照（2026-10-13 11:25 UTC）

以下内容仅作为历史记录，不代表当前模块调度状态。

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
