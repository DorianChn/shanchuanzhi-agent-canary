# 独立复现手册：Community 99660b36

状态：套件与同机新目录试运行VERIFIED；外部E4 NOT_VERIFIED。本指南不是第三方认证。

## 获取与核验

- 公开候选Release：https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0-competition-candidate.1
- 免费包：https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/download/v3.0.0-competition-candidate.1/Agent_Canary_3_0_Community_Preview_99660b36.zip
- SHA256：011e8db21bc53d813168d8400ace05116e25c89ae837c66e5e321379cad0e8ed
- 运行时Git：99660b36db9d5b1121eea6fe06b026c5f1e36bcf
- 本复现脚本是后来编写的材料，不改变运行时。脚本及套件摘要见ROADSHOW_SHA256SUMS.txt。
- 只选策展Community包；不将全仓Source code/旧npm/Docker当作该免费交付物。

要求Node20或22、npm；在线首次npm ci。演示本身不需要模型、不产生外部网络请求（仅临时loopback）。Python3 + jsonschema仅用于完整Git证据验收；PPT/PDF不需要Python。不要把试验路径换成真实文件或密钥。

哈希检查：Git Bash/Linux/macOS可用sha256sum ZIP文件；Windows可用certutil -hashfile ZIP文件 SHA256，或Python hashlib。比较完整64字符。解压时不要覆盖已有项目目录。

## 最少操作（普通用户，中文/空格路径可用）

1. 将Community ZIP解压到新目录，进入agent-canary-community-3。
2. 执行：
```text
node --version
npm ci
npm run build
npm test
npm run self-test
```
3. 将本套件reproduction-kit放在便于访问的位置；从Community根目录执行：
```text
node "绝对路径/reproduction-kit/verify-community-manifest.mjs" .
node "绝对路径/reproduction-kit/run-offline-demo.mjs" --root=.
```
路径使用终端接受的斜杠；包含空格要把整个参数加引号。不要把文字“绝对路径”原样执行。

## 实际目标见证

脚本创建全新临时fixture，不触碰用户工作区，生成6项操作员DEMO和roadshow-result.json：
A虚拟凭据确实返回；F正常文件写入NORMAL_OK；F首次凭据拒绝/NOT_STARTED；危险MCP回调0、接收端0、victim未变；一次可信审批执行1次且重放拒绝；ENV真实读取隔离后再次写入被拒、文件仍NORMAL_OK。

输出会给实际结果文件与fixture路径。请独立查看文件，而不是只引用状态文字。脚本失败返回非零，保留结果、错误、目录。不要清理失败记录。不记录虚拟秘密正文。此脚本只有有限同宿主观察，不证明不合作callback、全OS或迟到效果。

## 无模型审查历史真实实验

下载Release的Agent_Canary_3_0_Evidence.zip并阅读results.json与CSV/summary。核对新64记录的raw SHA：
d9667952bf9df30979785ca0d2ec8582429d7035899ec754dbf12fc9a00fae8e。

查看H08/H10对应A/F、messages、trace、sideEffects；不要把其余未尝试算主动阻断。Schema/来源验证需要完整Git，不要把无.git的ZIP说成Git来源验收已通过。

## 可选：真实模型重跑

仅在操作者已安装并启动Ollama/qwen3.5-9b-local:latest时执行，不自动下载或使用付费API。版本不同须记录，不要求复制相同结果。
```text
ollama list
node security-lab/run-sdk-agent.mjs --fair-acceptance --holdout=security-lab/holdout-v1.json --sha=99660b36db9d5b1121eea6fe06b026c5f1e36bcf
```
若ZIP内来源命令要求Git或精确构建来源，请使用新目录完整克隆及checkout冻结commit。每次保存新的evidence目录，全量12攻击+4正常、各2次、两组64，不更换失败文本。启动失败也是结果。

## 完整Git/Schema复核（可选）

```text
git clone https://github.com/DorianChn/shanchuanzhi-agent-canary.git AgentCanaryReview
cd AgentCanaryReview
git checkout --detach 99660b36db9d5b1121eea6fe06b026c5f1e36bcf
npm ci
npm run build
python -m pip install jsonschema
python security-lab/verify-acceptance.py --results security-lab/evidence/2026-10-11T15-04-14-292Z/results.json --output review-assurance.json
```
原始新64结果在后续材料提交38f6476，冻结commit不含事后实验结果；请把Evidence ZIP的对应原始evidence路径复制到这个新克隆中（只复制数据，不覆盖src/test/锁文件），或从38f6476只取该路径。不同Node/TypeScript可能导致构建摘要变化，必须保留并解释，不篡改原始摘要。Git来源/平台不符应标PARTIAL/FAILED。

## 排错与结果签收

- node/npm未找到：先安装受支持Node；不需要管理员执行危险工具。
- npm首次安装网络失败：保留日志，重试前记录；离线首次安装未保证。
- BUILD_REQUIRED：从Community根执行ci/build，确认dist/sdk.js。
- 权限/符号链接跳过：记录平台能力，不能把跳过算通过。
- Ollama不可连：只运行离线DEMO、查看历史真实轨迹，模型状态BLOCKED。
- 完整来源摘要不一致：记录实际版本/摘要，不修改记录或删除失败。
- E4签收：另一真实操作者在独立环境执行，填写RESULT_RECEIPT_TEMPLATE.md并提供原始日志。可隐去个人隐私，但需可信确认是另一操作者。没有该签收只能称套件准备好。

## 本轮实际试运行

匿名HTTP200下载、ZIP348655字节/上述摘要、125个manifest文件0不符；新中文/空格目录npm ci/build/test/self-test、6项临时I/O完成。96通过、0失败、0跳过；npm audit 0。当前用户同机，不是干净VM或E4。首轮测试驱动错用不存在npm-cli路径，模型/包未执行；错误日志留在本地构建目录，修正驱动后新目录执行，没有改候选包。

本轮新目录先以Node v24.19.0试运行，再使用已安装Node v22.23.1在另一个全新中文/空格目录完成ci/build/test/audit/self-test及6项临时I/O。两轮96/0/0不相加为192个独立测试。Node20本机未执行，20/22跨平台见既有CI。
