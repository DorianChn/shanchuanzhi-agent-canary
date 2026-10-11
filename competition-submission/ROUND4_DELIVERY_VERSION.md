# 第四轮不可变交付版本

安全核心提交：[834ef1a361386736be2101bfa635bf0bb531dfb4](https://github.com/DorianChn/shanchuanzhi-agent-canary/commit/834ef1a361386736be2101bfa635bf0bb531dfb4)。

材料与可复现代码快照：[fc742d3d757aa3a3425e085284cce72d66a5ed3f](https://github.com/DorianChn/shanchuanzhi-agent-canary/tree/fc742d3d757aa3a3425e085284cce72d66a5ed3f)。该提交包含本轮最终PDF/录像/免费竞赛ZIP和全部110次模型证据；后续文档校验提交不改变安全代码或材料字节。

工作分支 competition/agent-canary-hardening；[Draft PR #22](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/22)，未合并main、未发布正式版本、未发邮件。npm包版本仍1.2.7，不代表发布了本轮功能。

## 已核验公开材料

- [Agent_Canary_Round4_Demo.mp4](https://raw.githubusercontent.com/DorianChn/shanchuanzhi-agent-canary/fc742d3d757aa3a3425e085284cce72d66a5ed3f/competition-submission/Agent_Canary_Round4_Demo.mp4)：HTTP200，4146145 bytes，SHA256 5301b9bed30dd95e2915e12666866117c407a81482df2d1b92d9624fa0749907
- [Agent_Canary_Round4_项目介绍.pdf](https://raw.githubusercontent.com/DorianChn/shanchuanzhi-agent-canary/fc742d3d757aa3a3425e085284cce72d66a5ed3f/competition-submission/Agent_Canary_Round4_%E9%A1%B9%E7%9B%AE%E4%BB%8B%E7%BB%8D.pdf)：HTTP200，318280 bytes，SHA256 e9accfbafa06b05acbdf0b52a856c520b4e6eadc8eb8e204905617e55393a2a0
- [Agent_Canary_Round4_实验报告.pdf](https://raw.githubusercontent.com/DorianChn/shanchuanzhi-agent-canary/fc742d3d757aa3a3425e085284cce72d66a5ed3f/competition-submission/Agent_Canary_Round4_%E5%AE%9E%E9%AA%8C%E6%8A%A5%E5%91%8A.pdf)：HTTP200，201436 bytes，SHA256 fe25cc97c96728c64100ba03317ee56bdd6b679ec260f0a81cf826349402bf86
- [Agent_Canary_Competition_V1.zip](https://raw.githubusercontent.com/DorianChn/shanchuanzhi-agent-canary/fc742d3d757aa3a3425e085284cce72d66a5ed3f/competition-submission/Agent_Canary_Competition_V1.zip)：HTTP200，167043 bytes，SHA256 06ec30d0385e262ff9baa56f00315257fd495bcdfd14f745dd1b13f32f41e59d

实际 Chromium 从以上公开不可变视频URL加载、播放及seek180秒成功，时长240.733秒；evidence/round4-public-delivery.json / round4-public-playback.png。不是仅下载测试。GitHub raw是文件地址，不是独立视频社区页面。

免费包独立解压install/build/self-test已通过；官方MCP Client tools/list12个诱饵已通过。21源文件图与实际被测源码一致。常规npm/Docker商业V2分发P1仍OPEN，竞赛范围为此独立免费包与对应源清单，不宣称全仓商业边界关闭。

最终模型文件 round4-agent-eval-neutral_agent-2026-10-11T04-59-01-307Z.json，策略hash 4834c505394af0a763aaa0e978591a8385a6ab1aa9c8db469a1b1bb051aa61ea。A/B/C 5/15；D1/D2 1/15；正常任务5/6、审批中断1/6；AI独立拦截增益未测。

官方最新规则本轮无法再次读取，发送前需人工核对报名确认信息并明确批准。负责人唐林博豪/闽江大学。当前具备免费竞赛范围的演示与材料；不是商业稳定发布或全局Agent防火墙。
