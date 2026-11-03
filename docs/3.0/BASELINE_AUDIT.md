# Agent Canary 3.0 工程基线

核查日期：2026-10-11。基线提交：`dc8d0092b35141b295d5ff42873584ed488e4ee7`。

## 双轨隔离

| 工作线 | 目录 | 分支 | 状态 |
| --- | --- | --- | --- |
| 保留 2.0 | `../agent-canary-competition-audit` | `competition/shanchuanzhi-release-readiness` | VERIFIED：创建 Worktree 前工作树干净，未覆盖文件 |
| 工程主线 | `../agent-canary-3.0-engineering` | `feature/agent-canary-3.0` | VERIFIED：独立工作树与 Index |
| 研究支线 | `../agent-canary-3.0-research` | `research/agent-canary-3.0` | VERIFIED：独立 Worktree 已存在；主线不写入 |

两线共享 Git object database 和 refs，不能同时改写同名分支、更新同名远端分支或运行针对另一工作树的命令。工程实验只写 `security-lab/evidence/`；研究成果先经证据及安全边界检查，再选择性集成。没有读取研究支线未提交内容，也没有把尚未核验的理论当作产品事实。

## 实际核查

| 项目 | 状态 | 证据与局限 |
| --- | --- | --- |
| 当前 main | VERIFIED | GitHub `73cfdf990e7de669d5ffdb47ae56f5041ad4d31b` |
| 2.0 验收 PR | VERIFIED | PR #23 OPEN / Draft，HEAD dc8d009；不合并 |
| 2.0 CI | VERIFIED | [run 38127228848](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38127228848)：9/9 success，属于基线，不能代替 3.0 CI |
| Release | VERIFIED | public prerelease `v2.0.0-competition-preview.1`，另有 unpublished `v2.0.0-readiness-draft.1`；稳定版仍 v1.2.7 |
| Guard / Token / 12 MCP 诱饵 | IMPLEMENTED、基线测试 VERIFIED | `src/containment.ts`、`tokens.ts`、`decoys.ts`；仅覆盖显式接入的回调 |
| Policy / pre-AI | IMPLEMENTED、基线测试 VERIFIED | `risk-policy.ts`、`security-router.ts`；AI 只收紧，不能审批或重置 |
| 数据流 | PARTIAL | `dataflow.ts`：有界会话 HMAC 标签，不是完整污点追踪 |
| 实际 OS 文件执行边界 | PARTIAL | 2.0 realpath 复查后仍由宿主执行路径回调，不能证明不存在 TOCTOU |
| Agent 集成 | PARTIAL | 配置/协议/SDK 示例存在；桌面宿主全局工具拦截 NOT VERIFIED |
| Provider | PARTIAL | Ollama 历史实际连通；云端协议实现与测试不代表真实云端请求 |
| UI | IMPLEMENTED | loopback 中文控制台，真实 API、操作员能力与 CSRF；3.0 扩展尚待验收 |
| 本地依赖安装 | VERIFIED | `security-lab/evidence/baseline-npm-ci.txt`，npm ci exit 0 |
| 历史实验 | VERIFIED：文件保留 | `competition-submission/evidence/` 保留第四轮 110 次与 2.0 168 次数据；不是 3.0 实验 |
| 许可 | VERIFIED：MIT 保留 | Apache-2.0 仅评估，不单方面更改既有授权 |
| 商业分发 | BLOCKED | 普通 npm / Docker 的 V2 分发边界遗留 P1；独立公开构建应采用审核过的正向清单，不能移除商业许可校验 |

## 开发准入

3.0 从上述 HEAD 增量开发，保留原有所有回归测试。首个验收对象为明确标注的受控 SDK Agent。新网关采用宿主预登记并持有的文件句柄、固定执行器及会话能力；不宣传为第三方 Agent 全局防火墙。所有新结果使用独立目录，原始实验、视频、PDF 不覆盖。
