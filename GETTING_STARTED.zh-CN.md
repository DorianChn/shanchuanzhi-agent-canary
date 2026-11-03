# 快速开始

本指南区分正在开发的 3.0 候选、固定的 v3.0.0 源码标签和 Windows 安装包。它们不是同一个构建。当前开发分支会变化；复现或提交问题时请记录完整 commit SHA 与 tree SHA。

## 从源码运行当前候选

需要 Git、Node.js 20 或更高版本、npm，以及下载依赖所需的网络。源码方式不需要 GitHub Packages 凭据：

```sh
git clone --single-branch --branch feature/agent-canary-3.0 https://github.com/DorianChn/shanchuanzhi-agent-canary.git agent-canary-source
cd agent-canary-source
git rev-parse HEAD
git rev-parse 'HEAD^{tree}'
npm ci
npm run build
node dist/index.js --help
node dist/index.js self-test --json
node examples/sdk/quick-start.mjs
```

SDK 示例只在临时目录里创建合成文件：允许读取预先登记的文件，拒绝未登记路径，并验证本地证据链；文件写入仍被禁用。以上源码自检不能证明模型效果、安装器生命周期、原生宿主保护或独立 E4。完整本地项目检查可运行 `npm run verify`，它也不能替代独立 E4。

此源码清单同时保留兼容版 `dist/index.js` 与 3.0 Community 命令入口 `dist/competition.js`。若要查看 Community 命令：

```sh
node dist/competition.js --help
node dist/competition.js self-test --json
```

不要把一个入口的帮助、版本或验收结果当成另一个入口的产品证明。

## 固定 v3.0.0 源码标签

要构建固定的 v3.0.0 源码快照，而非跟随开发分支：

```sh
git clone --depth 1 --branch v3.0.0 https://github.com/DorianChn/shanchuanzhi-agent-canary.git agent-canary-3.0.0
cd agent-canary-3.0.0
git rev-parse HEAD
npm ci
npm run build
node dist/competition.js self-test --json
```

截至 2026-10-25 的审查记录，GitHub 上的 v3.0.0 Release 没有附带二进制安装包；请在下载前查看 Release 页面确认当前附件。源码标签可构建；`npm run verify` 是源码与包检查，不代表原生宿主全局防护或独立 E4 通过。

## GitHub Packages 安装（下载可用性未验证）

源码清单声明的 npm 包使用 GitHub Packages。此渠道的当前可用性和包下载尚未独立验证；若只想先运行项目，使用上面的源码构建方式即可。

需要 Node.js 20+、npm、网络，以及有 `read:packages` 权限并获准读取该包的 GitHub Classic Personal Access Token。不要把 token 发到聊天、写进项目文件或提交含凭据的 `.npmrc`。配置 registry 并由 npm 交互式保存凭据：

```sh
npm config set @dorianchn:registry https://npm.pkg.github.com
npm login --scope=@dorianchn --auth-type=legacy --registry=https://npm.pkg.github.com
npm install --global @dorianchn/agent-canary@3.0.0
agent-canary --help
agent-canary self-test --json
```

若收到 401，检查 token 类型、`read:packages` 权限、账号包访问权限，以及 `@dorianchn` registry 地址。若收到 404，检查版本是否存在、账号是否能看见包；本项目包下载本身仍未独立验证。不要把 404 当作凭据正确或包一定存在的证明。

## 注册 Codex MCP 服务

固定 v3.0.0 的 CLI 可以预览项目级 `.codex/config.toml` 变更。先在一次性项目目录运行：

```sh
agent-canary integrate --agent codex --project .
```

检查输出的配置路径、启动命令、覆盖范围和基线哈希。默认是只预览，不写文件。确认目标确实是一次性目录后，才添加 `--apply` 应用；程序会创建回执和备份。备份可能含原配置敏感内容，勿分享或提交到 Git。用 `codex mcp list` 检查 MCP 注册状态。

此操作只注册 Agent Canary 自己的 MCP 服务，不会把 Codex 内置 Shell、文件或其他 MCP 工具转接到 Gateway。注册成功不代表这些原生工具受到保护；如需回滚，只能在配置未被后续修改时按回执执行 restore。

## 模型连接范围

可选的 AI 分析支持 OpenAI、Anthropic Claude、Google Gemini、Ollama，以及兼容 OpenAI Chat Completions 的自定义服务（如 DeepSeek、百炼、LM Studio、vLLM）。它不是任意厂商协议翻译器；具体协议、地址、密钥来源、隐私边界和未验证项见[模型接入说明](docs/AI_PROVIDERS.md)。AI 只提供建议，不会授权工具、重置隔离或替代确定性 Guard。

## 安全边界与 E4

Agent Canary 只保护经过其 Gateway、Guard 或明确注册回调的操作。原生宿主工具、任意 Shell 和未接入回调不因此受到保护。E4 必须使用固定源码/安装包和独立干净环境；本机自检、CI、合成夹具、模型接口模拟和已安装状态都不能替代独立产品验收。当前状态见 [E4 结论](docs/3.0/E4_FINAL_VERDICT.md) 与 [安全限制](docs/3.0/SECURITY_LIMITATIONS.md)。
