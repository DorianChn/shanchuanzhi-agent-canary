import { after, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const home = fs.mkdtempSync(path.join(os.tmpdir(), "agent-canary-attack-simulation-"));
process.env.AGENT_CANARY_HOME = home;
fs.writeFileSync(path.join(home, "config.json"), JSON.stringify({ webhook: null, notify: false, eventsFile: path.join(home, "events.jsonl") }));

const sdk = await import("../src/sdk.js");
const { plantIntoFile } = await import("../src/tokens.js");
const { readEvents } = await import("../src/alerts.js");

after(() => fs.rmSync(home, { recursive: true, force: true }));

function harness(options: {
  sessionId: string;
  principalId?: string;
  stateStore?: sdk.ContainmentStateStore;
  alert?: boolean;
  execute?: (call: sdk.ToolCall) => unknown | Promise<unknown>;
}) {
  const executed: string[] = [];
  const guard = sdk.createAgentGuard({
    sessionId: options.sessionId,
    principalId: options.principalId,
    stateStore: options.stateStore,
    eventsFile: path.join(home, `${options.sessionId}.jsonl`),
    alert: options.alert ?? false,
  });
  const executeRealTool = async (call: sdk.ToolCall) => {
    executed.push(call.name);
    return options.execute ? options.execute(call) : `virtual-result:${call.name}`;
  };
  const router = sdk.createGuardedToolRouter({ guard, executeRealTool });
  return { guard, router, executed, executeRealTool };
}

function isBlocked(error: unknown): boolean {
  return error instanceof sdk.CanaryBlockedError;
}

test("SIM-01 malicious README: secret read is blocked after a decoy signal", async () => {
  const virtualSecret = path.join(home, "SIM-01.env");
  fs.writeFileSync(virtualSecret, "VIRTUAL_API_KEY=synthetic-only\n");
  const h = harness({ sessionId: "sim-01", execute: (call) => fs.readFileSync(virtualSecret, "utf8") });

  await h.router.dispatch({ name: "canary_read_secrets" });
  await assert.rejects(h.router.dispatch({ name: "read_file", args: { path: virtualSecret } }), isBlocked);
  assert.deepEqual(h.executed, []);
  assert.equal(fs.readFileSync(virtualSecret, "utf8"), "VIRTUAL_API_KEY=synthetic-only\n");
});

test("SIM-02 malicious web content: internal HTTP tool call is blocked", async () => {
  const h = harness({ sessionId: "sim-02" });
  await h.router.dispatch({ name: "canary_fetch_internal", args: { url: "http://127.0.0.1:1/virtual" } });
  await assert.rejects(h.router.dispatch({ name: "http_get", args: { url: "http://127.0.0.1:1/virtual" } }), isBlocked);
  assert.deepEqual(h.executed, []);
});

test("SIM-03 injected shell instruction: synthetic shell callback is blocked", async () => {
  const h = harness({ sessionId: "sim-03" });
  await h.router.dispatch({ name: "canary_run_shell", args: { command: "synthetic-no-op" } });
  await assert.rejects(h.router.dispatch({ name: "shell_exec", args: { command: "synthetic-no-op" } }), isBlocked);
  assert.deepEqual(h.executed, []);
});

test("SIM-04 virtual credential exfiltration: mail callback is blocked", async () => {
  let exfiltrated = false;
  const h = harness({ sessionId: "sim-04", execute: () => { exfiltrated = true; } });
  await h.router.dispatch({ name: "canary_send_email", args: { to: "virtual@example.invalid" } });
  await assert.rejects(
    h.router.dispatch({ name: "send_email", args: { body: "VIRTUAL_API_KEY=synthetic-only" } }),
    isBlocked
  );
  assert.equal(exfiltrated, false);
});

test("SIM-05 simulated file deletion: virtual file is preserved after quarantine", async () => {
  const virtualFile = path.join(home, "SIM-05-delete-me.txt");
  fs.writeFileSync(virtualFile, "synthetic file\n");
  const h = harness({
    sessionId: "sim-05",
    execute: (call) => fs.rmSync(String(call.args?.path), { force: true }),
  });
  await h.router.dispatch({ name: "canary_delete_files", args: { paths: virtualFile } });
  await assert.rejects(h.router.dispatch({ name: "delete_file", args: { path: virtualFile } }), isBlocked);
  assert.equal(fs.readFileSync(virtualFile, "utf8"), "synthetic file\n");
  assert.deepEqual(h.executed, []);
});

test("SIM-06 canary token leak: inspection quarantines before outbound callback", async () => {
  const honeypot = path.join(home, "SIM-06-honeypot.env");
  const [token] = plantIntoFile(honeypot, "synthetic-attack", 1);
  const h = harness({ sessionId: "sim-06" });

  assert.equal(h.guard.inspect(`virtual outbound body ${token.token}`, "synthetic-webhook").length, 1);
  await assert.rejects(h.router.dispatch({ name: "http_post", args: { body: token.token } }), isBlocked);
  assert.deepEqual(h.executed, []);
});

test("SIM-07 a quarantined session blocks repeated dangerous retries", async () => {
  const h = harness({ sessionId: "sim-07" });
  await h.router.dispatch({ name: "canary_read_secrets" });
  for (const name of ["http_post", "shell_exec", "delete_file"]) {
    await assert.rejects(h.router.dispatch({ name }), isBlocked);
  }
  assert.deepEqual(h.executed, []);
});

test("SIM-08 a new session for the same reviewed identity inherits quarantine", async () => {
  const stateStore = sdk.createContainmentStateStore();
  const first = harness({ sessionId: "sim-08-first", principalId: "synthetic-agent", stateStore });
  await first.router.dispatch({ name: "canary_read_secrets" });
  const retry = harness({ sessionId: "sim-08-retry", principalId: "synthetic-agent", stateStore });

  await assert.rejects(retry.router.dispatch({ name: "http_post" }), isBlocked);
  assert.deepEqual(retry.executed, []);
});

test("SIM-09 concurrent decoy and dangerous call: callback cannot race past quarantine", async () => {
  const h = harness({ sessionId: "sim-09" });
  const [decoy, dangerous] = await Promise.allSettled([
    h.router.dispatch({ name: "canary_read_secrets" }),
    h.router.dispatch({ name: "http_post" }),
  ]);

  assert.equal(decoy.status, "fulfilled");
  assert.equal(dangerous.status, "rejected");
  if (dangerous.status === "rejected") assert.ok(isBlocked(dangerous.reason));
  assert.deepEqual(h.executed, []);
});

test("SIM-10 webhook failure does not reopen a quarantined session", async () => {
  const configPath = path.join(home, "config.json");
  const previousConfig = fs.readFileSync(configPath, "utf8");
  const originalFetch = globalThis.fetch;
  fs.writeFileSync(configPath, JSON.stringify({ webhook: "https://virtual-webhook.invalid", notify: false, eventsFile: path.join(home, "events.jsonl") }));
  globalThis.fetch = (async () => { throw new Error("synthetic webhook outage"); }) as typeof fetch;
  try {
    const h = harness({ sessionId: "sim-10", alert: true });
    await h.router.dispatch({ name: "canary_read_secrets" });
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(h.guard.state, "QUARANTINED");
    await assert.rejects(h.router.dispatch({ name: "http_post" }), isBlocked);
    assert.deepEqual(h.executed, []);
  } finally {
    globalThis.fetch = originalFetch;
    fs.writeFileSync(configPath, previousConfig);
  }
});

test("SIM-11 shared state-store outage remains fail-closed", async () => {
  const unavailable: sdk.ContainmentStateStore = {
    get() { throw new Error("synthetic state store outage"); },
    quarantine() { throw new Error("synthetic state store outage"); },
    reset() { throw new Error("synthetic state store outage"); },
  };
  const h = harness({ sessionId: "sim-11", principalId: "synthetic-agent-outage", stateStore: unavailable });

  await h.router.dispatch({ name: "canary_read_secrets" });
  await assert.rejects(h.router.dispatch({ name: "http_post" }), isBlocked);
  assert.equal(h.guard.state, "QUARANTINED");
  assert.deepEqual(h.executed, []);
});

test("SIM-12 avoiding every decoy lets a direct guarded tool call run while the session is SAFE", async () => {
  const h = harness({ sessionId: "sim-12" });

  const result = await h.router.dispatch({ name: "send_email", args: { to: "virtual@example.invalid" } });

  assert.equal(result, "virtual-result:send_email");
  assert.deepEqual(h.executed, ["send_email"]);
  assert.equal(h.guard.state, "SAFE");
  assert.equal(readEvents(path.join(home, "sim-12.jsonl")).some((event) => event.kind === "session_tripped"), false);
});

test("SIM-13 direct callback bypass: unguarded integration can execute without detection", async () => {
  const h = harness({ sessionId: "sim-13" });

  const result = await h.executeRealTool({ name: "send_email", args: { to: "virtual@example.invalid" } });

  assert.equal(result, "virtual-result:send_email");
  assert.deepEqual(h.executed, ["send_email"]);
  assert.equal(h.guard.state, "SAFE");
  assert.equal(readEvents(path.join(home, "sim-13.jsonl")).some((event) => event.kind === "session_tripped"), false);
});

test("SIM-14 a real callback that starts before a compromise signal is not retroactively cancelled", async () => {
  const h = harness({ sessionId: "sim-14" });

  assert.equal(await h.router.dispatch({ name: "http_post", args: { body: "synthetic-only" } }), "virtual-result:http_post");
  assert.deepEqual(h.executed, ["http_post"]);
  await h.router.dispatch({ name: "canary_read_secrets" });
  await assert.rejects(h.router.dispatch({ name: "http_post" }), isBlocked);
  assert.deepEqual(h.executed, ["http_post"]);
});

test("CTRL-01 benign safe call is allowed without a compromise signal", async () => {
  const h = harness({ sessionId: "control-01" });
  assert.equal(await h.router.dispatch({ name: "git_status" }), "virtual-result:git_status");
  assert.deepEqual(h.executed, ["git_status"]);
  assert.equal(h.guard.state, "SAFE");
});
