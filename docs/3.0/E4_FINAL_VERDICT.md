# Agent Canary 3.0 E4 Final Verdict

**Verdict: E4 BLOCKED / NOT VERIFIED.** This is a scoped research verdict, not an external security certification. Existing E4 criteria are unchanged.

## Basis

| Gate | Status | Evidence and limit |
|---|---|---|
| Existing E4 standard | Preserved | Another operator must reproduce a frozen build in an independent environment. See [E4_TEST_MATRIX.md](E4_TEST_MATRIX.md). |
| Historical candidate.4 release hashes | PASS for recorded files | Six release assets matched the historical SHA256SUMS. The installer SHA-256 was `567b1e7e8832b6aa31fc80c86994eb915bf8d3db9caf125c1f7a08b42cf94ce6`; it was unsigned and the historical report says it was not installed in the VM. |
| Historical external test packet | PARTIAL | Its 50,877-byte ZIP had 32/32 internal data hashes matching. The tests were synthetic SDK/MCP calls without an LLM or clean Windows VM; operator identity and sign-off were not authenticated. |
| Historical clean Windows VM | BLOCKED in the last recorded run | The VM remained at Windows OOBE network setup; the archived diagnostic reported VMware NAT exit code 1067 and guest operations blocked by VM encryption. This is a historical observation, not a current VM status check. |
| GPT-6 Luna Max | NOT VERIFIED | The historical availability receipt recorded zero API calls and zero tool calls. This iteration will only count a provider-catalog and completion-ID match plus an actual Gateway-denied tool call; a refusal is not a pass. |
| Installed artifact exercised by M6 | BLOCKED unless independently supplied | `--artifact` hashes a file; the runner does not install or execute it. APP-01 requires an installable package built from the frozen source and test actions against that installed build. |
| Third-party independent reproduction | NOT VERIFIED | No identity-verified independent operator receipt is present. `--operator-role=external-claim` is a label only. |
| M6 author automation | COMPLETED; E4 remains NOT VERIFIED | Run `20261013T084123Z` is bound to commit `04b3d983a650b054447371c0dc2d30497033dbfd` and tree `2d47e7a60b417671f70aad3efd32feeda3afd7f0`. The verifier accepted the 13-entry ZIP (`f1cda41498f984cddf54c19b096ec5e7f4ab6f98ed1b2e806129d233bf017a6a`). Results: 5 local `PASS_FIXTURE`, 1 positive control, 1 separate shell bypass, 3 blocked, 0 failed. No model endpoint, package, or VM receipt was available; see [E4_EVIDENCE_INDEX.md](E4_EVIDENCE_INDEX.md). |

## Result boundaries

The automatic harness uses synthetic files and marker values. Gateway and Hook checks exercise the checked-out SDK/Hook adapter. The optional model adapter is limited to an OpenAI-compatible endpoint, a small tool allow-list, and an isolated local Gateway. It does not activate Claude/Cursor hooks, launch the installed desktop product, or prove global protection of native Shell, unrelated MCP servers, or other host tools.

The native Shell row deliberately records the direct PowerShell (or `sh`) fixture write outside Gateway as `OBSERVED_BYPASS`. It is not counted as a Gateway failure or success. Session isolation includes an explicit successful synthetic positive control. Fault-injection results keep the injected error, execution state and independent target-file check separate.

## Decision

Keep the E4 status at **BLOCKED / NOT VERIFIED** until all of the following are independently evidenced together: the frozen source commit and matching installed artifact; a clean Windows VM run; an actual provider-confirmed GPT-6 Luna Max tool call through the controlled Gateway where required; preserved raw logs and before/after hashes; and a different, identity-verified operator's signed or otherwise independently attributable receipt. Missing evidence stays `BLOCKED` or `INCONCLUSIVE`; no substitute model, package, environment, or post-hoc threshold change is accepted.
