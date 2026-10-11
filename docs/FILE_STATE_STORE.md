# Guard 本地状态持久化

`createContainmentStateStore()` 仍是进程内 Map。新增 `createFileContainmentStateStore()` 是可选的本地持久化适配器，不改变现有 CLI 默认配置。

```ts
import {createAgentGuard, createFileContainmentStateStore} from '@dorianchn/agent-canary';
// 路径必须由可信宿主提供，父目录必须已经存在且由可信操作者控制。
// 首次部署时单独执行一次 createFileContainmentStateStore(path, {initialize: true})。
const store = createFileContainmentStateStore(absoluteStateFile);
const guard = createAgentGuard({principalId: trustedIdentity, stateStore: store});
```

不要在每次重启时设置 `initialize:true`。默认缺失、损坏、超限或不可读文件均报错；Guard 遇到读写异常会保持隔离。构造函数报错时，宿主必须中止启动，不能换成空 Map。

## 边界与维护

- 文件仅保存隔离 scope，不保存工具参数、Token、密钥或客户资料。默认最多 1024 scope、256000 字节；不同会话的 principal 必须由可信宿主指定。
- 写入通过独占锁、重新读取最新状态、临时文件与原子替换完成。普通并发写入不会丢失其他 scope。读取遇到活动写锁时拒绝并使 Guard 隔离，不自动重试放行。
- 进程异常退出可能遗留 `.lock`。人工确认所有相关写进程已停止、备份并校验状态后再恢复。软件不会自动删除未知锁或重建身份。
- `store.reset()` 是可信管理接口，不是模型工具。重置共享状态不会自动解除已经在内存锁定的 Guard；不要用 AI verdict 驱动重置。
- 拒绝符号链接文件及重定向父目录。父目录必须避免非可信用户写入；它不是抵御管理员、恶意同机用户或所有文件系统 TOCTOU 的沙箱。
- POSIX 创建模式为 0600；Windows 实际访问权仍由父目录 ACL 决定。没有验证断电持久性、网络文件系统或分布式事务。
- 状态读取与工具执行之间没有全局原子事务；已开始的外部操作不能被撤销。仍须将真实回调接入 Guard/Router。

测试：`node --import tsx --test test/file-state-store.test.ts`，覆盖重启、损坏、锁竞争、四个子进程并发写入、容量、scope 原型属性与受保护调用拒绝。
