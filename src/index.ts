#!/usr/bin/env node
import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { VERSION, loadConfig, saveConfig, defaultConfig, ensureDirs, CONFIG_PATH } from "./config.js";
import { serve } from "./server.js";
import { generateTokens, loadTokens, plantIntoFile, findTokensInText, scanFileStrict } from "./tokens.js";
import { readEvents, sendAlertTest, type CanaryEvent } from "./alerts.js";
import { installServer, uninstallServer, configPathFor, type InstallTarget } from "./install.js";
import { watch } from "./watch.js";
import { EVAL_PAYLOADS, EVAL_SUITE_VERSION } from "./eval/payloads.js";
import { anthropicProvider, ollamaProvider, openaiCompatibleProvider } from "./eval/providers.js";
import { renderMarkdownReport, runEval } from "./eval/runner.js";
import { renderDashboard } from "./dashboard.js";
import { exportCef, exportCsv, exportJson } from "./export.js";
import { DECOY_TOOLS } from "./decoys.js";
import { runSelfTest } from "./self-test.js";
import { validateWebhookUrl } from "./webhook.js";

const program = new Command();
program
  .name("agent-canary")
  .description("Detect AI-agent compromise signals with inert MCP decoys, canary tokens, and guarded tool routing.")
  .version(VERSION);

function eventDetail(ev: CanaryEvent): string {
  if (ev.kind === "decoy_called") return `tool=${ev.toolName ?? ev.tool ?? "?"}`;
  if (ev.kind === "token_found") return `label=${ev.label ?? "?"} path=${ev.path ?? "?"}`;
  if (ev.kind === "session_tripped" || ev.kind === "session_quarantined") {
    return `session=${ev.sessionId ?? "?"} reason=${ev.reason ?? "?"} tool=${ev.toolName ?? "?"} risk=${ev.riskLevel ?? "?"}`;
  }
  if (ev.kind === "action_blocked") {
    return `session=${ev.sessionId ?? "?"} tool=${ev.toolName ?? ev.tool ?? "?"} risk=${ev.riskLevel ?? "?"} reason=${ev.reason ?? "?"}`;
  }
  if (ev.kind === "session_reset") {
    return `session=${ev.sessionId ?? "?"} by=${ev.metadata?.acknowledgedBy ?? "human"}`;
  }
  return ev.note ?? "test";
}

function parseBoundedInteger(value: string, min: number, max: number, label: string): number {
  if (!/^[0-9]+$/.test(value)) throw new Error(label + " must be a whole number.");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(label + " must be between " + min + " and " + max + ".");
  }
  return parsed;
}

function markdownCell(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\|/g, "\\|")
    .replace(/[\r\n]+/g, " ");
}

program
  .command("serve")
  .description("Run the decoy MCP server on stdio (this is what your MCP client launches)")
  .action(() => serve());

program
  .command("init")
  .description("Create ~/.agent-canary and a starter config")
  .action(() => {
    ensureDirs();
    if (!fs.existsSync(CONFIG_PATH)) saveConfig(defaultConfig());
    console.log(`Initialized ${CONFIG_PATH}`);
    console.log(`
Next steps:
  1. agent-canary tokens plant .env.canary --label honeypot
  2. agent-canary install claude     (or: install cursor)
  3. agent-canary alert-test         (verify desktop/webhook alerts)
Optional:
  agent-canary watch .               (alert when a canary token appears in files)
  agent-canary set-webhook https://… (push alerts to Slack/Discord/Telegram bridge)`);
  });

function isInstallTarget(t: string): t is InstallTarget {
  return t === "claude" || t === "cursor";
}

program
  .command("install")
  .argument("<target>", "claude | cursor")
  .description("Register the decoy MCP server in Claude Code or Cursor config (creates a backup first)")
  .action((target: string) => {
    if (!isInstallTarget(target)) {
      console.error(`Unknown target "${target}". Supported: claude, cursor`);
      process.exit(1);
    }
    const { configPath, backupPath } = installServer(target);
    console.log(`Registered agent-canary in ${configPath}`);
    if (backupPath) console.log(`Backup of previous config: ${backupPath}`);
    console.log("Restart your editor/agent to load the decoy tools.");
  });

program
  .command("uninstall")
  .argument("<target>", "claude | cursor")
  .description("Remove the decoy MCP server registration")
  .action((target: string) => {
    if (!isInstallTarget(target)) {
      console.error(`Unknown target "${target}". Supported: claude, cursor`);
      process.exit(1);
    }
    console.log(uninstallServer(target) ? "Removed." : "Nothing to remove.");
  });

const tokens = program.command("tokens").description("Create and manage canary tokens");

tokens
  .command("generate")
  .requiredOption("--label <label>", "What this token watches, e.g. prod-db-dump")
  .option("-c, --count <n>", "How many tokens (1–1000)", (v) => parseBoundedInteger(v, 1, 1000, "count"), 1)
  .action((opts) => {
    const created = generateTokens(opts.label, opts.count);
    for (const t of created) console.log(`${t.token}   # ${t.label}`);
    console.error(`\n${created.length} token(s) saved to registry. Place one anywhere worth watching; scan with: agent-canary tokens check <file>`);
  });

tokens
  .command("list")
  .description("List all tokens in the registry")
  .action(() => {
    const all = loadTokens();
    if (all.length === 0) return console.log("No tokens yet. Try: agent-canary tokens generate --label my-first");
    for (const t of all) {
      const planted = t.planted.length ? ` planted: ${t.planted.map((r) => `${r.path}:${r.line}`).join(", ")}` : "";
      console.log(`${t.token}  ${t.label}${planted}`);
    }
  });

tokens
  .command("plant")
  .argument("<file>", "File to plant tokens into (created as a honeypot file if missing; existing files get a tripwire block appended)")
  .requiredOption("--label <label>")
  .option("-c, --count <n>", "How many tokens (1–1000)", (v) => parseBoundedInteger(v, 1, 1000, "count"), 3)
  .action((file, opts) => {
    const created = plantIntoFile(file, opts.label, opts.count);
    console.log(`Planted ${created.length} canary token(s) into ${fs.existsSync(file) ? fs.realpathSync(file) : file}`);
    console.log("Run `agent-canary watch .` or wire `tokens check` into CI to detect leaks.");
  });

tokens
  .command("check")
  .argument("[paths...]", "Files or directories to scan")
  .option("--stdin", "Scan piped input instead of files")
  .description("Scan files or stdin for leaked canary tokens (exit 1 if found; exit 2 if incomplete or unconfigured)")
  .action(async (paths: string[], opts) => {
    let hits: { label: string; token: string; where: string }[] = [];
    const scanErrors: string[] = [];
    const registeredTokens = loadTokens();
    if (registeredTokens.length === 0) {
      console.error("No canary tokens are registered; run `agent-canary tokens generate --label <label>` first.");
      process.exitCode = 2;
      return;
    }
    if (opts.stdin) {
      if (paths.length > 0) {
        console.error("--stdin cannot be combined with file paths");
        process.exitCode = 2;
        return;
      }
      const text = fs.readFileSync(0, "utf8");
      hits = findTokensInText(text).map((t) => ({ label: t.label, token: t.token, where: "<stdin>" }));
    } else {
      const files: string[] = [];
      const ignoredDirectories = new Set([".git", ".hg", ".svn", "node_modules"]);
      const walkDir = (dir: string) => {
        let entries: fs.Dirent[] = [];
        try {
          entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch (error) {
          scanErrors.push(`${dir}: ${error instanceof Error ? error.message : String(error)}`);
          return;
        }
        for (const e of entries) {
          if (e.isDirectory() && ignoredDirectories.has(e.name)) continue;
          const p = path.join(dir, e.name);
          if (e.isDirectory()) walkDir(p);
          else if (e.isFile()) files.push(p);
        }
      };
      for (const p of paths.length ? paths : ["."]) {
        try {
          const stat = fs.statSync(p);
          if (stat.isDirectory()) walkDir(p);
          else if (stat.isFile()) files.push(p);
          else scanErrors.push(`${p}: not a regular file or directory`);
        } catch (error) {
          scanErrors.push(`${p}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      for (const f of files) {
        try {
          for (const t of scanFileStrict(f, registeredTokens)) hits.push({ label: t.label, token: t.token, where: f });
        } catch (error) {
          scanErrors.push(`${f}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      console.log(`Scanned ${files.length} file(s); skipped .git, .hg, .svn, and node_modules.`);
      if (scanErrors.length > 0) {
        for (const scanError of scanErrors) console.error(`SCAN ERROR  ${scanError}`);
        console.error("Scan incomplete; resolve these errors before treating the result as clean.");
      }
    }
    for (const h of hits) console.log(`LEAK  ${h.label}  in ${h.where}`);
    if (hits.length === 0 && scanErrors.length === 0) console.log("clean: no canary tokens found");
    if (hits.length > 0) process.exitCode = 1;
    else if (!opts.stdin && scanErrors.length > 0) process.exitCode = 2;
  });

program
  .command("watch")
  .argument("<paths...>", "Directories to watch for canary token leaks")
  .option("--poll-interval <ms>", "Safety-scan interval in milliseconds (500–60000; default 2000)", (v) => parseBoundedInteger(v, 500, 60_000, "poll interval"), 2_000)
  .description("Watch directories and alert on canary token leaks (event driven with a polling safety scan)")
  .action((paths: string[], opts) => watch(paths, { pollIntervalMs: opts.pollInterval }));

program
  .command("events")
  .option("-n, --tail <n>", "Number of events (1–100000)", (v) => parseBoundedInteger(v, 1, 100000, "tail"), 20)
  .description("Show recent tripwire events")
  .action((opts) => {
    const events = readEvents(undefined, opts.tail);
    if (events.length === 0) return console.log("No events yet. That is good news.");
    for (const ev of events.reverse()) {
      console.log(`${ev.ts}  ${ev.kind.padEnd(20)}  ${eventDetail(ev)}`);
    }
  });

program
  .command("report")
  .description("Print a markdown incident report of all events")
  .action(() => {
    const events = readEvents(undefined, 10_000);
    const counts: Record<string, number> = {};
    for (const ev of events) counts[ev.kind] = (counts[ev.kind] ?? 0) + 1;
    console.log(`# Agent Canary — Incident Report
Generated: ${new Date().toISOString()}

## Summary
${Object.entries(counts)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([kind, count]) => `- ${kind}: ${count}`)
  .join("\n") || "- No events"}

## Events
| time | kind | detail |
|---|---|---|
${events
  .map((ev: CanaryEvent) => {
    return "| " + markdownCell(ev.ts) + " | " + markdownCell(ev.kind) + " | " + markdownCell(eventDetail(ev)) + " |";
  })
  .join("\n")}
`);
  });

program
  .command("alert-test")
  .description("Send a test alert through every configured channel")
  .action(async () => {
    const ev: CanaryEvent = { ts: new Date().toISOString(), kind: "test", note: "manual test from alert-test" };
    const cfg = loadConfig();
    const status = await sendAlertTest(ev, cfg);
    console.log("Test alert delivery:");
    console.log(`  - Event log: ${status.eventLog}`);
    console.log(`  - Desktop notification: ${status.desktop}`);
    console.log(`  - Webhook: ${status.webhook}`);
  });

program
  .command("self-test")
  .option("--json", "Print the result as JSON for CI")
  .description("Verify the local circuit breaker without touching your config, tokens, events, or network")
  .action(async (opts) => {
    const result = await runSelfTest();
    if (opts.json) {
      console.log(JSON.stringify(result));
    } else {
      console.log("agent-canary containment self-test");
      for (const check of result.checks) console.log(`  ${check.passed ? "✓" : "✗"} ${check.name}`);
      console.log(result.passed ? "Containment path verified; no user state was changed." : "Self-test failed; do not rely on containment until resolved.");
    }
    if (!result.passed) process.exitCode = 1;
  });

program
  .command("set-webhook")
  .argument("<url|null>", "HTTPS URL to receive alert JSON (Slack/Discord/Telegram bridge), or 'null' to clear")
  .description("Configure the alert webhook")
  .action((url: string) => {
    const cfg = loadConfig();
    if (url.trim() === "null") {
      cfg.webhook = null;
      saveConfig(cfg);
      console.log("Webhook cleared.");
      return;
    }
    try {
      cfg.webhook = validateWebhookUrl(url);
    } catch (error) {
      console.error(`Invalid webhook URL: ${(error as Error).message}`);
      process.exitCode = 1;
      return;
    }
    saveConfig(cfg);
    console.log("Webhook configured.");
  });

program
  .command("set-notify")
  .argument("<on|off>")
  .description("Enable or disable desktop notifications")
  .action((v: string) => {
    if (v !== "on" && v !== "off") {
      console.error("value must be exactly: on | off");
      process.exitCode = 1;
      return;
    }
    const cfg = loadConfig();
    cfg.notify = v === "on";
    saveConfig(cfg);
    console.log(`Desktop notifications ${cfg.notify ? "enabled" : "disabled"}.`);
  });

program
  .command("eval")
  .description("Run the prompt-injection resistance suite against a model")
  .requiredOption("--provider <name>", "openai | anthropic | ollama (local Ollama)")
  .requiredOption("--model <model>", "Model identifier, e.g. gpt-4o, claude-sonnet-4-5, qwen3")
  .option("--base-url <url>", "OpenAI-compatible base URL (Ollama defaults to http://localhost:11434/v1)")
  .option("--key <key>", "API key (defaults to OPENAI_API_KEY / ANTHROPIC_API_KEY; not needed for Ollama)")
  .option("--allow-insecure-http", "Allow a non-loopback OpenAI-compatible endpoint over plain HTTP")
  .option("--timeout <ms>", "Timeout per provider request (1000–600000)", (v) => parseBoundedInteger(v, 1000, 600000, "timeout"), 120000)
  .option("--max-turns <n>", "Maximum tool-call turns per payload (1–10)", (v) => parseBoundedInteger(v, 1, 10, "max-turns"), 3)
  .option("--format <format>", "text | json", "text")
  .option("--out <file>", "Write the selected text or JSON report to this file")
  .action(async (opts) => {
    let provider;
    if (opts.provider === "openai") {
      const key = opts.key ?? process.env.OPENAI_API_KEY;
      if (!key) {
        console.error("Missing API key: pass --key or set OPENAI_API_KEY");
        process.exitCode = 1;
        return;
      }
      if (opts.allowInsecureHttp && !opts.baseUrl?.startsWith("http://")) {
        console.error("--allow-insecure-http is only relevant to an http:// OpenAI-compatible base URL");
        process.exitCode = 1;
        return;
      }
      provider = openaiCompatibleProvider(opts.baseUrl ?? "https://api.openai.com/v1", key, {
        timeoutMs: opts.timeout,
        allowInsecureHttp: opts.allowInsecureHttp,
      });
    } else if (opts.provider === "anthropic") {
      const key = opts.key ?? process.env.ANTHROPIC_API_KEY;
      if (!key) {
        console.error("Missing API key: pass --key or set ANTHROPIC_API_KEY");
        process.exitCode = 1;
        return;
      }
      if (opts.allowInsecureHttp || opts.baseUrl) {
        console.error("--base-url and --allow-insecure-http apply only to the openai provider");
        process.exitCode = 1;
        return;
      }
      provider = anthropicProvider(key, { timeoutMs: opts.timeout });
    } else if (opts.provider === "ollama") {
      if (opts.key || opts.allowInsecureHttp) {
        console.error("Ollama is local and does not use --key or --allow-insecure-http");
        process.exitCode = 1;
        return;
      }
      provider = ollamaProvider(opts.baseUrl ?? "http://localhost:11434/v1", { timeoutMs: opts.timeout });
    } else {
      console.error("provider must be: openai | anthropic | ollama");
      process.exitCode = 1;
      return;
    }

    if (opts.format !== "text" && opts.format !== "json") {
      console.error("format must be: text | json");
      process.exitCode = 1;
      return;
    }
    if (opts.format === "text") {
      console.log(
        `agent-canary eval · suite ${EVAL_SUITE_VERSION} · ${EVAL_PAYLOADS.length} payloads · model ${opts.model}`
      );
    }
    const report = await runEval(provider, opts.model, {
      maxTurns: opts.maxTurns,
      onProgress: opts.format === "text" ? (line) => console.log("  " + line) : undefined,
    });

    if (opts.out) {
      const content = opts.format === "json" ? JSON.stringify(report, null, 2) + "\n" : renderMarkdownReport(report);
      fs.writeFileSync(opts.out, content);
      if (opts.format === "text") console.log(`\n${opts.format === "json" ? "JSON" : "Markdown"} report written to ${opts.out}`);
    }
    if (opts.format === "json") {
      if (!opts.out) console.log(JSON.stringify(report, null, 2));
    } else {
      for (const [cat, v] of Object.entries(report.byCategory)) {
        console.log(`  ${cat.padEnd(20)} ${v.passed}/${v.total} resisted`);
      }
      const providerErrors = report.results.filter((result) => result.error).length;
      if (providerErrors) console.log(`  provider errors      ${providerErrors} (counted as not resisted)`);
      console.log(`\nSCORE: ${report.score}/100 (${report.passed}/${report.total} payloads resisted)`);
    }
    process.exitCode = report.score === 100 ? 0 : 2;
  });

program
  .command("dashboard")
  .description("Generate a self-contained HTML attack-chain dashboard from the event log")
  .option("--out <file>", "Output file", "agent-canary-dashboard.html")
  .option("--open", "Open in the default browser after generating")
  .action(async (opts) => {
    const events = readEvents(undefined, 1_000_000);
    const html = renderDashboard(events, { generatedAt: new Date().toISOString(), version: VERSION });
    fs.writeFileSync(opts.out, html);
    console.log(`Dashboard written: ${path.resolve(opts.out)} (${events.length} events)`);
    if (opts.open) {
      const opener =
        process.platform === "win32"
          ? ["cmd", ["/c", "start", "", path.resolve(opts.out)]]
          : process.platform === "darwin"
            ? ["open", [path.resolve(opts.out)]]
            : ["xdg-open", [path.resolve(opts.out)]];
      spawn(opener[0] as string, opener[1] as string[], { detached: true, stdio: "ignore" }).unref();
    }
  });

program
  .command("export")
  .description("Export events for SIEM ingestion (CEF / JSON / CSV)")
  .option("--format <fmt>", "cef | json | csv", "cef")
  .option("--out <file>", "Output file (defaults to stdout)")
  .action(async (opts) => {
    if (!["cef", "json", "csv"].includes(opts.format)) {
      console.error("format must be: cef | json | csv");
      process.exitCode = 1;
      return;
    }
    const events = readEvents(undefined, 1_000_000);
    const out =
      opts.format === "json" ? exportJson(events) : opts.format === "csv" ? exportCsv(events) : exportCef(events);
    if (opts.out) {
      fs.writeFileSync(opts.out, out);
      console.log(`Exported ${events.length} events (${opts.format}) to ${path.resolve(opts.out)}`);
    } else {
      process.stdout.write(out);
    }
  });

program
  .command("activate")
  .description("Legacy compatibility command; all features now work without activation")
  .option("--handle <handle>", "Legacy option; ignored")
  .option("--server <url>", "Legacy option; ignored")
  .action(() => {
    console.log("Agent Canary 2.x 无需许可证或激活；全部功能免费，适用时可离线运行。");
    console.log("此兼容命令没有联网。不要提交旧版激活码或付款信息。");
  });

program
  .command("status")
  .description("Show feature availability, decoy and event summary")
  .action(() => {
    const cfg = loadConfig();
    const tokens = loadTokens();
    const events = readEvents(undefined, 1_000_000);
    const real = events.filter((e) => e.kind !== "test").length;
    console.log(`agent-canary v${VERSION}（MIT；全部功能免费开放）`);
    console.log(`  诱饵工具    ${DECOY_TOOLS.length} 个已注册`);
    console.log(`  金丝雀令牌  ${tokens.length} 个（${tokens.filter((t) => t.planted.length).length} 个已埋放）`);
    console.log(`  事件        ${events.length} 条（${real} 条真实告警）`);
    console.log(`  事件日志    ${cfg.eventsFile}`);
  });

program
  .command("doctor")
  .description("Check local configuration and storage without contacting a license or payment service")
  .action(() => {
    const cfg = loadConfig();
    const tokens = loadTokens();
    const events = readEvents(undefined, 100_000);
    let failed = false;
    const ok = (message: string) => console.log("  ✓ " + message);
    const bad = (message: string) => {
      failed = true;
      console.log("  ✗ " + message);
    };
    const info = (message: string) => console.log("  · " + message);

    console.log("agent-canary doctor v" + VERSION + " — all features free; no activation required");
    const nodeMajor = Number(process.versions.node.split(".")[0]);
    if (Number.isInteger(nodeMajor) && nodeMajor >= 20) ok("Node.js " + process.versions.node);
    else bad("Node.js 20 or newer is required (found " + process.versions.node + ")");

    const stateDir = path.dirname(CONFIG_PATH);
    try {
      fs.accessSync(stateDir, fs.constants.R_OK | fs.constants.W_OK);
      ok("state directory is readable and writable");
    } catch {
      bad("state directory is not readable and writable: " + stateDir);
    }

    if (fs.existsSync(CONFIG_PATH)) {
      try {
        const parsed: unknown = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
        if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) ok("config JSON is readable");
        else bad("config must contain a JSON object");
      } catch {
        bad("config JSON is invalid: " + CONFIG_PATH);
      }
    } else {
      info("config has not been created; run agent-canary init to save defaults");
    }

    const eventsDir = path.dirname(path.resolve(cfg.eventsFile));
    if (fs.existsSync(eventsDir)) {
      try {
        fs.accessSync(eventsDir, fs.constants.R_OK | fs.constants.W_OK);
        ok("event-log directory is readable and writable");
      } catch {
        bad("event-log directory is not readable and writable: " + eventsDir);
      }
    } else {
      info("event-log directory will be created when the first event is written");
    }

    if (cfg.webhook === null) {
      info("webhook is not configured");
    } else if (typeof cfg.webhook === "string") {
      try {
        validateWebhookUrl(cfg.webhook);
        ok("webhook URL format is valid (destination not contacted)");
      } catch {
        bad("webhook URL is invalid; update it with agent-canary set-webhook");
      }
    } else {
      bad("webhook must be a URL string or null");
    }

    info(DECOY_TOOLS.length + " inert decoy tools · " + tokens.length + " canary tokens · " + events.length + " recent events");
    info("eval, dashboard, export, SDK, and containment features are included; doctor performs no network requests");
    if (failed) process.exitCode = 1;
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error("error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
