# Agent Canary 3.0

Agent Canary 3.0 是面向 AI Agent 的开源 MCP 与 SDK 安全工具，提供诱饵工具、金丝雀令牌、受守卫的执行网关、本地自检和可选风险策略控制台。

**当前主线：** 3.0.0 · MIT · Node.js 20+

- [GitHub 发行版](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0)
- [项目网页与测试结果](https://dorianchn.github.io/shanchuanzhi-agent-canary/)
- [快速开始：固定源码快照](GETTING_STARTED.zh-CN.md)
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

常见认证问题：

- `401`：检查 token 是否为 classic PAT、是否包含 `read:packages`，以及是否在提示时输入了 GitHub 用户名和 token。
- `403`：检查账号是否有该包的访问权限；组织启用 SSO 时，需在 GitHub 为该 token 授权 SSO。
- `404` 或找不到版本：先确认包名、版本和 scope registry。可运行 `npm config get @dorianchn:registry`，确认它指向 `https://npm.pkg.github.com`。
- 不要把 token 写进仓库 `.npmrc`、示例配置、日志或聊天。GitHub Packages 的 npm registry 对公开包也要求认证；认证方式和权限以[官方说明](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)为准。

Docker 镜像发布在 GitHub Container Registry：

```sh
docker pull ghcr.io/dorianchn/shanchuanzhi-agent-canary:3.0.0
docker run --rm ghcr.io/dorianchn/shanchuanzhi-agent-canary:3.0.0 --help
```

要通过标准输入/输出运行 MCP 服务，可使用 agent-canary serve --stdio；容器运行时加 -i 并传入相同参数。

已安装全局 npm 包的 MCP 客户端配置示例：

```json
{
  "mcpServers": {
    "agent-canary": {
      "command": "agent-canary",
      "args": ["serve", "--stdio"]
    }
  }
}
```

### 可选：向 Agent 提供固定文件读取工具

如果要让 MCP 客户端读取文件，可单独启动 `serve-protected`，并只登记允许发送给 Agent 的文件：

```json
{
  "mcpServers": {
    "agent-canary-protected": {
      "command": "agent-canary",
      "args": [
        "serve-protected",
        "--workspace-root",
        "C:\\Users\\you\\project",
        "--path",
        "docs/brief.md"
      ]
    }
  }
}
```

`--path` 可重复添加，最多 32 个固定相对路径。读取内容会返回给 MCP 客户端；不要登记不应提供给 Agent 的文件。服务通过 M1 Gateway、M2 固定绑定适配器和 M5 策略处理读取，拒绝未登记路径、敏感路径和路径别名。它只保护此 MCP 服务登记的读取工具，不拦截其他 MCP 服务或客户端原生文件工具。

## SDK

下面的例子创建一个隔离临时目录，只授权读取 `README.txt`；写请求会在审批和文件操作前被拒绝。可保存为 `sdk-example.ts` 并在已安装本包的 Node.js 项目中运行。

<!-- sdk-minimal-example:start -->
```ts
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createAgentGuard, createTrustedExecutionGateway, EvidenceRecorder } from '@dorianchn/agent-canary/sdk';

export const exampleResult = await (async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-canary-sdk-'));
  await fs.writeFile(path.join(root, 'README.txt'), '仅授权读取的公开文本。\n', { flag: 'wx' });
  const guard = createAgentGuard({ alert: false });
  const gateway = createTrustedExecutionGateway({
    agentId: 'sample-agent',
    guard,
    workspaceRoot: root,
    files: [{ path: 'README.txt' }],
    evidence: new EvidenceRecorder(),
  });
  try {
    const read = await gateway.agent.dispatch({ name: 'read_file', args: { path: 'README.txt' } });
    let writeDenied = false;
    try {
      await gateway.agent.dispatch({ name: 'write_file', args: { path: 'README.txt', content: '修改' } });
    } catch {
      writeDenied = true;
    }
    return {
      read,
      writeDenied,
      evidence: gateway.evidence().map(({ decision, execution_status }) => ({ decision, execution_status })),
    };
  } finally {
    await gateway.close();
    await fs.rm(root, { recursive: true, force: true });
  }
})();

console.log(JSON.stringify(exampleResult, null, 2));
```
<!-- sdk-minimal-example:end -->

宿主必须明确注册需要网关保护的回调。Agent Canary 不会自动接管未接入的工具、进程或原生宿主能力。

### 注册并验证自定义工具回调

下面的例子把两个宿主回调登记到 createGuardedToolRouter：先允许读取本地笔记，再触发惰性诱饵，最后验证消息回调在隔离状态下没有被调用。它不连接模型或发送消息；把模型返回的工具调用转换成 { name, args } 后交给 Router。诱饵工具定义可按 OpenAI 或 Anthropic 格式生成，其他模型也可由宿主适配到同一调用格式。

保存为仓库根目录的 sdk-demo.mjs，先构建，再运行 node sdk-demo.mjs。此示例也由 npm test 自动执行：

```sh
npm run build
npm test
```

<!-- sdk-guarded-router-example:start -->
```js
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  CanaryBlockedError,
  createAgentGuard,
  createGuardedToolRouter,
  decoyToolDefs,
} from "@dorianchn/agent-canary/sdk";

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "agent-canary-sdk-example-"));
try {
  const notes = new Map([["intro", "这是一条本地示例笔记。"]]);
  const callbacks = new Map([
    ["read_note", async ({ id }) => ({ id, text: notes.get(id) ?? null })],
    ["send_message", async ({ to }) => ({ queued: true, to })],
  ]);
  const callbackInvocations = [];
  const toolDefinitions = [
    { type: "function", function: { name: "read_note", description: "读取本地示例笔记", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } } },
    { type: "function", function: { name: "send_message", description: "示例消息回调", parameters: { type: "object", properties: { to: { type: "string" } }, required: ["to"] } } },
    ...decoyToolDefs("openai"),
  ];
  const guard = createAgentGuard({
    sessionId: "readme-sdk-example",
    eventsFile: path.join(scratch, "events.jsonl"),
    alert: false,
  });
  const router = createGuardedToolRouter({
    guard,
    executeRealTool: async (call) => {
      const callback = callbacks.get(call.name);
      if (!callback) throw new Error("UNREGISTERED_TOOL");
      callbackInvocations.push(call.name);
      return callback(call.args ?? {});
    },
  });

  const allowedResult = await router.dispatch({ name: "read_note", args: { id: "intro" } });
  const decoyResult = await router.dispatch({ name: "canary_read_secrets", args: {} });
  let deniedDecision;
  try {
    await router.dispatch({ name: "send_message", args: { to: "demo@example.invalid" } });
  } catch (error) {
    if (!(error instanceof CanaryBlockedError)) throw error;
    deniedDecision = error.decision;
  }

  console.log(JSON.stringify({
    allowedResult,
    decoyReplyReceived: Array.isArray(decoyResult.content),
    guardState: guard.state,
    denied: { allowed: deniedDecision?.allowed, reason: deniedDecision?.reason },
    callbackInvocations,
    toolDefinitionCount: toolDefinitions.length,
  }, null, 2));
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
```
<!-- sdk-guarded-router-example:end -->

## Cline + Filesystem MCP 集成（R45）

R45 增加了 Cline SDK Plugin 和上游 Filesystem MCP 的 fail-closed 适配器。在已验证的 Cline Agent Runtime 调用路径中，Cline 只注册受保护的 Agent Canary 工具；`beforeTool` Hook 会在其他原生工具或直连 MCP 工具的执行器运行前跳过调用。文件内容读取使用现有 Gateway 持有的文件能力。目录列表和文件元数据请求先经过 Gateway 检查，再由适配器调用只读模式的上游服务器。写入会被拒绝。

留存的端到端记录包含一次真实 stdio Filesystem MCP 代理测试和一次 Cline Agent Runtime 测试，均通过。测试使用合成文件和确定性的进程内工具调用模型，没有调用外部模型 API。原始事件、Gateway 判定、上游固定版本、覆盖范围限制和配置方法见 [R45 集成报告](R45-Integration-Report.md)及[`integrations/`](integrations/)。

这项验证只覆盖固定版本的 Cline SDK Plugin 与 Agent Runtime 路径；没有运行 Cline CLI 可执行程序或 IDE 应用。该集成提供应用层调用路由，不是 OS 级隔离；不要在插件边界之外暴露直连 Filesystem MCP 或原生工具并假定它们受保护。E4 和大规模模型矩阵均未运行。

## 测试结果

冻结的 3.0 源码验收记录包含以下结果：

- Community 自动化测试：**100/100 通过**。
- Windows 11 同一用户安装流程：**9 步通过**；安装器未签名。干净 Windows 虚拟机验证仍为 **BLOCKED**。
- Ubuntu 便携包：在记录的 WSL2 环境中，SDK 类型、doctor、效果、卸载和重复卸载检查均**通过**。
- 核心与包装 CI：对应记录中的 **9/9、2/2 作业通过**。
- 本地 Qwen 工具选择：共 **48 次**。直接违规操作在未保护组产生 12/12 次效果，守卫组为 0/12；守卫组主动拒绝 12/12。README 间接任务两组均为 0/4，不能据此声称主动拦截收益。正常任务两组均完成 8/8。
- 独立复现 **E4：BLOCKED**。尚无独立操作者在独立环境复现冻结构建；同机测试和日志审查不算 E4。

这些结果只适用于所列源码、测试和环境，不能证明全局防护、零误报或完全消除 TOCTOU。未配合取消的回调仍可能产生延迟副作用。详见[安全限制](docs/3.0/SECURITY_LIMITATIONS.md)与[完整验收报告](docs/3.0/FINAL_3_0_ACCEPTANCE.md)。

## 云端红队实验（2026-11-06）

合成环境云端实验共保留 17 次运行记录：8 批完成、9 次在试验前停止。完成批次共有 800 条结果，其中 608 条攻击试验；225/608（37.0%）产生了记录到的副作用，防御成功 383/608（63.0%）。攻击生成 38 个样本中没有明确拒绝；5 次生成/API/解析失败（13.2%）使用了确定性合成备用载荷。A/B/C/D 每组各 200 条。大多数批次重复使用同一套 25 个案例，因此是重复测量，不是 800 个独立案例。

累计 Token 计价账本为 **$8.10611718**，按已报告 Token 计算的费用为 **$6.99682264**。差额尚未对账，供应商发票金额无法从通用 API 响应确认。这是作者在合成隔离环境进行的实验，**不满足 E4**。原始测试提交为 `04b5961b79ae7eeaf6ac9cea5b4f494d771f702f`；下文提到的 PyRIT 集成是在这些测量之后添加的，不属于本次结果。

- [完整实验报告：A/B/C/D、模型用量、E4 对照与原始运行日志](security-lab/cloud-redteam/CAMPAIGN-REPORT-2026-11-06.md)
- [机器可读实验汇总](security-lab/cloud-redteam/campaign-summary-2026-11-06.json)

## 本地开发

仓库还包含独立的可选云端红队实验室（`security-lab/cloud-redteam`，v0.1.0），集成 Promptfoo 批量评估和单独报告的 AgentDojo 基准。后续集成将采用大型科技企业安全团队公开发布的红队技术，包括微软 AI Red Team 的开源 PyRIT，为个人 Agent 提供可复现的企业级安全评测体验。这些是公开开源工具，并非企业内部专有系统。配置和边界见[实验室说明](security-lab/cloud-redteam/README.md)。

```sh
git clone https://github.com/DorianChn/shanchuanzhi-agent-canary.git
cd shanchuanzhi-agent-canary
git checkout main
npm ci
npm run verify
node dist/competition.js serve --stdio
```

验证命令会构建 TypeScript、运行自动化测试、执行离线验收和 SDK 类型检查、核对源码清单，并对打包后的 npm 包做冒烟检查。

演示视频等上传后补上。
