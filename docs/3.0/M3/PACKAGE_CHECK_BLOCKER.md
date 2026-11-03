# M3 package-check compatibility blocker

Date: 2026-10-23
Status: `BLOCKED_BY_SHARED_PACKAGE_CONTRACT`

## Minimal reproduction

From the M3 worktree, run:

```powershell
npm run pack:check
```

Observed result:

```text
Error: package smoke check failed: unexpected package file execution-isolation/gateway-adapter/gateway-adapter.mjs
```

The current package manifest exports `./gateway-adapter` to
`execution-isolation/gateway-adapter/gateway-adapter.mjs` and includes that
path in `files`. The existing `scripts/check-package.mjs` allows only
`LICENSE`, the two README files, `package.json`, and `dist/**`, so the
allowlisted public M2 export is rejected by the package smoke check.

This is present on the shared `feature/agent-canary-3.0` baseline, not an M3
change. At this checkpoint the baseline and M3 HEAD have identical Git blobs:

| Path | Blob |
| --- | --- |
| `package.json` | `c2399b1e81dc0d5a2893d9bfb1495bce95cc5f2b` |
| `scripts/check-package.mjs` | `48bb176838533c054a48608a17960cfd9a85dbc4` |
| `execution-isolation/gateway-adapter/gateway-adapter.mjs` | `7a05ed64300c6345222dff13a4e929a250646acc` |

## Ownership and required resolution

- **M2** owns the gateway adapter export target and implementation bytes.
- **M9** owns integrated package composition and must reconcile the package
  allowlist/smoke-check contract with explicitly exported owner files.
- M3 must not remove the M2 export, weaken the package check, or change another
  module's manifest/checker to make this run green.

Acceptance: the integrated package check passes while preserving the exact M2
export target and bytes, and while still rejecting undeclared package files.

## M3 test discovery

The current root `npm test` command does not list these M3-owned suites:
`test/onboarding.test.ts`, `test/codex-connection-check.test.ts`,
`test/m3-hook-contract.test.ts`, `test/security-center-route-m3.test.ts`, and
`test/packaged-owner-consumer.test.mjs`. They pass when invoked explicitly with
the exact M1/M2/M3/M5 worktree roots. The integrated test command/CI needs to
include them; M3 does not edit the shared package manifest from this lane.
