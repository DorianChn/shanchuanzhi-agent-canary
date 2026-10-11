# Agent Canary 2.0 发布验收

验收日期：2026-10-11。基线 main `73cfdf990e7de669d5ffdb47ae56f5041ad4d31b`；新增文件持久化实现 `a5425b26a1f391eec7635a8f08dce121418c4e71`；新分支 `competition/shanchuanzhi-release-readiness`，Draft PR https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/23。PR #22 已合并，不改写其历史；本轮不合并、不稳定发布、不发送邮件。

## 发布现场与资料

| 检查 | 状态 | 证据 |
|---|---|---|
| main / PR22 | VERIFIED | `readiness-pr22.json`；merge commit 与基线相同 |
| 预发布Tag | VERIFIED | `v2.0.0-competition-preview.1`，target=main，prerelease=true；metadata JSON |
| 七附件内容 | VERIFIED | `release-install-2026-10-11T08-46-29-661Z/results.json`；逐个 SHA256 对比 API digest 与清单 |
| 官网2.0/手机/视频 | VERIFIED | `public-surface-2026-10-11T08-42-03-307Z/results.json`，1280×900/390×844，视频实际前进、275.533秒、无错误 |
| 官网链接 | VERIFIED / BLOCKED | 16个HTTP200；1个文档429限流，不认定死链接；仓库内目标存在 |
| npm公开registry | FAILED（未找到包） | `@dorianchn/agent-canary` npmjs E404；项目实际配置为 GitHub Packages，不宣称 npm2.0可安装 |
| GitHub Packages版本 | BLOCKED | 当前令牌缺少 read:packages，API403；没有读取Token或改变授权 |
| Docker本机 | BLOCKED | CLI未安装；不发布镜像；main CI已执行build/help smoke |
| baseline CI | VERIFIED | https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38123516544 ，9 jobs；新分支以PR精确HEAD检查为准 |
| 增强代码CI | VERIFIED | https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38126659543 ，精确HEAD `a5425b26a1f391eec7635a8f08dce121418c4e71`，9/9通过；包括Windows20/22、Linux20/22、macOS20/22、Docker、Sponsor与pack |
| 已发布资料冻结 | VERIFIED | PDF/视频/ZIP核心 a0e8c2f，材料0255c15；main73仅增发布元数据，不谎称重录 |
| 新候选免费ZIP | VERIFIED | `Agent_Canary_Competition_2_0_Readiness.zip`，84项，SHA `57db33063111f45860f9317b6bcaa493fe9949abc50a4fcb0b6fc7fc64ae4b22`；未稳定发布 |

下载首次超时、脚本未带 CSRF、复用临时路径 EEXIST 等失败证据保留；后两项是验收脚本错误，修正后全流程通过，没有降低产品安全检查。最终七附件都是实际下载字节，非仅凭元数据。

## 核心功能验收

| 能力 | 状态 | 实际证据与范围 |
|---|---|---|
| Token生成/植入/精确扫描/并发 | VERIFIED | test/tokens.test.ts；临时文件、跨进程写入，隐藏文件与边界回归 |
| MCP诱饵 | VERIFIED | 下载ZIP启动实际stdio，12工具；诱饵无真实副作用 |
| 隔离/后续callback拒绝/共享主体 | VERIFIED | containment/sdk/security-simulation 测试；下载ZIP callback计数未增加 |
| 状态重启持久化 | VERIFIED | 新增可选 file-state-store 16测试，包括真实子进程重启与四进程48条写入、Windows共享冲突；默认Map仍非持久化 |
| 首次危险参数检查 | VERIFIED（注册范围） | SecurityRouter文件/Shell/网络/凭据/外传规则，明确定义拒绝/审批 |
| 策略模式/审批过期/重放 | VERIFIED | risk-policy/security-router；模型approved字段无授权效果，控制台伪造operator403 |
| AI事前调用时序 | VERIFIED | review先于callback，隔离发生于等待期仍拒绝；benign不能授权，超时保守待批 |
| 敏感数据来源关联 | VERIFIED（轻量） | SessionDataFlow HMAC/TTL/256容量，同Guard传播；非完整动态污点分析 |
| Webhook/Provider安全边界 | VERIFIED（实现范围） | DNS固定、私网/重定向、响应上限、密钥脱敏/结构校验；任意第三方executor不自动继承 |
| 中文控制台 | VERIFIED | 从下载ZIP启动；审批、报告数据、MCP probe、隔离拒绝实际后端 |
| 真实云端API | NOT VERIFIED | OpenAI/Claude/Gemini/DeepSeek/通义/兼容协议仅mock测试；没有凭据/费用授权 |
| Ollama/Qwen | VERIFIED | 168真实请求驱动trial和10次前置审查；连接报告 |
| LM Studio/vLLM | IMPLEMENTED_NOT_VERIFIED | OpenAI兼容适配；服务未运行，未虚构连通 |

Claude Code、Cursor、Cline、Codex、自定义MCP：临时配置安装/12诱饵握手/卸载恢复 VERIFIED；真实桌面应用激活 NOT VERIFIED，原生工具覆盖 OUT_OF_SCOPE。自定义注册宿主的3项虚拟callback端到端 Guard VERIFIED，不等于保护全部客户端工具。

## 环境与测试

Windows11普通用户、中文含空格路径、Node22.23.1：npm ci/build/test/pack:check/verify/audit和Sponsor临时数据ci/test/smoke/audit全通过。根225项：221通过、0失败、4跳过；Sponsor25项：24通过、0失败、1跳过；合计250项，245通过、0失败、5跳过；重复verify不重复计数。

根和Sponsor npm audit均0已知漏洞。跳过为平台/权限差异，见逐项TAP日志。非全新OS、没有本机Node20独立安装、未改变防火墙/真实桌面配置。Linux/macOS/Windows Node20/22验证以实际GitHub六job为证据，不把矩阵配置当结果。

完整本地最终日志目录：`competition-submission/evidence/readiness-2026-10-11T08-58-15-320Z`。新增Windows共享冲突首次失败与重验均留档；跨平台最终核心提交已实际通过9项。后续仅文档材料提交的CI结果见PR检查，不将其预先标记成功。

## 问题、修复与发布门槛

- P2能力缺口已补：进程内共享Map不能持久化。可选文件适配器有界读取、显式首次创建、缺失/损坏拒绝、独占锁、原子写入、状态不回退。默认兼容；不声称分布式事务、断电保证或管理员抗篡改。
- P2资料保护已补：复测以前会覆盖已冻结summary；新增独立输出名，历史统计保留。
- 新适配器P2 Windows共享冲突已补：首轮CI Windows20失败，错误日志保留；新增3回归先复现14通过/2失败，再修复后16/16通过。锁竞争明确BUSY，rename有界重试，永久拒绝仍fail-closed且不覆盖状态；不通过重跑掩盖问题。
- P1 OPEN：普通 npm/Docker商业V1/V2分发边界。免费竞赛包正清单隔离通过；不自动整改生产架构、不删除license验证、不迁移业务数据，也不把历史披露说成撤销。
- AI判定硬误拒绝2/8仍存在；默认关闭，允许明确选择，不通过弱化Guard“修复”该误判。
- CLI/SDK而非桌面安装器；保护注册范围，绕过Guard及已开始副作用不完整覆盖。

正式稳定版门槛 **BLOCKED_WITH_EVIDENCE**（商业分发P1尚未关闭）。维持预发布。GitHub Stable/npm/Docker与main合并均需新的明确授权且先关闭发布阻塞。

竞赛独立免费交付 **READY_FOR_COMPETITION_SUBMISSION**，限已有公开预览版及明示范围；新候选增强通过但仍处于Draft PR，是否选用它由最终冻结清单确定。官方最新附件限制、邮件标题强制格式、时区原文 NOT VERIFIED，不伪造条款。


## 草稿准备

GitHub已准备未发布草稿v2.0.0-readiness-draft.1；draft=true，不更改公开Latest，不发稳定版。附件上传结果以 readiness-unpublished-release-draft.json 为证据，草稿链接不当成评委可公开访问的链接。
