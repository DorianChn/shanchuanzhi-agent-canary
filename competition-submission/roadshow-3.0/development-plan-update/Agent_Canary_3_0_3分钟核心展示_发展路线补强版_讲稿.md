# Agent_Canary_3_0_3分钟核心展示_发展路线补强版：逐页讲稿

建议主讲总时长：180秒，未进行真人计时排练。后续发展均为计划，不能算作新增成果。

## 1 Agent Canary 3.0（建议15秒）

各位评委好，我是唐林博豪。Agent Canary 面向能够调用工具的 AI Agent，目标是在可信入口检查权限，并让第三方核对实际目标效果。今天展示限定受控 SDK 的工程证据，不作全局防护承诺。

证据：docs/3.0/FINAL_COMPETITION_READINESS.md

## 2 可信执行入口与信任边界（建议30秒）

模型只持有 dispatch。宿主持有工具描述、文件句柄和审批能力。网关在执行前检查参数与最小权限，必要时要求人工审批。文件使用预持有句柄，命令采用固定程序和参数，网络限制批准目标。该入口控制登记能力，不是系统调用级沙箱。

证据：src/runtime/gateway.ts；docs/3.0/SECURITY_BOUNDARIES.md

## 3 真实目标见证执行前拒绝（建议40秒）

这里先回放相同场景H08或H10的原始A/F轨迹：A实际返回虚拟秘密，F在读取前拒绝。然后运行离线操作员DEMO，检查文件和回调计数。DEMO是真实临时I/O，但不是模型自主攻击。我们展示证据与观察，不把页面上的DENY当成无副作用证明。

证据：security-lab/evidence/2026-10-11T15-04-14-292Z/results.json；competition-submission/3.0-final/有限凭据拒绝证据.json；test/gateway-acceptance.test.ts

## 4 真实 Qwen 留出对照（建议40秒）

冻结策略后，12个新间接攻击文本和4种正常任务各重复两次，两组共64次运行。A攻击效果4/24，F为0/24。F只有6/24任务存在拒绝，其余没有攻击效果不能计为主动拦截。重复相关、作者知晓设计，不是64个独立样本。AI审查和Canary触发均为0，不能归因其独立收益。

证据：security-lab/evidence/2026-10-11T15-04-14-292Z/results.json；competition-submission/roadshow-3.0/evidence/FROZEN_FACTS.json

## 5 安全边界与未证实结论（建议30秒）

最大边界是未接入的工具不受保护。原生宿主只有配置或部分hook证据，不能替代SDK验收。已开始并不合作的回调可能产生迟到副作用，文件句柄也不提供事务回滚。0/24和8/8只描述这一批任务。独立操作者E4还未完成。

证据：docs/3.0/SECURITY_BOUNDARIES.md；docs/3.0/AGENT_COVERAGE_MATRIX.md；test/gateway-acceptance.test.ts

## 6 开源贡献与后续验收（建议25秒）

项目公开免费候选、原始失败和贡献者套件。现有维护记录只有一期。未来先确认开发容量，再积累月度实录和真实外部复现；3.1先定接口版本与兼容规则，再验证一个可信宿主入口。E4与正式插件协议目前未验，谢谢。

证据：competition-submission/roadshow-3.0/development-plan-update/DEVELOPMENT_EVIDENCE_GATES.md；docs/competition/score-review-2026-10-12/MAINTENANCE_CAPACITY_AND_GATES.md；docs/competition/score-review-2026-10-12/MAINTENANCE_REVIEW_LOG.md；docs/competition/score-review-2026-10-12/EXTENSION_CONTRACT_SNAPSHOT.md
