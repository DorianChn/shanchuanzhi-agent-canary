## Summary

This PR records the second-round hardening and competition audit for Agent Canary. It keeps the MIT license, free SDK, CLI, and MCP server interfaces while adding fail-closed state handling and security regressions.

## Changes

- Bind signed WeChat Pay, Alipay, Epay, and VMQ callbacks to local merchant configuration, app/channel, local order, amount, currency, and paid state. Serialize notifications and make fulfillment idempotent.
- Reject damaged sponsor stores and signing keys without silently replacing them. Add atomic writes, bounded state locks, startup validation, restart recovery, and isolated manual-grant tests.
- Serialize concurrent token registry updates; bound JSONL reads; cap watcher memory and expose `close()`; pin Webhook DNS results and reject private/mixed destinations and redirects; fail closed for damaged config.
- Pin third-party GitHub Actions to immutable SHAs and pin/checksum the MCP publisher release.
- Add security test reports, technical highlights, demo instructions, and final verification evidence under `docs/competition/`.
- Update the locked `ip-address` dependency to 10.7.3. GitHub currently reports a medium Dependabot alert on `main` for versions `<=10.7.0` (patched in `10.7.1`); this PR branch resolves 10.7.3 and local `npm audit` reports zero vulnerabilities. The base-branch alert remains open until the fix is merged.

## Verification

- Root: `npm ci`, `npm run build`, `npm test`, `npm run pack:check`, `npm run verify`, `npm audit` passed. Root suite: 121 tests, 117 passed, 0 failed, 4 skipped on Windows.
- Sponsor: `npm ci`, `npm test`, `npm run smoke`, `npm audit` passed. Sponsor suite: 25 tests, 24 passed, 0 failed, 1 Windows-specific skip; demo smoke checks: 12/12.
- Combined Node tests: 146 total, 141 passed, 0 failed, 5 platform skips. `npm run demo:containment` reached `QUARANTINED` and blocked the subsequent guarded callback.
- Payment tests use synthetic keys, fake orders, and local HTTP only. No real payment API, account, business data, or production secret was accessed.

## Known risks and boundaries

- **P1 remains open:** the npm package and Docker build currently include licensed V2 compiled modules (`dist/eval`, dashboard, export, license). This PR does not change commercial delivery architecture or remove license checks. Do not treat this branch as release-ready until maintainers approve a compatible V1/V2 distribution plan.
- Existing pending sponsor orders from earlier versions may lack the new `currency` field and will fail closed. Review/approve any migration against backups and actual provider records before deployment; this PR did not read or change production records.
- Payment-provider behavior was verified with synthetic callbacks, not a live merchant account. Epay deployments differ; confirm the provider's current contract before enabling it. VMQ signed `reallyPrice` allows only the upstream collision-adjustment range of 9 fen.
- The 14 attack scenarios are programmatic signal simulations, not LLM red-team results. A dangerous first call before a signal, a call bypassing the Guard, and an already-started external action remain outside full protection.
- Local environment: Windows x64 / Node 22.23.1 only. Docker CLI is unavailable. Node 20, Linux, macOS, Docker, and GitHub Actions results remain unverified/skipped pending CI.

## Demo

```bash
npm ci
npm run build
npm run demo:containment
```

See [`DEMO_GUIDE.md`](DEMO_GUIDE.md), [`PROJECT_AUDIT.md`](PROJECT_AUDIT.md), [`SECURITY_TEST_REPORT.md`](SECURITY_TEST_REPORT.md), and [`FINAL_VERIFICATION.md`](FINAL_VERIFICATION.md).

No npm/Docker/MCP publish or merge is part of this PR.
