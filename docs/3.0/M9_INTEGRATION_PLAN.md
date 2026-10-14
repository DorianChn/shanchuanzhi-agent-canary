# M9 最终集成计划

初始基线：`feature/agent-canary-3.0` `62496d4020bd90ba2eede49b2e80a2bbebb036b4`。本文件建立候选集成门槛和顺序；当前本地候选组合状态及限制见下方验收记录。这里的本地组合不表示源 PR 已通过评审或可以发布。

## 本地候选组合验收记录（2026-10-14）

- 从 M9 初始本地 HEAD `996073ad38aed23bf3c9f8e928857dcf5c6072bb` 开始，在现有 `feature/ac3-m9-integration` 分支按 no-ff 合入下表八个候选头；共同候选基线为 `feature/agent-canary-3.0` `62496d4020bd90ba2eede49b2e80a2bbebb036b4`。组合结束 HEAD 为 `845743d99f634ccdc7e17b43b2ab8c3993e2001b`。

| 模块 | 来源 PR | 候选 head | M9 本地 merge commit |
| --- | --- | --- | --- |
| M1 Security Core | #43 | f59ba37c2fd9d1b5e181e067f80981f8920ef16a | c474ff4f1b03168ec2623b5190868cef9797fa2a |
| M5 Policy | #47 | cf4e2cdbedd0020e5b5132598af6f845a8214fc4 | 4f04a8a4b9ef6826ce805bfe1214b634463acb64 |
| M2 Execution Isolation | #37 | cb84f43b1b2bd30ec56ef784d2d35868aedae56e | 471a746eb8f21d47a72f885afbf0bb22475361b5 |
| M3 Onboarding | #33 | 54facf027b32f3eef4a737e4cf51a3cbca9f4f63 | f17290fbc163ebab4805e7cb78c11eb2ddfd235f |
| M4 Desktop Center | #34 | f30119521e2a844233d276a62ed67c03687f6014 | 71cff82b263e13cd2b9cf9ad886d38d3830393df |
| M6 E4 | #38 | d513810ada9b4375e555d1799e8984ccb09bd1d4 | de0a11680d577b4b77ab68ed1fd5a87fb3974c20 |
| M7 Reliability | #39 | 5c7d95db6062118eaf90a5004b18f6ebe7c6b238 | 220ddf303fdb69f25be494a2dc67ce44ce92c5cc |
| M8 Open Source | #40 | b0f30ff1b677a7bbaabcf4e9322f751cd1025135 | 845743d99f634ccdc7e17b43b2ab8c3993e2001b |

- 仅 M3 与 M7 在 package.json 的 test 脚本发生冲突；在 M9 集成分支做了加法式合并，保留双方测试入口及已有 M5/M6/M7 脚本。没有手改 M1–M8 产品实现或测试断言；package-lock.json 未变。其余候选直接合并。
- npm ci --no-audit --no-fund 成功。完整命令 npm run verify 退出码为 0：TypeScript build 通过；npm test 共 397 项，391 通过、0 失败、6 项因平台/环境条件跳过；其中 Windows WinForms launcher 检查仅编译、通过。该 verify 包含 npm run pack:check，package smoke 通过，生成含 100 个文件的 dorianchn-agent-canary-1.2.7.tgz，并对临时安装包运行类型检查、CLI help 和 self-test。
- node scripts/check-docs.mjs 通过：14 份文档、55 个本地链接、13 个代码示例、4 个 Issue 模板。没有运行 VMware、真实模型或操作系统安装测试。
- 默认 WSL Git 曾因 CRLF 归一化差异将全树路径显示为已修改；未改写、清理或重置工作树。按 GIT_OPTIONAL_LOCKS=0 git -c core.autocrlf=true status --short --branch 复核，工作树干净，HEAD 仍为 845743d99f634ccdc7e17b43b2ab8c3993e2001b。
- 本轮只做本地候选组合与构建/测试，不把 Draft 源 PR 标为验收完成。最近一次远端基线核对时，模块 PR 仍为 Draft 且无 reviewDecision；它们的绿灯仅属于各自候选头。PR #36 的 9/9 checks 对应组合前旧 M9 head 996073a，没有针对组合后 HEAD 的远端 CI。PR #24 与 main 未改变，本轮未 push。

### 尚未满足的 fail-closed 与外部验收门槛

- P0 #35 虽已关闭，其 M0 澄清仅覆盖同进程、同一 Guard、且遵守 AbortSignal 的 callback；不能推断为更广的宿主隔离保证。#32 的间歇 Hook marker 根因仍未知，不能以本地绿色测试关闭。
- 最近一次核对时 P1 #27、#28、#32、#44、#45、#48 仍开放或未解决。M2 文档仍将 Native Codex Shell 标为 UNPROTECTED；#44 approval-expiry 根因未知；#48 的 M5/router 契约尚待复核。保持相关路径 fail-closed，不因本地组合通过而宣称门禁解除。
- M6 外部独立性仍为 NOT_VERIFIED；M7 clean-VM 安装、升级、卸载和取消回滚仍未验证。没有真实安装或 VMware 证据，不能据打包 smoke 宣称这些门槛通过。
- 因此当前结果是本地组合的 build、test、package smoke 和 docs check 通过；评审、契约、开放 Issue、组合后远端 CI 以及上述未覆盖运行环境门槛仍待解决。本分支未推送，未合并 main 或 PR #24，未发布 Release。

## 历史调度快照（2026-10-13 11:07 UTC）

- P0 #35 是 M9 的前置阻断：在 Guard quarantine 后，已有 Gateway callback 曾保持未 aborted 并产生合成 marker。M1 本地 commit `ec3bc96` 增加同步 `subscribeQuarantine`；同一 Guard 实例的活动 callback 回归与 Windows Node 20.20.2 聚焦 63/63 通过，但远端 PR/CI 尚未确认。收到可审查 PR 与相关 CI 证据前，不集成 Gateway，也不关闭 #35。
- #28 中 M1 是本轮 `src/runtime/gateway.ts` 唯一写入者。M7 只继续 packaging/scripts/M7 测试；后续合并时保留 M1 的活动执行 abort/Guard 复查与 M7 的资源关闭语义。
- M4 Draft PR #34 当前 head `fe2c973` 的 run `38386967113` 列出的 9/9 checks 通过；此前 `8319a67` 的 Windows Node 22 Hook interruption 失败未修改过。M4 本地全量测试 330 项中 325 通过、5 跳过；报告现已提交 PR。
- M9 自身 Draft PR #36 head `c9b9190` 的 run `38386657562` 9/9 通过；此前 head `28473cc` 的 run `38385128369` 曾在 Windows Node 22 同一 Hook 子测试失败（`false !== true`）。M1 在 Windows Node 22 做 5 次 wrapper 诊断未复现；测试不覆盖真实宿主 callback，#32 根因仍 UNKNOWN，不能据后续绿色 CI 关闭。
- 当前开发槽为 M1、M6、M7（3/3）。M6 在独立 AC3 worktree 移植自身 3 个 commits，旧 PR #31 保持 main base；M1 查验失败诊断输出；M7 确认 package manifest owner。M5/M7 的远端 push 曾受 WSL Git 凭据阻塞；M5 当前 IDLE，M7 不重试 push。M8 文档本地两次提交完成但尚无远端 PR。#35 在 M1 P0 修复有可审查 PR/CI 前仍是集成门槛。
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
