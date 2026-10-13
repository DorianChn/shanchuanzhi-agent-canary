# M0/M9 集成风险登记

更新日期：2026-10-13。下表是当次本机/GitHub 快照，模块工作树可能继续变化。

| ID | 优先级 | 风险 | 证据 | 责任/处置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| R1 | P1 | M3/M6 分支不含 AC3 基线，迁移时必须保留当前工作 | M3 HEAD `146be17` 且工作区含 package/onboarding 改动；M6 HEAD `da52c17`（3 commits ahead of main），AC3 比较为 46/4 与 46/7；共同历史基点 `73cfdf9` | M3/M6 说明迁移办法并在 PR 留 merge-base 证据；不自动 rebase；#27 | OPEN |
| R2 | P1 | M1/M7 并行改同一 Gateway 文件 | 两个工作树均改 `src/runtime/gateway.ts` | M1/M7 对齐接口与修改顺序；#28 | OPEN |
| R3 | P1 | M3/M5/M6/M7 同时修改 package manifest | 四个模块当前分支/工作区都改 `package.json` | 认领字段级 owner 并记录在 #27 | OPEN |
| R9 | P1 | Windows Node 20 的 hook 中断回归测试连续两次失败；最新 fail-fast 取消同矩阵其余 job，package-smoke 被跳过 | PR #30 runs `38371811869`、`38372532507`；Node 20 子测 320 通过、1 失败、4 skipped；最新 run 取消 macOS 20/22、Windows 22，Ubuntu/Docker/sponsor 通过 | M1 复现并修复根因，不删测试；#32 | OPEN |
| R4 | P1（协调环境） | 五个 worktree 的 `.git` 指针用 WSL `/mnt/c/...` 绝对路径，Windows Git 标为 `prunable` | `git worktree list` 的 M1/M2/M5/M7/M8；WSL Git 可读各自 branch/status | 不运行 `worktree repair/prune`；后续统一迁移需会话 owner 参与 | OPEN |
| R5 | P1 | 线程内容及实时活跃任务数无法确认 | 当前无 `read_thread`、`wait_threads`、线程发送工具 | 不假装读过或已通知；按文件/GitHub 快照协作。并发上限 3 与测试互斥规则待有线程能力后核实 | UNKNOWN |
| R6 | P2 | 原 `.gitignore` 未覆盖 `.env.*`、临时文件和协调输出 | baseline 检查仅有 `.env`、`*.log` 等 | 本 PR 增加相应模式；密钥仍需 PR/CI secret scanning | FIXED IN THIS PR |
| R7 | P1 | 新建 M4 是空接入点，模块目标细节未核实 | 原无 M4 worktree/branch | M4 owner 在独立 worktree 继续并补充范围 | OPEN |
| R8 | P2 | PR #24 为 Draft，base 是 readiness 分支，不是 main | GitHub PR 元信息 | 仅作状态对照；协调 PR Draft 指向 AC3，不合并 main、不发 Release | MONITOR |

## 安全边界

- 证据链没有独立可信锚、签名和独立时间戳时不能证明绝对防篡改。
- Gateway 文件读写才记录副作用 `VERIFIED`；命令/MCP/网络成功不是全部副作用证明。
- AI reviewer 只能拒绝/收紧；人工审批和宿主能力不能暴露成 agent 自助接口。
- E4 PASS 只覆盖声明的 artifact 与检查范围；缺失证据要标 UNKNOWN/NOT TESTED。

## 资源冲突

开发并行上限为 3。VMware、真实模型和安装测试互斥，同一时间只占用一种测试槽。脏工作树数量不证明活跃会话数；线程调度状态尚未确认。
