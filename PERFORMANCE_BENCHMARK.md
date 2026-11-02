# Gateway 性能基准（M7）

## 当前短测：2026-10-25

Windows `10.0.26200` / x64 / Node `v22.23.1` / 32 logical CPUs；源码为 M7 起始 HEAD `ab9b03f1211443af3f905863113dd2b4a5c8ab0c`，本轮改动只涉及 CI 事件门禁、测试及报告。负载为进程内、只读 synthetic MCP callback，无网络或模型调用。未测试安装包吞吐，也不能据此证明长期无资源泄漏。

```sh
node --import tsx scripts/benchmark-gateway.mjs --iterations=1000 --concurrency=16 --rounds=3 --warmup=100 --output-root=<external-temp> --output=<external-temp>/gateway-benchmark.json
```

| 指标 | 实测 |
|---|---:|
| 正式请求 / 错误 | 3,000 / 0 |
| 吞吐三轮中位数 | 8,366.451 ops/s |
| 三轮 p50 / p95 / p99 中位数 | 0.941 / 1.709 / 2.028 ms |
| 三轮累计 Node CPU 时间 | 500 ms |
| 每轮 RSS 变化中位数 | +1,380,352 bytes |
| 每轮 heap 变化中位数 | -893,864 bytes |
| 证据链检查 | 三轮有效 |

原始 JSON：`%TEMP%/m7-audit-20261025-7d170b1d1a794767916d548e38678a28/gateway-benchmark.json`；SHA-256 `ec042c4af41641a474c92ba9e2c1f6d4fc6b887ff8bfc10ca05b22a309419bc2`。这是单主机短时采样；GC、调度与主机负载未隔离，不能直接用与历史结果的差值推断性能优化或回退。CPU 不含其他进程；RSS/heap 差值不是连续峰值或 Windows Handle 泄漏测量。

## 2026-10-13 历史结果

日期：2026-10-13
状态：**本机合成负载已测；不是安装包或端到端产品基准。**

## 方法

在 Windows 11 主机运行 100 次预热，再运行 3 轮，每轮 1,000 次 Gateway `mcp_tool` 调用，调用方并发 16。回调为进程内只读 `noop`，不访问网络、磁盘业务数据或外部服务。Gateway 内部仍按实现串行派发，因此该数字是这条 SDK 路径的微基准，不是 16 路并行服务吞吐量。

复现命令：

```sh
npm run bench:gateway -- --warmup=100 --iterations=1000 --concurrency=16 --rounds=3 --output=security-lab/evidence/m7-gateway-benchmark-2026-10-13-final.json
```

环境：Windows `10.0.26200`，x64，Node `v22.23.1`，32 个逻辑 CPU，物理内存约 31.2 GiB。原始逐轮结果见 [`security-lab/evidence/m7-gateway-benchmark-2026-10-13-final.json`](security-lab/evidence/m7-gateway-benchmark-2026-10-13-final.json)。

## 结果

| 轮次 | 吞吐 | p50 | p95 | p99 | CPU 用户/系统 | RSS 增量 | Heap 增量 |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 1,665.862 ops/s | 4.924 ms | 9.020 ms | 10.353 ms | 438 / 219 ms | +17.10 MB | +9.65 MB |
| 2 | 1,685.626 ops/s | 4.959 ms | 9.393 ms | 10.976 ms | 438 / 172 ms | +0.97 MB | -8.39 MB |
| 3 | 1,910.687 ops/s | 4.264 ms | 8.463 ms | 9.982 ms | 453 / 125 ms | +1.27 MB | +7.61 MB |
| 3 轮中位数/汇总 | **1,685.626 ops/s 中位数** | **4.924 ms** | **9.020 ms** | **10.353 ms** | 每轮 CPU 合计中位数 610 ms | 中位数 +1.27 MB | 中位数 +7.61 MB |

总计 3,000 次成功、0 次失败。每轮生成 2,000 个证据事件，三条证据链均有效。每轮结束时 `process.getActiveResourcesInfo()` 都报告 2 个 `ConnectWrap` 与 3 个 `PipeWrap`；这些是 Node 资源类别，包含运行器 I/O，不是 Windows 句柄计数，也不足以证明无泄漏。

## 解释范围

- 延迟按每轮 1,000 个调用统计；表中 p50/p95/p99 是三个轮次百分位数的中位数，不是把 3,000 个调用合并后重算的分位数。
- CPU 是 Node 进程累计用户态/内核态时间，不是全机 CPU 百分比。首轮 RSS 增加较多，后两轮增量较小；Heap 增量受垃圾回收影响，第二轮为负值。
- 这三轮只能作为短时基线。它们没有覆盖真实 CLI 子进程、桌面 UI、模型/API、网络、长期证据文件写入、磁盘空间耗尽或 24 小时资源趋势。
- 本结果不能外推到安装包、不同硬件或 Gateway 外的集成路径，也不能作为稳定性/无泄漏结论。
