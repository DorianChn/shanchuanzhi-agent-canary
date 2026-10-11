import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),commit=process.argv.find(a=>/^[a-f0-9]{40}$/.test(a));if(!commit)throw Error('Immutable material commit required');
const repo='DorianChn/shanchuanzhi-agent-canary',base='https://raw.githubusercontent.com/'+repo+'/'+commit+'/competition-submission/',e=path.join(root,'competition-submission/evidence');
const result={verifiedAt:new Date().toISOString(),materialCommit:commit,files:[]};
for(const name of ['Agent_Canary_2_0_Demo.mp4','Agent_Canary_2_0_项目介绍.pdf','Agent_Canary_2_0_技术创新.pdf','Agent_Canary_2_0_真实模型实验.pdf','Agent_Canary_Competition_2_0.zip']){
 const url=base+encodeURIComponent(name),r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(45_000)});if(r.status!==200)throw Error('PUBLIC_HTTP_'+r.status);
 const bytes=Buffer.from(await r.arrayBuffer()),sha=createHash('sha256').update(bytes).digest('hex'),local=createHash('sha256').update(fs.readFileSync(path.join(root,'competition-submission',name))).digest('hex');if(sha!==local)throw Error('PUBLIC_HASH_MISMATCH');result.files.push({name,url,httpStatus:r.status,sha256:sha,bytes:bytes.length,localHashMatches:true});console.log(JSON.stringify({verifiedPublicFile:name,bytes:bytes.length}));fs.writeFileSync(path.join(e,'v2-public-downloads.json'),JSON.stringify(result,null,2));
}
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright'),browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
let page;
try{
 page=await browser.newPage({viewport:{width:1280,height:800}});
 await page.setContent('<html lang="zh-CN"><body style="background:#0b1528;color:white;font:18px system-ui"><h1>Agent Canary 2.0 公开不可变视频播放验证</h1><video id="v" controls muted preload="auto" style="width:1100px"></video></body></html>');
 await page.evaluate(url=>document.querySelector('#v').src=url,result.files[0].url);
 await page.waitForFunction(()=>{const v=document.querySelector('#v');return v.readyState>=3&&v.duration>180;},null,{timeout:60_000});
 await page.evaluate(()=>document.querySelector('#v').play());await page.waitForTimeout(1400);
 const state=await page.evaluate(()=>{const v=document.querySelector('#v');return{duration:v.duration,currentTime:v.currentTime,paused:v.paused,error:v.error?.code??null};});
 if(state.paused||state.currentTime<=0||state.error)throw Error('PUBLIC_PLAYBACK_FAILED');
 result.publicPlayback={status:'INITIAL_PLAYBACK_VERIFIED',...state};
 fs.writeFileSync(path.join(e,'v2-public-downloads.json'),JSON.stringify(result,null,2));
 // Verify moving decoded frames after a distant seek; paused readyState need not be HAVE_FUTURE_DATA.
 await page.evaluate(async()=>{const v=document.querySelector('#v');v.currentTime=180;await Promise.race([v.play(),new Promise((_,reject)=>setTimeout(()=>reject(Error('MEDIA_PLAY_REQUEST_TIMEOUT')),90_000))]);});
 await page.waitForFunction(()=>{const v=document.querySelector('#v');return !v.seeking&&!v.paused&&!v.error&&v.readyState>=2&&v.currentTime>180.5;},null,{timeout:60_000});
 const seekPlayback=await page.evaluate(()=>{const v=document.querySelector('#v');v.pause();return{currentTime:v.currentTime,readyState:v.readyState,seeking:v.seeking,error:v.error?.code??null};});
 await page.screenshot({path:path.join(e,'v2-public-playback.png')});
 result.publicPlayback={status:'VERIFIED',...state,seekSeconds:180,seekPlayback,method:'Actual Chromium streamed the immutable public file, initial play advanced, then seek-to-180 playback advanced past 180.5 seconds'};
}catch(error){
 result.playbackFailure={error:String(error),media:page?await page.evaluate(()=>{const v=document.querySelector('#v');return v?{currentTime:v.currentTime,readyState:v.readyState,seeking:v.seeking,paused:v.paused,error:v.error?.code??null}:null;}):null};
 fs.writeFileSync(path.join(e,'v2-public-playback-failure.json'),JSON.stringify(result,null,2));throw error;
}finally{await browser.close();}
fs.writeFileSync(path.join(e,'v2-public-delivery.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({publicFiles:result.files.length,playback:result.publicPlayback.status}));
