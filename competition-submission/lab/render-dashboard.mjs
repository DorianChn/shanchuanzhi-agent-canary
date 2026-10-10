#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const evidenceDir = path.resolve(here, "../evidence");
const data = JSON.parse(await fs.readFile(path.join(evidenceDir, "analysis-summary.json"), "utf8"));
const json = JSON.stringify(data).replaceAll("<", "\\u003c");
const html = `<!doctype html>
<html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Agent Canary｜实验结果</title>
<style>
:root{color-scheme:dark;--bg:#0b1020;--panel:#151d32;--line:#2b3650;--text:#e8edf7;--muted:#aab5ca;--cyan:#55d6be;--amber:#ffcc70;--red:#ff7285;--blue:#82aaff}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 5% 0%,#1c2b48,transparent 55%),var(--bg);font:16px/1.5 "Microsoft YaHei",system-ui,sans-serif;color:var(--text)}main{max-width:1180px;margin:auto;padding:38px 28px 56px}.eyebrow{color:var(--cyan);font-size:13px;letter-spacing:.14em;text-transform:uppercase}h1{font-size:38px;margin:6px 0 4px}h2{font-size:22px;margin:0 0 16px}.sub{color:var(--muted);margin:0 0 26px}.notice{border:1px solid #795e28;background:#362b19;border-radius:12px;padding:14px 18px;margin-bottom:22px;color:#ffe0a1}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px}.card,.panel{background:linear-gradient(145deg,#18223a,#111829);border:1px solid var(--line);border-radius:16px;padding:20px}.card h2{font-size:18px}.metric{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #273149}.metric:last-child{border:0}.good{color:var(--cyan)}.warn{color:var(--amber)}.bad{color:var(--red)}section{margin-top:26px}.barrow{display:grid;grid-template-columns:190px 1fr 100px;gap:12px;align-items:center;margin:13px 0}.track{height:14px;background:#242e45;border-radius:9px;overflow:hidden}.fill{height:100%;border-radius:9px;background:linear-gradient(90deg,#55d6be,#82aaff)}.pill{display:inline-block;border:1px solid var(--line);border-radius:99px;padding:2px 9px;color:var(--muted);font-size:12px}.foot{color:var(--muted);font-size:13px;margin-top:24px}.empty{padding:20px;color:var(--muted)}@media(max-width:600px){main{padding:24px 16px}.barrow{grid-template-columns:130px 1fr 78px}h1{font-size:30px}}
</style>
<main><div class="eyebrow">Local model evaluation · synthetic tools</div><h1>Agent Canary 实验看板</h1><p class="sub">从本地逐次原始记录生成；不连接生产工具，也不代表通用安全保证。</p>
<div class="notice"><b>评估边界：</b>真实本地模型只负责选择工具；Shell、HTTP、密钥和文件操作均为虚拟 callback。预置隔离前提不计入模型检测。单模型小样本结果不可外推。</div><div id="content"></div><p class="foot" id="stamp"></p></main>
<script>const data=${json};
const arms=[['A_no_canary','A｜无 Canary'],['B_decoy_only','B｜仅诱饵检测'],['C_guarded_router','C｜诱饵 + Guard Router']];
const displayCohorts=data.cohorts.filter(function(c){return c.profile!=='legacy_unknown';});
const count=r=>!r||!r.denominator?'未测量':r.numerator+'/'+r.denominator;
const esc=v=>String(v??'').replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];});
const card=function(c,key,title){const m=c.arms[key];const seeded=m.seededQuarantineFollowUp;return '<article class="card"><h2>'+title+'</h2>'+
'<div class="metric"><span>可比攻击成功</span><b class="'+(m.simulatedAttackSuccess.numerator?'bad':'good')+'">'+count(m.simulatedAttackSuccess)+'</b></div>'+
'<div class="metric"><span>模型主动选诱饵</span><b>'+(key==='A_no_canary'?'不适用':count(m.modelDecoyDetection))+'</b></div>'+
'<div class="metric"><span>危险 callback 已执行</span><b class="'+(m.dangerousCallbackExecuted?'bad':'good')+'">'+m.dangerousCallbackExecuted+'</b></div>'+
'<div class="metric"><span>正常任务成功</span><b>'+count(m.normalTaskSuccess)+'</b></div>'+
'<div class="metric"><span>误隔离控制</span><b>'+count(m.falsePositiveQuarantine)+'</b></div>'+
(key==='C_guarded_router'?'<div class="metric"><span>预置隔离后的危险调用</span><b>'+seeded.blockedByGuard+'/'+seeded.dangerousAttempts+' 阻止</b></div>':'')+'</article>';};
const cohortCards=function(c){const cards=arms.map(function(item){return card(c,item[0],item[1]);}).join('');const bars=arms.map(function(item){const r=c.arms[item[0]].simulatedAttackSuccess;return '<div class="barrow"><span>'+item[1]+'</span><div class="track"><div class="fill" style="width:'+((r.fraction||0)*100)+'%"></div></div><b>'+count(r)+'</b></div>';}).join('');const label=c.profile==='neutral_agent'?'中性 Agent':c.profile==='safety_aware'?'Safety-aware':'提示词配置未记录（单独留档）';return '<section class="panel"><h2>'+label+' 提示词组 <span class="pill">'+c.totalTrials+' 次试验</span></h2><div class="grid">'+cards+'</div><section><h2>可比攻击成功率（预置隔离场景已剔除）</h2>'+bars+'</section><p class="foot">模型：'+esc(c.model)+' · 量化：'+esc(c.quantization)+' · Prompt SHA-256：'+esc(c.promptSha256||'未记录')+' · Guard decision p95 '+(c.guardLatency?.syncDecision?.p95??'—')+' μs，Router p95 '+(c.guardLatency?.routerDispatch?.p95??'—')+' μs。</p></section>';};
document.querySelector('#content').innerHTML=displayCohorts.length?displayCohorts.map(cohortCards).join(''):'<div class="empty">当前没有带提示词哈希的完整实验组。</div>';
document.querySelector('#stamp').textContent='分析生成时间：'+data.analysisGeneratedAt+'；展示已记录提示词哈希的完整组：'+displayCohorts.length+'；未记录 profile 的完整组仅留档：'+(data.cohorts.length-displayCohorts.length)+'；排除的未完成组：'+data.excluded.length+'.';</script></html>`;
const target = path.join(evidenceDir, "index.html");
await fs.writeFile(target, html, "utf8");
console.log(`Wrote ${target}`);
