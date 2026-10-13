# API Contracts — M1 Security Core

This file records the M1-owned Guard and Gateway contracts implemented on
`feature/ac3-security-core`. It documents existing behavior; it does not add a
runtime API. Gateway close lifecycle semantics are implemented by
`f15fdcfaeed1adaa8ad1339f1e1d07d07bce07d9`.

Commit `46af1f19344dffe93a30817c4805eec0c6c673fe` changes only the Hook
interruption test harness to make its synthetic child interruption race
deterministic. It is not a product API or policy change.

## Guard quarantine notifications

The public in-process Guard surface is:

```ts
subscribeQuarantine(listener: () => void): () => void
trip(input: TripInput): TripResult
```

The notification contract is:

- A Guard latches its local state to `QUARANTINED` before notifying observers.
  A `trip()` transition notifies synchronously, before shared-state persistence,
  audit-event writes, credential-revocation work, or alerts.
- Each registered listener is called at most once for a quarantine epoch. A
  repeated `trip()` while the Guard is already non-`SAFE` does not notify again.
  After a host reset, a later transition to quarantine starts a new epoch and
  notifies the listeners still subscribed.
- A listener receives no arguments. An observer exception is swallowed and
  does not prevent later observers from running or undo the quarantine latch.
- Subscribing to a Guard that is already quarantined calls the new listener
  synchronously during subscription. The returned disposer is idempotent.
  A non-function listener throws `GUARD_QUARANTINE_LISTENER_INVALID`.
- Notifications belong to one Guard object in one process. A shared state store
  is not a cross-instance or cross-process event channel. A separate Guard can
  observe shared quarantine when it reads state or subscribes, and then latches
  and notifies its own observers synchronously.

Because notification is synchronous, listeners should perform bounded local
containment actions and must not depend on later persistence or alert work.

## Gateway Guard subscription

`createTrustedExecutionGateway()` subscribes to the supplied Guard before it
returns the runtime. A missing, throwing, or non-function subscription
disposer fails construction with the fixed error
`GATEWAY_QUARANTINE_SUBSCRIPTION_FAILED`; any resource descriptors already
opened by that construction attempt are closed best-effort before the error is
returned. A quarantine notification aborts the active execution controllers
registered with that Guard instance. It does not forcibly terminate arbitrary
host callbacks.

## Gateway `close()` lifecycle

`runtime.close(): Promise<void>` has the following order and guarantees:

1. On its first call, it synchronously marks this runtime closed and clears its
   pending approvals. New dispatches and approvals cannot begin work through
   this runtime after that lock is set.
2. It creates and publishes one memoized close Promise before invoking abort
   listeners or the Guard subscription disposer. Synchronous re-entry from
   either path receives that same Promise.
3. It aborts this runtime's active execution controllers.
4. It replaces the stored Guard disposer with a no-op, then invokes the saved
   disposer once. A disposer exception is swallowed so resource cleanup still
   proceeds.
5. It waits for the serialized Gateway work tail already queued when close
   begins to settle before closing held resource descriptors. Queued work and
   approvals observe the closed state and cannot invoke their tool callbacks.
6. It attempts to close every held resource descriptor, even if an earlier
   close fails. Each descriptor is marked invalid before its close attempt, so
   a repeated close does not retry or double-close it.
7. If every descriptor closes, the shared Promise resolves. If one or more
   close attempts fail, it rejects with only
   `Error("GATEWAY_RESOURCE_CLOSE_FAILED")`; the underlying error, path, and
   cause are not attached or exposed.

Every concurrent, repeated, or synchronously re-entrant `close()` call returns
the exact same Promise and therefore the same resolution or rejection.

## Enforcement boundary

These guarantees apply to operations routed through the controlled Gateway and
to callbacks that honor their supplied `AbortSignal`. The signal is cooperative:
the Gateway cannot force-stop a callback that ignores it or roll back external
effects already performed by that callback. This contract does not claim to
protect native shell, file, or network operations that bypass the Gateway.

## Contract regression coverage

The Guard notification lifecycle is covered by
`test/containment.test.ts`. Gateway subscription failure, quarantine abort,
close re-entry and Promise identity, queued work and pending approval, and
resource-close failure behavior are covered by `test/gateway.test.ts`.
