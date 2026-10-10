# 最终验证记录

验证工作树：`competition/agent-canary-hardening`；基线 `origin/main`：`5049815c8549b0455976bea5bc8131656a5f02a4`。本记录仅包含本机实际运行结果；GitHub 多系统 CI 与 Docker job 需等待 PR workflow。

## 依赖、构建与包

| 命令/检查 | 实际结果 | 限制 |
|---|---|---|
| 根目录 `npm ci` | 成功，安装 101 packages，安装时 audit 0 vulnerabilities。 | Windows 11，Node v22.23.1。 |
| `npm run build` | TypeScript 编译成功。 | 中间验证发现本次 CLI 脱敏改动的可选类型错误，以及一项测试断言未匹配更新后的安全说明；分别补默认值、校准断言后最终全量验证通过，没有放宽安全行为或测试预期。 |
| `npm test` | 111 项：107 passed、0 failed、4 skipped。 | 4 项跳过为 POSIX 文件权限断言（Windows 不适用）及 Windows 根符号链接用例。 |
| `npm run pack:check` | 通过，包 smoke 检查 23 个文件。 | 未发布 npm 包；当前 tracked distribution boundary 仍包含许可门控的编译模块，商业包边界待维护者决定。 |
| root `npm audit --audit-level=moderate` | 0 vulnerabilities。 | 依赖来源为 npm registry；未发布。 |
| `npm run demo:containment` | 成功：安全回调一次运行；诱饵后危险回调被阻止；状态 `QUARANTINED`；4 类审计事件存在。 | 合成 SDK callback；无 LLM、Shell、真实网络、真实凭据或支付。 |
| `npm run bench:scan` | 合成临时文件 1/10/50 MiB 中位耗时 1.43/12.78/59.50 ms；约 697.84/782.42/840.37 MiB/s。 | Windows x64 / Node v22.23.1 / AMD Ryzen 9 9955HX；每种大小 3 次、Token 位于末尾，文件由 OS cache 读取；不是生产或冷盘基准。 |
| CLI `--help` 与 `self-test --json` | 两者退出码 0；self-test 4/4 检查通过。 | self-test 不触碰用户配置、Token、事件或网络。 |
| CLI `doctor` | 退出码 0；临时 HOME 下识别免费版，报告测试 license 端口 1 不可达、收款栈本机端口未运行。 | 故意只访问 loopback；没有读取真实 license、订单或客户文件。 |

## 赞助服务

| 命令/检查 | 实际结果 | 限制 |
|---|---|---|
| `sponsor/` `npm ci` | 成功，安装 29 packages，安装时 audit 0 vulnerabilities。 | 独立依赖目录。 |
| sponsor `npm audit --audit-level=moderate` | 0 vulnerabilities。 | 未连接真实支付商户。 |
| `node --test smoke-isolation.test.mjs security-regression.test.mjs` | 4/4 passed：3 个请求/日志安全回归和 1 个 smoke 数据隔离回归。 | 运行于复制的 server、临时目录和随机 loopback 端口；sentinel 订单、订阅和激活文件未变化。 |
| `node smoke.mjs` | 12/12 输出检查通过：demo 启动、页面、QR、下单、模拟支付/订阅、手工登记、机器数限制。 | 全部是 DEMO 模式与合成数据；未验证真实商户回调。 |

## 安全模拟与复查

- `test/security-simulation.test.ts`：14 个攻击场景 + 1 个正常控制样例均通过。12 条显式注入 decoy/Token 信号的路径成功触发隔离并阻止之后经过 Guard 的回调。
- SIM-12、SIM-13、SIM-14 复现了能力边界：不触碰诱饵时首个经过 Router 的危险调用会放行；直接绕过 Router 的宿主 callback 不受观察；信号前已经开始的 callback 不会追溯取消。
- MCP JS Client 子进程握手、工具列举和 `canary_run_shell` 调用通过；只验证本地 stdio 协议，不证明任何具体编辑器安装体验。
- 两个本地 redirect regression、Token 扫描边界、共享 Store 状态恢复、错误路径/权限 fail-closed、HTML/CSV/终端日志安全和 smoke 数据隔离均在上文测试通过。
- 第二轮 diff 审查确认文档、CLI、MCP 初始化说明和 dashboard 不再承诺“零误报”或“完全无副作用”。合成攻击不是 LLM 评测，误报率没有足够数据计算。
- 修改未包含真实凭据、支付回调样本、客户数据、私钥或 Token registry；未读取 sponsor 目录的既存业务数据。

## 尚未验证及发布门槛

- 本机未安装 Docker，未本地执行 `docker build`；CI 已增加独立 Docker build job，结果待 GitHub Actions。
- 本机只运行 Windows x64 / Node 22；Node 20、Linux、macOS 矩阵结果待 GitHub Actions。
- 微信/支付宝回调尚未跨核商户、App、金额、币种和订单渠道；赞助 JSON 文件损坏语义也未改。这两项需维护者确认商业规则后再修复。没有使用真实凭据或真实支付。
- Webhook 仅拒绝跟随重定向；对明确配置的内网目标与 DNS 重绑定没有完整防护。
- GitHub Actions action 引用仍有可变 tag，MCP publisher 下载 `latest` 且未校验固定 checksum。
- 本地分支已提交：`8de78e6fc429d73a2be6354a2f6a3169709d4225`。远端未推送、PR 未建立：GitHub 连接对 Git blobs 写入返回 403 `Resource not accessible by integration`；本地 Git 非交互 push 返回 `unable to get password from user`。没有创建空分支或空 PR。

## PR 状态

PR 尚未创建，GitHub Actions 因此没有运行。具备 Git 凭据的环境可从仓库目录执行：

```bash
git push -u origin competition/agent-canary-hardening
```

随后打开 [GitHub compare 页面](https://github.com/DorianChn/shanchuanzhi-agent-canary/compare/main...competition%2Fagent-canary-hardening?expand=1)，以 `main` 为 base 创建 PR；PR 正文应保留本审计报告中的未解决支付回调、商业包边界、Webhook SSRF、配置并发与跨平台验证限制。没有推送 `main`、合并 PR、发布 npm 版本或触发 release workflow。
