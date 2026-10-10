# Agent Canary 项目专项审计

审计基线：GitHub `origin/main`，`5049815c8549b0455976bea5bc8131656a5f02a4`。
审计分支：`competition/agent-canary-hardening`。
范围：本审计工作树中的 70 个基线跟踪文件；不读取赞助服务现有订单、订阅、激活或私钥文件。

## 结论摘要

项目已有可工作的 MCP stdio 诱饵服务、公开 SDK、同步会话守卫、令牌生成/扫描、CLI、离线自检和打包检查。基线构建、74 项原有测试、包检查和 `verify` 均通过；但基线测试没有覆盖跨进程/存储回滚、隐藏及大文件扫描、MCP 进程握手、赞助 smoke 的真实数据隔离等关键场景。此次增加回归和合成攻击模拟，并修复了其中可在当前许可范围内修改的问题。

**防护范围：**诱饵只产生合成响应。拦截仅作用于集成方实际交给 `createGuardedToolRouter()`、`guard.executeToolCall()` 或 `guard.beforeToolCall()` 的调用。独立 MCP 诱饵服务不是通用 MCP 代理，也不是全局 Agent 防火墙；未被检测到的首次危险调用、绕过守卫的宿主回调、真实模型是否触碰诱饵均未由本次测试证明。

## 架构与数据流

```mermaid
flowchart LR
  U[不可信文件或网页] --> A[宿主 AI Agent]
  A -->|canary_*| M[MCP stdio 诱饵服务器]
  M --> D[合成结果与诱饵事件]
  D --> G[宿主创建的 Session Guard]
  A -->|真实工具请求| R[createGuardedToolRouter]
  R --> G
  G -->|SAFE| C[宿主真实回调]
  G -->|已隔离| B[拒绝回调并记 action_blocked]
  T[令牌扫描/guard.inspect] --> G
  D --> L[脱敏 JSONL / 可选 Webhook / 桌面提示]
  CLI[CLI] --> M
  CLI --> T
  S[赞助与许可服务 sponsor/] -. 独立商业路径 .-> K[订单、订阅、激活与签名密钥]
```

| 模块 | 实际职责 | 证据状态 |
|---|---|---|
| `src/decoys.ts`, `src/server.ts` | 注册 12 个模拟诱饵；MCP stdio 列出并返回合成响应。每次调用会更新本地 Token 注册表和事件日志，可触发已配置告警；不执行模拟的转账、读密钥、shell 等操作。独立 MCP 服务不会自动隔离其他服务的工具。 | MCP JS Client 真实子进程握手、列举和调用已测。 |
| `src/containment.ts`, `src/sdk.ts` | `SAFE → TRIPPED → QUARANTINED`；诱饵同步隔离；Router 在调用宿主回调前检查；支持精确 allowlist、可选 principal 共享 Store 和凭据撤销 hook。 | 单元与合成并发/异常测试已测。外部 Store 的跨进程原子性由宿主负责，未验证。 |
| `src/tokens.ts`, `src/file-walk.ts`, `src/watch.ts` | 生成随机 `cnry_` 令牌、埋放、检查及监控；扫描深度最多 4 层，跳过 `.git`、`node_modules` 和符号链接。 | 隐藏文件、大于 5 MiB 的二进制文件、块边界、损坏注册表、错误路径及深度边界已测。Windows 上根符号链接测试跳过。 |
| `src/alerts.ts`, `src/dashboard.ts`, `src/export.ts` | JSONL 事件、字段脱敏、Webhook/桌面通知、报告和导出。Webhook 为 best-effort，不能改变已隔离状态。 | 事件脱敏、控制字符、重定向、XSS 和 CSV 公式回归已测；未连接外部告警服务。 |
| `src/index.ts`, `src/install.ts`, `src/config.ts`, `src/self-test.ts` | CLI 初始化、MCP 配置安装、Token、watch、事件、报告、自检和诊断。 | 构建包的 CLI help 与离线 self-test 已测；doctor 用临时 HOME 和 loopback 端口完成。 |
| `src/eval/` | 20 条固定载荷的 provider runner；当前评测以工具调用名/令牌等规则判断。 | mock provider 和参数边界已测；没有真实 LLM、真实 API 或模型行为数据。 |
| `src/license.ts`, `sponsor/server.mjs`, `sponsor/grant.mjs` | 本地许可校验以及分离的赞助、支付回调、订阅和机器激活。 | 本次不运行真实支付。demo smoke 与数据隔离已测；实时支付、真实商户凭据和许可签发未测。 |
| `Dockerfile`, `.github/workflows/` | Node 20 Alpine stdio 镜像；CI 声明 Node 20/22 × Ubuntu/Windows/macOS，并新增 PR Docker build job。 | Docker CLI 不在本机，未本地构建镜像；GitHub CI 尚待 PR 运行。 |

## 状态机与集成边界

诱饵命中时，Guard 同步写入本地状态并尝试写入 Store；随后才记录事件、请求撤销并发出告警。后续经过 Guard 的非 allowlist 调用被拒绝，真实回调不会运行。Store 不可用时，本地状态保持关闭。此次新增的回归还覆盖了 Store 恢复后错误返回 `SAFE` 的情况。

共享 Store 接口是同步的。默认实现仅是当前 Node 进程内的 Store；跨进程或分布式状态的原子、单调更新需要宿主实现。`reset()` 由宿主的可信控制面调用，SDK 不能证明 `acknowledgedBy` 真来自真人；不得把 reset 注册成 Agent 工具。

MCP `serve` 只暴露诱饵。要阻断真实工具，宿主必须把每个真实回调都经过 Guard；如果首个真实操作在检测前开始，守卫不会回滚已开始的外部副作用。

## 原始完成度分级

- **已实现且有测试证明：**诱饵工具处理、MCP stdio 基本互通、CLI 离线自检、免费 SDK Router、同步隔离、令牌生成/埋放/扫描、基本事件脱敏、安装配置备份、固定载荷 mock eval、包安装 smoke。
- **已实现但缺乏本次真实环境证据：**macOS/Linux/Windows 全矩阵（只配置在 CI）、原生文件 watcher 的各平台实时表现、桌面通知、外部 Webhook、真实支付回调、真实许可签发、Docker build。
- **仅文档描述或范围外：**生产 Agent/真实 LLM 的抵抗率、用户案例、真实误报率、跨进程共享 Store 的事务保证、可取消已开始工具执行的能力。
- **尚未实现：**通用上游 MCP 代理/自动包裹任意宿主工具、无需宿主集成的全局 Agent 防火墙。
- **无法确认：**大赛评审结果、云上容器表现、真实模型对诱饵的触发倾向、外部支付商户回调在真实账户上的实际行为。

## 发现项与修复状态

按一次性根因归类，共发现 P1 7 项、P2 17 项、P0 0 项；本分支修复 P1 4 项、P2 11 项。没有修改 MIT 许可、公开 SDK 签名、商业授权规则或真实用户数据。

| ID | 级别 | 发现与证据 | 状态 |
|---|---|---|---|
| P1-1 | P1 | 共享 Store 的本地隔离状态会被恢复后的 `SAFE` 覆盖；新回归先失败，修复后 19 项 containment 测试通过。 | 已修复：本地状态和共享状态按严重度合并。 |
| P1-2 | P1 | Token 检查可漏掉 dotfile、旧 5 MiB 上限之外内容、损坏注册表、不可读目录、超深目录或不存在的扫描路径，并仍显示 clean。 | 已修复：流式扫描、纳入隐藏文件、损坏注册表/权限/深度/路径错误均失败闭合。 |
| P1-3 | P1 | 原 `sponsor/smoke.mjs` 会先删除真实目录的订单/订阅/激活 JSON；隔离回归在临时 sentinel 文件上复现。 | 已修复：smoke 只在临时副本和临时端口运行。 |
| P1-4 | P1 | eval 接受 `maxTurns=0` 等无效值，可能在没有模型调用时把 payload 计为抵抗；回归已先复现。 | 已修复：拒绝非正安全整数。 |
| P1-5 | P1 | 微信/支付宝回调验签后未逐项比对本商户、App ID、金额、币种和订单渠道；验证微信平台签名并不等于绑定本地订单所有字段。官方通知字段说明见[微信支付成功回调文档](https://pay.wechatpay.cn/doc/v3/merchant/4012791861)。 | 未修复：涉及付费授权规则，等待维护者明确授权；无真实支付模拟。 |
| P1-6 | P1 | sponsor 的通用 JSON reader 对损坏订单/订阅/激活数据回退空对象，签名密钥损坏会尝试生成新密钥；可能丢状态或使已有许可失效。 | 未修复：涉及商业许可/客户数据行为，等待授权；未读取真实数据。 |
| P1-7 | P1 | README/付款页声称付费 V2 源码不在公共仓库，但 main 跟踪了 eval/dashboard/export/license 等实现，`files: ["dist"]` 的打包规则把编译目录整体收入包。 | 未修复：没有改商业许可或包边界；需维护者决定拆分或更正商业交付政策。 |
| P2-1 | P2 | Webhook 会跟随 HTTP 重定向到第二目标。 | 已修复：`redirect: "manual"`；直接配置的私网/回环地址及 DNS pinning 仍是信任边界。 |
| P2-2 | P2 | OpenAI-compatible/Anthropic 评测请求可能跟随重定向携带请求头。 | 已修复：`redirect: "error"`；未连真实 provider。 |
| P2-3 | P2 | sponsor 请求体超过 1 MB 时仍继续拼接，并返回 500。 | 已修复：按字节限额、超限停止缓存并返回 413。 |
| P2-4 | P2 | demo 支付页把用户填写的 handle 插入 HTML。 | 已修复：HTML 转义并增加注入回归。 |
| P2-5 | P2 | 审计字段可以插入终端控制字符/伪造日志行。 | 已修复：限制控制字符并清理元数据。 |
| P2-6 | P2 | CSV 导出字段可注入电子表格公式。 | 已修复：对危险前缀做文本化转义。 |
| P2-7 | P2 | POSIX 配置目录、Token 注册表和日志文件未强制 owner-only 模式。 | 已修复：目录 0700、敏感文件 0600；Windows 本机跳过 POSIX 模式断言。 |
| P2-8 | P2 | 基线 lockfile 中 npm audit 报告 4 个依赖漏洞。 | 已修复：兼容范围内更新锁文件；本分支 root 与 sponsor audit 均为 0。 |
| P2-9 | P2 | CI 未声明最小 workflow 权限；V1 发布 workflow_dispatch 可在非 main ref 启动。 | 已修复：CI `contents: read`，包发布 job 限定 main；未触发发布。 |
| P2-10 | P2 | watch 对不存在或非目录输入会静默提示正在监控。 | 已修复：启动 watcher 前验证目录并拒绝符号链接根。 |
| P2-11 | P2 | 配置文件 JSON 错误会静默退回默认值，可能隐藏 webhook/日志配置失效。 | 未修复：改变配置加载行为需兼容性审查。 |
| P2-12 | P2 | 多进程并发 `generateTokens` 是 read-modify-write，原子 rename 不能避免丢失另一个进程写入。 | 未修复：需决定锁格式/陈旧锁恢复与跨平台语义。 |
| P2-13 | P2 | JSONL 读取/轮转按全文载入，异常大的历史日志会占用大量内存。 | 未修复：需单独设计有界读取/迁移，未做大日志基准。 |
| P2-14 | P2 | 长时间 watcher 的已告警路径 Set 无清理策略，且没有显式 stop handle。 | 未修复：当前仅作 best-effort 本地 watch；未运行长时压测。 |
| P2-15 | P2 | Webhook 允许用户配置任意 HTTPS host；本次仅禁重定向，未解析/固定 DNS 或拒绝私网目的地。 | 未修复：只应配置可信端点；不能描述成完整 SSRF 防护。 |
| P2-16 | P2 | GitHub Actions 使用可变 tag；MCP Registry workflow 下载 `latest` publisher 二进制且无固定 checksum。 | 未修复：需维护者选择版本和可验证 hash。 |
| P2-17 | P2 | 产品文案曾将诱饵描述为完全无副作用、告警“零误报”；实际调用会建立本地 Token 状态/审计记录并可触发告警，误调用也可能触发信号。 | 已修复：MCP instructions、工具说明、安全策略、双语 README、站点、CLI/package 描述和 dashboard 均说明实际副作用与信号边界；独立 MCP server 与 SDK Guard 的隔离边界也明确了。 |

## 兼容性与边界

本次没有改变公开 SDK 类型/函数签名、CLI 命令名、MIT 许可、package 版本或发布状态。`npm audit fix` 只在现有 semver 范围内更新 lockfile。新扫描器限制为指定路径下最多 4 层，跳过 `.git`、`node_modules`、符号链接；超过范围会报扫描不完整，而不会宣称 clean。
