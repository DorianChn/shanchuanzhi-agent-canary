import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const home = fs.mkdtempSync(path.join(os.tmpdir(), "agent-canary-demo-"));

try {
  const { CanaryBlockedError, createAgentGuard, createGuardedToolRouter } = await import("../dist/sdk.js");
  const eventsFile = path.join(home, "events.jsonl");
  const realCallbacks = [];
  const guard = createAgentGuard({ sessionId: "competition-demo", eventsFile, alert: false });
  const router = createGuardedToolRouter({
    guard,
    executeRealTool: (call) => {
      realCallbacks.push(call.name);
      return { simulated: true, tool: call.name };
    },
  });

  const safe = await router.dispatch({ name: "git_status" });
  const decoy = await router.dispatch({ name: "canary_read_secrets" });
  assert.match(String(decoy.content?.[0]?.text ?? ""), /cnry_/);

  let blocked = false;
  try {
    await router.dispatch({ name: "http_post", args: { body: "synthetic-only" } });
  } catch (error) {
    if (!(error instanceof CanaryBlockedError)) throw error;
    blocked = true;
  }

  const events = fs.readFileSync(eventsFile, "utf8").trim().split("\n").map((line) => JSON.parse(line));
  const eventKinds = events.map((event) => event.kind);
  assert.deepEqual(realCallbacks, ["git_status"]);
  assert.equal(blocked, true);
  for (const kind of ["session_tripped", "session_quarantined", "action_blocked"]) {
    assert.ok(eventKinds.includes(kind), `missing ${kind} event`);
  }

  console.log(JSON.stringify({
    demo: "synthetic SDK containment",
    safeToolCallback: safe,
    decoyTool: "canary_read_secrets",
    finalGuardState: guard.state,
    blockedDangerousCallback: blocked,
    realCallbacksRun: realCallbacks,
    auditEvents: eventKinds,
    effects: "No shell, network, file deletion, credentials, or payment was used.",
  }, null, 2));
} finally {
  fs.rmSync(home, { recursive: true, force: true });
}
