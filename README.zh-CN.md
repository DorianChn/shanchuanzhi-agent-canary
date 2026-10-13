# Agent Canary 3.0

Agent Canary 3.0 是面向 AI Agent 的开源 MCP 与 SDK 安全工具，提供诱饵工具、金丝雀令牌、受守卫的执行网关、本地自检和可选风险策略控制台。

**当前主线：** 3.0.0 · MIT · Node.js 20+

- [GitHub 发行版](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0)
- [项目网页与测试结果](https://dorianchn.github.io/shanchuanzhi-agent-canary/)
- [English](README.md)
- [架构与验收报告](docs/3.0/FINAL_3_0_ACCEPTANCE.md)
- [源码与问题反馈](https://github.com/DorianChn/shanchuanzhi-agent-canary)

## 安装

npm 包发布在 GitHub Packages。先配置 @dorianchn scope，再使用具有 read:packages 权限的 GitHub classic personal access token 登录：

```sh
npm config set @dorianchn:registry https://npm.pkg.github.com
npm login --scope=@dorianchn --auth-type=legacy --registry=https://npm.pkg.github.com
npm install --global @dorianchn/agent-canary@3.0.0
agent-canary --help
```

Docker 镜像发布在 GitHub Container Registry：

```sh
docker pull ghcr.io/dorianchn/shanchuanzhi-agent-canary:3.0.0
docker run --rm ghcr.io/dorianchn/shanchuanzhi-agent-canary:3.0.0 --help
```

要通过标准输入/输出运行 MCP 服务，可使用 agent-canary serve --stdio；容器运行时加 -i 并传入相同参数。

## SDK

```ts
import { createTrustedExecutionGateway } from "@dorianchn/agent-canary/sdk";
```

宿主必须明确注册需要网关保护的回调。Agent Canary 不会自动接管未接入的工具、进程或原生宿主能力。

## 测试结果

冻结的 3.0 源码验收记录包含以下结果：

- Community 自动化测试：**100/100 通过**。
- Windows 11 同一用户安装流程：**9 步通过**；安装器未签名。干净 Windows 虚拟机验证仍为 **BLOCKED**。
- Ubuntu 便携包：在记录的 WSL2 环境中，SDK 类型、doctor、效果、卸载和重复卸载检查均**通过**。
- 核心与包装 CI：对应记录中的 **9/9、2/2 作业通过**。
- 本地 Qwen 工具选择：共 **48 次**。直接违规操作在未保护组产生 12/12 次效果，守卫组为 0/12；守卫组主动拒绝 12/12。README 间接任务两组均为 0/4，不能据此声称主动拦截收益。正常任务两组均完成 8/8。
- 独立复现 **E4：BLOCKED**。尚无独立操作者在独立环境复现冻结构建；同机测试和日志审查不算 E4。

这些结果只适用于所列源码、测试和环境，不能证明全局防护、零误报或完全消除 TOCTOU。未配合取消的回调仍可能产生延迟副作用。详见[安全限制](docs/3.0/SECURITY_LIMITATIONS.md)与[完整验收报告](docs/3.0/FINAL_3_0_ACCEPTANCE.md)。

## 本地开发

```sh
npm ci
npm run verify
```

验证命令会构建 TypeScript、运行自动化测试、执行离线验收和 SDK 类型检查、核对源码清单，并对打包后的 npm 包做冒烟检查。

演示视频等上传后补上。
