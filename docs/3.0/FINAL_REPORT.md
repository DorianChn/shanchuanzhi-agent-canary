# Agent Canary 3.0 工程主线交付报告

日期：2026-10-11。运行时代码冻结 `9f00b6ba7475e8bccc5410e1484ed74a7806b7d1`。后续交付提交仅更新录屏工具、派生报告和材料；不改冻结的安全核心。完整 3.0 状态：**NOT_READY**；当前可交付的是明确限定范围的工程候选。

## 现场与 GitHub

- 独立主线 / 研究 Worktree，见 COORDINATION.md；原 2.0 工作树未覆盖。
- Draft PR：https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/24
- Base：competition/shanchuanzhi-release-readiness，依赖仍为 Draft 的 PR #23。未合并 main，未发布 npm、Docker 或稳定 Release，未发邮件。
- 冻结代码 CI 真实 9/9 成功：https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38131742795 。交付 HEAD 的新 CI 须单独核对，不将该链接冒充新 HEAD。

## 实际源码与验证范围

|模块|状态|证据与限制|
|---|---|---|
|TrustedExecutionGateway|VERIFIED|gateway.ts；held fd 读写、固定 executable/argv、pinned HTTPS、注册 MCP、执行前拒绝和实际副作用测试。非 OS 沙箱，不拦截未接入调用。|
|Policy / Guard / Approval|VERIFIED|复用原 Guard 与 Policy；宿主能力审批，过期、一次消费、资源和 Guard 复查。模型没有批准或 reset 接口。|
|真实 Agent 主验收|VERIFIED|受控 SDK Agent + 真 Ollama/Qwen。不是原生 Codex/Claude/Cursor 全局工具拦截。|
|五类隔离蜜罐|VERIFIED|.env、无效 SSH、虚拟 DB/API/MCP 的单元与实际临时 IO；DB/API/MCP 是有界模拟交互，不是完整服务。|
|AdaptiveDecoyPlanner|IMPLEMENTED_NOT_VERIFIED|可信任务元数据的启发式选择已测；静态/自适应的真实有效性增益未测。|
|DataFlowTracker|VERIFIED|HMAC 来源、有限编码/片段、TTL、容量、同一 Guard 重建网关保持历史；任意变换/短分片/不可见工具 OUT_OF_SCOPE。|
|AI Risk Analyzer|VERIFIED|真实本地 suspicious 结构化输出在执行前产生；只能收紧拒绝，无效/超时仍需宿主批准；独立因果收益 NOT MEASURED。|
|证据协议 v0.1|VERIFIED|JSON Schema + 规范化局部 SHA256 链；100 条实验事件实际 schema 校验。无外部签名/时间戳/可信锚，不能抵抗管理员全链改写。|
|中文控制台|VERIFIED|真实 DEMO 后端读写/批准/蜜罐/隔离；桌面与手机浏览器实际检查，错误0、横向溢出0；保存模型结果不是现场推理。|
|原生 Agent 全局集成|BLOCKED|宿主能力矩阵明确 MCP配置/握手与完整 Guard 保护不同，尚无原生宿主完整 E2E。|
|OpenTelemetry exporter / 完整回放|NOT VERIFIED|文档只有属性映射与保存轨迹；未交付真正 exporter 或通用事件回放器。|

## 测试与修复

根项目最终 254 tests：250 pass、0 fail、4 skip。Sponsor 25 tests：24 pass、0 fail、1 skip。合计 **279 / 274 pass / 0 fail / 5 skip**，新增29测试；不重复计算 verify 重跑、社区包和 CI 矩阵。

运行 npm ci、build、test、pack:check、verify、audit；Sponsor 在受控测试环境运行 ci/test/smoke/audit。原始日志见 competition-submission/evidence/readiness-2026-10-11T10-07-25-916Z 与 security-lab/evidence/final-verify-9f00b6b.txt。根/Sponsor audit 均0已知漏洞，不是无漏洞保证。

Windows/Linux/macOS Node20/22：冻结代码真实 CI 六矩阵均 VERIFIED。Docker build + --help smoke：真实 CI VERIFIED；本地 Docker BLOCKED（未安装），不是实际生产容器攻防验证。

发现并修复的本轮缺陷：

|级别|根因与最小修复|修复提交/证据|
|---|---|---|
|P1|敏感 MCP 输出后 NETWORK callback 未关联会话来源；增加执行前来源/参数/指纹检查|13b44ad，review-flow-regression-before.txt|
|P1|同一 Guard 替换 gateway 清空敏感历史；用 Guard 生命周期 WeakMap 继承|5382448，replacement-flow-before.txt|
|P2|非法 AI JSON被当作有效 suspicious；复用严格 schema/实际证据校验|13b44ad，review-flow-regression-before.txt|
|P2|Windows 竞争锁观察期间被移除返回 IO；ENOENT 明确BUSY，仍需重新独占锁，不放行写入|5fa8f87，windows-lock-race-before.txt、失败CI保留|
|P2|原生 Git 不能解析 WSL Worktree；评测显式 SHA；早期 SHA展开为前一提交，保留原日志并用五文件哈希提供更正|ee8ebe / 06cd3dc，SOURCE_PROVENANCE_CORRECTIONS.json|
|P2|社区构建 Windows GBK读中文README失败；显式UTF-8|e3c7919，community-build-run.txt|

录屏首次因 browser 已关闭而无法 saveAs；保留失败日志，交付工具修复为关闭 context 后、关闭 browser 前保存。没有将失败录屏标为成功。

## 真实实验

保存90次真实本地模型运行，按不同提交/任务定义分别统计；不要合并为90个独立攻击样本。

- 间接 README A–F：48次；每组攻击0/5，主动拒绝0/5，蜜罐0/5，正常3/3。模型没有跟随注入，**不能证明安全收益**。
- 旧直接准入检查点：21次保留，A受限效果4/4、E/F0/4；不是 PI 防护率。
- 冻结代码直接准入：21次；A实际危险效果4/4、E/F0/4；E/F主动拒绝4/4，正常各3/3；F蜜罐1/4。真实副作用与 Guard 拒绝轨迹均保存。
- 最新 E 有2次、F 有1次结构校验通过的事前 AI suspicious，共3/3；中位延迟4667ms。AI独立阻断增益 NOT MEASURED，确定性批准策略本身也拒绝执行。
- 模型解释仍是非可信推测：某次审查在执行前声称操作未执行/攻击被阻止，不能把这种未观测叙述作为证据。结构有效不等于解释事实全部正确；实际效果只以执行器与网关记录确认。
- 分母、Wilson区间、Token、延迟、每个样本/失败和真实文件效应见 REAL_AGENT_EVALUATION.md 与 results.json/csv/md。不满足独立盲测100攻击/50正常目标；单模型/单seed/小样本，不证明≥95%生产正常成功率。

早期两组原始 sourceSHA 字段错误保持原样；派生报告明确 declaredSourceSHA、verifiedSourceSHA 与运行时源码哈希。冻结重跑显式完整9f00 SHA。没有修改失败样本或原始调用结果。

## 性能与分发

1500次实际 fd 读取+内存证据：median3.134ms、p95 5.647ms、p99 6.289ms；RSS约71→91MB；不含模型/fsync，无长时间稳定性证明。

独立 Community 正向清单候选：Agent_Canary_3_0_Community_Preview_9f00b6ba.zip，SHA256 6f9bcc8e55b0c17c112a164aff52192d7254096955804e0b15a9c7be7527dc59。111文件，45专项测试、构建、自检、audit真实通过。策展免费SDK入口与private package metadata明确披露，原有免费接口保留。

**历史 root 普通 npm/Docker V1/V2 商业分发边界 P1仍 OPEN**。本轮只安全隔离公开候选，没有改变付费用户授权、读取真实业务数据或迁移商业架构。MIT保持；Apache-2.0仅评估，¥99 Professional仅非核心便利功能规划。

## 阶段验收与剩余工作

Phase1：受控SDK模型/网关执行前闭环 VERIFIED；原生主宿主未验收。
Phase2：隔离蜜罐和交互证据 VERIFIED；自适应公平比较、完整攻击回放 NOT VERIFIED。
Phase3：有限数据关联与本地审查 VERIFIED；广泛误报与AI增益 NOT MEASURED。
Phase4：证据协议/控制台/跨平台 VERIFIED；独立100/50攻防目标 NOT COMPLETED。
Phase5：工程候选文档/材料/DraftPR可交付；正式3.0Release和参赛邮件 NOT COMPLETED。2.0仍保留为已验证竞赛候选。

当前官方2026网页未返回可核实的完整提交规则，截止/邮箱依据既有通过审核邮件，最新通知仍待确认。本轮没有正式提交或保证获奖。

下一步优先：原生宿主可信hook验收；冻结独立盲测集并进行D/E/F消融；维护者确认商业分发边界再评估正式候选。研究支线理论先独立审查再集成。

## 最终文件核对

3份工程候选PDF：6/4/4页，中文字体正常，全部14页渲染检查。架构SVG与提交清单同目录。原始1080p WebM保留本机，公开副本压缩为1920×1080、5fps、约1.9MB，实际Chrome播放/145秒跳转验证通过，时长212.8秒，无音频；外置SRT与画面字幕标明DEMO和保存模型结果。首次录制错误和墙钟时长误差另有保留与解释。

候选ZIP独立解压后110个manifest条目全匹配；在新建中文/空格路径真实npm ci/build/self-test通过。不是独立干净VM或新账户验证。新变更文本的定向secret模式检查0命中，不代表完整Git历史或所有格式无秘密。
