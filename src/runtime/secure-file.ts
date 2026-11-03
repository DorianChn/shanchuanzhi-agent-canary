import fs from 'node:fs';
import path from 'node:path';
import koffi from 'koffi';

export type SecureFileStat={
  dev:bigint;ino:bigint;birthtimeNs:bigint;ctimeNs:bigint;mtimeNs:bigint;size:bigint;nlink:bigint;
  kind:'file'|'directory'|'reparse'|'other';
};
export interface SecureFileHandle {
  stat():SecureFileStat;
  readAt(offset:number,length:number):Buffer;
  close():void;
}
export interface SecureDirectoryHandle {
  stat():SecureFileStat;
  openFile(relativePath:string):SecureFileHandle;
  close():void;
}

const isWindows=process.platform==='win32';
const isPosix=process.platform==='linux'||process.platform==='darwin';
const atFdcwd=process.platform==='darwin'?-2:-100;

const fileTimeToNs=(ticks:bigint)=> (ticks-116_444_736_000_000_000n)*100n;
const joinWords=(high:number,low:number)=>(BigInt(high>>>0)<<32n)|BigInt(low>>>0);
const isInvalidHandle=(handle:bigint|null|undefined)=>handle===null||handle===undefined||handle===0n||handle===-1n||handle===0xffff_ffff_ffff_ffffn;

const windows=(()=>{
  if(!isWindows)return undefined;
  const kernel32=koffi.load('kernel32.dll'),ntdll=koffi.load('ntdll.dll');
  const structPrefix=`AC_${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2)}_`;
  const fileTimeName=`${structPrefix}FILETIME`,basicInfoName=`${structPrefix}FILE_BASIC_INFO`,unicodeStringName=`${structPrefix}UNICODE_STRING`;
  const objectAttributesName=`${structPrefix}OBJECT_ATTRIBUTES`,ioStatusBlockName=`${structPrefix}IO_STATUS_BLOCK`;
  const FILETIME=koffi.struct(fileTimeName,{low:'uint32',high:'uint32'});
  const BY_HANDLE_FILE_INFORMATION=koffi.struct(`${structPrefix}BY_HANDLE_FILE_INFORMATION`,{
    attributes:'uint32',creation:FILETIME,access:FILETIME,write:FILETIME,volume:'uint32',sizeHigh:'uint32',sizeLow:'uint32',links:'uint32',indexHigh:'uint32',indexLow:'uint32',
  });
  const FILE_BASIC_INFO=koffi.struct(basicInfoName,{
    creation:'int64',access:'int64',write:'int64',change:'int64',attributes:'uint32',reserved:'uint32',
  });
  const UNICODE_STRING=koffi.struct(unicodeStringName,{Length:'uint16',MaximumLength:'uint16',Buffer:'str16'});
  const OBJECT_ATTRIBUTES=koffi.struct(objectAttributesName,{
    Length:'uint32',RootDirectory:'void *',ObjectName:`${unicodeStringName} *`,Attributes:'uint32',SecurityDescriptor:'void *',SecurityQualityOfService:'void *',
  });
  const IO_STATUS_BLOCK=koffi.struct(ioStatusBlockName,{StatusOrPointer:'void *',Information:'uintptr_t'});
  const CreateFileW=kernel32.func('__stdcall','CreateFileW','void *',['str16','uint32','uint32','void *','uint32','uint32','void *']);
  const GetFileInformationByHandle=kernel32.func(`bool __stdcall GetFileInformationByHandle(void *handle,_Out_ ${structPrefix}BY_HANDLE_FILE_INFORMATION *info)`);
  const GetFileInformationByHandleEx=kernel32.func(`bool __stdcall GetFileInformationByHandleEx(void *handle,int infoClass,_Out_ ${basicInfoName} *info,uint32 size)`);
  const CloseHandle=kernel32.func('__stdcall','CloseHandle','bool',['void *']);
  const GetLastError=kernel32.func('__stdcall','GetLastError','uint32',[]);
  const NtOpenFile=ntdll.func(`int32 __stdcall NtOpenFile(_Out_ void **FileHandle,uint32 DesiredAccess,${objectAttributesName} *ObjectAttributes,_Out_ ${ioStatusBlockName} *IoStatusBlock,uint32 ShareAccess,uint32 OpenOptions)`);
  const SetFilePointerEx=kernel32.func('__stdcall','SetFilePointerEx','bool',['void *','int64','void *','uint32']);
  const ReadFile=kernel32.func('bool __stdcall ReadFile(void *handle,_Out_ uint8_t *buffer,uint32 requested,_Out_ uint32_t *read,void *overlapped)');

  const status=(message:string)=>Error(`${message}:win32=${GetLastError()}`);
  const close=(handle:bigint)=>{if(!CloseHandle(handle))throw status('SECURE_FILE_CLOSE_FAILED');};
  const stat=(handle:bigint):SecureFileStat=>{
    const info:any={},basic:any={};
    if(!GetFileInformationByHandle(handle,info)||!GetFileInformationByHandleEx(handle,0,basic,koffi.sizeof(FILE_BASIC_INFO)))throw status('SECURE_FILE_STAT_FAILED');
    const attributes=Number(info.attributes),isReparse=(attributes&0x400)!==0,isDirectory=(attributes&0x10)!==0;
    return{
      dev:BigInt(info.volume),ino:joinWords(Number(info.indexHigh),Number(info.indexLow)),
      birthtimeNs:fileTimeToNs(BigInt(basic.creation)),ctimeNs:fileTimeToNs(BigInt(basic.change)),mtimeNs:fileTimeToNs(BigInt(basic.write)),
      size:joinWords(Number(info.sizeHigh),Number(info.sizeLow)),nlink:BigInt(info.links),
      kind:isReparse?'reparse':isDirectory?'directory':(attributes&0x40)!==0?'other':'file',
    };
  };
  const openRoot=(root:string):bigint=>{
    const handle=CreateFileW(path.toNamespacedPath(root),0x0001|0x0080|0x00100000,0x1|0x2|0x4,null,3,0x02000000|0x00200000,null);
    if(isInvalidHandle(handle))throw status('SECURE_WORKSPACE_OPEN_FAILED');
    try{const current=stat(handle);if(current.kind==='reparse'||current.kind!=='directory')throw Error('SECURE_WORKSPACE_TYPE_REJECTED');return handle;}
    catch(error){try{close(handle);}catch{}throw error;}
  };
  const openRelative=(parent:bigint,name:string,directory:boolean):bigint=>{
    const objectName={Length:name.length*2,MaximumLength:name.length*2,Buffer:name};
    const attributes={Length:koffi.sizeof(OBJECT_ATTRIBUTES),RootDirectory:parent,ObjectName:objectName,Attributes:0x40,SecurityDescriptor:null,SecurityQualityOfService:null};
    const output=[null],ioStatus:any={};
    const access=directory?(0x1|0x80|0x00100000):(0x80000000|0x80|0x00100000);
    // Sharing delete/write is required so the Gateway detects and denies
    // concurrent replacements or edits instead of changing their semantics.
    // The retained handle still pins the exact object while name-based checks
    // reopen each path component relative to the held workspace handle.
    const share=0x1|0x2|0x4;
    const options=0x00200000|(directory?0x1:0x40)|0x20;
    const result=NtOpenFile(output,access,attributes,ioStatus,share,options);
    const handle=output[0] as bigint|null;
    if(result<0||isInvalidHandle(handle))throw Error(`SECURE_RELATIVE_OPEN_FAILED:ntstatus=0x${(result>>>0).toString(16)}`);
    return handle!;
  };
  const readAt=(handle:bigint,offset:number,length:number)=>{
    if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(length)||length<0||length>65_536||offset+length>65_536)throw Error('SECURE_FILE_READ_RANGE_INVALID');
    const buffer=Buffer.alloc(length);
    if(length===0)return buffer;
    try{
      if(!SetFilePointerEx(handle,BigInt(offset),null,0))throw status('SECURE_FILE_SEEK_FAILED');
      const bytesRead=[null];
      if(!ReadFile(handle,buffer,length,bytesRead,null))throw status('SECURE_FILE_READ_FAILED');
      const count=Number(bytesRead[0]);
      if(!Number.isInteger(count)||count<0||count>length)throw Error('SECURE_FILE_READ_COUNT_INVALID');
      return buffer.subarray(0,count);
    }catch(error){buffer.fill(0);throw error;}
  };
  return{stat,close,openRoot,openRelative,readAt};
})();

const posix=(()=>{
  if(!isPosix)return undefined;
  const libc=koffi.load(process.platform==='darwin'?'/usr/lib/libSystem.B.dylib':'libc.so.6');
  const openat=libc.func('int openat(int dirfd,const char *pathname,int flags,int mode)');
  const closeOnExec=process.platform==='darwin'?0x01000000:0x00080000;
  const directoryFlags=fs.constants.O_RDONLY|fs.constants.O_DIRECTORY|fs.constants.O_NOFOLLOW|closeOnExec;
  const fileFlags=fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK|closeOnExec;
  if(!Number.isInteger(fs.constants.O_DIRECTORY)||!Number.isInteger(fs.constants.O_NOFOLLOW))throw Error('SECURE_FILE_NOFOLLOW_UNAVAILABLE');
  const mountId=(fd:number):bigint|undefined=>{
    if(process.platform!=='linux')return undefined;
    let info:string;
    try{info=fs.readFileSync(`/proc/self/fdinfo/${fd}`,'utf8');}catch{throw Error('SECURE_MOUNT_ID_UNAVAILABLE');}
    const match=/^mnt_id:\s*(\d+)\s*$/m.exec(info);
    if(!match)throw Error('SECURE_MOUNT_ID_UNAVAILABLE');
    return BigInt(match[1]);
  };
  const open=(parent:number,name:string,flags:number)=>{
    const fd=openat(parent,name,flags,0);
    if(!Number.isInteger(fd)||fd<0)throw Error('SECURE_RELATIVE_OPEN_FAILED');
    return fd;
  };
  const stat=(fd:number):SecureFileStat=>{
    const s=fs.fstatSync(fd,{bigint:true});
    return{dev:s.dev,ino:s.ino,birthtimeNs:s.birthtimeNs,ctimeNs:s.ctimeNs,mtimeNs:s.mtimeNs,size:s.size,nlink:s.nlink,kind:s.isDirectory()?'directory':s.isFile()?'file':'other'};
  };
  return{directoryFlags,fileFlags,open,stat,mountId};
})();

function components(relativePath:string):string[]{
  if(typeof relativePath!=='string'||!relativePath||relativePath.includes('\0')||relativePath.includes(':')||relativePath.startsWith('/')||relativePath.includes('\\'))throw Error('SECURE_RELATIVE_PATH_INVALID');
  const parts=relativePath.split('/');
  if(parts.some(part=>part===''||part==='.'||part==='..'))throw Error('SECURE_RELATIVE_PATH_INVALID');
  if(isWindows&&parts.some(part=>/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)))throw Error('SECURE_RELATIVE_PATH_INVALID');
  return parts;
}

export function openSecureWorkspace(rootPath:string):SecureDirectoryHandle{
  if(!path.isAbsolute(rootPath))throw Error('SECURE_WORKSPACE_PATH_INVALID');
  if(!isWindows&&!isPosix)throw Error('SECURE_FILE_PLATFORM_UNSUPPORTED');
  if(isWindows){
    const api=windows!,handle=api.openRoot(rootPath);let closed=false;
    return{
      stat(){if(closed)throw Error('SECURE_WORKSPACE_CLOSED');return api.stat(handle);},
      openFile(relativePath){
        if(closed)throw Error('SECURE_WORKSPACE_CLOSED');
        const parts=components(relativePath);let parent=handle,ownedParent:bigint|undefined,file:bigint|undefined;
        try{
          for(const part of parts.slice(0,-1)){
            const next=api.openRelative(parent,part,true);
            if(ownedParent!==undefined){api.close(ownedParent);ownedParent=undefined;}
            ownedParent=next;parent=next;
            const s=api.stat(next);if(s.kind!=='directory')throw Error('SECURE_PATH_COMPONENT_REJECTED');
          }
          file=api.openRelative(parent,parts.at(-1)!,false);
          const s=api.stat(file);if(s.kind!=='file'){api.close(file);file=undefined;throw Error('SECURE_FILE_TYPE_REJECTED');}
          const opened=file;file=undefined;
          let fileClosed=false;
          return{
            stat(){if(fileClosed)throw Error('SECURE_FILE_CLOSED');return api.stat(opened);},
            readAt(offset,length){if(fileClosed)throw Error('SECURE_FILE_CLOSED');return api.readAt(opened,offset,length);},
            close(){if(fileClosed)return;fileClosed=true;api.close(opened);},
          };
        }finally{
          if(file!==undefined)try{api.close(file);}catch{}
          if(ownedParent!==undefined)try{api.close(ownedParent);}catch{}
        }
      },
      close(){if(closed)return;closed=true;api.close(handle);},
    };
  }

  const api=posix!,rootFd=api.open(atFdcwd,rootPath,api.directoryFlags);let identity:SecureFileStat,rootMountId:bigint|undefined,closed=false;
  try{
    identity=api.stat(rootFd);
    if(identity.kind!=='directory')throw Error('SECURE_WORKSPACE_TYPE_REJECTED');
    rootMountId=api.mountId(rootFd);
  }catch(error){try{fs.closeSync(rootFd);}catch{}throw error;}
  const staysOnWorkspaceMount=(fd:number,stat:SecureFileStat)=>stat.dev===identity.dev&&
    (rootMountId===undefined||api.mountId(fd)===rootMountId);
  return{
    stat(){if(closed)throw Error('SECURE_WORKSPACE_CLOSED');return api.stat(rootFd);},
    openFile(relativePath){
      if(closed)throw Error('SECURE_WORKSPACE_CLOSED');
      const parts=components(relativePath),parents:number[]=[];let parent=rootFd,fileFd:number|undefined;
      try{
        for(const part of parts.slice(0,-1)){
          const next=api.open(parent,part,api.directoryFlags);parents.push(next);parent=next;
          const nextStat=api.stat(next);
          if(nextStat.kind!=='directory')throw Error('SECURE_PATH_COMPONENT_REJECTED');
          if(!staysOnWorkspaceMount(next,nextStat))throw Error('SECURE_MOUNT_CROSSING_REJECTED');
        }
        const opened=api.open(parent,parts.at(-1)!,api.fileFlags);fileFd=opened;
        const s=api.stat(opened);if(s.kind!=='file'){fs.closeSync(opened);fileFd=undefined;throw Error('SECURE_FILE_TYPE_REJECTED');}
        if(!staysOnWorkspaceMount(opened,s))throw Error('SECURE_MOUNT_CROSSING_REJECTED');
        fileFd=undefined;let fileClosed=false;
        return{
          stat(){if(fileClosed)throw Error('SECURE_FILE_CLOSED');return api.stat(opened);},
          readAt(offset,length){
            if(fileClosed)throw Error('SECURE_FILE_CLOSED');
            if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(length)||length<0||length>65_536||offset+length>65_536)throw Error('SECURE_FILE_READ_RANGE_INVALID');
            const buffer=Buffer.alloc(length);if(length===0)return buffer;
            try{const count=fs.readSync(opened,buffer,0,length,offset);return buffer.subarray(0,count);}
            catch(error){buffer.fill(0);throw error;}
          },
          close(){if(fileClosed)return;fileClosed=true;fs.closeSync(opened);},
        };
      }finally{
        if(fileFd!==undefined)try{fs.closeSync(fileFd);}catch{}
        for(const fd of parents.reverse())try{fs.closeSync(fd);}catch{}
      }
    },
    close(){if(closed)return;closed=true;fs.closeSync(rootFd);},
  };
}
