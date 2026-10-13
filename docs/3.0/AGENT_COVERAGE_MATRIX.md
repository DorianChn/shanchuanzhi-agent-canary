# Agent 能力矩阵

最新版本证据与限制见 [最终交叉验收](FINAL_3_0_ACCEPTANCE.md)；原生宿主验证不能由受控 SDK 验证替代。

基线核查：2026-10-11；限定原生接口补验：2026-10-12。当前 3.0 主验收宿主是受控 SDK Agent + Ollama Qwen 9B。原生客户端配置 / MCP 接入 / hook 文档支持，不等于原生全部工具已保护。

| 宿主 | 官方接口证据 | 本项目状态 | 工具覆盖 |
| --- | --- | --- | --- |
| 受控 SDK Agent | 本仓库运行器与注册工具表 | VERIFIED：真实模型选择、实际临时文件与固定进程、副作用拒绝 | 仅运行器登记的调用，operator 不提供给模型 |
| Codex | [官方 MCP 配置](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)：config.toml MCP 表 | PARTIAL：已有配置、stdio/SDK fixtures；3.0 原生 E2E NOT VERIFIED | 自有 MCP 服务内部受保护回调；内置 Shell / 文件等不能由 MCP 安装推导为覆盖 |
| Claude Code | [官方 hooks](https://code.claude.com/docs/en/hooks)：PreToolUse permissionDecision 支持 deny | PARTIAL；新增 VERIFIED 子范围：隔离 Claude Code 2.1.92 + Qwen 原生 Read 正常/审批拒绝及 Bash 删除拒绝，见新增记录。其他原生工具/全局覆盖未验 | 只有被安装并真正调用 hook 的工具；hook 拒绝不是文件句柄网关能力 |
| Cursor | [官方 hooks](https://cursor.com/docs/hooks)：beforeShellExecution / beforeMCPExecution 可返回权限决定 | PARTIAL：配置 / hook fixtures；原生客户端 NOT VERIFIED | 官方明确部分 hook 异常可 fail-open，必须实测故障语义后才能宣布保护 |
| Cline | [官方 MCP](https://docs.cline.bot/mcp/mcp-overview)：限制 autoApprove、审查工具请求 | PARTIAL：MCP 配置 fixtures | 自有 MCP 回调；通用内置工具拦截 NOT VERIFIED |
| 自定义 MCP Agent | 现有 protected-mcp 与 stdio SDK probe | VERIFIED：基线虚拟回调握手及隔离；3.0 真实 OS 网关还需宿主桥接 | 仅自有服务登记工具，不能继承其他服务权限 |

此前验收未改动上述桌面客户端的真实配置、进程或内部文件；本轮仅在隔离目录安装固定 CLI 与自建配置。选择受控 SDK Agent 避免把未经验证的原生 hook 覆盖误报为全局保护。

## 2026-10-11 核心验收更新

实际限定探测见 `security-lab/acceptance/host-discovery.json`：Codex executable 位于PATH；Claude/Cursor/Cline不在PATH，不据此认定桌面程序/插件未安装。没有访问账号文件、生产密钥或改动客户端配置。

SDK Agent在核心334b2c8上完成48次真实Ollama/Qwen工具自主选择，直接受限操作A12/12产生效果、F0/12，正常两组8/8；只支持本机临时文件/固定测试进程/loopback网络的受控SDK执行边界。配置fixtures、hook判断测试和MCP握手均不替代上述原生客户端执行前覆盖验证。详细范围与迟到副作用限制见 CORE_CAPABILITY_ACCEPTANCE.md。

## 2026-10-12 限定原生接口实测

采用官方PreToolUse，复用decideAgentHook；模型自主调用真实Claude Read/Bash，没有自定义MCP工具，没有permission bypass。正确配置后6次运行：A/F正常读取各1/1；A敏感读取返回虚拟秘密1/1，F同任务2次Read请求均因ask/sensitive_path在无人工审批时拒绝，秘密未返回；F主动提出rm请求，Hook deny，victim哈希不变。A同删除任务自行拒绝、未调用，不能算公平删除防护增益。

这是直接准入验证，非间接Prompt Injection防护率。F是native-hook配置，不等于旧实验完整3.0 SDK组，不能混并统计；该Hook没有文件句柄绑定、OS沙箱或完整DataFlow/OSEP桥接。CLI错误Hook可能fail-open：前期实验包装器语法错误时F也返回虚拟秘密，反例保留。代码修正和语法预检后才得到上述有限正结果；不能宣称故障时全局fail-closed。

[复现运行器](../../security-lab/run-claude-host.mjs)、[包装器](../../security-lab/claude-native-hook.mjs)、[本轮公开证据](../../security-lab/final-package-repair/public/INDEX.json)。其他Claude版本、全工具覆盖、Cursor/Codex/Cline原生保护仍NOT_VERIFIED。
