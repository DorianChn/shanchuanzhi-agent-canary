# AI 增强版最终验收

核验日期：2026-10-11（上海）。实现提交 `d26aad75af6354cce315b1dc3823f59f3325e73f`，Windows Token 锁修复 `d7e0a0ec812162bf51631dbd3c893d682e55435f`。已有 15 项核心修复及第二轮成果保留；本轮仅竞赛分支，未合并或发布。

## 完成定义逐项核验

| 条件 | 状态 | 实际证据 |
|---|---|---|
| 一个真实 Provider 返回合法分析 | VERIFIED | Ollama 四样本最终 4/4 结构合法；预先标签一致 3/4，保留分歧 |
| Ollama 原生 API | VERIFIED | 实际 tags、chat、模型 usage；已有 Qwen 9B，不下载模型 |
| AI 断线不影响 Guard | VERIFIED | 独立路径；benign/异常后 callback 仍拒绝的回归断言 |
| 原有与新增测试 | VERIFIED（本地） | 根 152：148 通过/0 失败/4 跳过；sponsor 25：24/0/1；共 177：172/0/5 |
| 分析可展示审计 | VERIFIED | 浏览器真实点击、JSON/Markdown/CSV 导出、来源 ID 与宿主原文绑定 |
| 密钥保护 | VERIFIED（实现/模拟测试） | 后端环境、确切 key origin、无 GET/前端存储；本轮未访问任何真实 key |
| 中文配置文档 | VERIFIED | docs/AI_PROVIDERS.md、使用指南、设计与安全报告 |
| 界面/CLI 演示 | VERIFIED | 1440/390 px 浏览器；实际运行 Chromium 录制，非 OS 桌面录像 |
| 重大回归 | 本地未发现；CI 按提交核对 | 所有原测试保留；CI 曾发现 Windows EPERM，已补最小修复与两项回归 |
| 既有参赛成果 | 保留 | 旧邮件、视频与审计历史保留；新 PDF 与模型数据来源明确 |

新增 29 项 AI 回归 + 2 项 Windows 锁回归。修复前复现 1 失败/1 通过；修复后锁测试文件通过。不会通过跳过或删测试掩盖失败。

全部本地命令：npm ci/build/test/pack:check/verify/audit，以及 sponsor ci/test/smoke/audit 均 exit 0；sponsor smoke 12/12。两份依赖审计均 0。重复 verify 不增加独立测试数。

## CI 与跨平台

AI 初次提交 d26aad7 的 Run [38078190384](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38078190384) **FAILED**：Windows 22 并发锁 open EPERM；Windows 20 被 fail-fast 取消，package smoke 跳过。Linux/macOS Node 20/22、sponsor、Docker 实际成功。这不能描述为 9/9 通过。

锁修复提交 d7e0a0e 已推送，Run [38078821555](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38078821555) 实际完成 **9/9 jobs SUCCESS**：Windows/Linux/macOS × Node 20/22、sponsor smoke、package smoke、Docker build 与 CLI container smoke。最终材料提交的 CI 将另行核对并保存 ci-delivery-status.json。

完整材料提交 11000a7f4709bf505916d6d928bdf86c9e7f7ff9 的 Run [38079248349](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38079248349) 也实际 **9/9 SUCCESS**，保存 ci-delivery-status.json。后续仅更新不可变链接和验收指针，最终 HEAD CI 由 GitHub 显示，不冒充未跑过的结果。

本地 Windows 11 / Node 22 VERIFIED；代码提交 d7e0a0e 的 Windows/Linux/macOS × Node 20/22 与 Docker CI 全部 VERIFIED。本机没有 Docker CLI，本机 Docker 是 SKIPPED。CI 只验证列出的构建/测试，不代表所有云端模型已接通。

## 真实结果与安全边界

Ollama 四样本合法结构 4/4，标签一致 3/4；一条沙箱隔离日志被判 benign，保留原文。两次早期格式失败留档。

最新 36 次 neutral_agent 自主工具实验：A/B/C 攻击成功 1/10、2/10、2/10；B/C 诱饵 0/10 各；C SAFE 中危险尝试 5 次、执行 5 次、阻断 0/5。预置隔离后的 C 阻止 1/1，不能算模型检测。正常任务各 1/1；样本过少不能外推误报。全部虚拟执行器，无生产作用。

支持 OpenAI/Claude/Gemini/DeepSeek/百炼与兼容适配；真实云端 **NOT VERIFIED**。本地 LM Studio/vLLM **NOT VERIFIED**。多模型比较、校准置信度、收费成本 **NOT MEASURED**。不读取凭据、不发付费请求。

已知 P1 V1/V2 公共构建分发边界仍未关闭，未移除许可校验或改变商业交付。**未达到稳定发布标准**。AI 不执行工具，不能解除隔离；首次危险调用、Guard 旁路与已开始的外部效果不受完整保护。未发现新的已证实 AI 放权绕过，但不能保证没有漏洞。

## 材料与最终动作

项目 PDF 17 页、实验 PDF 7 页，已提取并渲染检查；中文控制台、指南、字幕与真实程序录像均在 competition-submission。录屏明确区分离线脚本信号、真实本地推理、保存的模型自主实验。视频没有旁白。

本轮官网返回空页面，最新规则 **无法再次确认**；材料要求来自用户提供的官方报名确认邮件。公开链接和最终 CI 核对完成后，具备演示与准备补交材料的条件；发送前仍需核对官方要求并获得用户明确授权。此前 2.1.0 已发送，本轮不自动补发。

已完成公开核验：材料提交的 MP4 与两份 PDF 分别 HTTP 200，独立下载 SHA-256 与本地一致。17/7 页 PDF、220.933 秒视频具备正式材料类型；当前具备本地演示和准备补交的条件，但不能独立确认最新官方要求全部满足。中文控制台实际启动 http://127.0.0.1:4318，使用独立临时沙箱，不读取生产业务目录。

内部评分维持 78/100（24/30、24/30、16/20、14/20），不因视频完成就推断获奖。三个最值得继续投入的方向：改善真实信号覆盖和跨模型实验；Keyring/宿主审批；经维护者确定 V1/V2 最小分发方案。
