import fs from 'node:fs';import path from 'node:path';import {randomUUID} from 'node:crypto';
import type {ContainmentStateStore} from './containment.js';
const MAX_BYTES=256_000;
type Snapshot={version:1;states:Record<string,'QUARANTINED'>};
/** Opt-in local persistence for trusted hosts. This is not a distributed database. */
export function createFileContainmentStateStore(file:string,options:{initialize?:boolean;maxScopes?:number}={}):ContainmentStateStore{
 if(!path.isAbsolute(file)||file.includes('\0'))throw Error('STATE_STORE_PATH_INVALID');
 if(options.initialize!==undefined&&typeof options.initialize!=='boolean')throw Error('STATE_STORE_OPTIONS_INVALID');
 file=path.resolve(file);const parent=path.dirname(file),limit=options.maxScopes??1024;
 if(!Number.isInteger(limit)||limit<1||limit>4096)throw Error('STATE_STORE_CAPACITY_INVALID');
 const parentOK=()=>{let actual:string;try{actual=fs.realpathSync(parent);}catch{throw Error('STATE_STORE_PARENT_UNAVAILABLE');}const rel=path.relative(parent,actual);if(rel)throw Error('STATE_STORE_PARENT_REDIRECTED');};
 const scope=(s:string)=>{if(typeof s!=='string'||!/^[A-Za-z0-9_.:@-]{1,200}$/.test(s))throw Error('STATE_STORE_SCOPE_INVALID');};
 function read():Snapshot{
  parentOK();let fd:number|undefined;
  try{
   const st=fs.lstatSync(file);if(!st.isFile()||st.isSymbolicLink())throw Error('STATE_STORE_FILE_UNSAFE');if(st.size>MAX_BYTES)throw Error('STATE_STORE_FILE_LIMIT');
   fd=fs.openSync(file,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0));const bytes=Buffer.alloc(MAX_BYTES+1);let count=0,n:number;
   while(count<bytes.length&&(n=fs.readSync(fd,bytes,count,bytes.length-count,null))>0)count+=n;
   if(count>MAX_BYTES)throw Error('STATE_STORE_FILE_LIMIT');let data:any;
   try{data=JSON.parse(bytes.subarray(0,count).toString('utf8'));}catch{throw Error('STATE_STORE_INVALID');}
   if(!data||data.version!==1||Object.keys(data).sort().join(',')!=='states,version'||!data.states||Array.isArray(data.states)||typeof data.states!=='object')throw Error('STATE_STORE_INVALID');
   const entries=Object.entries(data.states);if(entries.length>limit)throw Error('STATE_STORE_CAPACITY');
   for(const [k,v]of entries){try{scope(k);}catch{throw Error('STATE_STORE_INVALID');}if(v!=='QUARANTINED')throw Error('STATE_STORE_INVALID');}
   return data;
  }catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')throw Error('STATE_STORE_MISSING');if(error instanceof Error&&error.message.startsWith('STATE_STORE_'))throw error;throw Error('STATE_STORE_IO');}
  finally{if(fd!==undefined)fs.closeSync(fd);}
 }
 function transaction(change:(data:Snapshot)=>boolean):boolean{
  parentOK();const lock=file+'.lock';let lockFd:number|undefined,temp:string|undefined;
  try{
   try{lockFd=fs.openSync(lock,'wx',0o600);}catch(error){
    const code=(error as NodeJS.ErrnoException).code;
    if(code==='EEXIST')throw Error('STATE_STORE_BUSY');
    // Windows may report sharing contention as EPERM rather than EEXIST.
    if(process.platform==='win32'&&(code==='EPERM'||code==='EACCES')){try{fs.lstatSync(lock);}catch{throw Error('STATE_STORE_IO');}throw Error('STATE_STORE_BUSY');}
    throw Error('STATE_STORE_IO');
   }
   const data=read(),changed=change(data);if(!changed)return false;
   const bytes=JSON.stringify(data)+'\n';if(Buffer.byteLength(bytes)>MAX_BYTES)throw Error('STATE_STORE_FILE_LIMIT');
   temp=file+'.'+randomUUID()+'.tmp';const fd=fs.openSync(temp,'wx',0o600);try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
   for(let attempt=0;;attempt++){
    parentOK();const current=fs.lstatSync(file);if(!current.isFile()||current.isSymbolicLink())throw Error('STATE_STORE_FILE_UNSAFE');
    try{fs.renameSync(temp,file);break;}catch(error){
     const code=(error as NodeJS.ErrnoException).code;
     if(process.platform!=='win32'||attempt>=5||!['EPERM','EACCES','EBUSY'].includes(code??''))throw error;
     // Keep the writer lock and the original file; never unlink to force replacement.
     Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10*(attempt+1));
    }
   }
   temp=undefined;return true;
  }catch(error){if(error instanceof Error&&error.message.startsWith('STATE_STORE_'))throw error;throw Error('STATE_STORE_IO');}
  finally{if(temp){try{fs.unlinkSync(temp);}catch{}}if(lockFd!==undefined){fs.closeSync(lockFd);fs.unlinkSync(lock);}}
 }
 parentOK();
 if(options.initialize){try{fs.writeFileSync(file,'{"version":1,"states":{}}\n',{flag:'wx',mode:0o600});}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw Error('STATE_STORE_IO');}}
 read();
 function noWriter(){try{fs.lstatSync(file+'.lock');}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return;throw Error('STATE_STORE_IO');}throw Error('STATE_STORE_BUSY');}
 return {
  get:(key)=>{scope(key);noWriter();const data=read();noWriter();return Object.hasOwn(data.states,key)?data.states[key]:undefined;},
  quarantine:(key)=>{scope(key);return transaction(data=>{if(Object.hasOwn(data.states,key))return false;if(Object.keys(data.states).length>=limit)throw Error('STATE_STORE_CAPACITY');Object.defineProperty(data.states,key,{value:'QUARANTINED',enumerable:true,configurable:true,writable:true});return true;});},
  reset:(key)=>{scope(key);transaction(data=>{if(!Object.hasOwn(data.states,key))return false;delete data.states[key];return true;});},
 };
}
