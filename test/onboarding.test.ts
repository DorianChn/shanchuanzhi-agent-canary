import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {detectAgentHosts} from '../src/agent-host-detection.js';
import {installAgentIntegrationWithReceipt,previewAgentIntegration,restoreAgentIntegration,type AgentClient} from '../src/agent-integrations.js';

function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'agent-canary-onboarding-test-'));
  const project=path.join(root,'project');
  fs.mkdirSync(project);
  return{root,project,close(){
    const realRoot=fs.realpathSync(root),realTemp=fs.realpathSync(os.tmpdir()),relative=path.relative(realTemp,realRoot);
    assert.notEqual(relative,'..');assert.ok(!relative.startsWith('..'+path.sep));
    fs.rmSync(realRoot,{recursive:true,force:true});
  }};
}
function entry(){return{command:process.execPath,args:['C:/Agent Canary/dist/competition.js','serve','--stdio']};}
function clearBackup(record:{backupPath:string}){
  const home=fs.realpathSync(os.homedir()),root=path.join(home,'.agent-canary-integration-backups');
  const directory=path.dirname(record.backupPath);
  if(!fs.existsSync(root)||!fs.existsSync(directory))return;
  const realRoot=fs.realpathSync(root),realDirectory=fs.realpathSync(directory),relative=path.relative(realRoot,realDirectory);
  assert.notEqual(relative,'..');assert.ok(!relative.startsWith('..'+path.sep));
  assert.match(path.basename(realDirectory),/^entry-/);
  fs.rmSync(realDirectory,{recursive:true,force:true});
}

test('host discovery reports installation/version/config paths without reading values into its result',t=>{
  const f=fixture();t.after(f.close);
  const bin=path.join(f.root,'bin');fs.mkdirSync(bin);
  const executable=path.join(bin,process.platform==='win32'?'codex.exe':'codex');fs.writeFileSync(executable,'fixture');
  const config=path.join(f.project,'.codex','config.toml');fs.mkdirSync(path.dirname(config));fs.writeFileSync(config,'[mcp_servers.other]\ncommand = "node"\nsecret = "not-returned"\n[[hooks.PreToolUse]]\nmatcher = "^mcp__agent-canary__.*$"\n');
  const hosts=detectAgentHosts({home:f.root,project:f.project,env:{PATH:bin,PATHEXT:'.EXE;.CMD'},version:()=> 'codex-cli 3.0.test'});
  const codex=hosts.find(host=>host.agent==='codex')!;
  assert.equal(codex.installed,true);
  assert.equal(codex.version,'codex-cli 3.0.test');
  assert.equal(codex.hooks.configured,true);
  assert.ok(codex.mcp.configuration.includes(config));
  assert.equal(JSON.stringify(codex).includes('not-returned'),false);
});

test('preview is metadata only and the installation preserves existing Codex TOML bytes',t=>{
  const f=fixture();t.after(f.close);
  const config=path.join(f.project,'.codex','config.toml');fs.mkdirSync(path.dirname(config));
  const original='model = "codex-mini"\n\n[features]\nhooks = true\n';fs.writeFileSync(config,original);
  const preview=previewAgentIntegration('codex',f.project,entry());
  assert.equal(preview.configPath,config);assert.equal(preview.originalExisted,true);
  assert.equal(JSON.stringify(preview).includes('codex-mini'),false);
  assert.equal(fs.readFileSync(config,'utf8'),original);
  const record=installAgentIntegrationWithReceipt('codex',f.project,entry(),preview.baseHash);
  t.after(()=>clearBackup(record));
  const installed=fs.readFileSync(config,'utf8');
  assert.ok(installed.startsWith(original));
  assert.match(installed,/\[mcp_servers\.agent-canary\]/);
  assert.match(installed,/hooks = true/);
  assert.equal(fs.existsSync(record.receiptPath!),true);
  assert.equal(record.status,'MCP_DECOY_INSTALLED');
  assert.match(record.coverage,/OUT_OF_SCOPE/);
  const restored=restoreAgentIntegration(record);
  assert.equal(restored.status,'RESTORED');
  assert.equal(fs.readFileSync(config,'utf8'),original);
});

test('rollback removes only the newly created config file',t=>{
  const f=fixture();t.after(f.close);
  const preview=previewAgentIntegration('codex',f.project,entry());
  const record=installAgentIntegrationWithReceipt('codex',f.project,entry(),preview.baseHash);
  t.after(()=>clearBackup(record));
  assert.equal(fs.existsSync(record.configPath),true);
  restoreAgentIntegration(record);
  assert.equal(fs.existsSync(record.configPath),false);
});

test('a changed config after preview blocks installation without replacing the new contents',t=>{
  const f=fixture();t.after(f.close);
  const config=path.join(f.project,'.codex','config.toml');fs.mkdirSync(path.dirname(config));fs.writeFileSync(config,'[features]\nhooks = false\n');
  const preview=previewAgentIntegration('codex',f.project,entry());
  fs.appendFileSync(config,'\n[notice]\nvalue = "changed after preview"\n');
  const before=fs.readFileSync(config,'utf8');
  assert.throws(()=>installAgentIntegrationWithReceipt('codex',f.project,entry(),preview.baseHash),/INTEGRATION_CONFIG_CHANGED/);
  assert.equal(fs.readFileSync(config,'utf8'),before);
});

test('same-name entries and invalid TOML are rejected before any write',t=>{
  const f=fixture();t.after(f.close);
  const config=path.join(f.project,'.codex','config.toml');fs.mkdirSync(path.dirname(config));
  const conflict='[mcp_servers.agent-canary]\ncommand = "user-tool"\n';fs.writeFileSync(config,conflict);
  assert.throws(()=>previewAgentIntegration('codex',f.project,entry()),/INTEGRATION_EXISTING_ENTRY_REQUIRES_MANUAL_REVIEW/);
  assert.equal(fs.readFileSync(config,'utf8'),conflict);
  fs.writeFileSync(config,'[broken\n');
  assert.throws(()=>previewAgentIntegration('codex',f.project,entry()),/INTEGRATION_TOML_INVALID/);
  assert.equal(fs.readFileSync(config,'utf8'),'[broken\n');
});

test('missing project paths and file paths produce explicit preflight errors',t=>{
  const f=fixture();t.after(f.close);
  assert.throws(()=>previewAgentIntegration('codex',path.join(f.root,'missing'),entry()),/INTEGRATION_PROJECT_NOT_FOUND/);
  const file=path.join(f.root,'not-a-directory');fs.writeFileSync(file,'fixture');
  assert.throws(()=>previewAgentIntegration('codex',file,entry()),/INTEGRATION_PROJECT_NOT_DIRECTORY/);
});

test('rollback refuses to overwrite any post-install user edit',t=>{
  const f=fixture();t.after(f.close);
  const config=path.join(f.project,'.codex','config.toml');fs.mkdirSync(path.dirname(config));fs.writeFileSync(config,'[features]\nhooks = true\n');
  const preview=previewAgentIntegration('codex',f.project,entry());
  const record=installAgentIntegrationWithReceipt('codex',f.project,entry(),preview.baseHash);
  t.after(()=>clearBackup(record));
  fs.appendFileSync(config,'\n[features]\n');
  const afterEdit=fs.readFileSync(config,'utf8');
  assert.throws(()=>restoreAgentIntegration(record),/INTEGRATION_USER_EDITS_PRESERVED_MANUAL_RESTORE_REQUIRED/);
  assert.equal(fs.readFileSync(config,'utf8'),afterEdit);
});

test('rollback cooperates with the exclusive onboarding lock',t=>{
  const f=fixture();t.after(f.close);
  const config=path.join(f.project,'.codex','config.toml');fs.mkdirSync(path.dirname(config));fs.writeFileSync(config,'[features]\nhooks = true\n');
  const preview=previewAgentIntegration('codex',f.project,entry());
  const record=installAgentIntegrationWithReceipt('codex',f.project,entry(),preview.baseHash);
  t.after(()=>clearBackup(record));
  const lock=config+'.agent-canary-lock';fs.writeFileSync(lock,'held',{flag:'wx'});
  try{assert.throws(()=>restoreAgentIntegration(record),/INTEGRATION_LOCKED/);assert.equal(fs.readFileSync(config,'utf8').includes('[mcp_servers.agent-canary]'),true);}
  finally{fs.unlinkSync(lock);}
});

test('a foreign backup path in a receipt is rejected before it can restore a file',t=>{
  const f=fixture();t.after(f.close);
  const config=path.join(f.project,'.codex','config.toml');fs.mkdirSync(path.dirname(config));fs.writeFileSync(config,'[features]\nhooks = true\n');
  const preview=previewAgentIntegration('codex',f.project,entry());
  const record=installAgentIntegrationWithReceipt('codex',f.project,entry(),preview.baseHash);
  t.after(()=>clearBackup(record));
  assert.throws(()=>restoreAgentIntegration({...record,backupPath:path.join(f.root,'foreign.backup')}),/INTEGRATION_BACKUP/);
  assert.equal(fs.readFileSync(config,'utf8').includes('[mcp_servers.agent-canary]'),true);
});

test('JSON host merge preserves other MCP server entries',t=>{
  const f=fixture();t.after(f.close);
  const agent:AgentClient='cursor';
  const config=path.join(f.project,'.cursor','mcp.json');fs.mkdirSync(path.dirname(config));
  fs.writeFileSync(config,JSON.stringify({mcpServers:{other:{command:'keep',args:['--safe']}}},null,2)+'\n');
  const preview=previewAgentIntegration(agent,f.project,entry());
  const before=JSON.parse(fs.readFileSync(config,'utf8'));
  assert.equal(before.mcpServers.other.command,'keep');
  assert.equal(Object.hasOwn(before.mcpServers,'agent-canary'),false);
  assert.match(preview.coverage,/OUT_OF_SCOPE/);
});

test('legacy Cline integration refuses its unsupported project-relative config path',t=>{
  const f=fixture();t.after(f.close);
  assert.throws(()=>previewAgentIntegration('cline',f.project,entry()),/INTEGRATION_CLINE_PATH_UNSUPPORTED/);
  assert.equal(fs.existsSync(path.join(f.project,'.cline','data','settings','cline_mcp_settings.json')),false);
});
