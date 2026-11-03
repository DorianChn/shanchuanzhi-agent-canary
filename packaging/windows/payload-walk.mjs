import fs from 'node:fs';
import path from 'node:path';

function entries(directory) {
  return fs.readdirSync(directory, {withFileTypes:true})
    .sort((a,b)=>a.name.localeCompare(b.name,'en'));
}

export function walkPayloadFiles(directory, prefix='') {
  return entries(directory).flatMap(entry=>{
    const relative=prefix+entry.name;
    if(entry.isSymbolicLink())throw Error('SYMLINK_IN_PAYLOAD');
    return entry.isDirectory()
      ? walkPayloadFiles(path.join(directory,entry.name),relative+'/')
      : [relative];
  });
}

export function walkPayloadDirectories(directory, prefix='') {
  return entries(directory).flatMap(entry=>{
    const relative=prefix+entry.name;
    if(entry.isSymbolicLink())throw Error('SYMLINK_IN_PAYLOAD');
    return entry.isDirectory()
      ? [relative,...walkPayloadDirectories(path.join(directory,entry.name),relative+'/')]
      : [];
  });
}
