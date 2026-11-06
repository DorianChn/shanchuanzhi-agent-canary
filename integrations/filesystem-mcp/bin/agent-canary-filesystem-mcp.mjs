#!/usr/bin/env node
import { createProtectedFilesystemMcp, optionsFromArgs } from '../src/server.mjs';

let runtime;
let closing;

async function close() {
  if (closing) return closing;
  closing = (async () => {
    try { await runtime?.close(); }
    catch (error) { process.stderr.write(`Agent Canary Filesystem MCP shutdown error: ${error?.message ?? 'unknown'}\n`); }
  })();
  return closing;
}

try {
  runtime = await createProtectedFilesystemMcp(optionsFromArgs(process.argv.slice(2)));
  process.stdin.once('end', () => { void close().finally(() => process.exit(0)); });
  process.once('SIGINT', () => { void close().finally(() => process.exit(130)); });
  process.once('SIGTERM', () => { void close().finally(() => process.exit(143)); });
} catch (error) {
  process.stderr.write(`Agent Canary Filesystem MCP startup failed closed: ${error?.message ?? 'unknown'}\n`);
  process.exitCode = 1;
}
