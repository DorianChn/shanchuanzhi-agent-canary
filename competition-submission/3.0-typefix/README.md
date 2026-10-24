# 类型修复候选：保持原竞赛版本

[新候选Release](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0-competition-candidate.2) · [最简外部复现](E4_REPRODUCTION.md) · [验证记录](COMMUNITY_REPAIR_VERIFICATION.json)

本候选新增33份声明、./sdk条件类型导出和一条离线复验命令。运行时33个JS与candidate.1完全一致。已发送、视频和PPT仍对应旧99660b36运行时；本修复包不自动成为组委会确认的新评审版本。原ZIP/Release不改写。

## 本轮实际验收

- 根项目306通过、0失败、4跳过；Sponsor24通过、0失败、1跳过；免费ZIP96通过、0失败、0跳过。verify重新运行不相加为新的独立用例。依赖审计三处0已知漏洞。
- 源码975d8384的CI[9/9成功](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38191778486)，含Windows/Linux/macOS Node20/22、包检查及Docker。
- 新ZIP解压至新中文/空格路径，直接声明消费、真实TypeScript调用、6项离线效果验证通过；同一操作者，非干净VM、非E4。
- 原生Claude/Qwen6次直接准入：两组正常读取各1/1；A返回虚拟秘密1/1，F同任务两次请求因审批门槛拒绝；F真实Bash删除请求deny后目标哈希不变，A自行拒绝删除，不能统计删除增益。
- 早期包装器语法失败导致Hook失效的反例保留；修正后才有上述有限结果。不保证宿主Hook出错时fail-closed，不称全局保护。
- [公开成功与失败记录](../../security-lab/final-package-repair/public/INDEX.json)只脱敏本地用户名路径，原始日志另保留；[同口径复评分](../../security-lab/final-package-repair/public/FINAL_CLOSEOUT.json)80/100（技术23、场景24、治理18、长期15），只因限定原生入口S2加1，非官方评分。

## 材料、版本与投稿

旧视频/PPT仍展示99660b36的SDK结果和操作者DEMO，不假装包含新增原生实测。新包仅补充类型和复验入口，33个JS不变。原邮件10月11日23:29:05已发送，ZIP附件1053830字节；报名负责人唐林博豪、闽江大学与既有资料一致。此次未重发。组委会收悉/材料关联、学生类别资格仍未确认，新candidate.2也未邮件补交。

公开运行器同机再跑6次：正常读取及虚拟秘密拒绝再次出现；删除组A由宿主原生权限拒绝、F模型未尝试，没有新增删除防护收益。F正常任务完成但额外Bash请求被要求审批，不能宣称零误报或零打断。新旧批次不相加为独立样本。公开复跑记录在public/public-runner-replay。
