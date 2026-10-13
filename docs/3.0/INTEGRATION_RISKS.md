# M0/M9 集成风险登记

更新日期：2026-10-13。下表是当次本机/GitHub 快照，模块工作树可能继续变化。

| ID | 优先级 | 风险 | 证据 | 责任/处置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| R10 | P1 | M1 PR #43 远端 quarantine 测试失败；同进程 owner 证据未获远端复验 | 远端 d0fd595/run 38399797819 子测试 217 失败；owner 报告本地 Windows Node 22 34/34（quarantine/abort/no-side-effect）；13:40 唯一 push 等 90 秒 exit 1、无文本，远端未变；跨进程未验证 | 保持 #35 P0 独立开放；等待 M1 可审查 head 与 CI，并单独审计历史 P0 的副作用路径 | IN PROGRESS |
| R1 | P1 | M6 package-smoke 本地修复未经过远端 CI | 旧 PR #31 远端 package-smoke 失败；本地 899dbf5 修 SOURCE_MANIFEST 中 package.json SHA，181 项 Git-tree 校验 0 mismatch；PR head 未更新 | M6 owner 发布授权后运行确切 CI job；#27 保持 OPEN | IN PROGRESS |
| R2 | P1 | M1 close 修复和 M7 reliability 变更尚未同一 AC3 集成验证 | M1 本地 Gateway tests 28/28；M7 旧远端 head `f17b7e6` 的 CI 失败，本地候选 `65ce028` 修正 Windows-only compiler check 和 symlink temp-root 处理；M1 commit 未包含在 M7 候选 | M1 保持 API owner；M7 仅改自有 workflow/test；统一候选后跑 Gateway/reliability/CI；#28/#35/#41 | IN PROGRESS |
| R3 | P1 | M3/M5/M6/M7 的共享 package.json 字段与各自 PR 组合结果仍待 AC3 验证 | #27 记录各字段 owner；M3 PR #33 c404b6b 的 9/9（含 package-smoke）通过且契约已补；M5 本地 9ec08d9 无 PR；M6 AC3 PR #38 有 Windows Node 22 测试失败，旧 PR #31 的本地 manifest 修复仍待远端重验；M7 本地 65ce028 未上传 | 字段 owner 最终组合，保留测试与策略；AC3 基线组合验证继续由 #27 跟踪 | IN PROGRESS |
| R9 | P1 | Windows Hook interruption 曾间歇失败，M1-owned 测试仍待稳健处置 | PR #30/#34 历史 Windows Node 20/22 失败；PR #38 run 38397135538 同一 test/agent-hook.test.ts:54 在 Windows Node 22 marker 断言失败。M6 本机定向 1/1、整文件 10/10，通过但未复现，未改代码；M1 follow-up 已排队 | M1 保留 fail-closed 断言，调查确定性同步并验证 Windows Node 20/22；#32 保持 OPEN | IN PROGRESS |
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

开发并行上限为 2；2026-10-13 13:52 UTC M1 Hook follow-up 与 M6 PR #38 状态同步任务占用 2/2 槽。VMware、真实模型和安装测试未运行；下一次分支 push 不早于 14:00 UTC。
