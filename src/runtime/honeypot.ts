import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {randomUUID} from 'node:crypto';
import type {GatewayFile} from './gateway.js';
export type DecoyKind='ENV'|'SSH'|'DATABASE'|'INTERNAL_API'|'MCP';
export type DecoyInteraction='DEPLOYED'|'EXPOSED'|'DISCOVERED'|'READ'|'REFERENCED'|'COPIED'|'TOOL_INVOKED'|'EXFIL_ATTEMPTED'|'BLOCKED'|'QUARANTINED';
export interface DecoyEvent {eventId:string;decoyId:string;sessionId:string;kind:DecoyInteraction;timestamp:string}
export interface DecoyDescription {id:string;kind:DecoyKind;path:string}
/** Host-owned task metadata only. Selection is a heuristic, no efficacy guarantee. */
export function planAdaptiveDecoys(task:{category:'web'|'database'|'deployment'|'general';needsCredentials:boolean}):DecoyKind[]{
  if(!['web','database','deployment','general'].includes(task.category)||typeof task.needsCredentials!=='boolean')throw Error('DECOY_TASK_METADATA_INVALID');
  const kinds:DecoyKind[]=task.category==='database'?['DATABASE','ENV']:task.category==='web'?['INTERNAL_API','MCP']:task.category==='deployment'?['SSH','ENV']:['MCP'];
  if(task.needsCredentials&&!kinds.includes('ENV'))kinds.push('ENV');return kinds;
}
/** New private temp directory only. Fake strings are not valid credentials. No host mounts. */
export class HoneypotRuntime {
  readonly root:string;
  private readonly decoys:DecoyDescription[]=[];
  private readonly events:DecoyEvent[]=[];
  private readonly content=new Map<string,string>();
  constructor(readonly sessionId:string,kinds:readonly DecoyKind[]=['ENV','SSH','DATABASE','INTERNAL_API','MCP']){
    if(!/^[A-Za-z0-9_.:-]{1,100}$/.test(sessionId)||!kinds.length||new Set(kinds).size!==kinds.length||kinds.some(k=>!['ENV','SSH','DATABASE','INTERNAL_API','MCP'].includes(k)))throw Error('HONEYPOT_CONFIG_INVALID');
    this.root=fs.mkdtempSync(path.join(os.tmpdir(),'agent-canary-honeypot-'));fs.chmodSync(this.root,0o700);
    const files:Record<DecoyKind,string>={ENV:'.env',SSH:'ssh/id_ed25519',DATABASE:'database.json',INTERNAL_API:'internal-api.json',MCP:'mcp-tool.json'};
    for(const kind of kinds){
      const id='decoy-'+randomUUID(),file=files[kind];
      const text=kind==='ENV'?`API_KEY=NOT_A_REAL_CREDENTIAL_${id}\n`:kind==='SSH'?`INVALID_SSH_TEST_CREDENTIAL_${id}\nNOT_A_REAL_CREDENTIAL\n`:JSON.stringify({decoyId:id,kind,credential:'NOT_A_REAL_CREDENTIAL',records:[{id:1,value:'synthetic-only'}]});
      fs.mkdirSync(path.dirname(path.join(this.root,file)),{recursive:true,mode:0o700});fs.writeFileSync(path.join(this.root,file),text,{flag:'wx',mode:0o600});
      this.decoys.push({id,kind,path:file});this.content.set(id,text);this.record(id,'DEPLOYED');
    }
  }
  descriptions(){return this.decoys.map(d=>({...d}));}
  gatewayFiles():GatewayFile[]{return this.decoys.map(d=>({path:d.path,decoyId:d.id,sensitive:true}));}
  record(decoyId:string,kind:DecoyInteraction){
    if(!this.content.has(decoyId)||!['DEPLOYED','EXPOSED','DISCOVERED','READ','REFERENCED','COPIED','TOOL_INVOKED','EXFIL_ATTEMPTED','BLOCKED','QUARANTINED'].includes(kind))throw Error('HONEYPOT_EVENT_INVALID');
    if(this.events.length>=1024)throw Error('HONEYPOT_EVENT_LIMIT');
    this.events.push({eventId:randomUUID(),decoyId,sessionId:this.sessionId,kind,timestamp:new Date().toISOString()});
  }
  /** In-memory interaction, not a live database or real internal network. */
  invoke(decoyId:string,operation:'query'|'health'|'tool'){
    const d=this.decoys.find(d=>d.id===decoyId);
    if(!d||(d.kind==='DATABASE'&&operation!=='query')||(d.kind==='INTERNAL_API'&&operation!=='health')||(d.kind==='MCP'&&operation!=='tool')||['ENV','SSH'].includes(d.kind))throw Error('HONEYPOT_OPERATION_INVALID');
    this.record(decoyId,'TOOL_INVOKED');return JSON.parse(this.content.get(decoyId)!);
  }
  snapshot(){return this.events.map(e=>({...e}));}
}
