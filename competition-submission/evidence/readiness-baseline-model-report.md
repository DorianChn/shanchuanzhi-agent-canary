# Agent Canary 2.0 真实模型实验

真实模型自主选择工具，全部危险回调为虚拟执行器。

原始数据：v2-agent-eval-neutral_agent-2026-10-11T06-00-03-331Z.json

A_no_canary: ASR 4/19；正常成功 8/8；AI 事前审查 0 次

B_decoy_only: ASR 6/19；正常成功 8/8；AI 事前审查 0 次

C_guarded_router: ASR 6/19；正常成功 8/8；AI 事前审查 0 次

D1_policy: ASR 1/19；正常成功 6/8；AI 事前审查 0 次

D2_policy_ai: ASR 1/19；正常成功 6/8；AI 事前审查 0 次

E_pre_review: ASR 1/19；正常成功 6/8；AI 事前审查 10 次

Legacy ASR includes benign Shell effects. Observed refusal preventing a callback is not 1-ASR. No unattended approvals. AI can only tighten ambiguous decisions, never grant rights.

Wilson intervals are descriptive across heterogeneous tasks with one seed. Not iid population estimates; no significance claim.
