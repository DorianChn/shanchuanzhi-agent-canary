# M5 策略与审计报告

**范围**：`feature/ac3-policy-audit` 上的确定性风险策略、项目策略管理、策略决策证据和 Canary Guard 接入。检查了 M0/M1 相关接口边界、`src/risk-policy.ts`、`src/containment.ts`、Hook、Gateway、现有证据/日志实现和对应测试。

## 结论

M5 增加了只能收紧策略的项目级规则、冲突预览、明确的放宽确认、追加式版本历史、托管策略路由及可校验的审计导出。未登记工具现在在 `OBSERVE`、`BALANCED`、`STRICT` 三种模式都直接拒绝。正常读取与审定开发命令保持可用；写入、构建等已知风险操作仍由宿主人工审批，不由模型批准。

默认模式仍为 BALANCED，Guard 隔离行为不变。默认策略没有降低。原有 Hook、Gateway 和 OSEP 证据协议没有被 M5 自动改写。M0 负责维护跨模块 canonical API contract；本报告只记录 M5 模块行为和证据，不替代该契约。M0/M1/M5/M9 已完成各自有限范围的契约、路径或 CI 核对，Issue #48 和 #49 已按各自有限范围关闭；这些证据不验证真实 M1+M5 宿主接线或真实副作用。

## 2026-10-15 当前状态快照

> 本节是 2026-10-15 更新后的当前状态，并优先于下方较早记录的 head、CI 和 PR 描述状态。下方保留的旧 SHA/run 及 2026-10-14/15 状态段属于此前核对的历史证据，不表示当前 head；Issue #46 的现状以本节为准。

- **M5 PR #47**：远端已推送报告 head 为 584f96cea8d96df46ebe63e3ab709a44981c78b1；该精确 head 的 CI run [38608355200](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38608355200) 为 9/9 通过。
- **M0 PR #30**：head SHA 63d10b86d6c8e2c3e66d2608a9222ddeb728f594 的产品 CI 为 9/9，ownership 检查为 1/1（产品 run 38608350412；ownership run 38608350594）。
- **Issue #46**：仍为 OPEN，等待 M0 更新，并读回 PR #47 描述及相关新 head CI。**Issue #48** 已 CLOSED，仅记录 OBSERVE hard-deny 的有限范围精确 head CI 证据；**Issue #49** 已 CLOSED，仅记录 canonical 根契约与 M1 契约的有限路径/hash 核对。关闭不扩展为更广的集成验收。
- **M9 PR #36**：远端 head SHA ed0dd015a6e46029d1df4ac077a6e9378fb1a494 是相对 AC3 base 含 137 个变更路径的多模块集成候选，包含 Gateway、policy、onboarding、execution-isolation、desktop、E4 verifier、reliability、package、tests 与 docs。该 exact head 的 product CI run 38604703774 为 9/9，wrapper run 38604703745 为 2/2。该结果确认这些检查在此 head 上通过；仍不证明 native-host、clean-VM/installer、external E4 或真实工具副作用。
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

历史状态记录（此前核对的 M0 PR #30 head）：M0 通过 PR #30 维护跨模块 canonical API contract docs/3.0/API_CONTRACTS.md。该旧快照记录 head 39e2cc237e68e963955c07be3719a26afdd5981c 的 10/10 检查（含 ownership-contract-evidence）；它已由本报告开头的当前快照所列 M0 head 63d10b86d6c8e2c3e66d2608a9222ddeb728f594 及产品 9/9、ownership 1/1 取代。Issue #46 当前仍 OPEN，等待 M0 更新及 PR #47 描述和相关新 head CI 的读回，详见当前快照。M0 是 canonical 根契约的维护方；M5 不拥有、不修改，也不复制该 canonical 路径。M5 将未知工具映射为 DENY / unregistered_tool，并在 M5 审计事件中保留 UNKNOWN。M5 没有修改 M1 的 Hook、Gateway、Guard 或 runtime/evidence.ts；与 Gateway 组合时仍需把最终回调路由到 Gateway agent.dispatch。

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

历史观察：此前读取的远端 PR #47 描述最后更新于 2026-10-14 16:28 UTC，当时包含 M9 combined acceptance pending。该观察不证明当前 PR 描述仍是这一内容；按开头当前快照，Issue #46 仍等待 M0 更新及 PR #47 描述和相关新 head CI 的读回。Issue #48/#49 已按各自有限范围关闭；真实 M1+M5 宿主接线与真实副作用仍为 NOT_VERIFIED。

### P0 验收条件

1. `OBSERVE` 下，显式 `DENY`（包括未登记工具、越界路径、硬拒绝 Shell 和敏感外发）保持 `DENY`；每个拒绝在真实回调启动前发生，回调计数为 0。
2. 标记 `SENSITIVE_DATA` 的 `.env` 路径读取、宿主登记的 `sensitive-read` 操作和包含敏感标记的外发均在 `OBSERVE` 下拒绝；不创建待审批请求、不执行 callback、不把参数写入策略日志。
3. Guard 已隔离时 `OBSERVE` 不能恢复或绕过隔离；后续真实回调计数为 0。
4. 同一测试集证明公开只读操作和普通已登记操作仍符合各保护模式的预期，避免通过扩大拒绝范围制造假通过。
5. 验收时应核对 M5 PR #47、相关 M0/M1/M9 候选的精确 head CI，以及对应路径/hash 证据；Issue #48/#49 的关闭仅覆盖各自有限范围。该类 CI/path/hash 证据不代表真实 M1+M5 宿主接线或真实副作用；M3/M5/M6/M7 package manifest 组合仍单独跟踪，M5 fixture 仅是本模块测试证据。

历史摘要（此前 head 与状态记录，已由本文开头的 2026-10-15 当前快照取代）：当时 PR #47 为 OPEN/Draft，base SHA 62496d4020bd90ba2eede49b2e80a2bbebb036b4，head 5fd4707746186c4752e3a166e59a7292f112ff63，其当时 head CI run 38561283918 为 9/9 success。Issue #46 当时 OPEN，Issue #48/#49 当时 CLOSED；当时 M0 PR #30 和 M9 PR #36 仍为 OPEN/Draft，其当时精确 head CI 及路径/hash 证据已通过。Issue #48/#49 的关闭不表示真实 M1+M5 宿主接线、真实副作用或 E4 已验证。该历史记录只描述当时的报告更新；当前状态以开头快照为准。
