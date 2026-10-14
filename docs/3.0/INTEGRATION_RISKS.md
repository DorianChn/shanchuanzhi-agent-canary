# M0/M9 集成风险登记

更新日期：2026-10-14。实时风险快照位于首个风险表；旧记录按原时间保留。

## 实时风险快照（2026-10-14 10:02 UTC；额度页约 10:00 实读）

| 风险 | 级别 | 责任与证据 | 状态 |
| --- | --- | --- | --- |
| #35 Guard quarantine | P0 | Issue #35 CLOSED；证据限同进程、同 Guard 实例且 callback 遵守 AbortSignal。跨进程/shared-store 与强制终止不在证据内。 | CLOSED（范围有限） |
| #32 Hook interruption | P1 | PR #43 f59ba37 的独立 CI 为 9/9；历史 wrapper 漏 marker 的精确根因仍 UNKNOWN，M9 候选尚待 GitHub CI。 | OPEN / INTEGRATION PENDING |
| #44 approval expiry | P1 | PR #43 独立 CI 9/9，过期后 callback 为零的候选测试通过；M9 共同基线 GitHub CI 尚未运行。 | OPEN / INTEGRATION PENDING |
| #48 OBSERVE sensitive read | P1 | PR #47 head cf4e2cd、run 38527097304 为 9/9；M5 本地 readiness 修正 eddef7e。M9 本地组合测试通过，但共同基线 GitHub CI 尚待运行；敏感读取 hard DENY 保留。 | OPEN / INTEGRATION PENDING |
| #41 M7 reliability | P1 | PR #39 主 CI 38510356534 为 9/9、wrapper 38510356548 为 2/2；VM 安装/升级/卸载和实际取消回滚未验证，隔离 VM 与回滚前置条件不足。 | BLOCKED / HOLD; NOT VERIFIED |
| #45 native host Shell | P1 | PR #37 远端 cb84f43 CI 9/9；M2 4875d84 将 hook_event_name 校验前置于无关工具透传；缺失/错误事件名拒绝，完整 PreToolUse 非 Bash 才透传。真实 Codex Desktop 原生 Shell 仍 UNPROTECTED；协议 fixture 不证明宿主保护。 | UNPROTECTED / OPEN |
| #27 manifest / package fields | P1 | M9 组合候选 845743d 的 aggregate verify、pack:check、100 文件 package smoke 本地通过；组合 GitHub CI 与 E4 消费者验收未完成。 | OPEN / CI PENDING |
| #28 Gateway lifecycle | P1 | M1/M7 两分支共基线 `62496d4`、互非祖先；M7 本地提交 `6d978a5` 选择性移植五个 M1 owner 文件，M1 审查通过且 blob 与 M1 HEAD `738a783` 一致。M7 报告 Gateway/containment/acceptance 66/66、reliability 43 pass/3 skip；M1 未独立重跑。PR #39 远端仍为 `5c7d95d`，候选尚未推送，combined GitHub CI pending。 | OPEN / LOCAL CANDIDATE OWNER-APPROVED |
| #46 canonical API contract | P2 | M0 维护唯一 canonical contract；M6 确认 SecurityEvidenceEvent 与 M5 PolicyAuditEvent 分离且当前不消费 M5 stream。外部 E4 仍 NOT_VERIFIED。 | OPEN |
| M9 combined acceptance | P1 | 本地计划文档 head `5c11113`；此前 397 项统计对应功能组合 head `83d7268`（391 pass、0 fail、6 环境条件 skip），package smoke 与 docs checks 已通过。该结果不覆盖当前文档 tip，也不证明 #28 的 M1+M7 代码已组合。PR #36 最近远端仍为 `996073a`，组合 GitHub CI 尚待推送触发。 | LOCAL EVIDENCE / CI PENDING |
| worktree pointers | P2 | M9 integration worktree 在 CRLF-aware core.autocrlf=true、禁可选索引锁的 status 下干净；默认 WSL Git 把 CRLF 行尾误报为全树 M。先前 0 B index.lock 已消失，未清理或改写。 | MONITOR |
| quota / scheduling | 调度门槛 | 网页用量页约 10:00 UTC 实读五小时 54%、每周 70%、余额 113、约 59m 后重置。最近已知推送约 07:14 UTC；M1/M7 已完成并释放槽位，本地待推送分支正在复核。VMware/真实模型/安装测试没有运行。 | MONITOR |

VMware、真实模型和安装测试互斥；M7 clean-VM 安装、升级、卸载及真实取消回滚仍 HOLD，未运行。五小时额度低于 5% 或无法读取时，暂停所有开发、测试、浏览器和 GitHub 操作；确认额度重置后再继续。
## 历史风险增量（2026-10-13 16:16 UTC）

| ID | 优先级 | 风险/证据 | 责任与当前动作 | 状态 |
| --- | --- | --- | --- | --- |
| R10 / #35 | P0 | ec3bc96 Guard/Gateway fix 在 PR #43 远端祖先中；current head 89e40cd 的回归测试及 9/9 CI 通过 | M1 确认所有验收标准并给 issue disposition；M0 已记录远端证据，保持 P0 门禁 | OWNER REVIEW |
| #32 | P1 | M1 PR #43 当前 9/9 checks 通过；历史 Windows Hook marker 根因/处置尚未由 owner 关闭 | M1 保留 fail-closed 断言并提交诊断结论 | OPEN |
| #44 | P1 | M1 PR #43 当前 9/9 checks 通过；approval-expiry 历史失败仍待 owner 明确结论 | M1 核对失效语义与请求追踪 | OPEN |
| R11 / #41 | P1 | PR #39 远端 head 65ce028 有 Windows Node20/22、macOS Node20、Windows wrapper 失败；本地 4f3a2c5+WIP 尚未过 CI | M7 推送后验证固定版本 NSIS 安装、编译和测试结果，保留全部门禁 | IN PROGRESS |
| R12 / #45 | P1 | PR #37 子进程范围通过；Codex 原生 Shell 仍 UNPROTECTED | M2 获槽后验证真实宿主 Hook，或如实维持 BLOCKED | OPEN |
| R3 / #27 | P1 | M5 无远端 PR，M6 外部 E4 NOT_VERIFIED，API 合同路径及 manifest 字段未组合验证 | M3/M5/M6/M7 按字段 owner 协调，再由 M9 检查组合 | OPEN |
| R5 | P1 | 本轮未读取其他 Codex 对话；codex queue 对 M1/M7 返回已排队回执，不证明已消费 | 进度只按 GitHub/worktree 交叉核对 | MONITOR |
| quota | P1（调度） | 16:16 UTC 可见读数 13%，约 1h12m 重置 | <=5% 或读数不明时全部暂停；实际低额度暂停须等确认重置 | MONITOR |

| ID | 优先级 | 风险 | 证据 | 责任/处置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| R10 | P1 | M1 PR #43 远端 quarantine 测试失败；同进程 owner 证据未获远端复验 | 远端 d0fd595/run 38399797819 子测试 217 失败；owner 报告本地 Windows Node 22 34/34（quarantine/abort/no-side-effect）；13:40 唯一 push 等 90 秒 exit 1、无文本，远端未变；跨进程未验证 | 保持 #35 P0 独立开放；等待 M1 可审查 head 与 CI，并单独审计历史 P0 的副作用路径 | IN PROGRESS |
| R1 | P1 | M6 package-smoke 本地修复未经过远端 CI | 旧 PR #31 远端 package-smoke 失败；本地 899dbf5 修 SOURCE_MANIFEST 中 package.json SHA，181 项 Git-tree 校验 0 mismatch；PR head 未更新 | M6 owner 发布授权后运行确切 CI job；#27 保持 OPEN | IN PROGRESS |
| R2 | P1 | M1 close 修复和 M7 reliability 变更尚未同一 AC3 集成验证 | M1 本地 Gateway tests 28/28；M7 旧远端 head `f17b7e6` 的 CI 失败，本地候选 `65ce028` 修正 Windows-only compiler check 和 symlink temp-root 处理；M1 commit 未包含在 M7 候选 | M1 保持 API owner；M7 仅改自有 workflow/test；统一候选后跑 Gateway/reliability/CI；#28/#35/#41 | IN PROGRESS |
| R3 | P1 | M3/M5/M6/M7 的共享 package.json 字段与各自 PR 组合结果仍待 AC3 验证 | #27 记录各字段 owner；M3 PR #33 c404b6b 的 9/9（含 package-smoke）通过且契约已补；M5 本地 9ec08d9 无 PR；M6 AC3 PR #38 有 Windows Node 22 测试失败，旧 PR #31 的本地 manifest 修复仍待远端重验；M7 本地 65ce028 未上传 | 字段 owner 最终组合，保留测试与策略；AC3 基线组合验证继续由 #27 跟踪 | IN PROGRESS |
| R9 | P1 | Windows Hook interruption 历史失败根因未知，owner Node20 复验尚缺 | PR #38 run 38397135538 的 Windows Node22 marker 断言失败；M6 本地同子测试1/1、整文件10/10；M1 本地Node22整文件10/10、重复5/5；Node20不可用。没有确定性修复或新提交 | M1 保留 fail-closed 断言；后续获得 Node20 环境时复验，CI失败 disposition 记录于 #32 | OPEN |
| R11 | P1 | M7 修复尚未进入 PR #39 的 CI | 远端 PR head f17b7e6 的 runs 38397157815/38397158016 失败；本地候选 65ce028 已完成但未上传，单次 push 因 non-interactive HTTPS 凭据不可用而被阻止 | 保持 #41 OPEN；不改凭据。Owner 有可用 GitHub 写权限后再发布既有候选并检查新 head CI | BLOCKED |
| R4 | P1（协调环境） | WSL 与 Windows 工作树的 `.git` 指针使用各自绝对路径；交叉 runtime 会把对方路径标为 `prunable`/不可读 | M1/M2/M5/M7/M8 在 WSL Git 可读；M3/M4/M6/coordinator/integration 在 Git for Windows 可读 | 各模块沿用创建工作树的 Git runtime；不运行跨环境 `repair/prune` | OPEN |
| R5 | P1 | Desktop 没有原生线程读取/等待 API，任务快照有异步延迟 | M0 经用户许可只读本机 `thread_history` 并通过 `codex queue` 续作；再对照 worktree、GitHub Issue/PR。不能把它描述成调用 `read_thread` | M0 每次排期同时记录快照时间与 GitHub/文件证据；#29 | MONITOR |
| R6 | P2 | 原 `.gitignore` 未覆盖 `.env.*`、临时文件和协调输出 | baseline 检查仅有 `.env`、`*.log` 等 | 本 PR 增加相应模式；密钥仍需 PR/CI secret scanning | FIXED IN THIS PR |
| R7 | P2 | 桌面安全中心后端能力接口当前不可用 | M4 已完成 UI/API adapter，但 `/api/security-center`、`/api/e4/status` 返回 404；相应总防护与 E4 状态仍标为 UNKNOWN | M3/M4 后续按 API 合同接通实际后端；保留 UNKNOWN，不用 mock 覆盖 | OPEN |
| R8 | P2 | PR #24 为 Draft，base 是 readiness 分支，不是 main | GitHub PR 元信息 | 仅作状态对照；协调 PR Draft 指向 AC3，不合并 main、不发 Release | MONITOR |

## 安全边界

- 证据链没有独立可信锚、签名和独立时间戳时不能证明绝对防篡改。
- Gateway 文件读写才记录副作用 `VERIFIED`；命令/MCP/网络成功不是全部副作用证明。
- AI reviewer 只能拒绝/收紧；人工审批和宿主能力不能暴露成 agent 自助接口。
- E4 PASS 只覆盖声明的 artifact 与检查范围；缺失证据要标 UNKNOWN/NOT TESTED。

## 资源冲突

开发并行上限为 2；2026-10-13 16:16 UTC 时 M1/M7 占满 2/2 槽位。无 VMware 或真实模型测试运行证据；下一次安装测试归 M7 独占，PR #39 新 CI 尚未开始。额度 13%、约 1h12m 后重置。最新推送批次 16:02:40 UTC，下一批不早于 16:22:40 UTC。
