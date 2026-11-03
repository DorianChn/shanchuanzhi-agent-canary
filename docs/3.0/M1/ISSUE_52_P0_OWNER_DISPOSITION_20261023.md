# M1 owner disposition — Issue #52 P0 exact-source closeout audit

Review date: 2026-10-23 (UTC)

## Decision

**No M1 runtime change is supported by the current evidence. Keep Issue #52 OPEN / P0 / NOT_VERIFIED.** M1 has a held-file identity capability and an execution path that reads through the registered descriptor. The public product path does not currently consume that capability for an Agent/user-file OBSERVE read. That missing callsite is outside M1's owned files; synthetic M9 composition and hosted CI do not close it.

This review does not approve product protection, native Shell enforcement, or an OS-atomic path/operation guarantee. No real user file or secret was read.

## Exact source and CI references

- M1 PR #43 is OPEN / Draft at public head `a737dcac3fb05cb41c3f6108aa46fb5894f95e5a`. Exact-head CI run `39896029707` passed all 9 jobs; the separate M1 file-store concurrency run `39896029773` passed both jobs. No tests were rerun in this documentation-only disposition.
- M9 PR #36 is OPEN / Draft at public head `56b1d0873e7a2b3d61ab588b6b1c4cf3814ec334`. Its exact-source composition run `39895149659` passed on Ubuntu and Windows; the Ubuntu composition suite reports 13/13 passing. The composition job checked out M1 `e1e3d4fed83c853328d5e2720ac89a7be29c3571`, M2 `1c050abace5af6e09b7b934730f2361b78f9d938`, M3 `8104ab30eed5245eb61eeebb1075b915e8557b46`, M4 `ec12e53ca881e106f5666f6b2b9b586a56d485b2`, M5 `8d1b832f46db363dd8ba5cdd7d573baa89e9a46d`, M6 `3578e7ba10b2fd160efa0e4683aba863c666db8a`, M7 `1448a46ce43a2211e14be70fcd9c256b21d74c1f`, and M8 `854de50d94637caf3f334de7d28dcdcaddd88f9f`.
- M9's M1 commit is an ancestor of current M1 head `a737dca`. The `src/runtime/gateway.ts` and `src/security-router.ts` blobs are identical at both M1 commits (`2be0a1a0ab6a324f0426cf71308bb62d1170957c` and `183d1f8443498568e9d49143e746f0bc274faa2c`). M9 therefore exercised the same M1 implementation blobs, but did not pin the exact current M1 commit or its newest M1 test/documentation blobs.

## M1 held-file path and boundary

- `src/runtime/gateway.ts:56-68` canonicalizes constructor-registered paths, rejects links/escapes and non-regular or multiply-linked files, opens with no-follow semantics, and records the opened device/inode.
- `src/runtime/gateway.ts:121-145` issues an opaque capability only for a registered non-sensitive file. Verification binds it to the exact tool, operation, path argument, path, Gateway instance, and still-bound held resource.
- `src/runtime/gateway.ts:207-218` rechecks the named path and descriptor before and after the read and reads bytes only from the held descriptor. The implementation explicitly narrows and detects races; it does not claim an atomic OS-wide path/operation transaction.
- `src/runtime/gateway.ts:288-297,334-341` exposes host-only verify/read methods; a successful read dispatches the capability-bound registered path through the normal M1 Gateway.
- M1 `createSecurityToolRouter()` is a generic path-callback wrapper. With `verifyRealPaths: true`, `src/security-router.ts:52-87` rejects generic file callbacks as `path_execution_not_pinned` before callback dispatch. That wrapper is intentionally not the held-capability consumer. The reviewed M2 adapter is the separate path that verifies and forwards the M1 capability to `readFileWithCapability`; it has no path-only fallback.
- In the exact M5 source used by M9, OBSERVE enables real-path checks independently of the optional flag (`src/risk-policy.ts:126-130` in the M5 pin). M9's synthetic composition asserts a safe registered positive read and denies sensitive/alias cases before the adapter callback. This does not establish an installed host callsite.

## Product-host gap and owners

M9 run `39895149659` records the following exact limits:

- The injected M3/M1/M2/M5 case reads only a fixed synthetic temporary marker and exercises test-supplied dependencies. It is not a user-file or product-host read.
- The ordinary M3 CLI path is separately tested without dependency injection and returns sanitized `UNKNOWN` before protected-read probe, Gateway, router, or callback work because its package bootstrap does not provide the required M2/M5 public subpaths.
- M4 consumes only `GET /api/security-center` status and has no protected-read action/callsite. It reports first-party OBSERVE protected-read as `NOT_VERIFIED`.

Ownership and next acceptance steps:

1. **M3 owns CLI/bootstrap composition.** Select the shipping host/build and wire its ordinary bootstrap to the exact public M1 Gateway, M2 adapter, and M5 policy-router contracts. Remove no fail-closed UNKNOWN behavior until exact package self-reference/export tests prove the dependencies are present.
2. **M4 owns the desktop consumer.** If the desktop is intended to perform protected reads, add and document an explicit first-party action path; the current status-only GET is not that path.
3. **M2/M5 own the adapter/policy callsites.** Preserve exact M1 capability verification and capability-bound read forwarding. Do not substitute a generic path callback or treat UI status as authorization.
4. **M1 owns the Gateway identity API.** Review the selected exact host callsite against the held descriptor contract. Acceptance needs a safe registered-file positive control and path-only, sensitive path, symlink/junction, hard-link, replacement, and missing-capability negative controls before approval/callback, with fixture bytes and hashes unchanged, plus exact-head CI.
5. Keep change-and-revert / OS-atomic TOCTOU claims separate. Current descriptor reads prevent an observed path swap from redirecting the held read, but pre/post identity checks are not an OS-wide atomic transaction.

## M0 CI run 39897597172 and Issue #32 fixture

This run is unrelated to Issue #52's OBSERVE file-read boundary:

- Run `39897597172` evaluated M0 PR #30 head `8202a83e78c0600d6b6f6196bd08c63bda18214b`; that commit changes only `docs/3.0/TECHNICAL_STATUS.md`.
- Windows Node 20 job `120231512420` failed the older test named `native lab wrapper interruption emits no allow decision and invokes no tool callback` at `test/agent-hook.test.ts:54:53`, with `false !== true`. The run summary is 321 passed, 1 failed, 4 skipped; package-smoke was skipped. The failed assertion is the synthetic child-entry marker check; later no-output assertions were not reached.
- The test blob in the M0 run is `1ecb3ee8b45f1fbe942a25bcd5ce696f82534601`, while current M1 PR #43 uses test blob `82ca4662e0a6c4269011ff8eba9470f2a26ccc39` and a revised asynchronous interruption fixture. The current fixture waits for the synthetic marker before interrupting the child and checks empty output/logs; it explicitly cannot observe a native host callback.
- The exact M0 commit does not modify M1 Hook source, wrapper, or test. The failure is a recurrence of the historical synthetic fixture issue, not evidence of an OBSERVE read, an emitted allow, or callback execution. Keep root cause **UNKNOWN** and Issue #32 **OPEN / P1**. Do not rerun this failed CI merely to seek a green result or weaken the assertion.

## Final status

M1's reviewed capability/API path is available for a trusted consumer and contains no M1-local fail-open defect demonstrated by the current evidence. M9 provides synthetic composition evidence only. The production host/build/call path that consumes held identity is still missing or unverified, so Issue #52 remains **OPEN / P0 / NOT_VERIFIED**. No Issue #52 or #32 closure is requested by this disposition.
