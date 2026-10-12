# Agent Canary 3.0 产品安全验收

日期：2026-10-12。核心修复 SHA：`9007e3a9fa6def487416e1dbb183143829b44aca`。历史冻结运行时 `99660b36db9d5b1121eea6fe06b026c5f1e36bcf` 保留；本轮确实修改网关检查，不能把历史实验重新标为新代码结果。独立分支 `fix/shanchuanzhi-3.0-product-acceptance`，不合并 main、PR24，不发送邮件，不发布稳定 npm/Docker。

## 实际用户路径

|流程|结果|证据与限制|
|---|---|---|
|公开 candidate.3 EXE 当前用户 GUI 安装|PASS|中文及空格路径、无 UAC；非新 Windows 用户|
|环境检测/安全验证按钮|PASS|真实 C# GUI 调用 bundled Node+SDK，不是静态页面|
|正常文件写入|PASS|临时沙箱结果与内容核验|
|拒绝敏感读取、危险回调与出口|PASS|unsafeCalls=0、sinkRequests=0、前后 SHA 相同|
|导出 JSON/Markdown|PASS|实际 SaveFileDialog 保存；脱敏检查；不自动 E4|
|重启|PASS|持久会话一致；不把上次结果伪装成重新运行|
|标准卸载|PASS/PARTIAL|程序、登记、快捷方式移除；未知 keep-user.txt/报告保留；卸载按钮序列未完整抓取|
|Ubuntu WSL 安装/CLI/SDK类型/卸载|PASS|Ubuntu26.04、Node22.23.1、Python3；不是免依赖安装|
|当前 Claude 原生 Hook/Qwen|BLOCKED|正常启动遇到模型模板不兼容；--bare 实测 Hook不运行，OUT_OF_SCOPE|
|Codex/Cursor/Cline原生全局工具|NOT_VERIFIED|配置或 MCP 连接不能证明全局保护|

受控 SDK 模型正常8/8仅说明本批样本成功，不说明生产误报率为0。A/F单次任务中位时长约1337/1688ms；含模型及环境，不能当纯Guard开销。模型实际输入/输出Token：A30182/1730、F32022/2622；本地接口未付费。
