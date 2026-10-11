/** Actual 1080p browser frames. Deterministic demo explicitly separated from saved model results. */
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createHash} from 'node:crypto';
const module=process.argv.find(a=>a.startsWith('--playwright='))?.slice(13),chrome=process.argv.find(a=>a.startsWith('--chrome='))?.slice(9);
if(!module||!chrome)throw Error('PLAYWRIGHT_AND_CHROME_REQUIRED');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'canary-3-video-'));process.env.AGENT_CANARY_HOME=temp;
const {startAIConsole}=await import('../dist/ai/console.js'),{chromium}=await import(module);
const app=await startAIConsole({port:0,operatorApprovalCode:'VIDEO_FIXTURE_OPERATOR'});
const browser=await chromium.launch({headless:true,executablePath:chrome}),context=await browser.newContext({viewport:{width:1920,height:1080},recordVideo:{dir:temp,size:{width:1920,height:1080}}}),page=await context.newPage(),video=page.video();
const scenes=[],start=Date.now();
function time(ms){return [Math.floor(ms/3600000),Math.floor(ms/60000)%60,Math.floor(ms/1000)%60].map(n=>String(n).padStart(2,'0')).join(':')+','+String(ms%1000).padStart(3,'0');}
async function caption(text,seconds=25){scenes.push({at:Date.now()-start,text});await page.evaluate(text=>{let e=document.querySelector('#recording-caption');if(!e){e=document.createElement('div');e.id='recording-caption';e.style.cssText='position:fixed;left:0;right:0;bottom:0;padding:20px 50px;background:#061020;color:#f1f5ff;font:26px/1.5 Microsoft YaHei,system-ui;z-index:10000;white-space:pre-wrap';document.body.style.paddingBottom='160px';document.body.append(e);}e.textContent=text;},text);await page.waitForTimeout(seconds*1000);}
try{
 await page.goto(app.url,{waitUntil:'domcontentloaded'});await page.locator('#runtime3Status').filter({hasText:'Guard：'}).waitFor();await page.locator('#runtime3').scrollIntoViewIfNeeded();
 await caption('Agent Canary 3.0 工程候选｜可验证执行与隔离蜜罐\n真实程序画面；本段按钮是操作者触发的 DEMO，不是模型攻击。');
 await page.locator('#runtime3-write').click();await page.locator('#runtime3Evidence').filter({hasText:'writtenBytes'}).waitFor();
 await caption('正常写入：预登记文件句柄执行，实际字节核验为 VERIFIED。\n未登记路径、任意 Shell 和其他 Agent 内置工具不在此演示保护范围。');
 await page.locator('#runtime3-credential').click();await page.locator('#runtime3Evidence').filter({hasText:'credential_resource_denied'}).waitFor();
 await caption('首次受限凭据读取在执行前拒绝，NOT_STARTED。\n不需要先触发 Canary；虚拟凭据不是真实密钥。');
 await page.locator('#runtime3-approval').click();await page.locator('#runtime3Request option').filter({hasText:'mcp_tool'}).waitFor({state:'attached'});
 await page.locator('#operatorCode').fill('VIDEO_FIXTURE_OPERATOR');await page.locator('#approveConfirm').check();await page.locator('#runtime3Approve').click();await page.locator('#runtime3Evidence').filter({hasText:'approvedFixtureWorkflow'}).waitFor();
 await caption('人工审批使用宿主能力，一次消费；模型没有 approve / reset 工具。\n此处使用测试操作员口令，不是生产凭据。');
 await page.locator('#runtime3-honeypot').click();await page.locator('#runtime3Status').filter({hasText:'QUARANTINED'}).waitFor();await page.locator('#runtime3-write').click();await page.locator('#runtime3Evidence').filter({hasText:'guard_quarantined'}).waitFor();
 await caption('实际读取隔离 .env 诱饵 → 会话 QUARANTINED。\n再次写入被 Guard 拒绝，真实目标文件没有发生该次写入。',30);
 await page.locator('#runtime3Model').click();await page.locator('#model3Results').filter({hasText:'CONTROLLED'}).waitFor({state:'attached',timeout:2000}).catch(()=>{});await page.locator('#model3Results').scrollIntoViewIfNeeded();
 await caption('下方为已保存的真实 Qwen / 受控 SDK Agent 实验，不是本视频现场模型推理。\n间接注入未产生攻击尝试；直接准入阻断结果不能当作 Prompt Injection 防护率。',30);
 await caption('AI 只提供建议或收紧拒绝，不能授权或解除隔离。\n局部哈希链不是绝对防篡改；原生桌面 Agent 全局覆盖和自适应收益尚未验证。',25);
}finally{await context.close();await browser.close();await app.close();}
const output='competition-submission/3.0/Agent_Canary_3_0_Engineering_Demo.webm';if(fs.existsSync(output))throw Error('VIDEO_ALREADY_EXISTS_NO_OVERWRITE');await video.saveAs(output);
const durationMs=Date.now()-start;fs.writeFileSync('competition-submission/3.0/Agent_Canary_3_0_演示字幕.srt',scenes.map((s,i)=>(i+1)+'\n'+time(s.at)+' --> '+time(scenes[i+1]?.at??durationMs)+'\n'+s.text+'\n').join('\n'),{flag:'wx'});
const evidence={mode:'REAL_RUNNING_BROWSER_RECORDING_NOT_OS_DESKTOP',modelMode:'SAVED_REAL_MODEL_RESULTS_NOT_LIVE_MODEL_RUN',demoMode:'OPERATOR_TRIGGERED_REAL_TEMPORARY_IO',width:1920,height:1080,durationMs,audio:'none; Chinese visible captions and SRT',bytes:fs.statSync(output).size,sha256:createHash('sha256').update(fs.readFileSync(output)).digest('hex'),scenes};fs.writeFileSync('security-lab/evidence/video-recording.json',JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(evidence));
