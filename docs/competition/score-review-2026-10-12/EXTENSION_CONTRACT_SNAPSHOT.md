# 3.0 扩展接入快照：不是新插件平台

适用对象：免费Community候选99660b36；JS SDK摘要 f55f0ecab402d44ed3286cf76f1bf059d5adc6262dd6621227e9748d434a57f5。
此处记录真实已有API，不新增runtime、插件loader或协议。源仓普通sdk与策展Community额外导出不同；示例仅验证后者，不声称根包/npm稳定3.0导出兼容。

## 信任与接口

|角色|已有真实入口|权力/义务|
|---|---|---|
|可信宿主|createTrustedExecutionGateway(GatewayOptions)|登记workspaceRoot/files、固定commands、HTTPS readOrigins和mcpTools；维护guard与EvidenceRecorder|
|扩展作者|GatewayOptions.mcpTools[可信tool ID]|提供execute(args,AbortSignal)、approvalRequired、risk。descriptor必须真实，校验args；不忽略取消，不偷偷扩大能力|
|Agent/模型|runtime.agent.dispatch({name,args})|只能提交请求；不能登记工具/审批/重置。绑定身份来自宿主，不是多租户认证|
|可信操作员|runtime.operator.pending/approve/reject|对象持有权在宿主；一时一请求，防重放不是跨进程IAM|
|生命周期|runtime.close()，EvidenceRecorder.close()|释放held fd/队列；已开始的不合作callback不保证取消/回滚|

源码类型以src/runtime/gateway.ts为准。Community src/sdk.ts额外导出运行时。源包编译strict，但原ZIP的dist/sdk.d.ts不存在，直接TS消费实际FAILED。不可声称原发布包已经提供完整TypeScript声明。

## 最小贡献路径

1. 只在隔离fixture构造可信descriptor。用fixture-plugin.mjs展示READ_ONLY静态回调、需审批写回调和被拒的DESTRUCTIVE回调。
2. 给模型的对象只有agent；不要传operator、注册配置或生产环境。
3. check-template.mjs实际核验正常文件、callback计数、审批重放和隔离后效果。它是SDK贡献者回归，不是LLM/原生宿主实验。
4. TYPE_COMPANION验证包内源码派生的33份类型，只适配上述SDK摘要。直接原SDK消费失败仍公开，不隐藏。
5. 提交必须带source/SDK摘要、命令、实际效果与失败；未知平台标NOT_VERIFIED。

## 兼容政策（拟定规则，不是既有生态承诺）

- 当前约定只是一份冻结commit快照，不为未发布版本承诺ABI。
- 补充包不得修改原JS/许可证；SDK摘要不匹配应拒绝，不手改manifest“通过”。
- 新callback/Adapter须列真实控制范围、descriptor假设、取消语义、目标观察；同一Guard保持来源历史。
- 破坏调用参数/审批行为/审计字段的变更须另开PR、保留旧入口说明、迁移示例与回归；未批准不能替换竞赛冻结。
- 3.1正式发布前仍需把声明纳入免费构建、核对SDK导出/包版本、确定支持期限。当前补充不是稳定npm发行或跨框架插件系统。
