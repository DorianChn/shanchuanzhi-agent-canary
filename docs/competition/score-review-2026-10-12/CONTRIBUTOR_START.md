# 贡献者起步与审查流程

这是一条针对3.0免费候选的补充入口；原CONTRIBUTING/MAX_SCORE_MATRIX/Release不覆盖。当前维护者为个人项目维护者DorianChn，没有虚构团队、服务SLA或外部采用。

## 可执行起步

下载原Community ZIP，先npm ci、npm run build。将本目录类型补充ZIP解压到同一个新Community根，只新增contributor-review。目录已存在则用新的Community解压目录，不覆盖用户内容。普通Node20/22为目标，本轮Node22实测。

```text
node contributor-review/kit/verify-types.mjs .
node node_modules/typescript/bin/tsc --noEmit --strict --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext contributor-review/kit/typed-host-derived.ts
node contributor-review/kit/check-template.mjs --root=.
```

本轮从实际ZIP解压后这3个命令都退出0。9项真实fixture断言通过；先前直接原dist/sdk.js类型消费退出2，原因TS7016，失败日志保留。不要将“预期失败被观察到”算通过。

## 三个可接手的小任务（建议，不伪造已创建Issue）

|任务|入口/产物|验收|安全限制|
|---|---|---|---|
|C01 安装文档复核|本指南、既有E4签收模板|另一人独立下载、原样执行、报告失败和实际目标|必须真人才算E4；不发真实凭据|
|C02 类型发布补齐|security-lab/build-community.py、tsconfig、Community SDK导出|另PR输出.d.ts、严格消费者编译、JS摘要不变、包清单验证|需新候选审查；本轮不改冻结运行时或原ZIP|
|C03 Adapter回归贡献|src/runtime/gateway.ts类型；本模板；AGENT_COVERAGE_MATRIX|受控工具正常/拒绝/审批/效果观测、取消负例|配置/握手不当原生E2E；不注入其他程序|

## 分诊、维护、发布

普通缺陷走现有bug_report模板，提供脱敏doctor/OS/Node/SHA/最短复现；不要上传真实日志。秘密或可利用漏洞使用SECURITY的私密渠道，先确认该渠道可用，不自动外发。

维护者按“复现→风险→真实目标→最小修改→回归→文档→独立审查”处理。7天分诊/30天状态是尽力计划，不是假称历史达标或服务承诺。参赛冻结不为便利放松Policy。

贡献者须声明代码来源/许可，不得将已MIT代码封闭、引入生产支付/订单或删除失败。审查模板须记录：受控范围、真实副作用、权力持有者、首次/并发/失败路径、pack兼容、平台限制。待维护者审查后才合并；不自动main合并/发布。

具体维护周期、预算与退出门槛见MAINTENANCE_CAPACITY_AND_GATES.md。首轮实际操作记录见MAINTENANCE_REVIEW_LOG.md；没有长期响应率或社区规模证据。

## 在新目录重建类型（可选）

原Community根目录可运行：

    node node_modules/typescript/bin/tsc -p tsconfig.json --declaration --emitDeclarationOnly --outDir contributor-review-local/types

此命令只生成本地声明，不修改原JS。不要覆盖既有contributor-review或修改manifest来匹配不同版本。消费者需要按该路径导入；源码和SDK必须相同快照。本轮派生编译/消费者日志见evidence/。

完整类型化应用可使用contributor-review/typed-sdk.mjs（只是转发原SDK）与配对.d.mts。详见contributor-kit/TYPE_COMPANION_README.md的编译/执行两条命令；本轮实跑成功，不把纯静态类型检查当成运行成功。
