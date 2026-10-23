# M3 protected-host adoption status

Date: 2026-10-23
Status in this M3 worktree: `PRODUCT PATH NOT_READY / UNKNOWN`
Policy: fail closed; no path-only fallback.

## Current M3 owner gate — 2026-10-23

This section supersedes the older exact-ref table below. M3 candidate starts
from `feature/ac3-agent-onboarding` at `b8b471f3ceba9ec0ca9e270ac430f14d6a917e3b`;
M1 is `fa369069241bf81d32c7f39d31a61806efa55fe4`, M2 is
`db98c7d5d409aa390ef539c96a209d6daba8d793`, and the current local M5 candidate
is `8bb14c6b38dc2cc76bdf915442dc8048d30ff76d`. M1 has authorized M5 to adapt
the policy boundary to the exact M1 held-file methods. M5's candidate uses
`bindFileReadCapability`, `verifyFileReadCapability`, and
`readFileWithCapability`; the M5 owner reports 44/44 focused tests, build,
pack check, and M1 Gateway positive/alias checks passing. The M5 commit is
local at this checkpoint; M9 still needs an exact public-package composition.

The M3 CLI does not supply a trusted host workspace or fixed product-file map.
`agent-canary ai console` calls `startAIConsole` with only port, API key, and
the operator approval code. Its GET status route has no injected trusted M2
status provider and remains `UNKNOWN`. Its authorized protected-read POST is
the fixed temporary-file probe documented below; it is not a user/product file
read. The route has no request path field and this work does not add one.

The Console POST now requires three controls before returning
`PASS / FIXED_PROBE_CONTROLS_PASSED`: the exact temporary marker is read once,
M2 rejects a fixed lexical alias, and M2/M1 reject a same-path inode
replacement. Each negative control must leave both the M5 callback count and
M1 read-evidence count unchanged. This remains `M3_FIXED_TEMP_PROBE_ONLY`;
`PASS` does not establish a product-file route. The exact-owner package test
builds a clearly labeled synthetic composition fixture from byte-identical
public owner export files; this is integration evidence for the probe, not
product acceptance or the final M9 pinned package. The probe obtains its M1
Guard factory and EvidenceRecorder from the same public `./sdk` export; a
missing evidence surface stops before M2/M5 composition or dispatch.

M3 `package.json` still exports only `./sdk`. The default protected-read
bootstrap resolves the exact public `./sdk`, `./gateway-adapter`, and
`./policy-router` package subpaths. When M2/M5 exports or required M1 methods
are absent/incompatible, it returns sanitized `UNKNOWN`; the route must not
fall back to M3's legacy router, private implementation imports, a generic
callback, or a path selected by HTTP, environment, or model output. M3 does not
edit the shared package manifest; the integrated package owner must compose
the approved owner exports and their exact files.

There is no M3-owned product use case or trusted construction-time file map in
the current Console/CLI contract from which to select a real product file
safely. Therefore no product-file ALLOW path is implemented or claimed. The
temporary fixed marker remains explicitly synthetic. The M3 regression now
also verifies that a Gateway object missing the M1 held-file methods returns
`UNKNOWN` before loading M2/M5, creating an execution callback, or dispatching
through the legacy Gateway surface. The M3-only package still lacks the M2/M5
public subpaths, so its default Console route remains `UNKNOWN` before probe
filesystem setup; M9 must validate the exact pinned integrated package.

### M3 candidate validation

- `node --import tsx --test test/security-center-route-m3.test.ts`: 11/11 PASS,
  including positive + alias/replacement controls and missing-evidence `UNKNOWN`.
- `node --test test/packaged-owner-consumer.test.mjs` with exact M1/M2/M5 roots:
  6/6 PASS. The packed composition is explicitly synthetic; copied public
  owner export files were byte-checked against the exact worktrees.
- `npm run build`: PASS.
- `npm run pack:check`: PASS for the standalone M3 package (96 files); this is
  not the integrated owner package.
- `npm run check:integrated-package` with exact owner roots: `NOT_READY`; M3
  still exports only `./sdk`, M2/M5 subpaths are absent, and M3's `dist/sdk.d.ts`
  differs from exact M1. These are package-owner/M9 gates, not changed here.
- `git diff --check`: PASS.

### Exact remaining owner actions

1. **M3 product owner:** identify the real M3 host/use case and supply its
   trusted workspace identity plus a reviewed fixed relative-file manifest at
   process construction time. Until that product contract exists, keep only
   the synthetic probe and keep product file status `UNKNOWN`.
2. **M9/package owner:** compose the exact M1 `./sdk`, M2 `./gateway-adapter`,
   and M5 `./policy-router` public exports in one package, without copying
   private implementations or changing owner bytes; test ordinary package
   self-resolution at the pinned exact SHAs. M3's current package gate remains
   `NOT_READY` because the M2/M5 subpaths are absent.
3. **M1/M2/M5 owners:** retain the accepted M1 capability methods, M2's fixed
   tool/path facade, and M5 strict `OBSERVE` verification. Resolve any future
   contract changes in the owning module before M3 consumes them.
4. **M4 owner:** remain a read-only consumer of M3 `GET /api/security-center`;
   missing or unsupported backend data stays `UNKNOWN`. M4 does not own the
   M3 backend or protected-read route.
5. **M9 acceptance:** on the exact integrated package and M3 first-party host,
   verify absent/incompatible dependencies are `UNKNOWN` with zero protected
   callback/read evidence; separately verify any owner-approved product-file
   positive case and alias/replacement denials. Synthetic marker checks do
   not satisfy product-file or native-host acceptance. Keep Issue #52
   `OPEN / P0 / NOT_VERIFIED` until those gates pass.

## Implemented M3 boundary

The connection-check MCP server now offers one fixed `protected_read` tool for the temporary file `agent-canary-public.txt`. The trusted host binds that exact relative path and passes the call through M2's public `createSecurityGatewayHostAdapter` facade, which composes the M5 `createSecurityToolRouter` and M1 Gateway capability methods. The server returns only a fixed marker after the protected read; it does not return arbitrary file contents.

The helper reports `UNKNOWN` unless the public facade can be loaded, M1 capability methods are present, M5 composition succeeds, and the fixed safe-read positive control actually returns the expected marker. It never catches a failure and retries with a generic `executeRealTool` path. The M3 regression checks assert that aliases and same-path inode replacement do not increment the observed M5 execution callback count, do not add M1 Gateway evidence, and do not change either file's bytes. Those two cases execute only when the full owner API composition is available; an incomplete composition is explicitly kept `UNKNOWN`.

## Exact current worktree evidence

| Owner | Local candidate checked | Relevant interface state |
| --- | --- | --- |
| M3 | `feature/ac3-agent-onboarding` at `535d429faef7ae0e15bbf9b382d639280045f338` | `src/runtime/gateway.ts` returns no `bindFileReadCapability`, `verifyFileReadCapability`, or `readFileWithCapability`; `src/risk-policy.ts` has no `fileReadCapability` provider; `package.json` exports `./sdk` only and has no `./gateway-adapter` self export. |
| M1 | `feature/ac3-security-core` at `7279336307fc7aacd46119405858d4fd91499757` | The separate M1 candidate implements the three held-file capability methods over its registered file identity. These methods are not in the checked M3 source tree. |
| M2 | `feature/ac3-execution-isolation` at `be66cf8f4c1a60f093740577796ec5cd633e1d93` | The separate M2 candidate exposes only `createSecurityGatewayHostAdapter` through the public `./gateway-adapter` subpath. This M3 worktree does not contain that manifest/export change. |
| M5 | `feature/ac3-policy-audit` at `bbce79aa086b39b51422cc72471c23c963778650` | The separate M5 candidate accepts and verifies the trusted `fileReadCapability` provider; the checked M3 `risk-policy.ts` does not contain that contract. |

The checked M3 source uses its own older Gateway and policy router, and its package manifest does not resolve the M2 public subpath. The new fail-closed preflight therefore returns `M1_HELD_FILE_CAPABILITY_UNAVAILABLE` on this M3 head before any M5 callback or Gateway dispatch. This is an exact API-composition blocker, not evidence that a protected read succeeded or that a bypass occurred.

## Cross-worktree candidate compatibility probe

A local probe invoked the M3-owned host composer with the exact M1 Gateway, M2 public facade module, and M5 router functions from the refs in the table above. It passed the fixed-file positive read, then denied an alias and same-path inode replacement. The alias and replacement each had M5 callback delta `0`, M1 evidence delta `0`, and preserved the original/replacement bytes as expected. The result summary is in [PROTECTED_HOST_CANDIDATE_PROBE.json](PROTECTED_HOST_CANDIDATE_PROBE.json).

This proves those owner APIs can compose through the M3 adapter in one local process. The probe injected the facade/router dependencies because the M3 package self-export and M1 implementation are absent from the checked M3 tree. It did not run `runCodexConnectionCheck()` or the spawned Codex CLI against one unified exact-source tree. Consequently the default M3 checkout remains `BLOCKED / UNKNOWN`; M9 still owns the unified source-pin and actual host-check gate.

## Required follow-up for #52

1. M9 must compose exact reviewed M1, M2, M3, and M5 refs, including the M2 public facade manifest and the M1/M5 source implementations.
2. Run the M3 connection-check host against that composed tree and require one fixed-file safe-read marker via M5 callback count `1`.
3. On that same tree, require path alias and same-path replacement attempts to deny with M5 callback delta `0`, M1 evidence delta `0`, and unchanged relevant bytes.
4. Keep #52 P0/OPEN/NOT_VERIFIED until those exact composition checks and the separately required product-host protected-open / held-object evidence pass. This temporary checker does not establish protection of user workspace files or native Codex tools.
