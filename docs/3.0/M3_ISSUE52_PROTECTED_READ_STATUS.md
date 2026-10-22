# M3 Issue #52 protected-read route status

**Product status: `NOT_VERIFIED`**

**M3 source under review:** `feature/ac3-agent-onboarding` at `fcaa24f8479c7072da0a51e96100ddfb3b2774c8` plus the unpushed M3-owned change in this worktree.

**Scope:** the first-party onboarding connection-check MCP route only.

## First-party inputs and supported composition seam

The M3 entry point has trusted host-owned inputs: it takes its default workspace
root from `process.cwd()`, registers only the fixed `agent-canary-public.txt`
probe when that file exists, creates the M3 Guard and Gateway, and owns the
registered `public_read` / `hook_probe` callbacks. It does not derive these
values from MCP request arguments or model output.

`createConnectionCheckRuntime()` now factors that real first-party construction
path into a testable host factory. M9 can inject an exact-source M1 Gateway
factory, M2 public facade loader, and M5 router factory at construction time.
The fixed M3 file map and callback set remain fixed. `runConnectionCheckMcp()`
uses the same factory with defaults, so the runtime behavior and default
package self-reference remain unchanged. This is a trusted-host test/composition
seam; it is not a new request-facing capability API.

The current M3 worktree still creates the M3-branch Gateway by default, and that
Gateway does not expose M1's held-file methods. Its default protected route must
therefore return `UNKNOWN` with `M1_HELD_FILE_CAPABILITY_UNAVAILABLE`; it must
not fall back to a path-string read. The new focused test checks that the actual
M3 runtime factory forwards only its fixed file binding, same Guard/root, and
`OBSERVE` / `verifyRealPaths: true` options. Its structural doubles are wiring
evidence only and do not verify a product read.

## Owner contracts inspected

| Owner | Exact candidate | Contract relevant to M3 |
| --- | --- | --- |
| M1 | PR #43, `c67b15f76973a2333ce523dd58d5b7439ab40702` | Exposes host-only bind, verify, and read methods for opaque exact tool/path capabilities; reads from the held descriptor and checks identity again after reading. This narrows the race window but does not claim an OS-wide atomic transaction. |
| M2 | PR #37, `099ad64e4a09330920cbd40847adec3fe631e91e` | Exposes `./gateway-adapter`; `createSecurityGatewayHostAdapter` reserves the router callbacks/capability provider, preflights exact fixed bindings, and requires `OBSERVE` plus `verifyRealPaths: true`. |
| M5 | PR #47, `e6bb5cfaf5e3a55497ab300da3bf14bbb4b4b3d2` | Requires a valid M1 capability for protected reads in this composition and preserves Guard/policy denials under OBSERVE. |
| M3 | PR #33, `fcaa24f8479c7072da0a51e96100ddfb3b2774c8` plus this local change | Owns the fixed probe, Guard/Gateway construction, public M2 loading, and exact-argument precheck; now exposes a trusted-host factory so M9 can exercise this callsite with exact owner sources. |

## Required M0 / M9 integration contract delta

1. The exact-source composition test should call M3's
   `createConnectionCheckRuntime()` rather than constructing a separate M1
   Gateway and invoking `createProtectedHostAdapter()` directly.
2. Supply `createGateway` from exact M1 source, `loadM2Facade` from the exact
   public `./gateway-adapter` export, and `createSecurityToolRouter` from exact
   M5 source. These are trusted construction-time inputs; never take them from
   an MCP call or model response.
3. Assert the M3 fixed file binding reaches that route, then verify the positive
   read, alias denial, and same-path replacement denial with callback counts,
   evidence deltas, and fixture hashes. Preserve `UNKNOWN` if any adapter or
   capability is absent.
4. Separately run the default M3 package/runtime path to prove package
   self-resolution and default wiring. An injected seam alone does not prove
   this default runtime path, a native host tool, or protection of user files.
5. Keep Issue #52 open and product status `NOT_VERIFIED` until exact integrated
   evidence passes. Do not describe M1's pre/post held-file checks as an
   OS-atomic path-and-operation transaction.

The existing M3 acceptance test remains fail-closed on this worktree's default
M1 Gateway. The new test only verifies trusted input wiring. No result here
claims that the exact M1/M2/M5 route has been exercised from the M3 runtime
factory or that a real product-host protected read has occurred.
