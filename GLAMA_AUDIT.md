# Agent Canary Glama 审计

审计日期：2026-10-15（Asia/Shanghai）

## 结论

GitHub 当前稳定版本已核实为 **3.0.0**。GitHub 主分支 `main` 的 `package.json` 和 `package-lock.json` 都是 `3.0.0`，最新正式 Release 是 `v3.0.0`（2026-10-13 发布，非 Draft、非 Pre-release）。主 README 与中文 README 已说明 3.0.0，无需再写入旧版说明。

Glama 页面目前仍显示 V1.2.7 / Agent Canary 2.0 竞赛预览等历史内容，和 GitHub 当前稳定版不一致。Glama 页面仍列出 **12 个工具**；当前仓库的 MCP 服务也定义 12 个 decoy 工具，数量一致。Glama 的质量评级为 **A / 4.4/5.0**，最后可见评分时间为 2026-09-21 07:30；维护状态显示 Activity Maintained、Responsiveness Within a week。

仓库原有 `src/config.ts` 和根目录 `server.json` 仍标记 `1.2.7`，因此 MCP `initialize` 响应也会报告 `1.2.7`。本维护分支已把这两处对齐到 `3.0.0`，并增加 stdio 协议、工具发现、完整工具 Schema 与安全标注回归测试。

修复已提交到独立远程分支 `maintenance/glama-sync`，且核对到 GitHub `main` 仍为审计基线提交 `146be17ea924d09a78ceff90b83006cdd40dfc43`。PR 尚未创建；修复尚未进入主分支，也没有触发 Glama 更新。PR 状态为 **NOT VERIFIED**，页面同步为 **NOT VERIFIED**。

## GitHub 版本与元数据

| 项目 | 核查结果 | 状态 |
| --- | --- | --- |
| 默认分支 | `main`，审计时 HEAD 为 `146be17ea924d09a78ceff90b83006cdd40dfc43` | VERIFIED |
| 最新正式 Release | `v3.0.0`，2026-10-13；Draft=false、Pre-release=false | VERIFIED |
| npm manifest | `@dorianchn/agent-canary`，`3.0.0`，MIT，仓库 URL 指向本仓库，Node.js `>=20` | VERIFIED |
| lockfile | 根包版本 `3.0.0`，与 `package.json` 一致 | VERIFIED |
| MCP Registry 元数据 | 审计基线 `server.json` 是 `1.2.7` 且描述为 Free V1；维护分支已改为 `3.0.0` | VERIFIED（修复已在本分支） |
| MCP initialize 版本 | 审计基线 `src/config.ts` 是 `1.2.7`；维护分支改为 `3.0.0` | VERIFIED（修复已在本分支） |
| GitHub Packages 实际包版本 | `npm view @dorianchn/agent-canary@3.0.0 --registry=https://npm.pkg.github.com` 返回 401，提示缺少认证令牌；未读取或使用令牌 | NOT VERIFIED |

GitHub Release 说明提供了安装 `@dorianchn/agent-canary@3.0.0` 的指引，但本次未把说明文字当作 Registry 上传成功的独立证明。未发布新 npm 版本。

## Glama 当前收录状态

| 项目 | Glama 页面可见状态 | 对照与状态 |
| --- | --- | --- |
| 版本/介绍 | 页面含 “Agent Canary 2.0 competition preview”、“Free V1.2.7” 和 “MCP metadata remains 1.2.7” 等文字 | 与当前 3.0.0 主线不一致，FAILED |
| 工具数量 | 12 | 与本地服务的 12 个 decoy 工具一致，VERIFIED |
| 工具 Schema | 页面记录 12 个工具，Schema/TDQS 可见；最新可见工具 Schema 更新为 2026-09-21 | 页面快照旧于当前 GitHub 主线；跨平台 Glama 重新构建后状态 NOT VERIFIED |
| 质量评级 | A / 4.4/5.0；评分时间 2026-09-21 07:30 | VERIFIED（这是工具定义质量评分，不代表整体安全性或防护效果） |
| 维护评级 | Activity Maintained；Responsiveness Within a week | VERIFIED（页面当前展示值） |
| 页面更新时间 | 公共页面未给出可确认的 listing-level 更新时间；公共 Glama API 请求返回 401 | NOT VERIFIED；仅能确认 Schema/评分最晚可见时间为 2026-09-21 |
| 所有权与手动同步 | Glama Admin 页显示 “Claim agent-canary” 和 “Login with GitHub to claim”；当前页面为未登录状态 | BLOCKED（需要仓库所有者用 GitHub 登录并认领） |

工具数量一致，但 Glama 的长描述仍包含旧竞赛版、V1.2.7、V2 Personal 付款说明等历史内容。页面文字和当前 README 的事实口径不一致；已确认主 README、中文 README、Release、GitHub Pages 和 Glama 页面链接均可访问（HTTP 200），相关本地 README 文件也存在。

## MCP 发现与 Schema 核查

本地服务通过 `src/server.ts` 使用 MCP SDK 的 stdio transport；工具通过 `ListToolsRequestSchema` 暴露。12 个工具均为对象输入 Schema，并有 `readOnlyHint=true`、`destructiveHint=false`、`idempotentHint=true` 注解。

维护分支新增 `test/server.test.ts`，以 MCP JavaScript SDK 启动实际 CLI stdio 入口，核对：

- `initialize` 名称和版本与 package / `server.json` 一致；
- `tools/list` 返回 12 个工具，名称、描述、标题和完整输入 Schema 与源码定义一致；
- 每个工具的安全注解保持只读、非破坏、幂等；
- 对 `canary_run_shell` 的测试调用返回合成 trace token。测试状态目录使用独立临时目录。

本次没有在 Glama 托管环境执行远端工具调用；Glama 页面重新构建后的结果仍需认领、同步并复查。

## Glama 配置与同步机制

根目录 `glama.json` 的 `$schema` 指向 Glama 官方 Schema，`maintainers` 包含 `DorianChn`。当前公开 Schema 要求 `maintainers`，现有配置已满足这一要求，因此没有添加未被 Schema 定义的字段。

Glama 官方资料说明：开源服务器从 GitHub 收录；认领后可在 Admin 中编辑列表并请求 Repository re-sync。官方索引说明会持续同步 GitHub 仓库。当前 Admin 页要求先使用 GitHub 登录认领；本会话未登录，因此没有触发同步。

PR 分支不是默认 `main`，不能代表 Glama 已同步。需要 PR 合并到 `main` 后，由 `DorianChn` 登录 Glama、认领列表并请求重新同步；完成后再核对版本、描述、工具 Schema、更新时间与质量评分。

## 依据

- [GitHub 仓库](https://github.com/DorianChn/shanchuanzhi-agent-canary)
- [GitHub v3.0.0 Release](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0)
- [Glama 当前项目页](https://glama.ai/mcp/servers/DorianChn/shanchuanzhi-agent-canary)
- [Glama Admin / Claim 页面](https://glama.ai/mcp/servers/DorianChn/shanchuanzhi-agent-canary/admin)
- [Glama 当前 `glama.json` Schema](https://glama.ai/mcp/schemas/server.json)
- [Glama MCP FAQ：提交、认领与同步](https://glama.ai/mcp/faq)
- [Glama 索引机制](https://glama.ai/mcp/methodology)
