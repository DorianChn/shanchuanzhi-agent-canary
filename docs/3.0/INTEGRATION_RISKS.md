# M0/M9 集成风险登记

更新日期：2026-10-13。下表是当次本机/GitHub 快照，模块工作树可能继续变化。

| ID | 优先级 | 风险 | 证据 | 责任/处置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| R1 | P1 | M6 E4 分支/PR #31 仍基于 `main`，切换到 AC3 时须保留已提交 E4 工作 | M3 已对齐 AC3（HEAD `8fd4e4f`，PR #33 base `feature/agent-canary-3.0`）；M6 HEAD `da52c17`，PR #31 base 为 `main` | M6 给出不覆盖当前提交和 artifact 的基线方案并在 PR 留 merge-base 证据；不自动 rebase；#27 | OPEN |
| R2 | P1 | M1/M7 未来共享 Gateway 修改可能冲突 | 最新提交中 M1 `ec3bc96` 是 `src/runtime/gateway.ts` 的写入方；M7 `9c05286` 当前范围为 Windows installer/reliability，未改 Gateway。共享编辑前仍需按 #28 对齐 | M1/M7；在远端可审查前保持 M7 不改 Gateway；#28/#35 | MONITOR |
| R3 | P1 | M3/M5/M6/M7 的共享 `package.json` 字段归属和组合结果仍未确认 | #27 跟踪四模块 manifest 协调；M6 的 PR #31 仍以 `main` 为 base，M5/M7 当前本地提交分别为 `6e2730a`、`9c05286` | 各 owner 认领字段并在 AC3 PR 声明组合结果；#27 | OPEN |
| R9 | P1 | Windows Node 20/22 的 Hook interruption 子测试间歇失败，根因仍未确认 | PR #30 run `38383140906` Windows Node 20 失败；PR #34 run `38384289575` Windows Node 22 失败、较新 head `0613057` 的 run `38385403836` 通过；PR #36 run `38385128369` Windows Node 22 再次失败，断言 `false !== true` | M1 记录子进程 exit/error、stdout/stderr 和 marker 观测或排除产品缺陷；保留测试；#32 | OPEN（再次失败） |
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

开发并行上限为 3；最近一次线程快照为 M5/M7/M8 RUNNING、M4 IDLE。VMware、真实模型和安装测试互斥，同一时间只占用一种测试槽，当前未占用。脏工作树数量不证明活跃会话数，线程快照与文件系统状态分别记录。
