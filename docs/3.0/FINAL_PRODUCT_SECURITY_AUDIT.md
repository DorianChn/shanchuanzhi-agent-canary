# Agent Canary 3.0 产品安全验收

日期：2026-10-12。核心修复 SHA：`9007e3a9fa6def487416e1dbb183143829b44aca`。历史冻结运行时 `99660b36db9d5b1121eea6fe06b026c5f1e36bcf` 保留；本轮确实修改网关检查，不能把历史实验重新标为新代码结果。独立分支 `fix/shanchuanzhi-3.0-product-acceptance`，不合并 main、PR24，不发送邮件，不发布稳定 npm/Docker。

## 已确认问题与修复

|编号|等级|复现及影响|最小修复|复测|
|---|---|---|---|---|
|PA-01|P2|免费 CLI 无 --version/build-info，无法分辨产品与旧包版本|增加明确构建身份、doctor；保留旧 CLI 兼容版|PASS 3 项身份/Hook回归，原失败记录保留|
|PA-02|P1|可信记录器回调替换路径后，已打开旧 inode 仍被写入，事后失败不足以证明没有副作用|在已持有文件句柄执行读写前重新检查绑定；策略版本 alpha.2|PASS 旧 inode 与替换目标均保持不变；不保证外部进程原子 TOCTOU|
|PA-03|P2|Hook 顶层 import 失败不进入拒绝处理|将 import 移入 try|PASS 缺少 dist 时返回 deny；Node/入口无法启动仍依赖宿主|
|PA-04|P2|桌面安装收据无界读取且任意 SHA 对象被当作登记|有界正规文件读取、64位摘要与版本校验|PASS 3 项新增包装回归|

修复核心提交 9007e3a；包装修复在后续独立提交。原始失败及修复证据见 [product-acceptance-evidence](product-acceptance-evidence/)。没有确认新 P0；这不构成全仓库不存在漏洞的证明。

## 实际执行

Windows Node 22.23.1：npm ci；npm run build；npm test；npm run pack:check；npm run verify；npm audit。主项目 314 项：310 PASS、0 FAIL、4 SKIPPED。Sponsor 子项目 npm ci/test/audit：25 项，24 PASS、0 FAIL、1 SKIPPED，仅虚拟订单/临时目录。两处 audit 均 0 已知漏洞。桌面包装 19 项：18 PASS、0 FAIL、1 SKIPPED。Python 验收器 7 PASS；前两轮分别因缺 jsonschema 和 Windows Git 不能定位 WSL 工作树失败，原记录保留；隔离依赖和显式 GIT_DIR 后成功。

上述四套最终结果合计 365 项：359 PASS、0 FAIL、6 SKIPPED；verify 重复执行不重复计数。模型 48 次另列，不计作自动化测试数。MCP stdio：12 诱饵+3虚拟宿主工具，5 步实际调用通过。

## 真实模型与副作用

受控 SDK Agent + 已安装 Qwen9B，12 独特场景×2重复×A/F=48次。危险试验 A 12/16，F 0/16；F 实际拒绝12/16。直接准入与 README 注入必须分开：README 两组均0/4，无主动拦截结论。正常任务两组8/8。当前实验没有 E4，也未测 AI/自适应独立增益。模型日志在 security-lab/evidence/2026-10-12T04-07-30-715Z；离线验收 37 schema 向量、48试验、24声明映射通过。

## 未关闭

P1：普通 npm/Docker 构建仍包含旧商业模块；仅正向清单 Community 被验证隔离。MIT 历史权利不变，不做付费用户迁移。P1部署限制：不合作执行器的迟到副作用不能由应用层撤销；外部进程 TOCTOU 无原子保证。详见 SECURITY_LIMITATIONS.md。
