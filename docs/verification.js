/* Existing five-view dashboard, backed by recorded evidence; no synthetic live telemetry. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id), snapshot=window.AGENT_CANARY_SNAPSHOT;
 if(!snapshot){$('backend-status-title').textContent='实验快照未载入';$('backend-status-copy').textContent='请保留完整静态目录后重新打开；没有生成替代结果。';return;}
 const token=document.querySelector('meta[name="agent-canary-csrf"]')?.content??'';
 const local=['localhost','127.0.0.1','[::1]','::1'].includes(location.hostname)&&token.length>=32;
 let datasets=snapshot.datasets, metric='attackSuccessRate', connected=false, validationApiAvailable=false, runtime=null, selectedPackage=null, selectedEvent=null, rows=[], selectionVersion=0, packageBusy=false;
 const titles={A_BASELINE:'无防护',B_POLICY:'Policy',C_POLICY_CANARY:'Policy + Canary',D_COMPLETE:'完整防护'};
 const text=(id,value)=>{if($(id))$(id).textContent=value;};
 function el(tag,content,className){const node=document.createElement(tag);if(content!==undefined)node.textContent=content;if(className)node.className=className;return node;}
 function download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 async function api(route,body){if(!local)throw Error('静态模式不会调用本机 API');const response=await fetch('/api/'+route,{method:body?'POST':'GET',cache:'no-store',credentials:'same-origin',headers:{'x-canary-csrf':token,...(body?{'content-type':'application/json'}:{})},signal:AbortSignal.timeout(10000),...(body?{body:JSON.stringify(body)}:{})});if(!response.ok)throw Error('本机请求失败 '+response.status);return response.json();}
 function ratio(m){return m&&m.denominator>0?m.numerator+'/'+m.denominator+(m.unknown?'（未知 '+m.unknown+'）':''):'NOT VERIFIED';}
 function renderExperiments(){
  const key=$('dataset').value,data=datasets[key];$('results').replaceChildren();$('comparison-chart').replaceChildren();
  if(!data?.arms){text('run-id','该批次没有记录，未用其他批次替代。');return;}
  text('run-id','Run ID '+data.runId+(data.modelId?' · '+data.modelId+(data.reasoningEffort?' / '+data.reasoningEffort:''):'')+' · 已保存记录');
  text('scope',key==='local'?'确定性执行轨迹，仅验证工具边界，无模型参与。与新增补测 48 条、历史云试验分别记录。':'真实模型存档。Reviewer 合法推理 '+(data.successfulReviewerInferences??0)+' / '+(data.reviewerRequests??0)+'；合法返回不代表识别准确。未知样本保留原分母。');
  for(const a of data.arms){
   const tr=el('tr');for(const value of [a.arm,...['attackSuccessRate','unauthorizedSideEffectRate','policyDenialRate','canaryDetectionRate','benignTaskCompletionRate','falsePositiveRate'].map(k=>ratio(a.metrics[k]))])tr.append(el('td',value));$('results').append(tr);
   const m=a.metrics[metric],row=el('div',undefined,'comparison-row');const label=el('div',undefined,'comparison-label');label.append(el('strong',titles[a.arm]??a.arm),el('small',a.arm));
   const bar=el('div',undefined,'comparison-bar');bar.setAttribute('aria-hidden','true');
   if(m?.denominator>0){const observed=el('span',undefined,metric==='attackSuccessRate'?'bar-observed':'bar-complete');observed.style.width=(m.numerator/m.denominator*100)+'%';bar.append(observed);if(m.unknown){const unknown=el('span',undefined,'bar-unknown');unknown.style.width=(m.unknown/m.denominator*100)+'%';bar.append(unknown);}}
   const value=el('div',undefined,'comparison-value');value.append(el('strong',m?.denominator>0?m.numerator+'/'+m.denominator:'未验证'),el('small',m?.unknown?'未知 '+m.unknown+'，未剔除':metric==='benignTaskCompletionRate'?'失败 '+(m.denominator-m.numerator)+' 次':'未知 0'));
   row.append(label,bar,value);row.setAttribute('aria-label',(titles[a.arm]??a.arm)+' '+(metric==='attackSuccessRate'?'攻击目标效果 ':'正常完成 ')+ratio(m));$('comparison-chart').append(row);
  }
  const attack=metric==='attackSuccessRate';text('observed-label',attack?'观察到目标效果':'正常完成');text('remainder-label',attack?'未观察到目标效果':'正常任务未完成');document.querySelector('.chart-legend i')?.classList.toggle('complete',!attack);
  text('chart-caption',attack?'每条按该组攻击试验分母绘制；其余试验不直接等同于防护拦截。':'每条按该组正常任务分母绘制；普通写入失败保留在分母内。');
 }
 $('dataset').addEventListener('change',renderExperiments);
 for(const button of document.querySelectorAll('[data-metric]'))button.addEventListener('click',()=>{metric=button.dataset.metric;document.querySelectorAll('[data-metric]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderExperiments();});

 function cloneControl(id){const original=$(id),replacement=original.cloneNode(true);original.replaceWith(replacement);return replacement;}
 const exportButton=cloneControl('export-audit'),ackButton=cloneControl('ack-audit');
 const auditView=()=>document.querySelector('[data-view="audit"]').click();
 function publicPackage(id){return snapshot.publicPackages.find(p=>p.trialId===id);}
 function updateDossier(row){selectedEvent=row;text('audit-record-id',row.id);text('audit-record-type',row.phase);text('audit-record-call',row.tool);text('audit-record-policy',row.outcome+' · '+row.reason);text('audit-record-signal',['CANARY','HONEYPOT'].includes(row.phase)?'记录到实际命中；不代表普遍检出率':'本条不是 Canary 命中事件');text('audit-record-isolation',row.phase==='ISOLATION'?'记录到隔离转换':'本条不单独证明隔离');text('audit-ack-state','未标记 · 当前页面状态');ackButton.textContent='在本页标记已查看';document.querySelectorAll('[data-recorded-row]').forEach(node=>node.classList.toggle('is-selected',node.dataset.recordedRow===row.id));}
 function filterRows(){const kind=$('audit-filter').value;for(const row of document.querySelectorAll('[data-recorded-row]'))row.hidden=kind!=='all'&&row.dataset.recordedKind!==kind;}
 $('audit-filter').addEventListener('change',filterRows);
 ackButton.addEventListener('click',()=>{const checked=ackButton.dataset.checked!=='true';ackButton.dataset.checked=String(checked);text('audit-ack-state',checked?'已查看 · 仅当前页面':'未标记 · 当前页面状态');ackButton.textContent=checked?'取消本地标记':'在本页标记已查看';});
 function showPackageTrace(pkg){
  const raw=JSON.parse(pkg.files['raw-trial.json']);
  const trace=Array.isArray(raw.securityTrace)&&raw.securityTrace.length?raw.securityTrace:JSON.parse(pkg.files['events.json']).map(e=>({phase:'AUDIT',outcome:e.decision,reason:e.decision_reason,toolName:e.tool_id,timestamp:e.timestamp}));
  rows=trace.map((e,i)=>({id:'REC-'+String(i+1).padStart(3,'0'),phase:e.phase,outcome:e.outcome,reason:e.reason,tool:e.toolName,timestamp:e.timestamp,kind:['CANARY','HONEYPOT','ISOLATION'].includes(e.phase)?'signal':['POLICY','DENIAL','REVIEWER'].includes(e.phase)?'policy':'boundary'}));
  text('incident-record-id',pkg.trialId);text('incident-record-scope','DETERMINISTIC / RECORDED');text('incident-heading',pkg.trialId.includes('normal-write')?'正常写入失败记录':pkg.trialId.includes('bait')?'诱饵命中与后续动作拒绝':'已保存的 Gateway 执行记录');text('incident-subheading','真实工具执行存档 · 确定性驱动，无 Agent 模型参与');text('incident-state-label','存档记录 / 非实时');text('audit-source-note','试验 '+pkg.trialId+' · '+(pkg.kind==='PUBLIC_DERIVATIVE_DETERMINISTIC_FIXTURE'?'公开衍生副本，本机路径已移除，原事件未改。':'本机原始存档。'));
  const body=$('audit-rows');body.replaceChildren();
  for(const row of rows){const tr=el('tr');tr.tabIndex=0;tr.dataset.recordedRow=row.id;tr.dataset.recordedKind=row.kind;for(const value of [row.timestamp,row.phase+' · '+row.tool,'Gateway / '+row.kind,row.outcome+' · '+row.reason,row.id])tr.append(el('td',value));tr.addEventListener('click',()=>updateDossier(row));tr.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();updateDossier(row);}});body.append(tr);}
  const priority=$('overview-events');priority.replaceChildren();for(const row of rows.slice(-10)){const li=el('li',undefined,'event-row'),label=el('span',undefined,'event-row__text');label.append(el('strong',row.phase+' · '+row.outcome),el('small',row.reason));const button=el('button','查看','text-action');button.type='button';button.addEventListener('click',()=>{auditView();$('audit-filter').value='all';filterRows();updateDossier(row);});li.append(el('span',row.phase==='ISOLATION'?'隔离':row.outcome==='DENY'?'拒绝':'存档','event-severity'),label,el('code',row.id),button);priority.append(li);}
  text('overview-event-source','确定性试验 '+pkg.trialId+' 的实际存档；非当前实时事件。');document.querySelector('.priority-count').textContent=String(rows.length).padStart(2,'0');
  $('audit-filter').value='all';filterRows();if(rows.length)updateDossier(rows[0]);
 }
 exportButton.addEventListener('click',()=>{download({source:'RECORDED_DETERMINISTIC_TRIAL',trialId:$('trial').value,events:rows,scope:'Recorded deterministic fixture, not live or cloud-model transcript.'},$('trial').value+'-trace.json');text('audit-export-status','已导出当前存档事件，附带记录来源与适用范围。');});
 for(const pkg of snapshot.publicPackages){const option=el('option',pkg.trialId);option.value=pkg.trialId;$('trial').append(option);}
 $('trial').querySelector('option[value=""]')?.remove();$('trial').value='D_COMPLETE-bait-followup';
 function clearPackage(){selectionVersion++;selectedPackage=null;$('package-export').disabled=true;text('package-status','尚未校验。');text('evidence-preview','尚未校验当前选择。');const pkg=publicPackage($('trial').value);if(pkg)showPackageTrace(pkg);}
 $('trial').addEventListener('change',clearPackage);
 $('package-view').addEventListener('click',async()=>{
  if(packageBusy)return;packageBusy=true;const version=selectionVersion,id=$('trial').value,button=$('package-view');button.disabled=true;button.setAttribute('aria-busy','true');selectedPackage=null;$('package-export').disabled=true;text('package-status','正在重新计算五个文件与事件链…');
  try{const pkg=connected&&validationApiAvailable?await api('validation/evidence?trialId='+encodeURIComponent(id)):publicPackage(id);if(!pkg)throw Error('没有该试验包');const checked=await window.CanaryEvidence.verify(pkg);if(!checked.valid)throw Error(checked.reason);if(version!==selectionVersion)return;selectedPackage={...pkg,verification:checked};text('package-status','试验包文件哈希与审计链验证通过。'+(connected&&validationApiAvailable?'本机原始包。':'公开衍生包，本机路径已移除；不等于完整云试验包。'));text('evidence-preview',pkg.files['manifest.json']);$('package-export').disabled=false;showPackageTrace(pkg);}
  catch(error){if(version===selectionVersion)text('package-status','校验未通过：'+error.message+'。未启用导出。');}
  finally{packageBusy=false;button.disabled=false;button.removeAttribute('aria-busy');}
 });
 $('package-export').addEventListener('click',()=>{if(selectedPackage?.verification.valid)download(selectedPackage,selectedPackage.trialId+'-evidence-package.json');});

 function disableLive(){connected=false;for(const button of document.querySelectorAll('[data-action]'))button.disabled=true;$('verify').disabled=true;}
 function renderRuntime(){
  text('local-state-label',runtime.guard);text('backend-guard-state',runtime.guard);text('backend-runtime-state','LOCAL SANDBOX');text('backend-evidence-count',String(runtime.evidence.length));text('backend-event-count',String(runtime.securityTrace?.length??0));
  const list=$('event-list');list.replaceChildren();const entries=[...runtime.evidence.map(e=>({timestamp:e.timestamp,text:e.tool_id+' · '+e.decision+' · '+e.execution_status+' · '+e.decision_reason})),...(runtime.securityTrace??[]).filter(e=>['CANARY','HONEYPOT','ISOLATION','REVIEWER'].includes(e.phase)).map(e=>({timestamp:e.timestamp,text:e.phase+' · '+e.outcome+' · '+e.reason}))].sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
  for(const entry of entries.slice(-16))list.append(el('li',entry.timestamp+' · '+entry.text));if(!entries.length)list.append(el('li','本次页面尚未执行本机操作。'));
  text('action-result',runtime.lastResult?.error?'本机返回：'+runtime.lastResult.error:runtime.lastResult?'本机实际调用已返回。':'当前为新建的临时文件演示，尚无调用。');
 }
 async function refresh(){if(!local)return;try{
  let state;try{state=await api('validation');validationApiAvailable=Boolean(state.runtime&&Array.isArray(state.runtime.evidence));}catch{state=null;}
  if(!validationApiAvailable){const runtimeState=await api('runtime3');if(!Array.isArray(runtimeState.evidence))throw Error('本机状态格式不完整');state={runtime:runtimeState};}
  connected=true;runtime=state.runtime;
  datasets=Object.fromEntries(Object.keys(snapshot.datasets).map(key=>[key,state[key]??snapshot.datasets[key]]));
  $('backend-connection').dataset.state='connected';text('backend-status-title','已读取本机真实后端');text('backend-status-copy',validationApiAvailable?'实验仍是已保存记录；审计页的按钮操作真实临时文件，无 Agent 模型参与。':'本机运行时可用；历史实验仍读随包快照，公开衍生证据包仍可离线校验。');text('backend-mode',validationApiAvailable?'LOOPBACK / FULL VALIDATION':'LOOPBACK / RUNTIME API');text('runtime-badge-label','本机演示 · 已保存实验');text('backend-metrics-scope','当前临时文件演示的实际状态，不代表生产 Agent 遥测。');$('backend-metrics').hidden=false;
  text('action-scope','已连接本机服务。按钮操作当前进程的临时文件与注册工具，无模型参与；操作后显示实际返回。');text('package-origin',validationApiAvailable?'已连接本机：校验按钮读取本机原始确定性试验包；存档链路仍明确标注来源。':'本机 API 仅提供当前运行时状态；离线证据使用公开衍生包，不冒充本机原始包。');for(const button of document.querySelectorAll('[data-action]'))button.disabled=false;$('verify').disabled=false;$('refresh').hidden=false;
  const link=$('backend-link');link.href=location.pathname;link.removeAttribute('target');link.textContent='刷新本机状态 ↻';link.onclick=event=>{event.preventDefault();void refresh();};renderRuntime();renderExperiments();
 }catch(error){disableLive();$('backend-connection').dataset.state='error';text('backend-status-title','本机 API 不可用');text('backend-status-copy',error.message+'。已禁用实际操作；存档数据仍可阅读，不冒充本机结果。');text('local-state-label','DISCONNECTED');text('runtime-badge-label','连接失败 · 存档可读');text('action-result','本机连接已中断，未用存档替代操作结果。');}}
 $('refresh').addEventListener('click',refresh);
 for(const button of document.querySelectorAll('[data-action]'))button.addEventListener('click',async()=>{if(!connected)return;for(const b of document.querySelectorAll('[data-action]'))b.disabled=true;try{runtime=await api('runtime3/action',{action:button.dataset.action});renderRuntime();}catch(error){disableLive();text('action-result',error.message+'。没有生成替代结果，请恢复本机连接。');}finally{if(connected)for(const b of document.querySelectorAll('[data-action]'))b.disabled=false;}});
 $('verify').addEventListener('click',async()=>{try{if(!connected)throw Error('未连接本机');runtime=await api('runtime3');await window.CanaryEvidence.chain(runtime.evidence,runtime.chain.head);text('verify-result','当前演示哈希链在浏览器重新计算通过；不构成数字签名。');}catch(error){text('verify-result','校验未通过：'+error.message);}});
 clearPackage();renderExperiments();if(local)void refresh();else{disableLive();text('backend-status-title','已载入实验快照 · 静态模式');text('backend-status-copy','无需后端即可查看四批实验、存档链路和浏览器证据校验。实际操作未运行。');}
})();
