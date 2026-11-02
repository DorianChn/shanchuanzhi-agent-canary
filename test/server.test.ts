import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { test } from "node:test";
import { DECOY_TOOLS } from "../src/decoys.js";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("published stdio MCP entry reports its package version, discovers the decoys, and handles a tool call", async (t) => {
  const packageMetadata = JSON.parse(await readFile(path.join(repositoryRoot, "package.json"), "utf8")) as {
    version: string;
  };
  const registryMetadata = JSON.parse(await readFile(path.join(repositoryRoot, "server.json"), "utf8")) as {
    version: string;
  };
  const dataRoot = await mkdtemp(path.join(os.tmpdir(), "agent-canary-mcp-test-"));
  const environment = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
  );
  environment.AGENT_CANARY_HOME = dataRoot;

  const client = new Client({ name: "agent-canary-protocol-test", version: "1.0.0" });
  let processExited = false;
  let serverPid: number | null = null;
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(repositoryRoot, "dist", "competition.js"), "serve", "--stdio"],
    cwd: os.tmpdir(),
    env: environment,
  });
  const processClosed = new Promise<void>((resolve) => {
    transport.onclose = () => {
      processExited = true;
      resolve();
    };
  });

  t.after(async () => {
    await client.close().catch(() => undefined);
    await Promise.race([processClosed, new Promise((resolve) => setTimeout(resolve, 1000))]);
    if (!processExited && serverPid !== null) {
      try {
        process.kill(serverPid, "SIGTERM");
      } catch {
        // The child may have exited between the check and the signal.
      }
      await Promise.race([processClosed, new Promise((resolve) => setTimeout(resolve, 1000))]);
    }
    await rm(dataRoot, { recursive: true, force: true });
  });

  await client.connect(transport);
  serverPid = transport.pid;

  const serverVersion = client.getServerVersion();
  assert.equal(serverVersion?.name, "agent-canary");
  assert.equal(serverVersion?.version, packageMetadata.version);
  assert.equal(registryMetadata.version, packageMetadata.version);

  const { tools } = await client.listTools();
  assert.equal(tools.length, 12);
  assert.deepEqual(
    tools.map((tool) => tool.name).sort(),
    DECOY_TOOLS.map((tool) => tool.name).sort()
  );
  const expectedTools = new Map(DECOY_TOOLS.map((tool) => [tool.name, tool]));
  for (const tool of tools) {
    const expected = expectedTools.get(tool.name);
    assert.ok(expected, `${tool.name} must be defined by Agent Canary`);
    assert.equal(tool.inputSchema.type, "object", `${tool.name} must publish an object input schema`);
    assert.deepEqual(tool.inputSchema, expected.inputSchema, `${tool.name} input schema must match its source definition`);
    assert.equal(tool.description, expected.description, `${tool.name} description must match its source definition`);
    assert.equal(tool.annotations?.title, expected.title, `${tool.name} title must match its source definition`);
    assert.equal(tool.annotations?.readOnlyHint, true, `${tool.name} must remain read-only`);
    assert.equal(tool.annotations?.destructiveHint, false, `${tool.name} must remain non-destructive`);
    assert.equal(tool.annotations?.idempotentHint, true, `${tool.name} must remain idempotent`);
  }

  const result = await client.callTool({
    name: "canary_run_shell",
    arguments: { command: "echo synthetic-only" },
  });
  assert.equal(result.isError ?? false, false);
  assert.match(
    result.content
      .filter((block): block is { type: "text"; text: string } => block.type === "text")
      .map((block) => block.text)
      .join("\n"),
    /cnry_/
  );
});
