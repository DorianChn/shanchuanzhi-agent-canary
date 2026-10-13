# 模块文件所有权表

规则：模块未提交修改由该模块保管。表按实际分支和当下改动路径建立；未被文件证据确认的范围标注“暂定”。路径外改动先建 Issue 并由 owner 协调。不要用 reset、clean 或 checkout 覆盖其他工作树。

| 模块 | 分支 / 工作树 | 检查到的内容 | 独占范围或主要职责 | 共享接口/冲突 |
| --- | --- | --- | --- | --- |
| M1 | `feature/ac3-security-core` / `agents/M1-security` | HEAD `ec3bc96`；P0 #35 修复本地提交，远端交付 BLOCKED；#32 诊断任务已结束，当前只读审阅 #28 的 M7 owner 报告，不接触 M7 worktree | Gateway/Guard 契约、Hook 安全执行路径和对应回归 | M1 是 Gateway/Guard 契约 owner；当前提供 close 生命周期组合语义与最低回归要求 |
| M2 | `feature/ac3-execution-isolation` / `agents/M2-isolation` | HEAD `a1c239d`，WSL/Windows refs 相同且 worktree 干净；已授权一次使用 Windows Git 发布现有提交，远端结果待确认 | `execution-isolation/` 原型、报告与测试 | 原生 Shell 仍为 `UNPROTECTED`；不得将范围扩大为全局宿主保护 |
| M3 | `feature/ac3-agent-onboarding` / `agents/M3-onboarding` | HEAD `8fd4e4f`，工作树干净；Draft PR #33 OPEN、AC3 base | 宿主发现、预览/安装/恢复适配 | 与 M5/M6/M7 共享 manifest；与 M4 Console routes/UI 对接；基线见 #27 |
| M4 | `feature/ac3-desktop-security-center` / `agents/M4-desktop-security-center` | HEAD `fe2c973`；Draft PR #34 OPEN；run `38386967113` 当前 head 9/9 checks 通过；工作树干净，IDLE | `src/ai/console-page.ts` 和 UI 行为（暂定） | 只经受保护的 Console API 读写 |
| M5 | `feature/ac3-policy-audit` / `agents/M5-policy` | HEAD `6e2730a`；41/41 策略用例通过、工作树干净；owner 确认 `./policy` export 和两项 test 路径；WSL push 因缺凭据失败、无 PR，IDLE/BLOCKED | `src/risk-policy.ts`、策略管理和相关文档/测试 | `package.json` 最终组合仍待 #27；不重试 push、不改凭据 |
| M6 | `feature/ac3-e4-validation` / `agents/M6-e4`；候选 `feature/ac3-e4-validation-ac3` / `agents/M6-e4-ac3` | 原 HEAD `da52c17`、旧 PR #31 保持 main base；候选完成前两次 cherry-pick，末次停在 `.gitignore` 冲突，另有证据文件换行差异待核对 | E4 schema、验证器、机器报告（暂定） | 只迁移 M6 三个 commits；保留 AC3 ignore 规则，仅加 raw.log allowlist；实际 E4/VM/模型/安装仍不运行 |
| M7 | `feature/ac3-reliability` / `agents/M7-reliability`；候选 `feature/ac3-reliability-ac3` / `agents/M7-reliability-ac3` | 原 HEAD `9c05286` 和 AC3 候选均保留；候选静态检查通过，远端 push 曾被凭据阻塞、无 PR；任务 IDLE，等待 M1 review；缺少 `makensis.exe` | `packaging/windows/`、可靠性/打包验证；M7 的 Gateway close 差异由 #28 协调 | 不自行合并/覆盖 M1 P0；不重试 push，不运行安装测试 |
| M8 | `feature/ac3-open-source-product` / `agents/M8-ecosystem` | HEAD `129ab655`；本地两笔文档提交与工作树完整；一次 WSL push 因 askpass 无法读取失败，BLOCKED，无远端 PR/Release | README、贡献/安全/支持/开源文档（暂定） | 不重试、不改凭据；不得发布 Release |
| M0 | `feature/ac3-m0-coordination` / `coordinator` | 本协调 PR | `docs/3.0/*` 协调文档、协作检查 | 维护冲突登记与调度，不改 M1–M8 源码 |
| M9 | `feature/ac3-m9-integration` / `integration` | 本地集成计划 | 跨模块集成验收和风险跟踪，不拥有他人源码 | 不自动合并 main、不发布 Release |

## 共享路径规则

| 路径 | owner | 协调规则 |
| --- | --- | --- |
| `src/runtime/gateway.ts` | M1（Guard/Gateway 契约与安全实现）、M7（可靠性实现） | 已有可见重叠：M1 增加 quarantine callback cancellation；M7 `close()` 增加幂等关闭及资源关闭错误。M1 review 是契约门；最终集成须保留两侧不变量并由 #28 验证 |
| `package.json` | M3、M5、M6、M7（M3/M5/M7 已确认各自字段；M6 字段由迁移提交精确核对） | 不覆盖对方字段；#27 记录字段、原因和组合结果 |
| `src/ai/console.ts` | M3（接入路由）、M4（安全中心配套），暂定 | 路由/响应变更列出协作模块并更新 API 契约 |
| `src/runtime/evidence.ts` | M1（写入调用）、M6（schema/验证），暂定 | 事件语义变更列出协作模块并保留拒绝/执行/副作用边界 |

每模块只提交自己的分支。遇到未归属路径先更新本表；不能通过复制或重命名接口来规避冲突。M3 已对齐 AC3 `62496d4...` 并开 Draft PR #33；M6 旧 PR #31 仍以 `main` 为 base，新 AC3 worktree 按 #27 独立迁移。M0 不替模块 rebase 或覆盖提交；M8 本地文档提交由模块 owner 保管，Release 未发布。
