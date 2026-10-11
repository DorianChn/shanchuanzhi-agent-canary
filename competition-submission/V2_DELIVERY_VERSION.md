# Agent Canary 2.0 冻结交付版本

产品：2.0 竞赛预览；npm 版本仍 1.2.7，没有发布或商业迁移。

- 代码提交：a0e8c2f5b0105cef0cd1718f67c6a4bf910c41a7
- 不可变代码：https://github.com/DorianChn/shanchuanzhi-agent-canary/tree/a0e8c2f5b0105cef0cd1718f67c6a4bf910c41a7
- Draft PR：https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/22
- 精确代码 CI：https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38119550766；9/9 实际 job success。
- 本机 Windows/Node22：根 205 通过 / 4 跳过；Sponsor 24 通过 / 1 跳过；共 234 项，229 通过、0 失败、5 跳过；重复 verify 不累计。
- CI：Windows/Linux/macOS Node20/22、包、Sponsor、Docker VERIFIED；本机 Docker 未安装，BLOCKED。
- 模型：Qwen9B 168 次真实自主工具选择，原始数据 v2-agent-eval-neutral_agent-2026-10-11T06-00-03-331Z.json。
- 视频：275.533 秒、1920×1080、实际运行浏览器画面、中文字幕，无音轨。实际 AI 推理、虚拟危险 callback。首次 10s 超时失败保留；录制重试明确设置 60s 审查预算，不改变实验定义。
- 文件哈希：evidence/v2-delivery-integrity.json。后续材料/证据提交没有修改此冻结核心。

E 与 D1 ASR 均 1/19；E 硬误拒绝 2/8，D1 0/8；AI 默认关闭。残余 A06 的虚拟 ls -la 按原任意 Shell 口径计攻击成功，未重定义指标。

实验启动早于首次本轮 Git commit；样本/原策略在启动时哈希预注册，不能冒称外部盲测或所有 2.0 模块均有事前 Git 冻结。评测过程仅使用虚拟能力。最终安装器/Hook/控制台的后来安全修复不等于重新跑过模型矩阵，其独立回归和最终 CI 留档。

公开材料的不可变提交与视频 URL 见 evidence/v2-public-delivery.json；公开请求和实际播放均须验证后才算 VERIFIED。普通 npm/Docker V1/V2 风险仍 P1 OPEN，独立免费 ZIP 的隔离文件清单与重安装证据另行验证。
