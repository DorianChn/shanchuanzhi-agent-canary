# M5 策略与审计报告

**范围**：`feature/ac3-policy-audit` 上的确定性风险策略、项目策略管理、策略决策证据和 Canary Guard 接入。检查了 M0/M1 相关接口边界、`src/risk-policy.ts`、`src/containment.ts`、Hook、Gateway、现有证据/日志实现和对应测试。

## 结论

M5 增加了只能收紧策略的项目级规则、冲突预览、明确的放宽确认、追加式版本历史、托管策略路由及可校验的审计导出。未登记工具现在在 `OBSERVE`、`BALANCED`、`STRICT` 三种模式都直接拒绝。正常读取与审定开发命令保持可用；写入、构建等已知风险操作仍由宿主人工审批，不由模型批准。

默认模式仍为 BALANCED，Guard 隔离行为不变。默认策略没有降低。原有 Hook、Gateway 和 OSEP 证据协议没有被 M5 自动改写。M0 负责维护跨模块 canonical API contract；本报告只记录 M5 模块行为和证据，不替代该契约。M0/M1/M5/M9 已完成各自有限范围的契约、路径或 CI 核对，Issue #48 和 #49 已按各自有限范围关闭；这些证据不验证真实 M1+M5 宿主接线或真实副作用。

## 当前状态快照（截至 2026-10-14 18:26 UTC / 2026-10-15 02:26 GMT+8）

> 本节是截至 2026-10-14 18:26 UTC / 2026-10-15 02:26 GMT+8 的时间点快照，不代表随时实时状态。列出的 head 和检查结果仅适用于该时间点；其后状态以对应 Draft PR 的最新 head 与 checks 为准。下方保留的更早 SHA/run 及 2026-10-14/15 状态段属于历史记录；Issue #46 的快照状态以本节记录为准。

- **M5 PR #47**：当前远端 head 为 3afc55324cc1d83f2000697e168decb48e33b0b8；其精确 head CI run [38614270263](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38614270263) 全部 9/9 成功。
- **M0 PR #30**：当前 head 为 1ec52878a7a148e917210eaf13e3dd4d4257df2d；产品 CI run [38614268660](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38614268660) 为 9/9，ownership run [38614269082](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38614269082) 为 1/1。
- **Issue #46**：仍为 OPEN，等待本次报告同步及对应新 PR head CI。**Issue #48** 已按 OBSERVE hard-deny 的有限范围 CLOSED；**Issue #49** 已按 canonical 根契约与 M1 契约的有限路径/hash 核对范围 CLOSED。各 Issue 关闭只覆盖其记录范围。
- **M9 PR #36**：当前远端 head 为 d80245599912aec3cc7fdb3f2a58378caed0143d，是包含多模块代码与测试的集成候选。该 exact head 的 product CI run [38614289321](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38614289321) 为 9/9，wrapper run [38614289309](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38614289309) 为 2/2。此候选与通过的检查仍不证明 native-host、clean-VM/installer、external E4 或真实工具副作用。
- **Issue #27 / combined manifest**：M6 owner 对字段的明确确认仍待办；combined manifest owner acceptance remains pending。
- **安全边界保持**：OBSERVE 对敏感读取和显式硬拒绝仍是 hard-deny；对应夹具断言拒绝前 pending approval 为 0、callback 次数为 0。UNKNOWN 与 NOT_VERIFIED 仍按字面保留，不从局部 CI 或文档/hash 检查推断为已验证。
- **仍为 NOT_VERIFIED**：真实 M1+M5 host wiring、native-host、E4 的外部验证、clean-VM/installer、native Shell 保护及真实工具副作用。M5 fixture、M9 多模块集成候选的 exact-head CI 与有限范围的 Issues #48/#49 证据均不替代这些验证。

## 主要审计发现与处置

| 项目 | 检查结果 | M5 处置或边界 |
|---|---|---|
| 未登记工具 | 原策略把未登记能力放入人工审批；`OBSERVE` 还会覆盖该审批，缺少可信操作描述时仍可能调用宿主回调。 | 无注册描述时按 `UNKNOWN` 处理，兼容现有策略 API 返回 `DENY / unregistered_tool`，不入审批队列，所有模式 fail closed。 |
| 默认策略 | `BALANCED` 对普通只读按策略放行；写入、未审定 Shell/网络操作需宿主审批；已识别的越界、秘密外传拒绝。 | 保持既有默认。`OBSERVE` 只豁免已登记、非敏感操作的可选审批；敏感数据读/外发、越界路径和显式硬拒绝始终拒绝。Guard 隔离和未登记工具拒绝不受它覆盖。该模式仍降低普通风险审批强制性，仅适合演练。 |
| 项目策略 | 原来没有带版本、预览、冲突检查和回滚的项目策略管理器。 | 新增规则只能增加 `DENY`，不可声明 `ALLOW`。精确工具名可选风险类别；拒绝重叠选择器和重复 ID。移除或缩窄拒绝范围须显式确认；回滚以新版本追加，不改写旧历史。 |
| 人工确认 / 模型 | 审批身份必须由宿主认证；模型不得授予执行权。 | 策略回调接口只能给出 `DENY` 或 `UNCHANGED`。审批是原调用绑定、一次性、有时限的宿主操作。项目 API 接收的操作者字符串只用于关联证据，本身不是身份认证。 |
| 策略版本和解释 | 原策略告警缺少项目策略版本、调用来源和统一原因码；“allowed”事件并非回调成功证明。 | M5 决策/结果事件包含策略版本、调用来源、决策来源、结果状态、侧效应验证状态、原因码和规则 ID。执行结果单独记为 `EXECUTION_RESULT`。 |
| Canary 生命周期 | 原 Guard 在诱饵或 Token 信号上同步进入隔离；日志/通知及凭据撤销是后续副作用。解隔离是宿主人工 Reset。 | M5 托管路由记录诱饵导致的隔离和后续 Guard 拒绝；不替换 Guard。普通策略审计故障会阻止开始新的托管回调；隔离状态自身不依赖 M5 日志写入成功。 |
| 故障来源 | 模型拒绝、Hook 拒绝、Gateway 拒绝和工具回调异常必须可区分。 | 结构化枚举分别使用 `MODEL_REVIEW`、`NATIVE_HOOK`、`GATEWAY`、`TOOL` 来源。回调抛错时副作用不确定，记录 `execution_status=UNKNOWN`、`side_effect_verification=UNKNOWN`，不伪称已阻断。 |
| 证据与脱敏 | 旧 JSONL 有结构化事件和秘密模式脱敏，但没有 M5 项目策略版本/导出链。 | 新增独立 `agent-canary.policy-audit/1` JSONL 哈希链、导出和校验。调用参数、正文、路径和秘密值不进入 M5 事件；操作者只存项目作用域 HMAC 摘要。 |

## 决策语义

- **ALLOW**：确定性策略允许进入可信宿主回调。它不证明回调成功、外部副作用已发生或已被验证。
- **DENY**：策略或 Guard 明确拒绝。只有在回调前的拒绝路径上，才意味着该回调没有启动；要依据 `execution_status` 判断。
- **UNKNOWN**：工具能力未注册或无法解释。M5 审计层保留 `UNKNOWN`；旧策略路由为 API 兼容映射成 `DENY / unregistered_tool`，禁止审批绕过。
- **REQUIRE_CONFIRMATION**：已知能力需宿主人工确认。请求阶段记录 `NOT_STARTED`；模型建议、日志事件、工具参数和操作者字符串都不能代替宿主认证。
- **NOT_APPLICABLE**：用于执行结果等没有策略放行/拒绝含义的事件。

`policy_allowed`、审计追加成功和 Guard 告警都不是工具阻断成功的充分证据。预执行审计失败时，托管路由不调用真实回调；回调返回后若结果审计失败，当前操作已可能完成，M5 会触发 Guard 隔离并把风险留给宿主处理，不会声称或模拟撤销已发生的副作用。

## Canary 隔离与状态恢复

现有 Guard 在诱饵或 Canary Token 命中时同步设置 `QUARANTINED`，随后尽力记录事件、请求凭据撤销并告警。后续受保护调用会在真实回调前被拒绝；在可信宿主未配置 `quarantineAllow` 时没有隔离例外。共享状态存储错误会把本地 Guard 锁闭，恢复读取到 `SAFE` 也不会自动解隔离。状态重置需要宿主可信控制面显式调用 `reset()`；SDK 只验证标识字符串形式，不认证真人或组织身份。

托管执行把最终项目策略检查、调用结果记录和策略更改串行化：若更新在 callback 启动前提交，调用按新规则拒绝；若执行先取得锁，期间的策略写入会失败并保持旧版本，不能报告成成功应用。该锁不撤回已启动的外部副作用。

隔离日志/通知和凭据撤销可能失败，但这些失败不重开本地断路器。反过来，日志成功也不能证明某个任意宿主、Hook 或 Gateway 的回调一定经过 Guard。绕过托管 Router 的执行路径仍由宿主负责保护。

## M5 与 M1 Gateway 最终授权复核

本次只读检查 M1 工作树 `agents/M1-security` 的 `feature/ac3-security-core`，HEAD 为 `0cff427`。Gateway 在入队前、串行队列/复审后检查 Guard，并在记录 `RUNNING` 证据之后、调用文件/网络/进程/MCP 执行器之前再次调用 `guard.beforeToolCall()`。MCP 请求先映射到实际工具 ID 和参数再交给 Guard；因此，M5 的 `ALLOW` 不能替代 Gateway 对真实执行入口的最后一次授权。本分支没有修改 M1 Gateway 或 Hook。

新增 `test/policy-management.test.ts` 回归把 M5 托管策略的真实回调边界设为宿主最终授权器：在 M5 完成确定性 `ALLOW` 后，最终授权器拒绝调用，断言没有副作用，并将结果记为 `UNKNOWN / UNKNOWN`，而不是成功或已阻断。此测试验证 M5 包装层不会吞掉最终授权失败；它使用 host adapter fixture，不冒充对真实跨工作树 M1+M5 运行时的集成验证。

**审计发现，需 M0/M1 协调**：M1 Gateway 的最终 Guard 拒绝在当前实现中由执行器通用 `catch` 路径记录为 `decision=ALLOW`、`execution_status=FAILED`、`side_effect_verification=NOT_VERIFIED`，并以 `GATEWAY_EXECUTION_FAILED_EFFECTS_NOT_ROLLED_BACK` 返回。执行器入口确实尚未启动，但证据没有单独标识最终 Guard 拒绝来源；`NOT_VERIFIED` 也不能被解释为“已确认无副作用”。Gateway 自有证据链仍需检查，不能用 M5 日志代替。建议 M1/M0 为此类预执行拒绝定义明确来源/结果语义和跨层关联字段，记录在 Issue #35；M5 目前没有稳定错误契约来自动区分该 Gateway 拒绝与其他执行器异常。

**在途 Canary 解除缺口**：只读运行 M1 当前工作树的 Gateway 定向测试时，`external Guard quarantine synchronously aborts an active callback before its synthetic effect` 失败（实际 `activeSignal.aborted=false`，期望 `true`）。失败发生在断言尚未释放测试 callback 之前，所以本次没有得到“该 synthetic effect 是否发生”的结果。Gateway 内部检测到拒绝时会调用 `abortSession()`，但单独从 Gateway 外部调用 `guard.trip()` 不会通知 Gateway 正在运行的 controllers；故当前源码检查不能证明外部 Canary 信号会同步中断已开始的回调。这个 M1 工作树中的测试为未提交改动，本分支保留且未编辑。该失败使外部触发后的在途调用隔离仍未通过验证，应由 M1 修复并复测。

**接线边界**：M5 项目规则与 M1 Gateway 是两套独立授权和审计状态。推荐由宿主确保模型只有 Gateway 的 `agent.dispatch` 入口，并将 Gateway 注册的可信 MCP 执行器接到 M5 托管路由，使任一层均可拒绝。若直接暴露 M5 Router、绕过 Gateway，或由 M5 callback 再调用 Gateway，授权顺序和错误归属会变化；目前没有共享合约规定统一调用拓扑、决定关联 ID 或自动镜像拒绝事件。该接口问题提交 M0 在 #35 协调；`package.json` 字段归属仍在 #27 待分配，本轮未接触 `package.json`。

## M0 契约边界与状态核对

历史状态记录（此前核对的 M0 PR #30 heads）：旧 head 39e2cc237e68e963955c07be3719a26afdd5981c 当时有 10/10 检查；其后的 63d10b86d6c8e2c3e66d2608a9222ddeb728f594 曾有产品 9/9、ownership 1/1。两组旧 head/run 均已由本文开头当前快照中的最新 M0 head 453aa31 及对应检查取代。Issue #46 此前等待 M0 更新的状态也已过期：当前正文同步已完成，关闭待后续处理。M0 是 canonical 根契约的维护方；M5 不拥有、不修改，也不复制该 canonical 路径。M5 将未知工具映射为 DENY / unregistered_tool，并在 M5 审计事件中保留 UNKNOWN。M5 没有修改 M1 的 Hook、Gateway、Guard 或 runtime/evidence.ts；与 Gateway 组合时仍需把最终回调路由到 Gateway agent.dispatch。

历史路径核对（M5 PR #47 较早 head 5fd4707746186c4752e3a166e59a7292f112ff63）：在该 head 与 base 62496d4020bd90ba2eede49b2e80a2bbebb036b4 的 tree 中，M0 canonical 根路径 docs/3.0/API_CONTRACTS.md 均不存在，对该路径的 base-to-head diff 为空。这只是旧 M5 head 的路径记录，不描述当前 PR #47 head，也不表示 M5 是该契约的所有者或副本维护者。

历史路径/hash 核对（此前比较的 M9 PR #36 head ed0dd015a6e46029d1df4ac077a6e9378fb1a494 与 M0 PR #30 head 39e2cc237e68e963955c07be3719a26afdd5981c、M1 PR #43 head d26a0c3376885becd7a80c5039891702fdb2f946）：该 M9 候选同时包含 M0 canonical 根契约与 M1 子目录契约；根契约 SHA-256 fe10af13af8e2da1bc22edff6c1b1e4b09dae094abe6556d992c04647bd639ea 与当时的 M0 head 一致，M1 契约 SHA-256 b10a3c515ec0da787f4145ebb6069c18292095245fad254d8c5a2ccd24930aa0 与当时的 M1 head 一致。这是 Issue #49 关闭时所记录的有限路径/hash 核对；M0 PR #30 已前进到新 head，因此这些旧 hash 不证明新 M0 head 的内容。M0 维护 canonical 根路径；M5 不修改、复制或声称拥有它。Issue #48 已按 OBSERVE hard-deny 的有限精确 head CI 范围关闭，不代表更广的跨模块集成验收。

M5 证据事件仍由宿主显式调用 `policyManager.recordDecision()` 写入；Hook/Gateway 自动接线、跨模块事件关联及真实 M1+M5 集成尚未验证。

## 验证范围

测试覆盖项目策略只收紧、冲突和回滚、未知工具、人工审批、普通开发任务、隔离/重置、工具失败状态、来源区分、脱敏、链篡改/截断和审计故障闭锁。自动化使用临时目录、假宿主回调及虚拟工具；不代表真实文件系统沙箱、Shell 语义解析、网络出口控制或外部身份认证已经验证。

先前 M5 交付验证：`npm run build` 通过；`npm test` 共 342 项，337 通过、0 失败、5 项因平台条件跳过；`npm run pack:check` 通过（92 个打包文件）；`git diff --check` 通过。

本轮增量验证：M5 定向策略、路由和误拦截测试 `node --import tsx --test test/policy-management.test.ts test/risk-policy.test.ts test/false-positive.test.ts` 通过（41/41）；`node node_modules/typescript/bin/tsc --noEmit` 与 `git diff --check` 通过。只读运行 M1 Gateway 定向测试 `node --import tsx --test test/gateway.test.ts test/gateway-acceptance.test.ts` 为 37/38，其中上述在途 Guard quarantine 测试失败。完整 M5 build/test/pack 本轮未重跑；真实 M1+M5 宿主接线、Windows 原生 Hook、跨进程/生产 Gateway、真实工具副作用与外部锚定仍未验证。

## 2026-10-14 M5 收尾候选

本轮修复 `OBSERVE` 对安全拒绝的过度覆盖：之前任何已登记工具的 `DENY` 都可能被观察模式改成 `ALLOW`，包括越界路径、明确危险 Shell、敏感外发；敏感路径读取也可能绕过人工确认。现在显式硬拒绝不可覆盖，且 OBSERVE 下任何标有 `SENSITIVE_DATA` 的操作都拒绝；普通已登记操作中仅可选审批仍能按 OBSERVE 规则继续。默认 `BALANCED` 和 M1 Gateway 最终授权不变。

本轮 M5 自有改动：src/risk-policy.ts、test/risk-policy.test.ts、docs/RISK_POLICY.md、FALSE_POSITIVE_REPORT.md、本报告。未改 package.json、M0 canonical contract、M1 Gateway/Hook 或其他模块路径。M5 HEAD 组合了 M1 owner-authored commit f59ba37：仅将 M1 router 测试中的 OBSERVE 敏感读取夹具改为安全文件读取，保留 egress 拒绝断言；M5 仍将 OBSERVE 的 sensitive-read 硬拒绝，拒绝前待审批数为 0、callback 次数为 0。M5 原有 manifest 增量仍为 exports["./policy"]（types/import/default）以及 test/false-positive.test.ts、test/policy-management.test.ts 两个 scripts.test 路径；Issue #27 已记录 M5 的字段 owner 确认，但合并 manifest 尚待 M3/M6/M7 一起验证。

### PR #47 较早状态与验证记录（历史）

- 标题：[M5] Preserve hard denials in OBSERVE policy mode。
- 历史快照中的 Base：feature/agent-canary-3.0，SHA 62496d4020bd90ba2eede49b2e80a2bbebb036b4；当时 PR #47 为 OPEN/Draft，head 5fd4707746186c4752e3a166e59a7292f112ff63。Issue #46 当时 OPEN，Issue #48/#49 当时 CLOSED；当前状态见本文开头快照。
- `API-Contract-Change: yes`；`Coordinated-with: M0, M1, M3, M6, M7`。
- 此前代码候选 cf4e2cdb 的本地证据：定向 router/risk 测试 43/43；npm test 341 passed、5 skipped、0 failed；npm run build 与 git diff --check 通过。随后 PR head 加入中断测试夹具，由当时的 head CI 覆盖；完整本地套件未在 5fd4707 上重跑。
- 此前 PR head 5fd4707746186c4752e3a166e59a7292f112ff63 的 GitHub Actions run 38561283918 为 9/9 success：Node 20/22 在 Ubuntu、Windows、macOS，Docker、Sponsor 和 package-smoke 均通过。该 run 不对应开头当前快照中的新 head。
- 此前跨模块精确 head 检查：M1 PR #43 head d26a0c3376885becd7a80c5039891702fdb2f946 的 run 38602072618 为 9/9；当时 M0 PR #30 head 39e2cc237e68e963955c07be3719a26afdd5981c 为 10/10；M9 PR #36 head ed0dd015a6e46029d1df4ac077a6e9378fb1a494 的 product run 38604703774 为 9/9、wrapper run 38604703745 为 2/2。Issue #48/#49 按各自有限范围关闭。上述旧 head 证据不证明真实 M1+M5 宿主接线、真实副作用或 E4；M3/M5/M6/M7 package manifest 组合仍单独跟踪。

### PR #47 描述的历史观察

历史观察：此前读取的远端 PR #47 描述最后更新于 2026-10-14 16:28 UTC，当时包含 M9 combined acceptance pending。该观察不证明当前 PR 描述仍是这一内容；Issue #46 当前正文同步已完成、关闭待后续处理，详见开头快照。Issue #48/#49 已按各自有限范围关闭；真实 M1+M5 宿主接线与真实副作用仍为 NOT_VERIFIED。

### P0 验收条件

1. `OBSERVE` 下，显式 `DENY`（包括未登记工具、越界路径、硬拒绝 Shell 和敏感外发）保持 `DENY`；每个拒绝在真实回调启动前发生，回调计数为 0。
2. 标记 `SENSITIVE_DATA` 的 `.env` 路径读取、宿主登记的 `sensitive-read` 操作和包含敏感标记的外发均在 `OBSERVE` 下拒绝；不创建待审批请求、不执行 callback、不把参数写入策略日志。
3. Guard 已隔离时 `OBSERVE` 不能恢复或绕过隔离；后续真实回调计数为 0。
4. 同一测试集证明公开只读操作和普通已登记操作仍符合各保护模式的预期，避免通过扩大拒绝范围制造假通过。
5. 验收时应核对 M5 PR #47、相关 M0/M1/M9 候选的精确 head CI，以及对应路径/hash 证据；Issue #48/#49 的关闭仅覆盖各自有限范围。该类 CI/path/hash 证据不代表真实 M1+M5 宿主接线或真实副作用；M3/M5/M6/M7 package manifest 组合仍单独跟踪，M5 fixture 仅是本模块测试证据。

历史摘要（此前 head 与状态记录，已由本文开头的 2026-10-15 当前快照取代）：当时 PR #47 为 OPEN/Draft，base SHA 62496d4020bd90ba2eede49b2e80a2bbebb036b4，head 5fd4707746186c4752e3a166e59a7292f112ff63，其当时 head CI run 38561283918 为 9/9 success。Issue #46 当时 OPEN，Issue #48/#49 当时 CLOSED；当时 M0 PR #30 和 M9 PR #36 仍为 OPEN/Draft，其当时精确 head CI 及路径/hash 证据已通过。Issue #48/#49 的关闭不表示真实 M1+M5 宿主接线、真实副作用或 E4 已验证。该历史记录只描述当时的报告更新；当前状态以开头快照为准。

## 2026-10-15 Issue #52 M5 文件操作边界（本地候选）

- 修复代码提交为 `06fdbb060574e96e5d1eba5c77721014e0a81a3b`，父提交是 PR #47 head `b6a40b49f132decba97d269ff942d868fcef928f`。修改前的临时复现使用 workspace 内 `public.txt` 和 workspace 外的合成哨兵文件：在 `verifyRealPaths: true` 检查通过后，path-based `executeRealTool` 回调替换该路径为哨兵的硬链接并读回 `SYNTHETIC_OUTSIDE_SENTINEL`，证明路径复查与 callback 重开之间存在 TOCTOU；这是合成 callback 证据，不证明生产 host 暴露。
- M5 无法从通用 `executeRealTool(ToolCall)` 类型识别或证明 M2→M1 held-fd dispatch。因此 `verifyRealPaths: true` 现将 symlink/junction/hardlink alias 拒绝，并在审批/回调前拒绝全部 file-read/file-write/delete（`DENY / path_execution_not_pinned`）。`verifyRealPaths: false` 保留旧词法兼容行为，但不是文件系统安全保护。没有修改 M0 canonical contract、M1/M2/M9 代码或猜测新增 capability API。
- **组合影响**：任何 M9/M2 组合若将文件调用送入 M5 且启用 `verifyRealPaths: true`，包括可能安全的 M2→M1 held-fd adapter，当前都会被拒绝；M5 无法识别该 adapter 的稳定身份绑定。HTTPS GET 非文件正向路径仍可运行。恢复文件操作需由 M0 维护的共享契约明确 M1 Gateway 身份绑定，并由 M0/M1/M5 协调 M5 如何仅路由到这条受证明的入口。
- 定向 `test/risk-policy.test.ts` 与 `test/security-router.test.ts`：50/50；新增覆盖 OBSERVE 硬链接别名、read/write/delete 两种 M5 Router 均零 callback / fixture 不变、无审批，以及 HTTPS GET 正向控制。`npm run build` 通过，`git diff --check` 通过。
- 这些本地 fixture 不证明真实 M1+M5 host wiring、M2 adapter 在产品 host 中实际使用 held fd、生产文件副作用或 P0 产品暴露已修复；上述仍为 **NOT_VERIFIED**。此节记录本地候选，需检查其具体 commit 和新 head CI 后才可作为 PR head 证据。

## 2026-10-21 Issue #56 / #52 owner 与接口复核

本节更新 PR #47 的当前 M5 证据，并覆盖上文较早的 PR/CI 状态快照。复核时本地与远端 `feature/ac3-policy-audit` 均为 `bc6c40905c67f51c96fdce132500497894a52f2a`，PR #47 base 为 `feature/agent-canary-3.0`。本节新增的是本地 M5 报告，不代表该报告已进入远端 PR 或其 CI。

### Issue #56 路径清单与归属

| 路径 | PR #47 / owner 处置 | M5 边界与下一步 |
|---|---|---|
| `src/security-router.ts` | M1 在 PR #43 的 canonical shared source；M1 明确不批准 PR #47 的共享路径例外。M1 确认当前 PR #47 集成路由可由 M5 policy-level hard gate 拒绝文件操作，但 M1 router-local gate 对 M1 独立分支仍必需。 | 不改 M1 文件。M1 canonical 实现进入 PR #47 的目标基线/集成树后，协调删除 PR #47 的重复 M1 改动；不可直接恢复旧 base 内容而丢失已验证拒绝路径。 |
| `test/security-router.test.ts` | M1 canonical router contract test；无 M5 例外。 | router contract 留在 PR #43。OBSERVE、alias、策略 recheck 的 policy-specific 覆盖留在 M5 `test/risk-policy.test.ts`，保持 DENY、approval=0、callback=0 和合成 marker/hash 不变。 |
| `test/agent-hook.test.ts` | M1 canonical Hook test；无 M5 例外。 | Hook/process interruption 测试留在 PR #43；PR #47 不保留重复副本。此子进程夹具不能证明 native host callback count。 |
| `src/agent-hook.ts`、`security-lab/claude-native-hook.mjs`、`test/file-state-store.test.ts` | 三条路径同时出现在 PR #43 与 PR #47 的 changed-file inventory 中；Issue #56 对这三条尚无逐路径 owner disposition。按 M1 review-gated shared paths 处理，不推定为 M5 可自由修改。 | 暂不编辑。M1 需逐路径确认 canonical 实现/是否有 PR #47 例外，再由 M0 协调保留、迁移或删除重复改动。 |
| `package.json` | PR #47 的共享 manifest 路径；字段组合由 M0 协调各模块 owner。 | 本次不改。任何字段合并须先由 M0 确认字段 owner、冲突结果和组合验证。 |
| `docs/SECURITY_ROUTER_2.md` | PR #47 有改动；PR #43 changed-file inventory 不含此文件，Issue #56 未记录该文档的 owner 裁定。 | 本次不改；如需保留或移除其改动，先由 M0 指定文档 owner 并确认与 canonical API contract 的关系。 |
| `src/risk-policy.ts`、`src/policy-management.ts`、`test/risk-policy.test.ts`、`test/policy-management.test.ts` | M5 自有策略与测试路径。 | 保留策略 hard deny、M5 OBSERVE 语义和 Gateway-final-denial 回归；不得通过共享 router/Hooks 测试替代 policy-level 测试。 |
| `POLICY_AUDIT_REPORT.md`、`docs/RISK_POLICY.md`、其他 M5 交付报告与 `test/false-positive.test.ts` | M5 交付路径。 | 当前 owner/interface 说明放在本报告；不复制或修改 M0 canonical `docs/3.0/API_CONTRACTS.md`。 |

PR #47 当前 changed-file inventory 仍包含以上 M1 明确 canonical 的三个路径及另外三条 PR #43 overlap 路径。M5 不会在本分支擅自改写或删除这些 shared paths。完成清理的前置条件是 M1 对逐路径实现给出 canonical disposition，并由 M0 确认 PR #43 的内容如何进入 PR #47 的 base/integration tree；之后 PR #47 去除重复的 M1-owned hunks，M1 canonical files 保持原样。

### 兼容适配方案与跨模块验收条件（提案，未获接口批准）

当前通用 `executeRealTool(ToolCall)` 只带可变路径参数，不能证明后续 callback 打开的文件身份就是 `verifyRealPaths` 检查的对象。`verifyRealPaths: true` 下 `path_execution_not_pinned` 是 `nonOverridableDeny`；M5 保持所有 path-based file-read/write/delete 在 callback 前拒绝。不得用 `OBSERVE`、调用者提供的路径、布尔 flag 或 M5 日志替代稳定的文件身份绑定。`verifyRealPaths: false` 仅保留旧词法兼容行为，不具有真实路径/受保护打开保证。

建议的兼容迁移顺序如下；这只是 M5 提案，本轮没有修改共享类型、Gateway、Hook 或 host adapter：

1. **M0（canonical contract owner）**定义版本化的文件执行能力契约：由可信宿主生成的不透明、不可由模型伪造的 capability/handle；明确 read/write/delete 操作、资源身份绑定、请求关联字段、失效/重放规则、DENY 与 execution result 语义。保持原有 path-only callback 为 legacy 入口并标明不满足受保护文件执行验收。
2. **M1（Gateway owner）**在最终授权后创建或消费该 capability，并保证实际 I/O 绑定到被验证的文件身份；路径变化、身份不匹配、能力缺失或过期都必须在副作用前 DENY。PR #43 的 router-local hard gate 与最终授权不能被 M5 ALLOW 绕过。
3. **M5（policy adapter owner）**只在 M0/M1 接口经 owner review 后实现最小 adapter：保留 M5 确定性策略与 `nonOverridableDeny`，仅将 Gateway 颁发且与此次调用绑定的能力转交给受信执行入口；不能回落到 path-only callback。接口缺失/验证失败仍 fail closed。M5 继续在 `test/risk-policy.test.ts` 覆盖 OBSERVE 不豁免、别名拒绝、callback 前 recheck 和审计结果一致性。
4. **M2（产品 host/adapter owner，待其确认）**证明受支持产品构建中的真实调用点消费该能力并走 M1 Gateway；合成 callback 或测试 adapter 不满足该项。

跨模块变更只有在各 owner 确认对应项后才可开始。验收至少需要：M0 contract/type conformance；M1 对 alias、junction、路径替换/reopen 竞态的拒绝和绑定执行证据；M5 ALLOW 不覆盖最终 Gateway DENY 且失败不误记为执行成功；M2 first-party host callsite 的受支持构建集成；正向安全文件读取控制；拒绝前 approval/callback 为 0、拒绝后 synthetic marker/hash 不变；目标平台 exact-head CI 通过。受保护打开的具体 OS 原语由 M1 根据目标平台设计并由 M2 在产品 host 证明，M5 不在此指定未经审查的平台 API。

### Issue #52 当前 M5 证据与限制

- PR #47 exact head `bc6c40905c67f51c96fdce132500497894a52f2a` 的本地 M5 命令 `node --import tsx --test test/risk-policy.test.ts test/policy-management.test.ts` 为 49/49；`npm run build` 通过。该证据适用于此已推送 head，不代表本节未推送的报告提交。
- Exact-head CI run `39497372437` 的本次读取为 7 项通过（Ubuntu Node 20/22、Windows Node 20/22、macOS Node 22、`docker-build`、`sponsor-smoke`）、1 项待完成（macOS Node 20）。CI 尚未全绿，不能标为最终完成。
- sensitive alias、workspace-to-outside junction、hard-link alias、path recheck 测试使用 synthetic fixtures/callbacks；断言相应拒绝发生在 callback 前，approval/callback 不启动，且 synthetic marker/hash 未变。它们不证明 first-party host 已接入 M1 Gateway、实际消费已绑定文件身份或生产文件副作用受到保护。
- 因此 Issue #52 仍为 OPEN/P0/NOT_VERIFIED；真实 host callsite、protected-open/handle 证据和生产 TOCTOU 边界均待 M2/M1 owner 验收。没有真实暴露结论。

## 2026-10-22 当前 M1/M5/M2 能力接线复核

本节以当前本地 M5 HEAD `e6bb5cfaf5e3a55497ab300da3bf14bbb4b4b3d2`、M1 PR #43 HEAD `c67b15f76973a2333ce523dd58d5b7439ab40702`、M2 PR #37 HEAD `099ad64e4a09330920cbd40847adec3fe631e91e` 为准；PR #43 和 #37 当前均为 OPEN/Draft。它补充并更正上文较早的“尚无 M1 capability / 所有 strict file-read 均拒绝”描述：当前 M5 源码已有可选 capability provider seam，但实际产品接线仍未验证。

- **M1 contract/source**：`agents/M1/docs/3.0/M1/GATEWAY_API_CONTRACT.md` 与 `src/runtime/gateway.ts` 定义不透明 `GatewayFileReadCapability`：可信宿主可用 `bindFileReadCapability` 为安全、已注册的 M5 read 绑定签发能力；`verifyFileReadCapability` 复核绑定及 held resource；`readFileWithCapability` 只能按能力绑定的相对路径调用 M1 `agent.dispatch`。M1 源码从已持有 descriptor 读，并在读取后重查路径/held identity；契约明确不声称 OS-wide 原子事务。
- **M5 自有核心**：`TrustedFileReadCapabilityProvider.resolve/verify` 是宿主注入 seam。`verifyRealPaths: true` 下，file-read 没有经 provider 验证的能力会以 `DENY / path_execution_not_pinned` 终止；M5 在初始分类、审批前重查、执行前重查和注册 callback 边界重验，且把同一 opaque value 放进 `RiskPolicyExecutionContext.fileReadCapability`。file-write/delete 仍 hard-deny。OBSERVE 不能覆盖越界、alias、敏感读取、未注册工具或缺失/无效能力；拒绝路径不入审批队列、不启动工具执行 callback。此 API 只传递能力，不会自动替任意宿主 callback 执行文件读取；宿主必须消费该能力并走 M1 `readFileWithCapability`，不能重开模型给出的路径。
- **本次 M5 最小修复**：此前 `dispatch()` 在确定性 `DENY` 后仍调用可选 `reviewDecision` 扩展，尽管随后不会创建审批或启动工具执行 callback。这使 hard-deny 请求仍能进入非必要复核副作用。现在仅对非 DENY 决策调用 review hook；新增回归断言 OBSERVE 敏感路径硬拒绝时 review=0、pending approval=0、execute callback=0。
- **M2 接线范围区分**：PR #37 的独立 `src/security-router.ts` 第 58 行创建自己的 Router executor wrapper，第 63 行调用 `options.executeRealTool(call,{signal})`；该 standalone API 没有 M1 capability provider/execution context，因此不能单独作为 strict capability read 的集成证据。M2 另有 `execution-isolation/gateway-adapter/gateway-adapter.mjs` 的 `createSecurityGatewayHostAdapter()`：它在 326–328 行把 `adapter.executeRealTool` 和 `adapter.fileReadCapability` 注入传入的 M5 Router factory；配套 `security-gateway-adapter.mjs` 第 228–253 行校验 M5 context 中的 capability 并调用 M1 `readFileWithCapability`。不能把 standalone Router 与这个 host-adapter seam 混为同一接线路径。
- **M9 exact-source composition evidence**：M9 candidate `18b60684c7d59dd70c80fc299c346c6b449a0dbe` 的 `test/m9-cross-module-composition.test.mjs` 使用精确 M1/M2/M5 pins，通过 M2 `createSecurityGatewayHostAdapter()` 注入 M5 Router。测试代码中的正向固定文件读取结果来自 M1 Gateway，并断言 M1 evidence 增长；敏感/alias 请求在额外 M5-to-M2 callback 和 M1 read evidence 前拒绝，审批队列为空、fixture hashes 不变。此结果支持 M5 context 与该 M2 adapter seam 的合成兼容性，不支持 standalone M2 Router，也不是 first-party product host 或 OS-atomic TOCTOU 证明。

**剩余集成验收条件**：保留 M5 provider 对 capability 缺失、错误、过期和映射不符时的 hard DENY；在 M9 exact-source test 与 hosted exact-head checks 上继续核对 M1 capability 真正到达 `readFileWithCapability`、拒绝分支不触发工具 callback、正向控制只读已绑定资源。产品 first-party host 是否实际调用该 adapter 仍须单独证明。Issue #52 维持 OPEN/P0/NOT_VERIFIED；M9 合成 API 组合、M1 held-descriptor 和 synthetic junction 测试均不等同于 first-party host 或 OS-atomic 证明。
