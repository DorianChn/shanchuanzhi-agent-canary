# 模块文件所有权表

规则：模块未提交修改由该模块保管。表按实际分支和当下改动路径建立；未被文件证据确认的范围标注“暂定”。路径外改动先建 Issue 并由 owner 协调。不要用 reset、clean 或 checkout 覆盖其他工作树。

| 模块 | 分支 / 工作树 | 检查到的内容 | 独占范围或主要职责 | 共享接口/冲突 |
| --- | --- | --- | --- | --- |
| M1 | `feature/ac3-security-core` / `agents/M1-security` | 有 3 个本地提交，覆盖 Hook、Gateway、测试和安全审计报告 | Gateway、Hook 安全执行路径和测试 | 与 M7 共享 `src/runtime/gateway.ts`；#28 |
| M2 | `feature/ac3-execution-isolation` / `agents/M2-isolation` | `execution-isolation/` 未跟踪 | `execution-isolation/`；具体隔离边界待 PR 说明 | 消费 Gateway 授权结果 |
| M3 | `feature/ac3-agent-onboarding` / `agents/M3-onboarding` | 新增 `src/agent-host-detection.ts` | 宿主发现、预览/安装/恢复适配 | 与 M4 Console routes/UI 对接；基线见 #27 |
| M4 | `feature/ac3-desktop-security-center` / `agents/M4-desktop-security-center` | M0 新建空工作树 | `src/ai/console-page.ts` 和 UI 行为（暂定） | 只经受保护的 Console API 读写 |
| M5 | `feature/ac3-policy-audit` / `agents/M5-policy` | 修改策略、文档、测试、`package.json`；新增管理/回归测试与报告 | `src/risk-policy.ts`、策略管理和相关文档/测试 | `package.json` 与 M6/M7 冲突；#27 |
| M6 | `feature/ac3-e4-validation` / `agents/M6-e4` | `security-lab/e4/` 未跟踪，`package.json` 修改 | E4 schema、验证器、机器报告（暂定） | `package.json` 与 M5/M7 冲突；消费 M1 Evidence；#27 |
| M7 | `feature/ac3-reliability` / `agents/M7-reliability` | Windows packaging、Gateway、`package.json` 和相关测试有修改/新增 | `packaging/windows/`、可靠性和打包验证 | 与 M1 共享 Gateway；与 M5/M6 共享 `package.json`；#27/#28 |
| M8 | `feature/ac3-open-source-product` / `agents/M8-ecosystem` | README、贡献/安全文档、PR/Issue 模板有修改/新增 | README、贡献/安全/支持/开源文档（暂定） | 只描述已验证行为/状态 |
| M0 | `feature/ac3-m0-coordination` / `coordinator` | 本协调 PR | `docs/3.0/*` 协调文档、协作检查 | 维护冲突登记与调度，不改 M1–M8 源码 |
| M9 | `feature/ac3-m9-integration` / `integration` | 本地集成计划 | 跨模块集成验收和风险跟踪，不拥有他人源码 | 不自动合并 main、不发布 Release |

## 共享路径规则

| 路径 | owner | 协调规则 |
| --- | --- | --- |
| `src/runtime/gateway.ts` | M1（契约 owner 暂定）、M7（可靠性实现） | M1/M7 先按 #28 对齐；PR 正文 `Coordinated-with:` 列出另一 owner |
| `package.json` | M5、M6、M7（字段级 owner 待认领） | 不覆盖对方字段；#27 记录字段、原因和组合结果 |
| `src/ai/console.ts` | M3（接入路由）、M4（安全中心配套），暂定 | 路由/响应变更列出协作模块并更新 API 契约 |
| `src/runtime/evidence.ts` | M1（写入调用）、M6（schema/验证），暂定 | 事件语义变更列出协作模块并保留拒绝/执行/副作用边界 |

每模块只提交自己的分支。遇到未归属路径先更新本表；不能通过复制或重命名接口来规避冲突。M3/M6 当前基于 `main` `146be17...`，其他既有模块及新建 M4/M0/M9 基于 AC3 `62496d4...`。M0 不替含未提交改动的模块自动 rebase。
