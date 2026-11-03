# Agent Canary 3.0：公开复现与答辩索引

核心定位：可验证的受控AI Agent执行前安全控制。主要已验证宿主是SDK Agent + Ollama/Qwen，未接入的原生工具不受此网关全局保护。

## 评委快速入口

- [候选Release](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0-competition-candidate.1)
- [免费Community ZIP](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/download/v3.0.0-competition-candidate.1/Agent_Canary_3_0_Community_Preview_99660b36.zip)
- [真实演示视频](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/download/v3.0.0-competition-candidate.1/Agent_Canary_3_0_Competition_Demo_Final_1080p.webm)：212.8秒/1080p/中文字幕/无音轨。操作者触发真实临时I/O与历史真实模型回放分开。
- [冻结源码](https://github.com/DorianChn/shanchuanzhi-agent-canary/tree/99660b36db9d5b1121eea6fe06b026c5f1e36bcf)
- [真实原始新64数据](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/38f647648dabfd893a9b2460ae7afb763ff0666a/security-lab/evidence/2026-10-11T15-04-14-292Z/results.json)
- [Evidence ZIP](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/download/v3.0.0-competition-candidate.1/Agent_Canary_3_0_Evidence.zip)
- [项目介绍PDF](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/download/v3.0.0-competition-candidate.1/Agent_Canary_3_0_Project_Overview.pdf)
- [原始实验PDF](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/download/v3.0.0-competition-candidate.1/Agent_Canary_3_0_Real_Model_Evaluation.pdf)
- [技术创新PDF](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/download/v3.0.0-competition-candidate.1/Agent_Canary_3_0_Technical_Innovation.pdf)
- [PR24](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/24)：Draft，依赖[PR23](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/23)，未自动合并main。
- [材料基线CI](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38151843834)：38f6476，实际9/9成功。文档更新的新CI状态以公开运行/发布状态JSON为准。

## 本轮新增材料

同一个候选Release准备新增Roadshow_and_Reproduction ZIP、Independent_Reproduction_Kit ZIP、索引和交付状态。实际上传与公开下载结果只在ROADSHOW_PUBLIC_DELIVERY.json确认，不由此页预先宣称成功。新材料不更换运行时SHA或旧13个附件。

本目录有三档可编辑PPTX、对应栅格PDF备份、讲稿、40问答、复现脚本、SBOM、四维矩阵及现场预案。PDF无可搜索文字，优先用PPTX编辑；未在原生PowerPoint或现场投影打开。

## 真实结论与范围

新留出A危险效果4/24、F0/24；F有拒绝6/24，正常两组8/8。12攻击文本与4正常任务各2重复；作者知情、重复相关，不是64独立攻击。AI审查0/蜜罐自主触发0，不宣称独立收益。E4未完成；同机新中文目录安装只证明当前用户的这条安装路径。

旧npm/Docker商业分发边界P1仍OPEN，优先用正向清单免费包。TOCTOU旧inode、不合作回调迟到效果、公网DNS完整验证等限制随文档公开。旧2.0/2.1不删除。当前仓库默认main首页可能仍以1.x描述；本页/Release/仓库简介提供候选索引，而不是偷偷合并代码。
