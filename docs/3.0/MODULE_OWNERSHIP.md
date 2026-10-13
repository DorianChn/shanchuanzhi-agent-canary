# 模块文件所有权表

规则：模块未提交修改由该模块保管。表按实际分支和当下改动路径建立；未被文件证据确认的范围标注“暂定”。路径外改动先建 Issue 并由 owner 协调。不要用 reset、clean 或 checkout 覆盖其他工作树。

| 模块 | 分支 / 工作树 | 检查到的内容 | 独占范围或主要职责 | 共享接口/冲突 |
| --- | --- | --- | --- | --- |
| M1 | feature/ac3-security-core / agents/M1-security | HEAD f15fdcfa；Gateway close 修复已提交，28/28 聚焦测试、build、diff check 通过；当前活动调查 P1 #32 | Gateway/Guard 契约、Hook 安全执行路径和对应回归 | M1 是 Gateway/Guard 契约 owner；close 生命周期契约见 API_CONTRACTS.md 与 #28 |
| M2 | feature/ac3-execution-isolation / agents/M2-isolation | HEAD a1c239d；Draft PR #37 OPEN，AC3 base，当前 9/9 checks 成功 | execution-isolation/ 原型、报告与测试 | 原生 Shell 仍为 UNPROTECTED；AppContainer 仅覆盖已测试子进程操作 |
| M3 | feature/ac3-agent-onboarding / agents/M3-onboarding | HEAD 8fd4e4f；Draft PR #33 OPEN、AC3 base，当前无 CI checks | 宿主发现、预览/安装/恢复适配 | 与 M5/M6/M7 共享 manifest；与 M4 Console routes/UI 对接；补聚焦验证证据；基线见 #27 |
| M4 | feature/ac3-desktop-security-center / agents/M4-desktop-security-center | HEAD fe2c973；Draft PR #34 OPEN，9/9 checks 成功；后端相关接口 404，状态 UNKNOWN | src/ai/console-page.ts 和 UI 行为（暂定） | 只经受保护的 Console API 读写；不以 mock 覆盖 UNKNOWN |
| M5 | feature/ac3-policy-audit / agents/M5-policy | HEAD cd8abea；审计事件语义修复已提交，42/42 聚焦测试、TypeScript noEmit、diff check 通过；远端 PR 未建立 | src/risk-policy.ts、策略管理和相关文档/测试 | package.json 最终组合仍待 #27；此前 WSL push 凭据失败，未重试 |
| M6 | feature/ac3-e4-validation / agents/M6-e4；候选 feature/ac3-e4-validation-ac3 / agents/M6-e4-ac3 | 旧 PR #31 HEAD da52c17/base main，package-smoke 失败；AC3 候选已含本地 commit bca895f，当前活动处理 P1 #31 | E4 schema、验证器、机器报告（暂定） | 逐字节验证外置证据副本；保留 AC3 ignore 规则；真实模型/VM/安装仍未验证 |
| M7 | feature/ac3-reliability / agents/M7-reliability；候选 feature/ac3-reliability-ac3 / agents/M7-reliability-ac3 | 当前活动处理 M1/M7 Gateway 生命周期兼容；AC3 候选以 9c05286 为基线；未建立远端 PR | packaging/windows/、可靠性/打包验证；本轮只在 M7 自有文件/测试内工作 | 保留 M1 Gateway/Guard 契约和 M7 可靠性不变量；集成结果待 #28 |
| M8 | feature/ac3-open-source-product / agents/M8-ecosystem | HEAD b0f30ff；README 双语限制说明已提交，文档/链接/示例检查通过，工作树干净 | README、贡献/安全/支持/开源文档（暂定） | 当前仅本地提交，未推送；不得发布 Release |
| M0 | `feature/ac3-m0-coordination` / `coordinator` | 本协调 PR | `docs/3.0/*` 协调文档、协作检查 | 维护冲突登记与调度，不改 M1–M8 源码 |
| M9 | `feature/ac3-m9-integration` / `integration` | 本地集成计划 | 跨模块集成验收和风险跟踪，不拥有他人源码 | 不自动合并 main、不发布 Release |

## 共享路径规则

| 路径 | owner | 协调规则 |
| --- | --- | --- |
| `src/runtime/gateway.ts` | M1（Guard/Gateway 契约与安全实现）、M7（可靠性实现） | 已有可见重叠：M1 增加 quarantine callback cancellation；M7 `close()` 增加幂等关闭及资源关闭错误。M1 review 是契约门；最终集成须保留两侧不变量并由 #28 验证 |
| `package.json` | M3、M5、M6、M7（M3/M5/M7 已确认各自字段；M6 字段由迁移提交精确核对） | 不覆盖对方字段；#27 记录字段、原因和组合结果 |
| `src/ai/console.ts` | M3（接入路由）、M4（安全中心配套），暂定 | 路由/响应变更列出协作模块并更新 API 契约 |
| `src/runtime/evidence.ts` | M1（写入调用）、M6（schema/验证），暂定 | 事件语义变更列出协作模块并保留拒绝/执行/副作用边界 |

每模块只提交自己的分支。遇到未归属路径先更新本表；不能通过复制或重命名接口来规避冲突。M3 已对齐 AC3 `62496d4...` 并开 Draft PR #33；M6 旧 PR #31 仍以 `main` 为 base，新 AC3 worktree 按 #27 独立迁移。M0 不替模块 rebase 或覆盖提交；M8 本地文档提交由模块 owner 保管，Release 未发布。M5/M6/M8 本地修复尚无对应新远端模块 PR；M0 仅同步状态，不替模块发布。
