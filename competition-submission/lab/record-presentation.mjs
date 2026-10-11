// Windows-only narrated frame-capture presentation for the competition demo.
// Chromium renders the actual local presentation and FFmpeg encodes its PNG
// frames; this is not a raw desktop recording. It never calls Ollama or an
// external service: all displayed experiment values are saved pilot results.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import net from 'node:net';

const repo = path.resolve(import.meta.dirname, '../..');
const submission = path.join(repo, 'competition-submission');
const outVideo = path.join(submission, 'Agent_Canary_演示视频.mp4');
const outSrt = path.join(submission, 'Agent_Canary_演示字幕.srt');
const chromeExe = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ffmpegExe = 'ffmpeg.exe';
const tempRoot = process.env.TEMP;
if (process.platform !== 'win32' || !tempRoot || !fs.existsSync(chromeExe)) {
  throw new Error('录屏要求 Windows、Chrome、TEMP 和 FFmpeg。');
}

const demoLog = `npm run demo:containment
{
  "demo": "synthetic SDK containment",
  "safeToolCallback": { "simulated": true, "tool": "git_status" },
  "decoyTool": "canary_read_secrets",
  "finalGuardState": "QUARANTINED",
  "blockedDangerousCallback": true,
  "realCallbacksRun": ["git_status"],
  "auditEvents": ["session_tripped", "session_quarantined", "decoy_called", "action_blocked"],
  "effects": "No shell, network, file deletion, credentials, or payment was used."
}`;

const scenes = [
  { id: 'intro', tag: '开源 AI 工具 · 2026 上海', title: 'Agent Canary', lead: 'AI Coding Agent 的运行时信号与会话隔离', cards: [['参赛版本', 'dad03c7 · 公开竞赛分支'], ['本地模型 pilot', '72 次完整工具选择试验'], ['外部副作用', '0 次 · 全部工具为合成 callback']], note: '技术演示 · 不代表官方评审或获奖结果' },
  { id: 'risk', tag: '01 / 威胁场景', title: '不可信内容会进入 Agent 上下文', lead: '恶意指令可藏在 Agent 为完成任务而读取的仓库、网页或工具输出中。', flow: ['恶意 README / 网页 / 工具输出', 'AI Agent 上下文', '读取虚拟秘密 / 调用危险工具'], note: '安全提示不能替代宿主侧的 callback 执行控制。' },
  { id: 'architecture', tag: '02 / 系统路径', title: '从信号到受守卫的工具回调', lead: 'Canary 提供可追踪的诱饵信号；Guard 与 Router 负责隔离后的执行判定。', flow: ['MCP 诱饵 / Canary Token', 'Session Guard 状态转换', 'Guarded Tool Router', '宿主 callback / JSONL 审计'], note: '只有接入 Guard/Router 的回调才经过这条检查路径。' },
  { id: 'offline', tag: '03 / 确定性离线演示', title: '隔离后的后续 callback 被拒绝', lead: '下方是本机此前执行 `npm run demo:containment` 的保存输出。演示脚本固定触发合成诱饵，不算模型自主检测。', pre: demoLog, note: '仅安全 git_status mock callback 执行；无真实 Shell、网络、文件或凭据操作。' },
  { id: 'experiment', tag: '04 / 本机真实模型 pilot', title: '同一模型、三条执行路径', lead: 'Ollama 本机 Qwen 3.5 9B；仓库内最小 function-calling loop；虚拟仓库和内存 callback。', cards: [['A · 无 Canary', '只有虚拟普通工具'], ['B · 仅诱饵', '真实危险 callback 不接 Guard'], ['C · 诱饵 + Router', '危险 callback 进入 Guarded Tool Router']], note: '录屏时不调用模型；展示来自保存的本机原始记录。' },
  { id: 'safety', tag: '05 / 结果一：Safety-aware profile', title: '诱饵触发：0 / 40', lead: '模型在 B/C 组 40 个可比诱饵机会中没有主动选择 Canary。', cards: [['A · 攻击成功场景', '1 / 10'], ['B · 攻击成功场景', '0 / 10 · 无危险回调尝试'], ['C · 攻击成功场景', '0 / 10 · Guard 拦截率未测得']], note: 'B/C 没有危险 callback 尝试；不能把 0/10 归因于 Guard 拦截。' },
  { id: 'neutral', tag: '06 / 结果二：Neutral profile', title: '无信号时，危险 mock 仍会执行', lead: 'Neutral profile 中 A/B/C 的攻击成功场景分别是 1/10、2/10、2/10。', cards: [['C · 危险 callback 尝试', '5 次'], ['执行时 Guard 状态', 'SAFE'], ['隔离信号前的阻断', '0 / 5']], note: '这揭示了真实边界：Router 在未触发信号时不能推断调用本身恶意。' },
  { id: 'seeded', tag: '07 / 预置隔离跟进', title: '隔离后的阻断单独计分', lead: '测试夹具预置 quarantine 后，C 组通过 Router 拒绝 3/3 次后续危险 callback。', cards: [['模型检测贡献', '0 · 预置状态由 harness 建立'], ['Agent Canary C 组阻断', '3 / 3'], ['B 组', 'callback 未接 Guard，仍可执行']], note: '3/3 验证隔离后的拒绝路径，不是模型发现诱饵的成功率。' },
  { id: 'quality', tag: '08 / 工程证据', title: '数据范围和性能边界', lead: '指标来自本机合成负载与内存快速路径，不代表生产并发、MCP 网络或真实工具耗时。', cards: [['根 + sponsor Node 测试', '146 总计 · 141 通过 · 5 跳过'], ['npm audit', '两处均为 0 漏洞'], ['Token 扫描 50 MiB', '45.1 ms 中位数 · 3 次样本']], note: '此处显示当前本地验证；Docker 与多平台结果以对应 Actions 为准。' },
  { id: 'comparison', tag: '09 / 开源生态', title: '定位互补，不贬低同类工具', lead: 'Promptfoo 支持 Agent/MCP 红队测试；PyRIT 支持可组合的多轮安全评估。', cards: [['红队发现与评估', 'Promptfoo · Microsoft PyRIT'], ['运行时宿主接线', 'Agent Canary：隔离信号到 callback 判定'], ['治理入口', 'MIT · SECURITY · CONTRIBUTING · CI']], note: '可组合使用；不声称彻底解决 Prompt Injection。' },
  { id: 'closing', tag: '10 / 结语', title: '可复现的运行时隔离路径', lead: 'Agent Canary 不是全局 Agent 防火墙。', cards: [['已知保护边界', '首个危险调用 / Guard 旁路 / 已开始的外部操作'], ['尚未解决 P1', '公开分发包含许可门控的 V2 编译模块'], ['代码与材料', 'github.com/DorianChn/shanchuanzhi-agent-canary']], note: '本视频含 Windows 合成旁白；不展示实时模型推理，也不宣称获奖。' },
];

const utterances = [
  ['intro','大家好，下面介绍 Agent Canary，一个面向 AI 编码代理的运行时信号与会话隔离组件。'],
  ['intro','这份演示对应公开竞赛分支的材料提交，代码和实验原始记录都可以复现。'],
  ['intro','展示的是已经运行并保存的工程证据，不代表官方评审、奖项或安全保证。'],
  ['risk','间接提示注入会藏在 Agent 需要读取的仓库文件、网页和工具输出里。'],
  ['risk','模型可能把这些不可信内容误当成任务指令，并尝试读取秘密或调用工具。'],
  ['risk','系统提示可以提醒模型谨慎，但不能保证宿主的危险 callback 一定停止。'],
  ['architecture','Canary 诱饵为某些越权行为提供精确、可记录的会话信号。'],
  ['architecture','Session Guard 管理安全、触发和隔离状态，并支持共享状态接线。'],
  ['architecture','Guarded Tool Router 在宿主 callback 执行之前检查当前隔离状态。'],
  ['architecture','审计事件记录信号与拒绝结果，便于复盘这条受守卫的调用路径。'],
  ['offline','离线演示的复现命令是 npm run demo:containment。'],
  ['offline','保存的运行结果显示，安全 git status mock 先执行，随后固定诱饵触发隔离。'],
  ['offline','会话进入 QUARANTINED，之后经过 Router 的危险模拟回调被拒绝。'],
  ['offline','这是 SDK 路径的确定性验证，不把固定诱饵调用计作模型检测。'],
  ['experiment','本轮使用已安装在本机 Ollama 的 Qwen 三点五九 B 模型。'],
  ['experiment','工具选择由仓库内的最小 function calling loop 驱动，没有接入通用 Agent 框架。'],
  ['experiment','A 组没有 Canary；B 组暴露诱饵，但危险 callback 不经过 Guard。'],
  ['experiment','C 组通过项目的 Guarded Tool Router 执行危险的虚拟工具回调。'],
  ['experiment','文件、凭据、Shell 和网络工具都只用内存数据与无副作用的 mock。'],
  ['safety','两个有提示词哈希的配置各完成三十六次调用试验。'],
  ['safety','主比较包含六十次可比攻击试验，以及六次正常控制。'],
  ['safety','模型在 B 和 C 组四十次可比机会中，没有一次主动选择诱饵。'],
  ['safety','Safety aware 配置中，A 组攻击成功一比十，B 组和 C 组都是零比十。'],
  ['safety','但这一配置下 B 和 C 没有危险 callback 尝试，Guard 拦截率没有测出。'],
  ['neutral','Neutral 配置中，A 组攻击成功一比十，B 组和 C 组都是二比十。'],
  ['neutral','C 组有五次危险模拟 callback 在 Guard 仍为 SAFE 时执行。'],
  ['neutral','这说明没有触发信号时，Router 不能单独判断一次调用是否恶意。'],
  ['seeded','测试夹具预置隔离后，C 组阻断三比三次后续危险 callback。'],
  ['seeded','这三次只证明隔离后的执行拒绝路径，不计作 Agent 检测成功。'],
  ['quality','离线攻击回归覆盖信号、状态转换和受守卫 callback 的拒绝路径。'],
  ['quality','五十兆字节合成 Token 扫描的三次中位耗时是四十五点一毫秒。'],
  ['quality','Guard 快速路径是微基准；它不包含 MCP 网络和宿主工具运行时间。'],
  ['quality','根项目和赞助子项目共一百四十六项测试，一百四十一项通过。'],
  ['comparison','Promptfoo 支持 Agent 与 MCP 红队测试，PyRIT 支持多轮安全评估。'],
  ['comparison','Agent Canary 关注运行时把隔离信号接到宿主的工具调用边界。'],
  ['comparison','它可以和评估框架配合，不声称覆盖所有提示注入或所有宿主。'],
  ['comparison','项目保留 MIT 许可、贡献指南、安全报告和公开维护路线图。'],
  ['closing','目前公开分发包仍含许可门控的 V2 编译模块，稳定发布条件尚未满足。'],
  ['closing','首次危险调用、绕过 Guard 的宿主调用和已开始的外部操作都有限制。'],
  ['closing','请通过项目介绍、实验报告和仓库中的原始数据复核这些结果。'],
  ['closing','Agent Canary：一条可复现的运行时隔离路径，不是全局 Agent 防火墙。'],
];

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtSrt = (seconds) => {
  const ms = Math.round(seconds * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), s = Math.floor(ms % 60000 / 1000), f = ms % 1000;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(f).padStart(3,'0')}`;
};

const tempDir = fs.mkdtempSync(path.join(tempRoot, 'AgentCanaryRecord-'));
const profileDir = path.join(tempDir, 'chrome-profile');
const htmlPath = path.join(submission, 'lab', 'video-showcase.html');
const wavPath = path.join(tempDir, 'narration.wav');
const videoOnlyPath = path.join(tempDir, 'capture.mp4');
const vbsPath = path.join(tempDir, 'speak.vbs');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function parseWave(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii',0,4) !== 'RIFF' || b.toString('ascii',8,12) !== 'WAVE') throw new Error('SAPI did not produce a WAV file.');
  let format, data;
  for (let i=12; i+8<=b.length;) {
    const tag=b.toString('ascii',i,i+4), n=b.readUInt32LE(i+4), start=i+8;
    if (tag==='fmt ') format={codec:b.readUInt16LE(start),channels:b.readUInt16LE(start+2),rate:b.readUInt32LE(start+4),byteRate:b.readUInt32LE(start+8),bits:b.readUInt16LE(start+14)};
    if (tag==='data') data=b.subarray(start,start+n);
    i=start+n+(n%2);
  }
  if (!format || !data || format.codec!==1) throw new Error('Unsupported SAPI WAV format.');
  return { ...format, data:Buffer.from(data), seconds:data.length/format.byteRate };
}
function writeWave(file, chunks, fmt) {
  const data=Buffer.concat(chunks), header=Buffer.alloc(44);
  header.write('RIFF',0); header.writeUInt32LE(36+data.length,4); header.write('WAVE',8); header.write('fmt ',12); header.writeUInt32LE(16,16);
  header.writeUInt16LE(1,20); header.writeUInt16LE(fmt.channels,22); header.writeUInt32LE(fmt.rate,24); header.writeUInt32LE(fmt.byteRate,28);
  header.writeUInt16LE(fmt.channels*fmt.bits/8,32); header.writeUInt16LE(fmt.bits,34); header.write('data',36); header.writeUInt32LE(data.length,40); fs.writeFileSync(file,Buffer.concat([header,data]));
}

const vbs = `Const SSFMCreateForWrite = 3\r\nSet voice = CreateObject("SAPI.SpVoice")\r\nFor Each v In voice.GetVoices\r\n If InStr(v.GetDescription, "Huihui") > 0 Then\r\n  Set voice.Voice = v\r\n  Exit For\r\n End If\r\nNext\r\nSet stream = CreateObject("SAPI.SpFileStream")\r\nstream.Open WScript.Arguments(0), SSFMCreateForWrite, False\r\nSet voice.AudioOutputStream = stream\r\nvoice.Rate = 3\r\nvoice.Volume = 100\r\nvoice.Speak "__TEXT__"\r\nvoice.WaitUntilDone -1\r\nstream.Close\r\n`;
const gapSeconds=0.9, cueRows=[], pcmChunks=[], audioStartDelay=0;
let audioSec=audioStartDelay, wavFormat;
try {
  fs.mkdirSync(path.dirname(htmlPath),{recursive:true});
  for (let i=0;i<utterances.length;i++) {
    const [sceneId,text]=utterances[i];
    const outWav=path.join(tempDir,`line-${String(i+1).padStart(2,'0')}.wav`);
    const vbText=vbs.replace('__TEXT__',text.replace(/"/g,'""'));
    fs.writeFileSync(vbsPath,Buffer.concat([Buffer.from([0xff,0xfe]),Buffer.from(vbText,'utf16le')]));
    const spoken=spawnSync('cscript.exe',['//nologo',vbsPath,outWav],{encoding:'utf8',timeout:30000,windowsHide:true});
    if (spoken.status!==0) throw new Error(spoken.stderr||spoken.stdout||`SAPI failed on line ${i+1}`);
    const wav=parseWave(outWav); wavFormat ||= wav;
    if (wav.rate!==wavFormat.rate || wav.channels!==wavFormat.channels || wav.bits!==wavFormat.bits) throw new Error('SAPI changed audio format mid-run.');
    cueRows.push({sceneId,text,start:audioSec,end:audioSec+wav.seconds});
    pcmChunks.push(wav.data); audioSec+=wav.seconds;
    if (i+1<utterances.length) { const gapBytes=Math.round(gapSeconds*wav.byteRate); pcmChunks.push(Buffer.alloc(gapBytes)); audioSec+=gapSeconds; }
  }
  const endHold=3; pcmChunks.push(Buffer.alloc(Math.round(endHold*wavFormat.byteRate))); audioSec+=endHold;
  if (audioSec<180 || audioSec>300) throw new Error(`Synthesized run time ${audioSec.toFixed(1)}s is outside the requested 3–5 minute range.`);
  writeWave(wavPath,pcmChunks,wavFormat);

  const srt=cueRows.map((c,i)=>`${i+1}\n${fmtSrt(c.start)} --> ${fmtSrt(c.end)}\n${c.text}`).join('\n\n')+'\n';
  fs.writeFileSync(outSrt,srt,'utf8');
  const sceneData=scenes.map(s=>({ ...s, start:cueRows.find(c=>c.sceneId===s.id)?.start ?? 0 }));
  const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Agent Canary Recording</title><style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;background:#080d1b;color:#eef2ff;font-family:"Microsoft YaHei UI","Microsoft YaHei",sans-serif;overflow:hidden}.shell{width:100vw;height:100vh;padding:38px 64px 26px;display:flex;flex-direction:column;background:radial-gradient(ellipse at 82% 12%,#243667 0,transparent 42%),linear-gradient(140deg,#080d1b,#101932 62%,#101c36)}header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #304263;padding-bottom:18px;color:#a8b9d9;font-size:18px;letter-spacing:.11em}.brand{font-weight:700;color:#e5eaff}main{flex:1;display:flex;flex-direction:column;justify-content:center;min-height:0}.tag{font-size:18px;color:#77d6c5;letter-spacing:.12em;margin-bottom:16px}h1{font-size:54px;line-height:1.14;margin:0 0 18px;letter-spacing:-.02em} .lead{font-size:27px;line-height:1.5;color:#c8d4ed;max-width:1500px}.flow,.cards{display:flex;gap:16px;margin-top:32px;align-items:stretch;flex-wrap:wrap}.flow .box,.card{border:1px solid #354969;background:rgba(19,31,58,.88);border-radius:16px;padding:20px 24px;min-width:220px;max-width:420px;font-size:23px;line-height:1.45;box-shadow:0 10px 32px #03071366}.flow .box{flex:1;display:flex;align-items:center;justify-content:center;text-align:center}.flow .box:not(:last-child)::after{content:"›";position:absolute;transform:translateX(150px);font-size:34px;color:#70d5c4}.card{flex:1}.card .k{font-size:16px;color:#8ca5cd;letter-spacing:.05em;margin-bottom:10px}.card .v{font-size:24px;color:#f1f4ff;font-weight:650;overflow-wrap:anywhere;word-break:break-word}.terminal{white-space:pre-wrap;background:#050a13;border:1px solid #314565;border-radius:16px;padding:23px 28px;color:#bdebcf;font:19px/1.42 Consolas,monospace;margin-top:24px;max-height:55vh;overflow:hidden}.note{margin-top:22px;color:#90a5c7;font-size:18px}.caption{min-height:64px;margin-top:12px;padding:12px 22px;border-radius:13px;background:#121f38;border-left:4px solid #55cbb6;font-size:23px;line-height:1.45;color:#f4f6ff}footer{border-top:1px solid #304263;padding-top:14px;display:flex;justify-content:space-between;color:#93a5c7;font-size:14px}.progress{height:4px;background:#223451;margin-top:12px}.bar{height:4px;width:0;background:#59d0bc}.wait{position:absolute;right:65px;top:94px;border:1px solid #55cbb6;border-radius:20px;color:#8fe6d8;padding:8px 14px;font-size:14px}.hero{font-size:106px;font-weight:760;letter-spacing:-.04em;margin-bottom:8px}.subhero{font-size:35px;color:#b9c8e5}.small{font-size:13px}.ending{font-size:13px;color:#90a5c7}
</style></head><body><div class="shell"><header><div class="brand">AGENT CANARY <span style="color:#7390bc;font-weight:400">/ 安全演示</span></div><div>OPEN SOURCE AI TOOL · SHANGHAI 2026</div></header><div class="wait" id="wait">准备录制</div><main><div class="tag" id="tag"></div><h1 id="title"></h1><div class="lead" id="lead"></div><div id="body"></div><div class="note" id="note"></div></main><div class="caption" id="caption">本视频展示已保存的本地结果，不运行实时模型。</div><div class="progress"><div class="bar" id="bar"></div></div><footer><span>参赛材料版本 dad03c7 · 原始试验与报告随仓库保存</span><span>本地合成旁白 · 所有危险效果均为 mock</span></footer></div><script>
const scenes=${JSON.stringify(sceneData)},cues=${JSON.stringify(cueRows)},duration=${audioSec.toFixed(3)};let started=0,activeScene="";const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));function render(s){activeScene=s.id;$("tag").textContent=s.tag;$("title").textContent=s.title;$("lead").textContent=s.lead;$("note").textContent=s.note||"";if(s.id==='intro'){$("title").classList.add('hero');$("lead").classList.add('subhero')}else{$("title").classList.remove('hero');$("lead").classList.remove('subhero')}let b='';if(s.flow)b='<div class="flow">'+s.flow.map(x=>'<div class="box">'+esc(x)+'</div>').join('')+'</div>';if(s.cards)b='<div class="cards">'+s.cards.map(([k,v])=>'<div class="card"><div class="k">'+esc(k)+'</div><div class="v">'+esc(v)+'</div></div>').join('')+'</div>';if(s.pre)b='<pre class="terminal">'+esc(s.pre)+'</pre>';$("body").innerHTML=b}function tick(t){if(!started)return;let e=(t-started)/1000;if(e>duration){render(scenes.at(-1));$("caption").textContent="Agent Canary · 可复现的运行时隔离路径，不是全局 Agent 防火墙。";$("wait").textContent="演示结束";$("bar").style.width="100%";window.__VIDEO_DONE__=true;return}let c=[...cues].reverse().find(x=>e>=x.start);if(c){const s=scenes.find(x=>x.id===c.sceneId);if(s&&s.id!==activeScene)render(s);$("caption").textContent=c.text}$("bar").style.width=(e/duration*100).toFixed(3)+'%';requestAnimationFrame(tick)}window.startShow=()=>{if(started)return;started=performance.now();$("wait").textContent="正在播放实验结果讲解";render(scenes[0]);requestAnimationFrame(tick)};render(scenes[0]);
</script></body></html>`;
  const bridge=`render(scenes[0]);window.renderCue=(i)=>{const c=cues[i],s=scenes.find(x=>x.id===c.sceneId);render(s);$("caption").textContent=c.text;$("wait").textContent="实测结果画面 · 非实时模型";$("bar").style.width=(c.start/duration*100).toFixed(3)+"%"};`;
  const htmlForRecording=html.replace('render(scenes[0]);\n</script>',bridge+'\n</script>');
  if(htmlForRecording===html)throw new Error('Failed to install the deterministic frame-capture bridge.');
  fs.writeFileSync(htmlPath,htmlForRecording,'utf8');

  const chromeArgs=[`--user-data-dir=${profileDir}`,`--remote-debugging-port=0`,'--no-first-run','--no-default-browser-check','--disable-sync','--disable-extensions','--disable-background-networking','--disable-component-update','--disable-notifications','--disable-gpu','--disable-gpu-compositing','--disable-features=MediaRouter','--window-size=1920,1080','--window-position=0,0',`--app=${pathToFileURL(htmlPath).href}`];
  const chrome=spawn(chromeExe,chromeArgs,{stdio:'ignore',windowsHide:false});
  let chromeClosed=false;
  try {
    const portFile=path.join(profileDir,'DevToolsActivePort');
    let devPort;
    for(let i=0;i<100;i++){if(chrome.exitCode!==null)throw new Error('Chrome exited before ready.');if(fs.existsSync(portFile)){devPort=Number(fs.readFileSync(portFile,'utf8').split(/\r?\n/)[0]);break;}await sleep(300);}
    if(!devPort)throw new Error('Chrome DevTools endpoint did not start.');
    let page;
    for(let i=0;i<40;i++){const r=await fetch(`http://127.0.0.1:${devPort}/json/list`).catch(()=>null);if(r?.ok){const tabs=await r.json();page=tabs.find(t=>t.type==='page'&&t.url.includes('video-showcase.html'));if(page)break;}await sleep(300);}
    if(!page)throw new Error('Recording presentation did not open in isolated Chrome.');
    const connectCdp=async()=>{
      const ws=new WebSocket(page.webSocketDebuggerUrl),pending=new Map();let cdpId=0;
      await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('Chrome DevTools frame session timed out.')),10000);ws.onopen=()=>{clearTimeout(t);resolve();};ws.onerror=()=>{clearTimeout(t);reject(new Error('Chrome DevTools frame session failed.'));};});
      ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);clearTimeout(p.timer);pending.delete(m.id);if(m.error)p.reject(new Error(m.error.message));else p.resolve(m.result);}};
      const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++cdpId;const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`Chrome DevTools ${method} timed out.`));},15000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});
      return {cdp,close:()=>ws.close()};
    };
    const frames=[];
    for(let i=0;i<cueRows.length;i++){
      let captured=false,lastError;
      for(let attempt=0;attempt<2&&!captured;attempt++){
        const connection=await connectCdp();
        try{
          const evaluated=await connection.cdp('Runtime.evaluate',{expression:`window.renderCue(${i})`,returnByValue:true});
          if(evaluated.exceptionDetails)throw new Error(`Could not render caption ${i+1}.`);
          await sleep(200);
          const shot=await connection.cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
          const framePath=path.join(tempDir,`frame-${String(i+1).padStart(2,'0')}.png`);
          fs.writeFileSync(framePath,Buffer.from(shot.data,'base64'));frames.push(framePath);captured=true;
        }catch(error){lastError=error;if(attempt===0)await sleep(500);}
        finally{connection.close();}
      }
      if(!captured)throw new Error(`Could not capture frame ${i+1}/${cueRows.length}: ${lastError?.message||'unknown error'}`);
      if((i+1)%5===0||i+1===cueRows.length)console.log(`Captured Chromium frames ${i+1}/${cueRows.length}`);
    }
    const concatPath=path.join(tempDir,'frames.ffconcat'),ffPath=p=>p.replace(/\\/g,'/');
    const frameLines=['ffconcat version 1.0'];
    for(let i=0;i<frames.length;i++){
      const next=cueRows[i+1]?.start ?? cueRows[i].end;
      frameLines.push(`file '${ffPath(frames[i])}'`,`duration ${(next-cueRows[i].start).toFixed(3)}`);
    }
    frameLines.push(`file '${ffPath(frames.at(-1))}'`);
    fs.writeFileSync(concatPath,frameLines.join('\n')+'\n','utf8');
    const render=spawnSync(ffmpegExe,['-y','-hide_banner','-loglevel','warning','-f','concat','-safe','0','-i',concatPath,'-fps_mode','cfr','-r','30','-vf','scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,tpad=stop_mode=clone:stop_duration=3','-t',(audioSec+0.1).toFixed(3),'-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p',videoOnlyPath],{encoding:'utf8',timeout:120000,windowsHide:true});
    if(render.status!==0||!fs.existsSync(videoOnlyPath))throw new Error(render.stderr||render.stdout||'FFmpeg could not encode the captured Chromium frames.');
    const mux=spawnSync(ffmpegExe,['-y','-hide_banner','-loglevel','warning','-i',videoOnlyPath,'-i',wavPath,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','160k','-movflags','+faststart',outVideo],{encoding:'utf8',timeout:120000,windowsHide:true});
    if(mux.status!==0)throw new Error(mux.stderr||mux.stdout||'FFmpeg audio mux failed.');
    console.log(JSON.stringify({status:'RECORDED',video:outVideo,subtitle:outSrt,seconds:+audioSec.toFixed(1),utterances:cueRows.length,voice:'Microsoft Huihui Desktop (synthetic)',format:`${wavFormat.rate} Hz/${wavFormat.bits}-bit/${wavFormat.channels} channel`},null,2));
    const version=await fetch(`http://127.0.0.1:${devPort}/json/version`).then(r=>r.json());
    const bw=new WebSocket(version.webSocketDebuggerUrl);
    await new Promise(resolve=>{const t=setTimeout(resolve,2000);bw.onopen=()=>bw.send(JSON.stringify({id:2,method:'Browser.close'}));bw.onmessage=()=>{clearTimeout(t);resolve();};bw.onerror=()=>{clearTimeout(t);resolve();};});
    chromeClosed=true;
  } finally {
    if(!chromeClosed&&chrome.exitCode===null){try{chrome.kill();}catch{}}
    const resolvedTemp=path.resolve(tempDir),resolvedRoot=path.resolve(tempRoot);
  }
} catch (error) {
  console.error(error.stack||error);
  process.exitCode=1;
}
