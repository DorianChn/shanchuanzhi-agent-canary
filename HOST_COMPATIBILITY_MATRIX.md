# Agent Canary 3.0 宿主兼容性矩阵

核验日期：2026-10-13。**官方支持 MCP 或 Hook 只说明宿主提供了接入面，不表示 Agent Canary 已接好、已运行或覆盖宿主内所有工具。**“已验证”只用于本文件列出的实测边界。

| 宿主 | 官方接口与配置位置 | Agent Canary 接入状态 | 防护范围与限制 | 当前结论 |
|---|---|---|---|---|
| OpenAI Codex CLI / Desktop | CLI 和 IDE 共用 Codex 配置；用户配置位于 %USERPROFILE%\.codex\config.toml（或由 CODEX_HOME/config.toml 指定），项目配置位于项目 .codex/config.toml。项目配置只对受信任项目加载。官方支持 codex mcp add 和 stdio MCP。 | 源码构建后可用 node dist/competition.js onboard --agent codex 提供项目级预览、显式写入、备份和安全回滚。当前 package.json 只声明 agent-canary -> dist/index.js；agent-canary-competition 发布命令未由包元数据确认，发行构建入口为 NOT_VERIFIED。只追加项目 MCP 表，同名用户级或项目级配置时停止。 | 向导添加的是 serve --stdio decoy MCP，不会把 Codex shell、文件编辑、浏览器或其他 MCP 服务转发到 Gateway。connect-check 在临时配置中实测 public_read 经 Trusted Execution Gateway.agent.dispatch 获得 ALLOW；这是合成只读回调，不代表安装项已受 Gateway 管控。该命令使用临时生成的 PreToolUse 探针；本机历史运行未拦截探针，但每次结果须以 status/checks 为准。 | **部分支持**：项目 MCP 配置向导已实现；Gateway 路径通过合成工具验证；Hook 实际状态需看本次检查；原生工具为 OUT_OF_SCOPE。 |
| Claude Code | 官方 MCP CLI 支持 user/project scope；常见位置为用户 `~/.claude.json` 和项目 `.mcp.json`。Claude Code Hooks 支持 `PreToolUse`，可匹配内建工具及 MCP 工具。 | 现有 CLI/SDK 能生成 JSON MCP 配置；仓库 `decideAgentHook` 适配 Claude 协议，但没有接入安全安装向导，也没有真实 Claude Code 端到端实测。当前工作站未检测到 Claude Code CLI。 | MCP 服务器本身只覆盖自己登记的工具。Hook 适配器是否被宿主加载、是否获得权限，需在 Claude Code 中独立验证；不能据此声称全局保护。 | **官方接口已查证，Agent Canary 未端到端支持**。 |
| Cursor | 官方 MCP 文件为项目 `.cursor/mcp.json` 和用户 `~/.cursor/mcp.json`；Cursor 也提供 MCP Extension API。`cursor-agent mcp list`、`list-tools` 可检查 CLI 服务器。 | 现有集成函数可预览/合并 JSON MCP 项；没有 Cursor CLI/UI 的实际连接测试。当前工作站未检测到 Cursor。 | 不会自动保护 Cursor 原生工具或其他 MCP 服务器；没有经实测的 Agent Canary Hook 接入。 | **接口有依据，Agent Canary 部分代码未端到端验证**。 |
| Cline | 官方 CLI MCP 配置默认位于 `~/.cline/data/settings/cline_mcp_settings.json`，可由 `CLINE_MCP_SETTINGS_PATH` 指定；支持 CLI 管理和 IDE 配置界面。Cline SDK 插件定义 `beforeTool` 等 Hooks。 | 未检测到 Cline CLI/扩展，未做真实宿主调用验证；Agent Canary 尚无 Cline 插件包。旧 CLI 写入路径使用项目相对位置，不符合官方默认用户级路径，因此本分支的 `integrate` CLI 拒绝 Cline 配置预览/写入；底层旧函数为兼容现有调用仍保留，不据此宣称兼容。 | 官方文档称 CLI、Hub、Desktop App 和 VS Code Extension 提供插件 worker bootstrap；SDK 宿主需自行提供 bootstrap 或回落至进程内模式。Cline 插件 Hook 属于 Cline SDK 插件生命周期，不等同于通用 MCP Hook，也不会替代 Gateway 能力绑定。 | **官方插件 Hook 有文档；Agent Canary 未端到端验证**。 |
| GitHub Copilot（VS Code） | 官方支持 `.vscode/mcp.json` 的 `servers` 格式，也支持项目 `.mcp.json` 与用户 `~/.copilot/mcp-config.json` 的 `mcpServers` 格式。 | Agent Canary 向导没有对应的 VS Code `servers` 配置适配器，也没有实测。 | 未注册到 Gateway 的原生 Copilot 工具不受保护。 | **不支持 Agent Canary 向导**。 |
| Gemini CLI | 官方 MCP 服务器放在用户或项目 `settings.json` 的 `mcpServers`；支持 `gemini mcp add/list`、项目/用户 scope。 | 没有 Gemini 格式适配器或真实测试。 | MCP 连接只引入服务器自身工具；不能推断宿主内建工具经过 Gateway。 | **不支持 Agent Canary 向导**。 |
| OpenCode | 官方 MCP 配置在项目 `opencode.json` 的 `mcp` 字段和用户 `~/.config/opencode/opencode.json`；支持 local/remote MCP。 | 没有 OpenCode 格式适配器或真实测试。 | 原生工具与其他服务器保持宿主自身执行路径。 | **不支持 Agent Canary 向导**。 |

## 当前开发工作站的只读检测

- Codex CLI：检测到，版本 `codex-cli 0.162.0-alpha.17.2`。
- Claude Code：未检测到 CLI；存在用户配置文件，因此只报告为“configuration-only”。
- Cursor、Cline：未检测到已安装 CLI/扩展。
- 检测只返回宿主名称、版本和配置路径，不读取或输出配置值。

检测边界：CLI 安装通过 PATH 中的公开命令发现，版本通过该命令的 `--version` 获取；只有配置文件时只报告 `configuration-only`，不能据此判断桌面应用仍已安装。Cline VS Code 扩展可通过扩展目录识别，但没有 CLI 时版本留空。当前向导只要求并检测 Codex CLI，不把 Codex Desktop 单独安装状态作为可执行接入证明。

## 关键范围说明

- `createTrustedExecutionGateway` 是可信宿主 API：可信宿主提供文件/命令能力及 `mcpTools` 回调，之后通过 `runtime.agent.dispatch` 调用。它不会接管已经存在的工具。
- `serveProtectedMCP` 当前经 `createSecurityToolRouter` 路由显式登记的回调；名称中含“protected”不意味着任意宿主工具已经经过 `createTrustedExecutionGateway`。
- CLI 的 `serve --stdio` 仅提供 Agent Canary 自身 MCP 工具。用户接入配置成功只代表宿主有这一个服务器配置。
- Codex 官方 `PreToolUse` 支持 MCP 名称匹配，也明确列出 Hosted tools 和特定本地工具路径的例外。本次实际 Hook 探针未拦截，矩阵因此不将 Codex Hook 计为 Agent Canary 已接通。

## 官方资料

- [Codex MCP 接入与 `codex mcp add`](https://developers.openai.com/learn/docs-mcp)
- [Codex 配置参考：MCP 项目配置、审批模式与受信任项目](https://learn.chatgpt.com/docs/config-file/config-reference)
- [Codex Hooks：事件、工具覆盖和 `PreToolUse`](https://learn.chatgpt.com/docs/hooks)
- [Claude Code MCP](https://code.claude.com/docs/en/mcp)；[Claude Code Hooks](https://code.claude.com/docs/en/hooks)
- [Cursor MCP](https://docs.cursor.com/context/model-context-protocol)；[Cursor CLI 参数与 MCP 命令](https://docs.cursor.com/en/cli/reference/parameters)
- [Cline MCP](https://docs.cline.bot/mcp/mcp-overview)；[Cline SDK Plugins/Hooks](https://docs.cline.bot/sdk/plugins)
- [VS Code MCP 配置参考](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)
- [Gemini CLI MCP servers](https://geminicli.com/docs/tools/mcp-server/)；[Gemini CLI 配置](https://geminicli.com/docs/reference/configuration/)
- [OpenCode MCP servers](https://opencode.ai/docs/mcp-servers/)
