# M0/M9 集成风险登记

更新日期：2026-10-13。下表是当次本机/GitHub 快照，模块工作树可能继续变化。

| ID | 优先级 | 风险 | 证据 | 责任/处置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| R1 | P1 | 旧 M6 PR #31 基于 main，且 AC3 兼容/打包检查尚未通过 | PR #31 head da52c17 的 run 38371562917 有 8 项成功、package-smoke 失败，报告 files:181,mismatches:[package.json]；M6 AC3 候选已含 bca895f，正在查因 | M6 只在候选自有路径复现并修复；保留旧 PR #31，不覆盖原 worktree；#27 | IN PROGRESS |
| R2 | P1 | M1/M7 Gateway close 生命周期改动重叠，须保留两侧安全/可靠性不变量 | M1 ec3bc96 quarantine cancel 与 f15fdcfa close 语义修复；Gateway 聚焦测试 28/28。M7 原提交 9d316fe 含 memoized close、queue drain、资源关闭失败语义；兼容工作进行中 | M1 是 Gateway/Guard 契约 owner；M7 仅在自身候选协调适配并加回归，不改写 M1 实现；#28/#35 | IN PROGRESS |
| R3 | P1 | M3/M5/M6/M7 的共享 package.json 字段与各自 PR 组合结果仍待 AC3 验证 | #27 记录 M3 onboarding、M5 ./policy、M7 reliability 脚本 owner 字段；M5 本地 cd8abea 语义修复通过 42/42；M6 的 PR #31 package-smoke 另有 manifest mismatch | 由字段 owner 最终组合，保留全部测试与安全策略；跨模块结果需要 AC3 基线 CI | IN PROGRESS |
| R9 | P1 | Windows Node 20 Hook interruption CI 失败间歇出现，尚无根因 | 最新 PR #30 run 38390302812 的 Windows Node 20 测试失败于 test/agent-hook.test.ts:54，其他矩阵项通过；M1 正用现有 Node 22 诊断 harness 时序，但本机没有 Node 20，尚未确认根因 | 保留失败测试和 fail-closed 断言；M1 继续定位，#32 OPEN | OPEN（根因 UNKNOWN）
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

开发并行上限为 3；2026-10-13 11:56 UTC 线程快照为 M1/M6/M7 RUNNING（3/3），M8 已完成本地文档工作并释放槽。VMware、真实模型和安装测试当前无人占用；脏工作树不单独作为活跃会话依据。
