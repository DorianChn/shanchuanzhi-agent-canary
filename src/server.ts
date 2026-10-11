import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { DECOY_TOOLS, DECOY_TOOL_ANNOTATIONS, handleDecoyCall } from "./decoys.js";
import { VERSION } from "./config.js";

/**
 * Published in MCP's initialize response so clients and registries can explain
 * this server before exposing its decoy tools. Keep this short: it is safety
 * guidance, not an instruction channel for untrusted content.
 */
export const SERVER_INSTRUCTIONS =
  "Agent Canary provides canary decoys for security testing. Their represented actions are synthetic: they never execute commands, read host secrets, modify caller-selected files, contact the represented services, or move funds. Each call creates a trace token in the local Agent Canary registry and attempts to write an audit event; configured alerts may also run. The standalone stdio server does not quarantine tools in another server. Use the SDK guard in the host-controlled callback path to quarantine subsequent calls; the guard only contains tool calls routed through its integration layer.";

/**
 * Runs the decoy MCP server on stdio. All server-side chatter goes to stderr;
 * stdout is reserved for the MCP protocol.
 */
export async function serve(): Promise<void> {
  const server = new Server(
    { name: "agent-canary", version: VERSION },
    { capabilities: { tools: {} }, instructions: SERVER_INSTRUCTIONS }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: DECOY_TOOLS.map((t) => ({
      name: t.name,
      title: t.title,
      description: t.description,
      inputSchema: t.inputSchema,
      annotations: { title: t.title, ...DECOY_TOOL_ANNOTATIONS },
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) =>
    handleDecoyCall(req.params.name, (req.params.arguments ?? {}) as Record<string, unknown>)
  );

  await server.connect(new StdioServerTransport());
  console.error("[agent-canary] decoy server ready on stdio");
}
