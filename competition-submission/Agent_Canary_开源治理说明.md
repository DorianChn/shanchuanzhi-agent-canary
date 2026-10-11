# 开源治理与交付范围

保留MIT、CONTRIBUTING、SECURITY、CHANGELOG、Issue/PR模板、固定SHA的CI和已有免费SDK。所有代码在原竞赛分支，PR22保持Draft；不自动合并main、发布npm/Docker或迁移支付/生产数据。

常规构建的V1/V2分发P1仍OPEN。独立 Agent_Canary_Competition_V1.zip 按公开21源文件依赖图构建，排除license/dashboard/export/eval商业实现；CLI是明确免费子集，MIT保留、private:true防误发布。现有商业入口/授权不修改。包哈希、独立install/build/self-test和SDK策略smoke见round4-free-artifact.json与round4-free-archive.json。

竞争作品以该免费包与公开源清单为范围；完整GitHub历史仍有既有商业代码，不能声称全仓已完成私有商业边界。若赛事或维护者要求全仓清除/默认分支交付，需要人工审定方案，不可擅自迁移。

贡献路径：提交最小复现Issue、带测试PR、明确安全边界；扩大框架接线/第三方评测/权限模板。没有捏造用户、企业合作、贡献者或市场成果。
