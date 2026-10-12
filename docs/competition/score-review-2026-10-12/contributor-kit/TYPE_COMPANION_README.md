# 冻结 Community SDK 类型补充

此包只提供类型及贡献者起步检查，不修改现有JS或运行时。原Community ZIP不含dist/sdk.d.ts，原始直接类型消费失败仍是FAILED；补充包是透明的临时接入途径，不把原包缺陷写成修复。

1. 下载并解压冻结Community包到新目录，npm ci、npm run build。
2. 将本包解压到同一Community根目录：仅新增contributor-review目录。若该目录已存在，请先选新解压目录，勿覆盖自己的成果。
3. 从Community根执行：
    node contributor-review/kit/verify-types.mjs .
    node node_modules/typescript/bin/tsc --noEmit --strict --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext contributor-review/kit/typed-host-derived.ts
    node contributor-review/kit/check-template.mjs --root=.
4. 九项真实fixture断言与类型消费只证明这些SDK接入路径，同机不算E4，不是原生Agent或模型实验。

SDK JS完整SHA：f55f0ecab402d44ed3286cf76f1bf059d5adc6262dd6621227e9748d434a57f5。不匹配时拒绝复用类型；不要改manifest让检查过关。校验还包含全部33个JS、33个源码TS、锁文件和tsconfig，避免仅SDK入口不变而叶子模块变化。摘要检查只在校验时比较字节，不是执行锁、OS沙箱或第三方认证。

包内类型由锁定编译器从策展Community源码派生，MIT原许可附LICENSE。无支付/生产数据/模型调用。

三种版本须分开：产品3.0候选、package.json旧CLI版本1.2.7、policy_version gateway-3.0-alpha.1。正式npm3.0、稳定插件loader/协议、长期ABI承诺均未发布。源仓普通sdk入口和策展Community额外导出不同，本补充仅针对后者。
