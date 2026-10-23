# Agent Canary

**为受控 AI Agent 工作流提供诱饵信号和受守卫的工具回调。**

Agent Canary 提供无副作用的 MCP 诱饵和合成 Canary Token，用于暴露可能的失陷信号。可信宿主可以把已登记的工具回调接入 Agent Canary，并在信号出现后阻止后续经过该路径的调用。

## 项目状态

- **发行状态：** v3.0.0 已作为 [Agent Canary 3.0 GitHub Release](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0) 发布；该发行版对应其源码快照。
- **安装：** v3.0.0 源码清单声明了通过 GitHub Packages 分发的 CLI 包，该渠道需要带 `read:packages` 权限的 GitHub Token。本次审查未验证实际包下载；见[快速上手](GETTING_STARTED.md)中的固定 tag 源码构建方式。
- **容器镜像：** 本次审查**未验证**当前 GHCR 包和标签是否可用，也未执行本地拉取或运行；不要假定 `3.0.0` 或 `latest` 当前可拉取。
- **独立 E4 复现：** 尚未验证；[证据索引](E4_EVIDENCE_INDEX.md)列出已完成与未完成的检查。
- **许可证：** 本仓库代码为 MIT。第三方依赖各自保留原许可证，见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
- **运行环境：** 从源码构建需要 Node.js 20 或更高版本。

## 安全边界

Agent Canary 只保护可信宿主实际接入 Guard、Router 或已登记 Gateway 回调的调用。安装 MCP 服务或 Hook 不会把 Agent 放进操作系统沙箱。

本项目**不宣称**可以阻止所有提示注入、拦截未接入守卫的首次操作、控制 Codex/Claude/Cursor/Cline 的全部工具、撤销已经开始的操作，或保护原生 Shell。使用前请阅读 [SECURITY.md](SECURITY.md) 和[宿主兼容性矩阵](COMPATIBILITY.md)。

## 覆盖范围与限制

- **Codex 原生 Shell — UNPROTECTED（未受保护）：** Agent Canary 不会拦截 Codex 内置 Shell；MCP/Guard 接入不会改变这一点。
- **AppContainer — LIMITED（范围有限）：** 已验证的覆盖仅限已测试的子进程操作；不能据此推断整个宿主或通用 Shell 得到保护。
- **第一方 Security Center 受保护读取 — NOT_VERIFIED（未验证）：** 已审查的 M4 桌面源码没有通过 M2 adapter 消费 M1 绑定文件身份的第一方 OBSERVE 读取调用点。状态 UI 固定报告 `NOT_VERIFIED`，且 `GET /api/security-center` 没有服务端路由（返回 404）。临时文件演示和虚拟策略读取不能证明产品文件受到保护；见 [Issue #52](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/52)。
- **Security Center / E4 状态 API — UNKNOWN（未知）：** 已审查的桌面服务也没有 `GET /api/e4/status` 路由（返回 404）。状态接口缺失不能证明受到保护，也不能证明安全拒绝成功。
- **E4 — NOT_VERIFIED（未验证）：** 仅有 fixture 的证据不代表产品通过；独立 E4 仍为 NOT_VERIFIED。

## 从这里开始

- [五分钟上手与 Codex MCP 接入](GETTING_STARTED.md)
- [安全测试复现指南](SECURITY_TESTING.md)
- [兼容性与功能成熟度](COMPATIBILITY.md)
- [E4 证据索引与当前限制](E4_EVIDENCE_INDEX.md)
- [升级说明](UPGRADING.md)

## 项目与社区

- [参与贡献](CONTRIBUTING.md)
- [获取支持与反馈渠道](SUPPORT.md)
- [私下报告安全漏洞](SECURITY.md#report-a-vulnerability)
- [提交产品体验反馈](https://github.com/DorianChn/shanchuanzhi-agent-canary/discussions)
- [提交可复现的问题](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/new/choose)
- [发行版与预发布状态](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases)

自检或 CI 通过只说明指定代码路径在对应环境完成了检查，不等于第三方认证、安全保证，也不能证明宿主原生工具已受保护。
