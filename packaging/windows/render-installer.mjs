import path from 'node:path';

const escapeNsisPath=value=>path.resolve(value).replaceAll('/','\\').replaceAll('$','$$');
const relativePath=value=>{
  if(typeof value!=='string'||!value||value.includes('\\')||value.includes(':')||path.posix.isAbsolute(value)||value.split('/').some(part=>!part||part==='.'||part==='..'))throw Error('INSTALLER_PAYLOAD_PATH_INVALID');
  return value.replaceAll('/','\\');
};

export function renderInstallerScript({source,output,payload,license,anchor,candidateNumber,ownedFiles,directories}){
  if(typeof source!=='string'||!/^[a-f0-9]{64}$/.test(anchor??'')||!/^([1-9][0-9]*)$/.test(String(candidateNumber))||!Array.isArray(ownedFiles)||!Array.isArray(directories))throw Error('INSTALLER_TEMPLATE_INPUT_INVALID');
  const label=`candidate.${candidateNumber}`;
  let script=source
    .replaceAll('candidate.3',label)
    .replaceAll('Candidate3',`Candidate${candidateNumber}`)
    .replaceAll('Agent Canary Community.lnk',`Agent Canary Community ${label}.lnk`)
    .replaceAll('$SMPROGRAMS\\Agent Canary Community',`$SMPROGRAMS\\Agent Canary Community ${label}`);
  const startMenu=`$SMPROGRAMS\\Agent Canary Community ${label}`;
  const desktopShortcut=`$DESKTOP\\Agent Canary Community ${label}.lnk`;
  const registryKey=`Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\AgentCanaryCommunityCandidate${candidateNumber}`;
  const deleteLines=ownedFiles.map(file=>` Delete "$INSTDIR\\${relativePath(file)}"`).join('\n');
  const directoryLines=[...directories].sort((a,b)=>b.split('/').length-a.split('/').length).map(dir=>` RMDir "$INSTDIR\\${relativePath(dir)}"`).join('\n');
  const reparseChecks=[...directories,''].map(dir=>{
    const target='$INSTDIR'+(dir?'\\'+relativePath(dir):'');
    return ` System::Call 'kernel32::GetFileAttributesW(w "${target}") i.r0'\n IntOp $1 $0 & 0x400\n \${If} $0 != -1\n \${AndIf} $1 != 0\n  MessageBox MB_ICONSTOP "Redirected directory rejected; no files deleted / 目录被重定向，拒绝卸载删除。"\n  Abort\n \${EndIf}`;
  }).join('\n');
  const startMenuReparseCheck=` System::Call 'kernel32::GetFileAttributesW(w "${startMenu}") i.r0'\n IntOp $1 $0 & 0x400\n \${If} $0 != -1\n \${AndIf} $1 != 0\n  MessageBox MB_ICONSTOP "Redirected Start Menu folder rejected; no files deleted / 开始菜单目录被重定向，拒绝卸载删除。"\n  Abort\n \${EndIf}`;
  const rollbackReparseChecks=[...directories,''].map(dir=>{
    const target='$INSTDIR'+(dir?'\\'+relativePath(dir):'');
    return ` System::Call 'kernel32::GetFileAttributesW(w "${target}") i.r0'\n IntOp $1 $0 & 0x400\n \${If} $0 != -1\n \${AndIf} $1 != 0\n  StrCpy $2 1\n \${EndIf}`;
  }).concat(` System::Call 'kernel32::GetFileAttributesW(w "${startMenu}") i.r0'\n IntOp $1 $0 & 0x400\n \${If} $0 != -1\n \${AndIf} $1 != 0\n  StrCpy $2 1\n \${EndIf}`).join('\n');
  const values={
    OUTPUT:escapeNsisPath(output),PAYLOAD:escapeNsisPath(payload),LICENSE:escapeNsisPath(license),ANCHOR:anchor,
    DELETE:deleteLines,RMDIR:directoryLines,ROLLBACK_DELETE:deleteLines,ROLLBACK_RMDIR:directoryLines,
    REPARSE_CHECKS:reparseChecks+'\n'+startMenuReparseCheck,ROLLBACK_REPARSE_CHECKS:rollbackReparseChecks,START_MENU:startMenu,DESKTOP_SHORTCUT:desktopShortcut,REGISTRY_KEY:registryKey,
    PRODUCT_NAME:`Agent Canary Community ${label}`,PRODUCT_VERSION:`3.0.0-competition-${label}`
  };
  for(const [name,value] of Object.entries(values))script=script.replaceAll(`__${name}__`,value);
  if(/__[A-Z_]+__/.test(script))throw Error('INSTALLER_TEMPLATE_PLACEHOLDER_UNRESOLVED');
  return '\uFEFF'+script;
}
