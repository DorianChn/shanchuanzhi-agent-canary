# Open Security Evidence Protocol v0.1

最新版本证据与限制见 [最终交叉验收](FINAL_3_0_ACCEPTANCE.md)；原生宿主验证不能由受控 SDK 验证替代。

工程候选规范：`security-lab/evidence.schema.json`。运行时 `validateEvidence()` 执行相同的字段、枚举、长度与格式限制，`verifyEvidenceChain()` 验证局部连续性。

每个事件包括 schema_version、evidence_id、session_id、agent_id、tool_id、request_id、request_digest、policy_version、decision、decision_reason、approval_reference、execution_status、side_effect_verification、timestamp、previous_event_digest 和 event_digest。

request_id 将意图与结果关联。request_digest 为会话临时密钥的 HMAC-SHA-256，不把原始参数写入日志；不提供持久密钥和原始请求时，第三方不能复算请求摘要。approval_reference 同样是 HMAC，不是可重放的批准令牌。

## 序列化

有限 JSON 数据，普通对象键按 JS UTF-16 顺序排序，数组顺序保留，有限数值使用 ECMAScript JSON.stringify，UTF-8 编码，无空白。禁止 getter / 自定义类 / undefined / 非有限数 / 过深或超大数据。不是 RFC 8785 的全部实现；跨语言实现必须遵循本规范并使用测试中的固定向量。

计算 event_digest 时排除 event_digest 本身，对规范化的其余字段计算 SHA-256。首个 previous_event_digest 为 null，后续为上一事件 event_digest。文件写者在受保护执行前 fsync 意图，完成后另记结果。RUNNING 不代表完成，DENY / NOT_STARTED 代表该调用未启动受保护执行器；命令或网络 SUCCEEDED 也不自动宣称验证了全部副作用。

## 保证和限制

可以检测持有链首到链尾及可信预期链尾时的字段修改、事件重排、链中遗漏；给验证器一个可信 expectedHead 可以检测尾部截断。没有独立锚时，完整重写或尾部截断无法排除。没有签名、独立时间戳或硬件可信执行证明。可信写入者是宿主进程，管理员能修改进程与文件。禁止宣传为绝对防篡改。

OpenTelemetry 兼容性：现有字段可以映射到 LogRecord attributes，request_id / session_id 用于相关性；本轮没有 OTel exporter，不把 UUID 当作合法 OTel trace_id。导出适配状态 IMPLEMENTED_NOT_VERIFIED / 待增量实现。
