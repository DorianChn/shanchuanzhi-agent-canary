# 第二轮最终验证记录

审计基线：`origin/main` / `5049815c8549b0455976bea5bc8131656a5f02a4`。本地工作分支：`competition/agent-canary-hardening`。所有本地验证均在 Windows x64、Node v22.23.1 上执行；未触碰真实支付、用户业务数据、生产密钥、发布渠道或 main。

## 命令与结果

| 命令/检查 | 结果 | 限制 |
|---|---|---|
| 根目录 `npm ci` | PASS；安装 101 packages，安装期间 0 vulnerabilities。 | Windows / Node 22.23.1。 |
| `npm run build` | PASS；TypeScript 编译完成。 | 本地。 |
| `npm test` | PASS；121 项：117 通过、0 失败、4 跳过。 | 4 个 POSIX 权限/Windows 符号链接断言在本机不适用。 |
| `npm run pack:check` | PASS；23 个文件的安装包 smoke check。 | 不表示 V2 已隔离；见分发边界。 |
| `npm run verify` | PASS；build、完整测试及 package smoke check 均成功。 | Windows / Node 22.23.1。 |
| `npm audit` | PASS；0 vulnerabilities。 | 未发布。 |
| `npm pack --dry-run --json` | PASS 运行检查；确认包含 `dist/eval/*`、`dist/dashboard.js`、`dist/export.js`、`dist/license.js`。 | 此结果揭示尚未解决的 P1 商业分发边界。 |
| `npm run demo:containment` | PASS；Guard 最终为 `QUARANTINED`，日志含 trip/quarantine/blocked，危险 callback 未执行。 | 仅临时目录与脚本内虚拟 callback。 |
| `npm run bench:scan` | PASS；1/10/50 MiB 中位数 1.54/12.62/58.30 ms；约 647.84/792.20/857.66 MiB/s。 | Windows x64 / Node 22.23.1 / Ryzen 9 9955HX；每种 3 次、合成文件、Token 在尾部、文件缓存热读。 |
| sponsor `npm ci` | PASS；安装 29 packages，安装期间 0 vulnerabilities。 | 独立依赖目录。 |
| sponsor `npm test` | PASS；25 项：24 通过、0 失败、1 跳过。包含 `node --check grant.mjs` 与隔离的人工授权 CLI 回归。 | 1 个 symlink 权限测试在 Windows 跳过。 |
| sponsor `npm run smoke` | PASS；12/12 检查通过。 | DEMO、临时目录、随机 loopback 端口、虚拟订单/订阅。 |
| sponsor `npm audit` | PASS；0 vulnerabilities。 | 未连接支付商户。 |
| `docker --version` | BLOCKED；本环境找不到 Docker CLI。 | 未构建镜像或运行容器。 |

汇总 Node 测试：146 项（根目录 121 + sponsor 25），141 通过、0 失败、5 跳过。另 sponsor smoke 的 12 个输出检查与 `demo:containment` 单命令演示均通过；这些不计入 `node:test` 汇总。

## 修复验证摘要

1. **P1-1 支付回调：合成路径通过。** WeChat 回调测试实际走本地 HTTP 路由，使用临时 RSA 测试密钥签名，并使用 AES-256-GCM 加/解密虚拟交易；覆盖商户/App/本地订单/金额/CNY/成功状态/证书序列/时间戳窗口/重复与 20 路并发通知。Alipay 测试覆盖 RSA2 和本地 app/seller/order/amount/status；Epay/VMQ 使用合成签名、订单与金额。VMQ 基础金额精确匹配，按上游避碰协议允许签名的 `reallyPrice` 最多偏移 9 分。没有真实支付请求或交易。旧版待处理订单可能没有新增的 `currency` 字段，会 fail closed；维护者必须先对照备份和服务商记录决定是否迁移。
2. **P1-2 状态损坏：通过临时数据验证。** 空、截断、非法 JSON、错根形状、非法到期时间、损坏激活记录、模拟权限错误、错误/不匹配密钥不被当作空数据，也不重建已存在签名身份；履约中断后重启幂等恢复。没有操作真实 JSON/密钥。Windows ACL 行为无法确认。
3. **P1-3 商业分发边界：未解决。** 实际 pack 清单含 V2 eval/dashboard/export/license 编译模块；Dockerfile 复制整个 `dist`。没有删除许可校验、拆迁部署架构、发布包或镜像。需要维护者批准最小变更方案，当前不能达到稳定公开发布门槛。
4. **P2-1 Token 并发写：通过。** 16 个子进程并行读改写后没有丢记录；失败取得锁不写入。
5. **P2-2 JSONL 无界读取：通过。** 5 MiB 尾读、256 KiB 行限额、最多 10,000 条；超大、损坏及截断文件回归通过。
6. **P2-3 Watcher 长期增长：限定模拟通过。** 15,000 个合成变更事件维持有界缓存/队列，可关闭并释放定时器和句柄。没有数周生产运行曲线。
7. **P2-4 Webhook SSRF/DNS：本地模拟通过。** remote HTTPS 只接受公网 DNS 答案，混合/私网拒绝；请求固定到已校验 IP，不跟随 302，DNS 重绑定模拟只解析一次。未请求互联网 Webhook。
8. **P2-5 Config：通过。** 只有 ENOENT 使用初次默认值；空/截断/坏 JSON/字段类型和读取权限错误均拒绝并保留原文件。
9. **P2-6 CI 供应链：静态检查通过。** checkout 与 setup-node 已固定完整 Commit SHA；MCP publisher 固定 v1.8.1 及 SHA-256；最小权限和发布 job 边界已审阅。没有运行 GitHub workflow 或发布。

合成攻击回归仍为 14 个攻击场景 + 1 个正常控制。12 个明确送入 decoy/Token 信号的路径进入隔离并阻止之后经过 Guard 的 callback；SIM-12/13/14 仍复现无先前信号的首次操作、绕过 Router 的 callback 和已启动副作用的边界。这不是任何 LLM 的检测率或拦截率。

## 平台与 CI 状态

| 环境 | 状态 | 证据 |
|---|---|---|
| Windows x64 / Node 22.23.1 | VERIFIED | 本机完成完整 build/test/package/sponsor/audit/demo。 |
| Windows / Node 20 | SKIPPED | 仅在 GitHub Actions matrix 配置，当前 PR/CI 未运行。 |
| Linux / Node 20、22 | SKIPPED | 仅在 GitHub Actions matrix 配置，当前 PR/CI 未运行。 |
| macOS / Node 20、22 | SKIPPED | 仅在 GitHub Actions matrix 配置，当前 PR/CI 未运行。 |
| Docker build / smoke | BLOCKED | Docker CLI 不存在；workflow 中有 Docker build job，但未触发。 |
| GitHub Actions | BLOCKED | 未创建 PR；未声称 CI 运行通过。 |

## GitHub 交付状态

- 远端：`https://github.com/DorianChn/shanchuanzhi-agent-canary.git`；只读 `git ls-remote origin HEAD` 成功，远端 main 指向基线 SHA。
- GitHub MCP 当前身份为 `DorianChn`；读取仓库协作者权限的 API 返回 403 `Resource not accessible by integration`。
- 本地没有 `gh` CLI、Git Credential Manager 或已配置 `credential.helper`；因此还未确认 Git push 写权限。之前的集成 blob 写也返回 403。
- Draft PR 尚未创建；没有推送分支、修改远端 main、合并、发布 npm 或推送 Docker 镜像。完成本地提交后可在具备 GitHub 写凭据的终端执行 `gh auth login --web`，完成浏览器 OAuth，再 `gh auth status`、`git push -u origin competition/agent-canary-hardening`，最后用 `gh pr create --draft --base main --head competition/agent-canary-hardening ...` 创建 Draft。不要把 PAT 写入命令、代码或日志。

## 交付门槛

- 稳定发布标准：**未达到**。P1 V2 分发边界尚未解决，Docker 和多平台 matrix 未本地或远端实测，真实商户及旧待处理订单迁移未确认。
- 参赛演示条件：**具备离线机制演示条件**。建议用 `npm run demo:containment` 展示恶意诱饵信号、Session 隔离、后续守卫回调阻止和 JSONL 证据；必须同时讲清首次危险调用、绕过 Guard 和已开始外部操作的边界。
- 人工后续事项：批准 V1/V2 最小包拆分方案；复核旧订单的币种/状态迁移策略；在可用 Docker 与完整 CI 矩阵的环境取得真实结果；完成 GitHub OAuth 写授权后推送并创建 Draft PR。
