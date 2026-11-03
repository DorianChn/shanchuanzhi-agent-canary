# Agent Canary 3.0 产品安全验收

日期：2026-10-12。核心修复 SHA：`9007e3a9fa6def487416e1dbb183143829b44aca`。历史冻结运行时 `99660b36db9d5b1121eea6fe06b026c5f1e36bcf` 保留；本轮确实修改网关检查，不能把历史实验重新标为新代码结果。独立分支 `fix/shanchuanzhi-3.0-product-acceptance`，不合并 main、PR24，不发送邮件，不发布稳定 npm/Docker。

## 判定

READY_WITH_LIMITATIONS：限受控SDK、正向清单Community与本机Windows/WSL用户流程。正式稳定发行 NOT_READY；全原生宿主覆盖 NOT_VERIFIED；E4 NOT_VERIFIED。

主线 feature/agent-canary-3.0、PR24及旧candidate1/2/3保留。修复工作分支 fix/shanchuanzhi-3.0-product-acceptance；新Draft PR依赖现有安装器分支。candidate4必须新Tag和新附件，不能静默替换旧资产。

核心修复及模型证据9007e3a；包装/安装器/材料提交另行记录。实际构建后在PACKAGE_RELEASE_VERIFICATION.json填准确资产摘要、公开下载、CI，不把待办写成通过。

发布阻塞：普通npm/Docker商业边界、完整原生宿主Hook故障保证、干净WindowsVM、安全代码签名与广泛平台组合。候选版允许明确披露这些限制，不提升为stable，不寄新邮件。

## 公开发行最终收据

新预发布 [candidate.4](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0-competition-candidate.4)，7个初始附件HTTP200且摘要一致。Windows公开ZIP新目录9步通过、Community100项通过；Ubuntu公开ZIP安装、类型消费、自检、正常/拒绝副作用和两轮卸载PASS。GUI安装器本机真实完整流程PASS，公开下载与所测EXE摘要一致。

Community源码48d5c440，包装725967fe，核心9007e3a，材料提交另行保存。核心CI9/9、包装2/2通过（链接见 product-acceptance-evidence/FINAL_PUBLIC_ACCEPTANCE.json），首次并发状态CI重试耗尽失败记录保留，未删测试或修改安全策略。并发测试在负载下的时序敏感性仍是P2测试稳定性风险。

正式商业npm/Docker稳定发行仍NOT_READY。免费Community范围内READY_WITH_LIMITATIONS。邮件没有重复发送，报名/组委会关联本轮未核实，不能宣称已正式补交。

## 2026-10-12 发行状态增补

复现的 EFS 卸载缺陷已在 `afe5f92cd888a64208a9cc2768caed89a904551a` 的安装器源码中修复，并在本机未签名诊断 EXE 上完成两轮当前用户 GUI 生命周期。**公开 candidate.4 附件仍是旧哈希且仍有该卸载问题；没有构建/发布 candidate.5，也没有替换旧 Release。** 新诊断 EXE 使用 NSIS 3.10，故尚未满足正式发行流水线要求。

修复提交后的源码验收：`npm run verify` 为 312 pass / 0 fail / 5 skipped（317 总项）；`npm audit --audit-level=high` 0 vulnerabilities；Windows worker tests 18 pass / 0 fail / 1 skipped。Ubuntu 当前 WSL 因 Node 20/22 缺失，安装入口实际退出 1，记为 BLOCKED。PR #24 在推送前仍为 OPEN Draft；推送后 CI 状态需要从 GitHub Actions 实际读取，不能用本地结果替代。
