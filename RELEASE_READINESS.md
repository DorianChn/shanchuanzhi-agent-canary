# Agent Canary 3.0 发布准备情况（M7）

## 当前审计：2026-10-25 — HOLD

本轮仅在现有 `agents/M7` / `feature/ac3-reliability-ac3` 审计，起始 HEAD `ab9b03f1211443af3f905863113dd2b4a5c8ab0c`。保留已有 workflow/`.gitignore` 修改；没有 merge、push、Release、安装器/VM/真实模型执行。下方早期 PR/本地状态均为历史。

### 续审：M7 包装器来源 pin 修正 — HOLD

- 续审起点为本地提交 2c2ff20cf7c52acb083c0b2ff5e910f3d08b1d77；当前远端产品基线 origin/feature/agent-canary-3.0 为 7cd34454c4bd6aa7176e0e076f5333639e3ccd5d。GitHub 对该基线的 CI run 39957424939 为 9/9 success，Windows Community run 39957424871 为 4/4 success（包括 hosted installer lifecycle job）。这些是远端基线结果，不是本地未发布候选的 exact-head CI。
- PR #40 已合并（merge c13c40f06fd066ef204c3fb082f070b5b4c8a93d），M8 当前 head 为 1c94ed4b8beb8ab3f9e04004c0bc3b0f372b2841。已接受的 M8 source pin 为 24b8651730d57d860ba136e77db1526031abb1fc；仓库验证其为当前 PR head 祖先，固定 demo Git blob 与 PR head blob 均为 3428f297c28845ae054c0ca63aa6c5c4d7ef785f。
- 复现旧 M7 断言：test/windows-packaging.test.mjs 要求 refs/pull/40/head 仍等于旧 SHA 90fcde0…，但远端实际头为 1c94ed4…。M7 分支比当前 feature 基线 68 ahead / 372 behind；M0 Issue #41 的复核要求不要整体合入此分叉分支。目标 workflow 还把 lifecycle job 限为手动触发，故未合并或覆盖整文件；仅同步已合并 M8 source pin/祖先/blob 校验契约，并保留 PR lifecycle 门禁。
- M7-owned 本地候选改动：.github/workflows/windows-community.yml、security-lab/build-community.py、test/windows-packaging.test.mjs。新校验把 immutable source pin、当前 PR head 祖先关系、两个精确 demo blob 和构建报告 provenance 都绑定起来；测试另保留非祖先负例。没有移除断言、跳过测试或改弱 Hook/installer 安全策略。
- 定向结果：node --import tsx --test test/reliability.test.mjs packaging/windows/test-worker.mjs 为 39 pass / 0 fail / 2 symlink-permission skip；两个受影响 JS 测试文件的 node --check 与 git diff --check 通过。node --import tsx --test test/windows-packaging.test.mjs 为 25 pass / 1 fail / 1 skip；失败项现已越过旧 M8 SHA 断言、祖先和 blob 检查，停在 build fixture 要求 Python 的步骤。本机只有 Windows Store 的 python.exe 执行别名（提示 Python 未找到），无 py.exe；未安装系统工具。不能把此项记为通过，需在有 Python 的受支持 Windows CI 运行 exact candidate。
- 本机没有可用 YAML parser；没有声称做过完整 YAML parse。PR lifecycle 条件在本地回归中仍保持对 pull_request 启用。
- 现有 .gitignore 的原有脏改动保持原字节，SHA-256 3769d09de7ed13b1749a5117e61bfe75515d30705347681d589e74f1d24773a4。本轮不 push；候选尚无 hosted exact-head CI。
- Issue #41 与 #70 仍 OPEN。Hosted lifecycle job 成功不等于用户要求的 clean Windows 11 VM / standard-user lifecycle 验收；EFS、完整首次启动/升级/取消回滚与重装仍按各自 gate 状态报告。24h 和 7d soak 均 NOT_RUN；本轮未运行 Setup.exe、VMware 或真实模型。

### 上一检查点源码与 CI（保留历史快照）

- PR #96 已合并，其最后 head `40d024fb6089cd72a186107912bd6baed824f301` 的 [CI 40051920265](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/40051920265) 和 [wrapper 40051920252](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/40051920252) 成功；lifecycle skipped。本地后续 `ab9b03f` 没有可见的 PR-triggered CI 或开放 PR。
- 当前产品 `b0d8d77c1f13a6f3ee3a9270ddd4fc0507ff4097` 的 [CI 40162947429](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/40162947429) 为 9/9 成功；[wrapper 40162947358](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/40162947358) 为 3 success + 1 skipped lifecycle。绿色总状态不代表 lifecycle 已运行。
- `ab9b03f` 的 BUILD_REPORT status 修复在当前产品对应 workflow、lifecycle script 和回归中均已存在；此 hunk 已集成，无需重复 PR。产品 M8 pin 为 `24b8651730d57d860ba136e77db1526031abb1fc`，校验该 source 是 fetched PR head 的祖先且两个 demo blob 相同。旧分支仍要求 PR head 等于 `90fcde0…`；本轮完整 packaging suite 如实记录 25 pass / 1 fail / 1 skip。不能将这个旧分支整树直接作为新产品候选。
- 本轮修复点为保留原有 lifecycle 事件门禁修正并补行为回归；39 pass / 0 fail / 2 skip。该回归只验证实际条件的布尔事件规则，不是完整 Actions/YAML parser 或 hosted job 执行验证。源/包 Hook provenance、tamper rejection、安全决策和 caller-canary 断言未被弱化。共享 workflow 的新 M8 协调确认与候选 hosted CI 仍待完成。

### 当前开放外部门槛

| 门槛 | 当前结论 |
|---|---|
| #41 clean Windows 11 VM / standard-user lifecycle | OPEN / NOT_VERIFIED；[M0 最新只读清单](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/41#issuecomment-6394453501) 没有可安全定位的已注册 clean VM，预期 VM 路径缺失。先登记隔离 VM、精确包与 Issue #29 资源窗口，再运行。 |
| 首次启动、升级、重装、EFS、实际取消/失败回滚 | 未完成独立当前候选验收；历史 hosted install/uninstall 不能覆盖这些步骤。 |
| 24h / 7d | 均 NOT_RUN；本轮仅 2.003 秒 smoke。 |
| 当前产物内部复核 | 只读取产品 run 的 artifact 元数据；未重新下载/解包/执行，不提供本轮 Setup.exe 内部哈希验证声明。 |
| #70 default-branch Hono remediation | OPEN；修复 PR #67 等待维护者决策，不在本轮授权合并范围。 |
| 签名/SmartScreen、独立 product E4 / native-host 能力 | 不由本轮源码与合成测试证明；保持对应外部门槛。 |

#53、#59、#93、#99 的 GitHub 当前 state 均为 CLOSED；这些限定 gate 的关闭不等于 #41 或整体 Release READY。

### #70 依赖与 manifest 只读核验

- 默认分支 `main@146be17ea924d09a78ceff90b83006cdd40dfc43` 由 `@modelcontextprotocol/sdk` 的 `hono:^4.11.4` 依赖解析到 Hono **4.13.7**。root lockfile SHA-256 `d3dfcec5c889f7be1699d69dc604b5cb4bba2016fb1090d96d1df18772627150` 与该提交 SOURCE_MANIFEST 条目匹配。
- 现有 [PR #67](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/67) head `cda74e9860f1d96d7404871378c0c737535fa77e` 为 Hono **4.13.13**，lockfile SHA-256 `de39f00b6496708fc738f944776b53800961dfa399691069c8b57065a73f4f38` 与 SOURCE_MANIFEST 匹配；[exact-source CI 39827204460](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/39827204460) SUCCESS。
- 当前 feature 与本地 M7 lockfile 均解析到 Hono **4.13.13**，lockfile SHA-256 `243693054bb67e92ba22a0502fda105544cf9e22b4b26d9dbda8f4864a65ac94`。feature 不包含 root SOURCE_MANIFEST；未把它当成旧默认分支的 manifest 验证结果。
- 对上述四个精确提交的 tracked `*.ts/*.js/*.mjs/*.cjs` 做 `git grep -n -E 'serveStatic|hono/serve-static|hono/(bun|deno|cloudflare-workers)'`，均无命中。它只说明这些源码中的直接调用未找到，不能证明依赖内部/动态调用不存在或将 advisory 判定为不适用。本轮未重跑 vulnerability feed，也未关闭告警。
- 完整临时日志：`%TEMP%/m7-audit-20261025-7d170b1d1a794767916d548e38678a28/`。性能与稳定性实测见同目录报告和本仓库另外三份 M7 报告。

## 2026-10-13 起的历史记录

日期：2026-10-13
整体状态：**HOLD — 不建议将当前 Windows 候选标为已通过安装与稳定性验收。**

## 已完成

- 按 M0 的隔离约定在 `feature/ac3-reliability` 工作；M7 增补可靠性、包装器持久化、Windows 安装器模板、CI、基准/Soak 工具和报告；未改变既有 CLI/MCP/SDK 接口。
- 持久化写入的原子发布、损坏 session 恢复、陈旧 Auto E4 锁回收、安装包输入摘要固定和精确回滚有回归覆盖。M7 本地提交已纳入 M1 owner 的 Gateway close/quarantine 实现与回归测试，并通过 M1 owner review；该提交未推送，PR #39 远端仍为 `5c7d95d`（OPEN/DRAFT），Issue #28 的 combined GitHub CI 待候选进入 PR 后运行。
- Windows 包装器 CI 扩展到依赖安装、TypeScript 构建、可靠性/包装器测试、依赖审计、包检查及 NSIS 3.13 模板编译。NSIS 编译使用一次性合成载荷；CI 不运行编译出的 EXE。该工作流需在 Draft PR 创建后读取真实运行结果。
- 上一轮基线：`npm run verify` 334 项、329 通过、0 失败、5 跳过；包检查 90 个文件；`npm audit --audit-level=high` 报告 0 vulnerabilities。本轮没有重跑全量 `verify` 或依赖审计。
- 集成前基线定向结果（Node `v22.23.1`）：`npm run test:reliability` 46 项、43 通过、0 失败、3 跳过；Gateway/containment 定向测试 40 项、40 通过、0 失败、0 跳过。这些旧基线结果不覆盖 M1 handoff 的完整 close/quarantine 契约。
- 2026-10-14 M1→M7 本地候选定向结果（Node `v22.23.1`）：Gateway/containment/acceptance 66 项通过；`npm run test:reliability` 46 项、43 通过、0 失败、3 跳过。候选待 combined GitHub CI；尚未完成完整构建与发布验收。
- Gateway 3 轮合成微基准：每轮 1,000 次调用、并发 16；吞吐中位数 1,685.626 ops/s，延迟中位数 p50/p95/p99 为 4.924/9.020/10.353 ms，0 错误。完整数据见 [`PERFORMANCE_BENCHMARK.md`](PERFORMANCE_BENCHMARK.md)。

## 发布阻断项

1. **真实安装包生命周期没有验收。** 当前 M7 未生成并运行真实 NSIS 安装包；普通用户安装、首次启动、中文/空格自定义路径、EFS、重复安装、卸载和重装均没有本轮真实 EXE 证据。
2. **升级语义不完整。** 不同 candidate 采用并行安装目录；同候选重复安装会拒绝。没有原位升级/旧版本数据迁移路径及回归验证。发布产品若只支持并行候选，需明确写入升级流程并验证。
3. **失败回滚仅有源码/模板证据。** 尚未在真实 NSIS 安装中注入复制失败、收据失败、注册失败或用户取消，并检查磁盘、快捷方式和 HKCU 残留。
4. **长时可靠性证据缺失。** 24 小时与 7 天 Soak 均为 `NOT RUN`。本机 10.813 秒是工具冒烟，不是长稳结果。
5. **共享 Windows VM 当前状态未验证。** 本轮仅恢复本地开发槽，没有申请或占用 VMware/安装资源；不修改系统安全设置，也不在真实用户目录进行破坏性安装测试。
6. **发行身份与信誉未解决。** 目前候选为 unsigned；SmartScreen 下载体验、签名验证与发布者身份尚未验证。
7. **Gateway close/quarantine 契约尚未进入 PR #39。** M1 owner 审阅通过的 M7 集成候选已在本地提交，涉及 Gateway、Guard 与对应测试五个文件；本地定向测试通过，但候选未推送。PR #39 远端仍为 `5c7d95d`（OPEN/DRAFT）；Issue #28 保持 OPEN，候选进入 PR 后等待 M7+M1 combined GitHub CI 再评估；Issue #44 也保持 OPEN。

## 依赖和构建完整性

- `npm audit --audit-level=high`：0 vulnerabilities（本机所用 lockfile 与 `npm ci` 安装依赖）。
- 社区 ZIP 现在必须由构建调用者显式给出并匹配 SHA-256；构建记录来源 ZIP 摘要、Node 版本/摘要、运行时清单、安装器摘要。
- 工具链 provenance 固定 NSIS 3.13 与 Node `v22.23.1` 的 SHA-256。Windows CI 对 NSIS 安装程序摘要校验后，在临时目录安装编译器并编译合成载荷模板。
- CI 合成模板编译、源码打包检查或 `npm run verify` 任何一个都不能代表实际发行包通过安装验收。

## 下一步转为 READY 的证据

- Draft PR 的 Windows CI 全绿，包括真实 NSIS 3.13 模板编译；记录运行链接和提交 SHA。
- 按协调安排将本地候选送入 PR #39 后运行 M7+M1 组合验证；M1 单独 CI 或当前定向测试不能替代 combined GitHub CI 证据。
- M0 协调的可丢弃 VM 中，针对与发布相同的源码/ZIP/NSIS 构建实际 EXE；进行普通用户首次安装、路径与 EFS、崩溃/失败回滚、重复安装、所定义的升级策略、卸载和重装；保存安装前后差分和哈希。
- 同一隔离环境完成 24 小时测试；若基础设施允许，再完成独立 7 天测试。报告运行时长、环境、参数、错误与内存趋势，不以短测替代。
- 由发布责任方决定并验证签名/下载信誉要求。未满足这些项目之前保持 `HOLD`。

## M7 本轮续作记录

- 修复 NSIS 回滚/卸载时当前工作目录仍指向 `$INSTDIR` 的清理缺陷；卸载清理错误会提前停止后续卸载登记删除，便于释放占用后重试。
- 新增故障注入与模板负例回归。定向测试通过不代表 NSIS 编译或真实 EXE 生命周期通过；本轮没有运行安装包、VMware、真实模型、24 小时或 7 天测试。
