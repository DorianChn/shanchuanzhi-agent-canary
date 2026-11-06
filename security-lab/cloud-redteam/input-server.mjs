import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.join(here, '.env.local');
const token = randomBytes(24).toString('hex');

const html = nonce => `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Agent Canary API 配置</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#11151b;color:#edf2f7;font:15px/1.5 system-ui,"Microsoft YaHei",sans-serif}.wrap{max-width:780px;margin:32px auto;padding:28px;background:#1b222b;border:1px solid #36414f;border-radius:12px}h1{font-size:22px;margin:0 0 8px}p{color:#bac5d2;margin:0 0 18px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.field{display:flex;flex-direction:column;gap:6px}.wide{grid-column:1/-1}label{font-size:13px;color:#c8d2df}input,select{font:inherit;color:#fff;background:#10151b;border:1px solid #465365;border-radius:7px;padding:10px 12px;min-width:0}input:focus,select:focus{outline:2px solid #76b7ff;border-color:transparent}.note{margin-top:16px;padding:11px 13px;background:#282411;border-radius:7px;color:#f1d998;font-size:13px}button{margin-top:20px;background:#78b6ff;color:#0d1b2a;border:0;border-radius:7px;padding:11px 20px;font-weight:700;cursor:pointer}#status{margin-left:12px;color:#a9d8b2}.small{font-size:12px;color:#94a3b4}@media(max-width:640px){.grid{grid-template-columns:1fr}.wide{grid-column:auto}.wrap{margin:12px;padding:18px}}
</style><main class="wrap"><h1>Agent Canary 云端 Red Team 配置</h1><p>本机表单。Key 字段已遮蔽；只保存到 Git 忽略的 <code>.env.local</code>，此页不调用 API。</p>
<form id="f"><div class="grid">
<div class="field"><label>国模 API Key（新 Key）</label><input name="llmKey" type="password" autocomplete="off" required></div>
<div class="field"><label>GPT API Key（新 Key）</label><input name="gptKey" type="password" autocomplete="off" required></div>
<div class="field"><label>国模 Base URL</label><input name="llmBase" value="https://api.yicode.ai/v1" required></div>
<div class="field"><label>GPT Base URL</label><input name="gptBase" value="https://api.yicode.ai/v1" required></div>
<div class="field wide"><label>攻击生成模型（逗号分隔）</label><input name="attackers" value="llm:deepseek-v4.1-flash,llm:glm-5.3,llm:glm-5.3-flash,llm:mimo-v2.6-pro,llm:kimi-k3.1-pro,llm:minimax-m3.1-flash,gpt:gpt-6.1-sol" required></div>
<div class="field"><label>防御模型（逗号分隔，可重复比较）</label><input name="defender" value="gpt:gpt-6.1-sol" required></div>
<div class="field"><label>Judge 模型</label><input name="judge" value="llm:glm-5.3" required></div>
<div class="field"><label>预算上限 USD</label><input name="budget" type="text" inputmode="decimal" value="unlimited" required></div>
<div class="field"><label>最大并发请求</label><input name="concurrency" type="number" min="1" max="64" value="2" required></div>
<div class="field"><label>首轮正式测试数量</label><select name="batch"><option selected>100</option><option>1000</option><option>10000</option></select></div>
</div><div class="note">预算可填写美元金额，或明确填写 unlimited。每批仍会先显示 Token 与费用预估；有限预算会在请求前和每次 API 调用前执行闸门。请只输入已轮换的新 Key。</div>
<button type="submit">保存到本机</button><span id="status"></span><div class="small">保存后表单服务自动关闭；不记录表单内容或请求正文。</div></form></main>
<script>const nonce=${JSON.stringify(nonce)};document.querySelector('#f').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;const v=Object.fromEntries(new FormData(f));const r=await fetch('/save',{method:'POST',headers:{'content-type':'application/json','x-canary-token':nonce},body:JSON.stringify(v)});const x=await r.json();document.querySelector('#status').textContent=r.ok?'已保存；可关闭此页。':(x.error||'保存失败');if(r.ok)f.querySelector('button').disabled=true;});</script></html>`;

function validBase(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash && !/\/(chat\/completions|responses|models)\/?$/i.test(url.pathname);
  } catch { return false; }
}

function send(response, status, body, type = 'application/json; charset=utf-8') {
  response.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'" });
  response.end(type.startsWith('text/html') ? body : JSON.stringify(body));
}

const server = http.createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/') return send(response, 200, html(token), 'text/html; charset=utf-8');
  if (request.method !== 'POST' || request.url !== '/save') return send(response, 404, { error: 'NOT_FOUND' });
  if (request.headers.origin !== `http://127.0.0.1:${server.address().port}` || request.headers['x-canary-token'] !== token) return send(response, 403, { error: 'LOCAL_ORIGIN_CHECK_FAILED' });
  let bytes = 0; const chunks = [];
  request.on('data', chunk => { bytes += chunk.length; if (bytes > 20_000) request.destroy(); else chunks.push(chunk); });
  request.on('end', () => {
    let value;
    try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(response, 400, { error: 'FORM_INVALID' }); }
    const keys = ['llmKey', 'gptKey'];
    if (keys.some(key => typeof value[key] !== 'string' || !value[key].trim() || /[\r\n]/.test(value[key]))) return send(response, 400, { error: 'BOTH_ROTATED_KEYS_REQUIRED' });
    if (!validBase(value.llmBase) || !validBase(value.gptBase)) return send(response, 400, { error: 'HTTPS_BASE_URL_REQUIRED' });
    const budget = String(value.budget).trim().toLowerCase();
    if (budget !== 'unlimited' && (!/^\d+(?:\.\d{1,2})?$/.test(budget) || Number(budget) <= 0) || !/^\d+$/.test(String(value.concurrency)) || Number(value.concurrency) < 1 || Number(value.concurrency) > 64) return send(response, 400, { error: 'BUDGET_OR_CONCURRENCY_INVALID' });
    if (!['100', '1000', '10000'].includes(String(value.batch))) return send(response, 400, { error: 'BATCH_SIZE_INVALID' });
    const lines = [
      '# Local-only credentials. This path is ignored by Git.',
      `LLM_API_BASE_URL=${value.llmBase.trim()}`,
      `LLM_API_KEY=${value.llmKey}`,
      `GPT_API_BASE_URL=${value.gptBase.trim()}`,
      `GPT_API_KEY=${value.gptKey}`,
      `ATTACKER_MODEL=${String(value.attackers).trim()}`,
      `DEFENDER_MODEL=${String(value.defender).split(',')[0].trim()}`,
      `DEFENDER_MODELS=${String(value.defender).trim()}`,
      `JUDGE_MODEL=${String(value.judge).trim()}`,
      `MAX_TEST_BUDGET_USD=${budget}`,
      `MAX_CONCURRENT_REQUESTS=${String(value.concurrency)}`,
      'MAX_API_RETRIES=1',
      `TEST_BATCH_SIZE=${String(value.batch)}`,
      'MODEL_PRICING_JSON=',
      '',
    ];
    fs.writeFileSync(envFile, lines.join('\n'), { encoding: 'utf8', mode: 0o600 });
    send(response, 200, { saved: true });
    server.close(() => process.exit(0));
  });
});

server.listen(0, '127.0.0.1', () => {
  console.log(`LOCAL_INPUT_FORM http://127.0.0.1:${server.address().port}/`);
});
