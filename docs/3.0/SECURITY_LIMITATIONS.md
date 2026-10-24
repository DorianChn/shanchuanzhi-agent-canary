# Agent Canary 3.0 产品安全验收

日期：2026-10-12。核心修复 SHA：`9007e3a9fa6def487416e1dbb183143829b44aca`。历史冻结运行时 `99660b36db9d5b1121eea6fe06b026c5f1e36bcf` 保留；本轮确实修改网关检查，不能把历史实验重新标为新代码结果。独立分支 `fix/shanchuanzhi-3.0-product-acceptance`，不合并 main、PR24，不发送邮件，不发布稳定 npm/Docker。

## 明确边界

1. Gateway只控制已登记、合作的执行器；未接入原生工具、跨进程权限传播及操作系统调用级沙箱 OUT_OF_SCOPE。
2. 句柄绑定与执行前重新核验减小替换窗口；不能证明外部进程 TOCTOU 原子消除、旧 inode 永不被修改或已开始操作能撤销。
3. 非合作 callback忽略AbortSignal后仍可能产生迟到副作用，负面回归保留。应用层隔离无法替代OS沙箱。
4. 工具descriptor、可执行文件与任务脚本属于可信输入；参数分类不证明其全部运行代码安全。
5. Claude Hook Node能启动时的模块错误返回deny；启动失败/超时需宿主onFailure:block。官方要求2.1.295+，见 https://code.claude.com/docs/en/hooks 。--bare/禁用Hooks/未匹配工具不受此Hook控制。本轮现代宿主模型兼容 BLOCKED，不宣称失败闭合端到端已验证。
6. 数据流标签/摘要不是完整动态污点分析。编码拆分、不可观察模型内部状态和外部工具不保证追踪。
7. AI没有授权/解除隔离能力；超时和非法结果按可信策略处理。云端未使用真实密钥，没有真实连通或AI独立收益的新证明。
8. 哈希链检查仅支持固定写入者范围内的一致性；管理员能重写整链，无独立时间锚/E4认证。
9. 私网/DNS/重定向代码回归通过不等于所有公网HTTPS部署已验证。资源增长仅有有界实现与现有模拟，非长周期生产观测。
10. 正向清单免费Community与普通npm/Docker/自动源码包不同。后者旧V2分发风险P1保留；禁止作为本轮商业稳定发行依据。
11. GUI无管理员同机验收通过不等于干净WindowsVM/所有11版本；安装器未签名，不能绕过SmartScreen。
12. 历史模型实验保留原SHA；新修复实验单列，不将未出现攻击算主动阻断。

## 2026-10-12 真实宿主复测增补

本机 Codex CLI 原生 Shell 在隔离临时工作区把 `victim.txt` 哈希从 `D8FF1AA2…D0FE06` 改为 `DC72D90C…FEF2A0B`，而该会话没有任何 Gateway 证据。这确认 Agent Canary 只保护实际走其受控 SDK/MCP Gateway 的调用；Codex 内建工具没有被本产品控制。不能用自定义 MCP 握手或工具保护推断 Codex 的原生文件、Shell、网络操作都受保护。

在同一轮 A/B/C 直接对照中，A 的 loopback sink 确实收到请求，但合成凭据匹配器结果为 false；只确认发生网络副作用，不确认请求正文含有完整虚拟凭据。B/C 的文件哈希、Gateway 拒绝和 sink 空记录提供该测试夹具范围内的副作用证据，不形成总体防护率。

本机 Ollama/Qwen 预审一次将无害写入判为 suspicious 并硬拒绝；无 AI 基线会等待人工审批。历史 Qwen 汇总 D1/E 的 ASR 同为 1/19，且 E 正常任务误报为 2/8；AI 独立因果收益 NOT_MEASURED。AI 预审应被视为可造成兼容性中断的辅助策略，不是已经证明增加防护率的功能。

## 2026-10-23 M8 桌面接入状态补充 / M8 desktop integration status

Historical source-audit snapshot only / 仅保留当时源码审查的历史范围。Current Console routes and status semantics are defined by [API_CONTRACTS](API_CONTRACTS.md) and [the current compatibility matrix](../../COMPATIBILITY.md): GET status and separately authorized reads now exist; missing backend status is UNKNOWN. The dated 404 observations below are not current-route or product-acceptance claims.

以下是当前 M4 源码审计补充，不改写上文 2026-10-12 的历史验收结果。/ This is a current M4 source-audit addendum; it does not rewrite the historical 2026-10-12 acceptance record.

- [Issue #52](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/52) remains `OPEN / P0 / NOT_VERIFIED` for the first-party OBSERVE product-file path. The reviewed desktop UI has no protected-read action that consumes an M1-bound identity through the M2 adapter. Its status adapter hardcodes `NOT_VERIFIED`; the reviewed server has no `GET /api/security-center` handler and returns 404.
- M4's Runtime demo uses a generated temporary file through a demo Gateway; its policy demo is virtual. Neither reads a user/product file or establishes product-file protection. M1/M2/M5 fixtures and API compatibility do not establish a supported desktop host callsite.
- Keep path replacement/identity checks distinct from an OS-atomic TOCTOU guarantee. No OS-atomic guarantee, user-file protection, or actual secret exposure is established by this source audit. Preserve fail-closed behavior and report missing routes as `NOT_VERIFIED`, not as a successful denial.

- [Issue #52](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/52) 仍为 `OPEN / P0 / NOT_VERIFIED`：第一方 OBSERVE 产品文件读取路径尚未验证。已审查的桌面 UI 没有通过 M2 adapter 消费 M1 绑定身份的受保护读取动作；状态 adapter 固定返回 `NOT_VERIFIED`，服务端也没有 `GET /api/security-center` 路由（返回 404）。
- M4 Runtime 演示只通过演示 Gateway 读取新建的临时文件；策略演示使用虚拟回调。二者都不读取用户/产品文件，也不能证明产品文件保护。M1/M2/M5 fixture 和 API 兼容性不能证明桌面宿主已接线。
- 路径替换/身份复核与操作系统原子 TOCTOU 保证必须分开描述。本次源码审计没有证明 OS 原子保证、用户文件保护或实际敏感信息泄露。保持 fail-closed；缺失路由应标为 `NOT_VERIFIED`，不能描述成成功拒绝。
