# Agent Canary 开源治理说明

## 当前治理

- 主仓库采用 MIT 许可证；参赛代码不改变许可证或公开 SDK API。
- 根目录提供中英文 README、`CONTRIBUTING.md`、`SECURITY.md`、`CHANGELOG.md` 和 `ROADMAP.md`。
- GitHub 已增加结构化 Bug/Feature Issue 模板与 Pull Request 模板。
- CI 对 Node 20/22 和 Windows/Linux/macOS 执行测试；主分支/特性分支结果需以本轮最新提交对应 Actions Run 为准。
- 不在 CI 中发布 npm/Docker；发布工作流须由维护者独立触发并使用限定权限。
- 依赖版本由锁文件固定；本轮根目录和 sponsor 审计分别执行 `npm audit`。

## 贡献和安全披露

贡献者先阅读 CONTRIBUTING 和行为准则，提交前运行 `npm run verify`。安全问题通过 SECURITY.md 指定的私下渠道报告，避免在公开 Issue 发布利用细节或敏感数据。项目维护者负责确认、协调修复、发布公告和版本记录。

## V1/V2 交付边界

公开 V1 的 MIT 许可与公开 SDK 保持不变。本轮复核仍确认公开构建/包中带有许可证门控的 `eval`、dashboard、export 和 license 实现；这是已有的 V1/V2 商业分发边界风险，未通过删许可校验或迁移生产系统处理。项目不得宣称 V2 私有实现已从公开发行物剥离。签名密钥、真实订单和客户资料不属于参赛材料，也不得进入仓库或 npm 包。

## 版本与路线图

路线图按“可复现的宿主集成、安全策略与审计、更多 MCP/Agent 框架适配、社区贡献反馈”迭代。计划项不等于已实现能力；不宣称已有用户规模、企业合作或商业成绩。

## 依赖与供应链

GitHub Actions 第三方 action 应固定到完整 commit SHA，权限采用最小化。发布凭据仅存在于发布环境/受限 secret，不进入测试日志。构建前后核对 npm tarball、Docker 上下文和公开产物。CI 通过仅证明其执行过的环境，不代表本机在所有操作系统和 Node 版本均已验证。


## AI 增强版追加记录

AI 增强版延续 MIT 与现有贡献/安全/CI 流程，没有新增生产依赖、改变商业授权、生产支付或 main。Provider 与控制台免费可选；原许可门控模块保持不变，V1/V2分发风险未关闭。
