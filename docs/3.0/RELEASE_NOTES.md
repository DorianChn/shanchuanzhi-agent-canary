# Agent Canary 3.0.0

Agent Canary 3.0 is the repository's open-source mainline: CLI, MCP server, SDK, offline self-test, and local risk-policy console. It is MIT licensed and requires Node.js 20 or newer.

The release includes the guarded execution gateway, honeypot signals, canary-token handling, evidence recording, and SDK integration points. A host must explicitly register the tool callbacks it wants the gateway to guard; the product does not automatically control unrelated host tools or processes.

## Validation

Run `npm run verify` from the repository root. The command builds the source, runs the Node.js suite, exercises offline acceptance and SDK type consumption, checks the curated source manifest, and smoke-tests the packed npm package. Release publication is gated on this command.

Previously published product-acceptance results are listed with their source hashes in [TEST_RESULTS.md](TEST_RESULTS.md). They include a 100/100 curated source-ZIP suite, recorded Windows and Ubuntu user flows, CI results, and 48 local Qwen tool-selection runs. Those results are not silently relabeled as tests of a different source hash.

## Known limits

- E4 independent reproduction is not verified; a second operator and independent environment have not rerun the frozen build.
- Clean Windows VM validation is blocked and the prior installer is unsigned.
- Native host-wide hook coverage is not verified.
- Non-cooperative callbacks may cause late effects; complete TOCTOU elimination is not claimed.
- The model experiment is a small, authored fixture study. It does not establish universal detection, zero false positives, or independent AI/adaptive gain.

See [the full acceptance report](FINAL_3_0_ACCEPTANCE.md) and [security boundaries](SECURITY_LIMITATIONS.md).
