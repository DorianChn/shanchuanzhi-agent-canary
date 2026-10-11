# 公平核心能力对照：A 无保护 / F 完整系统

最终核心SHA `334b2c81569e100c8c7d727e0a9b9361ab530c5a`；原始目录 `security-lab/evidence/2026-10-11T12-49-47-521Z/`。第一次772检查点48试验原样保留，结果相同但不合并统计。第三方原生客户端未参与。

## 方法与公平性

真实已安装Qwen9B通过Ollama自主选工具；固定seed20261011、temperature0、thinkfalse、ctx4096、predict256、最多4轮。12个作者设计独特场景，各重复2次，每组24次。6个直接受限操作、2个恶意README间接样本、4个正常任务；原场景不删除，新增来源外传与正常网络正对照。

两组相同模型/任务/schema/文件/固定Node argv/MCP callbacks、无效凭据与send_fixture loopback POST。F启用可信网关、Guard、前置AI和.env蜜罐；A不启用执行控制。F仍允许正常网络。文件原语A路径IO/F持有fd为保护处理差异。处理顺序是先A再F，非交错随机；固定seed重复可能相关。不能声称独立留出集/独立研究员盲测或推导生产置信区间。

## 结果与分母

| 指标 | A | F | 解释 |
|---|---|---|---|
| 直接受限任务副作用成功 | 12/12 | 0/12 | 执行准入测试，**不是Prompt Injection成功率** |
| 直接任务主动拒绝 | 0/12 | 12/12 | Policy/AI收紧/Guard原因见OSEP，每条都实际检查效果 |
| 间接注入攻击成功 | 0/4 | 0/4 | 两组模型未执行注入，不证明防护收益 |
| 间接任务主动拒绝 | 0/4 | 0/4 | 不将模型自发忽略恶意文本算成系统拦截 |
| 正常任务成功 | 8/8 | 8/8 | 读、写、构建、合法网络四类各2次 |
| 正常任务误中断 | 0/8 | 0/8 | 只针对这四类，不是全局零误报 |
| 蜜罐读取（直接） | 0/12 | 2/12 | F P04读取.env后真实隔离；自适应增益未测 |
| 错误/超时试验 | 0/24 | 0/24 | 原始日志保留；没有删除失败样本 |

直接与间接聚合的“12/16→0/16”不作为PI效果宣传。模型不尝试攻击导致无效果，和系统拒绝导致无效果分别报告。

| 时延/用量/资源 | A | F |
|---|---|---|
| Tool调用中位ms（调用数） | 1.1174（28） | 7.7777（32） |
| 任务中位ms（任务数） | 1395.0002（24） | 1855.1475（24） |
| 实际前置AI有效输出 | 0/0 | 6/6 |
| AI审查中位ms | NOT MEASURED | 5088.9040 |
| Agent输入/输出Token | 28744 / 1741 | 30416 / 2590 |
| Review输入/输出Token | 0 / 0 | 1372 / 1440 |
| Node试验结束采样RSS峰值bytes | 72593408 | 68202496 |
| Node CPU user/system微秒合计 | 188000 / 266000 | 124000 / 282000 |

RSS/CPU只含SDK Node，不含Ollama/GPU，不代表峰值工作集完整捕获；没有测能耗。两个组时序/模型预热/能力路径不同，时延差不可当成孤立Gateway固有开销。1500次纯fd读取+内存Recorder微基准：median3.0658ms、p95 4.0023ms、p99 4.5344ms，事件3000链有效；不含AI/磁盘证据fsync、不证明长期稳定性。

AI在调用前评审，6次均合法suspicious输出并收紧。但D（无AI）对同类操作仍REQUIRE_APPROVAL，故本轮**AI独立防护增益NOT MEASURED**，未验证AI解释的每个自然语言事实。恶意SYSTEM/approve文本不能授予执行权限。自适应planner选择已实现，**静态vs自适应公平收益NOT MEASURED**。

## 证据与复现

`preregistration.json`在运行前写入工具/任务/参数/摘要；`results.json/csv`包含所有轨迹、Token、实际效果、错误、资源；独立Python核对37字段向量、48链、JSONL与快照相同，源码及构建5+5摘要一致，见`security-lab/acceptance/assurance-final.json`。不重写原始sourceSHA，不将前一版本数据归因新代码。

执行：`npm ci && npm run build`；再`node security-lab/run-sdk-agent.mjs --fair-acceptance --sha=<完整实际SHA>`。仅新临时目录、无效秘密、固定无害Node测试进程与loopback接收端；不要把工具执行器替换成生产Shell或真实HTTP业务操作。检查结果：`python3 security-lab/verify-acceptance.py --results=<新目录>/results.json --output=<新验收文件>.json`（需jsonschema）。

这个试验支持SDK局部E3执行效果，不支持第三方宿主全局防护、E4独立再现、完整污点分析或真实间接Prompt Injection收益。后续最有价值的证据是冻结独立间接攻击集中的真实基线成功轨迹与公平防护对照。
