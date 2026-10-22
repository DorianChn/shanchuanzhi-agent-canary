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
registered with that Guard instance, clears pending approvals, and advances a
shared Gateway invalidation epoch. Each dispatch captures the current epoch at
admission. Queued work and an asynchronous approval review admitted before a
quarantine transition are denied if they resume after that transition, even if
a host later resets the Guard. A pending approval created before quarantine is
consumed and cannot be revived by reset. Gateway instances created with the
same Guard object share the session execution queue and controller registry.
Regressions in `test/gateway.test.ts` cover a gated active callback plus a
queued sibling Gateway write, a pending approval across reset, and an
interrupted approval review across reset. These checks use one Guard object in
one process. They do not forcibly terminate arbitrary host callbacks or
broadcast to another Guard instance or process.

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

## Held-file read identity checks

Gateway file resources are opened once during construction. The constructor
checks the configured path and compares its `lstat` identity with the opened
descriptor's `fstat` identity before retaining the descriptor. Capability bind
and verification check the exact registered path, link count, resolved path,
and held descriptor identity. The serialized file read repeats those checks
immediately before I/O and after the read. File bytes are read only from the
already-held descriptor; a pathname or directory-junction replacement cannot
redirect that read to the replacement object's descriptor. A replacement that
is still observable after the read causes failure and quarantine, and its bytes
are not returned.

These checks do not create an OS-wide atomic transaction between pathname
validation and reading. Node.js on Windows does not expose `O_NOFOLLOW`
(`fs.constants.O_NOFOLLOW` is undefined in the tested Node 22.23.1 runtime), so
the open flag is omitted there; the identity checks and held-descriptor read
remain in force. A path change that is introduced and reverted entirely between
the checks is not reported as an atomic pathname revocation. The Windows
junction regression replaces a workspace directory at the `readSync` boundary
and verifies that the call fails, returns no content, and leaves the outside
fixture SHA-256 unchanged. It does not prove behavior for every filesystem or
claim general kernel-level path locking.

## Contract regression coverage

The Guard notification lifecycle is covered by
`test/containment.test.ts`. Gateway subscription failure, quarantine abort,
close re-entry and Promise identity, queued work and pending approval, and
resource-close failure behavior are covered by `test/gateway.test.ts`.
