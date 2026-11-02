type SyntheticDecoyGatewayFile = Readonly<{path:string;decoyId:string;sensitive:true}>;
type SyntheticDecoyProof = Readonly<{root:string;path:string;decoyId:string;content:string}>;

const issuedSyntheticDecoys=new WeakMap<object,SyntheticDecoyProof>();

/** Only HoneypotRuntime can issue a descriptor that M1 may exempt from sensitive-path denial. */
export function issueSyntheticDecoyGatewayFile(root:string,path:string,decoyId:string,content:string):SyntheticDecoyGatewayFile{
  const descriptor=Object.freeze({path,decoyId,sensitive:true as const});
  issuedSyntheticDecoys.set(descriptor,{root,path,decoyId,content});
  return descriptor;
}

/** File descriptors are capabilities by object identity; copying their visible fields cannot forge one. */
export function getSyntheticDecoyGatewayFileProof(value:unknown,root:string):SyntheticDecoyProof|undefined{
  try{
    if(!value||typeof value!=='object')return undefined;
    const proof=issuedSyntheticDecoys.get(value);
    if(!proof||proof.root!==root)return undefined;
    return proof;
  }catch{return undefined;}
}
