# Agent Canary

Auditable compromise signals and guarded-action containment for AI agents. Agent Canary exposes inert MCP decoys, plants unique canary tokens, and provides an SDK session circuit breaker to quarantine later tool calls that pass through its guard.

**All features are free and open source under MIT from version 2.0.0.** The evaluation suite, attack-chain dashboard, SIEM exports, SDK and containment features require no purchase, account, activation code or license server. Node.js 20+. No telemetry.

[中文文档](README.zh-CN.md)

[Project site](https://dorianchn.github.io/shanchuanzhi-agent-canary/) · [GitHub](https://github.com/DorianChn/shanchuanzhi-agent-canary) · [GitHub Discussions](https://github.com/DorianChn/shanchuanzhi-agent-canary/discussions) · [Glama](https://glama.ai/mcp/servers/DorianChn/shanchuanzhi-agent-canary)

![Agent Canary — AI agent and MCP security](docs/agent-canary-cover-v2.png)

## Quick start

Requires Node.js 20 or newer. Clone and build the source:

    git clone https://github.com/DorianChn/shanchuanzhi-agent-canary
    cd shanchuanzhi-agent-canary
    npm ci
    npm run build
    npm link

Initialize the local state and run the offline containment check:

    agent-canary init
    agent-canary self-test

Plant a honeypot and register the MCP server:

    agent-canary tokens plant .env.canary --label my-project
    agent-canary install claude

For Cursor, use agent-canary install cursor. Restart the client to load twelve decoy tools that return synthetic data. Agent Canary does not execute real tools for the MCP client or transparently proxy existing MCP servers.

## What it does

| Feature | Purpose |
|---|---|
| MCP decoys | Simulate high-risk tools. Handlers return synthetic data and do not execute real file, shell, credential or business actions; configured alert channels may send redacted event metadata. |
| Canary tokens | Plant unique, powerless values in honeypots and scan for exact registered values. |
| SDK circuit breaker | Quarantine a session after a signal and reject later calls that pass through its guard/router. |
| Injection evaluation | Run a versioned 20-payload suite and record decoy calls or echoed trace tokens. |
| HTML dashboard | Render a standalone, offline-readable timeline from the local event log. |
| SIEM export | Write CEF, JSONL or spreadsheet-oriented CSV. |
| Local alerts and audit | Store redacted events locally; optionally send desktop notifications and HTTPS webhooks. |

## Detection and containment flow

```text
Untrusted content → agent touches a decoy / emits a registered token
                                 ↓
                       compromise signal recorded
                                 ↓
                later guarded tool calls are rejected
                                 ↓
                        audit log and alert
```

A decoy is a detection signal; it cannot stop a real action that bypasses the guard before the signal occurs. SDK integrations must route every real tool execution through the same session guard or createGuardedToolRouter(). See [docs/containment.md](docs/containment.md).

## Common commands

    agent-canary tokens plant .env.canary --label my-project
    agent-canary install claude
    agent-canary alert-test
    agent-canary events
    agent-canary dashboard --out report.html --open
    agent-canary export --format cef --out events.cef
    agent-canary export --format json --out events.jsonl
    agent-canary export --format csv --out events.csv
    agent-canary doctor

Use tokens check locally or in CI:

    agent-canary tokens check .
    git diff --cached | agent-canary tokens check --stdin

No paths means scan the current directory. Hidden files and directories are included; `.git`, `.hg`, `.svn`, and `node_modules` are skipped. Files are scanned incrementally, including files larger than 5 MiB. Exit code 1 means a registered token was found; exit code 2 means the scan was incomplete or no tokens are registered.

## Run the injection evaluation for free

### Local Ollama (no model API key)

Install and start Ollama, pull a model with tool-calling support, then run:

    ollama pull qwen3
    agent-canary eval --provider ollama --model qwen3 --format json --out eval.json

Requests go to localhost:11434. Model storage and inference use your own machine; the software is free and does not upload local evaluation results.

### Cloud models or compatible endpoints

    agent-canary eval --provider openai --model gpt-4o --format json --out eval.json
    agent-canary eval --provider anthropic --model claude-sonnet-4-5
    agent-canary eval --provider openai --model deepseek-chat       --base-url https://api.deepseek.com/v1 --format json --out deepseek.json

Pass OpenAI or Anthropic keys with --key, or set OPENAI_API_KEY / ANTHROPIC_API_KEY. Model providers may charge for API use; local Ollama avoids cloud API charges. Requests have a timeout. Custom remote endpoints require HTTPS unless --allow-insecure-http is explicitly provided. Do not put API keys in committed command logs or configuration files.

The score describes only these 20 payloads for the selected model, settings and date. Provider errors, truncated responses and malformed responses count as not resisted and are labeled as errors; they are not described as proof that the model was compromised. This small regression suite is not a security certification and cannot prove resistance to every attack.

## SDK: route real tools through one guard

Create one guard per agent session. Expose reset() only to a human-controlled incident-response surface, never as a model-callable tool.

To use the SDK from another Node.js project, clone and build this repository, run `npm link` in its directory, then run `npm link @dorianchn/agent-canary` in the consuming project.

```ts
import {
  CanaryBlockedError,
  createAgentGuard,
  createGuardedToolRouter,
  decoyToolDefs,
} from "@dorianchn/agent-canary/sdk";

const guard = createAgentGuard({
  sessionId: "support-chat-42",
  quarantineAllow: ["read_file", "git_status"],
});

const router = createGuardedToolRouter({
  guard,
  executeRealTool: realToolCallback,
});

await router.dispatch({ name: "git_status", args: {} });
await router.dispatch({ name: "canary_read_secrets", args: {} });

try {
  await router.dispatch({ name: "http_post", args: { url: "https://example.invalid" } });
} catch (error) {
  if (error instanceof CanaryBlockedError) console.log(error.decision);
}

// Provide these schemas alongside your real-tool schemas.
const tools = [...myRealToolSchemas, ...decoyToolDefs("openai")];
```

Use createTokenGuard() to inspect agent output, tool arguments or tool results for registered token values. The host must connect every real tool callback to the same guard; calls outside that path cannot be blocked. See the containment document for shared-identity quarantine and the optional credentialRevoker hook.

## Reports and data boundaries

- Default state directory: ~/.agent-canary/; override it with AGENT_CANARY_HOME.
- Event logs and webhook payloads omit tool arguments and redact tokens and sensitive fields. Do not place secrets in custom event metadata.
- Webhooks require HTTPS by default; HTTP is allowed only for loopback development. doctor validates the URL format without contacting it.
- The dashboard is standalone HTML with no CDN or third-party scripts. Event content is escaped before rendering.
- Evaluation uses synthetic decoy replies. It does not emit production decoy alerts, modify the local token registry or append to the user's event log.
- Containment only covers integrated SDK call paths. Agent Canary does not proxy arbitrary upstream MCP servers.
- A decoy call or a registered token found outside its planted file deserves review; by itself, it does not prove real data was stolen.

## Contributing

Reproducible bug reports, documentation improvements and scoped feature proposals are welcome. Do not post API keys, payment records, customer data or unpublished vulnerabilities in public issues or discussions. Follow [SECURITY.md](SECURITY.md) for security reports.

The former payment and licensing flow is retired. Agent Canary 2.x does not require activation; the legacy activate command remains for compatibility and makes no network request. The old payment service under sponsor/ is historical code, not an installation or unlock step.

## License

MIT
