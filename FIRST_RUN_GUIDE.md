# Windows 首次接入：Codex

本向导当前只把 **Codex CLI 项目级 MCP 配置**列为端到端支持。其他宿主的官方 MCP 接口见 [HOST_COMPATIBILITY_MATRIX.md](./HOST_COMPATIBILITY_MATRIX.md)；没有接入实测的宿主不算 Agent Canary 已兼容。

## 开始前

- 准备 Node.js 20 或更高版本、可运行的 Codex CLI 和 Agent Canary 源码工作区，并完成 Codex 登录。
- 向导从 PATH 检测 Codex CLI 并读取 `--version`；仅有 Codex Desktop 或遗留配置文件不能替代可运行的 Codex CLI。
- 在要接入的项目目录运行；项目级 `.codex/config.toml` 只会在 Codex 信任此项目后加载。
- 向导使用项目配置，不改用户级 `%USERPROFILE%\.codex\config.toml`。如果用户级文件已有同名 `agent-canary` MCP 项，向导会停止并提示人工检查。

## 预览并接入

在源码工作区先执行 npm ci 和 npm run build，再运行下列命令。当前 package.json 未声明 agent-canary-competition 命令；Windows 发布构建是否提供此入口尚未验证。契约详见 [M3 接入 API](./docs/3.0/M3/ONBOARDING_API_CONTRACT.md)：

```sh
node dist/competition.js onboard --project "C:/work/my-project"
```

确认显示的目标路径和追加内容后，运行：

```sh
node dist/competition.js onboard --project "C:/work/my-project" --apply
```

交互终端中也可以省略 `--apply` 并在预览后输入 `y` 确认。非交互模式只预览，不写入。

向导只向项目 `.codex/config.toml` 追加下列 `mcp_servers.agent-canary` 表；不会重新序列化 TOML 或删除其他配置：

```toml
[mcp_servers.agent-canary]
command = "<本机 Node.js 路径>"
args = ["<Agent Canary 安装路径>/dist/competition.js", "serve", "--stdio"]
```

写入前会检查路径、TOML 格式、用户级同名项、项目级同名项和配置哈希。配置提交前会在 `%USERPROFILE%\.agent-canary-integration-backups` 创建项目外备份及回滚收据，路径会在命令输出中给出。工具尝试设置受限文件 mode；Windows ACL 未由本工具验证。**配置写入成功只说明 MCP 项已写入，不说明防护已生效。**

## 运行真实连接自检

运行：

```sh
node dist/competition.js connect-check --agent codex
```

这会用实际 Codex CLI 在临时 MCP 配置中调用合成只读工具，并核对 Trusted Execution Gateway 的 ALLOW 证据和临时 PreToolUse 探针结果。它不会修改用户级/项目级 Codex 配置，也不验证 Agent Canary Hook 已安装或已保护原生工具。临时目录结束后会删除。此命令会消耗一次 Codex/模型调用额度。

当前实测结果：Codex CLI `0.162.0-alpha.17.2` 成功调用 `public_read` 并得到 Gateway `ALLOW`；合成 `hook_probe` 也到达 Gateway，说明本次临时 Codex `PreToolUse` Hook **没有拦截**。命令因此把 Hook 状态单独标成未生效，不把 Gateway 连通结果描述成完整宿主保护。

该自检在隔离目录、临时 CLI 配置中运行，验证的是 Codex 调用 Gateway 测试桥的能力；它不验证你刚写入的项目配置已被现有 Codex 会话重载。接入后请重新打开 Codex 项目并用 `codex mcp list` 检查服务器是否连接。

## 保护范围

- 向导默认连接 `agent-canary serve --stdio`，提供 Agent Canary 自身的 inert decoy 工具，用于识别诱饵调用。
- Gateway 只会处理由可信宿主显式注册到 `createTrustedExecutionGateway({ mcpTools })` 的回调，并由 `runtime.agent.dispatch` 执行。
- Codex 原生 shell、文件编辑、浏览器、内建搜索，以及其他 MCP 服务器不会自动经过 Agent Canary。它们均为 `OUT_OF_SCOPE`。
- 向导不会安装 Codex Hook。本次 Hook 自检未证明 Hook 生效；在有实际 Hook 拦截证据前，不要把 Hook 视为保护边界。
- SDK/Gateway 不是 Windows OS 沙箱；它不会拦截绕过已登记回调的本地进程。

## 回滚

使用接入结果中的 `receiptPath`：

```sh
node dist/competition.js onboard --restore "<receiptPath>"
```

回滚仅在目标配置与安装后哈希完全一致时恢复备份。如果 Codex 或用户后来改过配置，回滚会停止并保留这些编辑；请人工比较变更后再处理。

## 常见问题

- **TOML 解析失败或同名项冲突：** 不会修改文件。先在 Codex 配置中人工处理格式/命名冲突，再重新预览。
- **提示项目路径错误：** 指向已经存在的项目目录，不要把文件路径、未创建的目录或快捷方式目标当作项目路径。
- **权限不足：** 关闭占用配置文件的程序，确认当前账户能写项目 `.codex` 子目录及 `%USERPROFILE%\.agent-canary-integration-backups`；不要用管理员权限绕过未知的目录 ACL。
- **连接自检未通过：** 检查 Codex 已登录、CLI 版本支持 MCP、网络可用；保留 CLI 错误码，配置文件本身不会因此回滚或被改写。
- **Codex 仍看不到服务器：** 确认项目已受信任并重新打开会话，再运行 `codex mcp list`。检测到服务器配置不等于工具调用已执行。
