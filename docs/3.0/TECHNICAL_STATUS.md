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
| M2 | `feature/ac3-execution-isolation` | `62496d4` | `execution-isolation/` 未跟踪 | WSL Git worktree |
| M3 | `feature/ac3-agent-onboarding` | `146be17` | 新增 `src/agent-host-detection.ts` | Windows Git worktree |
| M4 | `feature/ac3-desktop-security-center` | `62496d4` | M0 新建空 worktree | Windows Git worktree |
| M5 | `feature/ac3-policy-audit` | `62496d4` | policy、文档、测试、`package.json` 有修改/新增 | WSL Git worktree |
| M6 | `feature/ac3-e4-validation` | `146be17` | `package.json` 修改，`security-lab/e4/` 未跟踪 | Windows Git worktree |
| M7 | `feature/ac3-reliability` | `62496d4` | Windows packaging、Gateway、测试和 `package.json` 有修改/新增 | WSL Git worktree |
| M8 | `feature/ac3-open-source-product` | `62496d4` | README、安全/贡献文档和 GitHub 模板有修改/新增 | WSL Git worktree |
| M0 | `feature/ac3-m0-coordination` | `62496d4` | 本协调文档和检查 | Windows Git worktree |
| M9 | `feature/ac3-m9-integration` | `62496d4` | 集成计划 | Windows Git worktree |

比较 AC3 与 main 基线：AC3 独有 46 个 commit，main 独有 4 个。没有移动/覆盖 M3/M6 的未提交内容。M4/M0/M9 新建 worktree 同源于 `62496d4`。worktree 共享对象库，但工作目录/index 独立。

## GitHub 协作

- [Issue #27](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/27)：M3/M6 基线与 M5/M6/M7 manifest 冲突，OPEN。
- [Issue #28](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/28)：M1/M7 Gateway 冲突，OPEN。
- `.github/workflows/ci.yml` 在 PR 自动跑构建/测试/打包/容器/sponsor 检查。本 PR 加入协作字段与接口冲突 gate；未核实 branch protection 是否强制这些 check。
- 当前工具没有 `read_thread`、`wait_threads` 或线程发送能力。八个线程的正文、承诺和实时任务数无法确认；文件系统与 GitHub Issue 是当前可验证协作依据。

PR [#30](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/30) 当前为 OPEN、Draft、mergeable，base `feature/agent-canary-3.0`。M0 协作 gate 与 PR CI 的 11 个 job（8 个跨平台测试、package smoke、Docker、sponsor smoke）均通过本次检查。

## M0 交付边界

已建立 `main/`（AC3 detached 基线快照）、`agents/M1–M8`、`coordinator/`、`integration/`、`reports/`、`logs/`。根仓库 `main` checkout 保持原状。M0 未改 M1–M8 源码，未合并 main，未发布 Release。WSL 工作树在 Windows Git 显示 `prunable`，但 WSL Git 可读取；未做 `repair/prune`，以免破坏现有 gitdir 指针。
