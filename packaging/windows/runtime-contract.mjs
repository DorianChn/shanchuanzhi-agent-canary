export const communityRuntimeFiles=Object.freeze([
  'agent-hook.js',
  'agent-host-detection.js',
  'agent-integrations.js',
  'ai/cli.js',
  'ai/console-page.js',
  'ai/console.js',
  'ai/demo.js',
  'ai/policy-demo.js',
  'ai/privacy.js',
  'ai/provider.js',
  'ai/report.js',
  'ai/security-center-adapter.js',
  'ai/transport.js',
  'ai/types.js',
  'alerts.js',
  'codex-connection-check.js',
  'codex-connection-mcp.js',
  'competition.js',
  'config.js',
  'containment.js',
  'dataflow.js',
  'decoys.js',
  'file-state-store.js',
  'network-tool.js',
  'protected-mcp.js',
  'risk-policy.js',
  'runtime/dataflow.js',
  'runtime/demo.js',
  'runtime/evidence.js',
  'runtime/gateway.js',
  'runtime/honeypot.js',
  'sdk.js',
  'security-router.js',
  'self-test.js',
  'server.js',
  'tokens.js',
  'webhook.js',
]);

export function validateCommunityRuntime(actualFiles,sdkTypesPresent){
  if(!Array.isArray(actualFiles)||typeof sdkTypesPresent!=='boolean')throw Error('COMMUNITY_RUNTIME_OR_TYPES_INCOMPLETE');
  const actual=[...actualFiles].sort();
  if(!sdkTypesPresent||actual.length!==communityRuntimeFiles.length||actual.some((file,index)=>file!==communityRuntimeFiles[index]))throw Error('COMMUNITY_RUNTIME_OR_TYPES_INCOMPLETE');
  return actual;
}
