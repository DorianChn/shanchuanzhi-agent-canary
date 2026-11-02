# 快速开始

本指南从已验证的 Agent Canary 3.0.0 源码快照构建，并固定源码提交，保证复现结果；不会检出不断变化的分支。

## 环境要求

- Git
- Node.js 20 或更高版本

## 构建与验证

```sh
git clone https://github.com/DorianChn/shanchuanzhi-agent-canary.git
cd shanchuanzhi-agent-canary
git checkout --detach 70fcc211b8c84b8613bc1ca5f10d30a8d4a832c2
npm ci
npm run verify
npm run self-test
```

在这个源码快照上，`npm run verify` 已通过构建、103 项自动化测试、离线验收、源码清单校验和 npm 包烟雾检查。`npm run self-test` 会报告四项通过：`safe_call`、`decoy_quarantine`、`blocked_callback` 和 `audit_order`。

这些结果只代表源码和本地检查通过，不等于独立 E4 验收、干净虚拟机安装通过，也不代表 Agent Canary 能控制宿主未注册的工具。请阅读[安全限制](docs/3.0/SECURITY_LIMITATIONS.md)和[验收报告](docs/3.0/FINAL_3_0_ACCEPTANCE.md)。

## 接入 Codex 项目

在仓库目录预览项目级 MCP 配置：

```sh
node dist/competition.js integrate --agent codex --project .
```

默认只预览，不会写入配置。请检查输出中的配置路径、启动命令和覆盖范围。该集成注册的是 Agent Canary 的 MCP 服务回调；Codex 原生工具仍不在保护范围内。确认后，可在命令末尾添加 `--apply` 应用配置；工具会保留私有备份。之后可运行 `codex mcp list` 查看生效的服务。详见 [OpenAI MCP 配置指南](https://developers.openai.com/learn/docs-mcp)。

也可以直接通过标准输入/输出启动 MCP 服务：

```sh
node dist/competition.js serve --stdio
```

## 配置一个受保护文件目标

控制台可在启动时绑定明确的工作区文件。先在当前 shell 环境设置 `AGENT_CANARY_OPERATOR_CODE`，然后运行：

```sh
npm run build
node dist/competition.js ai console --workspace-root . --protected-target handbook=README.md
```

可重复 `--protected-target id=相对路径` 添加固定目标。路径必须是工作区内已存在的普通文件；符号链接、junction、硬链接、敏感路径和越界路径会拒绝。Console 的 `POST /api/security-center/target-read` 只接受 `{"targetId":"handbook"}`，并要求当前页面的 CSRF 值和 `AGENT_CANARY_OPERATOR_CODE` 请求头；成功响应只包含 `status: ALLOW`，不会返回文件内容。

这是 Agent Canary 自身经过 M5 OBSERVE、固定 Gateway Adapter 和 M1 持有文件 Gateway 的受控读取路径。它不接管 Agent 原生文件工具，也不是独立 E4 或 OS 级原子 TOCTOU 证明。

npm 包和容器安装方式见[安装说明](README.zh-CN.md#安装)。GitHub Packages 可能要求认证；上面的源码构建路径不需要登录该 npm registry。
