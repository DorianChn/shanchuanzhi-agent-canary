# M9 exact-source composition snapshot — 2026-10-23

This snapshot records the source revisions pinned by the M9 composition workflow. The workflow checks out each source independently and validates the checked-out SHA before running the focused owner regressions and M9 composition tests.

| Module | PR | Exact source SHA | M9 coverage |
| --- | --- | --- | --- |
| M1 Gateway | #43 | `a5eff766ebe041bc2c6cc13758827d5a96205de9` | Held-Gateway regression and synthetic protected-read composition |
| M2 isolation | #37 | `099ad64e4a09330920cbd40847adec3fe631e91e` | Package build, tarball facade, package policy and synthetic composition |
| M3 onboarding | #33 | `fcaa24f8479c7072da0a51e96100ddfb3b2774c8` | Build, focused Hook/onboarding regressions, fail-closed trusted dependency seam, and synthetic fixed-read host |
| M4 desktop security center | #34 | `6d5b05b4ca634dd5727b62f621f783f8e56586b5` | Build, `runtime-console` regressions and exact-source adapter redaction check |
| M5 policy | #47 | `e6bb5cfaf5e3a55497ab300da3bf14bbb4b4b3d2` | Risk-policy regression and synthetic router composition |
| M6 E4 | #38 | `ef4679b276a90767bb1a6d7bd852aadc45b2d1cb` | Bundle verifier and Auto E4 lifecycle regressions |
| M7 reliability | #39 | `868842b1b7d76cf94a8d84a5f76c6acd4ca67f50` | Package contract and positive-control regressions |
| M8 open-source product | #40 | `72b4aab0fb5cb2dd4cd3b75ee8a73ad22dd001db` | Hook provenance, LF checkout and sanitized JSONL regressions |

## Owner-review boundaries

- M1 Issue #52 comment `6349691761` approves the exact M2 source above for the M1 Gateway/M2 adapter API contract only. It does not accept a first-party host integration or TOCTOU protection.
- M1 Issue #72 comment `6347268881` reviewed M3 source `27d4a20a20894c7b779edf68d8bf79685bc0e69b` for three Hook-related blobs only. M9 checks those same blobs remain unchanged in the current M3 source; this is not an M1 review of the newer M3 Console route or its tests.
- M6 Issue #59 comment `6346660246` reviewed an M8 test hunk and the M6 lifecycle contract at M6 source `2cebabc81d7908c04ddfa10378fa1d3427b92cf4`. The current M6 source is newer; the old source remains an ancestry check, not acceptance of every change in the current M6 head.
- M6 exact-head hosted CI for `ef4679b276a90767bb1a6d7bd852aadc45b2d1cb` is green across its 11 checks. This does not establish installer, clean-VM, real-model or external E4 behavior.

## Evidence limits

M4 coverage verifies the exact desktop adapter's redacted snapshot shape and conservative `UNKNOWN` values using synthetic input. The M9 protected-read composition also uses test fixtures and explicit adapters. These checks do not prove the first-party product host wires M1's held-file capability, M2's public facade and M5's router into a live execution path. They do not establish OS-atomic or concurrent TOCTOU safety. Issue #52 remains OPEN / P0 / NOT_VERIFIED until that product-host evidence exists.

The M3 `fcaa24f` source exposes typed, construction-time seams for the M2 facade and M5 router. The exact-source M9 composition injects the packed M2 facade and M5 implementation with the held M1 Gateway, verifies the fixed safe-read positive control, denies alias and replaced-path controls before another M5 callback or M1 read event, leaves approval queues empty, and checks fixture SHA-256 values. This remains synthetic API composition; it is not a live product-host or OS-atomic TOCTOU acceptance.

The M6 source-checkout E4 tests do not prove a built installer, clean-VM lifecycle, real-model execution or independent external E4 validation.
