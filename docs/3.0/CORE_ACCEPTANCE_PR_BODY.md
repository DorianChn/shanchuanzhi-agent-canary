## Core capability acceptance follow-up

Preserves the existing 2.0 candidate, engineering history, research worktree and raw experiments. No main merge, stable release, npm/Docker publication or competition email.

### Confirmed fixes

- P1: provenance expiry re-enabled actual NETWORK callbacks; sensitive-session state now survives hint TTL.
- P1: separate queues on two gateways sharing one Guard raced source collection and egress; queue and admission cap now belong to the shared Guard object.
- P2: OSEP request_id reference typo, five array-to-string coercions, impossible ISO dates.
- Before-fix failing tests and actual receiver counts are retained; no expectations were weakened.

### Verification

- Root: 302 tests, 298 passed, 0 failed, 4 platform skips. Sponsor: 25 tests, 24 passed, 0 failed, 1 platform skip. Distinct total: 327/322/0/5. Root/Sponsor audits: no known dependency vulnerabilities at this run.
- 48 added regressions; file replacement/check-use window, junction/symlink, approval replay/concurrency/expiry, review timeout/quarantine, exact MCP capabilities and HTTPS loopback rejection.
- Python Draft202012 with explicit protocol calendar check: 37 vectors; 48 saved event chains/JSONL; 5 source and 5 build hashes agree.
- Frozen-core real Qwen/Ollama controlled SDK experiment: 48 trials, same tool capabilities/callbacks. Direct forbidden effects A12/12 versus F0/12 (F actively refused12/12). Indirect README effects A0/4 and F0/4 (no gain established). Normals both8/8, legitimate network both2/2.
- Six valid pre-execution AI reviews; independent AI causal benefit and adaptive-vs-static efficacy NOT MEASURED.
- CI9ee79e7: [9/9 success](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38141548986), including Windows/Linux/macOS Node20/22 and Docker --help. Delivery-only follow-up CI must be checked separately.
- Curated MIT community ZIP119 files, 93/93 focused tests, fresh Chinese/space-path extracted installation ci/build/self-test succeeded. SHA256313bb03fe5969a71a593b8157c9d90229e8b903f6601868b35fc17435cbc41c0.

### Limits and unresolved risks

- Controlled SDK Agent only. Native Codex/Claude/Cursor global tool coverage has not been verified; MCP connection is not full protection.
- Cooperative cancellation cannot undo late effects from an abort-ignoring trusted callback. A held original inode may be written during a post-check rename; replacement inode stays untouched and failed verification quarantines. No rollback or global OS sandbox claim.
- Same-Guard queue/latch are in-process; trusted callback metadata, identity and operator authority remain host responsibilities. Persistent sensitive latch may conservatively block legitimate later egress.
- Local E0–E3 claim mapping, not product certification; E4 independent reproduction remains blocked. Small authored fixed-seed repeats do not support production PI effectiveness/zero-FP claims.
- Legacy ordinary npm/Docker V1/V2 distribution P1 remains open; curated candidate only. No production payment/customer/key access or licensing migration.
- Existing PDF/video are historical freezes and need synchronized version/claims before a new formal competition submission.

### Audit and reproduction

- docs/3.0/CORE_CAPABILITY_ACCEPTANCE.md
- docs/3.0/EVIDENCE_ASSURANCE_MAPPING.md
- docs/3.0/FAIR_CORE_EVALUATION.md
- docs/3.0/ARTIFACT_ACCEPTANCE.md
- security-lab/acceptance/ and security-lab/evidence/2026-10-11T12-49-47-521Z/

Reproduce with npm ci + npm run verify; then node security-lab/run-sdk-agent.mjs --fair-acceptance --sha=<actual40SHA>. Uses only new temporary fixtures, invalid credentials, fixed harmless Node processes and a loopback receiver. Keep Draft; base remains the pending 2.0 readiness branch.
