# 最简独立复现：类型修复候选

E4：NOT_VERIFIED。套件在作者同机新目录实际运行，不是外部认证。另一位真实操作者须使用独立环境、保留所有输出并签收；没有模型也可以复查确定性效果。

## 1 下载与校验

[独立免费ZIP](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/download/v3.0.0-competition-candidate.2/Agent_Canary_3_0_Community_Preview_975d8384.zip)，SHA256：e9ba7b153ad267c3275f0d213fcb49b81fb372b2047ee18e95139a7e9ed134d7。

构建源码975d838443cd56e5becd23c51941f81cfe12c994；运行时基线99660b36db9d5b1121eea6fe06b026c5f1e36bcf。与旧候选33个运行时JS文件逐字节相同，新增类型和复验入口。

Node20/22与npm。Windows可用certutil -hashfile ZIP文件 SHA256；Git Bash/Linux/macOS可用sha256sum。比较完整摘要；解压到新目录，不覆盖旧项目。首次npm ci需要网络；非离线安装器。

## 2 三条命令

进入agent-canary-community-3目录，依次执行并保存终端输出：

    npm ci
    npm run build
    npm run acceptance:offline

最后一条依次运行self-test、独立类型消费检查、6项真实临时I/O演示；不调用模型、不执行生产操作。失败不得改预期或删日志，可再运行npm test及npm audit。

## 3 亲自见证效果与签收

终端给roadshow-result.json和fixture路径。核对正常文件为NORMAL_OK、虚拟接收端计数0、危险callback计数0、victim保留、审批只执行一次且重放被拒、隔离后写入未执行。不要只引用DENY日志。类型检查还确认Agent接口没有approve/reset。

另存终端输出、roadshow-result.json、软件版本和原始失败。填写包内reproduction-kit/RESULT_RECEIPT_TEMPLATE.md，标明操作者不同于项目作者、环境是否独立、是否有模型、哈希和实际命令。公开身份和日志前征得本人同意，不提交个人密钥或学校敏感信息。没有真实签收仍是NOT_VERIFIED。

## 排错与范围

Node/npm不可用先准备运行环境；网络/权限错误保留完整输出。无Ollama不影响offline命令。不要把同机新目录、不同worktree或CI算E4。演示是操作员触发，不是真实模型攻击；Windows新目录验收不是干净VM。哈希链不提供独立时间或签名锚，不证明OS全局防护。

已发送的赛事材料仍是candidate.1；本包作为可追溯修复补充公开，不自动重发邮件或替换原评审材料。
