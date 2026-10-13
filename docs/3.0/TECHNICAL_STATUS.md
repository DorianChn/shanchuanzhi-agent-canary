# M0 技术协调状态

## 当前状态（2026-10-13 14:33 UTC；GitHub 与 owner 快照）

- PR #24 仍 OPEN/Draft，base `competition/shanchuanzhi-release-readiness`、head `62496d4`；9 项 CI 与 2 项 wrapper 检查全部通过，未修改或合并。
- M0 PR #30 为 OPEN/Draft，远端 head f2f2d10；run 38412534723 在 Ubuntu Node20 的 gateway approval-expiry 子测试失败（321 pass/1 fail/4 skip，requestId undefined），其他矩阵项被 fail-fast 取消；build、Docker、sponsor 通过，package-smoke skipped。正文刷新触发的 ownership/contract gate run 38413966169 通过。P1 Issue #44 已交 M1 精确源版本诊断。
- M1 PR #43 远端 head 仍为 d0fd595；其唯一推送尝试在约51秒后 exit1、无输出，远端未更新且未重试。M1 本地 dc4d7fa 为单个 M1-owned honeypot 测试断言提交，Windows Node22 定向套件34/34、diff-check pass。#32 仍 UNKNOWN：M1当前 async 路径10/10、M6对 PR #38 旧 spawnSync/1秒路径5/5，但均未复现远端 marker 缺失。#35 P0 OPEN；M1正调查#44。
- M2 PR #37 为 OPEN/Draft，9/9 检查通过；原生 Codex Shell 仍 UNPROTECTED。
- M3 PR #33 head `c404b6b`，run `38400488378` 为 9/9，PR 含 owner 编写的 onboarding API 契约。Issue #42 已根据当前 head 的 package-smoke 与契约验收证据关闭为 completed；跨模块 manifest 协调继续由 #27 跟踪。
- M4 PR #34 与 M9 PR #36 当前各 9/9 检查通过；桌面安全中心/E4 后端 404 仍 UNKNOWN。
- M5 feature/ac3-policy-audit 为 clean HEAD 9ec08d9、AC3 merge-base 62496d4、5 commits ahead；14:20 唯一普通 push 约26秒后 exit1、无输出。GitHub 仍无远端分支或 Draft PR；没有重试或更改凭据。
- M6 PR #38 head bca895f；Windows Node22 失败仍属于 M1-owned Hook test/agent-hook.test.ts:54。M6 对 bca895f 的旧实现本地定向5/5通过，但未复现远端 marker 缺失；未改代码，保留未跟踪 E4 证据目录，外部 E4 仍 NOT_VERIFIED。
- M7 PR #39 远端仍为 `f17b7e6`，Ubuntu/Windows wrapper 与 macOS/Windows 矩阵有失败。Owner 候选 `65ce028`；M7 正在复核确切失败日志和本地测试，下一次上传最早14:40；Issue #41 OPEN。
- M8 PR #40 head `b0f30ff`，9/9 检查通过。
- M1 与 M7 两项任务各占一个槽，当前2/2：M1处理P1 #44，M7复核PR #39候选。M5上传尝试完成并释放槽位；M6旧版本复现完成。没有 VMware、真实模型或安装测试预约；下一批push不早于14:40 UTC。
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
| M1 | feature/ac3-security-core | dc4d7fa | PR #43 remote d0fd595; one push exit1/no output; local gateway+honeypot 34/34; #32 UNKNOWN, #35 OPEN, #44 diagnosis active | WSL Git worktree |
| M2 | `feature/ac3-execution-isolation` | `a1c239d` | PR #37 OPEN/Draft，9/9 checks；隔离原型与证据已提交，原生 Shell 仍为 `UNPROTECTED` | WSL Git worktree |
| M3 | `feature/ac3-agent-onboarding` | `c404b6b` | PR #33 9/9 checks；M3 API 契约已写入；旧 main-based 快照保留在 backup 分支 | Windows Git worktree |
| M4 | `feature/ac3-desktop-security-center` | `fe2c973` | PR #34 头一致、当前 run 全绿；工作树干净 | Windows Git worktree |
| M5 | feature/ac3-policy-audit | 9ec08d9 | clean、merge-base 62496d4、5 commits ahead；14:20 单次 push exit1/no output；remote branch 404 | WSL Git worktree |
| M6 | feature/ac3-e4-validation-ac3 (另有旧 PR #31 分支) | bca895f | PR #38 旧 Hook 测试本地 Windows Node22 5/5；远端 marker failure 未复现；未改代码，外部 E4 NOT_VERIFIED | Windows Git worktree |
| M7 | `feature/ac3-reliability-ac3` | `65ce028` | 本地候选 clean；PR #39 远端 `f17b7e6` CI 失败；正在映射失败日志并验证候选，#41 OPEN | WSL Git worktree |
| M8 | `feature/ac3-open-source-product` | `b0f30ff` | PR #40 当前 head，9/9 checks 通过；未发布 Release | WSL Git worktree |
| M0 | feature/ac3-m0-coordination | f2f2d10 | PR #30 14:20 文档推送成功；run 38412534723 的 Ubuntu Node20 approval-expiry 测试失败；gate 38413966169 通过；Issue #44 OPEN | Windows Git worktree |
| M9 | `feature/ac3-m9-integration` | `996073a` | 集成计划在 Draft PR #36；9/9 checks 通过 | Windows Git worktree |

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

PR [#30](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/30) 仍 OPEN/Draft，base `feature/agent-canary-3.0`，当前 GitHub head `f2f2d10`；run `38412534723` 在 Ubuntu Node20 的 approval-expiry 子测试失败，详见 P1 Issue #44。PR 描述于14:28 UTC刷新，ownership/contract gate `38413966169` 通过。

## M0 交付边界

已建立 `main/`（AC3 detached 基线快照）、`agents/M1–M8`、`coordinator/`、`integration/`、`reports/`、`logs/`。根仓库 `main` checkout 保持原状。M0 未改 M1–M8 源码，未合并 main，未发布 Release。WSL 与 Windows 工作树各由对应 Git runtime 读取；交叉 runtime 会显示不兼容指针为 `prunable`，没有执行 `repair/prune`。
