# M0/M9 集成风险登记

更新日期：2026-10-14。实时风险快照位于首个风险表；旧记录按原时间保留。

## 实时风险快照（2026-10-14 10:51 UTC；额度页 10:50 UTC 实读）

| 风险 | 级别 | 责任与证据 | 状态 |
| --- | --- | --- | --- |
| #35 Guard quarantine | P0 | Issue #35 CLOSED；证据限同进程、同 Guard 实例且 callback 遵守 AbortSignal。跨进程/shared-store 与强制终止不在证据内。 | CLOSED（范围有限） |
| #32 Hook interruption | P1 | PR #43 远端 f59ba37 精确 head 检查 9/9；历史 Hook marker 根因仍 UNKNOWN。M1 正在既有分支核对 #44 回归。 | OPEN / INTEGRATION PENDING |
| #44 approval expiry | P1 | M1 既有报告支持 expiry sweep 与测试观察时序竞争，未证明 Gateway 错误放行；当前追加核对零 callback 的确定性回归覆盖。 | OPEN / COMBINED CI PENDING |
| #48 OBSERVE sensitive read | P1 | PR #47 head cf4e2cd run 38527097304 9/9；敏感读取 hard DENY 不变，M1/M5 host wiring 与 M9 组合验收未闭合。未确认真实泄露。 | OPEN / M9 PENDING |
| #41 M7 reliability | P1 | PR #39 远端 5c7d95d 旧 head 检查 11/11；M7 报告提交 9088bd2 记录候选 VM 无可验证快照且需要密码，旧安装程序产物来源不明。未运行安装或改动 VM。 | HOLD / NOT VERIFIED |
| #45 native host Shell | P1 | PR #37 远端 cb84f43 检查 9/9；M2 正检查 Hook 可表达的失败关闭路径；不覆盖 Codex Desktop 原生 Shell。 | UNPROTECTED / OPEN |
| #27 manifest / E4 | P1 | M9 本地旧候选 5c11113 aggregate verify 391 pass/0 fail/6 环境跳过，100 文件 package smoke；组合 GitHub CI 未运行，M6 外部 E4 仍 NOT_VERIFIED。M7/M8 后续提交未纳入候选。 | OPEN / COMBINED CI PENDING |
| #28 Gateway lifecycle | P1 | M1 owner 审查通过 M7 候选中五个 M1 文件；代码候选 6d978a5、M7 当前提交 9088bd2。PR #39 远端仍 5c7d95d，该旧 head 11/11；新候选 CI pending。 | OPEN / OWNER-APPROVED LOCAL CANDIDATE |
| #46 canonical API contract | P2 | M0 维护唯一 canonical contract；M6 与 M5 event schema 分离且无消费关系。Issue #48 行为闭合仍待验收。 | OPEN |
| M4 diagnostic truth | P2 | M4 提交 69ec7f1 修复审计接口不可用时误导性 0/[]，定向测试 7/7。PR #34 远端旧 head f301195 9/9，不覆盖新提交；后端保护/E4 仍 UNKNOWN。 | LOCAL FIX / CI PENDING |
| M9 combined acceptance | P1 | 本地 integration HEAD 5c11113 相对 PR #36 远端 996073a 有 86 个提交差异、136 个文件改动；本地 verify 与 package smoke 通过但新 head CI 未运行；M7/M8 提交未纳入当前候选。 | LOCAL ONLY / REBASE REVIEW PENDING |
| worktree pointers | P2 | AC3 子工作树 .git 指针使用 WSL 绝对路径；对子工作树须用 WSL Git。根仓库 .git 可由 Windows Git Bash 用于 ref dry-run/推送；避免跨 runtime repair/prune。 | MONITOR |
| quota / scheduling | 调度门槛 | 网页 10:50 UTC 实读五小时 43%、约 9 分钟重置、每周 69%、余额 113。M1 和 M2 当前占用 2 个开发槽；VM/模型/安装互斥槽空闲。 | MONITOR |

VMware、真实模型和安装测试互斥。五小时额度低于 5% 或无法读取时，暂停所有开发、测试、浏览器和 GitHub 操作；确认额度重置后再继续。不得把 fixture、CI 或本地组合验证冒充真实 E4、原生 Shell 或 clean-VM 安装结果。
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
| R4 | P1（协调环境） | AC3 子工作树 .git 文件指向 WSL 绝对路径；Windows Git 对这些路径不可读，曾报告 not a git repository | M0 使用 WSL Git 管理各 worktree；根仓库 .git 使用 Windows Git Bash 执行远端 ref dry-run/快进推送 | 禁止跨 runtime repair/prune；每个 worktree 使用创建它的 runtime | OPEN |
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
