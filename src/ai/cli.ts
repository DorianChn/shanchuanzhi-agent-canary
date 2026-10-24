import type { Command } from 'commander';
import fs from 'node:fs';
import { createAIProvider, PROVIDER_PRESETS, previewAnalysis, type ProviderConfig } from './provider.js';
import { startAIConsole } from './console.js';
import type { SecurityCenterProtectedTarget } from './console.js';
import { runSelfTest } from '../self-test.js';

function collectProtectedTarget(value:string,previous:string[]=[]):string[]{
  return [...previous,value];
}

function parseProtectedTargets(values:unknown):SecurityCenterProtectedTarget[]{
  if(values===undefined)return[];
  if(!Array.isArray(values)||values.some(value=>typeof value!=='string'))throw new Error('AI_CONSOLE_TARGET_MAPPING_INVALID');
  return values.map((value:string)=>{
    const separator=value.indexOf('=');
    if(separator<1||separator===value.length-1)throw new Error('AI_CONSOLE_TARGET_MAPPING_INVALID');
    return{id:value.slice(0,separator),path:value.slice(separator+1)};
  });
}

export function registerAICommands(program: Command) {
  const ai = program.command('ai').description('Optional advisory AI analysis; cannot change Guard state');
  function options(cmd: Command) {
    return cmd.option('--provider <id>', 'ollama | lmstudio | vllm | openai | anthropic | gemini | deepseek | qwen | custom', 'ollama')
      .option('--base-url <url>', 'Explicit endpoint; local endpoints must use loopback HTTP')
      .option('--protocol <protocol>', 'custom: openai-compatible | openai | anthropic | gemini | ollama')
      .option('--kind <kind>', 'custom: local | cloud')
      .option('--model <id>', 'Model ID', 'qwen3.5-9b-local:latest')
      .option('--timeout <ms>', 'Total request deadline', '60000')
      .option('--cloud-consent', 'Authorize this minimized cloud inference; inspect preview first');
  }
  function config(opts: any): ProviderConfig {
    const preset = PROVIDER_PRESETS[opts.provider as keyof typeof PROVIDER_PRESETS];
    if (!preset && (opts.provider !== 'custom' || !opts.protocol || !opts.kind || !opts.baseUrl)) throw new Error('AI_PROVIDER_INVALID');
    return { ...preset, id: opts.provider, baseUrl: opts.baseUrl ?? preset?.baseUrl,
      protocol: opts.protocol ?? preset?.protocol, kind: opts.kind ?? preset?.kind,
      model: opts.model, timeoutMs: Number(opts.timeout), apiKey: process.env.AGENT_CANARY_AI_KEY };
  }
  options(ai.command('models')).action(async opts => console.log(JSON.stringify(await createAIProvider(config(opts)).listModels(), null, 2)));
  options(ai.command('test')).action(async opts => {
    const result = await createAIProvider(config(opts)).testConnection();
    console.log(JSON.stringify(result, null, 2)); if (!result.ok) process.exitCode = 1;
  });
  options(ai.command('doctor').description('Independent containment self-test plus optional model endpoint check')).action(async opts=>{
    const containment=await runSelfTest();
    const connection=await createAIProvider(config(opts)).testConnection();
    console.log(JSON.stringify({containment,connection,inference:'NOT TESTED: run ai analyze with explicit input',keyStorage:'host process only'},null,2));
    if(!containment.passed)process.exitCode=1;
  });
  options(ai.command('analyze').requiredOption('--input <file>', 'Explicit JSON array [{id,text}], max 24KB after redaction')
    .option('--preview', 'Only print minimized input; no model call')).action(async opts => {
      const fd = fs.openSync(opts.input, 'r');
      let events;
      try {
        if (!fs.fstatSync(fd).isFile() || fs.fstatSync(fd).size > 32_000) throw new Error('AI_INPUT_TOO_LARGE');
        events = JSON.parse(fs.readFileSync(fd, 'utf8'));
      } finally { fs.closeSync(fd); }
      const cfg = config(opts);
      if (opts.preview) { console.log(JSON.stringify(previewAnalysis(events, cfg.apiKey ? [cfg.apiKey] : []), null, 2)); return; }
      const result = await createAIProvider(cfg).analyze({ events, cloudConsent: opts.cloudConsent });
      console.log(JSON.stringify(result, null, 2)); if (result.status !== 'ok') process.exitCode = 1;
    });
  ai.command('console').description('Start Chinese loopback console; keys remain in the backend process')
    .option('--port <port>', 'Loopback port', '4318')
    .option('--workspace-root <directory>', 'Root directory for configured protected targets', process.cwd())
    .option('--protected-target <id=relative-path>', 'Preconfigure a held-file target; repeat for an allowlist', collectProtectedTarget, [])
    .action(async opts => {
      const consoleServer = await startAIConsole({
        port:Number(opts.port),apiKey:process.env.AGENT_CANARY_AI_KEY,operatorApprovalCode:process.env.AGENT_CANARY_OPERATOR_CODE,
        securityCenterWorkspaceRoot:opts.workspaceRoot,
        securityCenterProtectedTargets:parseProtectedTargets(opts.protectedTarget),
      });
      console.log('Agent Canary 中文控制台: ' + consoleServer.url);
      console.log('基础 Guard 独立运行；本控制台不提供 Reset 或真实危险工具。Ctrl+C 退出。');
    });
}
