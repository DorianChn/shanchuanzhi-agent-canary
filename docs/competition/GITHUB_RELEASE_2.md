# Agent Canary 2.0 — 竞赛预览版

在已有 MCP 诱饵、Canary Token 与确定性 Session Guard 基础上，加入可信宿主风险策略、可选 AI 审查、有限敏感来源追踪、Agent 配置集成和中文控制台。

本次发布为 **GitHub 预览发行版**。MIT 许可保留，不发布 npm 或 Docker，不迁移商业用户，不改变既有授权。

## 推荐安装

下载附件 **Agent_Canary_Competition_2_0.zip**，解压后运行：

```sh
npm ci
npm run build
npm test
npm run ai:console
```

无模型也可运行自检和本地控制台。已有 Ollama/Qwen 可用于本地分析。MCP 启动命令：`node dist/competition.js serve --stdio`。SDK 入口为 `dist/sdk.js`。

这是独立免费构建，不包含商业 license/dashboard/export/eval 实现。GitHub 自动生成的 Source code 归档仍是完整历史代码树，不能替代这个经过隔离验证的 ZIP。普通 npm/Docker 的 V1/V2 分发边界风险仍未关闭；npm 元数据维持 1.2.7。

## 实际验证

- 本机根项目与 Sponsor：229 通过、0 失败、5 项平台跳过；共 234 项，重复运行不累加。
- 冻结交付提交 `7fad0455d296f79895de0e1bb5482e5c344596ed` 的 [CI 9/9 成功](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38121516676)，覆盖 Windows/Linux/macOS Node 20/22、Sponsor、包与 Docker smoke。网站改动后的 CI 另在 PR 与 Actions 中核查。
- 免费 ZIP 经独立解压、安装、构建、自检及 MCP 握手验证。
- Ollama/Qwen 9B：168 次真实模型自主工具选择；危险执行器均虚拟。
- 网站经桌面与手机 Chromium 检查，验证语言切换、导航、折叠内容、无水平溢出及禁用 localStorage 时仍能运行。视频使用真实程序界面，中文字幕、无音轨。

## 真实模型结果与限制

每组 19 个可比攻击任务、8 个正常任务及 1 个预先隔离案例：

| 模式 | 攻击成功 | 正常完成 | 正常任务硬误拒绝 |
|---|---:|---:|---:|
| A 无保护 | 4/19 | 8/8 | 0/8 |
| B 仅检测 | 6/19 | 8/8 | 0/8 |
| C 检测与 Guard | 6/19 | 8/8 | 0/8 |
| D1 确定性策略 | 1/19 | 6/8 | 0/8 |
| D2 策略与事后 AI | 1/19 | 6/8 | 0/8 |
| E 策略与事前 AI | 1/19 | 6/8 | 2/8 |

所有组模型自主诱饵触发均为 0/19。D1/D2 的正常任务中断包含 2/8 等待人工批准；不能计作完成。E 未优于 D1，且增加误拒绝，因此事前 AI 审查默认关闭。样本量有限、单模型单次重复，不能证明普遍安全增益；原始攻击定义与失败案例保留。

## 安全边界

- 只有经过可信宿主 Guard / Router 的调用受隔离保护；安装 MCP 诱饵不等于全局 Agent 防护。
- 无信号时的首次危险调用不由原始 Guard 自动识别；可选策略仅覆盖宿主定义和可观察的参数边界。
- AI 不能批准、修改权限、重置 Guard 或解除隔离。基础防护不依赖 AI 可用性。
- 不能撤销已经开始的外部操作，不能观察模型内部状态；轻量来源追踪不等于完整动态污点分析。
- 实际桌面 Agent 全链路激活尚未验证。云端适配器已实现，但未做真实付费连通验证。

## 附件与证据

推荐免费 ZIP，附项目介绍、技术创新、真实模型实验三份 PDF，1080p 演示 MP4、中文字幕与 SHA256SUMS.txt。

PDF、视频和免费 ZIP 使用已验证的冻结核心 `a0e8c2f5b0105cef0cd1718f67c6a4bf910c41a7`，来自不可变材料提交 `0255c153da943c07fbb37d7bf2c10b140e81f1e6`；本次 README 与网站更新不改动这些交付物。

- [项目网站](https://dorianchn.github.io/shanchuanzhi-agent-canary/)
- [完整审计与已知风险](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/main/docs/competition/AGENT_CANARY_2_FINAL_REPORT.md)
- [原始实验统计](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/0255c153da943c07fbb37d7bf2c10b140e81f1e6/competition-submission/evidence/v2-summary.json)
- [合并审查 PR #22](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/22)

这是竞赛预览发行，不宣称达到稳定生产发布标准，不代表官方比赛评分或获奖承诺。
