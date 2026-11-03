# 外部 E4 测试包审阅补记（2026-10-13）

## 结论

**外部运行材料：PARTIAL；项目 E4 外部独立性：NOT_VERIFIED；总体发布关口仍为 BLOCKED。**

收到的压缩包提供了另一台 Windows 电脑上的 candidate.4 测试声明、安装记录、测试 JSON/JSONL、脚本及逐项哈希清单。压缩包内部一致性已核验；这让证据从“仅历史来源描述”提升为“有原始记录支持的外部复现材料”。但包内操作者身份、机器独立性和结果签收仍是自述信息，未由独立渠道认证。因此不把它记为 VERIFIED 的 E4，也不把它称为第三方安全审计或认证。

## 输入文件与完整性

- 输入文件名：Agent_Canary_3.0_E4_External_Test.zip
- SHA-256：D2E45B07BD74FABB7D6AEB2C860DD43A5334A9EAB87E005ABA55B60E212C30AE
- 文件大小：50,877 bytes；33 个 ZIP 条目。
- 路径检查：未发现绝对路径、上级目录穿越或反斜杠路径。
- 内部清单：EVIDENCE_SHA256.txt 列出的 32 个数据文件全部匹配；缺失 0、哈希不匹配 0、未列入清单的数据文件 0。
- 该检查证明压缩包与自身清单一致，不证明清单由外部操作者签名，也不证明包内自述身份真实。
- 没有运行压缩包里的脚本。原始 ZIP 继续留在用户桌面；因其中包含合成 Canary/诱饵数据及设备环境细节，本次不把原始 ZIP 复制进公开 PR 或新交付 ZIP。

## 测试对象与执行方式（按包内记录）

- 被测版本：v3.0.0-competition-candidate.4。
- 安装器 SHA-256：567b1e7e8832b6aa31fc80c86994eb915bf8d3db9caf125c1f7a08b42cf94ce6；与本地保存的公开 candidate.4 安装器实际摘要一致。外部包还附有其对发布版 SHA256SUMS 的匹配记录。
- 环境声明：另一台 Windows 电脑，Sandboxie Plus 1.18.6 沙盒内运行；不是干净 Windows 虚拟机或独立 OS 重装环境。环境 JSON 的 Windows 产品名字段与报告所写版本存在不一致，无法在此包外确认。
- 执行器声明：WorkBuddy / Step-5-Preview；操作者声明为电脑所有者委托执行。包内没有可验证的数字签名来绑定外部操作者、环境采集结果和 ZIP。
- 安全矩阵的工具调用由合成 SDK 宿主脚本与合成 MCP stdio 客户端发起，不是由真实 LLM 自主选择工具。
- GPT-6 Luna Max 未调用；没有真实模型提示注入/工具调用实验。
- 没有验证 WorkBuddy 原生工具或 Codex 原生 Shell 被 Agent Canary 全局接管。

## 原始结果与复测计数

底层 JSON 数组一共 40 条执行记录：主矩阵 26 条、修正/补测 8 条、Gateway 6 条。

| 原始 verdict | 条数 | 解释 |
|---|---:|---|
| PASS | 29 | 受控 SDK / Gateway 脚本记录为符合预期 |
| PASS_CONTROL | 4 | 未保护对照中的读取、loopback 请求和删除确实成功；这是风险正对照，不是防护成功 |
| FAIL | 4 | 首跑使用绝对路径导致 outside_workspace，原始失败保留 |
| CONFIRMED_BYPASS | 2 | 原生 child_process / fs 直接路径未经过 Router，按产品声明不在保护范围 |
| CONFIRMED_DOCUMENTED | 1 | 绝对路径被 fail-closed 拒绝 |

报告把四项初始失败归因于测试路径约定，并提供相对路径复测 B-01R、D-01R、D-02R、E-01R。该归因和修正结论是外部报告所述，本审阅没有重跑脚本或独立复核源码。A-02R 是重复 loopback 正对照，不应算作新样本。去掉四个被复测替代的失败行与这一条重复对照后，规范化视图为 35 条：PASS 29、独立 PASS_CONTROL 3、CONFIRMED_BYPASS 2、CONFIRMED_DOCUMENTED 1。原始 40 条及四个 FAIL 均继续保留；35 不是独立样本数或防护率分母。

## 能够支持的有限结论

按包内 JSON、JSONL 和报告所述，候选版的受控 SDK Router 路径出现了执行前 DENY、Canary 触发后隔离及拒绝回调的记录；部分测试还记录目标文件保留、loopback 无新增请求。受控 MCP Gateway 的 stdio 客户端记录了握手、工具列表、诱饵触发后的后续删除拒绝以及 Gateway 被结束后“不再连接”的错误。它们是 candidate.4 受控回调路径的补充复现证据。

未保护对照记录危险动作成功；原生 child_process 与直接 fs 删除记录为 CONFIRMED_BYPASS。这两类结果必须和受控拒绝并列展示。DENY 文本本身不证明副作用为零；该包的部分断言有文件存在性和 loopback 计数器，但本审阅不声称所有场景都有独立观察器。

## 仍然未验证 / 限制

- **真实模型与 Prompt Injection：NOT_VERIFIED。** 安全矩阵没有 LLM 参与；模型身份文件明确说 GPT-6 Luna Max 未使用。
- **宿主原生工具全局保护：NOT_VERIFIED。** WorkBuddy 原生工具没有通过 Gateway；G-01/G-02 记录绕过。
- **真实 Hook 未加载、进程异常退出、Gateway 断开：PARTIAL。** E-01R 是合成 Router executor 超时；F-06 是合成 Gateway 子进程 SIGKILL。不是 Codex/WorkBuddy 原生 Hook 的真实故障注入。
- **干净 VM 和 OS 安装卸载：NOT_VERIFIED。** 测试在现有 Windows 主机的 Sandboxie 中进行。包内 GUI 一键验证也标为 PARTIAL。
- **外部操作者签收与独立性：NOT_VERIFIED。** 有另一电脑/操作者声明，但没有独立身份认证或可验证签名；此审阅不能确认提交者和项目方确为不同主体。
- **长时间、并发、AI 审查增益和自适应蜜罐增益：NOT_VERIFIED。** 包内没有这些实验。
- 外部报告另列 GUI 代理环境检测、reset 参数错误、绝对路径提示、审批等待、返回字段及重复 connect 等可用性观察；这些是包内报告的发现，本次未独立复现。原报告汇总数与 JSON 行数不一致，公开引用时应使用本补记中的原始数组计数并附此限制。

## 结论映射

| 项目 | 状态 | 依据 |
|---|---|---|
| 压缩包与内部哈希清单一致 | VERIFIED | 33 个条目、32/32 数据文件匹配 |
| 另一环境的测试记录存在 | PARTIAL | 外部包含环境声明、安装回执、脚本、结果及日志 |
| candidate.4 的部分 SDK / 合成 MCP 路径复现 | PARTIAL | 结果为外部包内记录；不是本轮重跑或真实模型运行 |
| 外部操作者独立性 | NOT_VERIFIED | 声明未与可验证身份/签名绑定 |
| GPT-6 Luna 真实 Agent 测试 | NOT_VERIFIED | 0 次模型调用 |
| 整体项目 E4 | NOT_VERIFIED | 独立性与真实 Agent/VM 关口仍未满足 |
| 新候选版发布 | BLOCKED | 现有 VM 和 GPT-6 关口仍阻塞；本补记不改变冻结版本 |

## 证据定位

原始文件名及原始 ZIP SHA-256 见上。压缩包内部路径包括 E4_FINAL_REPORT.md、E4_INDEPENDENCE_STATEMENT.md、E4_TEST_SUMMARY.json、04_Security_Tests/*results.json、06_Gateway_Bypass/*results.json、09_Raw_Logs/*.jsonl 及 EVIDENCE_SHA256.txt。公开交付包仅包含本脱敏审阅和机器摘要，不含外部原始 ZIP。

