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
| wrapper 进程在返回决定前被杀 | 修订测试先等待合成 Hook-entry marker，再主动终止 wrapper；无 allow 输出、stderr 或决策日志 | Windows Node 20.20.2 本地连续 15/15 通过；旧 CI 失败 run 的 marker 为 false，但历史根因 `UNKNOWN / BLOCKED` | 原 1 秒 `spawnSync` 预算包含进程启动/模块导入；本地测试不等同真实 Claude 宿主，工具能否继续仍取决于宿主 `onFailure` 行为 |
| canary 命中后 Hook 再次调用 | workspace-bound 隔离标记让后续决定 deny | 多 Guard 实例/新 session/状态容量/锁争用回归通过 | 只针对实际调用此 Hook 的匹配工具 |
| wrapper/Node 未安装、命令启动失败、Hook 被禁用、Claude --bare、工具未被 matcher 覆盖 | 没有 wrapper 决策 | 未验证为 fail-closed | 必须依赖 Claude 的宿主配置 onFailure:block；该宿主端到端配置未核验 |
| Cursor 未实际加载 Hook | 本仓库只返回 Cursor 决策协议 | 宿主集成未验证 | 不宣称 Cursor 原生 Shell 或其他工具受保护 |

## 敏感日志检查

修复前 wrapper 将 tool_name、tool_input 与完整 decision 对象落入 JSONL。回归使用合成标记 NOT_A_REAL_CREDENTIAL_HOOK_LOG_FIXTURE 复现。当前记录只包含 timestamp、固定事件名 PreToolUse 和枚举 permissionDecision；测试断言合成标记不在日志中。

## Issue #32 续作记录

失败 run `38374902576` 的超时断言通过，marker 断言失败；该 run 未保留 child stdout/stderr，无法证明根因。测试现已改为“等入口 marker → 主动中断 → 检查退出/输出/日志”，保持“不产生 allow 决定”的 fail-closed 断言。修订版本的本地 Windows Node 20.20.2 连续 15 次通过；Issue #32 保持 OPEN，直到该版本的新 Windows CI 给出结果。

## Fail-closed 结论

仅当 Claude 实际启动配置好的 PreToolUse wrapper，wrapper 执行到返回结果，且宿主把 deny 视为阻断时，才能确认此路径 fail-closed。模块加载失败、Hook 回调异常、非法返回、wrapper 内超时和日志错误都在此路径内返回 deny。Hook 进程本身未加载/启动失败/被外部杀死的 fail-closed 取决于宿主 onFailure:block；本次未验证该外部配置。因此不宣称保护所有原生 Shell 操作或未接入的工具。
