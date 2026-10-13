# M5 策略与审计报告

**范围**：`feature/ac3-policy-audit` 上的确定性风险策略、项目策略管理、策略决策证据和 Canary Guard 接入。检查了 M0/M1 相关接口边界、`src/risk-policy.ts`、`src/containment.ts`、Hook、Gateway、现有证据/日志实现和对应测试。

## 结论

M5 增加了只能收紧策略的项目级规则、冲突预览、明确的放宽确认、追加式版本历史、托管策略路由及可校验的审计导出。未登记工具现在在 `OBSERVE`、`BALANCED`、`STRICT` 三种模式都直接拒绝。正常读取与审定开发命令保持可用；写入、构建等已知风险操作仍由宿主人工审批，不由模型批准。

默认模式仍为 `BALANCED`，Guard 隔离行为不变。默认策略没有降低。原有 Hook、Gateway 和 OSEP 证据协议没有被 M5 自动改写；在读到 M0 契约并协调后，才应做跨模块适配。

## 主要审计发现与处置

| 项目 | 检查结果 | M5 处置或边界 |
|---|---|---|
| 未登记工具 | 原策略把未登记能力放入人工审批；`OBSERVE` 还会覆盖该审批，缺少可信操作描述时仍可能调用宿主回调。 | 无注册描述时按 `UNKNOWN` 处理，兼容现有策略 API 返回 `DENY / unregistered_tool`，不入审批队列，所有模式 fail closed。 |
| 默认策略 | `BALANCED` 对普通只读按策略放行；写入、未审定 Shell/网络操作需宿主审批；已识别的越界、秘密外传拒绝。 | 保持既有默认。`OBSERVE` 会允许已注册操作的策略风险继续执行；Guard 隔离和未登记工具拒绝不受它覆盖。`OBSERVE` 是明确降低策略强制性的模式，仅适合演练。 |
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

## M0 契约与未完成的协调

已只读检查 `coordinator/docs/3.0/API_CONTRACTS.md`、模块归属/依赖文档及 Issue #27。M0 契约要求保持既有 `createRiskPolicyRouter` 的 `ALLOW|DENY|APPROVAL_REQUIRED` 语义、确保策略只收紧并保留 Gateway 最终执行复查。M5 为 API 兼容把未知工具表示为 `DENY / unregistered_tool`，并在 M5 审计事件中保留 `UNKNOWN`。M5 没有修改 M1 的 Hook、Gateway、Guard 或 `runtime/evidence.ts`；与 Gateway 组合时仍需把最终回调路由到 Gateway `agent.dispatch`。

该契约副本位于 `coordinator`，其 `.git` 指针已损坏且 Git 将其标为 `prunable`，所以无法确认 M0 文档变更的提交状态或由 M0 批准。新 `./policy` 导出和 `agent-canary.policy-audit/1` 是新增公共接口/事件格式，按契约需要同步 API 文档；该文档由 M0 工作区维护，M5 checkout 中没有此文件，未复制或修改另一工作区的文件。Issue #27 仍 OPEN，要求 M5/M6 确认 `package.json` 字段归属。Draft PR 正文应标注 `API-Contract-Change: yes`，并在 M0/M6 明确协调后补齐契约变更和 manifest 组合说明；此 PR 保持 Draft，不可据此合并。

被引用 Codex 线程在本会话可用工具中仍没有 `read_thread`，不能声称已读取该线程或获得 M0/M6 的实时同意。Hook/Gateway 目前只能由宿主显式调用 `policyManager.recordDecision()` 写入 M5 证据，尚未自动统一接线；共享适配、事件关联与合并顺序待协调。

## 验证范围

测试覆盖项目策略只收紧、冲突和回滚、未知工具、人工审批、普通开发任务、隔离/重置、工具失败状态、来源区分、脱敏、链篡改/截断和审计故障闭锁。自动化使用临时目录、假宿主回调及虚拟工具；不代表真实文件系统沙箱、Shell 语义解析、网络出口控制或外部身份认证已经验证。

最终验证：`npm run build` 通过；`npm test` 共 342 项，337 通过、0 失败、5 项因平台条件跳过；`npm run pack:check` 通过（92 个打包文件）；`git diff --check` 通过。
