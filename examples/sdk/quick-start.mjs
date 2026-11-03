import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createAgentGuard,
  createTrustedExecutionGateway,
  EvidenceRecorder,
  GatewayDeniedError,
  verifyEvidenceChain,
} from '@dorianchn/agent-canary/sdk';

const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-sdk-quick-start-'));
const auditFile = path.join(workspaceRoot, 'guard-events.jsonl');
let gateway;

try {
  fs.writeFileSync(path.join(workspaceRoot, 'public.txt'), 'PUBLIC_DEMO_FIXTURE\n', {flag: 'wx'});
  const evidence = new EvidenceRecorder();
  const guard = createAgentGuard({alert: false, eventsFile: auditFile});
  gateway = createTrustedExecutionGateway({
    agentId: 'sdk-quick-start',
    guard,
    workspaceRoot,
    files: [{path: 'public.txt'}],
    evidence,
  });

  const allowed = await gateway.agent.dispatch({name: 'read_file', args: {path: 'public.txt'}});
  assert.deepEqual(allowed, {content: 'PUBLIC_DEMO_FIXTURE\n'});

  let denied;
  try {
    await gateway.agent.dispatch({name: 'read_file', args: {path: 'not-registered.txt'}});
  } catch (error) {
    if (!(error instanceof GatewayDeniedError)) throw error;
    denied = error;
  }
  assert.ok(denied, 'the unregistered path must be denied');
  assert.equal(denied.reason, 'resource_not_bound');

  const events = evidence.snapshot();
  const chain = verifyEvidenceChain(events);
  assert.equal(chain.valid, true);

  console.log(JSON.stringify({
    registeredRead: 'allowed-and-verified',
    unregisteredRead: {status: 'denied', reason: denied.reason},
    writes: 'disabled-by-contract',
    evidence: {eventCount: events.length, validLocalChain: chain.valid},
  }));
} finally {
  await gateway?.close();
  fs.rmSync(workspaceRoot, {recursive: true, force: true});
}
