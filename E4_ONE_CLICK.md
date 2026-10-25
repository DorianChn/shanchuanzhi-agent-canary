# E4 一键自动测试

Windows 上双击 `scripts/一键E4自动测试.cmd`，即可自动安装锁文件指定的开发依赖（仅当缺少 `node_modules`），并依次运行构建、完整测试套件、包内容检查、E4 证据包和自检测试、合成 E4 报告与报告包验证。缺少 Python 时，脚本会下载 Python.org 官方 Windows embeddable 包到本次报告目录，并在运行前校验固定 SHA-256；不会全局安装或修改系统 PATH。各阶段独立运行；前一阶段失败也会继续执行后续自动检查，并汇总单独结果。完成后会自动打开结果报告。

结果保存在 `security-lab/e4-one-click-runs/<运行编号>/ONE_CLICK_RESULT.md` 和同目录日志中。脚本不会执行安装器、调用真实模型、启动/修改虚拟机或执行 GitHub 写操作。

所有本地自动化通过仍只表示 `automatedChecks: PASS`。它不会把 `productE4Accepted` 设为 true；真实模型工具调用、干净 VM 中安装/启动/卸载/重装产品、真实宿主副作用观察、独立复核与签名回执仍需在相应环境中完成。报告会将未执行的门槛标成 `BLOCKED` 或 `NOT_VERIFIED`，不会把它们记为通过。

在没有 Windows 桌面的环境，从仓库根目录运行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/Run-E4-OneClick.ps1
```
