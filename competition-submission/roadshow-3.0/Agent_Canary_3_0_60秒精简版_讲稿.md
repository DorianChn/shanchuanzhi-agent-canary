# Agent_Canary_3_0_60秒精简版 逐页讲稿

目标时长 60 秒。计划时长，不代表已完成真人计时排练。运行时 99660b36db9d5b1121eea6fe06b026c5f1e36bcf。

## 1. Agent Canary 3.0（0–15秒）

Agent Canary用可信入口控制AI Agent工具调用，并让评委核对危险效果。它面向自建Agent与受控工具链。

证据：docs/3.0/FINAL_COMPETITION_READINESS.md

## 2. 真实 Qwen 留出对照（15–40秒）

网关在模型调用前检查权限。冻结后真实Qwen小样本中，攻击效果4/24降至0/24，但仅6/24任务有拒绝。正常任务8/8。未尝试攻击不算拦截，不能推出总体百分百防护。

证据：security-lab/evidence/2026-10-11T15-04-14-292Z/results.json；competition-submission/roadshow-3.0/evidence/FROZEN_FACTS.json

## 3. 公开证据与验证边界（40–60秒）

项目免费MIT开源，公开原始实验和目标观察。当前验证限受控SDK，不是第三方Agent全局防护。下一步优先外部复现和一个可信宿主入口验证。谢谢。

证据：docs/3.0/SECURITY_BOUNDARIES.md；docs/3.0/AGENT_COVERAGE_MATRIX.md；test/gateway-acceptance.test.ts
