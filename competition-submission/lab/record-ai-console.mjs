/** Record the actually running isolated Chromium console, not slide animation.
 * Requires already installed Playwright/Chrome/FFmpeg. No download or paid API.
 * Subtitles are authored explanations; model outputs and Guard logs are real.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { startAIConsole } from '../../dist/ai/console.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ai-live-video-'));
const app=await startAIConsole({port:0,eventsFile:path.join(temp,'events.jsonl')});
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const context=await browser.newContext({viewport:{width:1920,height:1080},recordVideo:{dir:temp,size:{width:1920,height:1080}}});
const page=await context.newPage();const video=page.video();
const start=Date.now(),scenes=[];let analysis,failed=false;
function stamp(ms){const h=Math.floor(ms/3600000),m=Math.floor(ms/60000)%60,s=Math.floor(ms/1000)%60;return [h,m,s].map(v=>String(v).padStart(2,'0')).join(':')+','+String(ms%1000).padStart(3,'0');}
async function caption(text,holdMs=0){
  const at=Date.now()-start;scenes.push({at,text});
  await page.evaluate(text=>{let box=document.querySelector('#video-caption');if(!box){box=document.createElement('div');box.id='video-caption';box.style.cssText='position:fixed;left:0;right:0;bottom:0;padding:20px 60px;background:#061020f2;color:#e8edf7;font:22px/1.65 Microsoft YaHei,system-ui;z-index:999;border-top:1px solid #55d6be;white-space:pre-wrap';document.body.style.paddingBottom='160px';document.body.append(box);}box.textContent=text;},text);
  if(holdMs)await page.waitForTimeout(holdMs);
}
try{
  await page.goto(app.url);await page.waitForFunction(()=>document.querySelector('#preset').options.length===9);
  await caption('Agent Canary AI 增强版｜实际运行的隔离 Chromium 控制台录像\nAI 提供建议，确定性 Guard 决定执行；本视频不使用生产数据或付费云端。',25000);
  await caption('多协议 Adapter 支持 OpenAI、Claude、Gemini 与兼容接口。\n本轮真实连通的是已有 Ollama / Qwen 9B；云端只有模拟协议测试。');
  await page.locator('#connect').click();await page.waitForFunction(()=>document.querySelector('#connection').textContent.includes('连接正常'));await page.waitForTimeout(25000);
  await caption('运行离线隔离演示：程序主动触发虚拟 Canary 信号。\n这不是 LLM 自主检测；下方显示实际 Guard 日志和 callback 拒绝。');
  await page.locator('#demo').click();await page.waitForFunction(()=>document.querySelector('#demoResult').textContent.includes('QUARANTINED'));await page.waitForTimeout(30000);
  await caption('选择明确标注的虚拟恶意 README，检查实际输入后调用真实本地模型。\n模型不能执行工具、改变策略或解除隔离。');
  await page.locator('#sample').click();await page.waitForFunction(()=>!document.querySelector('#analyze').disabled);
  await page.locator('#analyze').click();await page.waitForFunction(()=>document.querySelector('#analysisStatus').textContent.includes('ollama ·'),{timeout:180000});
  analysis=await page.locator('#analysis').innerText();if(!analysis.includes('分析建议：'))throw new Error('Actual model analysis failed');await page.waitForTimeout(25000);
  await caption('这里只显示本次模型实际返回的建议、原文来源、耗时和 Tokens。\n模型可以判断错误；confidence 未校准，AI 分析成功不等于攻击检测成功。');
  await page.locator('#analysis').evaluate(el=>el.scrollIntoView({block:'start'}));await page.waitForTimeout(25000);
  await caption('保存的真实 Agent A/B/C 试验：模型自主选工具，所有执行器为虚拟。\n最新 neutral 组攻击成功 A 1/10、B 2/10、C 2/10；模型诱饵采用 0/20。');
  await page.locator('#comparison').evaluate(el=>el.scrollIntoView({block:'start'}));await page.waitForTimeout(25000);
  await caption('没有信号时，C 组 5 个危险 mock callback 仍执行，阻断 0/5。\n预置隔离后的 C 跟进阻止 1/1，不能计为模型检测。');await page.waitForTimeout(20000);
  await caption('首次危险调用、绕过 Guard 和已开始的外部效果不受完整保护。\nMIT 开源｜github.com/DorianChn/shanchuanzhi-agent-canary｜竞赛分支 / Draft PR #22');
  await page.locator('footer').scrollIntoViewIfNeeded();await page.waitForTimeout(15000);
}catch(e){failed=true;fs.writeFileSync(path.join(root,'competition-submission/evidence/ai-video-failure.json'),JSON.stringify({error:e.message,scenes},null,2));throw e;}
finally{
  const durationMs=Date.now()-start;
  await context.close();await browser.close();await app.close();
  if(!failed){
    const webm=await video.path();const output=path.join(root,'competition-submission/Agent_Canary_AI_Demo.mp4');
    execFileSync(process.env.FFMPEG_PATH||'ffmpeg.exe',['-y','-i',webm,'-an','-vf','fps=15','-c:v','libx264','-preset','medium','-crf','28','-pix_fmt','yuv420p','-movflags','+faststart',output],{stdio:'ignore',windowsHide:true});
    const probe=JSON.parse(execFileSync(process.env.FFPROBE_PATH||path.join(path.dirname(process.env.FFMPEG_PATH||'ffmpeg.exe'),'ffprobe.exe'),['-v','error','-show_entries','format=duration','-of','json',output],{encoding:'utf8',windowsHide:true}));
    const encodedDurationMs=Math.round(Number(probe.format.duration)*1000);
    const srt=scenes.map((s,i)=>(i+1)+'\n'+stamp(s.at)+' --> '+stamp(scenes[i+1]?.at??encodedDurationMs)+'\n'+s.text+'\n').join('\n');
    fs.writeFileSync(path.join(root,'competition-submission/Agent_Canary_AI_实录字幕.srt'),srt);
    fs.writeFileSync(path.join(root,'competition-submission/evidence/ai-video-recording.json'),JSON.stringify({generatedAt:new Date().toISOString(),mode:'REAL_RUNNING_CHROMIUM_UI_RECORDING_NOT_OS_DESKTOP',model:'qwen3.5-9b-local:latest',realLocalAnalysis:analysis,virtualToolsOnly:true,cloudRequests:0,audio:'none; visible Chinese explanatory subtitles',width:1920,height:1080,durationMs:encodedDurationMs,captureSessionDurationMs:durationMs,bytes:fs.statSync(output).size,scenes},null,2));
    console.log(JSON.stringify({output,bytes:fs.statSync(output).size,durationMs}));
  }
  fs.rmSync(temp,{recursive:true,force:true});
}
