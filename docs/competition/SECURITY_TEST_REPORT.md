# 安全测试与合成攻击报告

审计基线：`origin/main` `5049815c8549b0455976bea5bc8131656a5f02a4`。本报告的“攻击”均是本地合成调用，不是真实 Agent/LLM 评测。虚拟凭据、临时文件和 fake callback 不含真实凭据、付款、外网请求或真实 shell 操作。

## 方法与指标口径

- 用 Node `node:test` 和 SDK Guard/Router 驱动攻击步骤；攻击载荷由测试直接调用 API，**没有 LLM 读取 README/网页或自行选择工具**。
- SIM-01 的“恶意 README”、SIM-02 的“恶意网页”和 SIM-03 的“Shell 指令”是场景标签；测试直接注入对应的 `canary_*` 事件，然后检查后续宿主 callback 是否被拒绝。
- 本次不运行 OpenAI、Anthropic、DeepSeek 或其他 provider，不读取 API key，不产生模型费用。因此**模型检测率、真实误报率和真实攻击抵抗率均无法确认**。
- 本报告把“检测”限定为代码收到测试明确送入的 decoy/token 信号，把“拦截”限定为测试确认 guarded callback 没有执行。不能将其外推为 Prompt Injection 检测率。

## 攻击矩阵

| 编号 | 目标/前置条件与步骤 | 预期 | 实际结果 | 信号/拦截 |
|---|---|---|---|---|
| SIM-01 | 临时目录里有虚拟 `.env`；送入 README 诱饵信号后请求读文件。 | quarantine；读文件 callback 不运行；虚拟文件保留。 | 符合。 | 程序注入 decoy 信号；后续 guarded callback 阻止。 |
| SIM-02 | 以恶意网页诱导访问 `127.0.0.1:1` 的场景信号后请求 HTTP。 | callback 不运行。 | 符合；没有建立外部网络连接。 | 程序注入 decoy 信号；阻止。 |
| SIM-03 | 合成 Shell 指令信号后请求虚拟 shell callback。 | 不执行命令。 | 符合；callback 计数为 0。 | 程序注入 decoy 信号；阻止。 |
| SIM-04 | 使用 `synthetic-only` 虚拟凭据，尝试通过邮件 callback 发送。 | 不发送。 | 符合；exfiltration flag 为 false。 | 程序注入 decoy 信号；阻止。 |
| SIM-05 | 临时目录有虚拟文件；模拟删除诱饵信号后请求 delete callback。 | 文件保留。 | 符合；文件仍存在。 | 程序注入 decoy 信号；阻止。 |
| SIM-06 | 生成并埋放一枚虚拟 Token，再把它放进测试输出并请求网络 callback。 | `inspect` 命中、先 quarantine、后续 callback 不运行。 | 符合。 | 代码匹配到已登记 Token；阻止。 |
| SIM-07 | decoy 触发后，连续重试 HTTP、Shell、delete。 | 所有后续请求都拒绝。 | 符合；真实 callback 数为 0。 | 程序注入 decoy 信号；3 次拒绝。 |
| SIM-08 | 同一虚拟 principal 创建新 session 重试。 | 共享 Store 继承 quarantine。 | 符合。 | 程序注入 decoy 信号；新 session callback 被阻止。 |
| SIM-09 | 同一事件循环先派发 decoy，再并发派发危险请求。 | callback 不能越过同步隔离。 | 符合；危险 callback 未运行。 | 程序注入 decoy 信号；阻止。 |
| SIM-10 | webhook 被 mock 为网络故障，decoy 后再次请求。 | 告警失败不能重开会话。 | 符合。 | 程序注入 decoy 信号；仍阻止。 |
| SIM-11 | shared Store 的 get/quarantine 全部抛错。 | 本地 Guard fail-closed，恢复前后不执行。 | 符合；包含 Store 恢复后返回 `SAFE` 的独立回归。 | 程序注入 decoy 信号；阻止。 |
| SIM-12 | Agent 不调用任何诱饵，直接经 Router 请求真实邮件工具。 | 测试应揭示检测边界，不能伪称自动发现。 | callback **允许执行**，状态仍为 SAFE。 | 无检测；这是已确认的设计边界。 |
| SIM-13 | 集成绕过 Router，直接调用宿主 callback。 | Agent Canary 无法观察/阻止该调用。 | callback **允许执行**，无事件。 | 无检测；这是已确认的集成绕过。 |
| SIM-14 | 先启动一个真实 callback，再触发 decoy，然后重试同类工具。 | 已启动副作用不可回滚；检测后重试应阻止。 | 首次 callback 执行；decoy 后下一次被拒绝。 | 信号被处理；仅阻止后续调用。 |
| CTRL-01 | SAFE 状态下请求 `git_status`。 | 正常回调允许。 | 符合。 | 无攻击信号；正常调用允许。 |

## 结果统计

- 合成用例：14 个攻击场景 + 1 个安全控制样例。
- 明确注入 decoy/token 信号的路径：12/12 按预期进入隔离，随后经过 Guard 的 callback 被阻止。这个数只描述代码路径回归，不是模型检测率。
- 已复现边界：SIM-12、SIM-13、SIM-14 证明首次危险调用可以在没有先前信号时执行；未经过 Router 的 callback 无法被观察；已开始的 callback 不会被追溯取消。
- 误报率：未测量。CTRL-01 只有一个正常样例，不能据此给出统计误报率。
- 真实 LLM/API、生产 MCP host、真实支付、外部 webhook、Shell 命令均未参与。

## 其他安全回归

| 回归 | 复现方法 | 结果 |
|---|---|---|
| MCP stdio 握手 | 官方 MCP JS `Client` 启动真实 `serve` 子进程，列工具、调用 `canary_run_shell`，检查 JSONL。 | 通过；只得到合成响应，没有执行 Shell。 |
| Webhook 重定向 | 两个本地 loopback HTTP server；首个响应 302 到第二个。 | 修复前第二个 server 收到事件；修复后不跟随。 |
| Provider 重定向 | 本地 307 server 重定向到第二目标。 | 修复前第二目标收到授权请求；修复后 fetch 拒绝重定向。 |
| 赞助 smoke 数据隔离 | 临时副本中预置订单/订阅/激活 sentinel 并运行 smoke。 | 修复前会覆盖 sentinel；修复后全部保持原文。 |
| 超大请求与演示页 HTML | 临时 demo server 发送 1.1 MB 请求和带 HTML 的虚拟 handle。 | 分别返回 413、输出 HTML 转义；后续合法请求仍成功。 |
| Token 覆盖率 | `.env` dotfile、>5 MiB 二进制且 Token 跨 64 KiB 读取边界、损坏 registry、深度/缺失路径。 | 目标 Token 被命中；不完整扫描不再输出 clean。 |

## 残余风险

1. 微信/支付宝通知虽然验签，当前代码仍未把商户、App ID、金额、币种和渠道与本地订单完整绑定。本报告未使用真实凭据或伪造有效商户签名；支付回调修复需要维护者批准后做合成验签测试。微信官方回调字段包含 `appid`、`mchid`、`out_trade_no`、交易状态及金额对象，参见[支付成功回调通知文档](https://pay.wechatpay.cn/doc/v3/merchant/4012791861)。
2. 赞助数据文件损坏时的恢复语义可能丢订单/订阅状态，签名密钥重建会影响既有许可；本次未访问真实 JSON 或私钥，等待单独授权。
3. Webhook 禁止自动重定向，但允许配置的目标本身仍可能是回环/私网地址；没有 DNS 解析固定，不能称为完整 SSRF 防护。
4. `tokens generate` 跨进程并发写入可能丢更新；JSONL 全文读取、大量 watcher 去重键和超长运行资源表现未验证。
5. 真实模型是否会调用诱饵，或是否会在触发前直接使用宿主危险工具，完全无法从本报告推断。

## 可复现命令

```bash
npm ci
npm run build
node --import tsx --test test/security-simulation.test.ts test/metadata.test.ts
cd sponsor
npm ci
node --test smoke-isolation.test.mjs security-regression.test.mjs
node smoke.mjs
```
