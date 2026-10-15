# Hook 故障矩阵

审计日期：2026-10-13。验证对象包括 src/agent-hook.ts 的决策逻辑、security-lab/claude-native-hook.mjs wrapper 以及隔离临时目录中的合成输入。没有把决策函数测试等同于真实 Claude/Cursor 宿主加载验证。

| 故障/状态 | 观察到的处理 | 验证状态 | 边界 |
| --- | --- | --- | --- |
| 输入为空、JSON 格式错误或超过输入上限 | wrapper 的顶层异常路径返回 PreToolUse deny | 已自动验证 | 仅 wrapper 已启动时有效 |
| workspace/state/log 参数不是绝对路径 | 顶层校验失败，deny | 代码路径已审计 | 未向宿主证明进程能启动 |
| Hook 模块文件缺失或动态导入失败 | wrapper 捕获异常并输出 deny | 合成缺失模块回归通过 | 不是“wrapper 本身未安装/未启动” |
| decideAgentHook 抛异常 | wrapper 捕获异常并输出 deny | 合成抛错模块回归通过 | 真实宿主调用仍需匹配 Hook 配置 |
| Hook 返回空值或错误协议结构 | isHookDecision 校验失败并 deny | 合成非法返回回归通过 | 不把未知字段当授权 |
| Hook 决策超过 wrapper 2 秒预算 | wrapper 输出固定 deny | 自动计时回归通过，约 2 秒返回 | 宿主外部硬杀进程不走此代码分支 |
| JSONL 证据路径不可写 | append 失败被顶层捕获，最终 deny | 将目录作为日志目标的回归通过 | 可能已有部分文件写入；当前记录不含工具输入 |
| wrapper 进程在返回决定前被杀 | 修订测试等待合成 Hook-entry marker，再主动终止 wrapper；无 allow 输出、stderr 或决策日志 | 历史 Node 20.20.2 本地连续 15/15 通过。2026-10-13 复现当前 harness 竞态：父进程 marker 后延迟 2.5 秒时，wrapper 自身 2 秒计时器先输出固定 deny 并以 code 0 退出。测试夹具现于 marker 后阻塞子进程事件循环 30 秒，回归再故意等待 2.5 秒后 kill；Node 20.20.2 与 22.23.1 各 1/1 通过，记录 `spawnError=null`、`code=null`、`signal=SIGTERM`、stdout/stderr 为空、marker=true。历史 CI run 缺少等价诊断，是否由该竞态导致仍 `UNKNOWN` | 这是测试 harness 的自然超时与外部中断竞态，不是 Hook 放行缺陷；测试仍严格要求外部 kill、无 allow/决策日志。原 1 秒 `spawnSync` 失败也不能据此确定根因。本地 fixture 不等同真实 Claude 宿主，工具能否继续仍取决于宿主 `onFailure` 行为 |
| canary 命中后 Hook 再次调用 | workspace-bound 隔离标记让后续决定 deny | 多 Guard 实例/新 session/状态容量/锁争用回归通过 | 只针对实际调用此 Hook 的匹配工具 |
| wrapper/Node 未安装、命令启动失败、Hook 被禁用、Claude --bare、工具未被 matcher 覆盖 | 没有 wrapper 决策 | 未验证为 fail-closed | 必须依赖 Claude 的宿主配置 onFailure:block；该宿主端到端配置未核验 |
| Cursor 未实际加载 Hook | 本仓库只返回 Cursor 决策协议 | 宿主集成未验证 | 不宣称 Cursor 原生 Shell 或其他工具受保护 |

## 敏感日志检查

修复前 wrapper 将 tool_name、tool_input 与完整 decision 对象落入 JSONL。回归使用合成标记 NOT_A_REAL_CREDENTIAL_HOOK_LOG_FIXTURE 复现。当前记录只包含 timestamp、固定事件名 PreToolUse 和枚举 permissionDecision；测试断言合成标记不在日志中。

## Issue #32 续作记录

失败 run `38374902576` 的超时断言通过，marker 断言失败；该 run 未保留 child stdout/stderr，无法证明根因。测试现已改为“等入口 marker → 主动中断 → 检查退出/输出/日志”，保持“不产生 allow 决定”的 fail-closed 断言。修订版本的本地 Windows Node 20.20.2 连续 15 次通过；Issue #32 保持 OPEN，直到该版本的新 Windows CI 给出结果。

PR #39 run `38415887207` 的 Windows Node `22.23.3` job 仍运行旧 `spawnSync` 一秒超时测试：`ETIMEDOUT` 断言通过，随后 marker 为 false。旧 PR #38 路径也相同。2026-10-13 在 Windows Node `22.23.1` 对 PR #39 head 旧用例复测 `2/2`、当前 M1 marker-handshake 用例 `1/1`，均通过，未复现该 CI 时序。综合证据，此次失败更像旧测试夹具/基线差异（推断），根因仍为 `UNKNOWN`；commit `46af1f19344dffe93a30817c4805eec0c6c673fe` 是确定性测试夹具修复，已在 PR #43 远端 head 的祖先链中，不是运行时修复证据。#32 保持 OPEN，等待集成分支重新验证。

### PR #43 当前头验证（2026-10-13）

M0 于 16:02:40 UTC 推送 `dc4d7fa`、`89e40cd` 后，PR #43 当前提交 `89e40cd18fdae56124dfcbf54a6cacbdb850ff2c` 的 CI run [38427313208](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38427313208) 完成并成功。Windows Node 20/22 job `115399969526`、`115399969339` 的 `npm test` 均通过；六个 Windows、Ubuntu、macOS Node 20/22 测试矩阵及各自 build 均通过。测试夹具的历史 hosted-runner 时序仍未完全复原，故历史失败的精确根因保持 `UNKNOWN`；本次集成头验证满足此前等待的新 Windows CI 条件。读取时 Issue #32 仍为 OPEN，未通过本轮操作修改远端状态。

### PR #43 当前头 CI 复核（2026-10-14）

GitHub 将 CI run `38522973084` 关联到 PR #43 精确 head `f59ba37c2fd9d1b5e181e067f80981f8920ef16a`；该 Draft PR 仍为 OPEN。全部 9 个 job 成功。Windows Node 20 job `115716696322`（Node `20.20.2`）与 Windows Node 22 job `115716696306`（Node `22.23.3`）均完成 build 和 `npm test`，各报告 340 项、336 通过、0 失败、4 跳过。中断用例在两 job 均通过；诊断均为 `spawnError=null`、`exit={code:null,signal:"SIGTERM"}`、stdout/stderr 为空、`marker=true`。修订测试仍检查无 allow 决定、无输出/决策日志且不调用工具回调。

历史失败根因分类：`PLAUSIBLE`（Windows runner 启动/调度与旧测试夹具的时序竞争）。失败 job `115684062592`（run `38512532532`）仍执行旧测试，在 marker 断言得到 `false !== true`；旧日志没有保留进程/marker 全量诊断，不能证明精确历史时序。当前绿色 CI 证明修订 head 的回归通过，不构成历史根因已确认的证明。Issue #32 保持 OPEN，等待 M9 合并候选基线复验；没有更改远端 issue 状态。

## Fail-closed 结论

仅当 Claude 实际启动配置好的 PreToolUse wrapper，wrapper 执行到返回结果，且宿主把 deny 视为阻断时，才能确认此路径 fail-closed。模块加载失败、Hook 回调异常、非法返回、wrapper 内超时和日志错误都在此路径内返回 deny。Hook 进程本身未加载/启动失败/被外部杀死的 fail-closed 取决于宿主 onFailure:block；本次未验证该外部配置。因此不宣称保护所有原生 Shell 操作或未接入的工具。
