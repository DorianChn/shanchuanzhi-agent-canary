# Agent Canary 展示视频脚本与录制说明

## 已生成的本地视频

- 文件：`Agent_Canary_演示视频.mp4`（本地文件；为避免把大媒体提交进普通 Git，已加入 `.gitignore`）。
- 画面：1920×1080、H.264；音频为 22.05 kHz 单声道 AAC；ffprobe 实测视频流 251.300 秒、音轨 251.199 秒（约 4 分 11 秒）。
- 旁白：Windows Microsoft Huihui 简体中文合成语音；字幕共 41 条，见 `Agent_Canary_演示字幕.srt`。
- 制作方式：在隔离的临时 Chrome profile 中渲染本地材料页面，再逐帧截取画面并用 FFmpeg 组装。它是讲解展示视频，不是原始桌面即时录屏；播放期间不会调用 Ollama，也不会执行新的 Agent 攻击。
- 内容：离线 containment 命令的真实保存输出、本机模型 pilot 的原始统计、性能测量与已知边界。指标来自仓库证据；页面转场只是讲解，不代表一次新的模型动作。
- 官方公开视频链接：尚未创建。公开视频平台上传和匿名访问核验后，才能将该 MP4 对应链接写入参赛邮件。

## 分镜与旁白范围

| 时间（约） | 画面与讲解 |
|---|---|
| 00:00–00:21 | 项目目标、参赛版本、实验范围；说明不是赛事结果或安全保证。 |
| 00:21–00:41 | 仓库、网页和工具输出中的间接提示注入风险。 |
| 00:41–01:04 | MCP 诱饵、Session Guard、Guarded Tool Router 和 JSONL 审计路径。 |
| 01:04–01:28 | 确定性离线演示的保存输出；明确固定触发不算模型检测。 |
| 01:28–01:57 | 本机 Ollama、最小 function-calling loop，以及 A/B/C 三组 callback 路径。 |
| 01:57–02:26 | Safety-aware profile：诱饵选择 0/40；C 组 0/10 不归因于 Guard 拦截。 |
| 02:26–02:43 | Neutral profile：C 组 5 次危险模拟 callback 在 SAFE 时执行。 |
| 02:43–02:54 | harness 预置隔离后 C 组阻断 3/3；不计模型检测分。 |
| 02:54–03:19 | 测试数、依赖审计、扫描性能和微基准范围。 |
| 03:19–03:43 | Promptfoo/PyRIT 与 Agent Canary 的互补定位、开源治理入口。 |
| 03:43–04:11 | 首次危险调用、Guard 旁路、已开始操作的边界；公开分发 P1 和仓库结尾。 |

旁白实际结束于 04:08.199；视频在结尾画面保留约 0.1 秒。以 MP4 与 SRT 时间码为准。

## 重新生成

在 Windows，确保 Chrome、FFmpeg 和 Microsoft Huihui SAPI voice 可用，在仓库根目录执行：

```bash
node competition-submission/lab/record-presentation.mjs
```

脚本只读取本地报告、原始结果和已保存的离线演示输出模板；使用独立 Chrome 临时配置，不连接真实模型、生产密钥或外部 API。MP4 保存在 `competition-submission/Agent_Canary_演示视频.mp4`，SRT 保存在同目录。
