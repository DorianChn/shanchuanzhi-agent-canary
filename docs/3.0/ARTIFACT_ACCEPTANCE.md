# 3.0 免费候选构建与安装验收

> 历史验收快照：本文件保留对应提交的结果；最新交叉验收、48次新模型记录和候选包见 [FINAL_3_0_ACCEPTANCE.md](FINAL_3_0_ACCEPTANCE.md)。不要将以下旧计数/版本当成当前结果。

状态：**VERIFIED（当前Windows用户、中文/空格路径），干净机器/独立操作者再现BLOCKED。** 不发布npm/Docker或稳定Release。

- 交付源码：`9ee79e7f8d65368618725b288b4fa696407b1a94`；实际模型核心`334b2c81569e100c8c7d727e0a9b9361ab530c5a`。五个被评测源码文件完全相同，见`security-lab/acceptance/final-verification.json`。
- 文件：`competition-submission/3.0/Agent_Canary_3_0_Community_Preview_9ee79e7f.zip`。
- SHA256：`313bb03fe5969a71a593b8157c9d90229e8b903f6601868b35fc17435cbc41c0`。
- ZIP119文件，SOURCE_MANIFEST核对118文件/0不一致（manifest不自包含）。正向清单排除旧商业license/dashboard/export/eval实现、Sponsor、密钥路径与node_modules；MIT、private3.0预览元数据，不修改付费用户/旧许可。
- 新临时正向清单构建：npm ci/build、93/93专项测试、离线self-test、audit全部exit0。`competition-submission/3.0/community-build-9ee79e7f.json`保留原始输出。
- **实际从ZIP重新解压**至普通用户中文+空格临时路径，独立执行npm ci/build/self-test均exit0；未从源码树借用node_modules/dist。见`security-lab/acceptance/artifact-install-final.json`与`artifact-install-run.txt`。
- 此免费包不是完整研究仓库镜像。完整攻防原始数据、Python一致性验证器、最终补充验收报告及所有历史证据从对应GitHub分支获取；包内CORE/FAIR报告指向这些仓库路径。不能把包里不存在的研究文件当作已随包交付。

复现构建（在对应Git源码工作树）：

```sh
python security-lab/build-community.py --node=<native node绝对路径> --npm-cli=<npm-cli.js绝对路径> --sha=9ee79e7f8d65368618725b288b4fa696407b1a94
python security-lab/verify-artifact.py --artifact=competition-submission/3.0/Agent_Canary_3_0_Community_Preview_9ee79e7f.zip --report=security-lab/acceptance/<新安装记录>.json
```

build脚本使用已验证2.0seed摘要、只写新目录/新文件，不覆盖历史ZIP；同名交付文件已经存在时会拒绝覆盖，复建请用干净源码克隆。verify脚本的Node/npm路径当前为开发机固定值，其他机器需配置相应路径后再执行；用户普通使用只需解压后`npm ci`、`npm run build`、`npm test`、`npm run self-test`、`npm run ai:console`。

Windows11/Node22.23.1/non-admin验收已完成；无独立新用户/干净VM/安装器证明。CI9ee79e7在Windows/Linux/macOS × Node20/22、package、Sponsor及Docker --help合计9/9成功，run38141548986；没有证明Linux/macOS从此ZIP完整交互或Docker中的模型攻防实验。旧PDF/视频对应9f00冻结，未冒称已同步为本轮最终材料。

普通root npm/Docker商业边界P1仍OPEN。免费正向清单仅隔离这个竞赛候选；正式普通包发布需要维护者确认商业/许可边界。
