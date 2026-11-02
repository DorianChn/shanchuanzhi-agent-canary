# Independent E4 Operator Prompt (2026-10-25)

Copy the prompt below to an independent operator/reviewer who is not the Agent Canary author. The operator must use a clean disposable environment and retain sanitized evidence.

---

你是 Agent Canary 3.0 的独立 E4 操作员，不是本项目作者。请只使用隔离、可销毁的 Windows 测试环境和合成目标；不要读取生产数据、密钥、用户提示词或真实敏感文件。不要改 main、PR #24、全局 Hook/ACL/Windows 安全策略，也不要发布 Release。开始任何 VM、安装器或真实模型运行前，先确认 M0 #29 的独占资源已为你保留；没有预约就只做静态/本地自检并明确标为 BLOCKED。

## A. 单击运行作者自动检查

1. 从仓库取得 feature/ac3-m0-coordination 的一键测试入口（PR #119，固定 head 2aa129aaebc8acc154eb48d9b517ee634462bb2c），在 Windows 检出目录双击 scripts/一键E4自动测试.cmd。
2. 不要把该脚本的结果称为独立 E4。保存完整本机结果和 ONE_CLICK_RESULT.md；对每个失败/跳过按原样报告，不删除测试、不降低安全策略、不伪造成功。

## B. 独立产品产物核验（对应 Issue #57）

1. 从 GitHub Actions run 40109676133 下载 artifact 12566227087。记录实际下载者、机器/Windows build、Node 版本、下载时间和 artifact 文件名。
2. 本地重新计算外层 archive SHA-256，并与经 GitHub 核实的值 7413c68b8631921304188d52ac2e8385090241edb9a1f27b8f88c590085e2830 比对。不要把 README/报告自述当作独立验证。
3. 使用仓库 M6 文档 security-lab/e4/PRODUCT_SELF_CHECK.md 中的命令验证输入目录。固定期望值：
   - producer source commit e3d89ba12f210a10f1f4942e60019517d25cfb60
   - source tree 13f15b324d406778ace56bec3cbfadf772c8014d
   - installer SHA-256 6998e2eeaa08e4eb756e924e801963ef707a75142226cf14f3df893de5b57c2a
   - canonical Hook Git blob b7ed4aba70a597f4f63a05decc6de1b32f67372e
   - producer run/artifact IDs 40109676133 / 12566227087
4. 在全新的、空目录中写出 intake bundle；随后运行 verify-bundle.mjs、product-self-check-controls.mjs 和文档列出的只读测试。确认正向包通过、四种外部副本篡改（SHA256SUMS.txt、report.json、report.md、raw.log）均被拒绝、截断 ZIP 被拒绝，且原始 artifact 字节不变。
5. 上述成功仅证明 artifact/bundle 完整性。随后在获准的 disposable Windows 环境里按 #57 验收要求执行真实产品生命周期与合成工具调用：安装、启动、受保护目标允许/拒绝用例、Hook/Gateway 实际决策、卸载/重装；逐例保存工具决策、进程结果、目标操作前后 SHA-256 和清理结果。将模型拒绝与 Gateway 拒绝分开；单纯拒答不算策略阻断。不要因为其他 CI 通过而跳过任何独立步骤。
6. 由不同于操作员的 reviewer 对证据包做独立复核，并提供现有签收格式要求的签名收据及带外身份/密钥校验。不得代签、冒充 reviewer 或自行生成授权。

## 交付

- 报告精确命令、source commit/tree、artifact 下载名和 SHA-256、环境、操作员/复核角色、完整 PASS/FAIL/BLOCKED/NOT_TESTED 状态及证据文件 SHA-256。
- 只上传脱敏证据；删除提示词、凭据、个人路径和真实用户数据。不要覆盖任何已有报告或 handoff。
- 若遇到缺少的授权、资源、宿主能力或测试失败，停止相关步骤并写清阻塞条件和最小复现。保持 #57 OPEN / NOT_VERIFIED，直到所有验收证据和独立签收齐备。
