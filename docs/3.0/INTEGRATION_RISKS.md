# M0/M9 集成风险登记

更新日期：2026-10-13。下表是当次本机/GitHub 快照，模块工作树可能继续变化。

| ID | 优先级 | 风险 | 证据 | 责任/处置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| R1 | P1 | M6 E4 分支/PR #31 仍基于 `main`，切换到 AC3 时须保留已提交 E4 工作 | M3 已对齐 AC3（HEAD `8fd4e4f`，PR #33 AC3 base）；M6 原 HEAD `da52c17`、PR #31 base `main`；候选迁移为 `agents/M6-e4-ac3` | M6 在独立 AC3 worktree 移植 3 个自有 commits，保留旧 PR；不自动 rebase/覆盖 evidence；#27 | IN PROGRESS |
| R2 | P1 | M1/M7 对 Gateway 关闭与回调取消的并行修改存在实际重叠 | M1 `ec3bc96` 相对 AC3 修改 Gateway 60+/18-，加入 Guard quarantine 同步取消；M7 `9d316fe` 修改同一 `close()` 区域（17+/3-），加入幂等 close/resource-close 失败语义。两项尚未在集成分支验证，按 #28 审阅 | M1 负责 Gateway/Guard 契约；M7 保留可靠性不变量并提供差异，未获协调前不自行合并两套实现；#28/#35 | IN PROGRESS |
| R3 | P1 | M3/M5/M6/M7 的共享 `package.json` 组合结果仍待 AC3 验证 | #27：M3 确认 onboarding 测试路径；M5 确认 `./policy` export 与两项策略测试；M7 确认 reliability 测试与 4 个命令；M6 的 `scripts.e4:auto/verify` 正在独立迁移 | 保留 AC3 发布字段和全部既有测试，按字段 owner 组合并跑相关检查；#27 | IN PROGRESS |
| R9 | P1 | Windows Node 20/22 的 Hook interruption 子测试间歇失败，根因仍未确认 | PR #30 run `38383140906` Windows Node 20 失败；PR #34 run `38384289575` Windows Node 22 失败、当前 head `fe2c973` 的 run `38386967113` 通过；PR #36 run `38385128369` Windows Node 22 失败、head `996073a` 的 run `38388372984` 通过；M1 的 Windows Node 22 聚焦运行与 failure-only 诊断审阅未复现 | 保留失败/通过证据；不删测试、不改 fail-closed 断言；#32 | OPEN（根因 UNKNOWN） |
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

开发并行上限为 3；2026-10-13 11:16 UTC 本机线程记录显示 M6 AC3 迁移、M7 独立 AC3 候选/Gateway 对齐、M8 Draft PR 交付均为 RUNNING（3/3）。VMware、真实模型和安装测试互斥，当前无人占用。状态来自用户授权读取的本机 thread history，并与续作消息交叉核对；工作树脏/净不单独作为活跃会话依据。
