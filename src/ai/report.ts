import type { SecurityAnalysisResult } from './types.js';
export function renderAIReport(results: SecurityAnalysisResult[], format: 'json'|'markdown'|'csv'): string {
  if (results.length > 100) throw new Error('AI_REPORT_TOO_LARGE');
  if (format === 'json') return JSON.stringify({ advisoryOnly:true, scope:'this console process, up to 100 records', results },null,2);
  if (format === 'markdown') return '# Agent Canary AI 辅助分析\n\n模型输出为建议，非经校准的事实。费用未测量。\n\n' + results.map((r,i)=>'## 分析 '+(i+1)+'\n\n'+r.provider+' / '+r.model+' · '+r.status+' · '+r.verdict+' / '+r.severity+'\n\n'+r.summary+'\n\n原文证据：\n\n'+r.evidence.map(e=>'- '+e.eventId+': '+e.quote.replace(/\n/g,' ')).join('\n')+'\n\n耗时 '+r.durationMs.toFixed(2)+' ms；输入 Tokens '+(r.usage.inputTokens??'NOT MEASURED')+'；输出 Tokens '+(r.usage.outputTokens??'NOT MEASURED')+'\n').join('\n');
  const cell=(value:unknown)=>{let s=String(value??'NOT MEASURED');if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
  return 'provider,model,status,verdict,severity,summary,duration_ms,input_tokens,output_tokens\n'+results.map(r=>[r.provider,r.model,r.status,r.verdict,r.severity,r.summary,r.durationMs,r.usage.inputTokens,r.usage.outputTokens].map(cell).join(',')).join('\n')+'\n';
}
