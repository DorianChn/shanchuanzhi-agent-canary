# Agent Canary 2.0 宿主集成指南

新增层可关闭；原有 12 个诱饵、Token、Guard、CLI 和免费 SDK 保留。公开 npm 版本号不变，不执行发布。

## 受保护 callback

使用 SDK 的 createSecurityToolRouter。可信宿主固定 tools 描述符、workspaceRoot、mode 和 executeRealTool；调用 router.dispatch({name,args})。原有 createRiskPolicyRouter 的默认行为不变。

- ALLOW：确定性规则允许。
- DENY：Guard 或确定性规则拒绝，或 AI 将模糊风险收紧为拒绝。
- REQUIRE_APPROVAL：SDK decide 的统一动作；旧 dispatch 错误保持 APPROVAL_REQUIRED 以兼容旧用户。
- SANDBOX：只在宿主提供 executeSandboxTool 时使用该 executor；平台不会凭空创建 OS 沙箱。
- OBSERVE_ONLY：可选策略观察；已经隔离的 Guard 仍拒绝。

inspectPolicy 是纯策略判断；decide 是建议决策。真正执行必须经过 dispatch，不能把单独 decide 的 ALLOW 缓存为永久授权。

## 事前 AI 审查

仅对 BALANCED 的模糊待批操作请求 Provider。明确安全和明确危险不等待模型。模型 suspicious 可收紧为 DENY；benign、uncertain、无效 JSON、超时和断线均不能授予执行权限。审核模型不是独立安全真相，可能误拒绝合法操作；宿主可关闭本层。云端必须逐次设置明确 cloudConsent 并约束费用；本控制台仅允许本地事前审查。

reviewTimeoutMs 默认 10 秒；callbackTimeoutMs 默认 30 秒。callback 接收 context.signal，宿主需要让实际 I/O 支持取消。超时会隔离 Guard。无法撤销已经开始的操作，也无法终止不支持取消的第三方 Promise 或阻塞的同步进程。

## 路径与网络

真实文件宿主可启用 verifyRealPaths 检查路径 containment 和别名。由于此 M5 Router 的通用 path-based callback 无法绑定到已检查的文件身份，启用后所有 file-read/file-write/delete 都会在回调前以 `path_execution_not_pinned` 拒绝；当前没有 M5 文件 I/O 正向执行路径。`verifyRealPaths: false` 保留历史词法检查兼容行为，不代表真实路径保护。M1 Gateway 的 held-fd 路径是独立接口，M5 不会自动识别或接入；生产 host wiring 仍需单独验证。

普通策略检测网络协议、明确私网字面地址、精确 origin、数据外传风险。任意自定义 callback 的 DNS 与实际连接不能由字符串检查保证。真实 JSON HTTP 可使用 executePinnedJSONTool：公共 HTTPS、DNS 检查并绑定 socket、禁止重定向、256 KB 上限、GET/POST 与取消支持。该 callback 不提供授权 Header，不用于生产凭据请求。自定义网络执行器必须提供等效控制，否则 DNS 重绑定 OUT_OF_SCOPE。

## 数据流记录

SessionDataFlow 使用随机会话 HMAC、来源标签、TTL、去重和容量上限，不保存原始敏感内容。同一 Guard 的 Router 替换不会清空记录；不同 Guard 不共享这些提示。未知秘密、编码、模型内部状态、外部工具回调无法完整关联。当前默认保守规则在观察到敏感来源后拒绝该 Guard 的后续网络请求；可能阻断无关网络操作。TTL 只控制记录；原有敏感读取安全标记不会因记录到期自动放权。不是完整动态污点分析。

## 人工批准

approve 与 denyApproval 是宿主接口，禁止注册为模型工具。SDK 的 acknowledgedBy 是审计标签，不是认证。控制台通过独立后端操作者能力凭据认证，仍需选择具体待批操作；一次性、过期、不可重放，模型 args 中 approval 字段无效。模式和事前审查切换使旧待批操作失效，Guard 不重置。

## 安全边界

只有经当前 Router 的 callback 受保护。只安装独立诱饵 MCP 不保护其他 MCP 服务、Agent 内置工具或已启动效果。保护不依赖 AI；AI 无权 reset Guard。权限依赖宿主可信注册的操作描述和实际 executor 能力，不能识别任意 Shell 语义或未声明的隐藏副作用。
