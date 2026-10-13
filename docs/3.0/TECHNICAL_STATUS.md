# M0 技术协调状态

## 当前状态（2026-10-13 12:56 UTC；实时快照）

- PR #24 仍 OPEN/Draft，base 为 competition/shanchuanzhi-release-readiness、head 62496d4；当前读取到的 CI 与 Windows wrapper runs 均成功，未修改或合并。
- M0 PR #30 为 OPEN/Draft，head 3d9168b；CI run 38397316692 失败，协调 gate run 38397316727 成功。Issue #32 的 Hook 失败仍未由该 M0 head 验证修复。
- M1 PR #43 为 OPEN/Draft，head d0fd595；run 38399797819 在 macOS Node 20 和 Ubuntu Node 22 失败于 honeypot quarantine 测试 217（`GATEWAY_EXECUTION_FAILED_EFFECTS_NOT_ROLLED_BACK`）。M1 owner 本地复现显示 quarantine 已 abort dispatch、敏感读取结果未返回、写入标记不变且后续写入被拒；本次是测试预期与 fail-closed 契约不一致，未确认新的产品缺陷。M1 只修正自有测试断言，34/34 Node 22 通过；等待本地提交与当前 PR head 的远端 CI。Issue #35 的历史 P0 复现仍单独保持 OPEN。
- M2 PR #37、M4 PR #34、M9 PR #36：OPEN/Draft，AC3 base，最新读取到的 CI runs 成功。原生 Codex Shell 仍 UNPROTECTED；桌面安全中心/E4 后端 404 仍 UNKNOWN。
- M3 PR #33：OPEN/Draft，head c404b6b；GitHub Actions run 38400488378 的 9 项检查通过。M3 线程已空闲，工作树干净；历史 manifest 差异属于旧 head，不作为当前 AC3 manifest 缺陷。Issue #42 的正文需在下次远端批次中更正。
- M5：分支 `feature/ac3-policy-audit`，本地 HEAD 9ec08d9，干净且领先 AC3 基线 5 个提交；已准备 PR 标题/正文与 ref，没有远端 PR。M5 线程已停在安全点，待下一上传窗口。
- M6 PR #38：OPEN/Draft，head bca895f；CI run 38397135538 失败，M6 外部证据仍为 NOT_VERIFIED，根因未归属前不关闭相关 issue。
- M7 PR #39：OPEN/Draft，远端仍在 f17b7e6；CI runs 38397157815/38397158016 失败。owner 本地候选 65ce028，正在核实修复并准备一次上传；不变更凭据。
- M8 PR #40：OPEN/Draft，head b0f30ff；CI run 38397180263 成功。该 SHA 已在 PR head，故不是待上传分支。
- 并行上限已按用户要求降到 2：M1 与 M7 当前工作；M3/M5 已停在安全点。没有 VMware、真实模型或安装测试在运行。
- 最近一次模块分支更新约为 12:52 UTC。下一批 push 不早于 13:12 UTC；届时合并已完成的独立分支上传与协调文档/Issue 更新，失败的分支保持单独状态，不相互合并。
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
