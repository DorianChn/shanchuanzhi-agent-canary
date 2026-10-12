# Agent Canary 3.0 产品安全验收

日期：2026-10-12。核心修复 SHA：`9007e3a9fa6def487416e1dbb183143829b44aca`。历史冻结运行时 `99660b36db9d5b1121eea6fe06b026c5f1e36bcf` 保留；本轮确实修改网关检查，不能把历史实验重新标为新代码结果。独立分支 `fix/shanchuanzhi-3.0-product-acceptance`，不合并 main、PR24，不发送邮件，不发布稳定 npm/Docker。

## 判定

READY_WITH_LIMITATIONS：限受控SDK、正向清单Community与本机Windows/WSL用户流程。正式稳定发行 NOT_READY；全原生宿主覆盖 NOT_VERIFIED；E4 NOT_VERIFIED。

主线 feature/agent-canary-3.0、PR24及旧candidate1/2/3保留。修复工作分支 fix/shanchuanzhi-3.0-product-acceptance；新Draft PR依赖现有安装器分支。candidate4必须新Tag和新附件，不能静默替换旧资产。

核心修复及模型证据9007e3a；包装/安装器/材料提交另行记录。实际构建后在PACKAGE_RELEASE_VERIFICATION.json填准确资产摘要、公开下载、CI，不把待办写成通过。

发布阻塞：普通npm/Docker商业边界、完整原生宿主Hook故障保证、干净WindowsVM、安全代码签名与广泛平台组合。候选版允许明确披露这些限制，不提升为stable，不寄新邮件。
