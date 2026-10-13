# 模块文件所有权表

规则：模块未提交修改由该模块保管。表按实际分支和当下改动路径建立；未被文件证据确认的范围标注“暂定”。路径外改动先建 Issue 并由 owner 协调。不要用 reset、clean 或 checkout 覆盖其他工作树。

| 模块 | 分支 / 工作树 | 检查到的内容 | 独占范围或主要职责 | 共享接口/冲突 |
| --- | --- | --- | --- | --- |
| M1 | feature/ac3-security-core / agents/M1-security | local HEAD b0478b9; PR #43 head 89e40cd; ec3bc96 Guard/Gateway fix and P0 regression tests are in remote ancestry; latest local commit is docs only | Gateway/Guard API, Hook security execution path, regression evidence | #35 remains open pending owner disposition; M1 owns shared Gateway contract |
| M2 | feature/ac3-execution-isolation / agents/M2-isolation | HEAD a1c239d；PR #37 OPEN/Draft，当前 9/9 checks 成功 | execution-isolation/ 原型、报告与测试 | 原生 Shell 仍 UNPROTECTED；P1 #45 OPEN，M2 待槽位后验证宿主 Hook 或明确标 BLOCKED |
| M3 | feature/ac3-agent-onboarding / agents/M3-onboarding | HEAD c404b6b；PR #33 当前 9/9 checks；owner 契约章节已加入 | 宿主发现、预览/安装/恢复适配 | #42 已依据当前 package-smoke 与 API 契约证据关闭；仍与 M5/M6/M7 通过 #27 协调 manifest |
| M4 | feature/ac3-desktop-security-center / agents/M4-desktop-security-center | HEAD fe2c973；Draft PR #34 OPEN，9/9 checks 成功；后端相关接口 404，状态 UNKNOWN | src/ai/console-page.ts 和 UI 行为（暂定） | 只经受保护的 Console API 读写；不以 mock 覆盖 UNKNOWN |
| M5 | feature/ac3-policy-audit / agents/M5-policy | HEAD 9ec08d9; clean, 5 commits ahead; no remote PR; API contract path overlaps M0 canonical docs | Policy management, audit schema, policy docs/tests | Coordinate docs/3.0/API_CONTRACTS.md and package.json fields through #27; do not publish until ownership is resolved |
| M6 | feature/ac3-e4-validation-ac3 / agents/M6-e4-ac3; separate old PR #31 | PR #38 head bca895f; untracked security-lab/e4-runs/20261013T114513Z/ retained; Windows Node22 CI failure; external E4 NOT_VERIFIED | E4 schema, verifier, machine report | Keep raw run directory local; #27 tracks AC3/manifest alignment and #32 Hook ownership |
| M7 | feature/ac3-reliability-ac3 / agents/M7-reliability-ac3 | local HEAD 4f3a2c5, clean; PR #39 remote 65ce028; four commits ahead, including pinned NSIS CI provisioning | packaging/windows/, scripts/, reliability and packaging verification | M1 owns Gateway/Guard API; #41 OPEN; new remote CI is required before acceptance |
| M8 | feature/ac3-open-source-product / agents/M8-ecosystem | PR #40 head b0f30ff；9/9 checks 通过，工作树干净 | README、贡献/安全/支持/开源文档（暂定） | 不得发布 Release |
| M0 | feature/ac3-m0-coordination / coordinator | local HEAD da25925, remote PR #30 head d23f1ae; current remote CI 10/10 pass | docs/3.0/* coordination docs, collaboration checks | Coordinates issues, quota and scheduling; no M1–M8 source edits |
| M9 | feature/ac3-m9-integration / integration | PR #36 head 996073a; 9/9 checks pass on currently observed head | Cross-module integration acceptance and risk tracking; no ownership of module source | No merge to main; no PR #24 merge; no Release |

## 共享路径规则

| 路径 | owner | 协调规则 |
| --- | --- | --- |
| `src/runtime/gateway.ts` | M1（Guard/Gateway 契约与安全实现）、M7（可靠性实现） | 已有可见重叠：M1 增加 quarantine callback cancellation；M7 `close()` 增加幂等关闭及资源关闭错误。M1 review 是契约门；最终集成须保留两侧不变量并由 #28 验证 |
| `package.json` | M3、M5、M6、M7（M3/M5/M7 已确认各自字段；M6 字段由迁移提交精确核对） | 不覆盖对方字段；#27 记录字段、原因和组合结果 |
| `src/ai/console.ts` | M3（接入路由）、M4（安全中心配套），暂定 | 路由/响应变更列出协作模块并更新 API 契约 |
| `src/runtime/evidence.ts` | M1（写入调用）、M6（schema/验证），暂定 | 事件语义变更列出协作模块并保留拒绝/执行/副作用边界 |

每模块只提交自己的分支。遇到未归属路径先更新本表；不能通过复制或重命名接口来规避冲突。M3 当前 PR #33 已基于 AC3 并通过 9/9；M6 旧 PR #31 仍以 main 为 base，AC3 PR #38 按 #27 单独跟踪。M0 不替模块 rebase 或覆盖提交；M5 尚无远端 PR，M6/M7 修复未得到新头远端验收。M0 仅协调，不替模块发布。
