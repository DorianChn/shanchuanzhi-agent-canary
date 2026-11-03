# E0–E4 与真实执行证据映射

本项目内的研究分级，不是外部安全认证。等级属于具体声明、提交、场景与覆盖范围；不为整个产品授予永久等级。研究快照b44ac747只读核对，没有合并研究代码。

| 等级 | 当前对应实现与证据 | 状态 |
|---|---|---|
| E0 能力/机制描述 | Gateway 可信 descriptor、held fd、Policy/Guard/Planner 文档与源码 | VERIFIED：机制存在，不表示攻击效果 |
| E1 观测到安全信号 | HoneypotRuntime 的 READ eventId/decoyId；最终F P04两次确实读取并隔离 | VERIFIED：DEPLOYED不能替代READ；READ不等于危险动作被阻止 |
| E2 执行控制证据 | EvidenceRecorder实际OSEP0.1事件的request_id/evidence_id/decision/reason/status，Guard的QUARANTINED及链 | VERIFIED：计划RUNNING不是实际进程已启动；枚举VERIFIED不自动等于E3 |
| E3 副作用见证 | 同一受控host独立于决策标签检查文件/接收端/虚拟秘密返回，结合相同能力A正对照与F拒绝 | VERIFIED（局部）：F12个直接受限任务无禁止效果；8个正常任务效果发生。有限试验窗口，不涵盖迟到回调/全OS |
| E4 独立再现 | 另一个操作者/环境从冻结公开包实际复现 | BLOCKED：本轮没有执行；研究方只读审查或重算哈希不是E4 |

机器可读伴随报告：`security-lab/final-acceptance/current-cohort-assurance.json`，逐一绑定24条F试验（12直接、4间接、8正常）及原始文件SHA256、实际源码/构建摘要、JSONL/内嵌事件一致性、每条链头。直接效果预防声明12条和正常效果8条支持局部E3；4条间接任务没有攻击发生，只能记录观察，不能授予“PI防护E3”。

此伴随映射不修改严格OSEP事件Schema，避免添加字段破坏消费者。`verify-acceptance.py`是离线一致性检查+场景映射，不是产品实时自动认证。未知效果必须降级，不能靠字段内容提升等级。请求摘要使用临时HMAC密钥，外部不能复算任意原始参数摘要；事件链可复算，但可信写入者/管理员仍可整体重写，锚点须由独立渠道保存才有截断检测价值。没有独立时间戳服务、硬件签名或不可篡改存储。

Observer：同一受控SDK测试host；await调用结束、检查文件和接收端，再关闭服务器；正常网络2/2和A危险效果12/12作为正对照。没有无限观察窗口、独立OS监控或强制进程树隔离。命令SUCCEEDED只证明固定测试进程返回/目标marker观察，不表示所有副作用已验证。手工植入的忽略abort回调晚写入是真实边界反例，不能与零效果声明混淆。

本轮协议回归：request_id标准引用、五字段数组拒绝、真实日期检查。Node41项（含引用与标准AJV测试）通过；Python37字段向量、48 JSONL/链和5源码/5构建核对通过。标准jsonschema缺失可选date-time依赖时会跳过格式检查，本轮验证器显式启用协议UTC日期子集检查，初次环境失败结果原样保留。


本轮更新：冻结9ed69f3c，标准AJV2020 + ajv-formats实际校验37个字段向量及真实Recorder导出。本轮新确认的P2离线验收夸大缺证据问题已修复：6个修复前失败负例保留，7个修复后回归通过。元数据/正对照/效果/链/源码不一致时整体FAILED且所有声明降到PARTIAL/E0。当前48次真实模型、24条F逐项映射和E4缺口见[FINAL_3_0_ACCEPTANCE.md](FINAL_3_0_ACCEPTANCE.md)。
