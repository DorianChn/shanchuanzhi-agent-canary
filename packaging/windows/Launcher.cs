using System;
using System.IO;
using System.Text;
using System.Linq;
using System.Diagnostics;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using System.Drawing;
using System.Threading.Tasks;
[assembly:System.Reflection.AssemblyVersion("3.0.0.3")]
[assembly:System.Reflection.AssemblyFileVersion("3.0.0.3")]
namespace AgentCanary {
static class Entry {
 [STAThread] static int Main(string[] args) {
  if(args.Length>0)Console.SetOut(new StreamWriter(Console.OpenStandardOutput(),new UTF8Encoding(false)){AutoFlush=true});
  Application.EnableVisualStyles(); Application.SetCompatibleTextRenderingDefault(false);
  if(args.Length>0 && args[0]=="--smoke") { try { Runtime.Validate(); Console.WriteLine("PAYLOAD_VERIFIED"); return 0;} catch {return 1;} }
  if(args.Length==3&&args[0]=="--backend") {try{if(!Path.IsPathRooted(args[2]))return 1;Runtime.Data=args[2];Console.WriteLine(Runtime.Json.Serialize(Runtime.Run(args[1],"external")));return 0;}catch(Exception e){Console.WriteLine(Runtime.Json.Serialize(new{status="FAILED",error=e.Message}));return 1;}}
  Application.Run(new MainForm()); return 0;
 }
}
static class Runtime {
 internal const string Anchor="__MANIFEST_SHA__";
 internal static string Root=AppDomain.CurrentDomain.BaseDirectory;
 internal static string Data=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"AgentCanaryCommunityData");
 internal static JavaScriptSerializer Json=new JavaScriptSerializer {MaxJsonLength=8*1024*1024,RecursionLimit=100};
 internal static string Hash(string f){using(var h=SHA256.Create())using(var s=File.OpenRead(f))return BitConverter.ToString(h.ComputeHash(s)).Replace("-","").ToLowerInvariant();}
 internal static void Validate(){
  if(Hash(Path.Combine(Root,"PAYLOAD_MANIFEST.json"))!=Anchor)throw new Exception("MANIFEST_DIGEST_MISMATCH");
  var m=Json.Deserialize<Dictionary<string,object>>(File.ReadAllText(Path.Combine(Root,"PAYLOAD_MANIFEST.json")));
  var items=(System.Collections.ArrayList)m["files"];
  if(items.Count>15000)throw new Exception("MANIFEST_TOO_LARGE");
  foreach(Dictionary<string,object> item in items){string p=(string)item["path"];
   if(Path.IsPathRooted(p)||p.Contains(":")||p.Contains("\\")||p.Split('/').Any(x=>x==".."||x=="."||x==""))throw new Exception("UNSAFE_PAYLOAD_PATH");
   string f=Path.Combine(Root,p.Replace('/',Path.DirectorySeparatorChar));
   for(string d=f;d.TrimEnd((char)92)!=Root.TrimEnd((char)92);d=Path.GetDirectoryName(d))if((File.GetAttributes(d)&FileAttributes.ReparsePoint)!=0)throw new Exception("SYMLINK_PAYLOAD_REJECTED");
   if(new FileInfo(f).Length!=Convert.ToInt64(item["size"])||Hash(f)!=(string)item["sha256"])throw new Exception("PAYLOAD_FILE_MISMATCH");
  }
 }
 internal static string Quote(string s){var b=new StringBuilder();b.Append((char)34);int n=0;foreach(char c in s){if(c==(char)92){n++;continue;}if(c==(char)34){b.Append((char)92,n*2+1);b.Append(c);}else{b.Append((char)92,n);b.Append(c);}n=0;}b.Append((char)92,n*2);b.Append((char)34);return b.ToString();}
 internal static Dictionary<string,object> Run(string action,string role){
  Validate();
  var p=new Process {StartInfo=new ProcessStartInfo(Path.Combine(Root,"runtime","node.exe")){UseShellExecute=false,CreateNoWindow=true,WorkingDirectory=Root,RedirectStandardOutput=true,RedirectStandardError=true,StandardOutputEncoding=Encoding.UTF8,StandardErrorEncoding=Encoding.UTF8,Arguments=string.Join(" ",new[]{Path.Combine(Root,"worker.mjs"),action,Data,role,Anchor}.Select(Quote))}};
  p.StartInfo.EnvironmentVariables.Clear();
  foreach(string name in new[]{"SystemRoot","WINDIR","TEMP","TMP"})p.StartInfo.EnvironmentVariables[name]=Environment.GetEnvironmentVariable(name)??"";
  p.StartInfo.EnvironmentVariables["PATH"]=Path.Combine(Root,"runtime")+";"+Environment.GetFolderPath(Environment.SpecialFolder.System);
  p.Start(); var stdout=p.StandardOutput.ReadToEndAsync();var stderr=p.StandardError.ReadToEndAsync();
  if(!p.WaitForExit(120000)){p.Kill();throw new Exception("VERIFICATION_TIMEOUT");}
  Task.WaitAll(stdout,stderr);
  if(stdout.Result.Length>8*1024*1024)throw new Exception("OUTPUT_LIMIT");
  Dictionary<string,object> result;
  try{result=Json.Deserialize<Dictionary<string,object>>(stdout.Result);}catch{throw new Exception("INVALID_WORKER_RESPONSE");}
  if(!result.ContainsKey("status")||((p.ExitCode!=0||(string)result["status"]=="FAILED")&&!result.ContainsKey("report")))throw new Exception(result.ContainsKey("error")?(string)result["error"]:"CHECK_FAILED_EXPORT_REPORT_FOR_DETAILS");
  return result;
 }
 internal static Dictionary<string,object> RunAutoE4(string role,Action<Dictionary<string,object>> onEvent){
  Validate();
  var p=new Process {StartInfo=new ProcessStartInfo(Path.Combine(Root,"runtime/node.exe")){UseShellExecute=false,CreateNoWindow=true,WorkingDirectory=Root,RedirectStandardOutput=true,RedirectStandardError=true,StandardOutputEncoding=Encoding.UTF8,StandardErrorEncoding=Encoding.UTF8,Arguments=string.Join(" ",new[]{Path.Combine(Root,"worker.mjs"),"auto-e4",Data,role,Anchor}.Select(Quote))}};
  p.StartInfo.EnvironmentVariables.Clear();
  foreach(string name in new[]{"SystemRoot","WINDIR","TEMP","TMP","ProgramFiles","ProgramFiles(x86)","LOCALAPPDATA"})p.StartInfo.EnvironmentVariables[name]=Environment.GetEnvironmentVariable(name)??"";
  p.StartInfo.EnvironmentVariables["PATH"]=Path.Combine(Root,"runtime")+";"+Environment.GetFolderPath(Environment.SpecialFolder.System);
  Dictionary<string,object> final=null;var outputError=new StringBuilder();
  p.OutputDataReceived+=(s,e)=>{if(string.IsNullOrEmpty(e.Data))return;try{var item=Json.Deserialize<Dictionary<string,object>>(e.Data);if(item!=null&&item.ContainsKey("type")&&(string)item["type"]=="result")final=item;else if(item!=null&&onEvent!=null)onEvent(item);}catch{if(onEvent!=null)onEvent(new Dictionary<string,object>{{"type","log"},{"message","Unstructured worker output omitted."}});}};
  p.ErrorDataReceived+=(s,e)=>{if(!string.IsNullOrEmpty(e.Data)&&outputError.Length<8192)outputError.AppendLine(e.Data);};
  p.Start();p.BeginOutputReadLine();p.BeginErrorReadLine();
  if(!p.WaitForExit(600000)){try{p.Kill();}catch{}throw new Exception("AUTO_E4_TIMEOUT");}
  p.WaitForExit();
  if(final==null)throw new Exception("AUTO_E4_NO_FINAL_REPORT"+(outputError.Length>0?": "+outputError.ToString().Trim():""));
  final["processExitCode"]=p.ExitCode;return final;
 }
}
class MainForm:Form {
 public void SetEnglish(){language.SelectedIndex=1;}
 bool english=false,busy=false; Label title,scope,state; ComboBox language,role; Button environment,verify,export,external,autoE4,openReport; DataGridView grid; TextBox details; string session="",lastReport="";
 string T(string zh,string en){return english?en:zh;}
 public MainForm(){Text="Agent Canary Community";ClientSize=new Size(1040,760);MinimumSize=new Size(900,650);AutoScaleMode=AutoScaleMode.Dpi;Font=new Font("Microsoft YaHei UI",10);StartPosition=FormStartPosition.CenterScreen;
 var layout=new TableLayoutPanel {Dock=DockStyle.Fill,Padding=new Padding(24),ColumnCount=1,RowCount=7};layout.RowStyles.Add(new RowStyle(SizeType.Absolute,50));layout.RowStyles.Add(new RowStyle(SizeType.Absolute,62));layout.RowStyles.Add(new RowStyle(SizeType.Absolute,50));layout.RowStyles.Add(new RowStyle(SizeType.Absolute,56));layout.RowStyles.Add(new RowStyle(SizeType.Percent,60));layout.RowStyles.Add(new RowStyle(SizeType.Percent,40));layout.RowStyles.Add(new RowStyle(SizeType.Absolute,55));Controls.Add(layout);
 var header=new FlowLayoutPanel {Dock=DockStyle.Fill};title=new Label {AutoSize=true,Font=new Font(Font.FontFamily,20,FontStyle.Bold),Text="Agent Canary 3.0"};language=new ComboBox {DropDownStyle=ComboBoxStyle.DropDownList,Width=140};language.Items.AddRange(new object[]{"简体中文","English"});language.SelectedIndex=0;language.SelectedIndexChanged+=(s,e)=>{english=language.SelectedIndex==1;Translate();};header.Controls.Add(title);header.Controls.Add(language);layout.Controls.Add(header,0,0);
 scope=new Label {Dock=DockStyle.Fill};layout.Controls.Add(scope,0,1);
 var roles=new FlowLayoutPanel {Dock=DockStyle.Fill};external=new Button {AutoSize=true};role=new ComboBox {DropDownStyle=ComboBoxStyle.DropDownList,Width=245};roles.Controls.Add(external);roles.Controls.Add(role);layout.Controls.Add(roles,0,2);external.Click+=(s,e)=>MessageBox.Show(T("请选择真实身份。外部测试者声明不自动构成 E4；需另一位操作者的独立环境记录与人工审阅。","Declare your actual role. External status does not certify E4; a different operator, independent environment and review are required."));
 var buttons=new FlowLayoutPanel {Dock=DockStyle.Fill};environment=new Button {AutoSize=true,Height=38};verify=new Button {AutoSize=true,Height=38};export=new Button {AutoSize=true,Height=38};autoE4=new Button {AutoSize=true,Height=38,Font=new Font(Font.FontFamily,10,FontStyle.Bold)};openReport=new Button {AutoSize=true,Height=38,Enabled=false};buttons.Controls.AddRange(new Control[]{environment,verify,export,autoE4,openReport});layout.Controls.Add(buttons,0,3);
 grid=new DataGridView {Dock=DockStyle.Fill,ReadOnly=true,AllowUserToAddRows=false,AllowUserToDeleteRows=false,RowHeadersVisible=false,AutoSizeColumnsMode=DataGridViewAutoSizeColumnsMode.Fill};grid.Columns.Add("item","项目");grid.Columns.Add("status","状态");grid.Columns.Add("detail","实际结果");grid.Columns[0].FillWeight=35;grid.Columns[1].FillWeight=25;grid.Columns[2].FillWeight=100;layout.Controls.Add(grid,0,4);
 details=new TextBox {Dock=DockStyle.Fill,Multiline=true,ReadOnly=true,ScrollBars=ScrollBars.Both,WordWrap=false,Font=new Font("Consolas",9)};layout.Controls.Add(details,0,5);state=new Label {Dock=DockStyle.Fill};layout.Controls.Add(state,0,6);
 environment.Click+=async(s,e)=>await Execute("environment");verify.Click+=async(s,e)=>await Execute("verify");export.Click+=async(s,e)=>await Execute("export");autoE4.Click+=async(s,e)=>await Execute("auto-e4");openReport.Click+=(s,e)=>OpenLastReport();Translate();Shown+=async(s,e)=>await Execute("initialize"); }
 void Translate(){int old=role.SelectedIndex;role.Items.Clear();role.Items.AddRange(english?new object[]{"Identity not declared","Project author","External tester","Other"}:new object[]{"尚未声明身份","项目作者","外部测试者","其他"});role.SelectedIndex=old<0?0:old;scope.Text=T("自动 E4 会执行本机真实 SDK 副作用检查、Hook 包装器故障夹具，并只读检查 VMware/公开 Release。它不会启动或恢复虚拟机，也不会调用模型 API；Codex CLI 存在不代表 GPT-6 已验证。VM/Guest 通道或模型调用条件不足时标为 BLOCKED。外部独立性仍需另一位操作者在独立环境复现。\n本候选程序未签名；请核对发布来源与 SHA-256，不绕过系统警告。","Auto E4 runs real local SDK side-effect checks and a hook-wrapper fault fixture, then performs read-only VMware/public Release checks. It will not start/restore a VM or call a model API; Codex CLI presence does not verify GPT-6. Missing VM/guest transport or model-call prerequisites are BLOCKED. External independence still requires another operator in an independent environment.\nUnsigned candidate. Verify the release source and SHA-256; respect Windows security warnings.");environment.Text=T("一键环境检测","Check environment");verify.Text=T("一键安全验证","Verify security");export.Text=T("导出复现报告","Export report");autoE4.Text=T("自动 E4","Auto E4");openReport.Text=T("打开最终报告","Open final report");external.Text=T("外部独立复现 / 身份说明","Independent reproduction / identity");grid.Columns[0].HeaderText=T("项目","Check");grid.Columns[1].HeaderText=T("状态","Status");grid.Columns[2].HeaderText=T("实际结果","Observed result");state.Text=T("未执行的检查不会显示通过。会话：","Unrun checks are not passed. Session: ")+session;}
 string Role(){return new[]{"unspecified","author","external","other"}[role.SelectedIndex];}
 async Task Execute(string action){if(busy)return;busy=true;environment.Enabled=verify.Enabled=export.Enabled=autoE4.Enabled=role.Enabled=openReport.Enabled=false;state.Text=T("正在实际执行，请稍候…","Running actual checks…");if(action=="auto-e4"){grid.Rows.Clear();details.Clear();}try{string selected=Role();if(action=="initialize"){var init=await Task.Run(()=>Runtime.Run(action,selected));session=(string)init["sessionId"];Translate();return;}if(action=="auto-e4"){var autoResult=await Task.Run(()=>Runtime.RunAutoE4(selected,msg=>{try{BeginInvoke((Action)(()=>UpdateE4Progress(msg)));}catch{}}));lastReport=autoResult.ContainsKey("markdownFile")?(string)autoResult["markdownFile"]:"";if(!string.IsNullOrEmpty(lastReport))openReport.Enabled=true;var report=autoResult.ContainsKey("report")?Runtime.Json.Serialize(autoResult["report"]):"";details.AppendText(Environment.NewLine+T("最终报告：","Final report: ")+(autoResult.ContainsKey("markdownFile")?autoResult["markdownFile"]:"NOT_VERIFIED")+Environment.NewLine+T("证据包 SHA-256：","Evidence bundle SHA-256: ")+(autoResult.ContainsKey("bundleSHA256")?autoResult["bundleSHA256"]:"NOT_VERIFIED")+Environment.NewLine+T("外部独立性：E4 EXTERNAL INDEPENDENCE NOT VERIFIED","External independence: E4 EXTERNAL INDEPENDENCE NOT VERIFIED")+Environment.NewLine+report);state.Text=(string)autoResult["status"]+" · "+(string)autoResult["overallE4"];return;}var regularResult=await Task.Run(()=>Runtime.Run(action,selected));if(action=="export"){using(var dlg=new SaveFileDialog {Filter="JSON (*.json)|*.json",FileName="AgentCanary-Reproduction-"+DateTime.Now.ToString("yyyyMMdd-HHmmss")+".json"}){if(dlg.ShowDialog()==DialogResult.OK){string md=Path.ChangeExtension(dlg.FileName,".md");if(File.Exists(md)&&MessageBox.Show(T("Markdown 已存在，覆盖？","Markdown exists. Overwrite?"),Text,MessageBoxButtons.YesNo)!=DialogResult.Yes)return;File.WriteAllText(dlg.FileName,(string)regularResult["json"],new UTF8Encoding(false));File.WriteAllText(md,(string)regularResult["markdown"],new UTF8Encoding(false));state.Text=T("JSON 与 Markdown 已脱敏导出。E4 仍需人工确认。","Redacted JSON and Markdown exported. E4 still requires review.");}}return;}var checkReport=(Dictionary<string,object>)regularResult["report"];grid.Rows.Clear();foreach(Dictionary<string,object> c in (System.Collections.ArrayList)checkReport["checks"]){grid.Rows.Add(c[english?"nameEn":"nameZh"],c["status"],c.ContainsKey(english?"summaryEn":"summaryZh")&&c[english?"summaryEn":"summaryZh"]!=null?c[english?"summaryEn":"summaryZh"]:Runtime.Json.Serialize(c["detail"]));}details.Text=Runtime.Json.Serialize(checkReport);state.Text=(string)regularResult["status"]+" · "+T("仅限本次测试范围","This run's bounded scope only");}catch(Exception e){state.Text=T("失败 / 未验证：","FAILED / NOT VERIFIED: ")+e.Message;details.Text=T("请重新下载并核对 SHA-256，确认安装目录未被修改。损坏文件不会默认放行。若仍失败，请向项目提交脱敏错误信息。","Download again and verify SHA-256. Modified payloads fail closed. Report a redacted error if the issue persists.");}finally{busy=false;environment.Enabled=verify.Enabled=export.Enabled=autoE4.Enabled=role.Enabled=true;openReport.Enabled=!string.IsNullOrEmpty(lastReport);}}
 void UpdateE4Progress(Dictionary<string,object> msg){if(!msg.ContainsKey("type")||(string)msg["type"]!="progress")return;string id=msg.ContainsKey("stageId")?Convert.ToString(msg["stageId"]):"log",status=msg.ContainsKey("status")?Convert.ToString(msg["status"]):"NOT_VERIFIED",message=msg.ContainsKey("message")?Convert.ToString(msg["message"]):"";DataGridViewRow row=null;foreach(DataGridViewRow candidate in grid.Rows)if(Convert.ToString(candidate.Tag)==id){row=candidate;break;}if(row==null){int index=grid.Rows.Add(id,status,message);row=grid.Rows[index];row.Tag=id;}else{row.Cells[1].Value=status;row.Cells[2].Value=message;}details.AppendText(DateTime.Now.ToString("HH:mm:ss")+"  "+id+"  "+status+"  "+message+Environment.NewLine);state.Text=status+" · "+id;}
 void OpenLastReport(){try{string basePath=Path.GetFullPath(Path.Combine(Runtime.Data,"auto-e4-runs"))+Path.DirectorySeparatorChar;string report=Path.GetFullPath(lastReport);if(!report.StartsWith(basePath,StringComparison.OrdinalIgnoreCase)||!File.Exists(report))throw new Exception("REPORT_PATH_INVALID");Process.Start(new ProcessStartInfo(report){UseShellExecute=true});}catch(Exception e){MessageBox.Show(T("无法打开报告：","Cannot open report: ")+e.Message,Text,MessageBoxButtons.OK,MessageBoxIcon.Warning);}}
}
}
