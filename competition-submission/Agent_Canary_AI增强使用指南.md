# Agent Canary AI 增强演示

```sh
npm ci
npm run build
```

正式演示使用以下命令：

```sh
node dist/index.js self-test --json
npm run ai:console
```

1. 浏览器打开控制台输出的 loopback 地址，选择 Ollama 与已安装模型，保存并检测。
2. 运行“离线隔离演示”。这是程序触发的虚拟信号；展示真实 Session 日志、QUARANTINED 和危险 callback 未执行，不算 LLM 触发检测。
3. 点击日志事件，阅读预览，再点 AI 分析。真实模型分析已有证据；不改变隔离。
4. 载入虚拟攻击样本，记录模型结果、延迟与 usage。模型可能判断错误，展示实际输出。
5. 实验中心“运行真实 Ollama A/B/C”复用 lab，36 个工具选择试验；Shell/HTTP/文件/密钥作用全部为虚拟。
6. 下载本轮 JSON/Markdown/CSV。关闭进程前保存报告；退出后模型配置与分析历史不持久保存。

CLI 四场景分析：`npm run ai:demo`。模型实验：`npm run lab:agent -- --profile=neutral_agent`。数据在 `competition-submission/evidence/`。不同机器和模型输出可能不同，保留全部失败，不拿截图中的结果作为复现保证。

Ollama 断开时仍可运行 `npm run demo:containment` 与 `node dist/index.js self-test --json`。无需网络、API Key 或生产数据。

云端/LM Studio 接入参见 `docs/AI_PROVIDERS.md`。本轮没有任何真实云端账号调用。新版本 AI 视频尚需按新增脚本录制；此前视频只介绍旧功能，不能冒充新版本完整展示。
