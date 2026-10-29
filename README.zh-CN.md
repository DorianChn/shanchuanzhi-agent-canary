# Agent Canary

**为 AI Agent 的工具调用提供信号、隔离与证据。**

Agent Canary 是面向 AI Agent 和 MCP 开发者的开源项目，结合诱饵工具、Canary 令牌、会话 Guard、可配置策略和证据记录。实际保护范围取决于宿主是否将工具调用接入相应路径。

[项目网站](https://dorianchn.github.io/shanchuanzhi-agent-canary/) · [3.1 源码版本](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.1.0) · [开发文档](docs/3.0/DEVELOPER_GUIDE.md) · [证据索引](docs/3.0/E4_EVIDENCE_INDEX.md) · [English](README.md)

## 项目能力

- **发现信号：**不执行模拟操作的诱饵工具和已登记的 Canary 令牌提供可检查的事件。
- **限制后续调用：**Guard 与策略约束经过接入、受守卫路径的后续调用。
- **保留证据：**记录决策、执行状态与失败，便于复现和审查。
- **集成：**MCP stdio 服务与 SDK 供宿主明确接入；参见[兼容性](COMPATIBILITY.md)和[接入指南](docs/AGENT_INTEGRATIONS_2.md)。

信号可能因误操作触发，需要结合上下文核查。会话隔离不能撤销已经开始的外部操作。

## 版本和保护边界

| 项目 | 当前状态 |
| --- | --- |
| GitHub 3.1 | [v3.1.0](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.1.0) 是**源码版本**，对应提交 `34fbe6d35d4dea30795525bf538f97194758c6c4`；没有附带安装包或预构建程序。 |
| npm 版本 | 源码中的包版本仍为 **1.2.7**；GitHub 3.1 标签不代表 npm 已发布 3.1。 |
| 原生 Codex Shell | 内置 Shell 不经过 Agent Canary 的保护路径，未建立全局保护。 |
| 受保护读取 | 真实宿主使用绑定身份和路径替换控制仍未验证；参见 [Issue #52](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/52)。 |
| E4 | 独立产品级 E4 验收**未验证**；合成测试、源码测试和基线 CI 是不同的证据。 |
| 后续开发 | M1–M8 的后续修改仍在各自的 Draft PR 中，未全部包含于 3.1 源码标签。 |

只有实际接入的工具路径才受相关策略约束。后端缺失或不可用不能视作保护成功。使用前请阅读[兼容性](COMPATIBILITY.md)、[接口契约](docs/3.0/API_CONTRACTS.md)与 [E4 证据索引](docs/3.0/E4_EVIDENCE_INDEX.md)。

## 从 3.1 源码构建

需要 Git 和 Node.js 20 或更新版本。请在受控环境中审查源码和依赖后运行：

```bash
git clone --branch v3.1.0 https://github.com/DorianChn/shanchuanzhi-agent-canary.git
cd shanchuanzhi-agent-canary
npm ci
npm run build
```

运行 `npm test` 可执行源码测试。源码测试通过并不代表原生宿主工具保护、安装后的产品行为或独立 E4 已获验证。[入门指南](GETTING_STARTED.md)中标明的 v3.0.0 步骤属于历史版本。

## 工作方式

```text
宿主接入 → 已注册工具调用 → 策略 / Guard → 执行
                           ↘ 信号 / 证据 → 审查
```

这是概念流程，具体覆盖范围和接口取决于宿主与配置路径。参见[开发指南](docs/3.0/DEVELOPER_GUIDE.md)和[安全 Router](docs/SECURITY_ROUTER_2.md)。

## 证据与历史版本

- [受保护读取的当前问题与验收标准](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/52)
- [E4 证据索引](docs/3.0/E4_EVIDENCE_INDEX.md)与[独立复现指南](docs/3.0/E4_REPRODUCTION_GUIDE.md)
- [历史 2.0 模型实验原始数据](competition-submission/evidence/v2-summary.json)与[审计报告](docs/competition/AGENT_CANARY_2_FINAL_REPORT.md)：结果来自受控场景和有限样本，不能推导为普遍保护效果。
- [历史 Windows Community candidate.4](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0-competition-candidate.4)：独立的旧版制品，不是 3.1 源码版本。
- [3.1 源码提交中的旧版详细中文 README](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/34fbe6d35d4dea30795525bf538f97194758c6c4/README.zh-CN.md)。

## 参与项目与安全报告

可在 [Issues](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues) 提交可复现的问题，或在 [Discussions](https://github.com/DorianChn/shanchuanzhi-agent-canary/discussions) 讨论集成。请保留失败结果，区分实际观察与推测。敏感漏洞请遵循 [SECURITY.md](SECURITY.md)。

项目采用 MIT 许可证；第三方许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。