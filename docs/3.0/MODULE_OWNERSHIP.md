# 模块文件所有权表

规则：模块未提交修改由该模块保管。表按实际分支和当下改动路径建立；未被文件证据确认的范围标注“暂定”。路径外改动先建 Issue 并由 owner 协调。不要用 reset、clean 或 checkout 覆盖其他工作树。

| 模块 | 分支 / 工作树 | 检查到的内容 | 独占范围或主要职责 | 共享接口/冲突 |
| --- | --- | --- | --- | --- |
| M1 | `feature/ac3-security-core` / `agents/M1-security` | local HEAD `ca24d37`; PR #43 remote `4099ee3`; exact-expiry old 1ms fixture failed on 3 matrix jobs; local Node20 focused 3/3, Hook 10/10; #48 fixture 16/16 | Gateway/Guard API、Hook 安全执行链及其测试 | #32 stale Hook fixture CI remains on sibling heads; #44 awaits new-head CI; #28 interface is M1-defined |
| M2 | `feature/ac3-execution-isolation` / `agents/M2-isolation` | HEAD/PR #37 `d9d775b`; run `38555299198` failed all six matrix jobs at inherited M1 `spawnSync(timeout:1000)` marker test; Docker/sponsor pass; package-smoke skipped | execution-isolation 原型、报告与测试 | binder rejects missing/unknown surfaces; native Desktop Shell remains `UNPROTECTED / BLOCKED_NOT_VERIFIED` |
| M3 | `feature/ac3-agent-onboarding` / `agents/M3-onboarding` | HEAD/PR #33 `d9364cc`; current-head checks 9/9 | 宿主发现、预览/安装/恢复适配 | #27 manifest 字段协作；契约变更由对应接口 owner 更新 |
| M4 | `feature/ac3-desktop-security-center` / `agents/M4-desktop-security-center` | HEAD/PR #34 `69ec7f1`; current-head checks 9/9; backend endpoint UNKNOWN/UNSUPPORTED | `src/ai/console-page.ts` 与桌面 UI 行为（暂定） | 只经受保护 Console API；不以 mock 覆盖 UNKNOWN |
| M5 | `feature/ac3-policy-audit` / `agents/M5-policy` | PR #47 remote/local `bcbec98`; current run `38555295666` failed Windows Node20 at inherited M1 marker test; prior focused suite 341 pass/5 skip | 策略管理、审计 schema、策略测试 | `docs/3.0/API_CONTRACTS.md` 唯一 owner 为 M0；保留 OBSERVE sensitive-read hard DENY；#46/#48 协调 |
| M6 | `feature/ac3-e4-validation-ac3` / `agents/M6-e4-ac3` | HEAD/PR #38 `ed82f06`; current-head checks 9/9; external E4 NOT_VERIFIED; old PR #31 is a separate main-based track | E4 schema、verifier、机器报告 | 原始 run 留本地；#27 manifest 和 #32 Hook 组合待验 |
| M7 | `feature/ac3-reliability-ac3` / `agents/M7-reliability-ac3` | local HEAD `c9a6b5c`; PR #39 remote `9088bd2`; current run `38555298663` failed on old honeypot read expectation; local targeted test 6/6 | `packaging/windows/`、scripts、可靠性/打包验证 | #41 clean-VM/install remains HOLD/NOT VERIFIED; Gateway lifecycle coordinates with M1 under #28 |
| M8 | `feature/ac3-open-source-product` / `agents/M8-ecosystem` | HEAD/PR #40 `4c11981`; current run `38555298183` failed five matrix jobs at inherited M1 marker test; no Release published | README、贡献/安全/支持/开源文档（暂定） | 文档必须如实描述安全覆盖边界 |
| M0 | `feature/ac3-m0-coordination` / `coordinator` | local coordination snapshot pending commit; PR #30 remote `a18a126`; run `38555297405` failed four matrix jobs at inherited M1 marker test; ownership/Docker/sponsor checks pass | `docs/3.0/*` 协调文档、Issue/CI/额度/排程 | 协调问题，不改 M1–M8 产品源文件 |
| M9 | `feature/ac3-m9-integration` / `integration` | local HEAD `ab382fe`; PR #36 remote `f125e70`, current-head checks 11/11; local verify 393/399, 0 fail/6 skip, package smoke 100 files, E4 tests 12/12 | 跨模块集成验收及风险跟踪 | External E4/native Shell/clean-VM remain unverified; no main/PR #24 merge or Release |

## 当前分支与验收状态覆盖（2026-10-14 11:37 UTC）

以下以本机 Git worktree HEAD 与 GitHub 当前 PR head/CI 交叉核对；模块工作区由其 owner 保管。

| 模块 | 当前工作树 HEAD | GitHub 状态与下一门槛 |
| --- | --- | --- |
| M1 | local `ca24d37` | PR #43 OPEN/Draft，remote `4099ee3`; new expiry fixture fix awaits push/CI; prior head had 3 expiry matrix failures. |
| M2 | `d9d775b` | PR #37 OPEN/Draft; current run failed inherited M1 synchronous marker test; #45 native Shell remains UNPROTECTED. |
| M3 | `d9364cc` | PR #33 OPEN/Draft，9/9 current-head checks；#42 CLOSED。 |
| M4 | `69ec7f1` | PR #34 OPEN/Draft，9/9 current-head checks；后端 endpoint UNKNOWN/UNSUPPORTED。 |
| M5 | `bcbec98` | PR #47 OPEN/Draft; current run failed inherited M1 synchronous marker test; preserve sensitive-read DENY. |
| M6 | `ed82f06` | PR #38 OPEN/Draft，9/9 current-head checks；外部 E4 NOT_VERIFIED。 |
| M7 | local `c9a6b5c` | PR #39 OPEN/Draft，remote `9088bd2`; honeypot expectation fix awaits push/CI; clean-VM/install remains HOLD/NOT VERIFIED. |
| M8 | `4c11981` | PR #40 OPEN/Draft；current run failed inherited M1 synchronous marker test；未发布 Release。 |
| M0 | local coordination docs updated for this batch | PR #30 OPEN/Draft，remote `a18a126`; current run failed inherited M1 synchronous marker test. |
| M9 | local `ab382fe` | PR #36 OPEN/Draft，remote `f125e70`, 11/11 current-head checks; local verify 393/399, 0 fail/6 skip, package smoke 100 files, E4 tests 12/12. |

AC3 PR #24 与模块候选均以共同基线 `62496d4020bd90ba2eede49b2e80a2bbebb036b4` 为验收起点。`git worktree list` 显示 M0/M1–M9 使用不同目录和预期分支；另保留 M1 detached scratch `f2f2d10`、M6 旧 main-based worktree/PR #31、M7 旧分支 `feature/ac3-reliability`（HEAD `9c05286`），不清理不替换。Git worktree 列表以 WSL Git 管理；Windows Git 对部分路径显示 prunable 时禁止跨 runtime repair/prune。

## 共享路径规则

| 路径 | owner | 协调规则 |
| --- | --- | --- |
| `src/runtime/gateway.ts` | M1（Guard/Gateway 契约与安全实现）、M7（可靠性实现） | 已有可见重叠：M1 增加 quarantine callback cancellation；M7 `close()` 增加幂等关闭及资源关闭错误。M1 review 是契约门；最终集成须保留两侧不变量并由 #28 验证 |
| `package.json` | M3、M5、M6、M7（M3/M5/M7 已确认各自字段；M6 字段由迁移提交精确核对） | 不覆盖对方字段；#27 记录字段、原因和组合结果 |
| `src/ai/console.ts` | M3（接入路由）、M4（安全中心配套），暂定 | 路由/响应变更列出协作模块并更新 API 契约 |
| `src/runtime/evidence.ts` | M1（写入调用）、M6（schema/验证），暂定 | 事件语义变更列出协作模块并保留拒绝/执行/副作用边界 |
| `test/agent-hook.test.ts`, `security-lab/claude-native-hook.mjs` | M1 | Hook 进程中断与安全决策测试由 M1 修改；其他分支通过合入 M1 提交或消费适配结果，不复制测试实现 |
| `test/honeypot-runtime.test.ts` | M7 场景/恢复验证；M1 Gateway 错误契约 | M7 维护隔离、恢复及副作用场景；错误码期望遵循 M1 Gateway 契约，并与 M9 验收保持一致 |

每模块只提交自己的分支。遇到未归属路径先更新本表；不能通过复制或重命名接口来规避冲突。M3 PR #33 与 M6 PR #38 均基于 AC3；M6 旧 PR #31 仍是独立 main-based 轨道。M0 不替模块 rebase 或覆盖提交；M5 `cf4e2cd` 仍待远端验收，M6 外部 E4 和 M7 clean-VM 安装仍未验证。M0 仅协调，不替模块发布。
