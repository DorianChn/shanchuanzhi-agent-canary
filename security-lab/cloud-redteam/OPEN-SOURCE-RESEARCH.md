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

## Integrated: Microsoft Agent Governance Toolkit MCP metadata preflight

The optional `agt-mcp-scan.py` adapter uses the published `agent_os.mcp_security.MCPSecurityScanner` API to inspect saved tool metadata and compare it with an operator-reviewed catalog baseline. The integration pins `agent-governance-toolkit-core==5.0.0` in an isolated Python environment; the inspected PyPI wheel is MIT-licensed, requires Python `>=3.11`, and has SHA-256 `6f8494c5ada3d5824f90e56d5e450f8ca6fba9759c107f077bdc0c87b7c496d2`. The scanner source exposes checks for hidden instructions, description injection, schema abuse, and tool-definition fingerprints. See the [upstream MCP scan guide](https://github.com/microsoft/agent-governance-toolkit/blob/main/docs/tutorials/27-mcp-scan-cli.md) and [scanner API](https://github.com/microsoft/agent-governance-toolkit/blob/main/agent-governance-python/agent-os/src/agent_os/mcp_security.py).

The adapter accepts only saved JSON and calls the scanner API directly. It does not invoke upstream live-inspection flows, execute configured commands, connect to MCP transports, or call models. It emits hashes and finding classifications without copying descriptions or schemas into the report. AGT labels its built-in patterns as sample rules and its package as Public Preview; therefore this is an advisory supply-chain preflight, not a complete detector, runtime policy, or authorization boundary. A clean result cannot substitute for the Agent Canary Gateway.

The exact package artifact and API symbols were inspected without installing or executing the package. The optional adapter and sample metadata have not been run in this checkout.

## OWASP Agentic Applications 2026 coverage cross-reference

OWASP's [2026 Agentic Applications Top 10](https://genai.owasp.org/2025/12/09/owasp-top-10-for-agentic-applications-the-benchmark-for-agentic-security-in-the-age-of-autonomous-ai/) gives the existing lab categories a current shared vocabulary. The following is a nearest-risk mapping for review; it does not assert full coverage or change the A/B/C/D arm definitions, trial conditions, or success metrics.

| Existing Agent Canary test surface | Closest OWASP Agentic risk references |
| --- | --- |
| Direct, indirect, tool-description, and tool-response injection | ASI01 Agent Goal Hijack; ASI04 Agentic Supply Chain Vulnerabilities for poisoned tool metadata |
| Tool permission escalation, policy bypass, and fail-closed checks | ASI02 Tool Misuse and Exploitation; ASI03 Identity and Privilege Abuse |
| Multi-turn manipulation and cross-session contamination | ASI06 Memory and Context Poisoning |
| Canary detection and quarantine/isolation evidence | Supports investigation of ASI10 Rogue Agents and ASI02 Tool Misuse; it is not a full test of either risk |

Inter-agent communication (ASI07), cascading failures (ASI08), and human-agent trust exploitation (ASI09) are not covered completely by the current ten cloud attack categories. They should be added only as separately versioned scenarios with their own synthetic fixtures and evidence, so existing campaign results remain comparable.

## Authoritative MCP security reference: OWASP MCP Security Testing Guide

[OWASP MCP Security Testing Guide](https://github.com/OWASP/MCP-Security-Testing-Guide) is the best MCP-specific taxonomy and review source found. It describes 79 tests across threat sections 3.1–3.19, includes safe lab fixtures, and requires explicit authorization and synthetic environments. It is licensed GPL-3.0. Use it as a linked review checklist and map its concepts to Agent Canary's own ten categories; do not copy or bundle its test text/code without a license review. It is a reference, not a replacement runtime.

## Focused candidates

| Project | Distinct value | Fit decision |
| --- | --- | --- |
| [Microsoft Agent Governance Toolkit](https://github.com/microsoft/agent-governance-toolkit), [`MCPSecurityScanner`](https://github.com/microsoft/agent-governance-toolkit/blob/main/agent-governance-python/agent-os/src/agent_os/mcp_security.py) | Static metadata checks for hidden instructions, description injection, schema abuse, cross-server impersonation, and rug-pull drift; MIT. | Integrated as an optional saved-JSON preflight. Public Preview/sample rules are advisory; live transport scanning is not enabled. |
| [Meta LlamaFirewall](https://github.com/meta-llama/PurpleLlama/tree/main/LlamaFirewall) | Layered prompt-guard, alignment, and code scanners. | Strong research candidate, but not added to the default path: it brings Python/model distribution and inference requirements that overlap the lab's existing classifier and cloud attacker/defender comparison. |
| [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/) | Common attributes for model and tool activity, including token usage and tool-call metadata. | Candidate for a later opt-in evidence exporter. Tool arguments/results can contain sensitive data; first define redaction and endpoint controls. The current hash-chained local evidence remains the security record. |
| [Invariant MCP-Scan](https://github.com/invariantlabs-ai/docs/blob/main/docs/mcp-scan/scanning.md) | Tool-description and behavior scanning, with optional runtime proxying. | Not enabled by default because upstream documents service-backed scanning that can transmit tool metadata; the local option adds separate model credentials and dependencies. |
| [InjecAgent](https://github.com/uiuc-kang-lab/InjecAgent) | MIT indirect-prompt-injection dataset with 1,054 cases across 17 user tools and 62 attacker tools. | Useful as a future data-only source for synthetic MCP fixture conversion. Preserve dataset provenance and remap all effects to local synthetic resources; its published evaluation examples date from 2024 and should not become a parallel runtime. |
| [Agent Security Bench (ASB)](https://github.com/agiresearch/ASB) | ICLR 2025 benchmark covering ten agent scenarios and multiple attack/defense styles. | Research reference only for now. Its documented setup is based on AIOS and its quickstart uses Ollama; that overlaps the existing AgentDojo baseline and does not fit the cloud-first attacker path. |

## Integration order

1. Validate the optional PyRIT adapter in an explicitly authorized synthetic run before making runtime-effectiveness claims.
2. Use OWASP's taxonomy to review category coverage while preserving the repository's existing acceptance definitions.
3. Treat InjecAgent as a separately licensed/provenance-tracked dataset adapter; leave ASB and Invariant MCP-Scan out of the default runner for the reasons above.
4. Version any future ASI07/ASI08/ASI09 scenarios separately rather than changing the existing attack categories or historical run results.

No model API calls, benchmark runs, or test executions are represented by this document.
