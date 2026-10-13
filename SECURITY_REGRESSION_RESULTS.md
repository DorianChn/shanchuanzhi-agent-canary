# 安全回归结果

运行日期：2026-10-13。所有安全回归使用 Node 测试临时目录、合成文件/标记和本机 127.0.0.1 sink；没有发送真实网络请求或使用真实凭据。

## 已证实缺陷与最小回归

| ID | 最小复现 | 修复后结果 |
| --- | --- | --- |
| SEC-01 Hook 参数日志泄露 | 向隔离 Hook wrapper 输入含 NOT_A_REAL_CREDENTIAL_HOOK_LOG_FIXTURE 的普通 Read 参数，再检查 JSONL | Hook 决策仍按预期返回；JSONL 不含合成标记，只记录固定决策元数据 |
| SEC-02 嵌套 MCP canary 未隔离活动 Gateway | 先启动会等待的合成 MCP callback，再通过外层 mcp_tool 调用内层 canary_read_secrets | Guard 立即进入 QUARANTINED；活动 callback 收到 abort 且未写副作用；decoy callback 未执行；后续受控调用拒绝 |
| SEC-03 Gateway close 后已排队写入仍可执行 | 一个受控 callback 保持运行，同时排入临时目录 write_file，再调用 close | 运行调用被取消；排队写入拒绝；合成文件内容仍为 before |
| SEC-04 取消无法及时结束非合作的 review/callback | provider 或 callback 忽略信号并停留在合成 Promise，调用方随后 abort | dispatch 在 provider/callback 释放前即可拒绝返回；callback 的 signal 已 aborted；此回归中的合作检查未产生副作用 |

## 原有安全链验证

- 策略拒绝之后没有文件写入或命令进程：检查临时文件内容，并以合成固定 argv marker 检查进程是否启动。
- 被拒绝的 loopback 网络调用：本机合成 HTTP sink 收到 0 请求。
- 文件 capability 路径替换：替换路径后原 inode 和替换文件均未被未经授权的写入改变。
- 重复审批：operator 审批 ID consume-once，重复批准失败，callback 只执行一次。
- 敏感 MCP 输出后 egress：网络 callback 未运行，sent 计数为 0；关闭并重建 Gateway、复用同一 Guard 后仍拒绝网络出口。
- Hook 缺失模块、Hook 抛错、非法返回、2 秒超时、日志路径不可写均返回 deny。
- 隔离标记在同一 workspace 的后续 Hook 调用中保持 deny；状态目录容量和写锁争用回归保持 fail-closed。

## 自动验证

命令：npm run verify

结果：

- TypeScript build：通过。
- Node test runner：330 项，325 通过，5 跳过，0 失败。
- Package smoke check：通过，检查产物 dorianchn-agent-canary-1.2.7.tgz，共 90 个文件。
- npm ci：102 个依赖安装成功，报告 0 vulnerabilities；没有改变 package.json/package-lock.json。
- git diff --check：通过。

全量 suite 中 5 个 skip 保持原测试条件（包括不假设 Windows 符号链接权限的用例）；没有为通过测试降低策略强度。

## 未验证与安全限制

真实 Claude/Cursor 宿主是否加载 Hook、宿主启动失败时是否配置 onFailure:block，以及外部杀进程时客户端如何处置，均未在本机真实宿主中验证。Hook wrapper 进程未启动时没有代码可返回 deny。

Gateway 是宿主进程内的合作执行接口。传输层只有在宿主将断线映射为 AbortSignal 并调用 close 时才能使用本次取消逻辑。AbortSignal 不能撤销已经完成的外部副作用，也不能阻止忽略该信号的不合作 callback 在之后自行产生副作用。跨进程 Guard 持久化、新 Guard 重启恢复及操作系统原生 Shell/文件/网络操作不属于已证明覆盖范围。

基线中未找到 MODULE_OWNERSHIP.md 或 API_CONTRACTS.md。已准备要求 M0 补齐接口基线并定义 Guard 隔离通知契约的 Issue，但 GitHub Connector 返回 403、gh 不可用且 Chrome 扩展未连接，故尚未创建，无法提供 Issue 编号。当前可用工具未提供用户引用 Codex thread 的 read_thread 能力，因此没有读取该线程；本文结论仅基于仓库与测试证据。

## 远端交付状态

本地分支 feature/ac3-security-core 的提交 be5836e 已包含代码、回归和三份交付文档。目标远端分支在推送前不存在；GitHub Connector 创建分支返回 403，非交互 git push 返回“could not read Username”。因此尚未推送，也未创建 Draft PR。没有合并 main 或创建 Release。恢复 GitHub 写入认证后，可从该本地分支直接推送并以 feature/agent-canary-3.0 为 Draft PR base。

## 续作：Windows Node 20 Hook interruption 与 M7 协调（2026-10-13）

### Issue #32：复现证据与处理

- 历史失败 run：`38374902576`，PR #30 head `74757a6`，Windows Node 20。失败点是 `test/agent-hook.test.ts` 中的 Hook-entry marker 断言（`false !== true`）；此前的 `ETIMEDOUT` 断言已通过。失败 job 没有保存 child stdout/stderr 或进程细节，故只能确认一秒后 marker 不存在。子进程启动/模块导入时序是可能解释，不能据此断言根因。
- 对照成功 run：`38375363932`，head `1ddcd56`，Windows Node 20 与 package-smoke 全绿。该成功 head 尚不包含本续作的测试改动。
- 修订测试用 `spawn()` 异步启动隔离 wrapper，等合成 Hook 入口 marker 后再 `kill()`；断言 spawn 无错误、child 在主动中断前未结束、中断后有非零退出/信号、stdout/stderr 为空、没有决策 JSONL。工具输入与目录均为合成数据/系统临时目录；没有降低策略、删除测试或把测试改为宽松的超时通过。
- 使用从 Node.js 官方 `v20.20.2` Windows x64 发行物校验的二进制（SHA-256 `56c1520ee33b801e8bdb92fb321cf2e98529735b6d12bd4a2a6dec0ac0bab937`）运行：最终修订版定向测试连续 `5/5` 通过；之前同一异步入口握手版本额外 `10/10` 通过。最终测试诊断示例：marker `true`、退出信号 `SIGTERM`、spawn error `null`、stdout/stderr 为空。
- 最终 Windows Node 20.20.2 `npm run verify`：退出码 0；TypeScript build 通过；330 项中 325 通过、5 跳过、0 失败；package smoke check 通过（90 files）。
- 处置：更新测试 harness 来消除“入口启动是否赶上一秒硬截止”的混淆，并验证入口后的中断行为；历史间歇失败的真实根因仍为 `UNKNOWN / BLOCKED`，等待包含本改动的新 Windows Node 20 CI。Issue #32 保持 OPEN。

### M7 Gateway 共享路径（Issue #28）

只读检查 M7 worktree：`feature/ac3-reliability`，HEAD `9d316fe`，工作树干净。M7 Gateway 变更 memoize `close()` Promise、等待 `history.tail`、清除待审批，并尝试关闭全部资源后统一抛 `GATEWAY_RESOURCE_CLOSE_FAILED`。M1 当前实现还会在等待队列前清空审批、同步 abort 活动 controllers；M7 文件没有这些 M1 安全取消行为。集成需保留 M1 的 closed/abort/Guard 最终检查，并吸收 M7 的逐资源关闭与稳定错误语义；不可整文件覆盖。两边公共 Gateway shape 没有因此改变。Issue #28 仍 OPEN，等待双模块合并验证。

### 已确认的跨模块接口缺口

使用 Node 20.20.2 的一次性合成复现：受控 MCP callback 等待 gate 时，由另一 host route 对同一个 Guard 调用
`trip({reason:'synthetic_quarantine'})`；观察到 Guard=`QUARANTINED`、callback signal `aborted=false`，callback 返回 `done` 并在隔离临时目录创建 `after-trip.txt`。这确认当前 Guard API 缺少同步隔离通知，会让已运行 callback 在外部 quarantine 后继续执行。

修复需要 M0 协调 Guard/Gateway 的公共通知接口和生命周期契约，M1 未擅自更改该共享 API。按要求准备的新 Issue 标题：`[P1] Define Guard quarantine notification for active Gateway executions`。GitHub Connector 创建 Issue 返回 `403 Resource not accessible by integration`；备用 Chrome 扩展工具报告 disconnected，因此没有已创建 Issue 编号。该接口项为 `CONFIRMED / BLOCKED`，本次没有为其新增会通过的自动回归；需在 M0 定义接口后补齐并验证“外部 trip → 活动 callback abort → 无合成文件/网络副作用”。

### GitHub 状态

本续作尚未确认评论/分支/PR 写权限。#28、#29、#32 的当前计划是：#28 记录 M1/M7 安全合并要求；#29 报告 M1 槽位状态与下一步；#32 维持 OPEN 并等待新测试的 Windows CI。新 Draft PR 以 `feature/agent-canary-3.0` 为 base；不合并 main、不发布 Release。
