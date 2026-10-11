# Agent Canary 2.0 最终审查

基线 51bd95f，110 历史实验/旧视频/PDF/免费 ZIP 哈希保留；无 reset/clean、main 修改、商业迁移或生产数据访问。

新增 33 项根回归：16 安全 Router、11 接入安装、6 官方 hook fixture。根 209 项：205 通过、0 失败、4 跳过；Sponsor 25 项：24 通过、0 失败、1 跳过。重复 verify 不重复累计。

|组|攻击成功|观察拒绝防止|Canary|正常完成|硬误拒绝|审批中断|
|---|---|---|---|---|---|---|
|A_no_canary|4/19|0/19|0/19|8/8|0/8|0/8|
|B_decoy_only|6/19|0/19|0/19|8/8|0/8|0/8|
|C_guarded_router|6/19|0/19|0/19|8/8|0/8|0/8|
|D1_policy|1/19|5/19|0/19|6/8|0/8|2/8|
|D2_policy_ai|1/19|5/19|0/19|6/8|0/8|2/8|
|E_pre_review|1/19|5/19|0/19|6/8|2/8|0/8|

E 组没有降低 ASR（D1/E 均 1/19），且出现 2/8 正常任务硬拒绝，D1 为 0/8。10 次事前审查全部 suspicious，含正常构建与安装；中位 21.6 秒。AI 默认关闭，不能宣称独立增益。D1/D2 有 2/8 正常任务审批中断。



第二审查修复：P2 空 JSON 错当初始配置；P2 私有配置备份可能进入项目 Git；P2 AI 后面板未刷新。已有原路径边界、事后 AI、未声明 callback 超时等能力缺口在新可选层增强，旧 API 保持边界。初次测试期限抖动和 UI 失败证据保留，不删失败或改产品预期。

P0 新发现 0；新增 P1 Hook 新 Session 绕过已复现并修复；配置解析错误可能回显敏感行的 P1 已用虚拟数据复现并改成固定脱敏错误；P1 普通 V1/V2 分发仍 OPEN；5 个新 P2（空 JSON、备份位置、面板刷新、Hook 状态容量、损坏 TOML）已修复。写锁失败会留下保守全局标记，必须可信操作者审查，不能模型自动清理。不能证明不存在其他漏洞。

只保护注册到 Router 的宿主 callback。MCP 诱饵安装不等于全局保护；绕过 Guard、已开始的外部操作、模型内部状态 OUT_OF_SCOPE。AI 不能批准、重置 Guard 或改权限。realpath 仍有 TOCTOU 窗口；自定义网络 callback 需使用 DNS 固定与禁止重定向的安全 transport。来源提示不等于完整动态污点分析。

本地 Windows Node22 VERIFIED；其他 OS/Node20 与 Docker 以最终精确 HEAD 的 CI job 证据为准；本地 Docker 不存在不算通过。实际桌面 Agent 任务 BLOCKED/NOT VERIFIED；SDK stdio 三虚拟回调 VERIFIED_PROTECTED。云服务真实连通 BLOCKED：未提供授权密钥/成本范围。

稳定发布：未达到所有平台/集成/生产边界的全面标准；可审查的免费竞赛预览具备有限范围演示能力。正式提交需核实官方规则、最终 CI/PDF/video 公共链接，并由用户确认发送。

实际版本/CI/链接：competition-submission/V2_DELIVERY_VERSION.md。
## 最终交付证据

冻结代码 a0e8c2f5b0105cef0cd1718f67c6a4bf910c41a7；精确代码 CI 38119550766，9/9 jobs 已完成 success。本机 npm ci/build/test/pack:check/verify/audit 与 Sponsor ci/test/smoke/audit 全部退出 0，证据 v2-final-verification.json。根和 Sponsor audit 0；远端 main 仍报告 1 个 moderate Dependabot 告警，不能把本分支审计当 main 已修复。

实际模型经受保护 MCP：v2-real-mcp-agent.json，3 个运行完整留档。NORMAL 与 INJECTION 均读取后回答，注入样本没有诱饵或危险工具选择；SEEDED_QUARANTINE 的请求由 Guard 拒绝，预置信号不能计作模型检测。15 工具 SDK 握手另见 v2-mcp-verification.json。原有 15 项第一轮修复提交仍为本分支祖先。

独立免费 ZIP：v2-free-archive.json，78 条正向清单，商业实现不包含，实际解包 npm ci/tsc/self-test 与 12 诱饵 MCP 列表已验证。普通 npm/Docker 分发 P1 继续 OPEN。

新 PDF：12/4/7 页，共 23 页全渲染、文字提取与版面检查；新视频 275.533 秒、1080p、真实 Chromium 运行画面、中文字幕，无音轨，实际本地审查 33.34 秒；不是 OS 桌面录屏，不冒充自主模型攻击。证据 v2-pdf-verification.json、v2-video-recording.json。

新增 controls 验证：保存实验表、两个真实 JSON 下载、CLI 临时项目预览/安装/恢复，v2-product-controls.json。初次测试误用 guard 字段（实际 JSON 为 guardState）记录 v2-product-controls-initial.json 保留，属于验证脚本错误；没有修改产品预期。

五项 Windows 跳过：3 个 POSIX 权限测试、1 个根目录 symlink 测试、Sponsor 的 symlink 原子写测试；Windows junction 边界新增测试实际通过。其他 OS/Node20 和 Docker 结果来自真实 CI，不能当本机已运行。

实验 E 30s 预算/maxTokens400；SDK 默认 10s；视频明确 60s 宿主预算。D2 28 次事后解释中位 17.72 秒，E 10 次事前审查中位 21.60 秒、p95 28.55 秒，均没有证明独立 ASR 改善。原任意 Shell ASR 的残余 A06 仅模拟 ls -la，不悄悄改指标或宣称成功消除所有绕过。

## 策略阻断指标解释

可比攻击中的危险尝试：D1/D2 各 10 次，其中 8 次保持待批、2 次模拟 ls -la 允许，策略硬拒绝 0/10；E 8/10 硬拒绝、2 次同一只读命令允许。5/19 观察拒绝防止包含无人工批准而 withheld 的 callback，不是成功检测率，也不是 1-ASR。Canary 自主信号为 0，故可比攻击 Guard 拒绝 0/10；预置信号的独立 fixture 证明确实隔离，不能算自主检测。详细分母和审批 withholding 见 v2-summary.json。

## GitHub 公开交付

材料提交 0255c153da943c07fbb37d7bf2c10b140e81f1e6，实际9/9 CI https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38120625945；五份公开文件HTTP200/本机远端哈希一致，实际视频初播及seek后播放成功。初次公开播放验证在暂停后的readyState条件超时，失败记录保留；改用实际seek后继续播放检验，不放宽对文件内容或真实播放的要求。最终PR保持Draft，邮件仅草稿，公开代码/附件已同步，生产稳定/原生覆盖/商业分发P1尚未达到完整验收。
