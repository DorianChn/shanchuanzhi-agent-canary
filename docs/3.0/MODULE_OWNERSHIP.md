# 模块文件所有权表

规则：模块未提交修改由该模块保管。表按实际分支和当下改动路径建立；未被文件证据确认的范围标注“暂定”。路径外改动先建 Issue 并由 owner 协调。不要用 reset、clean 或 checkout 覆盖其他工作树。

| 模块 | 分支 / 工作树 | 检查到的内容 | 独占范围或主要职责 | 共享接口/冲突 |
| --- | --- | --- | --- | --- |
| M1 | `feature/ac3-security-core` / `agents/M1-security` | 本地 HEAD `f59ba37`（未推送）；PR #43 远端 `2276526`、9/9 checks；M1 router 定向测试 16/16 | Gateway/Guard API、Hook 安全执行链及其测试 | #32/#44 OPEN；#48 的 M1-owned fixture 已本地修正，待推送并进入 M5/M9 组合检查；#28 接口归 M1 定义 |
| M2 | `feature/ac3-execution-isolation` / `agents/M2-isolation` | HEAD/PR #37 `08c93bc`；Windows Node 20 失败，其余两项被 fail-fast 取消 | execution-isolation 原型、报告与测试 | #32 等待 M1 修复进入共同集成基线；#45 原生 Desktop Shell 仍 UNPROTECTED，M2 正在处理其宿主边界 |
| M3 | `feature/ac3-agent-onboarding` / `agents/M3-onboarding` | HEAD/PR #33 `54facf0`；9/9 checks | 宿主发现、预览/安装/恢复适配 | #27 manifest 字段协作；契约变更由对应接口 owner 更新 |
| M4 | `feature/ac3-desktop-security-center` / `agents/M4-desktop-security-center` | HEAD/PR #34 `f301195`；9/9 checks；后端 endpoint 当前 UNKNOWN/UNSUPPORTED | `src/ai/console-page.ts` 与桌面 UI 行为（暂定） | 只经受保护 Console API；不以 mock 覆盖 UNKNOWN |
| M5 | `feature/ac3-policy-audit` / `agents/M5-policy` | HEAD/PR #47 `f8291c9`；Draft；Ubuntu Node 22 一项失败、五项被取消 | 策略管理、审计 schema、策略测试 | `docs/3.0/API_CONTRACTS.md` 的唯一 owner 为 M0；#46/#48 对齐；保留敏感读取 DENY |
| M6 | `feature/ac3-e4-validation-ac3` / `agents/M6-e4-ac3` | HEAD/PR #38 `d513810`；9/9 checks；外部 E4 NOT_VERIFIED；旧 PR #31 是独立 main-based 轨道 | E4 schema、verifier、机器报告 | 原始 run 留本地；#27 manifest 和 #32 Hook 组合待验 |
| M7 | `feature/ac3-reliability-ac3` / `agents/M7-reliability-ac3` | HEAD/PR #39 `5c7d95d`；9/9 主矩阵、2/2 wrapper 检查；PR 描述与 #41 已同步 | `packaging/windows/`、scripts、可靠性/打包验证 | #41 集成门待过；真实 clean-VM 安装/升级/卸载/取消回滚 NOT VERIFIED/HOLD；Gateway 与 M1 协调 #28 |
| M8 | `feature/ac3-open-source-product` / `agents/M8-ecosystem` | HEAD/PR #40 `b0f30ff`；9/9 checks；未发布 Release | README、贡献/安全/支持/开源文档（暂定） | 文档必须如实描述安全覆盖边界 |
| M0 | `feature/ac3-m0-coordination` / `coordinator` | HEAD/PR #30 `bcedbae`；当前所有显示 checks 成功 | `docs/3.0/*` 协调文档、Issue/CI/额度/排程 | 协调问题，不改 M1–M8 产品源文件 |
| M9 | `feature/ac3-m9-integration` / `integration` | HEAD/PR #36 `996073a`；9/9 checks；尚无 M1–M8 组合验收 | 跨模块集成验收及风险跟踪 | 不合并 main 或 PR #24，不发布 Release |

## 当前分支与验收状态覆盖（2026-10-14 06:23 UTC）

以下以本机 Git worktree HEAD 与 GitHub 当前 PR head/CI 交叉核对；模块工作区由其 owner 保管。

| 模块 | 当前工作树 HEAD | GitHub 状态与下一门槛 |
| --- | --- | --- |
| M1 | f59ba37 local / 2276526 remote | PR #43 OPEN/Draft，远端 9/9；本地 router 定向测试 16/16，commit 未推送；#32/#44 OPEN。 |
| M2 | 08c93bc | PR #37 OPEN/Draft；Windows Node 20 Hook marker 测试失败，Windows Node 22/macOS Node 20 被取消；M2 处理 #45，原生 Shell 仍 UNPROTECTED。 |
| M3 | 54facf0 | PR #33 OPEN/Draft，9/9 checks；#42 CLOSED。 |
| M4 | f301195 | PR #34 OPEN/Draft，9/9 checks；后端 endpoint UNKNOWN/UNSUPPORTED。 |
| M5 | f8291c9 | PR #47 OPEN/Draft；Ubuntu Node 22 路由测试失败，五个 matrix jobs 取消；保持 sensitive-read DENY。 |
| M6 | d513810 | PR #38 OPEN/Draft，9/9 checks；外部 E4 NOT_VERIFIED。 |
| M7 | 5c7d95d | PR #39 OPEN/Draft，9/9 主矩阵与 2/2 wrapper 检查通过；真实安装运行验收 NOT VERIFIED/HOLD。 |
| M8 | b0f30ff | PR #40 OPEN/Draft，9/9 checks；未发布 Release。 |
| M0 | bcedbae | PR #30 OPEN/Draft，所有当前显示 checks 成功。 |
| M9 | 996073a | PR #36 OPEN/Draft，9/9 checks；尚未进行最终集成验收。 |

所有当前 AC3 候选的共同基线为 `62496d4020bd90ba2eede49b2e80a2bbebb036b4`。AC3 工作树相互独立；仓库另保留 M6 旧 PR #31 与 M7 旧分支，它们不替代 #38/#39。Git worktree 列表在 WSL Git 下可读；Windows Git 将部分 WSL 管理路径标为 prunable，禁止跨运行时 repair/prune。## 共享路径规则

| 路径 | owner | 协调规则 |
| --- | --- | --- |
| `src/runtime/gateway.ts` | M1（Guard/Gateway 契约与安全实现）、M7（可靠性实现） | 已有可见重叠：M1 增加 quarantine callback cancellation；M7 `close()` 增加幂等关闭及资源关闭错误。M1 review 是契约门；最终集成须保留两侧不变量并由 #28 验证 |
| `package.json` | M3、M5、M6、M7（M3/M5/M7 已确认各自字段；M6 字段由迁移提交精确核对） | 不覆盖对方字段；#27 记录字段、原因和组合结果 |
| `src/ai/console.ts` | M3（接入路由）、M4（安全中心配套），暂定 | 路由/响应变更列出协作模块并更新 API 契约 |
| `src/runtime/evidence.ts` | M1（写入调用）、M6（schema/验证），暂定 | 事件语义变更列出协作模块并保留拒绝/执行/副作用边界 |

每模块只提交自己的分支。遇到未归属路径先更新本表；不能通过复制或重命名接口来规避冲突。M3 当前 PR #33 已基于 AC3 并通过 9/9；M6 旧 PR #31 仍以 main 为 base，AC3 PR #38 按 #27 单独跟踪。M0 不替模块 rebase 或覆盖提交；M5 尚无远端 PR，M6/M7 修复未得到新头远端验收。M0 仅协调，不替模块发布。
