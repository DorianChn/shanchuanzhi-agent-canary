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
