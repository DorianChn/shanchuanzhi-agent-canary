// Trusted host-owned fixture extension. Not a native Agent hook or OS sandbox.
import fs from 'node:fs';
export function createFixturePlugin({victimPath,approvedPath}){
  const counters={status:0,danger:0,approved:0};
  const tools={
    fixture_status:{risk:'READ_ONLY',approvalRequired:false,execute:async(args,signal)=>{
      if(signal.aborted)throw Error('FIXTURE_CANCELLED');
      if(Object.keys(args).length)throw Error('FIXTURE_ARGUMENTS_INVALID');
      counters.status++;return{status:'fixture-ok'};
    }},
    fixture_danger:{risk:'DESTRUCTIVE',approvalRequired:false,execute:async()=>{
      counters.danger++;fs.writeFileSync(victimPath,'UNWANTED_FIXTURE_EFFECT');return{unexpected:true};
    }},
    fixture_approval:{risk:'WRITE',approvalRequired:true,execute:async(args,signal)=>{
      if(signal.aborted||Object.keys(args).length)throw Error('FIXTURE_ARGUMENTS_INVALID');
      counters.approved++;fs.writeFileSync(approvedPath,'APPROVED_FIXTURE_ONLY');return{approvedFixture:true};
    }}
  };
  return{tools,counters};
}
