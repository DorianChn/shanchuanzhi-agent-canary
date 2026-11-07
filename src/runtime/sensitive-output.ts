export const TOOL_OUTPUT_MAX_BYTES=65_536;
const MAX_VALUES=256;
const MAX_DEPTH=3;

const credentialMarker=/(?:NOT_A_REAL_CREDENTIAL|\bcnry_[\w-]{20,}\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bAKIA[0-9A-Z]{16}\b|\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{12,})\b|\b(?:api[_-]?key|password|passwd|authorization|secret|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key|credential)\b\s*[\"']?\s*[:=]\s*[\"']?[^\s\"',;}{]{3,})/i;

export function hasCredentialMarker(value:string):boolean{return credentialMarker.test(value);}

type OutputInspector=(value:string)=>boolean;
export type ToolOutputInspection={sensitive:boolean;canaryDetected:boolean;inspectionLimit:boolean};

function jsonStrings(value:unknown,out:string[],depth=0):boolean{
  if(typeof value==='string'){out.push(value);return out.length<=MAX_VALUES;}
  if(value===null||typeof value!=='object')return true;
  if(depth>=8)return false;
  if(Array.isArray(value)){for(const child of value)if(!jsonStrings(child,out,depth+1))return false;}
  else for(const [key,child]of Object.entries(value)){
    if(typeof child==='string')out.push(`${key}=${child}`);
    if(!jsonStrings(child,out,depth+1))return false;
    if(out.length>MAX_VALUES)return false;
  }
  return true;
}

function encodedVariants(value:string):string[]{
  const variants:string[]=[];
  if(/%[\da-f]{2}/i.test(value))try{const decoded=decodeURIComponent(value);if(decoded!==value)variants.push(decoded);}catch{}
  if(/&(?:#\d+|#x[\da-f]+|colon|quot|apos|amp|equals);/i.test(value)){
    const decoded=value.replace(/&#(\d+);/g,(_,n:string)=>String.fromCodePoint(Number(n)))
      .replace(/&#x([\da-f]+);/gi,(_,n:string)=>String.fromCodePoint(parseInt(n,16)))
      .replace(/&(colon|quot|apos|amp|equals);/gi,(_,name:string)=>({colon:':',quot:'"',apos:"'",amp:'&',equals:'='}[name.toLowerCase()]??_));
    if(decoded!==value)variants.push(decoded);
  }
  try{
    const parsed=JSON.parse(value) as unknown,strings:string[]=[];
    if(!jsonStrings(parsed,strings))return [...variants,'__AGENT_CANARY_SCAN_LIMIT__'];
    variants.push(...strings.filter(s=>s!==value));
  }catch{}
  const expression=/[A-Za-z0-9+/_-]{8,}={0,2}/g;let match:RegExpExecArray|null;
  while((match=expression.exec(value))!==null){
    const source=match[0],normalized=source.replace(/-/g,'+').replace(/_/g,'/').replace(/=+$/,'');
    if(normalized.length%4===1)continue;
    const bytes=Buffer.from(normalized+'='.repeat((4-normalized.length%4)%4),'base64');
    if(bytes.length===0||bytes.length>TOOL_OUTPUT_MAX_BYTES||bytes.toString('base64').replace(/=+$/,'')!==normalized)continue;
    const decoded=bytes.toString('utf8');
    if(decoded.includes('\uFFFD')||decoded.includes('\0'))continue;
    const printable=[...decoded].filter(c=>c==='\n'||c==='\r'||c==='\t'||c>=' ').length/Math.max(decoded.length,1);
    if(printable>=0.9)variants.push(decoded);
    if(variants.length>MAX_VALUES)return [...variants,'__AGENT_CANARY_SCAN_LIMIT__'];
  }
  return variants;
}

/** Scans bounded output and common reversible encodings without logging payloads. */
export function inspectToolOutput(value:string,inspectCanary:OutputInspector):ToolOutputInspection{
  if(Buffer.byteLength(value,'utf8')>TOOL_OUTPUT_MAX_BYTES)return{sensitive:true,canaryDetected:false,inspectionLimit:true};
  const queue:Array<{value:string;depth:number}>=[{value,depth:0}],seen=new Set<string>();let sensitive=false,canaryDetected=false,processed=0;
  while(queue.length){
    const current=queue.shift()!;
    if(seen.has(current.value))continue;
    seen.add(current.value);
    if(++processed>MAX_VALUES)return{sensitive:true,canaryDetected,inspectionLimit:true};
    if(hasCredentialMarker(current.value))sensitive=true;
    try{if(inspectCanary(current.value))canaryDetected=true;}catch{return{sensitive:true,canaryDetected,inspectionLimit:true};}
    let variants:string[];
    try{variants=encodedVariants(current.value);}catch{return{sensitive:true,canaryDetected,inspectionLimit:true};}
    if(variants.includes('__AGENT_CANARY_SCAN_LIMIT__'))return{sensitive:true,canaryDetected,inspectionLimit:true};
    if(current.depth>=MAX_DEPTH){if(variants.some(candidate=>candidate!==current.value&&!seen.has(candidate)))return{sensitive:true,canaryDetected,inspectionLimit:true};continue;}
    for(const candidate of variants)if(candidate!==current.value&&!seen.has(candidate))queue.push({value:candidate,depth:current.depth+1});
    if(queue.length+processed>MAX_VALUES)return{sensitive:true,canaryDetected,inspectionLimit:true};
  }
  return{sensitive:sensitive||canaryDetected,canaryDetected,inspectionLimit:false};
}
