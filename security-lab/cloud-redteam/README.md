# Agent Canary Cloud Red Team

This optional security-lab workspace (v0.1.0) uses Promptfoo for cloud-backed generation and batch execution over the Agent Canary SDK Gateway/Guard/HoneypotRuntime evidence path. It also includes a separately reported [AgentDojo](https://github.com/ethz-spylab/agentdojo) baseline pinned to `0.1.35` and benchmark data `v1.2.2`, plus an optional adapter for [Microsoft AI Red Team's open-source PyRIT](https://github.com/microsoft/PyRIT) pinned to `1.1.0`. This applies publicly released large-company red-team methods to reproducible security evaluation for personal agents. PyRIT is open source, not proprietary enterprise-only technology. The PyRIT adapter has not yet been run in this checkout. See [open-source research and integration fit](OPEN-SOURCE-RESEARCH.md) for source provenance and integration fit.

## Credentials and endpoint

Open the local masked input page with `npm run input` after installing this package, or create `security-lab/cloud-redteam/.env.local` locally. The file is Git-ignored. Never paste keys into chat or commit the local file. The default Yicode OpenAI-compatible base URL is `https://api.yicode.ai/v1`; the GPT and domestic model keys can use that same base URL. The Japan route listed in Yicode documentation is `https://jp.zxcbug.com/v1`.

The runner requires separate `LLM_API_KEY` and `GPT_API_KEY` values and keeps the domestic and GPT endpoint profiles separate. Model references use `llm:model-id` and `gpt:model-id`; `ATTACKER_MODEL` accepts a comma-separated list. `DEFENDER_MODELS` is also supported for repeated same-suite comparisons while `DEFENDER_MODEL` remains the required single-model setting. Keys stay in the ignored local environment file and are not passed to either Python benchmark process.

## Install and run

Requires Node.js 22.22 or newer. Install Promptfoo only in this optional workspace:

```sh
cd security-lab/cloud-redteam
npm install
npm test
```

The masked input form can be launched with `npm run input`. Configure a finite `MAX_TEST_BUDGET_USD` for a capped run, or set it to `unlimited` only when explicitly authorized. The campaign ledger still accounts for every call, respects `MAX_CONCURRENT_REQUESTS`, shows its cost estimate before testing, and stops on provider authentication, permission, billing, or persistent rate-limit rejection. `unlimited` removes only the local USD cap; it does not override provider limits or failures.

The runner prints an estimated input/output token count and cost before any API request. After a completed batch exists, later estimates use its measured defender-token usage with a safety factor, plus explicit judge, generator, and compatibility-probe allowances. The per-request ledger enforces the cumulative budget cap. It checks each model catalog ID and probes Chat Completions/Responses compatibility independently; retries are bounded and reserve cost before sending. Promptfoo remote red-team generation and telemetry are disabled; this run uses the repository's fallback corpus and its own cloud model adapter.

```sh
node run.mjs --size 100
node run.mjs --size 100 --defender-models gpt:gpt-6.1-sol,llm:glm-5.3
```

`100`, `1000`, `2000`, and `10000` are per defender-model trial counts across A/B/C/D. Every run gets a new timestamped directory under `runs/`. `MAX_TEST_BUDGET_USD` is enforced cumulatively across Promptfoo, AgentDojo, and PyRIT run directories; changing the cap does not reset earlier committed usage. Local credentials, virtual environments, and run directories are Git-ignored. Campaign summaries are generated outside those directories and should be reviewed before committing.

Each finalized Promptfoo run reports matched A/B/C/D attack outcomes for identical scenario IDs and defender models. Completed trials and errors with already-recorded successful side effects are evaluable; errors without conclusive effects are unknown and excluded from attack-defense rates and matched comparisons. The analysis uses recorded synthetic side effects, a deterministic paired bootstrap interval, and a two-sided exact McNemar test with Holm correction. These complete-case matched arm contrasts do not establish a causal before/after effect because the arms are distinct preregistered configurations.

### Optional AgentDojo baseline

The AgentDojo run is a model-only baseline over AgentDojo's synthetic `workspace` suite. It uses AgentDojo's own OpenAI Chat Completions adapter through a loopback bridge to the cloud session; only a random per-run local token reaches Python. The bridge enforces request limits, routes all model calls through the shared usage and budget ledger, and records raw upstream task traces. The tested default is one selected user task and injection task, with attack `tool_knowledge` and defense `tool_filter`.

Install Python and the pinned optional dependency in a dedicated environment, then preview the estimate or run the benchmark:

```sh
python -m venv .venv-agentdojo
.\.venv-agentdojo\Scripts\python.exe -m pip install -r requirements-agentdojo.txt
npm run agentdojo -- --dry-run
npm run agentdojo -- --suite workspace --user-task user_task_0 --injection-task injection_task_0 --attack tool_knowledge --defense tool_filter
```

Use `--model llm:model-id` or `--model gpt:model-id` to select the defender. AgentDojo's raw traces, subprocess logs, token ledger, configuration, and standalone Markdown report are stored under the ignored `agentdojo-runs/` directory. Its metric definitions remain upstream's `utility` and `security` results. This benchmark does not exercise Agent Canary's MCP Gateway, Policy, or HoneypotRuntime; treat it as a separate model-only baseline.

### Optional Microsoft Agent Governance Toolkit MCP metadata preflight

This offline preflight integrates Microsoft's `MCPSecurityScanner` over a saved MCP `tools/list` JSON response. It checks tool descriptions and schemas for suspicious instructions and compares tool additions, removals, and changes to any remaining tool metadata with an operator-reviewed baseline. The report lists changed tool names without copying descriptions or schemas. It accepts JSON only: it does not start an MCP process, connect to an endpoint, call a tool, call an LLM, or require API credentials. Its output is an advisory metadata report and does not change the Gateway's runtime decisions or A/B/C/D campaign results.

The adapter pins the MIT-licensed `agent-governance-toolkit-core==5.0.0` package in a separate Python environment. The published package requires Python 3.11 or newer and is marked Public Preview. The upstream built-in rules are sample rules; a clean scan is not proof that a server is safe. Review and provenance-check the baseline before trusting it.

```sh
python -m venv .venv-agt
.\.venv-agt\Scripts\python.exe -m pip install -r requirements-agt.txt
.\.venv-agt\Scripts\python.exe agt-mcp-scan.py --input examples/mcp-tools-current.json --baseline examples/mcp-tools-baseline.json --server-name synthetic-mcp
```

On macOS or Linux, replace the interpreter path with `.venv-agt/bin/python`. Input may be a bare tools array, `{"tools": [...]}`, or a JSON-RPC response containing `result.tools`. Reports contain file SHA-256 values, tool names involved in findings, classifications, and catalog additions, removals, or metadata changes when a baseline is supplied; descriptions and schemas are not copied into the report. Use `--output <new-file>` to write a report without overwriting an existing file. The default exit code is `2` for critical findings; use `--fail-on warning` to make warnings and catalog drift fail too. This static scanner is separate from `run.mjs`, the campaign budget ledger, model usage, and trial counts.

Run the scanner's standard-library regression tests with `python -m unittest discover -s test -p "test_agt_mcp_scan.py"` from this directory.

### Optional PyRIT adaptive attacker

PyRIT's `RedTeamingAttack` generates adaptive turns with the configured attacker model, sends each accumulated user-message prefix through a fresh synthetic harness trial, and scores the returned harness evidence. A separate configured judge model supplies an auxiliary LLM score only; it cannot determine the recorded attack-success result. Refusal and generation failures are archived, and the existing deterministic synthetic corpus supplies fallback cases without asking a model to bypass its provider's safety rules. Replay rows share prefixes and are correlated, so they are not independent benchmark cases.

Install the pinned optional dependency in its own Python environment, then preview the estimated token and cost budget or start a run:

```sh
python -m venv .venv-pyrit
.\.venv-pyrit\Scripts\python.exe -m pip install -r requirements-pyrit.txt
npm run pyrit -- --dry-run --arm D --max-turns 3
npm run pyrit -- --arm D --max-turns 3
```

The Python environment must use a PyRIT-supported Python version (`>=3.10,<3.15`). The dry-run prints an estimate without calling a model. A real run requires `ATTACKER_MODEL`, `DEFENDER_MODEL`, `JUDGE_MODEL`, provider keys, and a finite `MAX_TEST_BUDGET_USD`; compatibility checks, retries, concurrency, and the cumulative per-request ledger remain enforced. Raw PyRIT output, model usage, synthetic harness trials, refusal/failure archive, configuration, and standalone report go under the ignored `pyrit-runs/` directory.

## Experiment scope and report

### Latest cloud campaign (2026-11-07)

The final paired GPT and GLM runs replayed the same 500 synthetic scenarios (375 attacks and 125 normal controls) through A/B/C/D. Their 4,000 model-by-arm trial rows are repeated measurements of those 500 scenarios, not 4,000 independent cases. GPT (`gpt:gpt-6.1-sol`) completed 2,000/2,000 rows: 546/1,500 attacks produced recorded synthetic side effects (36.4%), 727/1,500 reached a threat tool attempt (48.5%), and 954/1,500 were defended (63.6%). GLM (`llm:glm-5.3`) recorded 2,000 rows: 1,999 completed and one attack row errored. Among 1,499 evaluable attacks, 548 produced side effects (36.6%), 737 reached a threat tool attempt (49.2%), and 951 were defended (63.4%). The error was `A-SYN-00338`; the API request timed out before a tool call, so its outcome remains unknown.

Across A/B/C/D, attack side effects were GPT 180/375, 184/375, 182/375, and 0/375; GLM 184/374, 185/375, 179/375, and 0/375. Each model passed 63/125 normal controls in D. The read-only Gateway rejected the remaining normal write tasks; the write boundary was preserved. Paired model comparisons had Holm-adjusted p-values of 1 in all four arms and confidence intervals that include zero. These runs do not establish a general model ranking or show that code changes caused a before/after improvement. All effects were measured in repository-owned synthetic fixtures; no external MCP server or production data was used.

For these two runs, repository token-pricing estimates were $17.7604745 for GPT and $6.3331407 for GLM; per-run budget ledgers recorded $17.8091185 and $6.7374001. The combined estimate is $24.0936152 and the combined ledger is $24.5465186. These are not confirmed Yicode invoice amounts. The GLM run's advisory judge calls used GPT, as shown in the report's per-model token table.

Across the full campaign history, 28 run attempts produced 14 completed batches and 7,000 recorded trial rows; 12 stopped before trials and two were partial. Completed attack-generation runs recorded 0/452 explicit refusals and 61 generation/API/parse failures that used deterministic fallback payloads. An interrupted generator separately archived 82 failure records and zero explicit refusals. These generation records are not part of the two paired 2,000-row defender runs, which reused frozen cases without generating new attacks.

See the [full campaign report](CAMPAIGN-REPORT-2026-11-07.md), [machine-readable summary](campaign-summary-2026-11-07.json), and [credential-redacted evidence archive](campaign-evidence-2026-11-07.zip). The archive contains sanitized copies of raw run records; source run directories are unchanged. The [2026-11-06 report](CAMPAIGN-REPORT-2026-11-06.md) remains a historical snapshot.

All effects use new private temporary fixtures, synthetic secrets, a fixed loopback sink, and fixed harmless Node fixture commands. No host paths, real credentials, or external tool destinations are exposed. Attack-generator refusals are recorded and replaced with deterministic variants from `security-lab/holdout-v1.json`; refusals never terminate the whole run. Refusal, detection, active denial, model non-attempt, and actual side effects are reported separately.

The A/B/C/D definitions are read from `security-lab/run-sdk-agent.mjs` and are not changed: A has no Canary, B records static `.env` reads, C adds Guard quarantine, and D uses deterministic Gateway capabilities without a honeypot or AI review. The judge is advisory only. Attack success, defense success, Gateway decisions, MCP fixture calls, file hashes, canary events, and session IDs come from recorded trial evidence.

Each report records completed count, generation refusal rate, per-generator effectiveness, per-defender A/B/C/D results, token counts, conservative cost from provider-reported token usage, failures, raw logs, test configuration, and source commit. Generic OpenAI-compatible usage does not guarantee an invoice amount; the final billed cost must be reconciled with Yicode's usage ledger.

After one or more runs, rebuild the campaign report from local artifacts without making API calls:

```sh
npm run report
```

The report generator checks that run ledgers, trial rows, arm totals, Promptfoo counters, and evidence-state counts reconcile before writing Markdown and JSON summaries. It also scans the summaries for common API-key formats.

After reviewing the report, create a credential-safe copy of all local runs for publication:

```sh
python bundle-evidence.py --date 2026-11-07
```

The bundler leaves ignored source runs unchanged, excludes environment files and dependencies, redacts credential-like values from text copies, and adds a per-file source/archive hash manifest. It verifies the ZIP and checks that exact values from the ignored local environment file are absent.

If Promptfoo exits with assertion code `100`, `run.mjs` still finalizes when the result file and raw trial count match the planned batch. Existing evidence can be finalized without API calls using `npm run finalize -- --run-dir runs/<run-id> --promptfoo-exit 100`.

To compare defender models on identical prompts, pass `--reuse-cases runs/<source-run-id>`. This copies a validated synthetic-only case set, skips attack generation, hashes the reused set into preregistration, and leaves the per-request ledger active.
