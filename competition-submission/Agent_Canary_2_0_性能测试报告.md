# 性能与资源

原始证据：evidence/v2-performance.json 与 v2-summary.json。2000 次本地虚拟 Router 调度（含审计）和 50000 次 HMAC 来源插入的实际值见 JSON。记录容量 256，不存原文。

实际模型 latency / Token usage 逐请求留档；缺失 usage 不估算。零付费云请求不等于本地计算无成本。RSS 单次前后值不能证明内存泄漏不存在，长期生产稳定性 NOT VERIFIED。

60 秒受控压力实际完成18170次并发批次 callback、181700 次来源插入，保留256/256，末尾隔离后callback未再执行。首末RSS79,912,960/128,888,832 bytes，heapUsed23,437,312/22,046,296 bytes；RSS上升，不能推断长期无泄漏。见 evidence/v2-bounded-stability.json。纯Guard增量开销 NOT MEASURED，Router合计微基准不等于纯GuardOverhead。
