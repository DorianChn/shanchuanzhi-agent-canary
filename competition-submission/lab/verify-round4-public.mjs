import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const commit=process.argv.find(a=>/^[a-f0-9]{40}$/.test(a));if(!commit)throw Error('Provide immutable material commit');
const repo='DorianChn/shanchuanzhi-agent-canary',base='https://raw.githubusercontent.com/'+repo+'/'+commit+'/competition-submission/';
const results={verifiedAt:new Date().toISOString(),materialCommit:commit,repository:'https://github.com/'+repo,files:[]};
for(const name of ['Agent_Canary_Round4_Demo.mp4','Agent_Canary_Round4_项目介绍.pdf','Agent_Canary_Round4_实验报告.pdf','Agent_Canary_Competition_V1.zip']){
 const url=base+encodeURIComponent(name),response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(45000)});if(response.status!==200)throw Error('Public HTTP status '+response.status);
 const bytes=Buffer.from(await response.arrayBuffer());const sha=createHash('sha256').update(bytes).digest('hex'),local=createHash('sha256').update(fs.readFileSync(path.join(root,'competition-submission',name))).digest('hex');if(sha!==local)throw Error('Public hash mismatch');
 results.files.push({name,url,httpStatus:response.status,bytes:bytes.length,sha256:sha,contentType:response.headers.get('content-type'),localHashMatches:true});
}
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
try{const page=await browser.newPage({viewport:{width:1280,height:800}});const videoURL=results.files[0].url;await page.setContent('<html lang="zh-CN"><body style="background:#0b1528;color:#e8edf7;font:18px system-ui"><h1>公开不可变链接播放验证</h1><video id="v" controls muted preload="auto" style="width:1100px"></video></body></html>');
 await page.evaluate(url=>document.querySelector('#v').src=url,videoURL);await page.waitForFunction(()=>{const v=document.querySelector('#v');return v.readyState>=3&&v.duration>180;},{timeout:60000});
 await page.evaluate(()=>document.querySelector('#v').play());await page.waitForTimeout(1200);const playback=await page.evaluate(()=>{const v=document.querySelector('#v');return{duration:v.duration,currentTime:v.currentTime,paused:v.paused,readyState:v.readyState,error:v.error?.code??null};});if(playback.paused||playback.currentTime<=0||playback.error)throw Error('Public playback failed');
 await page.evaluate(()=>{const v=document.querySelector('#v');v.pause();v.currentTime=180;});await page.waitForFunction(()=>{const v=document.querySelector('#v');return !v.seeking&&v.readyState>=3&&Math.abs(v.currentTime-180)<1;},{timeout:60000});await page.screenshot({path:path.join(root,'competition-submission/evidence/round4-public-playback.png')});results.publicPlayback={status:'VERIFIED',...playback,seekSeconds:180,method:'Actual Chromium loaded, played and sought the public immutable HTTPS MP4; not merely a download test'};
}finally{await browser.close();}
fs.writeFileSync(path.join(root,'competition-submission/evidence/round4-public-delivery.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({commit,httpFiles:results.files.length,publicPlayback:results.publicPlayback.status}));
