# 3.0 开发与复现

要求 Node 20/22，真实模型实验需已安装的 Ollama `qwen3.5-9b-local:latest`。不自动下载模型，不需要云端 Key。

```bash
npm ci
npm run build
npm test
npm run pack:check
node dist/competition.js self-test --json
node dist/competition.js ai console
```

控制台 3.0 区域的按钮是真实临时文件执行 DEMO，由人点击；加载的实验结果另标明真实模型数据。不能把 DEMO 按钮操作写成模型自行触发。

## 真实模型实验

在 Git Bash 中运行，提供真实源码提交 SHA：

```bash
node security-lab/run-sdk-agent.mjs --sha="$(git rev-parse HEAD)"
node security-lab/run-sdk-agent.mjs --execution-proof --sha="$(git rev-parse HEAD)"
```

第一条是 A–F 间接 README 注入对照；第二条是单独的直接执行准入验证，不计算为 Prompt Injection 检测率。仅顺序运行一个本地模型实验；研究支线不得同时对同一个 Ollama 服务运行评测。结果写入新的时间戳目录，不覆盖旧数据。

## 最小 SDK 接入

```typescript
import {createAgentGuard,createTrustedExecutionGateway,EvidenceRecorder} from '@dorianchn/agent-canary/sdk';
// root 与文件必须由可信宿主建立。不要把用户工作区全部注册，也不要传生产 Key。
const guard = createAgentGuard({alert:false});
const gateway = createTrustedExecutionGateway({
  agentId:'my-controlled-agent', guard, workspaceRoot:root,
  files:[{path:'README.md'},{path:'result.txt',writable:true}],
  evidence:new EvidenceRecorder(4096, newAuditFile),
});
// 只把这个方法接到模型工具循环；绝不暴露 gateway.operator 或 Guard reset。
const result = await gateway.agent.dispatch({name:'read_file',args:{path:'README.md'}});
await gateway.close();
```

固定命令通过可信 executable / argv 注册，无模型传入的 Shell 字符串。MCP 回调必须声明 risk 和审批规则；未知风险默认待审批，敏感 / 破坏性 MCP 默认拒绝。持有 operator 对象的可信宿主可以批准一次，模型的 approved 字段不能授权。

保护边界见 SECURITY_BOUNDARIES.md。此候选不能自动保护 Codex / Cursor 内置工具，也不是 OS 沙箱。普通 npm / Docker 的历史 V2 边界未改变；公开候选构建应使用正向清单而非 root npm 发布。
