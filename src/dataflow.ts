import {createHmac,randomBytes} from 'node:crypto';
/** Bounded session-local provenance hints. Not dynamic taint analysis. */
export class SessionDataFlow {
  private readonly key=randomBytes(32);
  private readonly entries=new Map<string,{label:string;expires:number}>();
  constructor(readonly ttlMs=300_000,readonly limit=256){
    if(!Number.isInteger(ttlMs)||ttlMs<1||ttlMs>3_600_000||!Number.isInteger(limit)||limit<1||limit>1024)throw new Error('FLOW_LIMIT_INVALID');
  }
  private sweep(){for(const [h,v] of this.entries)if(v.expires<=Date.now())this.entries.delete(h);}
  private hash(value:string){return createHmac('sha256',this.key).update(value.slice(0,24_000)).digest('hex');}
  record(label:string,value:string){this.sweep();if(!/^[a-zA-Z0-9_.-]{1,80}$/.test(label))throw new Error('FLOW_LABEL_INVALID');const hash=this.hash(value);this.entries.delete(hash);while(this.entries.size>=this.limit)this.entries.delete(this.entries.keys().next().value!);this.entries.set(hash,{label,expires:Date.now()+this.ttlMs});return hash;}
  match(value:string){this.sweep();return this.entries.get(this.hash(value))?.label??null;}
  hasSensitiveSource(){this.sweep();return this.entries.size>0;}
  snapshot(){this.sweep();return [...this.entries].map(([hash,v])=>({hash,...v}));}
}
