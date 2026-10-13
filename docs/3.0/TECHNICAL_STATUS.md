# M0 技术协调状态

更新时间：2026-10-13。状态取自本机/GitHub 快照，不读取或推断其他 Codex 聊天内容。

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
| M1 | `feature/ac3-security-core` | `60428ed` | 比初始基线新增 3 个本地提交，改动 Hook、Gateway、测试及审计报告 | WSL Git worktree |
| M2 | `feature/ac3-execution-isolation` | `6b39c3c` | Windows execution isolation prototype 已提交；AC3 基线上 1 个提交，工作树干净 | WSL Git worktree |
| M3 | `feature/ac3-agent-onboarding` | `8fd4e4f` | AC3 头是 merge-base，两个 onboarding 提交已同步远端；旧 main-based 快照保留在 backup 分支 | Windows Git worktree |
| M4 | `feature/ac3-desktop-security-center` | `62496d4` | M0 新建空 worktree；M4 现已恢复任务，最新观察时工作树干净 | Windows Git worktree |
| M5 | `feature/ac3-policy-audit` | `053b330` | AC3 基线上 2 个本地提交，策略、文档、测试与 manifest 已提交；当前工作树干净 | WSL Git worktree |
| M6 | `feature/ac3-e4-validation` | `da52c17` | 3 个 commit ahead of main，已同步模块远端；包含 `package.json`、E4 验证与报告 artifact，工作树干净 | Windows Git worktree |
| M7 | `feature/ac3-reliability` | `9d316fe` | AC3 基线上 1 个本地提交，涉及 Windows packaging、Gateway、测试和 manifest；当前工作树干净 | WSL Git worktree |
| M8 | `feature/ac3-open-source-product` | `62496d4` | README、SECURITY、贡献/支持文档、GitHub 模板和入门/兼容性文档有未提交修改/新增 | WSL Git worktree |
| M0 | `feature/ac3-m0-coordination` | 滚动 | 协调文档、检查工作流和脚本已推送至 Draft PR #30 | Windows Git worktree |
| M9 | `feature/ac3-m9-integration` | `62496d4` | 集成计划 | Windows Git worktree |

比较 AC3 与 main 基线：AC3 独有 46 个 commit，main 独有 4 个。M3 当前为 `8fd4e4f`（工作树干净并已同步远端），merge-base 正好为 AC3 头 `62496d4`，相对 AC3 左右计数 0/2；其旧 main-based 快照 `cf42dde` 保留在 `backup/ac3-agent-onboarding-main-base`。M6 为 `da52c17`（已同步远端、工作树干净），相对 AC3 仍为 46/7，基线待协调；共同历史基点为 `73cfdf9`。M4/M0/M9 新建 worktree 同源于 `62496d4`。工作目录/index 独立；WSL 创建的工作树由 WSL Git 使用，Windows 创建的工作树由 Git for Windows 使用，用另一运行环境查看会把外部绝对路径显示为 prunable。

## GitHub 协作

- [Issue #27](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/27)：M3/M6 基线与 M3/M5/M6/M7 manifest 冲突，OPEN。
- [Issue #28](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/28)：M1/M7 Gateway 冲突，OPEN。
- [Issue #32](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/32)：Windows Node 20 Hook interruption 曾间歇失败、两次通过后再次失败；当前失败与根因未确认均记录在 OPEN 的 #32。
- `.github/workflows/ci.yml` 在 PR 自动跑构建/测试/打包/容器/sponsor 检查。本 PR 加入协作字段与接口冲突 gate；未核实 branch protection 是否强制这些 check。
- Codex Desktop Connector 未暴露 `read_thread`、`wait_threads` 或 `send_message_to_thread`。M0 本轮读取了这 8 个任务在本机保存的会话记录，并通过 `codex queue` 恢复任务：M1/M2/M4 当前 `inProgress`，占用 3 个开发槽；M3/M5/M6/M7/M8 收到仅登记排队状态、不修改文件的消息。M3/M5/M6/M8 已在 #29 登记 QUEUED；M7 状态登记待回。线程状态来自本机 `thread_history` 快照，代码状态仍以实际 worktree/GitHub 为准。当前没有 VMware、真实模型或安装测试资源申请。

PR [#30](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/30) 为 OPEN、Draft、mergeable，base `feature/agent-canary-3.0`，当前 head `1ddcd56`。当前全绿 run `38375363932` 的 10 项 CI 检查通过，包含 Windows Node 20 和 package-smoke；协调 gate `38375650524` 通过。Issue #32 仍 OPEN：此前存在 Windows Node 20 Hook interruption 间歇失败，根因仍需 M1 复核；不因最新 CI 通过而关闭，PR 保持 Draft。

## M0 交付边界

已建立 `main/`（AC3 detached 基线快照）、`agents/M1–M8`、`coordinator/`、`integration/`、`reports/`、`logs/`。根仓库 `main` checkout 保持原状。M0 未改 M1–M8 源码，未合并 main，未发布 Release。WSL 与 Windows 工作树各由对应 Git runtime 读取；交叉 runtime 会显示不兼容指针为 `prunable`，没有执行 `repair/prune`。
