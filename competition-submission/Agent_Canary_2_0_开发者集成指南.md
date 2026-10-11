# 开发者最小接入

从 SDK 导入 createAgentGuard、createSecurityToolRouter，可信宿主固定工作区和工具描述，executeRealTool 实现 callback；模型调用只传 name/args，经 router.dispatch 执行。真实文件启用 verifyRealPaths；实际网络采用 executePinnedJSONTool 或等效受控 transport；实际 callback 应响应 AbortSignal。

需要标准 MCP 时调用 serveProtectedMCP，并提供可信 tools、schemas 与 executor。运行 node competition-submission/lab/verify-v2-mcp.mjs 可重现实际 stdio 客户端隔离验证（危险执行器是虚拟）。

approve / denyApproval 永远是可信宿主方法，不注册成模型工具。acknowledgedBy 只是审计标签，认证由宿主执行。

只保护注册到 Router 的宿主 callback。MCP 诱饵安装不等于全局保护；绕过 Guard、已开始的外部操作、模型内部状态 OUT_OF_SCOPE。AI 不能批准、重置 Guard 或改权限。realpath 仍有 TOCTOU 窗口；自定义网络 callback 需使用 DNS 固定与禁止重定向的安全 transport。来源提示不等于完整动态污点分析。

详细说明：docs/SECURITY_ROUTER_2.md；官方 Hook 适配器只验证 JSON fixture，不能推断实际客户端原生工具覆盖。
