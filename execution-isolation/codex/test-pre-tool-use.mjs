import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const hook = path.join(here, "pre-tool-use.mjs");
const command =
  "Set-Content -LiteralPath 'M2-SYNTHETIC-PROTECTED-SENTINEL' -Value 'CHANGED'";
const event = {
  hook_event_name: "PreToolUse",
  tool_name: "Bash",
  session_id: "test-session",
  tool_use_id: "test-call",
  cwd: process.cwd(),
  tool_input: { command },
};

const output = JSON.parse(
  execFileSync(process.execPath, [hook], {
    input: JSON.stringify(event),
    encoding: "utf8",
  }),
);
assert.equal(output.hookSpecificOutput.permissionDecision, "deny");
assert.match(output.systemMessage, /UNPROTECTED_NATIVE_SHELL/);
assert.equal(output.hookSpecificOutput.hookEventName, "PreToolUse");
assert.equal(output.hookSpecificOutput.permissionDecisionReason.includes("M2"), true);
assert.match(output.hookSpecificOutput.additionalContext, /boundary_status=UNPROTECTED/);
assert.match(
  output.hookSpecificOutput.additionalContext,
  /native_shell_acceptance=BLOCKED_NOT_VERIFIED/,
);

for (const malformedEvent of [
  "null",
  "[]",
  JSON.stringify({ tool_name: "Write" }),
  JSON.stringify({ hook_event_name: "SessionStart", tool_name: "Write" }),
  JSON.stringify({ tool_name: "Bash", tool_input: { command } }),
  JSON.stringify({ hook_event_name: "PreToolUse", tool_input: { command } }),
  JSON.stringify({
    hook_event_name: "PreToolUse",
    tool_name: "Bash",
    tool_input: null,
  }),
]) {
  const malformedShapeOutput = JSON.parse(
    execFileSync(process.execPath, [hook], {
      input: malformedEvent,
      encoding: "utf8",
    }),
  );
  assert.equal(malformedShapeOutput.hookSpecificOutput.permissionDecision, "deny");
  assert.match(malformedShapeOutput.systemMessage, /could not be fully validated/);
}

const logDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-canary-hook-test-"));
const logPath = path.join(logDir, "alerts.jsonl");
try {
  const loggedOutput = JSON.parse(
    execFileSync(process.execPath, [hook], {
      input: JSON.stringify(event),
      encoding: "utf8",
      env: { ...process.env, AGENT_CANARY_ALERT_LOG: logPath },
    }),
  );
  assert.match(loggedOutput.hookSpecificOutput.additionalContext, /local_alert_log=WRITTEN/);
  const record = JSON.parse(fs.readFileSync(logPath, "utf8").trim());
  assert.equal(record.alert, "UNPROTECTED_NATIVE_SHELL");
  assert.equal(record.decision, "deny");
  assert.equal(
    record.commandSha256,
    crypto.createHash("sha256").update(command).digest("hex"),
  );
  assert.equal(JSON.stringify(record).includes(command), false);

  const blockerPath = path.join(logDir, "not-a-directory");
  fs.writeFileSync(blockerPath, "synthetic file blocks log-directory creation");
  const failedLogOutput = JSON.parse(
    execFileSync(process.execPath, [hook], {
      input: JSON.stringify(event),
      encoding: "utf8",
      env: {
        ...process.env,
        AGENT_CANARY_ALERT_LOG: path.join(blockerPath, "alerts.jsonl"),
      },
    }),
  );
  assert.equal(failedLogOutput.hookSpecificOutput.permissionDecision, "deny");
  assert.match(failedLogOutput.systemMessage, /UNPROTECTED_NATIVE_SHELL/);
  assert.match(failedLogOutput.hookSpecificOutput.additionalContext, /local_alert_log=WRITE_FAILED/);

  const malformedOutput = JSON.parse(
    execFileSync(process.execPath, [hook], { input: "{", encoding: "utf8" }),
  );
  assert.equal(malformedOutput.hookSpecificOutput.permissionDecision, "deny");
  assert.match(malformedOutput.systemMessage, /could not be fully validated/);

  const unrelated = JSON.parse(
    execFileSync(process.execPath, [hook], {
      input: JSON.stringify({ ...event, tool_name: "apply_patch" }),
      encoding: "utf8",
    }),
  );
  assert.deepEqual(unrelated, {});
  process.stdout.write(
    JSON.stringify({
      schema: "agent-canary.m2.hook-test.v1",
      protocol: "PASS",
      syntheticProtectedWriteDecision: "deny",
      visibleWarning: true,
      boundaryStatus: "UNPROTECTED",
      nativeShellAcceptance: "BLOCKED_NOT_VERIFIED",
      optionalAuditLog: "PASS",
      alertWriteFailure: "DENY_WITH_VISIBLE_WARNING",
      malformedInputDecision: "deny",
      malformedEventShapeDecision: "deny",
      rawCommandLogged: false,
      unrelatedTool: "PASS_THROUGH",
    }) + "\n",
  );
} finally {
  fs.rmSync(logDir, { recursive: true, force: true });
}
