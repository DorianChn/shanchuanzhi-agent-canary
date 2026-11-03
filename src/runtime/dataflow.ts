import {createHmac,randomBytes} from 'node:crypto';
/** Bounded fingerprints for exact/encoded/split fragments. Not complete dynamic taint. */
export class DataFlowTracker {
  private readonly key=randomBytes(32);
  private readonly tags=new Map<string,{sourceId:string;expires:number}>();
  constructor(readonly ttlMs=300_000,readonly limit=512){if(!Number.isInteger(ttlMs)||ttlMs<1||ttlMs>3_600_000||!Number.isInteger(limit)||limit<1||limit>4096)throw Error('DATAFLOW_LIMIT_INVALID');}
  private digest(s:string){return createHmac('sha256',this.key).update(s).digest('hex');}
  private sweep(){for(const[h,t]of this.tags)if(t.expires<=Date.now())this.tags.delete(h);}
  register(sourceId:string,value:string){
    if(!/^[A-Za-z0-9_.:-]{1,100}$/.test(sourceId)||typeof value!=='string'||value.length>4096)throw Error('DATAFLOW_SOURCE_INVALID');
    this.sweep();
    const variants=[value,Buffer.from(value).toString('base64'),encodeURIComponent(value)];
    // Limited 16-character windows capture some splitting and common encoding. Short chunks escape.
    for(const v of variants)for(let i=0;i+16<=v.length;i+=8){
      const h=this.digest(v.slice(i,i+16));this.tags.delete(h);while(this.tags.size>=this.limit)this.tags.delete(this.tags.keys().next().value!);
      this.tags.set(h,{sourceId,expires:Date.now()+this.ttlMs});
    }
  }
  inspect(value:string):string[]{
    if(typeof value!=='string'||value.length>24_000)throw Error('DATAFLOW_INPUT_LIMIT');this.sweep();const matched=new Set<string>();
    for(let i=0;i+16<=value.length;i++){const tag=this.tags.get(this.digest(value.slice(i,i+16)));if(tag)matched.add(tag.sourceId);}
    return [...matched];
  }
  snapshot(){this.sweep();return [...this.tags].map(([digest,t])=>({digest,...t}));}
}
