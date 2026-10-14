# 稳定性与恢复报告（M7）

日期：2026-10-13
结论：**24 小时与 7 天测试均未运行；当前只能报告短时回归和 Soak 工具冒烟结果。**

## 执行记录

- `npm run verify`：334 项，329 通过、0 失败、5 跳过；构建及 90 文件包检查通过。
- 上一轮 `npm run test:reliability`：36 项，34 通过、0 失败、2 跳过。
- 本轮 Windows 本机 `npm run test:reliability`：43 项，40 通过、0 失败、3 跳过；跳过的是符号链接权限相关用例。`git diff --check` 通过。
- `npm audit --audit-level=high`：0 vulnerabilities。
- Soak 记录器冒烟：10.813 秒、11 个采样、110 次合成 Gateway 调用成功、0 错误，状态 `COMPLETED_WITHOUT_HARNESS_ERRORS`。记录见 [`run-state.json`](security-lab/evidence/m7-soak-2026-10-13T08-53-02.565Z-7f39c757-64d4-4782-9ecb-87923db01570/run-state.json)。该结果**不是** 24 小时或 7 天测试。
- M0 恢复了本地 M7 开发槽；本轮没有申请或占用互斥测试资源。先前快照记录的共享 Windows VM 停在 OOBE，但本轮未核验 VM 当前状态。没有执行 GUI 进程崩溃恢复、安装/卸载循环或长时 VM 观察。

## 处理和回归覆盖

| 风险 | 本轮检查/变更 | 证据边界 |
|---|---|---|
| Gateway 并发关闭与隔离 | 当前 M7 候选的 `close()` 只设置 `closed`、等待队列、随后清理 pending 并顺序关闭资源；它没有共享 close Promise、同步清 pending 或隔离并脱敏资源关闭错误。Guard quarantine 也没有接入活动 Controller 取消 | 当前候选不满足 M1 Issue #28 close/quarantine 契约；M1 owner handoff 必须先整合。M7 定向测试只覆盖队列限额与 drain，不证明并发/重入共享 Promise、quarantine 取消或关闭错误收敛 |
| 自动验收锁在崩溃后残留 | 锁记录 schema、run ID、PID；只有确认 PID 不存在才回收。旧格式、损坏或仍有活动 PID 的锁失败关闭 | 合成死亡 PID 测试；未在真实 VM 杀进程观察 |
| 会话状态 JSON 损坏 | 备份损坏字节到 `.corrupt.*.bak`，原子创建新 session；符号链接/非普通文件仍拒绝 | 回归测试验证原字节保留及新状态可读 |
| 日志/证据损坏 | Gateway 证据 JSONL 写入后校验哈希链；篡改已落盘事件会令链验证失败 | 本地临时文件测试；未通过真实磁盘故障破坏日志 |
| 磁盘空间不足 | 对原子文件写入注入 `ENOSPC`，确认旧指针完整且临时文件清理 | 合成错误注入；未把实际磁盘写满，避免破坏环境 |
| 配置异常 | 状态文件格式/大小/sessionId 错误会恢复并保留原件；Worker 对不安全文件失败关闭；已有配置测试覆盖非法应用配置 | 未运行 GUI 配置损坏场景；E4 配置坏值仍应报告失败，不做静默默认修复 |
| 报告指针损坏/危险路径 | report ID 必须是 UUID；报告文件与 latest 指针原子发布 | 单元测试；没有测试真实用户配置目录上的并发进程 |
| NSIS 安装目录清理 | 回滚和卸载在非递归删除前将当前目录切换到 `$TEMP`；卸载检查清单删除错误，失败时保留重试入口 | 渲染模板结构回归；未运行 NSIS 编译或真实安装/卸载 |
| 进程异常退出与自动恢复 | Gateway 拒绝关闭后的新派发；Auto E4 会回收经 PID 确认的陈旧锁 | Community 桌面 UI 是用户启动的桌面程序，没有 Windows 服务/自动启动恢复。本轮未配置服务或系统安全项；完整 GUI 崩溃后需要用户重新启动应用 |
| 并发与资源泄漏 | 基准每轮 16 个调用方、每轮关闭 Gateway；三轮完成 3,000 次，无 dispatch 错误，资源类别计数稳定 | 合成进程内回调；短测不能证明长期无泄漏，资源类别也不是 Windows Handle 数 |

## Issue #28：M1 Gateway close/quarantine 契约（2026-10-14）

M7 当前候选 HEAD `5c7d95d` 虽在历史上包含 M1 handoff `738a783`，该 M1 提交只修改 `SECURITY_REGRESSION_RESULTS.md`，没有带入 Gateway 实现或回归测试。当前 `src/runtime/gateway.ts` 的 `close()` 仍是单个异步函数：它在等待 `history.tail` 后才清空 pending，没有记住并返回同一个 Promise；资源关闭的首个异常会中断循环并直接暴露底层错误。当前 Gateway 也没有监听 Guard quarantine 来取消活动回调。

M7 提交 `f17b7e6` 明确将 close 生命周期交由 M1；因此本报告不在 M7 越权修改 Gateway 核心。Issue #28 的验收顺序仍需由 M1 实现并由集成候选验证：同步 latch `closed` 并清空 pending → 发布共享 close Promise → abort 活动 Controller → 安全退订 quarantine observer → drain 队列 → 尝试关闭全部资源 → 只暴露固定脱敏错误；并发与回入调用必须共享 Promise。M7 本分支不能被标为满足该契约，合入 M1 owner 实现和 combined CI 前保持集成阻断。

### 本候选定向验证

- Node `v22.23.1`：`npm run test:reliability` 为 46 项，43 通过、0 失败、3 跳过；跳过项为当前 Windows 环境不假定符号链接权限的测试。
- Node `v22.23.1`：`node --import tsx --test test/gateway.test.ts test/containment.test.ts` 为 40 项，40 通过、0 失败、0 跳过。这些结果确认现有 Gateway 与隔离回归通过，但它们不包含 M1 handoff 中的 close Promise 身份/回入、同步 pending 清理、quarantine 退订和逐资源脱敏关闭错误测试。
- M1 handoff `738a783` 记录其自身 owner 候选中 Gateway/containment 定向测试为 51 通过、0 失败、0 跳过；这不是 M7 当前树或 M7+M1 组合候选的验证结果。

## 24 小时 / 7 天可复现命令

脚本每个采样周期创建 Gateway、执行可配置的只读合成请求、关闭 Gateway，并将 JSONL 样本 `fsync`；`run-state.json` 每周期原子更新。默认每分钟 100 次、并发 16，记录延迟、吞吐、CPU 时间、RSS/Heap、Node 活动资源类别、可用磁盘空间、错误数和证据链有效性。输出位于 `security-lab/evidence/m7-soak-*`，中断时保留部分记录并标为 `INTERRUPTED`。

```sh
npm run soak:24h
npm run soak:7d
```

应在 M0 协调的可丢弃 Windows VM 或专用测试机执行；不要在真实用户安装目录跑安装/卸载循环。完成状态要求实际运行时间达到完整请求时长且合成请求无错误。即使完成，也仅证明报告中的合成路径在对应主机上持续运行；不代表 GUI、模型、网络、安装/升级/卸载或所有 Windows 配置均稳定。突然断电会留下最后一次已落盘的 `RUNNING` 状态；当前脚本不跨进程续跑，应将这种记录标为不完整并另开新运行。

**运行状态：** 24h `NOT RUN`；7d `NOT RUN`。不得把 10.813 秒冒烟测试称为长稳测试。

## 2026-10-13 M7 本地续作

- 修复模板清理当前目录问题：[NSIS `RMDir` 文档](https://nsis.sourceforge.io/Reference/RMDir)说明当前工作目录由 `SetOutPath` 设置且不能被删除；安装过程将输出目录设为 `$INSTDIR`，回滚和卸载现在在清理前切换到 `$TEMP`。卸载清单删除或空目录删除报错时会报告失败并提前退出，避免继续删除卸载注册项。
- 新增故障注入：session 损坏备份 `EACCES`、恢复创建 `ENOSPC`、latest 指针替换 `ENOSPC`；验证原数据/旧指针保留、损坏备份不丢失且没有临时文件残留。
- 新增渲染模板路径穿越拒绝和清理顺序回归；worker 的临时 payload fixture 在每个测试后清理。
- 本轮仅运行本地定向测试。未运行 NSIS 编译、真实安装/卸载、VMware、真实模型或长时 Soak。符号链接权限测试有 3 项跳过，不能视为通过。
