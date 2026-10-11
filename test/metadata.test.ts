import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { DECOY_TOOLS, DECOY_TOOL_ANNOTATIONS } from "../src/decoys.ts";
import { SERVER_INSTRUCTIONS } from "../src/server.ts";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

function readJson(file: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
}

test("public MCP and Glama metadata stays aligned with the free V1 release", () => {
  const pkg = readJson("package.json");
  const registry = readJson("server.json");
  const glama = readJson("glama.json");
  const dockerfile = fs.readFileSync("Dockerfile", "utf8");

  assert.equal(registry.name, "io.github.DorianChn/agent-canary");
  assert.equal(registry.version, pkg.version);
  assert.match(String(registry.description), /inert MCP decoys/i);
  assert.equal(glama.$schema, "https://glama.ai/mcp/schemas/server.json");
  assert.deepEqual(glama.maintainers, ["DorianChn"]);
  assert.match(dockerfile, /ENTRYPOINT \["node", "dist\/index\.js", "serve"\]/);
});

test("decoy tool definitions disclose inert behavior and conservative MCP annotations", () => {
  assert.deepEqual(DECOY_TOOL_ANNOTATIONS, {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  });
  assert.ok(DECOY_TOOLS.length >= 8);
  for (const tool of DECOY_TOOLS) {
    assert.match(tool.title, /canary simulation$/);
    assert.match(tool.description, /^Synthetic canary decoy for security testing only\./);
  }
});

test("server instructions disclose the containment boundary without implying real decoy actions", () => {
  assert.match(SERVER_INSTRUCTIONS, /represented actions are synthetic/i);
  assert.match(SERVER_INSTRUCTIONS, /never execute commands, read host secrets, modify caller-selected files/i);
  assert.match(SERVER_INSTRUCTIONS, /local Agent Canary registry and attempts to write an audit event/i);
  assert.match(SERVER_INSTRUCTIONS, /standalone stdio server does not quarantine tools in another server/i);
  assert.match(SERVER_INSTRUCTIONS, /only contains tool calls routed through its integration layer/i);
});

test("stdio MCP server lists inert decoys and answers calls without writing to stdout out of protocol", async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "agent-canary-mcp-stdio-"));
  const eventsFile = path.join(home, "events.jsonl");
  fs.writeFileSync(path.join(home, "config.json"), JSON.stringify({ webhook: null, notify: false, eventsFile }));
  const client = new Client({ name: "agent-canary-integration-test", version: "1.0.0" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", "tsx", path.resolve("src/index.ts"), "serve"],
    cwd: process.cwd(),
    env: {
      PATH: process.env.PATH ?? "",
      SystemRoot: process.env.SystemRoot ?? "",
      AGENT_CANARY_HOME: home,
    },
    stderr: "pipe",
  });

  try {
    await client.connect(transport);
    const listed = await client.listTools();
    assert.equal(listed.tools.length, DECOY_TOOLS.length);
    assert.ok(listed.tools.some((tool) => tool.name === "canary_run_shell"));
    assert.equal(listed.tools[0].annotations?.destructiveHint, false);

    const result = await client.callTool({
      name: "canary_run_shell",
      arguments: { command: "synthetic no-op" },
    });
    assert.equal(result.isError, undefined);
    assert.match(String(result.content[0]?.text), /job_id=cnry_/);
    assert.match(fs.readFileSync(eventsFile, "utf8"), /"kind":"decoy_called"/);
  } finally {
    await client.close().catch(() => undefined);
    fs.rmSync(home, { recursive: true, force: true });
  }
});
