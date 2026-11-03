# 双轨隔离协议与当前现场

检查时间：2026-10-11。主线 `feature/agent-canary-3.0` 位于 `agent-canary-3.0-engineering`；研究线 `research/agent-canary-3.0` 位于 `agent-canary-3.0-research`。Git Worktree 列表已实际确认，两者 HEAD 与 Index 独立，共享 Git 对象库。

原 2.0 工作树 `agent-canary-competition-audit` 保持 `competition/shanchuanzhi-release-readiness` / dc8d0092b35141b295d5ff42873584ed488e4ee7。本轮未修改它的代码、PDF、视频或 Release。

- 工程主线独占核心代码、源码测试与提交冻结。研究支线不覆盖主线文件、不发布或发送邮件。
- 不对共享 branch / refs / Git 配置同时写入，不执行 reset、clean、force push。
- Ollama 模型实验串行；不要两线同时运行有资源竞争的推理实验。
- 研究提交先单独保留，工程线核对来源、复现和边界后选择性集成。本轮未采纳未经验证的研究安全结论。
- 主线 PR #24 以未合并 PR #23 的 `competition/shanchuanzhi-release-readiness` 为 base。它不是 main 的已发布版本。
