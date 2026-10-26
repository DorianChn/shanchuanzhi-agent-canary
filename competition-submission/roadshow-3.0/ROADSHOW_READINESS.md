# ROADSHOW_READINESS

结论：READY_WITH_LIMITATIONS（限定SDK/冻结竞赛候选，答辩文件就绪，不等于获准入围或E4）。
运行时99660b36db9d5b1121eea6fe06b026c5f1e36bcf。既有材料38f6476，本轮仅文档/复现辅助。

|交付|状态|证据/限制|
|---|---|---|
|5分钟PPT|VERIFIED|15页：10主讲+5备答，逐页渲染、结构/字体/原生图表检查；计划300秒非实测|
|3分钟PPT|VERIFIED|6页，同等检查；计划180秒|
|60秒PPT|VERIFIED|3页，同等检查；计划60秒|
|三档PDF|VERIFIED|24页全部Poppler成功渲染，栅格备份不可搜索|
|三份中文逐页讲稿|VERIFIED（文件）|计时/现场真人演讲NOT_VERIFIED|
|40个尖锐问题|VERIFIED（内容与数量）|每题短答/深入/证据/不能证明；不是外部评委审查|
|架构/实验图|VERIFIED（冻结材料复用）|不创造新数据|
|既有视频+字幕备份|VERIFIED（字节核对）|212.8秒1080p，沿用既有播放检查，无新录制|
|免费包安装/回归|VERIFIED（同机）|匿名下载、125清单0不符、ci/build/self-test、96/0/0、audit0|
|离线临时I/O演示|VERIFIED|6真实断言、实际文件/回调/接收端，非模型攻击|
|E4复现套件|VERIFIED（试运行）|另一操作者签收NOT_VERIFIED|
|相关工作|VERIFIED（资料来源）|6项目仅DOCUMENTATION_COMPARISON，无排名|
|AI/自适应独立收益|NOT_VERIFIED / NOT MEASURED|原始本批0请求/触发，无消融|
|原生宿主全局保护|OUT_OF_SCOPE/NOT_VERIFIED|SDK验证不能外推|
|本轮实时Ollama推理|BLOCKED|已有服务当前不可连；没有新模型试验|
|现场网络/设备/投影|NOT_VERIFIED|按预案准备，需实际检查|
|正式入围/材料关联|BLOCKED / USER_ACTION_REQUIRED|需组委会确认，没发新邮件|

本轮未改src、test、原始数据、锁文件或冻结Tag。新PPT、复现指南和文档与同一runtime对应；材料版本另记，不写成新安全代码验证。

本轮新目录先以Node v24.19.0试运行，再使用已安装Node v22.23.1在另一个全新中文/空格目录完成ci/build/test/audit/self-test及6项临时I/O。两轮96/0/0不相加为192个独立测试。Node20本机未执行，20/22跨平台见既有CI。
