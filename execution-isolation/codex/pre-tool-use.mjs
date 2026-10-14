import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DENY_REASON =
  "Native shell commands are outside the Agent Canary M2 execution-isolation boundary.";

function digest(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function emitDeny(event, failure = null) {
  const command =
    typeof event?.tool_input?.command === "string"
      ? event.tool_input.command
      : "";
  const record = {
    timeUtc: new Date().toISOString(),
    alert: "UNPROTECTED_NATIVE_SHELL",
    decision: "deny",
    sessionId: typeof event?.session_id === "string" ? event.session_id : null,
    toolUseId: typeof event?.tool_use_id === "string" ? event.tool_use_id : null,
    cwd: typeof event?.cwd === "string" ? event.cwd : null,
    commandSha256: digest(command),
    commandLength: command.length,
  };

  let logStatus = "NOT_CONFIGURED";
  const logPath = process.env.AGENT_CANARY_ALERT_LOG;
  if (logPath) {
    try {
      const absoluteLogPath = path.resolve(logPath);
      fs.mkdirSync(path.dirname(absoluteLogPath), { recursive: true });
      fs.appendFileSync(absoluteLogPath, JSON.stringify(record) + "\n", {
        encoding: "utf8",
        mode: 0o600,
      });
      logStatus = "WRITTEN";
    } catch {
      logStatus = "WRITE_FAILED";
    }
  }

  const warning =
    "UNPROTECTED_NATIVE_SHELL: Codex native Shell is outside the M2 OS isolation boundary. " +
    "This call is denied. Use an approved isolated executor; do not retry through raw Shell.";
  const output = {
    systemMessage: warning,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: DENY_REASON,
      additionalContext:
        "M2 boundary_status=UNPROTECTED; native_shell_acceptance=BLOCKED_NOT_VERIFIED; " +
        "command_sha256=" +
        record.commandSha256 +
        "; local_alert_log=" +
        logStatus +
        ".",
    },
  };
  if (failure) {
    output.systemMessage += " Hook input could not be fully validated; the hook denied the call.";
  }
  process.stdout.write(JSON.stringify(output) + "\n");
}

async function main() {
  const chunks = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > 1024 * 1024) {
      emitDeny(null, new Error("input-too-large"));
      return;
    }
    chunks.push(chunk);
  }

  let event;
  try {
    event = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    emitDeny(null, error);
    return;
  }

  if (
    event !== null &&
    typeof event === "object" &&
    !Array.isArray(event) &&
    typeof event.tool_name === "string" &&
    event.tool_name !== "Bash"
  ) {
    process.stdout.write("{}\n");
    return;
  }

  if (
    event === null ||
    typeof event !== "object" ||
    Array.isArray(event) ||
    event.tool_name !== "Bash" ||
    event.hook_event_name !== "PreToolUse" ||
    event.tool_input === null ||
    typeof event.tool_input !== "object" ||
    Array.isArray(event.tool_input) ||
    typeof event.tool_input.command !== "string"
  ) {
    emitDeny(null, new Error("invalid-pre-tool-use-event"));
    return;
  }

  emitDeny(event);
}

main().catch((error) => {
  emitDeny(null, error);
});
