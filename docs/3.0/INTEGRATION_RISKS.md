# M0/M9 集成风险登记

更新日期：2026-10-13。下表是当次本机/GitHub 快照，模块工作树可能继续变化。

| ID | 优先级 | 风险 | 证据 | 责任/处置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| R1 | P1 | M6 package-smoke 本地修复未经过远端 CI | 旧 PR #31 远端 package-smoke 失败；本地 899dbf5 修 SOURCE_MANIFEST 中 package.json SHA，181 项 Git-tree 校验 0 mismatch；PR head 未更新 | M6 owner 发布授权后运行确切 CI job；#27 保持 OPEN | IN PROGRESS |
| R2 | M1 close 修复和 M7 reliability 变更尚未同一 AC3 集成验证 | M1 f15fdcfa local Gateway tests 28/28；M7 f17b7e6 让 gateway.ts 相对 AC3 净 diff 为零，83 pass/1 symlink skip；M1 commit 未包含在 M7 候选 | M1 保持 API owner；M7 保留独有测试；统一候选后跑 Gateway/reliability/CI；#28/#35 | IN PROGRESS |
| R3 | P1 | M3/M5/M6/M7 的共享 package.json 字段与各自 PR 组合结果仍待 AC3 验证 | #27 记录 M3 onboarding、M5 ./policy、M7 reliability 脚本 owner 字段；M5 本地 cd8abea 语义修复通过 42/42；M6 的 PR #31 package-smoke 另有 manifest mismatch | 由字段 owner 最终组合，保留全部测试与安全策略；跨模块结果需要 AC3 基线 CI | IN PROGRESS |
| R9 | Windows Node 20 Hook interruption 曾间歇失败，修复提交尚无对应远端 CI | PR #30 旧 head 3e32ccc 的 run 38390302812 失败；M1 46af1f1 让 harness race 可确定复现且本地 Node20/22 测试各 1/1。PR #30 新 head f0f0976 11/11 绿，但没有 M1 提交 | 保留 fail-closed 断言；观察 M1 提交进入 CI 后再决定是否关闭；#32 | OPEN（远端复验待完成）
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

开发并行上限为 3；2026-10-13 12:10 UTC 开发槽 0/3。M1/M3/M6/M7 已完成本轮本地任务；VMware、真实模型和安装测试未运行。
