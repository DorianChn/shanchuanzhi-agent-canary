import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.env.AGENT_CANARY_HOME=fs.mkdtempSync(path.join(os.tmpdir(),'canary-3-browser-'));
const {startAIConsole}=await import('../dist/ai/console.js');
const playwright=process.argv.find(a=>a.startsWith('--playwright='))?.slice(13);
const chrome=process.argv.find(a=>a.startsWith('--chrome='))?.slice(9);
if(!playwright||!chrome)throw Error('PLAYWRIGHT_MODULE_AND_CHROME_PATH_REQUIRED');
const {chromium}=await import(playwright);
const out=path.join(root,'security-lab/evidence','ui-'+new Date().toISOString().replace(/[:.]/g,'-'));fs.mkdirSync(out,{recursive:true});
const app=await startAIConsole({port:0,operatorApprovalCode:'UI_FIXTURE_OPERATOR_ONLY'});
const browser=await chromium.launch({headless:true,executablePath:chrome});
const results=[];
try{
 for(const [name,width,height]of [['desktop',1440,1000],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(app.url,{waitUntil:'domcontentloaded'});await page.locator('#runtime3Status').filter({hasText:'Guard：'}).waitFor();
  if(name==='desktop'){
   await page.locator('#runtime3-write').click();await page.locator('#runtime3Evidence').filter({hasText:'writtenBytes'}).waitFor();
   await page.locator('#runtime3-approval').click();await page.locator('#runtime3Request option').filter({hasText:'mcp_tool'}).waitFor({state:'attached'});
   await page.locator('#operatorCode').fill('UI_FIXTURE_OPERATOR_ONLY');await page.locator('#approveConfirm').check();await page.locator('#runtime3Approve').click();
   await page.locator('#runtime3Evidence').filter({hasText:'approvedFixtureWorkflow'}).waitFor();
   await page.locator('#runtime3-honeypot').click();await page.locator('#runtime3Status').filter({hasText:'QUARANTINED'}).waitFor();
   await page.locator('#runtime3-write').click();await page.locator('#runtime3Evidence').filter({hasText:'guard_quarantined'}).waitFor();
  }
  await page.locator('#runtime3').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,name+'.png')});
  results.push({name,width,height,status:errors.length?'FAILED':'VERIFIED',errors,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),text:await page.locator('#runtime3Status').textContent()});await page.close();
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({scope:'Real browser controls, private temporary demo effects, no model claims',results},null,2)+'\n');
 console.log(JSON.stringify({out,results}));if(results.some(r=>r.errors.length||r.overflow))process.exitCode=1;
}finally{await browser.close();await app.close();}
