# Agent Canary 3.0：失分归因与实际补强

这是竞赛冻结后的诊断/开发者接入补充。原77矩阵不改，不替换原Release/PDF/视频、不重发邮件。运行时99660b36。

- [具体失分及82/77为何不可直接比较](LOSS_ATTRIBUTION.md)
- [最优补强顺序](IMPROVEMENT_PRIORITY.md)
- [补强前固定的解释性评分尺度](SCORING_PROTOCOL_BEFORE.json)
- [贡献者起步](CONTRIBUTOR_START.md)
- [真实扩展契约与边界](EXTENSION_CONTRACT_SNAPSHOT.md)
- [容量、维护与阶段门槛](MAINTENANCE_CAPACITY_AND_GATES.md)
- [一轮真实维护记录](MAINTENANCE_REVIEW_LOG.md)
- [类型补充ZIP](Agent_Canary_3_0_Community_Type_Companion_99660b36.zip)，约38KB、33类型；SHA见evidence/TYPE_COMPANION_PACKAGE.json
- [补充ZIP实际消费检查](evidence/TYPE_COMPANION_PACKAGED_TYPED_CHECKS.json)
- [原SDK类型失败](evidence/published-sdk-types.txt)：没有删除，也没有把期望失败写成PASS
- [实际SDK fixture目标与证据](evidence/SDK_TEMPLATE_PACKAGED_TYPED_RESULT.json)

无新模型调用、付费、生产数据、原生客户端改动或第三方签收。类型补充是冻结Community的辅助材料，不是新插件架构或稳定npm版本。

- [实际改进与复评79（含78敏感性）](RESCORE_AND_RESULTS.md) / [逐项复评账本](RESCORE_LEDGER.json)

- [真实TS编译执行](evidence/TYPED_RUNTIME_CONSUMER.json)：不是只有noEmit静态检查；原dist与runtime不改。
