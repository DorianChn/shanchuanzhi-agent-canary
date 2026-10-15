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

## 远端交付状态（首次审计快照）

首次审计快照中，本地分支提交 `be5836e` 已包含原代码、回归和三份交付文档；当时尚未推送，也未创建 Draft PR。该状态由本续作的最新同步记录补充。

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

### 历史快照：已确认的跨模块接口缺口（本轮已解决）

使用 Node 20.20.2 的一次性合成复现：受控 MCP callback 等待 gate 时，由另一 host route 对同一个 Guard 调用
`trip({reason:'synthetic_quarantine'})`；观察到 Guard=`QUARANTINED`、callback signal `aborted=false`，callback 返回 `done` 并在隔离临时目录创建 `after-trip.txt`。这确认当前 Guard API 缺少同步隔离通知，会让已运行 callback 在外部 quarantine 后继续执行。

修复需要 M0 协调 Guard/Gateway 的公共通知接口和生命周期契约，M1 未擅自更改该共享 API。按要求准备的新 Issue 标题：`[P1] Define Guard quarantine notification for active Gateway executions`。GitHub Connector 创建 Issue 返回 `403 Resource not accessible by integration`；备用 Chrome 扩展工具报告 disconnected，因此没有已创建 Issue 编号。该接口项为 `CONFIRMED / BLOCKED`，本次没有为其新增会通过的自动回归；需在 M0 定义接口后补齐并验证“外部 trip → 活动 callback abort → 无合成文件/网络副作用”。

### GitHub 状态

- 新 M0 Issue 创建及 #28/#29/#32 评论均尝试通过 GitHub Connector；Issue 创建和评论 API 均返回 `403 Resource not accessible by integration`。备用 Chrome 工具报告 Agent360 扩展未连接。
- 本地提交 `aae4705` 尚未推送；非交互 `git push origin HEAD:refs/heads/feature/ac3-security-core` 返回 `could not read Username`，远端 M1 分支 ref 不存在。因此 Draft PR 尚未创建，三条现有 Issue 的状态/评论未被远端更新。
- #28 待同步内容：保留 M1 abort/Guard 检查并吸收 M7 close-all 资源行为；#32 待同步内容：修订测试本机 15/15、全量验证通过、历史根因 UNKNOWN、保持 OPEN；#29 状态草案：M1 IDLE，分支/HEAD `feature/ac3-security-core`/`aae4705`，下一步恢复写入后发布 Draft PR 并跑 Windows Node 20 CI。无 VMware/真实模型/安装槽位需求。
- 不合并 main、不发布 Release。远端写入通道恢复后，以 `feature/agent-canary-3.0` 为 Draft PR base，并将 #32 保持 OPEN 直到新 Windows Node 20 CI 出结果。

## P0 #35：同步 quarantine 通知与活动 callback 中止（2026-10-13）

### 复现与修复

- 修复前先加入自动回归并按原故障顺序运行：启动合成 MCP callback、等待 callback 持有 gate、从 Gateway 外部调用同一 `Guard.trip()`。测试失败于 `signal.aborted`，实际值为 `false`，复现了 P0 的缺口。
- M1 的 Guard API 增加 `subscribeQuarantine(listener: () => void): () => void`。Guard 先同步 latch 到 `QUARANTINED`，然后同步调用订阅者，早于 state-store 写入、事件日志、凭据撤销和告警；重复 trip 不重复通知，reset 后的新隔离会发出新通知。已 quarantine 的 Guard 在订阅时同步通知一次。listener 异常隔离，disposer 幂等。
- Gateway 创建时注册 observer；收到通知后 abort 同 Guard 的活动 Gateway controller 集合。注册失败使 Gateway 创建失败，并尝试关闭已打开的文件句柄。Gateway `close()` 先取消本实例 controller、同步退订，再等待队列并关闭资源。
- 另有构造失败回归：Guard 没有提供 quarantine subscription 时，Gateway 以固定错误拒绝创建，临时 capability 文件保持原内容。
- 回归的 callback 只会在收到 signal 后检查 `aborted`，若未取消才会在 OS 临时目录下创建合成 marker。修复后 signal 在 `trip()` 返回前已 aborted，释放 gate 后 marker 不存在，既有 `result.txt` 保持 `before`，dispatch 拒绝完成。
- 生命周期用例覆盖同步通知、重复 trip 去重、observer 抛错后后续 observer 仍运行、已隔离后订阅立即通知、reset 后再 trip、重复 unsubscribe 和退订后不再通知。

### 验证

- 修复前最小回归：失败，观测 `false !== true`（预期 fail-closed signal abort）。
- 修复后单项回归：通过。
- 聚焦验证命令：`node --import tsx --test test/gateway.test.ts test/containment.test.ts test/gateway-acceptance.test.ts test/package-types.test.ts`。Windows Node v20.20.2 执行结果：63 项通过，0 失败、0 跳过。
- TypeScript build：`node node_modules/typescript/bin/tsc`，退出码 0。
- `git diff --check`：通过。
- 本节验证的是本 M1 工作树的差异；未重跑完整 `npm run verify`，此前全量验证记录不代表本轮变化已覆盖全量 suite。

### 契约范围与剩余风险

- 当前同步通知只保证从正在使用的同一个 `AgentGuard` 实例调用 `trip()`。不同 Guard 实例共享 state store，或另一进程直接改写持久化状态时，没有推送式同步广播；该扩展需要 M0 定义额外的 store/IPC API。
- Gateway 可以同步 abort signal 和 dispatch 等待；它不能回滚已完成外部动作，也不能强制终止忽略 AbortSignal 的不合作 callback。本回归验证 callback 在写入前遵守 signal 检查。M1 Gateway 仍只覆盖 `agent.dispatch` 中已登记的受控能力，不保护原生 Shell 或绕过 Gateway 的文件、网络与 MCP 调用。
- M0 下一步：按本报告所列的签名、时序、重复通知、reset 和 disposer 语义更新 `coordinator/docs/3.0/API_CONTRACTS.md`。本轮未改协调目录、M2–M8 文件，未访问 GitHub connector，未创建 PR 或合并分支。

## Issue #28：Gateway close 同步与资源清理回归（2026-10-13）

基线为 M1 本地 `feature/ac3-security-core` / `ec3bc96d7301304f48270faaec926c7dbc1281ef`，工作树在本轮修改前干净。使用已存在的 Windows Node `v22.23.1 win32 x64`，未安装 Node。

- 定向命令：`node --import tsx --test test/gateway.test.ts`：28 项通过，0 失败、0 跳过。新增用例证明 abort listener 和 disposer 的同步重入都取得外层 close 的同一 Promise；close 中活动 signal 被中止，pending approvals 清空，排队写文件和排队 approval 不执行，资源关闭开始前活动及排队 dispatch 已落定；重复 close 复用同一 Promise/result。
- 资源错误用例在临时 fixture 的第一个 `fs.closeSync` 包装点先真实关闭该 descriptor，再抛出包含合成私密 detail/临时路径的错误，避免留下测试 fd。观察到三个已注册 descriptor 都被尝试；Promise 固定拒绝为 `GATEWAY_RESOURCE_CLOSE_FAILED`，不含 cause 或合成路径，重复 close 不增加尝试次数。该注入验证异常处理、继续清理和错误净化，不声称模拟了内核层 close 失败时的 descriptor 状态。
- 同一 Gateway suite 中原有的外部 Guard quarantine 活动 callback abort 测试通过，P0 #35 行为保持。
- TypeScript build：`node node_modules/typescript/bin/tsc`，退出码 0。
- `git diff --check`：本地检查通过。

本轮没有运行 `test/agent-hook.test.ts`、完整 test suite、VM/真实模型/安装验证，也未 push 或写 GitHub。剩余限制：close 能等待 Gateway task queue，但不能终止忽略 AbortSignal 的 callback 或回滚已发生的外部副作用；资源错误覆盖使用安全的合成异常注入，未制造真实内核 close 错误。

## Issue #32 P1：Windows Hook interruption harness 根因与本地修复（2026-10-13）

### 环境与复现

- 只使用已存在的 Windows Node 20.20.2 和 22.23.1 运行；没有安装或替换 Node。
- 两版本均执行 `node --import tsx --test --test-name-pattern 'native lab wrapper interruption emits no allow decision and invokes no tool callback' test/agent-hook.test.ts`；只选择该一项作为聚焦用例，Node 20 reporter 将其余 9 项标为 name-pattern filtered。
- 修改前定向测试两版本均通过 1/1。Node 20 诊断：pid `1420`、spawnError `null`、exit `{code:null,signal:"SIGTERM"}`、stdout/stderr 为空、marker `true`。Node 22：pid `27448`，其余字段同样为 spawnError `null`、`SIGTERM`、空 stdout/stderr、marker `true`。因此普通调度下未复现失败。
- 对同一合成 wrapper 做受控 harness 复现：在观察到 entry marker 后，父进程故意延迟 2500 ms 再尝试外部 kill。观察到 marker `true`、spawnError `null`、exit `{code:0,signal:null}`、stdout `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"LAB_HOOK_ERROR_FAIL_CLOSED"}}\n`、stderr 为空、决策日志不存在。也就是 wrapper 自己的 `HOOK_TIMEOUT_MS=2000` 先结束了子进程；现有 interruption 测试会因 child 已结束和 stdout 非空而失败，尽管产品仍 fail-closed。

### 最小修复与验证

- 仅调整 `test/agent-hook.test.ts` 的合成 Hook 模块：写入 entry marker 后用 `Atomics.wait` 阻塞子进程事件循环，避免内部 2 秒超时在父进程调度延迟时先产出 deny。测试随后固定等待 2500 ms，再断言 child 仍存活并执行外部中断。这把受控复现纳入回归，保留原有 kill、无 allow/输出、无 decision log 和诊断断言；生产 Hook 行为与策略未改。
- 修复后同一聚焦用例在 Node 20.20.2 和 Node 22.23.1 各通过 1/1。Node 20：pid `35556`、spawnError `null`、exit `{code:null,signal:"SIGTERM"}`、stdout/stderr 为空、marker `true`。Node 22：pid `45372`，exit/signal/stdout/stderr/marker 状态相同。
- TypeScript build 使用 Node 22.23.1 执行 `node node_modules/typescript/bin/tsc`，退出码 0；`git diff --check` 通过。

### 结论与限制

已确认并修复一个可复现的测试 harness 竞态；这不是 Hook 产品 fail-open 缺陷。之前的 CI 失败没有保存完整 child exit/error/signal/stdout/stderr 快照，旧 run 的 marker 缺失也来自更早的启动窗口测试，因此不能把所有历史红灯确定归因于本次竞态。当前本机复现和 Node 20/22 绿测已记录，历史 CI 根因归属仍为 `UNKNOWN`，需要包含本地修订的新 Windows CI 结果才能关闭远端 Issue #32。这里没有查询或修改 GitHub。

## Issue #32 follow-up：PR #39 Windows Node 22 复现进度（2026-10-13）

### CI 源码与失败断言

- Run `38415887207` 的失败 job `115360080156` 在 Windows Server 2025 / Node `22.23.3` 上执行 CI merge SHA `72987237c6b9cbbe79d7128564793a1b37bad211`；PR #39 head 为 `65ce0288ceeb9815b6cda7cb5f49c5a17ac7df0f`。run merge SHA 与 PR head 的 `test/agent-hook.test.ts`、`src/agent-hook.ts`、相关 Guard/router/SDK 源、native wrapper 和 package manifests 完全一致。
- 该 run 的测试仍使用旧 `spawnSync(... timeout: 1000)` 路径：子进程须完成启动、读入 fixture 并动态导入 synthetic hook，之后才写 entry marker；父测试未等待 marker 就开始一秒超时。日志中的 `ETIMEDOUT` 断言通过，随后 marker 断言失败（`false !== true`，`test/agent-hook.test.ts:54:53`）。PR #38 head `bca895fe83a1e73c9215116b738f235a08cd85ac` 对应测试路径相同。

### 有界本地验证

- Windows Node `22.23.1` 下在 PR #39 head 的临时 detached worktree 运行旧用例两次：命令均为 `node --import tsx --test '--test-name-pattern=native lab wrapper interruption emits no allow decision and invokes no tool callback' test/agent-hook.test.ts`，两次各 `1/1` 通过（用例耗时 `1011 ms`、`1026 ms`）。
- 在 M1 当前工作树以同一命令运行一次：`1/1` 通过；诊断为 marker `true`、spawn error `null`、退出 `{code:null, signal:"SIGTERM"}`、stdout/stderr 为空，决策日志断言通过。总计三次，没有再运行。当前环境未发现 Node 20，因此没有 Node 20 复测。

### 判断与交付

旧测试的未同步启动窗口与断言失败相符，但本地旧路径两次通过，当前 marker-handshake 路径一次通过，均未复现 hosted runner 的具体时序。此次 CI failure 更像旧测试夹具/基线差异是基于现有证据的推断，精确根因仍为 `UNKNOWN`。`46af1f19344dffe93a30817c4805eec0c6c673fe`（异步启动、等待 marker 后再中断，并检查无决策输出/日志）已在 PR #43 远端 head 的祖先链中；它是确定性测试夹具修复，不构成运行时缺陷已修复的证据。没有证据要求追加产品代码修复；等待集成分支重新验证前，Issue #32 保持 OPEN。本节复现记录时的 HEAD 为 `dc4d7fa051ca39403ca94415477019532be8022c`；后续本地提交 `89e40cd18fdae56124dfcbf54a6cacbdb850ff2c` 仅修改 #44 的测试。本节证据未推送或写 GitHub。

## Issue #35 checkpoint

当前已记录的本地 Node 22 honeypot 定向结果为 `34/34`；该结果支持 quarantine 中止 dispatch、marker 未变化、后续写入被拒绝且 secret 未返回，但不是当前 PR head 的端到端 CI 证据。历史 P0 #35 继续保持 OPEN；跨进程边界仍未验证。没有新的可复现运行时缺陷，因此本次不修改 Gateway 产品代码，也不以本地 pass 关闭 #35。

PR #43 远端 head `d0fd595` 的旧测试直接等待 honeypot read dispatch 成功；实际 quarantine abort 进入 Gateway 的统一失败路径，稳定拒绝为 `GATEWAY_EXECUTION_FAILED_EFFECTS_NOT_ROLLED_BACK`。本地 `dc4d7fa` 相对该 head 的唯一差异是测试增加对此拒绝的 `assert.rejects`，同时保留隔离、sentinel 未变、后续写入拒绝和事件计数断言。该证据支持 CI 为测试期望不匹配，不证明一般副作用回滚或跨进程边界；更新后的远端 CI 尚未确认。

## P1 #44: approval expiry test timing (2026-10-13)

- Exact source commit `f2f2d10c67aaf304f0e3cbec57045d72b90127ac` was checked out into the M1 scratch worktree `agents/M1-security-f2f2d10-scratch`, without changing the main M1 worktree. The official focused command on Windows Node `22.23.1` passed `1/1`; Node 20 was not available in Windows or WSL. The scratch worktree reused existing M1 `node_modules` through a junction; no runtime or dependencies were installed.
- The CI error location is the test expression `operator.pending()[0].requestId`. In the exact source, `pending()` first calls `sweep()`, which removes expired entries; the fixture uses `approvalTtlMs: 5`. A controlled synthetic reproduction on the exact source inserted a `15 ms` scheduler delay before that lookup and reproduced `Cannot read properties of undefined (reading 'requestId')`. Output showed `decision=REQUIRE_APPROVAL`, a string `requestId` on the dispatch denial, `pending_count=0`, and `callback_count=0`. The original CI runner's timing was not directly observed locally; the test-harness expiry race mechanism is reproduced, while Ubuntu Node 20 remains unavailable.
- Minimal M1-owned fix: the test now captures and asserts the approval decision and `requestId` from the dispatch rejection, then verifies expiration and `callback===0`; it no longer races by retrieving an already expired item from `pending()`. No Gateway product code, policy, or public API changed.
- Windows Node `22.23.1` verification: focused subtest `1/1`; full `test/gateway.test.ts` suite `28/28`; working and staged `git diff --check` both passed. Node 20 CI verification remains pending.
- This test-only adjustment was committed locally as `89e40cd18fdae56124dfcbf54a6cacbdb850ff2c`; it has not been pushed. An attempt to post the result to Issue #44 returned GitHub API `403 Resource not accessible by integration`; there was no retry or alternate route. Issue #44 remains OPEN / root cause UNKNOWN.

## PR #43 current-head CI evidence (2026-10-13)

M0 confirmed a batch push at `2026-10-13 16:02:40 UTC` containing `dc4d7fa` and `89e40cd`. The run associated with exact head `89e40cd18fdae56124dfcbf54a6cacbdb850ff2c`, [CI run 38427313208](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38427313208), completed with conclusion `success`:

- The six `npm test` matrix jobs and their `npm run build` steps passed: Windows Node 20 job `115399969526`, Windows Node 22 `115399969339`, Ubuntu Node 20 `115399969375`, Ubuntu Node 22 `115399969355`, macOS Node 20 `115399969424`, and macOS Node 22 `115399969427`.
- `package-smoke` job `115400941704`, `docker-build` job `115399969218`, and `sponsor-smoke` job `115399968798` also completed successfully.
- For P0 #35, this is current-head remote CI evidence for the honeypot/quarantine test suite, supplementing the earlier local Node 22 `34/34` result. No cross-process/shared-store quarantine broadcast was tested, and no general rollback guarantee is claimed. Issue #35 was still OPEN when read; no remote issue state was changed.
- For P1 #32, Windows Node 20 and 22 full test jobs passed on this integrated head. The deterministic fixture correction remains test-harness-only; the exact timing of historical hosted failures remains `UNKNOWN`. The integration-branch revalidation previously pending is now available. Issue #32 was still OPEN when read; no remote issue state was changed.
- For P1 #44, Ubuntu Node 20 and all other matrix test jobs passed with the test-only expiry adjustment in `89e40cd`. The controlled 15 ms delay reproduced the stale-`pending()` lookup failure mechanism on exact source, but did not recreate the original Ubuntu runner timing. No Gateway product code or policy changed. Issue #44 was still OPEN when read; the earlier comment attempt remains blocked by API 403.

These are GitHub Actions results for the exact pushed PR commit, not a new local test run. No merge or release was performed.

## P0 #35 follow-up: shared-Guard Gateway cancellation (2026-10-14)

The product fix is present in the M1 branch ancestry at `ec3bc96d7301304f48270faaec926c7dbc1281ef`: `AgentGuard.latchQuarantine()` synchronously invokes quarantine subscribers after latching the state; each Gateway subscribes `abortSession()`, which aborts controllers tracked in the registry shared by that exact Guard object. Gateway instances using that Guard also share the serialized `history.tail`, and each queued task rechecks the Guard before policy execution or callback invocation.

Two pre-fix synthetic reproductions confirmed a further lifecycle defect. First, a Gateway had a pending approval; `guard.trip()` followed by an acknowledged reset left it approvable, and `operator.approve()` ran the callback (`callbackCalls=1; markerExists=true`). Second, a pending AI review was aborted by quarantine, then Guard reset before the review continuation; the stale dispatch created a new pending approval, and approving it ran the callback (`dispatchReason=host_mcp_capability; pending=1; approval=callback_ran; callbackCalls=1; markerExists=true`). Both used isolated temporary directories and synthetic marker contents.

The minimal M1 fix in `src/runtime/gateway.ts` advances a shared internal quarantine epoch, synchronously clears the Gateway's pending approvals, and aborts tracked controllers from the Guard subscription. Dispatch captures the epoch at admission and rechecks it when a queued request begins and after asynchronous AI review. A request admitted before quarantine remains invalid after Guard reset; a new request admitted after reset captures the new epoch. This also prevents an interrupted approval review from creating a fresh pending item after reset.

A deterministic regression uses two Gateway instances with one Guard. The first synthetic MCP callback waits on a manually released gate and would write a marker if its signal were not aborted. A sibling Gateway queues a callback that would write another marker. External `guard.trip()` returns with the active signal already aborted; after gate release, the active dispatch rejects, the queued dispatch is denied, both callback effect counts remain zero, and neither marker exists. Additional regressions verify pending approval consumption and interrupted AI review invalidation across reset. Existing single-Gateway P0 marker coverage remains unchanged.

- Environment: Windows Node `v22.23.1` (`win32 x64`), using the already-installed runtime.
- Focused new regression: `node --import tsx --test --test-name-pattern='external Guard quarantine aborts active work and rejects queued sibling Gateway work before effects' test/gateway.test.ts` — 1 passed, 0 failed, 0 skipped.
- Before the fix, the pending-approval regression failed with `callbackCalls=1; markerExists=true`; the interrupted-review regression failed with `dispatchReason=host_mcp_capability; pending=1; approval=callback_ran; callbackCalls=1; markerExists=true`.
- After the fix, the three quarantine-specific regressions passed: `node --import tsx --test --test-name-pattern='external Guard quarantine aborts active work|Guard quarantine consumes pending approval|Guard quarantine cannot revive an interrupted approval review' test/gateway.test.ts` — 3 passed, 0 failed, 0 skipped.
- M1 Guard and Gateway suites: `node --import tsx --test test/gateway.test.ts test/containment.test.ts` — 51 passed, 0 failed, 0 skipped.
- TypeScript build: `node node_modules/typescript/bin/tsc` — exit code 0.
- `git diff --check` — passed after the documentation update.

The synthetic callback tests honor their supplied AbortSignal. A host callback that ignores the signal can continue its own side effects, and this Gateway is not an OS sandbox. Another Guard instance or process does not receive a synchronous event from this Guard. Issue #35 remains OPEN; this local test result does not replace current-head remote end-to-end CI or prove cross-process cancellation. No push, issue update, merge, or release was performed.

## M1 Issue #32 / #44 current disposition (2026-10-14)

### PR #43 ancestry and current CI

The remote Draft PR #43 is OPEN at exact head `f59ba37c2fd9d1b5e181e067f80981f8920ef16a`, matching the local M1 branch HEAD. Local ancestry checks against that exact SHA returned success for all four reviewed commits:

| Commit | Full SHA | Present in PR #43 ancestry |
| --- | --- | --- |
| `aae4705` | `aae4705bfb870e74b28062283bba7755a322b78f` | yes |
| `46af1f1` | `46af1f19344dffe93a30817c4805eec0c6c673fe` | yes |
| `89e40cd` | `89e40cd18fdae56124dfcbf54a6cacbdb850ff2c` | yes |
| `ec3bc96` | `ec3bc96d7301304f48270faaec926c7dbc1281ef` | yes |

GitHub associates CI run [38522973084](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38522973084) with that exact head. All nine jobs completed successfully. Windows Node 20 job `115716696322` ran Node `20.20.2`; Windows Node 22 job `115716696306` ran Node `22.23.3`. Both completed `npm run build` and `npm test`; each test log reports 340 tests, 336 passed, 0 failed, and 4 skipped.

### P1 #32 — Hook interruption marker

**Historical root-cause classification: PLAUSIBLE; exact runner cause is unconfirmed.** The failing Windows Node 20 job `115684062592` in run `38512532532` reports `false !== true` at the old Hook-entry marker assertion. The prior fixture used a one-second synchronous spawn timeout and checked the marker without an asynchronous handshake; runner startup/dispatch timing is a plausible explanation. The historical log does not record enough child state to prove why the marker was absent. Do not treat the green rerun as proof of the old failure's precise cause.

On current head, the interruption subtest passes in both Windows jobs. Their logs report `spawnError=null`, `exit={code:null,signal:"SIGTERM"}`, `stdout=""`, `stderr=""`, and `marker=true`; the test still checks no allow result, no output/decision log, and no tool callback. This verifies the revised synthetic interruption regression, not an actual Claude host's behavior after a killed Hook process. Issue #32 remains OPEN pending M9 combined-baseline verification.

### P1 #44 — approval expiry and missing pending requestId

**Historical root-cause classification: PLAUSIBLE; exact scheduler timing is unconfirmed.** The failing Ubuntu Node 20 job `115348307512` in run `38412534723` failed at `operator.pending()[0].requestId` with `Cannot read properties of undefined (reading 'requestId')`; the failing line was before `operator.approve()`. The old fixture set `approvalTtlMs: 5`, and `pending()` runs the expiry sweep, which removes already expired items. An isolated controlled delay on the exact old source reproduced the same missing-entry error. This supports a test timing race, but does not show the original runner's elapsed time. The observed failure does not demonstrate that an approval succeeded or that a callback ran.

The current test captures `decision` and `requestId` from the `REQUIRE_APPROVAL` rejection, waits beyond TTL, then asserts approval is expired and callback count remains zero. CI run `38522973084` passed this exact subtest in Ubuntu Node 20 job `115716696261` (19.933 ms), Windows Node 20 job `115716696322` (60.481 ms), and Windows Node 22 job `115716696306` (35.538 ms). The full matrix passed; no Gateway production code or security policy was changed for this test correction. Issue #44 remains OPEN pending M9 combined-baseline verification.

No test was deleted, skipped, or weakened for either issue. No GitHub issue was updated in this review; the live Issues #32 and #44 both remain OPEN.

## Issue #28 M1 owner review and M7 handoff (2026-10-14)

M1 owner review of the current `feature/ac3-security-core` tree found all five M1 close/quarantine lifecycle acceptance points implemented and covered by tests. No Gateway/Guard code or test change was needed. The close implementation in `src/runtime/gateway.ts` synchronously sets `closed` and clears pending approvals, publishes its memoized Promise before invoking abort listeners or the Guard disposer, aborts active controllers, replaces and invokes the disposer once, waits for the shared serialized `history.tail`, then attempts each still-open resource descriptor. A failed descriptor close is contained; remaining descriptors are still attempted and the final rejection is only `GATEWAY_RESOURCE_CLOSE_FAILED`, without an underlying cause or resource path. Calls from concurrent close, abort-listener reentry, and disposer reentry share the same Promise.

### Local verification in this review

Using the already-installed Windows Node `22.23.1`, the command `node --import tsx --test test/gateway.test.ts test/containment.test.ts` completed with **51 passed, 0 failed, 0 skipped**. This is fresh local evidence on M1 HEAD `56f55f77ebf7d1c45b015cba29a783658726d225`. In particular, the suite passed `quarantine subscribers run synchronously once per transition and unsubscribe cleanly`, `gateway close unsubscribes its Guard observer exactly once`, `gateway close publishes one Promise before synchronous abort and disposer reentry`, `gateway close aborts active work, drains queued work, and blocks pending approval`, and `gateway close tries every resource after a close error and exposes only a stable failure`.

### Remote CI and integration boundary

Separately, the recorded GitHub CI run [38522973084](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38522973084) passed all 9 jobs at PR #43 code head `f59ba37c2fd9d1b5e181e067f80981f8920ef16a`; the current M1 code is unchanged from that head, with later M1 commits limited to reports. The CI run is remote evidence for the M1 candidate. It is not a combined M1+M7 integration run and does not establish that the M7 Gateway changes have been merged or reconciled. Issue #28 remains OPEN.

M7 integration must preserve the M1 close ordering and Guard-quarantine behavior: synchronously latch `closed` and clear pending approvals; publish the one close Promise before any reentrant abort/disposer callbacks; abort active controllers; unsubscribe exactly once; wait for queued Gateway work to settle before closing resources; attempt every registered resource even after one close error; expose only the stable sanitized error; and retain the identity/reentry, queue-drain, pending-approval, resource-attempt, and quarantine regressions. This review did not inspect or modify M7 files, test a host callback that ignores `AbortSignal`, simulate an OS-level descriptor-close failure, or verify cross-process quarantine notification.

## M1 P1 #44 owner recheck (2026-10-14)

On local M1 HEAD `738a7838e7377290d4ed51da4e41f0a7d14e319b`, the focused command `node --import tsx --test --test-name-pattern='approval expires with no actual callback' test/gateway.test.ts` passed `1/1` under Windows Node `22.23.1`. The Gateway and test source are unchanged from PR #43 head `f59ba37c2fd9d1b5e181e067f80981f8920ef16a` (`git diff` between those revisions for `src/runtime/gateway.ts` and `test/gateway.test.ts` is empty).

The disposition remains a test timing race supported by the old CI failure location, the 5 ms TTL/expiry-sweep behavior, and the already-recorded controlled-delay reproduction on exact old source. I did not rerun the exact old source under Node 20; the original Ubuntu Node 20 CI failure is recorded in run `38412534723`, and the corrected subtest passed in Ubuntu Node 20 plus Windows Node 20/22 in run `38522973084`. No approval allow or callback execution was observed; the current test still asserts an expired approval rejects and callback count stays zero. Issue #44 remains OPEN until the combined M9 baseline runs this regression.

## M1 P1 #32 exact-head evidence refresh (2026-10-15)

- PR #43 remains OPEN/Draft at exact head `4b562bed32ebcc3f241a17543d8d2ce9f6108c26`. The exact `test/agent-hook.test.ts` blob is `6c2d8da18e1832bc738d141cd811b4b3f047756e`.
- GitHub associates exact-head run [38620584097](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38620584097) with that commit; all 9 jobs succeeded. Windows Node 20 job `116046763025` used Node `20.20.2`; Windows Node 22 job `116046764085` used Node `22.23.3`. Each full suite reports 341 tests, 337 passed, 0 failed, and 4 skipped.
- In both Windows logs, the Hook interruption subtest passed and emitted diagnostics `marker=true`, `spawnError=null`, `exit={code:null,signal:"SIGTERM"}`, `stdout=""`, and `stderr=""`. The test still waits for the entry marker before external interruption, verifies the child closes from interruption, and rejects any permission output or decision-log file. The fail-closed regression remains present.
- Fresh local Windows x64 Node `22.23.1` verification at the same HEAD: `node --import tsx --test --test-name-pattern='native lab wrapper interruption emits no decision or output' test/agent-hook.test.ts` passed `1/1` (0 failed); diagnostics reported `marker=true`, no spawn error, SIGTERM, and empty stdout/stderr. `node node_modules/typescript/bin/tsc` exited 0; `git diff --check` passed before and after this report-only update.
- Local Windows Node 20 is not installed; Node 20 evidence above is from exact-head CI. The fixture is synthetic and cannot observe whether a real Claude host invokes a downstream tool callback after Hook-process termination; native-host callback behavior remains `NOT_VERIFIED`.
- Historical CI failures used the older `1ecb3ee` test blob and lacked child exit/error/output diagnostics. The revised exact-head fixture is green on both Windows versions, but this does not prove the precise cause of those historical hosted-runner failures. Keep Issue #32 OPEN and the historical root cause `UNKNOWN` pending M9 combined-baseline verification. No Hook product code, runtime policy, or test source changed in this refresh.
