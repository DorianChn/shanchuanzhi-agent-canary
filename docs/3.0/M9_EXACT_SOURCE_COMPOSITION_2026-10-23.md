# M9 exact-source composition snapshot — 2026-10-23

This snapshot records the source revisions pinned by the M9 composition workflow. The workflow checks out each source independently and validates the checked-out SHA before running the focused owner regressions and M9 composition tests.

| Module | PR | Exact source SHA | M9 coverage |
| --- | --- | --- | --- |
| M1 Gateway | #43 | `c67b15f76973a2333ce523dd58d5b7439ab40702` | Held-Gateway regression and synthetic protected-read composition |
| M2 isolation | #37 | `099ad64e4a09330920cbd40847adec3fe631e91e` | Package build, tarball facade, package policy and synthetic composition |
| M3 onboarding | #33 | `aa6f1a5f0ee410b3c883fbe0c60e89020273966a` | Exact M3 runtime to M1 Gateway composition passes with synchronous Guard quarantine subscriptions |
| M4 desktop security center | #34 | `6d5b05b4ca634dd5727b62f621f783f8e56586b5` | Build, `runtime-console` regressions and exact-source adapter redaction check |
| M5 policy | #47 | `c9003234913a0ccccca56fe2a36fb1ce3dacb2de` | Risk-policy regression; deterministic DENY skips optional review, approval and execution callbacks |
| M6 E4 | #38 | `ef4679b276a90767bb1a6d7bd852aadc45b2d1cb` | Bundle verifier and Auto E4 lifecycle regressions |
| M7 reliability | #39 | `868842b1b7d76cf94a8d84a5f76c6acd4ca67f50` | Package contract and positive-control regressions |
| M8 open-source product | #40 | `72b4aab0fb5cb2dd4cd3b75ee8a73ad22dd001db` | Hook provenance, LF checkout and sanitized JSONL regressions |

## Owner-review boundaries

- M1 Issue #52 comment `6349691761` approves the exact M2 source above for the M1 Gateway/M2 adapter API contract only, with historical M1 review base `a5eff766ebe041bc2c6cc13758827d5a96205de9`. Current M1 `c67b15f76973a2333ce523dd58d5b7439ab40702` descends from that base; the comment does not accept the new M1 read implementation, a first-party host integration or TOCTOU protection.
- M1 Issue #72 comment `6347268881` reviewed M3 source `27d4a20a20894c7b779edf68d8bf79685bc0e69b` for three Hook-related blobs only, with the same historical M1 review base. M9 checks those same blobs remain unchanged in the current M3 source; this is not an M1 review of the newer M3 Console route or its tests.
- M6 Issue #59 comment `6346660246` reviewed an M8 test hunk and the M6 lifecycle contract at M6 source `2cebabc81d7908c04ddfa10378fa1d3427b92cf4`. The current M6 source is newer; the old source remains an ancestry check, not acceptance of every change in the current M6 head.
- M6 exact-head hosted CI for `ef4679b276a90767bb1a6d7bd852aadc45b2d1cb` is green across its 11 checks. This does not establish installer, clean-VM, real-model or external E4 behavior.

## Evidence limits

M4 coverage verifies the exact desktop adapter's redacted snapshot shape and conservative `UNKNOWN` values using synthetic input. The M9 protected-read composition also uses test fixtures and explicit adapters. These checks do not prove the first-party product host wires M1's held-file capability, M2's public facade and M5's router into a live execution path. They do not establish OS-atomic or concurrent TOCTOU safety. Issue #52 remains OPEN / P0 / NOT_VERIFIED until that product-host evidence exists.

The M3 `aa6f1a5` source exposes `createConnectionCheckRuntime()` with typed, construction-time seams and a synchronous Guard quarantine subscription. The exact-source M9 test invokes that runtime builder with the real M1 Gateway factory, packed M2 facade and M5 router from the pinned source roots. At these pins, the synthetic fixed safe-read positive control succeeds; alias and replaced-path controls are denied before another M5 callback or M1 read event, approval queues remain empty, and fixture SHA-256 values remain unchanged. This is synthetic fixture composition, not a live external-host callback or OS-atomic TOCTOU acceptance.

### Previous P1 blocker: M3 Guard quarantine subscription mismatch — resolved at the pinned source

At the former M3 pin `bf40d1309e571338b3f36152226ec44b082e5037`, focused M9 composition was 1/2 and the full suite was 10/11. The failing test, `M3 connection-check runtime composes M1 held Gateway, packed M2 public facade, and exact M5 router`, reported `GATEWAY_QUARANTINE_SUBSCRIPTION_FAILED`.

The former call path was M3 `createConnectionCheckRuntime()` creating its Guard at `agents/M3/src/codex-connection-mcp.ts:151`, then passing it into the M1 Gateway factory at lines 159–161. M1 called `options.guard.subscribeQuarantine(quarantineSession)` in `agents/M1/src/runtime/gateway.ts:327`; the catch at lines 330–332 closed held resources and threw the error. M3 owner commit `aa6f1a5f0ee410b3c883fbe0c60e89020273966a` adds the method to `AgentGuard` (`agents/M3/src/containment.ts:122–136`) and synchronously notifies subscribers on quarantine transitions. M9 uses no shim and changes no M1–M5 interface or source.

With exact M1 `c67b15f76973a2333ce523dd58d5b7439ab40702`, M2 `099ad64e4a09330920cbd40847adec3fe631e91e`, M3 `aa6f1a5f0ee410b3c883fbe0c60e89020273966a`, and M5 `c9003234913a0ccccca56fe2a36fb1ce3dacb2de`, the focused M9 command `node --import tsx --test --test-name-pattern="M3 connection-check runtime composes|exact M1/M2/M5 sources deny strict path-only reads" test/m9-cross-module-composition.test.mjs` passes 2/2. The full command `node --import tsx --test test/m9-cross-module-composition.test.mjs` passes 11/11. This resolves the synthetic M3/M1 Guard contract integration at these exact sources only; product-host hookup and OS-atomic/concurrent TOCTOU remain unverified.

M5 `c900323` preserves deterministic hard DENY behavior without invoking optional `reviewDecision`; its owner regression asserts zero review-hook, approval and execution-callback side effects. This strengthens the policy boundary without changing the M3/M1 product-host evidence limit.

The M6 source-checkout E4 tests do not prove a built installer, clean-VM lifecycle, real-model execution or independent external E4 validation.
