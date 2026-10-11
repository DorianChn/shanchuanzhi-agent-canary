# Agent Canary 3.0 答辩与独立复现材料

**READY_WITH_LIMITATIONS**：受控SDK登记工具的可验证执行前安全控制。冻结运行时99660b36db9d5b1121eea6fe06b026c5f1e36bcf保持不变。更新材料不代表新运行时验证。

## 先看这四份

1. [公开下载与原始证据](GitHub公开复现索引.md)
2. [独立复现手册](独立复现手册.md)
3. [最终就绪报告](../../docs/competition/FINAL_MAX_SCORE_READINESS.md)
4. [真实实验的口径与限制](冻结真实实验与风险说明.md)

## 答辩文件

- [5分钟PPTX](Agent_Canary_3_0_5分钟技术路演_答辩定稿.pptx) / [PDF备份](Agent_Canary_3_0_5分钟技术路演_答辩定稿.pdf) / [讲稿](Agent_Canary_3_0_5分钟技术路演_讲稿.md)
- [3分钟PPTX](Agent_Canary_3_0_3分钟核心展示_答辩定稿.pptx) / [PDF备份](Agent_Canary_3_0_3分钟核心展示_答辩定稿.pdf) / [讲稿](Agent_Canary_3_0_3分钟核心展示_讲稿.md)
- [60秒PPTX](Agent_Canary_3_0_60秒精简版_答辩定稿.pptx) / [PDF备份](Agent_Canary_3_0_60秒精简版_答辩定稿.pdf) / [讲稿](Agent_Canary_3_0_60秒精简版_讲稿.md)
- [40问答](评委尖锐问答_40题.md)，每题短答、深入解释、真实证据、无法证明的部分。
- [演示与现场恢复预案](演示与现场预案.md)
- [路演验收状态](ROADSHOW_READINESS.md)

PPT含原生可编辑图表与表格；PDF为栅格离线备份不可搜索。300/180/60秒是计划时长，真人计时和原生PowerPoint投影未验。候选视频原件公开在Release，ZIP另含字节核对备份，不提交大视频到普通Git。

## 技术、治理与长期发展

- [Gateway及E0–E4](可信执行网关与E0-E4说明.md)
- [评分与风险矩阵](../../docs/competition/MAX_SCORE_MATRIX.md)
- [6项目客观比较](../../docs/competition/RELATED_WORK_AND_NOVELTY.md)：仅资料比较，无相对防护率
- [开源治理](开源治理与维护政策.md) / [12个月路线](12个月发展规划.md)
- [邮件与资格状态](邮件与资格核验.md)：已发送未确认，不能推导入围
- [便携离线演示](reproduction-kit/run-offline-demo.mjs) / [外部签收模板](reproduction-kit/RESULT_RECEIPT_TEMPLATE.md)
- [Community SBOM](evidence/COMMUNITY_SBOM.cdx.json) / [本轮公开包回归日志](evidence/community-tests.txt)

## 实验数字

新64运行：12个攻击文本+4个正常任务，各2次、A/F两组。A攻击效果4/24、F0/24；F有拒绝6/24；正常均8/8。作者知情、重复相关，不能把无尝试算主动拦截。AI审查0、Canary自主触发0，独立收益未测。E4外部操作者复现待补；原生宿主全局保护未验。

仅可据此展示有限受控SDK结果。普通npm/Docker商业边界、TOCTOU旧inode及不合作回调限制仍公开，未合并main/改许可证/发布稳定版/发送新邮件。
