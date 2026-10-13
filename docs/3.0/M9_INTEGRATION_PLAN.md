# M9 最终集成计划

初始基线：`feature/agent-canary-3.0` `62496d4020bd90ba2eede49b2e80a2bbebb036b4`。本文件建立候选集成门槛和顺序；当前没有合入任何 M1–M8 代码。

## 当前调度快照（2026-10-13 10:49 UTC）

- P0 #35 是 M9 的前置阻断：在 Guard quarantine 后，已有 Gateway callback 曾保持未 aborted 并产生合成 marker。M1 本地 commit `ec3bc96` 增加同步 `subscribeQuarantine`；同一 Guard 实例的活动 callback 回归与 Windows Node 20.20.2 聚焦 63/63 通过，但远端 PR/CI 尚未确认。收到可审查 PR 与相关 CI 证据前，不集成 Gateway，也不关闭 #35。
- #28 中 M1 是本轮 `src/runtime/gateway.ts` 唯一写入者。M7 只继续 packaging/scripts/M7 测试；后续合并时保留 M1 的活动执行 abort/Guard 复查与 M7 的资源关闭语义。
- M4 Draft PR #34 当前 head `0613057` 的 run `38385403836` 列出的 9/9 checks 通过；此前 `8319a67` 的 Windows Node 22 Hook interruption 失败未修改过。M4 本地全量测试 330 项中 325 通过、5 跳过，另有最新状态报告由 owner 留在本地未提交。M3 在 Draft PR #33；M2 本地验证完成但远端 Draft PR 尚缺。M6 PR #31 base 仍为 `main`，受 #27 阻断。M8 正审阅原有未提交文档，发行说明限于核实过的 release metadata。
- M9 自身 Draft PR #36 head `28473cc` 的 run `38385128369` 再次在 Windows Node 22 失败于 `test/agent-hook.test.ts` 中同一 Hook interruption 子测试（`false !== true`）；package-smoke 被跳过，其余列出的矩阵、Docker、sponsor checks 通过。该 P1 回归归入 #32，责任为 M1；必须保留失败测试并等待根因说明，不可将本计划的绿色文档检查误报为 CI 全绿。
- 当前开发槽为 M5、M7、M8（3/3）。M4 已 IDLE；M1 本地 P0 commit `ec3bc96` 的远端交付 BLOCKED；M5/M7 在线程中进行限时 Draft PR 交接；M6 等待基线协调。#35 在 M1 修复有远端 PR/CI 前仍是集成门槛。
- 不启动 VMware、真实模型或安装测试；当前互斥资源槽空闲。每次需要此槽时先在 #29 登记负责人、测试类型、时间和释放条件。

## M9 边界

- 只在 `feature/ac3-m9-integration` 工作树整合通过评审的模块 PR，并保存源 PR、commit SHA、CI 与验收证据。
- 不直接改 M1–M8 工作树，不合并 main，不合并 PR #24，不发布 Release。
- Draft PR 在责任模块、契约、冲突 Issue、测试证据和 CI 都可复核后才可转 Ready。

## 集成门槛

1. M3/M6 明确把工作移到 AC3 基线的方案并在 PR 显示 merge-base/commit 证据；M3/M5/M6/M7 按 #27 认领 `package.json` 字段。
2. M1/M7 按 #28 确认 Gateway 合同与可靠性改动顺序；Gateway API 与 Hook fail-closed 条件写入契约。
3. 每个模块 PR 包含测试命令和报告路径/链接、`API-Contract-Change` 字段、共享路径协调声明。未知和未测试结果原样保留。
4. GitHub 上对应模块 PR 的现有 CI checks 为 green；M0 检查 PR 差异、契约声明、责任路径与冲突 Issue。
5. 一次只把已验收模块变更引入本分支；记录 PR URL、head SHA、集成 commit 和后续回归结果。

## 推荐集成次序

| 阶段 | 模块 | 门槛 |
| --- | --- | --- |
| 0 | 基线/所有权 | 先解决 #27；工作树迁移不覆盖未提交内容 |
| 1 | M1 Gateway + Hook | 完成 #28 的接口决策，Gateway 拒绝/审批/证据契约冻结 |
| 2 | M5 Policy + M2 Isolation | Policy 不能绕过 Guard；隔离执行经 Gateway 授权，异常状态不 fail-open |
| 3 | M3 Onboarding + M4 UI | 预览/hash/备份/恢复安全；UI 只通过 CSRF/operator 保护的 API |
| 4 | M6 E4 | 按固定 Evidence v0.1 schema 验证，报告限制和 artifact hash |
| 5 | M7 Reliability | 文件、生命周期、Windows 安装/打包验证与前述接口同时成立 |
| 6 | M8 Open Source | README、贡献和支持描述与实际能力、发布状态一致 |

顺序可因依赖证据调整，但必须更新 Issue 和本计划，不做跨模块隐式 cherry-pick。

## 资源调度记录

- 同时运行的开发任务最多 3 个；开始/暂停/结束时登记模块、分支、负责人/线程引用、开始和释放时间。当前工具集合无 `read_thread`/`wait_threads`，M0 使用本机 thread-history 快照核对状态，并用本机 `codex queue` 续作；GitHub Issue/PR 与 worktree 用于交叉验证。
- VMware、真实模型、安装测试共享单个互斥资源槽；槽被占用时其他两类任务排队。
- M9 每轮整合使用唯一测试槽记录，记下环境、命令、输入 artifact、原始报告位置和结果，不以重试覆盖第一次失败。

## 最终验收矩阵

| 范围 | 必须证据 |
| --- | --- |
| 安全执行 | 未登记能力拒绝；Guard quarantine 前后复查；审批为宿主能力；拒绝未启动 executor |
| Hook/Canary | timeout/error/malformed evidence fail closed；敏感值不进普通日志；命中有可追踪处置 |
| Policy | 模式不能覆盖 containment；未登记、敏感和破坏性操作保留明确拒绝/审批语义 |
| UI/接入/安装 | CSRF/origin/operator 检查保持；预览/hash 不符拒绝；恢复不覆盖后续用户编辑 |
| E4/证据 | schema、链、expected head 条件和限制明确；PASS 有绑定 artifact 的报告 |
| 可靠性/打包 | build 与跨平台 CI 通过；安装、关闭和损坏/中断场景有真实测试结果 |
| 开源体验 | 命令/支持/安全报告路径可用；不把候选构建说成已发布版本 |
| 仓库状态 | PR #24 及 readiness base 未被改变；M1–M8 改动可追溯；无 secrets/logs/temp 误入 |
