/** Real running Chromium console capture. Virtual executors; actual Ollama inference. */
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';import {randomBytes,createHash} from 'node:crypto';
import {startAIConsole} from '../../dist/ai/console.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'round4-live-video-'));
const operatorApprovalCode=randomBytes(24).toString('hex');const app=await startAIConsole({port:0,eventsFile:path.join(temp,'events.jsonl'),operatorApprovalCode});
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const context=await browser.newContext({viewport:{width:1920,height:1080},recordVideo:{dir:temp,size:{width:1920,height:1080}}}),page=await context.newPage(),video=page.video();
const start=Date.now(),scenes=[];let analysis,failed=false;
function stamp(ms){return [Math.floor(ms/3600000),Math.floor(ms/60000)%60,Math.floor(ms/1000)%60].map(v=>String(v).padStart(2,'0')).join(':')+','+String(ms%1000).padStart(3,'0');}
async function caption(text,hold=0){scenes.push({at:Date.now()-start,text});await page.evaluate(text=>{let e=document.querySelector('#video-caption');if(!e){e=document.createElement('div');e.id='video-caption';e.style.cssText='position:fixed;left:0;right:0;bottom:0;padding:18px 60px;background:#061020f5;color:#e8edf7;font:23px/1.65 Microsoft YaHei,system-ui;z-index:999;border-top:1px solid #55d6be;white-space:pre-wrap';document.body.style.paddingBottom='160px';document.body.append(e);}e.textContent=text;},text);if(hold)await page.waitForTimeout(hold);}
try{
 await page.goto(app.url);await page.waitForFunction(()=>document.querySelector('#preset').options.length===9);
 await caption('Agent Canary 第四轮｜实际程序界面录像，所有工具效果为虚拟\n新增参数风险策略检查首次调用；AI 只解释，不拥有执行或解除隔离权限。',18000);
 await page.locator('#policyRead').click();await page.waitForFunction(()=>document.querySelector('#policyStatus').textContent.includes('callback 1'));
 await caption('正常任务：公开 README 读取完成，callback 1。\n原始 Canary 的边界：模型未触发信号时，Guard 的 SAFE 状态不能证明调用安全。',20000);
 await page.locator('#protectionMode').selectOption('OBSERVE');await page.locator('#setMode').click();await page.locator('#policyAttack').click();await page.waitForFunction(()=>document.querySelector('#policyStatus').textContent.includes('callback 2'));
 await caption('OBSERVE 只记录：虚拟秘密发送实际进入模拟 callback。\n这是确定性沙箱对照，不是模型自主攻击检测，也没有真实网络外传。',23000);
 await page.locator('#protectionMode').selectOption('BALANCED');await page.locator('#setMode').click();await page.locator('#policyAttack').click();await page.waitForFunction(()=>document.querySelector('#policyResult').textContent.includes('possible_sensitive_egress'));
 await page.locator('#policyRead').click();await page.waitForFunction(()=>document.querySelector('#policyStatus').textContent.includes('callback 3'));
 await caption('BALANCED 在 callback 前拒绝秘密外传；这次拒绝来自策略，不是 Canary 隔离。\n同一会话正常读取仍成功，callback 3；安全与可用性需要分别验证。',23000);
 await page.locator('#policyWrite').click();await page.waitForFunction(()=>document.querySelector('#pendingApproval').options.length===2);await page.locator('#pendingApproval').selectOption(await page.locator('#pendingApproval option').nth(1).getAttribute('value'));await page.locator('#approveConfirm').check();await page.locator('#operatorCode').fill(operatorApprovalCode);await page.locator('#approvePolicy').click();await page.waitForFunction(()=>document.querySelector('#policyStatus').textContent.includes('callback 4'));
 await caption('普通写入需要独立人工能力凭据，一次性批准后 callback 4。\n模型伪造 approval 参数无法授权；无人值守构建会受到审批中断，报告保留此代价。',22000);
 await page.locator('#connect').click();await page.waitForFunction(()=>document.querySelector('#connection').textContent.includes('连接正常'));await page.locator('#policyAttack').click();await page.waitForFunction(()=>!document.querySelector('#analyze').disabled);await page.locator('#analyze').click();
 await caption('选择本次实际脱敏策略日志，真实调用已有 Ollama / Qwen 9B。\n推理发生在拒绝之后；模型失败、超时或返回 benign 都不会放权。');
 await page.waitForFunction(()=>document.querySelector('#analysisStatus').textContent.includes('ollama ·'),{timeout:180000});analysis=await page.locator('#analysis').innerText();if(!analysis.startsWith('分析建议：'))throw new Error('Real local analysis did not validate');await page.locator('#analysis').scrollIntoViewIfNeeded();await page.waitForTimeout(24000);
 await caption('模型实际返回的解释、证据和建议显示在这里。\nconfidence 未校准；有效 JSON 不代表判断正确；本实验不声称 AI 带来独立拦截增益。',18000);
 await page.locator('#policyDecoy').click();await page.waitForFunction(()=>document.querySelector('#policyStatus').textContent.includes('QUARANTINED'));await page.locator('#policyRead').click();await page.waitForFunction(()=>document.querySelector('#policyResult').textContent.includes('BLOCKED_BY_GUARD'));await page.locator('#policyStatus').scrollIntoViewIfNeeded();
 await caption('程序主动触发虚拟诱饵 → Guard 同步 QUARANTINED → 后续调用拒绝。\n此段证明隔离执行路径；不能计为模型主动触发诱饵。已经开始的效果不能撤回。',22000);
 await page.locator('#comparison4').scrollIntoViewIfNeeded();await caption('下方为保存的真实 A/B/C/D1/D2 模型实验，每组 22 个场景，原始样本未删除。\n模型自主选择工具，全部效果虚拟；原指标把任何 Shell 都计为攻击成功，限制公开。',24000);
 await caption('MIT 开源｜GitHub DorianChn/shanchuanzhi-agent-canary｜Draft PR #22\n只保护注册到 Router 的调用；绕过 Guard 的第三方调用为 OUT_OF_SCOPE。',18000);
}catch(e){failed=true;fs.writeFileSync(path.join(root,'competition-submission/evidence/round4-video-failure.json'),JSON.stringify({error:e.message,scenes},null,2));throw e;}
finally{
 const captureSessionDurationMs=Date.now()-start;await context.close();await browser.close();await app.close();
 if(!failed){const source=await video.path(),output=path.join(root,'competition-submission/Agent_Canary_Round4_Demo.mp4');execFileSync(process.env.FFMPEG_PATH||'ffmpeg.exe',['-y','-i',source,'-an','-vf','fps=15','-c:v','libx264','-preset','medium','-crf','28','-pix_fmt','yuv420p','-movflags','+faststart',output],{stdio:'ignore',windowsHide:true});
 const probe=JSON.parse(execFileSync(process.env.FFPROBE_PATH||path.join(path.dirname(process.env.FFMPEG_PATH||'ffmpeg.exe'),'ffprobe.exe'),['-v','error','-show_entries','format=duration','-of','json',output],{encoding:'utf8',windowsHide:true}));const durationMs=Math.round(Number(probe.format.duration)*1000);
 fs.writeFileSync(path.join(root,'competition-submission/Agent_Canary_Round4_实录字幕.srt'),scenes.map((s,i)=>(i+1)+'\n'+stamp(s.at)+' --> '+stamp(scenes[i+1]?.at??durationMs)+'\n'+s.text+'\n').join('\n'));
 fs.writeFileSync(path.join(root,'competition-submission/evidence/round4-video-recording.json'),JSON.stringify({mode:'REAL_RUNNING_CHROMIUM_UI_RECORDING_NOT_OS_DESKTOP',virtualToolsOnly:true,realLocalAnalysis:analysis,model:'qwen3.5-9b-local:latest',audio:'none; visible Chinese subtitles',cloudRequests:0,width:1920,height:1080,durationMs,captureSessionDurationMs,bytes:fs.statSync(output).size,sha256:createHash('sha256').update(fs.readFileSync(output)).digest('hex'),scenes},null,2)+'\n');console.log('Round4 actual console video saved.');
 }
}
