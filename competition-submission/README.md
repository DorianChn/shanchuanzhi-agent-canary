# Agent Canary 参赛材料（2026 上海开源软件应用创新大赛）

## 第四轮当前提交入口

以下为本轮最终材料；后文旧版本记录保留，不能当作本轮状态。

- [15 页项目介绍](Agent_Canary_Round4_项目介绍.pdf)、[7 页实验报告](Agent_Canary_Round4_实验报告.pdf)。
- [4 分钟真实程序录像](Agent_Canary_Round4_Demo.mp4)：1080p、中文说明、实际 Ollama 推理，危险效果均虚拟；旧录像保留。
- [独立免费竞赛包](Agent_Canary_Competition_V1.zip)：排除既有商业实现，独立构建与官方 MCP stdio Client 互通验证。
- [真实 A/B/C/D1/D2 报告](Agent_Canary_ABCD真实实验报告.md)、[正常任务审批代价](Agent_Canary_正常任务误报报告.md)、[中文控制台](Agent_Canary_中文控制台使用说明.md)。
- [完整最终安全报告](../docs/competition/FOURTH_ROUND_FINAL_REPORT.md)、[安全架构图](Agent_Canary_安全架构图.svg)。
- 精确代码/公开材料提交及可访问链接见 `ROUND4_DELIVERY_VERSION.md`；最终发送前核对正式清单，邮件草稿尚未发送。

第四轮命令：`npm ci`、`npm run build`、`npm test`、`npm run ai:console`；模型实验 `node competition-submission/lab/run-agent-eval.mjs --profile=neutral_agent --round4`。不要把上轮 36 次或合成测试当作本轮 110 次真实模型结果。

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


## AI 增强版追加记录

AI 增强新增：Agent_Canary_AI增强使用指南.md、AI增强录屏脚本.md、AI增强字幕.srt、模型对比报告.md；更新的项目/实验PDF由 lab/build_ai_pdfs.py 生成。代码版本见 DELIVERY_VERSION.md，最新验收见 docs/competition/AI_FINAL_READINESS.md。旧2.1.0曾发邮件并有60秒公开视频，本輪邮件未发送，新AI视频公开链接未完成。
