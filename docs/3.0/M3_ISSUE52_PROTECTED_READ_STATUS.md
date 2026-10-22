# M3 protected-file read integration status

**Product status: `NOT_VERIFIED`**

**Current M3 source:** `feature/ac3-agent-onboarding` at `465bd606ed376054e5d9ae63b30f090dab7aec75`

**Scope:** M3's isolated onboarding MCP and Security Center status route only.

The route in `src/codex-connection-mcp.ts` deliberately returns `UNKNOWN` unless the
M1 Gateway, M2 fixed-read adapter, and M5 strict OBSERVE router compose. In this M3
worktree, `createTrustedExecutionGateway()` does not expose the required M1 host
methods `bindFileReadCapability`, `verifyFileReadCapability`, or
`readFileWithCapability`. `createProtectedHostAdapter()` therefore exits with
`M1_HELD_FILE_CAPABILITY_UNAVAILABLE` before dispatching to M5 or reading the file.
It must not fall back to a path-string executor.

The target owner contracts were inspected at these existing module candidates:

| Owner | Candidate | Required contract |
| --- | --- | --- |
| M1 | PR #43, `a5eff766ebe041bc2c6cc13758827d5a96205de9` | Gateway issues an opaque capability for an exact registered tool/path, verifies the held identity, and reads only through `readFileWithCapability`. |
| M2 | PR #37, `099ad64e4a09330920cbd40847adec3fe631e91e` | Package subpath `./gateway-adapter` exports `createSecurityGatewayHostAdapter`; exact fixed-read bindings preflight before M5 dispatch and adapt M1 capability methods to M5's provider/callback contract. |
| M5 | PR #47, `e6bb5cfaf5e3a55497ab300da3bf14bbb4b4b3d2` | `createSecurityToolRouter` accepts `fileReadCapability`; OBSERVE with `verifyRealPaths: true` requires a valid M1 capability and denies aliases, escapes, sensitive paths, and stale execution boundaries. |
| M3 | PR #33, `465bd606ed376054e5d9ae63b30f090dab7aec75` before this coordination change | `createProtectedHostAdapter` validates the M1 handle, loads M2's facade, injects M5's router, and rejects non-exact `protected_read` arguments. The runtime entry still creates the M3-branch Gateway. |

Expected call path after these owner commits are present in the integration source:

`M3 protected_read` → `dispatchProtectedRead` exact-argument check → M2
`createSecurityGatewayHostAdapter` fixed-path preflight → M5 `dispatch` in
`OBSERVE` / `verifyRealPaths: true` → M2 capability provider revalidation → M1
`readFileWithCapability` on the registered held file.

For M9 source composition, M3 exports `ProtectedHostDependencies` and
`createProtectedHostAdapter`. Supply `loadM2Facade` from the exact M2 package and
`createSecurityToolRouter` from the exact M5 source; pass the exact M1 gateway and
its matching Guard to the host-adapter factory. These are trusted construction-time
dependencies. The request path cannot supply or replace them, and no path-only
callback fallback is accepted. The structural test for a missing M2 adapter proves
only that the seam fails closed; it is not product-read evidence.

`test/codex-connection-check.test.ts` contains a real temporary-file fixture. The
current M3 run asserts fail-closed `UNKNOWN`, no M5 callback, no Gateway evidence,
and unchanged bytes because the branch-local Gateway lacks the M1 methods. The
source also retains a conditional registered-read/alias/replacement acceptance
branch for a future composed build, but this run does not reach it. M9 must execute
the acceptance path against the exact M1/M2/M5 sources before recording product
read evidence. No product read is claimed here.
