# M9 M1 source-pin evidence — 2026-11-03

## Current exact source candidate

The M9 manifest candidate pins M1 to PR #170 head `44aa316ca08cc90cc613db0459810524d99e4d1f` on `shanchuanzhi/m1-held-handle-m9-20261103`. PR #170 merged into `feature/ac3-m1-mount-boundary` as `6692192c539108da4e65d34081fe6bd78a94af5b`; its exact PR head remains an ancestor of that merge. The pinned tree is `1d6da59d1f30035f93a1d894708fd170f5992f48`.

## M9 delivery-source alignment — 2026-11-03

The M9 manifest pin alone did not update M9's delivered Gateway files: before this follow-up, its `gateway.ts` reopened a registered path by absolute path after validating M1's secure relative handle. That left the composition manifest and shipped source at different security revisions. The current M9 candidate now carries the exact M1 #170 versions of `src/runtime/gateway.ts` and `src/runtime/secure-file.ts` (blob IDs `f4489c44a9ba7c00cad09270424a6871a28ccae5` and `bbedd8906dbbf46967ea2218ed6152471703d6d4`). Reads and registration fingerprinting use the same OS-relative no-follow handle.

`test/m9-cross-module-composition.test.mjs` now checks that both delivered files byte-match the independently checked-out M1 source at the manifest SHA. `test/m9-security-composition.test.ts` also fails if the pinned held-file capability API is absent; it no longer skips the security case when M9 drifts behind M1. The direct held-handle hard-link regression installs its synthetic alias from a separate OS process.

On the Windows author machine, `npm run verify` passed after the source alignment: build succeeded, 602 tests ran (583 passed, 19 platform skips, 0 failed), and package smoke passed for 111 files. This includes the M9 security-composition test. The new exact-source comparison runs in the M9 cross-module workflow and is still pending for this candidate; no post-change hosted result is recorded here.

These changes establish source alignment only. They are not independent product E4, an installed-host result, or proof of an OS-wide atomic path operation. Keep Issue #52 and E4 open until their separate acceptance evidence is complete.

PR #170 changes M1 registration and reads to use the same OS-relative no-follow handle, removing the second absolute-path file open. It preserves path-binding checks, content HMAC, size bounds, and fail-closed cleanup. Its regression suite includes a no-absolute-open assertion, held-object reads after hard-link replacement, a protected hard-link denial through the packaged Console, and a POSIX parent-symlink race at the secure relative-open boundary.

Verification for the exact M1 PR head:

- CI run [41555470832](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/41555470832) passed the Windows, Ubuntu, and macOS Node 20/22 matrix, Docker build, sponsor smoke, and package smoke.
- Windows wrapper and Community package evidence run [41555470677](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/41555470677) passed its Ubuntu/Windows wrapper regressions and Windows Community package build/evidence upload.
- Windows local `npm run verify` passed: build, 565 passing tests, 19 platform skips, and package smoke for 111 files.
- M9 exact-source composition run [41556895068](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/41556895068) passed on Ubuntu and Windows for M9 source head `c2aa22016cb920a3df6a37259c44191a3de8938f` with the exact M1 PR #170 pin above.

## Previous M9 source pin

At prior M9 source commit `58320b795568b387850bae8b1c19e9a6e86c8887`, the manifest pinned M1 to PR #152 head `b08078b7f81589e6649d9a855c2ae18d802af9ca` on `feature/ac3-m1-mount-boundary`; its tree was `68e142fc8df4833dea627f08cf2f92d4ab0df096`. The earlier PR #149 head `5eaf323b4188dc4228eadd099d2e27af3e61ae79` was an intermediate head, not the previous M9 source pin. PR #149 merged as `0831ed4979ae4d9f4c6698296726732d427fb7ae`; PR #151 then merged the exact-source pin as `301d169d5ae586f14a1a7acf9ac2d5c3784419e7`. The PR #152 source retained the held-handle change and added POSIX mount-crossing checks.

- Git ancestry checks recorded in the previous evidence confirmed PR #149 merge `0831ed4` and PR #151 merge `301d169` as ancestors of PR #152 pin `b08078b`.
- M9 exact-source composition run [41526853771](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/41526853771) passed on Ubuntu and Windows for the earlier manifest.
- The prior M9 pin workflow on PR #151 passed 21/21 checks; the earlier M1/M3/M5 tuple passed hosted composition on Ubuntu and Windows in run [41508666850](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/41508666850).

## Evidence limits

The recorded M1 and M9 checks establish cross-platform source-level CI, exact-source composition, and the Windows package build. They do not establish independent product E4, clean-VM installer acceptance, protection for native Shell or arbitrary callbacks, or an atomic operating-system path-resolution guarantee. Issue #52 remains open for the remaining host and TOCTOU acceptance requirements.
