# M5 策略与审计报告

**范围**：`feature/ac3-policy-audit` 上的确定性风险策略、项目策略管理、策略决策证据和 Canary Guard 接入。检查了 M0/M1 相关接口边界、`src/risk-policy.ts`、`src/containment.ts`、Hook、Gateway、现有证据/日志实现和对应测试。

## 结论

M5 增加了只能收紧策略的项目级规则、冲突预览、明确的放宽确认、追加式版本历史、托管策略路由及可校验的审计导出。未登记工具现在在 `OBSERVE`、`BALANCED`、`STRICT` 三种模式都直接拒绝。正常读取与审定开发命令保持可用；写入、构建等已知风险操作仍由宿主人工审批，不由模型批准。

默认模式仍为 `BALANCED`，Guard 隔离行为不变。默认策略没有降低。原有 Hook、Gateway 和 OSEP 证据协议没有被 M5 自动改写；在读到 M0 契约并协调后，才应做跨模块适配。

## 主要审计发现与处置

| 项目 | 检查结果 | M5 处置或边界 |
|---|---|---|
| 未登记工具 | 原策略把未登记能力放入人工审批；`OBSERVE` 还会覆盖该审批，缺少可信操作描述时仍可能调用宿主回调。 | 无注册描述时按 `UNKNOWN` 处理，兼容现有策略 API 返回 `DENY / unregistered_tool`，不入审批队列，所有模式 fail closed。 |
| 默认策略 | `BALANCED` 对普通只读按策略放行；写入、未审定 Shell/网络操作需宿主审批；已识别的越界、秘密外传拒绝。 | 保持既有默认。`OBSERVE` 只豁免已登记、非敏感操作的可选审批；敏感数据读/外发、越界路径和显式硬拒绝始终拒绝。Guard 隔离和未登记工具拒绝不受它覆盖。该模式仍降低普通风险审批强制性，仅适合演练。 |
| 项目策略 | 原来没有带版本、预览、冲突检查和回滚的项目策略管理器。 | 新增规则只能增加 `DENY`，不可声明 `ALLOW`。精确工具名可选风险类别；拒绝重叠选择器和重复 ID。移除或缩窄拒绝范围须显式确认；回滚以新版本追加，不改写旧历史。 |
| 人工确认 / 模型 | 审批身份必须由宿主认证；模型不得授予执行权。 | 策略回调接口只能给出 `DENY` 或 `UNCHANGED`。审批是原调用绑定、一次性、有时限的宿主操作。项目 API 接收的操作者字符串只用于关联证据，本身不是身份认证。 |
| 策略版本和解释 | 原策略告警缺少项目策略版本、调用来源和统一原因码；“allowed”事件并非回调成功证明。 | M5 决策/结果事件包含策略版本、调用来源、决策来源、结果状态、侧效应验证状态、原因码和规则 ID。执行结果单独记为 `EXECUTION_RESULT`。 |
| Canary 生命周期 | 原 Guard 在诱饵或 Token 信号上同步进入隔离；日志/通知及凭据撤销是后续副作用。解隔离是宿主人工 Reset。 | M5 托管路由记录诱饵导致的隔离和后续 Guard 拒绝；不替换 Guard。普通策略审计故障会阻止开始新的托管回调；隔离状态自身不依赖 M5 日志写入成功。 |
| 故障来源 | 模型拒绝、Hook 拒绝、Gateway 拒绝和工具回调异常必须可区分。 | 结构化枚举分别使用 `MODEL_REVIEW`、`NATIVE_HOOK`、`GATEWAY`、`TOOL` 来源。回调抛错时副作用不确定，记录 `execution_status=UNKNOWN`、`side_effect_verification=UNKNOWN`，不伪称已阻断。 |
| 证据与脱敏 | 旧 JSONL 有结构化事件和秘密模式脱敏，但没有 M5 项目策略版本/导出链。 | 新增独立 `agent-canary.policy-audit/1` JSONL 哈希链、导出和校验。调用参数、正文、路径和秘密值不进入 M5 事件；操作者只存项目作用域 HMAC 摘要。 |

## 决策语义

- **ALLOW**：确定性策略允许进入可信宿主回调。它不证明回调成功、外部副作用已发生或已被验证。
- **DENY**：策略或 Guard 明确拒绝。只有在回调前的拒绝路径上，才意味着该回调没有启动；要依据 `execution_status` 判断。
- **UNKNOWN**：工具能力未注册或无法解释。M5 审计层保留 `UNKNOWN`；旧策略路由为 API 兼容映射成 `DENY / unregistered_tool`，禁止审批绕过。
- **REQUIRE_CONFIRMATION**：已知能力需宿主人工确认。请求阶段记录 `NOT_STARTED`；模型建议、日志事件、工具参数和操作者字符串都不能代替宿主认证。
- **NOT_APPLICABLE**：用于执行结果等没有策略放行/拒绝含义的事件。

`policy_allowed`、审计追加成功和 Guard 告警都不是工具阻断成功的充分证据。预执行审计失败时，托管路由不调用真实回调；回调返回后若结果审计失败，当前操作已可能完成，M5 会触发 Guard 隔离并把风险留给宿主处理，不会声称或模拟撤销已发生的副作用。

## Canary 隔离与状态恢复

现有 Guard 在诱饵或 Canary Token 命中时同步设置 `QUARANTINED`，随后尽力记录事件、请求凭据撤销并告警。后续受保护调用会在真实回调前被拒绝；在可信宿主未配置 `quarantineAllow` 时没有隔离例外。共享状态存储错误会把本地 Guard 锁闭，恢复读取到 `SAFE` 也不会自动解隔离。状态重置需要宿主可信控制面显式调用 `reset()`；SDK 只验证标识字符串形式，不认证真人或组织身份。

托管执行把最终项目策略检查、调用结果记录和策略更改串行化：若更新在 callback 启动前提交，调用按新规则拒绝；若执行先取得锁，期间的策略写入会失败并保持旧版本，不能报告成成功应用。该锁不撤回已启动的外部副作用。

隔离日志/通知和凭据撤销可能失败，但这些失败不重开本地断路器。反过来，日志成功也不能证明某个任意宿主、Hook 或 Gateway 的回调一定经过 Guard。绕过托管 Router 的执行路径仍由宿主负责保护。

## M5 与 M1 Gateway 最终授权复核

本次只读检查 M1 工作树 `agents/M1-security` 的 `feature/ac3-security-core`，HEAD 为 `0cff427`。Gateway 在入队前、串行队列/复审后检查 Guard，并在记录 `RUNNING` 证据之后、调用文件/网络/进程/MCP 执行器之前再次调用 `guard.beforeToolCall()`。MCP 请求先映射到实际工具 ID 和参数再交给 Guard；因此，M5 的 `ALLOW` 不能替代 Gateway 对真实执行入口的最后一次授权。本分支没有修改 M1 Gateway 或 Hook。

新增 `test/policy-management.test.ts` 回归把 M5 托管策略的真实回调边界设为宿主最终授权器：在 M5 完成确定性 `ALLOW` 后，最终授权器拒绝调用，断言没有副作用，并将结果记为 `UNKNOWN / UNKNOWN`，而不是成功或已阻断。此测试验证 M5 包装层不会吞掉最终授权失败；它使用 host adapter fixture，不冒充对真实跨工作树 M1+M5 运行时的集成验证。

**审计发现，需 M0/M1 协调**：M1 Gateway 的最终 Guard 拒绝在当前实现中由执行器通用 `catch` 路径记录为 `decision=ALLOW`、`execution_status=FAILED`、`side_effect_verification=NOT_VERIFIED`，并以 `GATEWAY_EXECUTION_FAILED_EFFECTS_NOT_ROLLED_BACK` 返回。执行器入口确实尚未启动，但证据没有单独标识最终 Guard 拒绝来源；`NOT_VERIFIED` 也不能被解释为“已确认无副作用”。Gateway 自有证据链仍需检查，不能用 M5 日志代替。建议 M1/M0 为此类预执行拒绝定义明确来源/结果语义和跨层关联字段，记录在 Issue #35；M5 目前没有稳定错误契约来自动区分该 Gateway 拒绝与其他执行器异常。

**在途 Canary 解除缺口**：只读运行 M1 当前工作树的 Gateway 定向测试时，`external Guard quarantine synchronously aborts an active callback before its synthetic effect` 失败（实际 `activeSignal.aborted=false`，期望 `true`）。失败发生在断言尚未释放测试 callback 之前，所以本次没有得到“该 synthetic effect 是否发生”的结果。Gateway 内部检测到拒绝时会调用 `abortSession()`，但单独从 Gateway 外部调用 `guard.trip()` 不会通知 Gateway 正在运行的 controllers；故当前源码检查不能证明外部 Canary 信号会同步中断已开始的回调。这个 M1 工作树中的测试为未提交改动，本分支保留且未编辑。该失败使外部触发后的在途调用隔离仍未通过验证，应由 M1 修复并复测。

**接线边界**：M5 项目规则与 M1 Gateway 是两套独立授权和审计状态。推荐由宿主确保模型只有 Gateway 的 `agent.dispatch` 入口，并将 Gateway 注册的可信 MCP 执行器接到 M5 托管路由，使任一层均可拒绝。若直接暴露 M5 Router、绕过 Gateway，或由 M5 callback 再调用 Gateway，授权顺序和错误归属会变化；目前没有共享合约规定统一调用拓扑、决定关联 ID 或自动镜像拒绝事件。该接口问题提交 M0 在 #35 协调；`package.json` 字段归属仍在 #27 待分配，本轮未接触 `package.json`。

## M0 契约与未完成的协调

当前可读的 `coordinator/docs/3.0/API_CONTRACTS.md` 将 M0 列为契约文档 owner，要求策略只收紧并保留 Gateway 最终执行复查。M5 将未知工具映射为 `DENY / unregistered_tool`，并在 M5 审计事件中保留 `UNKNOWN`。M5 没有修改 M1 的 Hook、Gateway、Guard 或 `runtime/evidence.ts`；与 Gateway 组合时仍需把最终回调路由到 Gateway `agent.dispatch`。

本分支还包含同路径 `docs/3.0/API_CONTRACTS.md`，而 canonical 路径由 M0 管理。提交 Draft PR 前必须由 M0 owner 协调这份重复文档的去向，并将新 `./policy` 导出、`agent-canary.policy-audit/1` 事件语义及本次 OBSERVE 安全边界更新到 canonical contract；本轮不修改该共享路径。Issue #27 中 M5 已确认自己只拥有 `exports["./policy"]` 与两个新增 `scripts.test` 路径；M3/M6/M7 字段仍需组合到同一 AC3 manifest 并通过共同 package-smoke/CI。M5 的更改属于公共策略行为变更，PR 应标 `API-Contract-Change: yes`、关联 #27，并保持 Draft 直到契约及 manifest 协调和 CI 完成。

M5 证据事件仍由宿主显式调用 `policyManager.recordDecision()` 写入；Hook/Gateway 自动接线、跨模块事件关联及真实 M1+M5 集成尚未验证。

## 验证范围

测试覆盖项目策略只收紧、冲突和回滚、未知工具、人工审批、普通开发任务、隔离/重置、工具失败状态、来源区分、脱敏、链篡改/截断和审计故障闭锁。自动化使用临时目录、假宿主回调及虚拟工具；不代表真实文件系统沙箱、Shell 语义解析、网络出口控制或外部身份认证已经验证。

先前 M5 交付验证：`npm run build` 通过；`npm test` 共 342 项，337 通过、0 失败、5 项因平台条件跳过；`npm run pack:check` 通过（92 个打包文件）；`git diff --check` 通过。

本轮增量验证：M5 定向策略、路由和误拦截测试 `node --import tsx --test test/policy-management.test.ts test/risk-policy.test.ts test/false-positive.test.ts` 通过（41/41）；`node node_modules/typescript/bin/tsc --noEmit` 与 `git diff --check` 通过。只读运行 M1 Gateway 定向测试 `node --import tsx --test test/gateway.test.ts test/gateway-acceptance.test.ts` 为 37/38，其中上述在途 Guard quarantine 测试失败。完整 M5 build/test/pack 本轮未重跑；真实 M1+M5 宿主接线、Windows 原生 Hook、跨进程/生产 Gateway、真实工具副作用与外部锚定仍未验证。

## 2026-10-14 M5 收尾候选

本轮修复 `OBSERVE` 对安全拒绝的过度覆盖：之前任何已登记工具的 `DENY` 都可能被观察模式改成 `ALLOW`，包括越界路径、明确危险 Shell、敏感外发；敏感路径读取也可能绕过人工确认。现在显式硬拒绝不可覆盖，且 OBSERVE 下任何标有 `SENSITIVE_DATA` 的操作都拒绝；普通已登记操作中仅可选审批仍能按 OBSERVE 规则继续。默认 `BALANCED` 和 M1 Gateway 最终授权不变。

本轮 M5 自有改动：`src/risk-policy.ts`、`test/risk-policy.test.ts`、`docs/RISK_POLICY.md`、`FALSE_POSITIVE_REPORT.md`、本报告。未改 `package.json`、M0 canonical contract、M1 Gateway/Hook 或其他模块路径。M5 原有 manifest 增量仍为 `exports["./policy"]`（types/import/default）以及 `test/false-positive.test.ts`、`test/policy-management.test.ts` 两个 `scripts.test` 路径；Issue #27 已记录 M5 的字段 owner 确认，但合并 manifest 尚待 M3/M6/M7 一起验证。

### PR 准备信息（仅本地草稿，未创建/推送）

- 标题：`fix(policy): preserve sensitive-data hard denies in OBSERVE`
- Base：`feature/agent-canary-3.0`；Draft；关联 Issue #27。
- `API-Contract-Change: yes`；`Coordinated-with: M0, M1, M3, M6, M7`。
- `Test-Evidence: node --import tsx --test test/risk-policy.test.ts test/policy-management.test.ts test/false-positive.test.ts (43/43); node node_modules/typescript/bin/tsc --noEmit --pretty false (pass); git diff --check (pass)`。
- M0 owner 需先解决 M5 branch 与 canonical `docs/3.0/API_CONTRACTS.md` 的重复路径；M3/M5/M6/M7 需验收同一组合 manifest 与 package-smoke。达到这些门槛前 PR 不应标记 Ready 或合并。

当前本地确认 PR #27 的字段协作状态仍有待集成；GitHub 查询未找到以 `feature/ac3-policy-audit` 为 head 的 PR。本轮未进行远端写入、推送或提交。改动仍在 M5 工作树未提交。完整 M5 build/test/pack、组合 manifest CI、真实 M1+M5 宿主接线与真实副作用仍未验证。
