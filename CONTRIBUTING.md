# 参与贡献

## 报告问题

开 issue 时请附上 `agent-canary doctor` 的输出（可脱敏），能省一轮往返。

## 加代码

    git clone https://github.com/DorianChn/shanchuanzhi-agent-canary && cd shanchuanzhi-agent-canary
    npm ci && npm run build && npm test

提交前应让对应回归测试通过；测试覆盖评测、事件、令牌、安装、配置、SDK 隔离和兼容性代码。

## 加诱饵工具

`src/decoys.ts` 里每个诱饵约 30 行：名字、描述（要写得让被劫持的 agent 心动）、
JSON Schema、伪造返回。硬性规则见 [SECURITY.md](SECURITY.md)：

- 诱饵永不执行真实操作，处理器只返回捏造的文本
- 返回内容里必须内嵌一次性追踪令牌（`token` 参数）

改完跑 `npm test`，其中有一条专门测试"诱饵永不执行真实操作"。

## 历史收款代码（sponsor/）

Agent Canary 2.x 不再销售功能或签发新许可证。不要将 `sponsor/` 网关部署为收款或激活服务。历史代码如需维护，只使用本地 demo 环境：

    cd sponsor && npm ci && node smoke.mjs

不要读取、覆盖或提交私钥、付款记录、订阅者数据、激活记录或环境文件；CI smoke 使用本地 demo 数据，不连接支付服务。

## 提交信息

一行说清"做了什么"，正文补充"为什么"。
