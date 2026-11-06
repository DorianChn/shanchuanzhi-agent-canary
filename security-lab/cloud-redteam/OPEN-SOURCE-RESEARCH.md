# Open-source research for Agent Canary red teaming

Reviewed 2026-11-07. This is an integration-fit review, not a claim that the listed tools have been installed or run in this checkout.

## Current project boundaries

- [Promptfoo](https://github.com/promptfoo/promptfoo) remains the batch runner for cloud model generation and execution.
- [AgentDojo](https://github.com/ethz-spylab/agentdojo) is already an optional, separately reported simulated-agent benchmark. Its model-only results do not exercise Agent Canary's Gateway, Policy, or HoneypotRuntime and do not count as A/B/C/D harness results.
- [Microsoft PyRIT](https://github.com/microsoft/PyRIT) is now an optional adaptive multi-turn attacker pinned to 1.1.0; each request is routed into the synthetic Agent Canary harness through the shared cloud ledger.
- Agent Canary's own synthetic harness remains the source of tool-call, policy, canary, isolation, and side-effect evidence. Do not replace those checks with an LLM judge score.

## Integrated: Microsoft PyRIT

[Microsoft PyRIT](https://github.com/microsoft/PyRIT) is the strongest complementary candidate for adaptive multi-turn attack orchestration. Its upstream project describes automated scans, adaptive multi-turn attacks, an extensible framework, OpenAI-compatible targets, and custom HTTP targets. The latest stable GitHub release observed during this review is `v1.1.0` (MIT; Python `>=3.10,<3.15`).

Integration boundary:

1. Keep PyRIT optional in a dedicated Python environment; do not add its large framework dependency set to the Node campaign runtime.
2. Use it to generate and adapt attacker turns, while routing each resulting test through the isolated Agent Canary harness with synthetic fixtures.
3. Bridge calls through the existing Node `CloudSession`/budget ledger so provider keys, protocol detection, request caps, retries, and cost accounting stay centralized.
4. Record Gateway, policy, MCP, canary, honeypot, trial, and side-effect evidence per turn. A direct PyRIT model-target score is a separate model baseline, not an Agent Canary attack-success result.
5. Preserve explicit refusal outcomes and route rejected/failed generations to the existing deterministic fallback; do not prompt around provider safety controls.

The adapter pins the v1.1.0 release and follows its [versioned multi-turn attack API](https://microsoft.github.io/PyRIT/1.1.0/code/executor/multi-turn/), [OpenAI Chat target](https://microsoft.github.io/PyRIT/1.1.0/code/targets/openai-chat-target/), and [scoring API](https://microsoft.github.io/PyRIT/1.1.0/api/pyrit-executor-attack/). The cloud key remains in Node; PyRIT receives only a short-lived loopback bearer token. Its LLM judge is auxiliary and cannot override synthetic harness side-effect evidence.

## Authoritative MCP security reference: OWASP MCP Security Testing Guide

[OWASP MCP Security Testing Guide](https://github.com/OWASP/MCP-Security-Testing-Guide) is the best MCP-specific taxonomy and review source found. It describes 79 tests across threat sections 3.1–3.19, includes safe lab fixtures, and requires explicit authorization and synthetic environments. It is licensed GPL-3.0. Use it as a linked review checklist and map its concepts to Agent Canary's own ten categories; do not copy or bundle its test text/code without a license review. It is a reference, not a replacement runtime.

## Focused candidates

| Project | Distinct value | Fit decision |
| --- | --- | --- |
| [Microsoft Agent Governance Toolkit](https://github.com/microsoft/agent-governance-toolkit), [`mcp-scan` tutorial](https://github.com/microsoft/agent-governance-toolkit/blob/main/docs/tutorials/27-mcp-scan-cli.md) | Static metadata checks for hidden instructions, description injection, schema abuse, cross-server impersonation, and rug-pull drift; MIT. | Good candidate for a later optional preflight against synthetic tool metadata. The tutorial says some current Streamable HTTP behavior is on `main` after the published release; pin and inspect the released package before adoption. |
| [Invariant MCP-Scan](https://github.com/invariantlabs-ai/docs/blob/main/docs/mcp-scan/scanning.md) | Tool-description and behavior scanning, with optional runtime proxying. | Do not enable in the default campaign: upstream says the default scan sends tool names/descriptions to its service. `--local-only` avoids that service but requires an OpenAI key and gives less accurate local-LLM checks. |
| [InjecAgent](https://github.com/uiuc-kang-lab/InjecAgent) | MIT indirect-prompt-injection dataset with 1,054 cases across 17 user tools and 62 attacker tools. | Useful as a future data-only source for synthetic MCP fixture conversion. Preserve dataset provenance and remap all effects to local synthetic resources; its published evaluation examples date from 2024 and should not become a parallel runtime. |
| [Agent Security Bench (ASB)](https://github.com/agiresearch/ASB) | ICLR 2025 benchmark covering ten agent scenarios and multiple attack/defense styles. | Research reference only for now. Its documented setup is based on AIOS and its quickstart uses Ollama; that overlaps the existing AgentDojo baseline and does not fit the cloud-first attacker path. |

## Integration order

1. Validate the optional PyRIT adapter in an explicitly authorized synthetic run before making runtime-effectiveness claims.
2. Use OWASP's taxonomy to review category coverage while preserving the repository's existing acceptance definitions.
3. Consider AGT's static scanner as a separate tool-metadata preflight after verifying a published release and dependency footprint.
4. Treat InjecAgent as a separately licensed/provenance-tracked dataset adapter; leave ASB and Invariant MCP-Scan out of the default runner for the reasons above.

No model API calls, benchmark runs, or test executions are represented by this document.
