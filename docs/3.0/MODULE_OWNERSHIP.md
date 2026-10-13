# 模块文件所有权表

规则：模块未提交修改由该模块保管。表按实际分支和当下改动路径建立；未被文件证据确认的范围标注“暂定”。路径外改动先建 Issue 并由 owner 协调。不要用 reset、clean 或 checkout 覆盖其他工作树。

| 模块 | 分支 / 工作树 | 检查到的内容 | 独占范围或主要职责 | 共享接口/冲突 |
| --- | --- | --- | --- | --- |
| M1 | `feature/ac3-security-core` / `agents/M1-security` | HEAD `ec3bc96`；P0 #35 修复和契约提案已本地提交，63/63 Windows Node 20 聚焦测试；GitHub 分支/PR 尚不存在，远端交付 BLOCKED | Gateway/Guard 契约、Hook 安全执行路径和对应回归 | M1 是 #35 唯一 Gateway 写入者；M7 暂停共享文件改动；#28/#35 |
| M2 | `feature/ac3-execution-isolation` / `agents/M2-isolation` | HEAD `a1c239d`；隔离原型与证据已提交、工作树上次检查干净；远端 Draft PR 未列出，原生 Shell 仍标为 `UNPROTECTED` | `execution-isolation/` 原型、报告与测试 | 消费 Gateway 授权结果 |
| M3 | `feature/ac3-agent-onboarding` / `agents/M3-onboarding` | HEAD `8fd4e4f`，工作树干净；Draft PR #33 OPEN、AC3 base | 宿主发现、预览/安装/恢复适配 | 与 M5/M6/M7 共享 manifest；与 M4 Console routes/UI 对接；基线见 #27 |
| M4 | `feature/ac3-desktop-security-center` / `agents/M4-desktop-security-center` | HEAD `0613057`；Draft PR #34 OPEN；run `38385403836` 当前 head 的 9/9 checks 通过；本地仅有 owner 的 UI 测试报告未提交，线程 IDLE | `src/ai/console-page.ts` 和 UI 行为（暂定） | 只经受保护的 Console API 读写 |
| M5 | `feature/ac3-policy-audit` / `agents/M5-policy` | HEAD `6e2730a`；41/41 策略用例通过，工作树干净；线程 RUNNING，限时远端 Draft PR 交接 | `src/risk-policy.ts`、策略管理和相关文档/测试 | `package.json` 与 M3/M6/M7 字段仍待 #27 协调；当前禁止顺带改 manifest |
| M6 | `feature/ac3-e4-validation` / `agents/M6-e4` | HEAD `da52c17`，已同步远端模块分支；含 `package.json`、E4 验证代码和报告 artifact；工作树当前干净 | E4 schema、验证器、机器报告（暂定） | `package.json` 与 M3/M5/M7 冲突；消费 M1 Evidence；基线见 #27 |
| M7 | `feature/ac3-reliability` / `agents/M7-reliability` | HEAD `9c05286`；工作树干净，领先 AC3 跟踪基线 2 个提交；40 pass/3 symlink-permission skips；线程 RUNNING，限时远端 Draft PR 交接；缺少 `makensis.exe` | `packaging/windows/`、可靠性和打包验证 | 与 M1 共享 Gateway；本轮不得改 `src/runtime/gateway.ts`；与 M3/M5/M6 共享 `package.json`，#27/#28 |
| M8 | `feature/ac3-open-source-product` / `agents/M8-ecosystem` | README、贡献/安全/支持文档、PR/Issue 模板及用户指南有既有未提交修改/新增；线程 RUNNING，正在做文档检查和静态编译 | README、贡献/安全/支持/开源文档（暂定） | 只描述已验证行为/状态；不得创建/发布 Release |
| M0 | `feature/ac3-m0-coordination` / `coordinator` | 本协调 PR | `docs/3.0/*` 协调文档、协作检查 | 维护冲突登记与调度，不改 M1–M8 源码 |
| M9 | `feature/ac3-m9-integration` / `integration` | 本地集成计划 | 跨模块集成验收和风险跟踪，不拥有他人源码 | 不自动合并 main、不发布 Release |

## 共享路径规则

| 路径 | owner | 协调规则 |
| --- | --- | --- |
| `src/runtime/gateway.ts` | M1（Guard/Gateway 契约与安全实现）、M7（可靠性实现） | #35 P0 修复期间由 M1 独占编辑；M7 暂只改 packaging/scripts/M7 测试。恢复共享修改前须经 #28 协调并合并两侧不变量 |
| `package.json` | M3、M5、M6、M7（字段级 owner 待认领） | 不覆盖对方字段；#27 记录字段、原因和组合结果 |
| `src/ai/console.ts` | M3（接入路由）、M4（安全中心配套），暂定 | 路由/响应变更列出协作模块并更新 API 契约 |
| `src/runtime/evidence.ts` | M1（写入调用）、M6（schema/验证），暂定 | 事件语义变更列出协作模块并保留拒绝/执行/副作用边界 |

每模块只提交自己的分支。遇到未归属路径先更新本表；不能通过复制或重命名接口来规避冲突。M3 已对齐 AC3 `62496d4...` 并开 Draft PR #33；M6 仍基于 `main` `146be17...`、PR #31 base 为 `main`，待按 #27 协调。M0 不替含未提交改动的模块自动 rebase；M8 现存未提交文档保持模块所有者控制。
