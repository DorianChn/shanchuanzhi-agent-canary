/** Optional browser QA: supply PLAYWRIGHT_MODULE and CHROME_PATH. No dependency installed by this script. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startAIConsole } from '../../dist/ai/console.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const evidence=path.join(root,'competition-submission/evidence');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ai-ui-qa-'));
const app=await startAIConsole({port:0,eventsFile:path.join(temp,'events.jsonl')});
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(app.url);await page.waitForFunction(()=>document.querySelector('#preset').options.length===9);
  if(!(await page.locator('#comparison').innerText()).includes('neutral_agent'))throw new Error('Latest recorded complete cohort should be neutral_agent');
  await page.locator('#connect').click();await page.waitForFunction(()=>document.querySelector('#connection').textContent.includes('连接正常'));
  await page.locator('#demo').click();await page.waitForFunction(()=>document.querySelector('#demoResult').textContent.includes('QUARANTINED'));
  await page.locator('#sample').click();await page.waitForFunction(()=>!document.querySelector('#analyze').disabled);
  await page.locator('#analyze').click();await page.waitForFunction(()=>document.querySelector('#analysisStatus').textContent.includes('ollama ·'),{timeout:180000});
  const analysis=await page.locator('#analysis').innerText();
  if(!analysis.includes('分析建议：'))throw new Error('Real UI analysis failed: '+analysis);
  await page.screenshot({path:path.join(evidence,'ai-console-desktop.png'),fullPage:true});
  const desktop=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(evidence,'ai-console-mobile.png'),fullPage:true});
  const mobile=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  if(await page.locator('#protocolField').isVisible())throw new Error('Preset-only protocol field should be hidden');
  await page.locator('#model').fill('unsaved-test-model');
  if(!await page.locator('#analyze').isDisabled()||!await page.locator('#eval').isDisabled())throw new Error('Unsaved config must disable execution');
  await page.locator('#events .event').first().click();
  await page.waitForFunction(()=>document.querySelector('#analysis').textContent.includes('尚未分析当前选中证据'));
  if(!await page.locator('#events .event').first().evaluate(e=>e.classList.contains('selected')))throw new Error('Selected event must be marked');
  if(errors.length||mobile.scroll>mobile.width||desktop.scroll>desktop.width)throw new Error('UI errors or horizontal overflow: '+JSON.stringify({errors,desktop,mobile}));
  fs.writeFileSync(path.join(evidence,'ai-console-ui-verification.json'),JSON.stringify({generatedAt:new Date().toISOString(),browser:'Chromium via Playwright',errors,desktop,mobile,realLocalAnalysis:analysis,guardDemo:'DETERMINISTIC_SANDBOX_NOT_LLM',hiddenPresetFields:true,unsavedConfigBlocksExecution:true,selectedEvidenceClearsOldResult:true},null,2));
  console.log(JSON.stringify({passed:true,errors,desktop,mobile}));
}finally{await browser.close();await app.close();fs.rmSync(temp,{recursive:true,force:true});}
