// Compile-only integration contract; copying under Community/contributor-kit resolves this import.
import {createTrustedExecutionGateway,type GatewayOptions} from '../dist/sdk.js';
type RegisteredMCP=NonNullable<GatewayOptions['mcpTools']>[string];
const fixtureStatus={risk:'READ_ONLY',approvalRequired:false,execute:async (_args:Record<string,unknown>,signal:AbortSignal)=>{if(signal.aborted)throw Error('aborted');return{status:'fixture-ok'};}} satisfies RegisteredMCP;
void fixtureStatus;
declare const runtime:ReturnType<typeof createTrustedExecutionGateway>;
runtime.agent.dispatch({name:'mcp_tool',args:{tool:'fixture_status',arguments:{}}});
// These compile-time checks are not runtime security proofs.
// @ts-expect-error The model-facing interface has no approval authority.
runtime.agent.approve('forged');
// @ts-expect-error The model-facing interface has no reset.
runtime.agent.reset();
