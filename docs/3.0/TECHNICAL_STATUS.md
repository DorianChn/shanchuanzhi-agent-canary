# M0 技术协调状态

## 本轮最新状态（2026-10-13 10:49 UTC；覆盖下方较早快照）

- PR #24：OPEN/Draft，base `competition/shanchuanzhi-release-readiness`，head `feature/agent-canary-3.0` / `62496d4`；没有修改或合并。
- M0 PR #30：OPEN/Draft，head `3e9d8a3`。CI run `38383140906` 的 Windows Node 20 失败，`package-smoke` 被跳过；协调 gate run `38384013555` 通过。Issue #32 保持 OPEN。
- M3 PR #33：OPEN/Draft、AC3 base、head `8fd4e4f`。M4 PR #34：OPEN/Draft、head `0613057`；该 head 的 run `38385403836` 列出的 9/9 checks 全通过（Windows/macOS/Ubuntu Node 20/22、Docker、sponsor、package-smoke）。M4 本地全量测试 330 项中 325 pass、5 skip；一份最新状态报告仍由 M4 留在其工作树未提交。
- M9 PR #36：OPEN/Draft、AC3 base、head `28473cc`。run `38385128369` 的 Windows Node 22 再次失败于 `test/agent-hook.test.ts` 的 Hook interruption 子测试（`false !== true`）；package-smoke 被跳过，其余列出的 OS/Node、Docker、sponsor checks 通过。已归入 P1 Issue #32，不修改/删除该测试。
- M1 的 P0 修复已在本地 commit `ec3bc96`，Windows Node 20.20.2 下 4 个聚焦测试文件 63/63、TypeScript build 和 diff check 通过。它实现了同一 Guard 实例的同步 `subscribeQuarantine` 通知并更新了本契约；GitHub 上 M1 分支/PR 尚不存在。M1 自己确认停止远端尝试；Issue #35 保持 OPEN，待可信远端 Draft PR 与 CI。
- **开发槽 3/3：** M5（`6e2730a`，策略定向 41/41）和 M7（`9c05286`，40 pass、3 个 symlink 权限 skip）已由原模块线程恢复，分别进行一次有时限的远端 Draft PR 交接；M8 继续文档检查和静态编译、保留所有既有未提交改动且不发布 Release。M4 已 IDLE；M1 远端交付 BLOCKED，不占开发槽。
- M2 本地交付 `a1c239d` 已完成但无远端 Draft PR；原生 Shell 仍标 `UNPROTECTED`。M6 PR #31 仍以 `main` 为 base，受 #27 阻塞并排队。#27/#28/#32/#35 均 OPEN；#35 本地修复证据已登记但未关闭。
- 没有 VMware、真实模型或安装测试在运行；互斥资源槽空闲。M0 本轮未运行产品测试或修改模块源码。
- 当前工具集合没有 `read_thread`/`wait_threads`；经用户许可，M0 只读了本机 `thread_history` 并用 `codex queue` 续作，再与 GitHub/worktree 状态交叉核验；未声称调用 `read_thread`。

较早状态快照如下，仅供审计，不代表当前模块调度状态。

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
| M4 | `feature/ac3-desktop-security-center` | `0613057` | PR #34 头一致；owner 留有未提交 UI 状态报告 | Windows Git worktree |
| M5 | `feature/ac3-policy-audit` | `6e2730a` | 工作树干净，领先 AC3 跟踪基线 3 个提交；正在限时 Draft PR 交接 | WSL Git worktree |
| M6 | `feature/ac3-e4-validation` | `da52c17` | 3 个 commit ahead of main，已同步模块远端；包含 `package.json`、E4 验证与报告 artifact，工作树干净 | Windows Git worktree |
| M7 | `feature/ac3-reliability` | `9c05286` | 工作树干净，领先 AC3 跟踪基线 2 个提交；安装器测试未运行（缺 `makensis.exe`） | WSL Git worktree |
| M8 | `feature/ac3-open-source-product` | `62496d4` | README、SECURITY、贡献/支持文档、GitHub 模板和入门/兼容性文档有未提交修改/新增 | WSL Git worktree |
| M0 | `feature/ac3-m0-coordination` | 滚动 | 协调文档、检查工作流和脚本已推送至 Draft PR #30 | Windows Git worktree |
| M9 | `feature/ac3-m9-integration` | `28473cc` | 集成计划已在 PR #36 保持 Draft；Windows Node 22 测试失败归入 #32 | Windows Git worktree |

比较 AC3 与 main 基线：AC3 独有 46 个 commit，main 独有 4 个。M3 当前为 `8fd4e4f`（工作树干净并已同步远端），merge-base 正好为 AC3 头 `62496d4`，相对 AC3 左右计数 0/2；其旧 main-based 快照 `cf42dde` 保留在 `backup/ac3-agent-onboarding-main-base`。M6 为 `da52c17`（已同步远端、工作树干净），相对 AC3 仍为 46/7，基线待协调；共同历史基点为 `73cfdf9`。M4/M0/M9 新建 worktree 同源于 `62496d4`。工作目录/index 独立；WSL 创建的工作树由 WSL Git 使用，Windows 创建的工作树由 Git for Windows 使用，用另一运行环境查看会把外部绝对路径显示为 prunable。

## GitHub 协作

- [Issue #27](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/27)：M3/M6 基线与 M3/M5/M6/M7 manifest 冲突，OPEN。
- [Issue #28](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/28)：M1/M7 Gateway 冲突，OPEN。
- [Issue #32](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/32)：Hook interruption 子测试已在 PR #30 的 Windows Node 20 及 PR #34/#36 的 Windows Node 22 失败；最新 #36 run `38385128369` 再现 `false !== true`，根因未确认，OPEN。
- `.github/workflows/ci.yml` 在 PR 自动跑构建/测试/打包/容器/sponsor 检查。本 PR 加入协作字段与接口冲突 gate；未核实 branch protection 是否强制这些 check。
- Codex Desktop Connector 未暴露 `read_thread`、`wait_threads` 或 `send_message_to_thread`。应用户许可，M0 本轮只读了本机 `thread_history` 并用 `codex queue` 恢复 M5/M7；最新 thread-history 快照与 worktree/GitHub 对照为 M5/M7/M8 RUNNING、M4 IDLE，M1 远端交付 BLOCKED，M6 QUEUED。该本机快照不冒称调用 `read_thread`。

PR [#30](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/30) 为 OPEN/Draft，base `feature/agent-canary-3.0`，当前 head `3e9d8a3`。run `38383140906` 的 Windows Node 20 测试失败、`package-smoke` 跳过；协调 gate `38384013555` 通过。不能将 PR 标为 CI 全绿，PR 保持 Draft。

## M0 交付边界

已建立 `main/`（AC3 detached 基线快照）、`agents/M1–M8`、`coordinator/`、`integration/`、`reports/`、`logs/`。根仓库 `main` checkout 保持原状。M0 未改 M1–M8 源码，未合并 main，未发布 Release。WSL 与 Windows 工作树各由对应 Git runtime 读取；交叉 runtime 会显示不兼容指针为 `prunable`，没有执行 `repair/prune`。
