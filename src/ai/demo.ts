import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createAgentGuard, CanaryBlockedError } from '../containment.js';
import { readEvents } from '../alerts.js';

/** Deterministic sandbox demonstration, NOT a model-selected attack. */
export async function runAdvisoryDemo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-ai-demo-'));
  try {
    const eventsFile = path.join(dir, 'events.jsonl');
    const guard = createAgentGuard({ sessionId: 'console-demo', eventsFile, alert: false });
    let callbacks = 0;
    await guard.executeToolCall({ name: 'read_public_file' }, () => { callbacks++; });
    // Host seeds a detected signal; do not pretend this was chosen by an LLM.
    guard.trip({ reason: 'sandbox_decoy_signal', toolName: 'canary_read_secrets' });
    let blocked = false;
    try { await guard.executeToolCall({ name: 'send_http' }, () => { callbacks++; }); }
    catch (error) { if (!(error instanceof CanaryBlockedError)) throw error; blocked = true; }
    return { mode: 'DETERMINISTIC_SANDBOX_NOT_LLM', state: guard.state, normalCallbacks: callbacks,
      dangerousCallbacks: blocked ? 0 : 1, blocked, events: readEvents(eventsFile, 100) };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
