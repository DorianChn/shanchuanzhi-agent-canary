# M5 owner review: M3 packaged consumer and Issue #52

**Disposition: CONDITIONAL.** The M3 packaged positive path loads and invokes the exact M5 public router, and removing the M5 public export fails closed before creating the fixed temporary probe. The packaged test does not exercise a policy-denied request through M5, so it is not a complete integrated policy acceptance. Issue #52 remains **OPEN / P0 / NOT_VERIFIED**.

## Exact sources reviewed

- M5 PR #47 was OPEN and Draft at exact head `f05edaeeabff2e261bf563fb0782d7b9bc500645` during this review.
- M3 exact commit: `e3e7584cd186728b1756df3542af9aff13937a36`.
  - `test/packaged-owner-consumer.test.mjs`: blob `a01e1f75d360eed45a3789bb27722c6dd17ecf30`.
  - `src/ai/console.ts`: blob `d01fa57fccf224acd6bab339880511bc7cdc555f`.
  - `src/codex-connection-mcp.ts`: blob `8e45d93f4b2eae15aedc8aeaebbc21c85b65fef2`.
- M5 exact blobs at PR #47 head:
  - `package.json`: `267d09c579d6dcbb311635dcce4b7e7739b048cf`.
  - `src/policy-router.ts`: `1bd6ed45a5c200f11746ddef3dd00019f1ffa1ba`.
  - `src/security-router.ts`: `44f18f4b0b4b4e4ba1b1f53f810d29a3e5b8acc8`.
  - `src/risk-policy.ts`: `4c156d2d2be89eb2cd05b98424b12475335502ba`.
  - `test/policy-router-export.test.ts`: `bcd62701b02dcdf70624a46ac064558c4982c91e`.
- M2 PR #37 remote head was `c43e7ba33e29d9097ac68b444137b65aeaa92acc`. The M2 checkout used for the run was one documentation-only commit ahead; `package.json`, `gateway-adapter.mjs`, and `security-gateway-adapter.mjs` blobs exactly match that remote head (`0e0fceffdc7e07a67b60173c46c6bc8ec29e7d3b`, `7a05ed64300c6345222dff13a4e929a250646acc`, `5c1d461a4af0c840a7c2a93d0173ec1f6ad87ac8`).

## M5 policy-chain findings

1. **The positive packaged request reaches M5.** M3's default dependency loader imports `@dorianchn/agent-canary/policy-router` and requires `createSecurityToolRouter`. The M3 host adapter passes that factory to M2 and wraps the router's trusted `executeRealTool` callback with a counter. M2 constructs the router only with `mode: 'OBSERVE'` and `verifyRealPaths: true`, reserves the tool map/callback/capability provider, and wires its fixed-file adapter as `fileReadCapability`. That adapter resolves and verifies the registered capability through M1's Gateway methods. M5 `risk-policy.ts` calls the provider's `resolve`/`verify`, rejects missing or invalid strict-read capabilities, and forwards the unchanged opaque value to the trusted callback. The packed test asserts the positive marker verdict, exactly one M5 callback, and cleanup of the temporary probe.
2. **The M5 export is not silently bypassed.** The test removes `./policy-router` from the composed package export map while leaving owner files present. The runtime self-import then fails; M3 returns `UNKNOWN / OWNER_ADAPTER_UNAVAILABLE`, and the test confirms no temporary probe directory was created. There is no fallback to M3's local router on this default path.
3. **There is no packaged M5 policy-denial case.** The negative packaged cases remove M2 or M5 public exports and expect `UNKNOWN`; they fail before dispatch reaches policy. The positive case uses the safe, fixed synthetic marker. Thus the packaged test does not demonstrate an alias/sensitive-path denial through the composed M3→M2→M5 chain, nor does it independently count M5 resolver/verifier invocations. M5's own exact-head policy tests cover those synthetic policy behaviors, but they are not substitutes for a denial case in this packaged consumer.

## Verification performed

- M5 `npm run build`: PASS.
- M5 targeted policy/export suite:
  `node --import tsx --test test/policy-router-export.test.ts test/security-router.test.ts test/risk-policy.test.ts` — **66/66 passed**.
- M3 `npm run build`: PASS at the exact M3 commit above.
- M3 packaged consumer suite, with `M1_ROOT`, `M2_PACKED_ROOT`, `M3_ROOT`, and `M5_ROOT` set to the exact module worktrees:
  `node --test test/packaged-owner-consumer.test.mjs` — **3/3 passed** (positive composition, missing M2 export, missing M5 export).
- Built M5 artifact SHA-256 after the M5 build:
  - `dist/policy-router.js`: `9953f7a95030435d547f432385304664839675fb7bb824a093c6ff2f2cb02157`.
  - `dist/policy-router.d.ts`: `65b938879304477553d3b1a94fe38f94e03d38f75fd31f63648e75fb7d05e213`.
  - `dist/security-router.js`: `2bec035a29f55a4f8fd9d3cbb71a79c6fbba7f844d6417d71fbc73ce117c3195`.
  - `dist/risk-policy.js`: SHA-256 `baef000ebd9c8ce46238095f1179e34456001990de0a09eb7d34c230378d55e0`.

## Scope and remaining limit

This evidence is limited to the composed npm-pack fixture and an isolated synthetic temporary marker. It does not establish protection of real user files, production package provenance, OS-level atomicity, or race-free host behavior. Keep #52 OPEN / P0 / NOT_VERIFIED until the first-party host and its protected-path denial behavior are independently verified.
