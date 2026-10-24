import fs from 'node:fs';import path from 'node:path';import {pathToFileURL}from'node:url';
import{chromium}from'file:///C:/Users/36712/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const video=path.resolve('competition-submission/3.0-final-video/Agent_Canary_3_0_Competition_Demo_1080p.webm');
const player=path.resolve('security-lab/competition-freeze/local-video-player.html');
fs.writeFileSync(player,'<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#071222}video{width:1920px;height:1080px}</style><video controls preload="auto" src="'+pathToFileURL(video).href+'"></video>');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),page=await browser.newPage({viewport:{width:1920,height:1080}});
try{
 await page.goto(pathToFileURL(player).href);await page.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
 const media=await page.evaluate(()=>{const v=document.querySelector('video');return{durationSeconds:v.duration,width:v.videoWidth,height:v.videoHeight,readyState:v.readyState,error:v.error?.message??null};});
 for(const t of[35,65,110,145,180]){
  await page.evaluate(t=>{document.querySelector('video').currentTime=t;},t);await page.waitForFunction(t=>Math.abs(document.querySelector('video').currentTime-t)<.5&&!document.querySelector('video').seeking,t);await page.waitForTimeout(100);await page.screenshot({path:'security-lab/competition-freeze/pdf-qa/final-video-'+t+'s.png'});
 }
 await page.evaluate(()=>document.querySelector('video').play());await page.waitForTimeout(700);media.playbackAdvanced=await page.evaluate(()=>document.querySelector('video').currentTime>180.1);
 fs.writeFileSync('security-lab/competition-freeze/video-media-check.json',JSON.stringify(media,null,2)+'\n');console.log(JSON.stringify(media));
 if(media.width!==1920||media.height!==1080||media.error||!media.playbackAdvanced)throw Error('MEDIA_CHECK_FAILED');
}finally{await browser.close();}
