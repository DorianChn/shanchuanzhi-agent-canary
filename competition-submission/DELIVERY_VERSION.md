# AI 增强竞赛交付版本

- 项目：Agent Canary；负责人唐林博豪，闽江大学。
- 仓库：https://github.com/DorianChn/shanchuanzhi-agent-canary
- 分支：competition/agent-canary-hardening；[Draft PR #22](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/22)，未合并 main。
- AI 实现：d26aad75af6354cce315b1dc3823f59f3325e73f。
- 最终可复现代码：[d7e0a0ec812162bf51631dbd3c893d682e55435f](https://github.com/DorianChn/shanchuanzhi-agent-canary/tree/d7e0a0ec812162bf51631dbd3c893d682e55435f)。含 Windows 并发锁最小修复，无正式发布。
- 完整代码、PDF、实录视频、原始实验、生成器和指南：[11000a7f4709bf505916d6d928bdf86c9e7f7ff9](https://github.com/DorianChn/shanchuanzhi-agent-canary/tree/11000a7f4709bf505916d6d928bdf86c9e7f7ff9)。该提交的 Run 38079248349 已实际 9/9 SUCCESS。后续只补公开链接/验收记录，不改变这个不可变材料版本。
- 项目介绍 PDF 17 页，实验报告 PDF 7 页；真实分析/36 次实验的数据文件与模型、提示词、模式均留档。
- 新视频 Agent_Canary_AI_Demo.mp4：实际运行 Chromium UI 录制，不是 OS 桌面录屏；中文屏幕字幕、无音轨；虚拟工具、真实本地 Ollama 分析；保存的 A/B/C 结果明确标识。实际时长/哈希见 evidence/ai-video-verification.json。
- 新视频 220.933 秒、3,397,872 字节；SHA-256 6939a03da76c6e4519ada314f577a26db7d29e0b7e3f14dbc683429739436188。不可变公开视频：https://raw.githubusercontent.com/DorianChn/shanchuanzhi-agent-canary/11000a7f4709bf505916d6d928bdf86c9e7f7ff9/competition-submission/Agent_Canary_AI_Demo.mp4 。视频与两份 PDF 均独立下载 HTTP 200，哈希与本地一致。
- 旧 2.1.0 邮件已发送；此次仅 GitHub 交付及补充邮件草稿，未发送。

复现：checkout 上述代码提交 → npm ci → npm run build → npm run ai:console。使用已有 Ollama Qwen 9B 时可真实分析；没有模型时可运行离线沙箱，必须标明不是 LLM 检测。

没有发布 npm/Docker、合并 main、操作真实订单/密钥或付费调用。V1/V2 分发 P1 仍开放；稳定发布尚未达到。
