# Agent Canary 参赛材料（2026 上海开源软件应用创新大赛）

负责人：唐林博豪（闽江大学）。本目录的结论以本次本机复核、保存的实验结果和公开 Git 提交为准；没有真实模型、CI、视频上传或赛事结果证据的项目均明确标出。

## 交付文件

- `Agent_Canary_项目介绍.pdf`：正式项目介绍，含场景、架构、实验边界、开源治理和路线图。
- `Agent_Canary_技术创新说明.md`：核心机制与 Promptfoo/PyRIT 的客观比较。
- `Agent_Canary_实验报告.md`、`Agent_Canary_实验报告.pdf`：真实本地模型工具调用、A/B/C 对照、离线安全回归和性能数据。
- `Agent_Canary_演示指南.md`：真实本地模型与确定性离线模式的复现步骤。
- `Agent_Canary_演示视频.mp4`：本地生成的 1920×1080、251.3 秒 H.264/AAC 合成旁白展示视频，配 41 条 SRT；由隔离 Chromium 画面帧和保存的实测结果组装，不是原始桌面即时录屏，播放中不运行模型。该大文件已忽略、不纳入 Git；公开可访问的视频链接尚未创建。
- `Agent_Canary_演示视频脚本.md`、`Agent_Canary_演示字幕.srt`：旁白、分镜和字幕；视频录制方式及边界如实注明。
- `evidence/index.html`：从本地原始 JSON 汇总的中文展示页；通过 loopback-only `lab/serve-dashboard.mjs` 查看。
- `Agent_Canary_开源治理说明.md`：许可、贡献、安全披露、CI 与版本规划。
- `Agent_Canary_参赛提交清单.md`：按官网材料要求核对状态和阻塞项。
- `Agent_Canary_参赛邮件.md`：邮件草稿，不会自动发送。
- `evidence/`：脱敏实验原始结果、审计事件、复现环境与检查记录。

## 可复现入口

在仓库根目录执行：

```bash
npm ci
npm run verify
npm run demo:containment
npm exec -- node competition-submission/lab/run-agent-eval.mjs --profile=neutral_agent
```

真实模型实验只连接 `127.0.0.1` 的 Ollama，并使用本机已安装模型；若本地服务/模型不可用，脚本失败关闭并保留部分结果，不会下载模型或转向付费 API。

项目代码版本与参赛分支/提交号记录于 `Agent_Canary_参赛提交清单.md`。官方要求的三个核心材料是代码仓库、项目介绍 PDF、演示视频链接；若链接尚未实际托管，该项保持未完成，不使用占位链接冒充。
