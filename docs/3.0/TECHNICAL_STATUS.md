# M0 技术协调状态

## 当前状态（2026-10-13 15:43 UTC；实时快照）

- PR #24：OPEN/Draft，base `competition/shanchuanzhi-release-readiness`，head `62496d4`，未合并；当前查看的 11 项 CI 全通过。
- M0 PR #30：OPEN/Draft，local/remote head `1179ed1`；当前头 CI 10/10 通过（含 ownership/contract gate）。前一 run `38421264751` 的 macOS Node22 job 曾因 runner_id=0、无步骤日志而被取消，package-smoke 跳过；按 runner 分配结果未知保留历史。下一次推送最早为 16:02 UTC，或距更新后的最新 GitHub push 满 20 分钟（取较晚者）。
- M1：占用 2 个并发槽中的 1 个。PR #43 远端 head `d0fd595`；本地 HEAD `dc4d7fa`，工作树有安全回归证据编辑。M1 正按优先级处理 #35 P0、#44 与 #32 P1；Gateway/Guard API 仍由 M1 独占。修复尚未由远端 PR/CI 验证。
- M7：占用另 1 个并发槽。PR #39 远端 head `65ce028`；本地 HEAD `68e7caa`，`INSTALLER_ACCEPTANCE.md` 与 `test/reliability.test.mjs` 有进行中的改动。#41 P1 仍 OPEN，PR #39 仍有跨平台 CI 失败待修；M7 只处理其安装/可靠性所有权路径，不改共享 Gateway。
- M2：PR #37 OPEN/Draft，检查通过；Codex 原生 Shell 仍为 `UNPROTECTED`。P1 Issue #45 已建立，M2 等待 M1/M7 释放槽位后处理。
- M3：PR #33 9/9 检查通过；M4：PR #34 当前检查通过；M8：PR #40 9/9 通过；均保持 IDLE。
- M5：本地分支 clean、5 commits ahead，尚无远端分支或 Draft PR；等待并发槽和合批推送安排。
- M6：PR #38 外部 E4 仍 `NOT_VERIFIED`，Windows Node22 有待归属/回归的 Hook CI 失败；M9：PR #36 的集成门禁基线 9/9 通过。M6 保持 IDLE，证据不能替代外部 E4 运行。
- 当前开发并发为 M1 + M7（2/2）。额度页面最近明确读数为 13%，约 1 小时 45 分钟后重置；M0 会话监看脚本每 60 秒读取一次。无 VMware、真实模型、安装测试预约；未合并 main、未发布 Release。
- 本节为当前权威快照；其后旧矩阵/审计记录保留作历史证据，时间以各记录内标注为准。
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
| M1 | feature/ac3-security-core | dc4d7fa | 本地回归证据正在编辑；远端 PR #43 仍 d0fd595，#35/#44/#32 未闭环 | WSL Git worktree |
| M2 | `feature/ac3-execution-isolation` | `a1c239d` | PR #37 OPEN/Draft，9/9 checks；隔离原型与证据已提交，原生 Shell 仍为 `UNPROTECTED` | WSL Git worktree |
| M3 | `feature/ac3-agent-onboarding` | `c404b6b` | PR #33 9/9 checks；M3 API 契约已写入；旧 main-based 快照保留在 backup 分支 | Windows Git worktree |
| M4 | `feature/ac3-desktop-security-center` | `fe2c973` | PR #34 头一致、当前 run 全绿；工作树干净 | Windows Git worktree |
| M5 | feature/ac3-policy-audit | 9ec08d9 | clean、merge-base 62496d4、5 commits ahead；14:20 单次 push exit1/no output；remote branch 404 | WSL Git worktree |
| M6 | feature/ac3-e4-validation-ac3 (另有旧 PR #31 分支) | bca895f | PR #38 旧 Hook 测试本地 Windows Node22 5/5；远端 marker failure 未复现；未改代码，外部 E4 NOT_VERIFIED | Windows Git worktree |
| M7 | `feature/ac3-reliability-ac3` | `68e7caa` | PR #39 远端 65ce028；本地 INSTALLER_ACCEPTANCE.md 正编辑，Issue #41 OPEN | WSL Git worktree |
| M8 | `feature/ac3-open-source-product` | `b0f30ff` | PR #40 当前 head，9/9 checks 通过；未发布 Release | WSL Git worktree |
| M0 | feature/ac3-m0-coordination | 1179ed1 | PR #30 OPEN/Draft，current head 10/10 CI passed; quota/status docs refreshed | Windows Git worktree |
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

PR [#30](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/30) 仍 OPEN/Draft，base `feature/agent-canary-3.0`，远端 head `1179ed1`。当前头检查 10/10 通过。上一头 `0091759` 的 run `38421264751` 中 macOS Node22 job 等待 15 分钟后被取消，`runner_id=0` 且无步骤日志；`package-smoke` 跳过，故仅记为 runner 分配结果未知。

## M0 交付边界

已建立 `main/`（AC3 detached 基线快照）、`agents/M1–M8`、`coordinator/`、`integration/`、`reports/`、`logs/`。根仓库 `main` checkout 保持原状。M0 未改 M1–M8 源码，未合并 main，未发布 Release。WSL 与 Windows 工作树各由对应 Git runtime 读取；交叉 runtime 会显示不兼容指针为 `prunable`，没有执行 `repair/prune`。
