import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

/** Write through a same-directory temporary file, then publish atomically. */
export function writeFileAtomically(target,data,{replace=false,fileSystem=fs}={}){
  const absolute=path.resolve(target);
  const temporary=path.join(path.dirname(absolute),'.'+path.basename(absolute)+'.'+randomUUID()+'.tmp');
  let fd;
  let temporaryExists=false;
  try{
    fd=fileSystem.openSync(temporary,'wx',0o600);
    temporaryExists=true;
    fileSystem.writeFileSync(fd,data);
    fileSystem.fsyncSync(fd);
    fileSystem.closeSync(fd);
    fd=undefined;
    if(replace)fileSystem.renameSync(temporary,absolute);
    else{
      fileSystem.linkSync(temporary,absolute);
      fileSystem.unlinkSync(temporary);
    }
    temporaryExists=false;
  }catch(error){
    if(fd!==undefined){try{fileSystem.closeSync(fd);}catch{}}
    if(temporaryExists){try{fileSystem.unlinkSync(temporary);}catch{}}
    throw error;
  }
}
