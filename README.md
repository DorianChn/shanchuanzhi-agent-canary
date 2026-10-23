> Windows 预发布下载：[Community candidate.4](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0-competition-candidate.4)。安装器无需另装 Node/Python/Git；未签名，本机 GUI 已验收，干净 Windows VM 与 E4 未验证。仅已接入工具受保护。

> 3.0 Community product acceptance / 产品验收：本轮修复候选说明见 [RELEASE_READINESS](docs/3.0/RELEASE_READINESS.md)。旧 npm 兼容版本 1.2.7 与 Community 产品版本分列；CLI `build-info` 可查看构建身份。仅已接入的工具受保护，原生宿主及干净 Windows VM 限制公开披露。

# agent-canary

> Auto E4 desktop work is being developed on the open PR branch; it is **not included in public candidate.4**. The current source runner produces a bounded local evidence bundle; it does not launch/restore a VM, call GPT-6, modify GitHub, or establish external E4. See [Auto E4 scope and reproduction](docs/3.0/AUTO_E4.md).

Tripwires for AI coding agents. It plants decoy MCP tools and canary tokens in
your environment, then gives SDK integrations a session circuit breaker to
contain the next guarded action after a compromise signal.

Works with MCP hosts that support stdio; non-MCP agents can use the SDK (see
below). This audit verified the stdio protocol with the MCP JavaScript client,
not every editor's installation UI. Node 20+, MIT, no telemetry.

中文文档：[README.zh-CN.md](README.zh-CN.md)

**3.0 engineering candidate acceptance:** [core report](docs/3.0/FINAL_3_0_ACCEPTANCE.md), [fair real-model comparison](docs/3.0/FAIR_CORE_EVALUATION.md), [E0–E4 evidence mapping](docs/3.0/EVIDENCE_ASSURANCE_MAPPING.md). Actual pre-execution effects were verified for a controlled SDK Agent. Native clients' global protection, independent AI benefit and adaptive decoy efficacy remain unverified. The 2.0 candidate is preserved; 3.0 is not a stable release.

**Type-fixed supplementary candidate:** [candidate.2](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0-competition-candidate.2) includes dist/sdk.d.ts, matching ./sdk types and a three-command offline acceptance flow. Its 33 runtime JS files match candidate.1 byte-for-byte. The emailed candidate.1 and its original video/slides are preserved. [Limited native Claude Read/Bash evidence](docs/3.0/AGENT_COVERAGE_MATRIX.md) is separate direct-admission testing, not global protection or a new prompt-injection rate.

## 3.0 competition candidate and development gates

[Free candidate Release](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0-competition-candidate.1) · [Public reproduction index](competition-submission/roadshow-3.0/GitHub公开复现索引.md) · [Updated roadshow](competition-submission/roadshow-3.0/development-plan-update/README.md)

Runtime freeze: 99660b36db9d5b1121eea6fe06b026c5f1e36bcf. Verified control covers registered tools of the controlled SDK Agent. MCP configuration does not establish global native-host protection. This candidate is not a stable npm/Docker release; existing package metadata and commercial distribution limits remain disclosed below.

|Evidence area|Current evidence|Next step and acceptance gate|
|---|---|---|
|Development capacity|Published planning estimate; actual availability unconfirmed|Maintainer confirms a development budget separately from upkeep. Defer work if capacity is insufficient.|
|Maintenance history|One actual October 12 review, public CI and retained failures|Propose monthly records of actual SHA, commands, defects, time spent and unknowns. Count only completed cycles.|
|External participation|Reproduction guide, receipt template and working SDK contributor kit|A different real operator reproduces in an independent environment and records target effects. E4 and new external participation remain unverified.|
|Plugin protocol|Frozen SDK interface, bundled declarations in candidate.2 and MCP extension examples|For 3.1, review a versioned contract; test exports/types, permissions, cancellation, lifecycle and compatibility; then verify one official host's controlled entry.|

**Planned sequence:** 3.0 upkeep → 3.1 trusted Adapters and protocol → 3.2 fair ablations and normal-task evaluation → 3.5 team conveniences subject to real demand → 4.0 permission-propagation research. Resources and acceptance gates determine scheduling. The original roadmap estimate is 18–31 person-weeks (720–1240 development hours assuming 40 hours/week), with maintenance budgeted separately. These are assumptions, not committed staffing or work already done.

See [capacity and evidence gates](competition-submission/roadshow-3.0/development-plan-update/DEVELOPMENT_EVIDENCE_GATES.md), [contributor start](docs/competition/score-review-2026-10-12/CONTRIBUTOR_START.md), and [extension snapshot](docs/competition/score-review-2026-10-12/EXTENSION_CONTRACT_SNAPSHOT.md). Independent AI/adaptive-decoy benefit remains unmeasured. Plans do not establish protection claims or justify a score increase.

[Live demo & sponsor](https://dorianchn.github.io/shanchuanzhi-agent-canary/) · [Glama listing](https://glama.ai/mcp/servers/DorianChn/shanchuanzhi-agent-canary) · [GitHub Discussions](https://github.com/DorianChn/shanchuanzhi-agent-canary/discussions)

![Agent Canary — AI agent and MCP security](docs/agent-canary-cover-v2.png)

## Agent Canary 2.0 competition preview

The optional [file-backed state adapter](docs/FILE_STATE_STORE.md) persists quarantined trusted principals across restarts. Existing defaults remain in-memory. Missing, corrupt or busy state fails closed instead of falling back to an empty store.

[GitHub preview release](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v2.0.0-competition-preview.1) · [Updated bilingual website](https://dorianchn.github.io/shanchuanzhi-agent-canary/) · [Download the standalone free build](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/download/v2.0.0-competition-preview.1/Agent_Canary_Competition_2_0.zip)

This is a GitHub competition preview, not a stable npm/Docker release. The npm metadata remains 1.2.7; use the explicitly separated free ZIP. PDF and video artifacts retain their frozen, verified core version.

The optional [security router](docs/SECURITY_ROUTER_2.md) adds host-defined parameter policies, bounded sensitive-source provenance, realpath checks, callback deadlines, and pre-execution AI review. The existing CLI, SDK and deterministic Guard remain compatible. AI cannot approve operations or reset quarantine; pre-review is **off by default**.

The [Agent integration guide](docs/AGENT_INTEGRATIONS_2.md) covers safe configuration preview, private backups, installation and restore for Claude Code, Cursor, Cline CLI, Codex and custom MCP clients. Actual desktop task protection is **not verified**. Real local-model choices through the custom protected MCP host were verified with virtual callbacks; this does not protect other servers or native tools.

[168 real Qwen trials](competition-submission/evidence/v2-summary.json) preserve all A/B/C/D/E outcomes. D1 and E both recorded 1/19 attacks under the unchanged legacy definition; E added 2/8 hard refusals on normal tasks. Independent AI blocking gain is not established. All effects were simulated, with real autonomous model tool selection. See the [final audit](docs/competition/AGENT_CANARY_2_FINAL_REPORT.md), [frozen version](competition-submission/V2_DELIVERY_VERSION.md), and [independent free artifact](competition-submission/Agent_Canary_Competition_2_0.zip). Ordinary commercial-package distribution boundaries remain an open P1; no release or license migration is performed.

## V1.2.7: containment that holds through the next retry

V1.2.7 is the free public line. Its signals are explicit decoy calls and exact
matches for generated canary tokens; they are high-specificity indicators, not
a guarantee of zero false positives. It keeps the free SDK containment
primitives, then adds
`createGuardedToolRouter()` so integrations have one reviewed dispatch path for
decoys and real tools. It retains the fully offline `self-test` and centralized
audit-event redaction before data reaches JSONL or a webhook. It also publishes
concise MCP server instructions so registries and clients can identify the
decoys as inert and state the guarded-containment boundary before tool use. For
hosts using short-lived session-scoped vault references, an optional
secret-free `credentialRevoker` hook starts invalidation after quarantine and
before alerts. Hosts can also share an explicit state store so a reviewed
identity cannot bypass quarantine simply by receiving a fresh session handle:

| Layer | What it does |
|---|---|
| Detection | Inert decoy MCP tools and planted canary tokens detect a compromise signal. |
| Containment | `SAFE → TRIPPED → QUARANTINED` happens synchronously; `createGuardedToolRouter()` sends decoys to containment and real tools through the fail-closed guard. |
| Alerting | JSONL audit events and optional webhook/desktop alerts are sent after the state transition; tool arguments and canary values are redacted. |

```text
Untrusted content → agent may follow it → decoy call / registered token appears
                                      ↓
                              SESSION TRIPPED
                                      ↓
                                QUARANTINED
                                      ↓
                         dangerous guarded tool call
                                      ↓
                                  BLOCKED
                                      ↓
                            alert + local audit log
```

The containment API is documented in [docs/containment.md](docs/containment.md).
The audited `main` also tracks the license-gated evaluation, dashboard, export,
and licensing implementations under `src/`; the package manifest includes
`dist/`, so a package built from this tree contains those compiled modules.
License gating is not source separation. This audit does not alter the
existing commercial packaging boundary; do not describe the current tree as
containing private V2 source.

## The problem

Coding agents read files, run commands and call APIs. If one picks up injected
instructions — a poisoned README, a malicious web page, a doc file — it may
quietly exfiltrate secrets or worse, and nothing tells you.

Agent Canary does not score prompts or determine whether a model obeyed an
injection. It waits for a decoy call or a registered token to surface, then
records that signal. A mistaken integration call can touch a decoy, so an alert
still needs incident review.

- **Decoy MCP tools.** A fake wire transfer, a fake production secret reader, a
  fake root shell. They never perform the represented action. Each call does
  update Agent Canary's local token registry and audit log, and can send alerts
  to a webhook or desktop notifier you configured.
- **Canary tokens.** Random `cnry_...` strings planted in honeypot files. An
  exact match in inspected text is evidence that the token surfaced; review the
  source and context before deciding what happened.

Every fake tool reply embeds a one-time trace token, so exfiltrated "secrets"
point back to the exact tool call that leaked them.

## Install the free V1.2.7 line

Prerequisite: Node.js 20 or newer. The public source build contains the free
V1.2.7 baseline:

    git clone https://github.com/DorianChn/shanchuanzhi-agent-canary && cd shanchuanzhi-agent-canary
    npm install && npm run build && npm link

Run `agent-canary --help` after linking, then run the offline containment
check. The CLI keeps the free SDK and decoy path available without a paid
license. The current repository/package build also contains license-gated
compiled modules; the maintainer must resolve that distribution boundary
before claiming the paid source is private.

### Container and Glama evaluation

The repository includes a minimal stdio-only Docker image so MCP registries
such as Glama can build the free V1 server and inspect its tool schemas without
credentials, network access, or a V2 delivery package:

    docker build -t agent-canary .
    docker run --rm -i agent-canary

The image starts `agent-canary serve`. It exposes inert decoy tools and does
not execute real tools. The Docker build context includes compiled license
checking code but not the sponsor gateway, signing keys, or customer records.

## Usage

    # plant a honeypot file with fake secrets
    agent-canary tokens plant .env.canary --label my-project

    # register 12 decoy tools in Claude Code (or: install cursor)
    agent-canary install claude

    # verify the alert pipeline
    agent-canary alert-test

    # verify SAFE → QUARANTINED → BLOCKED locally, without network or user-state writes
    agent-canary self-test

Restart your editor. If the agent later calls a decoy or leaks a token:

    $ agent-canary events
    2026-09-15T10:21:04Z  decoy_called  tool=canary_read_secrets
    2026-09-15T10:21:09Z  token_found   label=my-project path=report.md

The scanner is CI-friendly (exit code 1 on leak) and there is a live watcher:

    agent-canary tokens check . && echo clean
    agent-canary watch .

## The decoys

The agent sees admin-grade tools. None of them do anything real.

| Decoy tool | What a hijacked agent thinks it gets (simulated only) |
|---|---|
| `canary_transfer_funds` | wire transfer, auto-approved under 50k |
| `canary_read_secrets` | production API keys for any environment |
| `canary_run_shell` | arbitrary command as root on the build server |
| `canary_delete_files` | permanent deletion, no trash, no undo |
| `canary_send_email` | email from any internal address, SPF skipped |
| `canary_export_database` | full-table CSV dump, no audit entry |
| `canary_fetch_internal` | internal admin panel from the trusted network |
| `canary_disable_security` | endpoint protection turned off |
| `canary_cloud_console` | AWS/GCP console sessions + temporary credentials |
| `canary_k8s_exec` | arbitrary exec inside a production pod |
| `canary_secrets_rotate` | emergency credential rotation (locks out humans) |
| `canary_git_force_push` | force push to protected branches |

## Free vs Personal

This repository publishes the free V1 baseline. V2 Personal is described here
for subscribers, but its paid implementation, signing keys, customer records,
and delivery package are kept outside the public repository.

| | Free (forever) | Personal (¥72 / 30 days) |
|---|---|---|
| Decoy server, tokens, watch, alerts, install | yes | yes |
| `eval` — injection resistance scoring | | yes |
| `dashboard` — HTML attack-chain timeline | | yes |
| `export` — CEF / JSON / CSV for SIEM | | yes |
| V1.2.7 session circuit breaker, shared identity containment, optional credential revoker, guarded tool router, MCP safety instructions, and offline `self-test` | yes | yes |
| SDK decoy handling and canary scanning | yes | yes |

V2 Personal currently uses a **manual** WeChat Pay / Alipay confirmation flow.
See the public [payment instructions](https://dorianchn.github.io/shanchuanzhi-agent-canary/pay.html)
for the QR codes, price, and the information needed for delivery. The seller
checks the actual transfer before sending installation and activation
instructions; no automatic delivery or instant activation is promised.

## Cooperation and integration

We welcome focused collaboration with MCP client maintainers, AI-agent builders,
security researchers, and DevSecOps teams:

- integrate agent-canary into an MCP client, agent framework, or secure template;
- run a reproducible prompt-injection evaluation and publish the results;
- pilot the alert/audit pipeline in a controlled development or CI environment;
- discuss paid integration, private deployment, or security-assessment support.

Start in [GitHub Discussions](https://github.com/DorianChn/shanchuanzhi-agent-canary/discussions)
with the integration target, scope, and preferred contact method. Do not post API
keys, payment receipts, customer data, or unpublished findings.

## Distribution and partner paths

The project is already discoverable through the [official MCP Registry](https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.DorianChn%2Fagent-canary&version=latest)
and [Glama](https://glama.ai/mcp/servers/DorianChn/shanchuanzhi-agent-canary). For a deeper
security-platform integration, the [Snyk Technology Alliance Partner Program](https://snyk.io/partners/tapp/)
is a candidate channel; any application or commercial terms must be reviewed by
the maintainer before submission. We do not mass-post or send unsolicited
promotional messages.

## Non-MCP agents (free V1.2.7 guarded tool router)

Create one guard per agent session, then give it to one router. The router
answers decoys with `guard.runDecoy()` and routes every non-decoy callback
through `guard.executeToolCall()`.

```ts
import {
  CanaryBlockedError,
  createAgentGuard,
  createGuardedToolRouter,
  decoyToolDefs,
} from "agent-canary/sdk";

const guard = createAgentGuard({
  sessionId: "support-chat-42",
  // Exact, reviewed names only. Default is an empty allowlist.
  quarantineAllow: ["read_file", "git_status"],
});
const toolDefs = [...myRealToolSchemas, ...decoyToolDefs("openai")];
const router = createGuardedToolRouter({
  guard,
  executeRealTool: realTool, // host-provided callback
});

await router.dispatch({ name: "git_status", args: {} });              // SAFE: allowed
await router.dispatch({ name: "canary_read_secrets", args: {} });     // trip → quarantine

try {
  await router.dispatch({ name: "http_post", args: { url: "https://example.invalid" } });
} catch (error) {
  if (error instanceof CanaryBlockedError) console.log(error.decision); // action_blocked
}

// Expose this only to a human incident-response control plane, never an LLM tool.
guard.reset({ acknowledgedBy: "on-call-human" });
```

`guard.inspect(agentOutput, "final-answer")` detects a planted token and trips
the same session. `decoyToolDefs("anthropic")` emits Anthropic schemas.

## Dashboard and SIEM

    agent-canary dashboard --out report.html   # self-contained HTML timeline
    agent-canary export --format cef           # or json, csv

## Injection-resistance evaluation

V2 Personal includes a reproducible 20-payload evaluation suite. Use text output
for humans or JSON for CI; provider/API failures fail closed and are never counted
as a successful resistance result:

    agent-canary eval --provider openai --model gpt-4o --format json
    agent-canary eval --provider openai --model deepseek-chat \
      --base-url https://api.deepseek.com/v1 --format json --out eval.json

## Guarantees and limits

- Decoy tools never perform the represented actions. `canary_run_shell` does
  not run commands. Calls maintain Agent Canary's local token/audit state and
  may send configured alerts; see [SECURITY.md](SECURITY.md).
- Canary tokens unlock nothing anywhere.
- No telemetry. Events stay in `~/.agent-canary/events.jsonl` unless you
  configure a webhook.
- Alerts fire when a decoy is called or a registered token is found in inspected
  output/files. Accidental calls and copied fixtures can also produce signals.
- **Containment is integration-scoped.** It can block only real tool calls
  routed through `router.dispatch()` or `guard.executeToolCall()` /
  `guard.beforeToolCall()`. If a compromised agent's first dangerous action
  bypasses these paths, agent-canary cannot intercept that action. Decoys are
  harmless, so touching one lets the guard quarantine the session before a
  later guarded action runs.
- This release does not ship an MCP proxy for arbitrary upstream MCP servers;
  the reviewed next-step design is in [docs/containment.md](docs/containment.md).

Known limit: this is JavaScript, so a determined user can patch `dist/` and
strip the license checks. The signed-license scheme raises the bar against
casual copying; it is not DRM.

## Commands

    serve / init / install / uninstall
    tokens generate|plant|check|list
    watch, events, report, dashboard, export, eval
    self-test
    status, activate, alert-test, set-webhook, set-notify

Run `agent-canary --help` for details.

## Development and governance

- Start with [CONTRIBUTING.md](CONTRIBUTING.md); use the issue and pull request templates for reproducible, sanitized reports.
- Read [SECURITY.md](SECURITY.md) before testing agents or reporting vulnerabilities.
- The proposed maintenance plan is in [ROADMAP.md](ROADMAP.md).
- Current competition experiments and their explicit model/simulation boundaries are in [competition-submission/](competition-submission/README.md).

## License

MIT
# Optional AI analysis and Chinese local console

The competition branch adds advisory-only adapters for OpenAI, Claude, Gemini,
OpenAI-compatible services (DeepSeek/Qwen), Ollama, LM Studio and vLLM.
Ollama was exercised with real local inference; cloud providers have protocol
fixture tests and are **not verified against real vendor accounts**.

```sh
npm ci
npm run build
npm run ai:console
```

Open the printed loopback address, configure an installed model, inspect selected
evidence and request analysis. API keys stay in the host process; cloud inference
requires preview and consent. AI has no Guard reset or execution authority.
Offline containment continues without a model. JSON/Markdown/CSV reports are
available. See [provider documentation](docs/AI_PROVIDERS.md) and
[implementation and evidence](docs/competition/AI_ENHANCEMENT_REPORT.md).

## Optional deterministic risk policy

The SDK now exports createRiskPolicyRouter with OBSERVE / BALANCED / STRICT. Host-owned tool descriptors and parameter checks gate registered callbacks before execution. Human approval is expiring and one-shot; AI advice never grants rights. Normal writes/builds may need approval. See [policy contract and limits](docs/RISK_POLICY.md) and the fourth-round competition report.


## 3.0 engineering candidate

[Evidence and limitations](docs/3.0/FINAL_REPORT.md) · [SDK integration](docs/3.0/DEVELOPER_GUIDE.md) · [Real local-model trials](docs/3.0/REAL_AGENT_EVALUATION.md) · [Agent coverage](docs/3.0/AGENT_COVERAGE_MATRIX.md).

Draft PR #24; only registered gateway callbacks are protected. Verified 2.0 materials remain available.
