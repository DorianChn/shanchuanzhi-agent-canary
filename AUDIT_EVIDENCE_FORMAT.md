# M5 策略审计证据格式

## 文件与版本

- 事件 schema：`agent-canary.policy-audit/1`
- 导出 schema：`agent-canary.policy-evidence-export/1`
- 本格式是 M5 项目策略管理器的独立追加日志；它不会自动替换现有 Hook/Gateway 或 OSEP 事件协议。
- 默认数据目录为 Agent Canary 用户数据目录（可由宿主指定）；策略证据不写进 Agent 可修改的项目目录。项目路径本身不记录，仅记录其 SHA-256 项目标识。

## 事件结构

每行是一个 JSON 对象。字段均为必需字段：

| 字段 | 含义 |
|---|---|
| `schema_version` | 固定为 `agent-canary.policy-audit/1`。 |
| `event_id`、`timestamp` | UUID 与 UTC ISO-8601 时间。 |
| `project_id` | 项目真实路径规范化后 SHA-256；不保存原始路径。Windows 路径按大小写不敏感处理。 |
| `event_type` | `POLICY_APPLIED`、`POLICY_ROLLED_BACK`、`POLICY_CHANGE_REJECTED`、`DECISION` 或 `EXECUTION_RESULT`。 |
| `policy_version` | 单调递增的项目策略版本；决策事件引用其生效版本。 |
| `invocation_source` | `SDK`、`NATIVE_HOOK`、`GATEWAY` 或 `HOST`。由宿主适配器提供，不能从模型参数读取。 |
| `decision_source` | `PROJECT_POLICY`、`DETERMINISTIC_POLICY`、`MODEL_REVIEW`、`CANARY_GUARD`、`NATIVE_HOOK`、`GATEWAY`、`TOOL` 或 `HOST`。 |
| `decision` | `ALLOW`、`DENY`、`UNKNOWN`、`REQUIRE_CONFIRMATION` 或 `NOT_APPLICABLE`。 |
| `execution_status` | `NOT_STARTED`、`SUCCEEDED`、`FAILED` 或 `UNKNOWN`。M5 不会在无法证明副作用时使用 `FAILED`。 |
| `side_effect_verification` | `NOT_STARTED`、`VERIFIED`、`NOT_VERIFIED` 或 `UNKNOWN`。callback 返回成功默认为 `NOT_VERIFIED`。 |
| `reason_code`、`tool_id` | 稳定原因码与经过格式校验的工具 ID；工具 ID 可为空。不得放原始参数、URL、路径、正文或异常文本。 |
| `actor_digest` | 操作者字符串的项目作用域 HMAC-SHA-256 摘要；不保存原字符串。可为空。 |
| `rule_ids`、`rules_snapshot` | 本次相关规则 ID；版本变更时保存完整规范化规则快照。 |
| `previous_event_digest`、`event_digest` | 前一条记录的摘要及当前事件摘要，首事件的前序摘要为空。 |

示意记录（摘要用占位文本缩写，**不是可直接校验的真实样例**）：

```json
{
  "schema_version": "agent-canary.policy-audit/1",
  "event_id": "00000000-0000-4000-8000-000000000000",
  "timestamp": "2026-10-13T00:00:00.000Z",
  "project_id": "<sha256>",
  "event_type": "DECISION",
  "policy_version": 1,
  "invocation_source": "SDK",
  "decision_source": "PROJECT_POLICY",
  "decision": "DENY",
  "execution_status": "NOT_STARTED",
  "side_effect_verification": "NOT_STARTED",
  "reason_code": "project_network_restricted",
  "tool_id": "fetch_docs",
  "actor_digest": null,
  "rule_ids": ["deny_docs_network"],
  "rules_snapshot": null,
  "previous_event_digest": "<previous-sha256-or-null>",
  "event_digest": "<event-sha256>"
}
```

## 事件来源和失败语义

- 模型建议拒绝：`decision_source=MODEL_REVIEW`。模型回调最多能收紧为拒绝，返回 `UNCHANGED` 不能授权高风险操作。
- Native Hook 拒绝：`invocation_source=NATIVE_HOOK`、`decision_source=NATIVE_HOOK`。
- Gateway 拒绝：`invocation_source=GATEWAY`、`decision_source=GATEWAY`。
- 工具 callback 抛错：`decision_source=TOOL`、`execution_status=UNKNOWN`、`side_effect_verification=UNKNOWN`，原因码为 `tool_execution_failed_effects_unknown`。callback 抛错不能证明其副作用为零。
- callback 正常返回：`execution_status=SUCCEEDED`、`side_effect_verification=NOT_VERIFIED`。这只表示 callback 返回，不等于外部系统副作用已独立核验。
- `decision=DENY` 且 `execution_status=NOT_STARTED` 才表示本事件所描述的回调未启动。审计日志本身不是执行拦截器。

Hook/Gateway 的自动适配尚未接入；宿主可调用 `policyManager.recordDecision()` 写入对应来源。最终的跨模块字段契约与关联 ID 需按 M0 协议对齐。

## 摘要、完整性与导出

每个事件先以 `runtime/evidence.ts` 的 canonical JSON 表示计算 SHA-256 摘要，再引用前一事件摘要。实现的 canonical JSON 规则是项目本地格式，不宣称 RFC 8785 兼容。校验器检查 schema、字段、版本序列、前序摘要和事件摘要，并可用 `expectedHead` 检测整链尾部被截断或替换。

项目事件文件旁保存 `.jsonl.head` 检查点：空日志以 `EMPTY` 标记初始化，每次成功追加后更新为最新事件摘要。管理器会比较日志尾部与检查点；已初始化后日志丢失、检查点缺失或二者不一致都会 fail closed。它能检测单独删除日志或尾部截断，但不能防御拥有本地存储写权限的攻击者同时改写/删除日志与检查点，所以外部保存可信 head 仍是取证锚点。

```ts
const bundle = manager.exportEvidence();
const result = verifyPolicyEvidenceExport(bundle, trustedHead);
manager.writeEvidenceExport('/path/outside/project/policy-evidence.json');
```

导出文件使用独占创建，不覆盖现有文件；数据文件按非 Windows 平台 `0600` 创建。导出中的 `anchored_head` 只是随文件携带的头摘要，并非独立可信签名。验证时应通过不同可信渠道保管最近的 `evidenceHead()` 并作为 `expectedHead` 传入。没有外部锚点时，完整链验证只能发现内部篡改，不能证明文件来自某个可信主机，也不能抵御有权重写整个本地存储的攻击者。

项目策略证据有 100,000 事件及 32 MiB 上限；到达上限或校验/存储故障时策略管理器 fail closed，不继续执行托管回调。托管 callback 执行期间持有该项目的排他存储锁，以保证最终决策与执行结果引用同一策略版本；同时发生的策略写入会报忙并未应用，宿主可在回调完成后重试。导出不加密；宿主需保护数据目录、HMAC key 与外部锚点。Windows ACL 由宿主环境管理。

## 脱敏边界

- 不把原始 `args`、工具结果、完整 URL、请求正文、文件路径或异常消息写入 M5 证据。
- 只存格式约束的工具 ID、有限原因码、规则元数据和操作者 HMAC 摘要。
- 规则快照含工具选择器与管理员给的原因码，因此不应把秘密放进规则名或原因码。
- 旧 Guard 告警 JSONL 有各自的字段和脱敏机制；不能把 M5 审计链的通过当作旧日志或 Hook/Gateway 日志已验证。
- 本地哈希链不等于签名或不可变存储。高保证取证应把可信头摘要存放到权限分离的外部审计系统；跨模块统一需等待 M0 接口契约。
