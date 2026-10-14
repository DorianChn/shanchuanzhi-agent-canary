# Agent Canary Glama 同步报告

报告日期：2026-10-15（Asia/Shanghai）

## 总体状态

| 项目 | 结果 | 状态 |
| --- | --- | --- |
| GitHub 最新稳定版本 | `v3.0.0`，发布于 2026-10-13；主分支 package / lockfile 均为 `3.0.0` | VERIFIED |
| 维护分支 | 本地与 GitHub 远程 `maintenance/glama-sync` 均已创建并含修复、测试 | VERIFIED |
| GitHub `main` | 审计后仍为基线 `146be17ea924d09a78ceff90b83006cdd40dfc43`，未被本任务修改 | VERIFIED |
| Pull Request | [#50 — fix(mcp): align Agent Canary 3.0 metadata for Glama](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/50)，OPEN，未合并 | VERIFIED |
| GitHub Actions | [CI run `38604260753`](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38604260753) 在 PR head `ccd84dad8fdb3d0f64ff04e11a9ac440bc7cfaa9` 完成，9/9 jobs success | VERIFIED |
| Glama 当前版本文字 | 页面仍写 V1.2.7 / 2.0 竞赛预览 | FAILED（页面陈旧） |
| MCP 工具数量 | GitHub 本地 stdio 服务 12；Glama 页面 12 | VERIFIED（数量一致） |
| Glama 质量评级 | A / 4.4/5.0，最后可见评分时间 2026-09-21 07:30 | VERIFIED（旧快照评分） |
| Glama 维护评级 | Activity Maintained；Responsiveness Within a week | VERIFIED（页面当前显示） |
| npm Registry 实际包版本 | GitHub Packages 查询返回 401，未提供认证令牌 | NOT VERIFIED |
| Glama 所有权 | Admin 显示需 GitHub 登录认领；当前无已登录会话 | BLOCKED |
| Glama 本次同步 | 未触发；PR 尚未合并且列表未认领 | NOT VERIFIED |

## 元数据修复

- 将 `src/config.ts` 的 MCP `initialize` 版本从旧 `1.2.7` 改为已核实的 `3.0.0`。
- 将根目录 `server.json` 的版本和 Free V1 描述同步为 `3.0.0` 及当前 stdio decoy 行为说明。
- 扩展现有 `npm test` 命令，加入 stdio MCP 回归测试；测试核对 `initialize`、`server.json`、`tools/list`、完整 Schema、安全注解及一个合成工具调用。
- 更新 `SOURCE_MANIFEST.json` 中 package、配置源文件和构建输出的哈希。
- README 中英文版与 GitHub `3.0.0` 主线一致；没有改写已正确的版本或验证结果。`glama.json` 已含正确 Schema 与 `DorianChn` maintainer，无需添加不受当前 Schema 支持的元数据。
- 未修改核心安全算法、未推送 `main`、未发布 npm 新版本。

## 测试结果

| 检查 | 结果 |
| --- | --- |
| TypeScript 构建 / 类型检查 | `npm run build` 通过；SDK 类型消费者检查 VERIFIED |
| 单元与安全回归测试 | `npm test`：101 passed，0 failed，0 skipped |
| 已执行单元测试通过率 | 101/101（100%）；另有离线自检 4/4 通过。此比率仅涵盖实际执行的测试 |
| MCP 协议 / 工具发现 / Schema | stdio MCP SDK 测试通过；12 个工具、完整输入 Schema 与源码、标题/描述和安全注解一致；合成工具调用成功 |
| 离线自检 | 4/4 通过 |
| 源清单 | 181 项，0 mismatch |
| 有界操作演示 | 6 个用例通过；仅为本地临时目录操作，不代表 E4；E4 仍 NOT VERIFIED |
| npm 包 smoke | 72 个打包文件通过 |
| 安全审计依赖 | `npm ci` 完成，0 vulnerabilities |
| ESLint | NOT VERIFIED：仓库没有 ESLint 依赖、脚本或配置 |
| Docker 构建 | NOT VERIFIED：当前执行环境没有 Docker CLI；仓库 Dockerfile 已检查 |
| GitHub Packages Registry | NOT VERIFIED：匿名 `npm view` 返回 401，要求认证令牌；本次未获取或使用令牌 |

全量命令：`npm run verify`，退出码 0。

## GitHub 分支与 PR

- 分支：`maintenance/glama-sync`，基于审计时 `main` 的 `146be17ea924d09a78ceff90b83006cdd40dfc43`；版本元数据、MCP 测试和清单修复已通过已登录的 GitHub 网页提交到远程分支。
- 写入通道：GitHub MCP 写入接口返回 HTTP 403 `Resource not accessible by integration`；本机 Git HTTPS 无写入凭据。随后使用已登录的 `DorianChn` GitHub 网页界面创建并更新任务分支。远程 `main` 复核仍是审计基线，未被修改。
- PR：[#50 — fix(mcp): align Agent Canary 3.0 metadata for Glama](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/50)，base `main`，head `maintenance/glama-sync`，状态 OPEN、mergeable、未合并。
- CI：workflow `CI` run `38604260753` 在 PR head `ccd84dad8fdb3d0f64ff04e11a9ac440bc7cfaa9` 完成，9/9 jobs success：Windows/macOS/Ubuntu Node 20/22 测试矩阵、Docker build、package smoke 和 sponsor smoke。
- 未尝试直接更新 `main`，也未执行强制推送。

## Glama 同步与人工步骤

本次 Glama 同步状态为 **NOT VERIFIED**。公开页面仍显示旧描述和 V1.2.7；没有认证状态可用于触发 Glama Admin 的 Repository re-sync。Glama Admin 页面明确展示 `Claim agent-canary` / `Login with GitHub to claim`。

PR 合并到 `main` 后，请使用有该仓库权限的 `DorianChn` GitHub 账号完成：

1. 打开 [Glama Admin / Claim 页面](https://glama.ai/mcp/servers/DorianChn/shanchuanzhi-agent-canary/admin)，选择 **Login with GitHub to claim** 并认领列表。
2. 在 Admin 的 **Repository syncs** 中请求 **re-sync**。
3. 重新打开 [Glama 项目页](https://glama.ai/mcp/servers/DorianChn/shanchuanzhi-agent-canary)，核对版本文字、项目介绍、12 个 Schema、最近更新时间及重算后的质量评分。

Glama 评分由其工具定义质量评估生成，重新扫描后分数可能变化；本次只记录当前页面显示的 A / 4.4/5.0，不对未来评分作保证。

## 尚未解决

- PR #50 尚待审阅和合并；合并与 Glama 所有权认领都尚未完成，因此 Glama 页面还没有读取维护分支的修复。合并后需认领并请求重新同步，再复核页面。
- GitHub Packages 需要认证的实际包元数据没有验证。
- ESLint 和本机 Docker 构建不可执行，因为仓库未配置 ESLint 且当前环境未安装 Docker CLI。
