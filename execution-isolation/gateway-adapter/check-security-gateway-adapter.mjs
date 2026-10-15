import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createSecurityGatewayAdapter } from "./security-gateway-adapter.mjs";

const {
  createAgentGuard,
  createSecurityToolRouter,
  createTrustedExecutionGateway,
  EvidenceRecorder,
} = await import("../../dist/sdk.js");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "m2-security-gateway-"));
const workspaceRoot = path.join(tempRoot, "workspace");
const publicDir = path.join(workspaceRoot, "public");
const sensitiveDir = path.join(workspaceRoot, "secrets");
const externalDir = path.join(tempRoot, "outside");
fs.mkdirSync(publicDir, { recursive: true });
fs.mkdirSync(sensitiveDir);
fs.mkdirSync(externalDir);

const publicFile = path.join(publicDir, "readable.txt");
const sensitiveFile = path.join(sensitiveDir, "credentials.txt");
const externalFile = path.join(externalDir, "outside.txt");
const sensitiveAlias = path.join(publicDir, "sensitive-alias");
const externalAlias = path.join(publicDir, "external-alias");
const linkType = process.platform === "win32" ? "junction" : "dir";
fs.writeFileSync(publicFile, "public fixture\n");
fs.writeFileSync(sensitiveFile, "SYNTHETIC_SECRET_FIXTURE_DO_NOT_READ\n");
fs.writeFileSync(externalFile, "SYNTHETIC_OUTSIDE_FIXTURE_DO_NOT_READ\n");
fs.symlinkSync(sensitiveDir, sensitiveAlias, linkType);
fs.symlinkSync(externalDir, externalAlias, linkType);

const digestFile = (file) => {
  const bytes = fs.readFileSync(file);
  return { bytes: bytes.toString("hex"), sha256: createHash("sha256").update(bytes).digest("hex") };
};
const watchedBefore = [publicFile, sensitiveFile, externalFile].map(digestFile);
const guard = createAgentGuard({
  alert: false,
  eventsFile: path.join(tempRoot, "guard-events.jsonl"),
});
const evidence = new EvidenceRecorder();
let gatewayDispatches = 0;
let gateway;

try {
  gateway = createTrustedExecutionGateway({
    agentId: "m2-adapter-test",
    guard,
    workspaceRoot,
    files: [{ path: "public/readable.txt" }],
    evidence,
  });

  // This transparent decorator counts entries and forwards every accepted
  // operation to the actual M1 Gateway agent capability.
  const gatewayCapability = Object.freeze({
    agent: Object.freeze({
      dispatch(call, signal) {
        gatewayDispatches += 1;
        return gateway.agent.dispatch(call, signal);
      },
    }),
  });
  const adapter = createSecurityGatewayAdapter(gatewayCapability, {
    read_public: ["public/readable.txt"],
  });
  const router = createSecurityToolRouter({
    guard,
    mode: "OBSERVE",
    workspaceRoot,
    verifyRealPaths: true,
    eventsFile: path.join(tempRoot, "policy-events.jsonl"),
    tools: {
      read_public: { operation: "file-read", pathArg: "path" },
    },
    executeRealTool: adapter.executeRealTool,
  });

  const result = await router.dispatch({
    name: "read_public",
    args: { path: "public/readable.txt" },
  });
  assert.deepEqual(result, { content: "public fixture\n" });
  assert.equal(gatewayDispatches, 1, "registered file read must enter M1 Gateway once");
  assert.equal(router.pendingApprovals().length, 0);
  assert.equal(gateway.operator.pending().length, 0);

  const evidenceAfterAllowedRead = gateway.evidence();
  const blockedCalls = [
    {
      label: "workspace sensitive alias",
      call: {
        name: "read_public",
        args: { path: "public/sensitive-alias/credentials.txt" },
      },
      error: "M2_SECURITY_GATEWAY_PATH_NOT_REGISTERED",
    },
    {
      label: "external junction alias",
      call: {
        name: "read_public",
        args: { path: "public/external-alias/outside.txt" },
      },
      error: "M2_SECURITY_GATEWAY_PATH_NOT_REGISTERED",
    },
    {
      label: "arbitrary unregistered path",
      call: { name: "read_public", args: { path: "public/other.txt" } },
      error: "M2_SECURITY_GATEWAY_PATH_NOT_REGISTERED",
    },
    {
      label: "unknown tool ID",
      call: { name: "unknown_read", args: { path: "public/readable.txt" } },
      error: "M2_SECURITY_GATEWAY_TOOL_NOT_REGISTERED",
    },
    {
      label: "extra agent-controlled argument",
      call: {
        name: "read_public",
        args: { path: "public/readable.txt", content: "must not write" },
      },
      error: "M2_SECURITY_GATEWAY_ARGUMENTS_INVALID",
    },
  ];

  for (const blocked of blockedCalls) {
    await assert.rejects(
      router.dispatch(blocked.call),
      (error) => {
        assert.equal(error.message, blocked.error, blocked.label);
        return true;
      },
    );
    assert.equal(gatewayDispatches, 1, `${blocked.label} must be denied before Gateway dispatch`);
    assert.deepEqual(gateway.evidence(), evidenceAfterAllowedRead);
    assert.equal(router.pendingApprovals().length, 0);
    assert.equal(gateway.operator.pending().length, 0);
  }

  assert.deepEqual(
    [publicFile, sensitiveFile, externalFile].map(digestFile),
    watchedBefore,
    "denied paths must leave all fixture bytes and hashes unchanged",
  );
  assert.equal(evidenceAfterAllowedRead.length, 2, "only the allowed Gateway read is audited");
  process.stdout.write(
    "M2_SECURITY_GATEWAY_ADAPTER_PASS (OBSERVE_ROUTER; EXACT_FIXED_PATH_MAP; M1_HELD_HANDLE_DISPATCH; ALIASES_DENIED_PRE_GATEWAY; NO_APPROVALS_OR_FILE_CHANGES)\n",
  );
} finally {
  await gateway?.close();
  evidence.close();
  // Remove the two exact test-created directory links before the temporary tree.
  for (const link of [sensitiveAlias, externalAlias]) {
    try {
      fs.unlinkSync(link);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
