# Agent 接入与覆盖状态

## 当前实现与证据

SDK 提供 detectAgents / previewAgentIntegration / installAgentIntegration / restoreAgentIntegration。检测仅检查配置目录元数据，不等于应用已安装。配置预览只返回本服务新增内容、路径与基准哈希，不返回已有配置或密钥。JSON 合并保留其他服务器，Codex TOML 追加独立表；已有同名服务拒绝覆盖。写前哈希核对、独占锁、项目外用户私有备份；用户随后修改文件时拒绝整体恢复。

控制台安装按钮写独立临时演示项目，不修改用户真实 Agent 配置。要接入真实项目，可信宿主调用同一 SDK，将 project 指定为自己审核过的绝对目录；不要把此权限暴露为模型工具。Cline IDE 配置位置以应用中 Configure MCP Servers 打开的文件为准；本安装器仅支持 CLI 官方结构。

|Agent|官方配置方式|本轮状态|Guard 覆盖|
|---|---|---|---|
|Claude Code|项目 .mcp.json；用户 .claude.json|配置 fixture VERIFIED；实际客户端 NOT VERIFIED|独立诱饵无全局保护；可接入受保护 MCP 宿主|
|Cursor|项目 .cursor/mcp.json|配置 fixture VERIFIED；实际客户端 NOT VERIFIED|本服务内 callback；内置/其他服务 OUT_OF_SCOPE|
|Cline CLI|指定用户目录下 .cline/data/settings/cline_mcp_settings.json|配置 fixture VERIFIED；实际客户端 NOT VERIFIED|本服务内 callback；IDE 位置需从应用确认|
|Codex|可信项目 .codex/config.toml|配置 fixture VERIFIED；实际任务 NOT VERIFIED|本服务内 callback；原生 Shell 等 OUT_OF_SCOPE|
|自定义 MCP 宿主|serveProtectedMCP + 可信 tools / schemas / executor|实际 SDK Client stdio 握手及隔离 VERIFIED_PROTECTED|只包括该进程内三项虚拟 callback；不推断任意第三方部署|

状态定义：MCP_DECOY_INSTALLED 仅表示配置已写；GUARD_INTEGRATED 表示宿主 callback 已接入；VERIFIED_PROTECTED 必须有对应真实运行证明；PARTIAL 表示缺少应用激活/任务验证；UNSUPPORTED 表示没有当前支持接口。

## 官方 Hook 适配器

src/agent-hook.ts 和 lab/agent-hook.mjs 提供 Claude PreToolUse 与 Cursor 权限 hook JSON 格式。适配器不执行工具，以可信启动参数绑定工作区和私有状态目录。会话标识来自宿主 hook 元数据，隔离主体固定为客户端与可信工作区真实路径，因此同一工作区新聊天不能绕过标记。诱饵意图和已注册 Token 参数触发 Guard；不提供 reset。状态目录有 1024 条保守容量，独占写锁；写入竞争或失败保留 fail-closed 标记，需可信操作者审查，不自动清理或放权。正常已审核命令 allow，模糊命令 ask，危险参数 deny。

输入/输出协议与隔离 fixture 已测试；没有安装或运行实际 Claude/Cursor 客户端，本轮标记 IMPLEMENTED_NOT_VERIFIED，不宣称覆盖已验证。人工在对应官方 hooks 配置中将 PreToolUse（Cursor 可选 preToolUse/beforeShellExecution）指向 node + lab/agent-hook.mjs + 客户端名 + 可信工作区 + 私有状态目录。必须先核对所用客户端版本的 hook 名称、工作目录、matcher 与超时行为，再在无危险副作用的项目内激活。不能给模型配置编辑/删除这些文件的权限。客户端对插件启动失败可能 fail-open，不能把该适配器当作 OS 沙箱。

## 一手资料

- [Claude MCP](https://code.claude.com/docs/en/mcp)
- [Claude hooks](https://code.claude.com/docs/en/hooks)
- [Cursor MCP](https://cursor.com/docs/mcp)
- [Cursor hooks](https://cursor.com/docs/hooks)
- [Cline MCP](https://docs.cline.bot/mcp/mcp-overview)
- [Codex MCP](https://developers.openai.com/codex/mcp)

2026-10-11 实际读取以上官方资料；平台支持 MCP 并不等于支持拦截全部内置工具。不擅自修改 Agent 进程或内存。
