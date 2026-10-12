# Agent_Canary_3_0_60秒精简版_发展路线补强版：逐页讲稿

建议主讲总时长：60秒，未进行真人计时排练。后续发展均为计划，不能算作新增成果。

## 1 Agent Canary 3.0（建议15秒）

Agent Canary用可信入口控制AI Agent工具调用，并让评委核对危险效果。它面向自建Agent与受控工具链。

证据：docs/3.0/FINAL_COMPETITION_READINESS.md

## 2 真实 Qwen 留出对照（建议25秒）

网关在模型调用前检查权限。冻结后真实Qwen小样本中，攻击效果4/24降至0/24，但仅6/24任务有拒绝。正常任务8/8。未尝试攻击不算拦截，不能推出总体百分百防护。

证据：security-lab/evidence/2026-10-11T15-04-14-292Z/results.json；competition-submission/roadshow-3.0/evidence/FROZEN_FACTS.json

## 3 公开证据与验证边界（建议20秒）

免费候选和原始证据公开，目前保护仅限受控SDK，0/24不能表示100%防护。未来先确认开发容量，积累真实维护与外部复现，再做版本化插件接口和一个可信宿主验收。这些都是未来门槛，不是已经验证的能力。谢谢。

证据：docs/3.0/SECURITY_BOUNDARIES.md；docs/3.0/AGENT_COVERAGE_MATRIX.md；test/gateway-acceptance.test.ts；competition-submission/roadshow-3.0/development-plan-update/DEVELOPMENT_EVIDENCE_GATES.md；docs/competition/score-review-2026-10-12/MAINTENANCE_CAPACITY_AND_GATES.md；docs/competition/score-review-2026-10-12/MAINTENANCE_REVIEW_LOG.md；docs/competition/score-review-2026-10-12/EXTENSION_CONTRACT_SNAPSHOT.md

