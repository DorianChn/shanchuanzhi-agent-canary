# 模块文件所有权表

规则：模块未提交修改由该模块保管。表按实际分支和当下改动路径建立；未被文件证据确认的范围标注“暂定”。路径外改动先建 Issue 并由 owner 协调。不要用 reset、clean 或 checkout 覆盖其他工作树。

| 模块 | 分支 / 工作树 | 检查到的内容 | 独占范围或主要职责 | 共享接口/冲突 |
| --- | --- | --- | --- | --- |
| M1 | feature/ac3-security-core / agents/M1-security | 本地候选 dc4d7fa：quarantine 测试 34/34（owner 报告）；13:40 push exit 1/no output；PR #43 仍 d0fd595；#32 follow-up 排队 | Gateway/Guard 契约、Hook 安全执行路径和对应回归 | M1 是 Gateway/Guard 契约 owner；#35 P0 保持 OPEN，#32/#28 继续协调 |
| M2 | feature/ac3-execution-isolation / agents/M2-isolation | HEAD a1c239d；Draft PR #37 OPEN，AC3 base，当前 9/9 checks 成功 | execution-isolation/ 原型、报告与测试 | 原生 Shell 仍为 UNPROTECTED；AppContainer 仅覆盖已测试子进程操作 |
| M3 | feature/ac3-agent-onboarding / agents/M3-onboarding | HEAD c404b6b；PR #33 当前 9/9 checks；owner 契约章节已加入 | 宿主发现、预览/安装/恢复适配 | #42 已依据当前 package-smoke 与 API 契约证据关闭；仍与 M5/M6/M7 通过 #27 协调 manifest |
| M4 | feature/ac3-desktop-security-center / agents/M4-desktop-security-center | HEAD fe2c973；Draft PR #34 OPEN，9/9 checks 成功；后端相关接口 404，状态 UNKNOWN | src/ai/console-page.ts 和 UI 行为（暂定） | 只经受保护的 Console API 读写；不以 mock 覆盖 UNKNOWN |
| M5 | feature/ac3-policy-audit / agents/M5-policy | HEAD 9ec08d9；owner 报告 42/42 聚焦测试及类型/差异检查通过；上传停止于无输出，GitHub 无远端分支/PR | src/risk-policy.ts、策略管理和相关文档/测试 | package.json 最终组合仍待 #27；仅 owner 发布模块分支 |
| M6 | feature/ac3-e4-validation-ac3 / agents/M6-e4-ac3；另有旧 PR #31 | PR #38 bca895f 的唯一失败属 M1 Hook 测试；本地 Node 22 agent-hook 10/10，M6 未改代码 | E4 schema、验证器、机器报告（暂定） | E4 外部证据仍 NOT_VERIFIED；共享 manifest 经 #27 协调，Hook 失败经 #32 交 M1 |
| M7 | feature/ac3-reliability-ac3 / agents/M7-reliability-ac3 | 本地候选 65ce028；PR #39 远端仍 f17b7e6 且 checks 失败；单次 push 被非交互 HTTPS 凭据阻止 | packaging/windows/、可靠性/打包验证 | M1 是 Gateway/Guard 契约 owner；#28/#41 保持 OPEN |
| M8 | feature/ac3-open-source-product / agents/M8-ecosystem | PR #40 head b0f30ff；9/9 checks 通过，工作树干净 | README、贡献/安全/支持/开源文档（暂定） | 不得发布 Release |
| M0 | feature/ac3-m0-coordination / coordinator | PR #30 head 6d61483；CI 9/9 与 ownership/contract gate 1/1 通过 | docs/3.0/* 协调文档、协作检查 | 维护冲突登记与调度，不改 M1–M8 源码 |
| M9 | feature/ac3-m9-integration / integration | PR #36 head 996073a；9/9 checks 通过 | 跨模块集成验收和风险跟踪，不拥有他人源码 | 不自动合并 main、不发布 Release |

## 共享路径规则

| 路径 | owner | 协调规则 |
| --- | --- | --- |
| `src/runtime/gateway.ts` | M1（Guard/Gateway 契约与安全实现）、M7（可靠性实现） | 已有可见重叠：M1 增加 quarantine callback cancellation；M7 `close()` 增加幂等关闭及资源关闭错误。M1 review 是契约门；最终集成须保留两侧不变量并由 #28 验证 |
| `package.json` | M3、M5、M6、M7（M3/M5/M7 已确认各自字段；M6 字段由迁移提交精确核对） | 不覆盖对方字段；#27 记录字段、原因和组合结果 |
| `src/ai/console.ts` | M3（接入路由）、M4（安全中心配套），暂定 | 路由/响应变更列出协作模块并更新 API 契约 |
| `src/runtime/evidence.ts` | M1（写入调用）、M6（schema/验证），暂定 | 事件语义变更列出协作模块并保留拒绝/执行/副作用边界 |

每模块只提交自己的分支。遇到未归属路径先更新本表；不能通过复制或重命名接口来规避冲突。M3 当前 PR #33 已基于 AC3 并通过 9/9；M6 旧 PR #31 仍以 main 为 base，AC3 PR #38 按 #27 单独跟踪。M0 不替模块 rebase 或覆盖提交；M5 尚无远端 PR，M6/M7 修复未得到新头远端验收。M0 仅协调，不替模块发布。
