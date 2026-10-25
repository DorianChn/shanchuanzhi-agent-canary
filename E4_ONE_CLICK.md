# E4 一键自动测试

Windows 上双击 `scripts/一键E4自动测试.cmd`，即可自动安装锁文件指定的开发依赖（仅当缺少 `node_modules`）、运行完整 `npm run verify`、执行 E4 证据包和自检测试、生成合成 E4 报告并验证报告包。

结果保存在 `security-lab/e4-one-click-runs/<运行编号>/ONE_CLICK_RESULT.md` 和同目录日志中。脚本不会执行安装器、调用真实模型、启动/修改虚拟机或执行 GitHub 写操作。

所有本地自动化通过仍只表示 `automatedChecks: PASS`。它不会把 `productE4Accepted` 设为 true；独立操作者安装/启动/卸载/重装产品、真实宿主和模型工具副作用观察、独立复核与签名回执仍需人工在干净隔离环境完成。

在没有 Windows 桌面的环境，从仓库根目录运行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/Run-E4-OneClick.ps1
```
