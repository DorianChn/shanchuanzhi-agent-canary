# 正常开发任务误拦截报告

## 目标

验证默认 `BALANCED` 策略下，日常代码浏览、状态检查、构建和常见项目修改仍可完成；需要人工确认的操作不应在确认前执行。测试使用虚拟宿主 callback，不运行真实 Shell 或真实网络请求。

## 用例与结果

| 正常任务 | 预期 | 自动化结果 |
|---|---|---|
| 读取项目 `README.md` | `ALLOW` 并进入 callback | 通过 |
| `pwd`、`git status`、`git status --short`、`git diff`、`git diff --stat`、`ls`、`ls -la` | 精确审定的只读命令可执行 | 通过 |
| 对宿主 allowlist 中无 query/hash 的 HTTPS origin 发起 GET | 可执行只读请求 | 通过 |
| 写普通源文件 | `REQUIRE_CONFIRMATION`；批准前 callback 计数不变；一次人工批准后恰好执行一次 | 通过 |
| 运行 `npm run build` | `REQUIRE_CONFIRMATION`；同上 | 通过 |
| 读取工作区外文件 | `DENY`，不进入 callback | 通过 |
| 对文档站点 origin 发起 POST | 需要确认；不自动视为普通读取 | 通过 |
| Guard 已隔离时读取 README | Guard 拒绝，不能被策略模式覆盖 | 通过 |

对应测试：`test/false-positive.test.ts` 的四个正常任务用例、`test/risk-policy.test.ts` 中三种模式的只读与 Guard 测试、`test/policy-management.test.ts` 中项目策略人工审批用例。

## 判断

目前这些样本没有发现正常读取和已审定状态命令被误拒；常见写入与构建会被暂停等待人工确认，但不会在等待期间执行。按这个策略语义，审批提示不计为误拒。未知工具即使实际无害也会被拒绝，因为宿主未注册能力描述；应通过审阅并登记能力来解决，而不是让模型或 `OBSERVE` 模式代替注册。

## 限制

- 这是小规模合成用例，不是生产遥测，也不能据此给出统计误报率。
- `READ_COMMANDS` 是精确集合；未列入的 Shell 命令会要求确认。不能据此推断任意 `git` 命令、脚本或构建步骤只读。
- `OBSERVE` 会允许已知策略风险继续到宿主 callback，适合受控演练，不是减少误拦截的安全默认值；Canary Guard 与未登记工具拒绝仍有效。
- 文件路径策略不解析 symlink/realpath，也不替代宿主文件权限；HTTP origin allowlist 不替代宿主 DNS/IP/出口控制。测试未启动真实网络/文件执行器。
- Canary 事件可能由合法误操作触发；需要人工调查。不能用 AI 复核作为自动重置或放行依据。

测试命令与整体验证结果由 Draft PR 记录。
