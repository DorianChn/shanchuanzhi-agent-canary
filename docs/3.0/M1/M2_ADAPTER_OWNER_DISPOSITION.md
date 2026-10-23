# M1 owner disposition: M2 Gateway adapter

Review date: 2026-10-23 (UTC)

## Decision

**APPROVE M2 PR #37 at exact public head `67428139e53c3f63a1101b4f94e84b291cbb1196`, limited to the M1 Gateway / M2 fixed-file-read adapter contract.**

This disposition does not close Issue #52 or approve product-host protection.

## Exact refs and review scope

- M2 PR #37: `feature/ac3-execution-isolation`, exact head `67428139e53c3f63a1101b4f94e84b291cbb1196` (OPEN / Draft at review).
- M1 Gateway reviewed in this worktree: `feature/ac3-security-core`, `6886d6eef3beb972bc8f4c797584b0f522483870`.
- Compared with the previously reviewed M2 head `099ad64e4a09330920cbd40847adec3fe631e91e`, the exact-head diff changes only the M2 Hook fragment/test and two M2 reports. It changes no M1 Gateway code and no M2 adapter code/API.

The reviewed package export `./gateway-adapter` resolves to `execution-isolation/gateway-adapter/gateway-adapter.mjs`; the package allowlist includes only this facade from the adapter directory, and its only export is `createSecurityGatewayHostAdapter`. The host composition requires the trusted host to supply the M5 router factory; it reserves the tools map, callback, and M1 capability provider for adapter-owned values.

## M1 / M2 protected-read contract

M1 issues an opaque capability only for a constructor-registered, non-sensitive file that passes the canonical workspace path and held-identity checks. The capability is bound to the exact tool name, operation, path argument, and registered resource. Verification rejects a different tool/path, extra argument, stale capability, closed Gateway, sensitive/decoy resource, or changed held identity.

M2 maps exact fixed tool/path pairs to these M1 capabilities. It rejects noncanonical fixed paths and unregistered call paths. Host dispatch performs the M1 capability preflight before entering the policy router. The M2 callback checks the exact bound call and same capability again, then invokes M1 `readFileWithCapability`; it does not fall back to a path-only host read. M1 routes that operation through normal Gateway policy/Guard and reads the already-held descriptor, with identity checks around the read.

The exact-head M2 host-adapter tests assert the safe fixed-read positive control and alias/stale-identity denial before router dispatch, approval creation, callback, or M1 read. These M2 tests use Gateway/router contract doubles. M1's own tests exercise a real temporary-file Gateway, assert sensitive-alias and replacement denials before its registered callback/file read/approval, preserve fixture bytes, and exercise a Windows directory-junction replacement during held read.

## Verification

- M2 exact-head product CI run `39866513817`: 9/9 jobs passed (Ubuntu, Windows, macOS Node 20/22, Docker, sponsor, and package-smoke jobs).
- M1 Windows / Node.js `v22.23.1`: `test/gateway.test.ts` plus `test/gateway-acceptance.test.ts` — 51/51 passed, 0 skipped, 0 failed. The Windows junction replacement test ran on this platform.
- `npm run build` — passed.
- `git diff --cached --check` — passed for this review document.

## Limits and remaining P0 gate

The M2 composition tests are synthetic contract-double tests. No first-party product host callsite consuming this adapter and the M1-bound identity was established by this review. The evidence does not establish a live M1/M5/product-host composition, production protected-read behavior, native Shell coverage, or OS-atomic path/operation locking. M1 rechecks path and held identity and reads from the held descriptor, but does not claim to eliminate a change-and-revert race between checks.

Keep Issue #52 **OPEN / P0 / NOT_VERIFIED** for first-party host consumption and the remaining end-to-end race/alias acceptance. This scoped approval is not evidence of actual secret exposure or a release acceptance.

## 2026-10-23 exact public head continuity review

**The scoped M1 owner approval above also applies to M2 PR #37 exact public head `1c050abace5af6e09b7b934730f2361b78f9d938` (OPEN / Draft).** This is an adapter-contract continuity review, not approval of native Shell or first-party host protection.

- GitHub comparison from the previously approved M2 head `67428139e53c3f63a1101b4f94e84b291cbb1196` to `1c050abace5af6e09b7b934730f2361b78f9d938` is one commit ahead. Its only changed files are `execution-isolation/codex/native-host-hook-evidence.json` and `execution-isolation/reports/NATIVE_SHELL_BYPASS_REPORT.md`; no adapter, package export, M1, or test file changed.
- Exact blob IDs at both M2 heads are identical for `execution-isolation/gateway-adapter/gateway-adapter.mjs` (`7a05ed64300c6345222dff13a4e929a250646acc`), `execution-isolation/gateway-adapter/security-gateway-adapter.mjs` (`5c1d461a4af0c840a7c2a93d0173ec1f6ad87ac8`), and `package.json` (`0e0fceffdc7e07a67b60173c46c6bc8ec29e7d3b`). The package maps `./gateway-adapter` to the reviewed facade (`package.json:40-44`); the facade exports `createSecurityGatewayHostAdapter` (`gateway-adapter.mjs:285`). The adapter reads the M1 capability methods (`security-gateway-adapter.mjs:85-96`), validates the exact bound call (`:165-201`), re-verifies before M1's capability-bound read (`:228-260`), and preflights before router dispatch (`:416-420`).
- The M1 worktree is at `e8be92d2d813ab2e9fe47d3ab6874439a6328441`. Its `src/runtime/gateway.ts`, `src/sdk.ts`, and `package.json` are unchanged from the reviewed M1 Gateway source at `6886d6eef3beb972bc8f4c797584b0f522483870`. The M1 host-only capability shape and methods remain visible at `src/runtime/gateway.ts:14-18,334-341`; the verifier and reader remain at `:288-297`.
- Exact-head PR workflow run `39884832091` completed successfully, with all 9 jobs successful.

The added evidence continues to classify the native Codex Shell as `UNPROTECTED / BLOCKED_NOT_VERIFIED`. No product-host adapter consumption, real protected user-file behavior, or OS-atomic path/operation guarantee was established. Keep Issue #52 **OPEN / P0 / NOT_VERIFIED**; the continuity approval is strictly for the unchanged M1 Gateway / M2 fixed-file-read adapter contract.


## 2026-10-23 M1 owner review — Issue #52 exact M2 head

**Decision: APPROVE M2 PR #37 at exact public head `1c050abace5af6e09b7b934730f2361b78f9d938`, narrowly for its M1 held-file capability adapter contract. Keep Issue #52 OPEN / P0 / NOT_VERIFIED.**

- PR #37 remains OPEN / Draft. The exact head is one commit beyond the previously accepted adapter head `67428139e53c3f63a1101b4f94e84b291cbb1196`; the delta changes only `execution-isolation/codex/native-host-hook-evidence.json` and `execution-isolation/reports/NATIVE_SHELL_BYPASS_REPORT.md`. Package/API/adapter/test blobs are unchanged: `package.json` `0e0fceffdc7e07a67b60173c46c6bc8ec29e7d3b`, public facade `gateway-adapter.mjs` `7a05ed64300c6345222dff13a4e929a250646acc`, implementation `security-gateway-adapter.mjs` `5c1d461a4af0c840a7c2a93d0173ec1f6ad87ac8`, and adapter tests `3b3819aeba755ce8a39040936b82e2e5e47e65db`. Exact-head CI run `39884832091` completed with all 9 jobs successful.
- Current public M1 PR #43 head is `16084bb6362138eb7ebe1a323130d4609321c30c`; its Gateway source blob is `2be0a1a0ab6a324f0426cf71308bb62d1170957c`, unchanged from the previously reviewed source. In `src/runtime/gateway.ts:32-40,56-68,103-148`, M1 keeps the registered descriptor and dev/ino in a private resource/capability record, issues only for a safe registered file, and checks the exact tool/path plus current named and held identity. At `:288-297,334-341`, the host-only verifier and reader route through normal M1 dispatch using the registered path.
- At exact M2 head, `security-gateway-adapter.mjs:85-96,108-146,165-201,228-264,416-420` reads those M1 methods, requests a capability for each fixed tool/path, validates the exact call, re-verifies the same capability, uses M1's capability-bound reader, and preflights before router dispatch. There is no path-only read fallback. This is evidence that the adapter consumes the M1 contract when given the real M1 Gateway; it does not prove any first-party host actually supplies that object.
- M2's exact-source report says its adapter tests use M1/M5 contract doubles; the synthetic held-identity case is not the M1 runtime. No tests were rerun for this owner review. The current M2 report also records that the existing Console demo dispatches directly through M1 and no product-host callsite imports the M2 adapter; the published package allowlist does not include the implementation module.
- M1 reads through its already-held descriptor and checks named/held identity before and after the read (`src/runtime/gateway.ts:207-218`). M1 explicitly says these checks narrow/detect races but are not an OS-wide atomic path/operation transaction. The adapter introduces no path reopen in this call path, but change-and-revert behavior, a live M1/M5/product-host composition, product OBSERVE protected-read behavior, and native Shell enforcement remain NOT_VERIFIED.

This exact-head owner decision accepts only adapter-to-M1 API compatibility. It does not close Issue #52, establish product-host integration, or claim OS-atomic TOCTOU protection or exposure/non-exposure of real user secrets.

## 2026-10-23 M1 workspace-local alias regression

**Result: the current M1 Gateway source denies a workspace-local directory symlink/junction alias to a registered sensitive fixture. No production source change was needed. Issue #52 remains OPEN / P0 / NOT_VERIFIED.**

- On the M1 worktree based on `e1e3d4fed83c853328d5e2720ac89a7be29c3571`, `src/runtime/gateway.ts:59-68` rejects a registered resource whose canonical path differs from its requested path and opens only a regular, non-link file with no-follow semantics. `:103,121-148` rechecks the held identity and only issues/verifies a capability for the exact safe registered path and call. `:289-297` routes capability reads through that verifier and normal M1 dispatch.
- Added `test/gateway.test.ts:117`, using a temporary protected fixture and an actual Windows directory junction (the test uses a directory symlink on non-Windows platforms). The fixture confirms the alias resolves to the protected bytes; M1 rejects alias registration, refuses a read capability for both the sensitive file and alias, and rejects replay of a safe-file capability with the alias path before the synthetic host callback. The direct M1 path also denies both sensitive original and alias; the alias denial creates no approval or `RUNNING` event, Guard stays SAFE, and the protected fixture bytes/hash remain unchanged. A valid safe-file capability remains a positive control.
- Windows / Node.js `v22.23.1`: targeted alias case passed (1/1); complete `test/gateway.test.ts` passed (37/37, 0 skipped, 0 failed). `git diff --check` passed before recording this result.
- This is M1 Gateway coverage with a synthetic callback wrapper and temporary data. It is not first-party product-host, real-user-secret, native Shell, or OS-atomic change-and-revert race evidence. It does not establish whether an unreviewed OBSERVE host path bypasses M1. Keep Issue #52 open pending that product-host evidence and the broader acceptance criteria.
