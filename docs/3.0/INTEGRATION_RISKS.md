# M0/M9 集成风险登记

更新日期：2026-10-13。下表是当次本机/GitHub 快照，模块工作树可能继续变化。

| ID | 优先级 | 风险 | 证据 | 责任/处置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| R1 | P1 | M3/M6 分支不含 AC3 基线，迁移时必须保留当前工作 | M3 HEAD `cf42dde`（工作树干净），M6 HEAD `da52c17`（已同步远端、工作树干净）；AC3 比较为 46/5 与 46/7；共同历史基点 `73cfdf9` | M3/M6 说明迁移办法并在 PR 留 merge-base 证据；不自动 rebase；#27 | OPEN |
| R2 | P1 | M1/M7 并行改同一 Gateway 文件 | 两个工作树均改 `src/runtime/gateway.ts` | M1/M7 对齐接口与修改顺序；#28 | OPEN |
| R3 | P1 | M3/M5/M6/M7 的并行分支均包含 package manifest 改动 | 四个模块分支均改 `package.json`；当前 M3/M5/M6/M7 HEAD 分别为 `cf42dde`、`053b330`、`da52c17`、`9d316fe` | 认领字段级 owner 并记录在 #27 | OPEN |
| R9 | P1 | Windows Node 20 的 hook 中断回归测试再次失败，错误与之前相同；根因仍未确认 | PR #30 head `74757a6` run `38374902576` 在 `test/agent-hook.test.ts:54` 断言失败；前一次全绿为 head `e4597bf` | M1 复现/解释失败并记录观察；不删测试；#32 | OPEN（再次失败） |
| R4 | P1（协调环境） | WSL 与 Windows 工作树的 `.git` 指针使用各自绝对路径；交叉 runtime 会把对方路径标为 `prunable`/不可读 | M1/M2/M5/M7/M8 在 WSL Git 可读；M3/M4/M6/coordinator/integration 在 Git for Windows 可读 | 各模块沿用创建工作树的 Git runtime；不运行跨环境 `repair/prune` | OPEN |
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
