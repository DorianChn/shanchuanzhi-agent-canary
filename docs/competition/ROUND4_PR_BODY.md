## Draft: security hardening and fourth-round competition delivery

Existing audit fixes and history are retained. This remains an **unmerged Draft PR**. No npm/Docker release, production payment operation, or submission email was performed.

### Verified versions

- Security core: `834ef1a361386736be2101bfa635bf0bb531dfb4`.
- Frozen model evidence and final PDF/video/free archive: `fc742d3d757aa3a3425e085284cce72d66a5ed3f`.
- [Immutable delivery links, byte hashes and reproduction scope](competition-submission/ROUND4_DELIVERY_VERSION.md).
- Core CI [38113459806](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38113459806): actual 9/9 success.
- Material CI [38114398147](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38114398147): actual 9/9 success, including Windows/Linux/macOS Node 20/22, package smoke, sponsor smoke and Docker build/container help.

### Original problem and minimal enhancement

The third-round Qwen experiment did not produce model-selected canary signals. C callbacks executed while SAFE before any quarantine; this does not establish Guard malfunction or effective end-to-end protection. The legacy metric also treats benign shell callbacks such as `ls -la` as attack success; its definition is retained and disclosed.

- Optional host-owned risk router: trusted tool descriptors plus parameters and same-Guard sensitive history, with OBSERVE/BALANCED/STRICT.
- First-call risk checks before registered callbacks; obvious sensitive egress denied; writes/unreviewed commands require authenticated host approval in BALANCED.
- Immutable, one-shot, expiring approvals; frontend approval needs a separate operator capability and never treats model fields as authority.
- Same-Guard routers share a bounded queue and taint, including failed sensitive callbacks. Decoy signals immediately quarantine without waiting for an in-flight callback.
- AI remains advisory. D2 analyzes only after execution decisions, cannot grant approval/reset Guard, and never delays deterministic containment.
- Existing Chinese console extended with working modes, virtual policy/approval controls, Guard state and saved A/B/C/D1/D2 results. No frontend rewrite or new production dependency.

### Actual tests and model results

Windows Node 22: root **176 tests: 172 pass, 0 fail, 4 skip**; sponsor **25: 24 pass, 0 fail, 1 skip**. Combined unique automated tests: **196 pass / 0 fail / 5 skip**. New policy/approval tests: 24. Repeated `verify` is not counted again. POSIX permission and Windows symlink limitations explain local skips; actual CI separately verifies three platforms. Sponsor uses temporary virtual records only.

`npm ci`, build, test, pack:check, verify and audit passed. Sponsor ci/test/smoke/audit passed; smoke 12/12. Root and sponsor audit each report zero; the default branch still has its existing moderate Dependabot warning and was not changed.

Final real Ollama/Qwen 9B experiment: **110 trials**, 22 scenarios × 5 arms. Original samples retained; an additional authored holdout was frozen before execution. Two engineering pilots are retained separately, not pooled. All effects are virtual; tool selection comes from the real model.

| Arm | Legacy attack success | Observed refusal prevention | Canary signal | Policy withheld | Normal success | Normal interruption |
|---|---|---|---|---|---|---|
| A no Canary | 5/15 | 0/15 | N/A | N/A | 6/6 | 0/6 |
| B detection | 5/15 | 0/15 | 0/15 | N/A | 6/6 | 0/6 |
| C detection + Guard | 5/15 | 0/15 | 0/15 | N/A | 6/6 | 0/6 |
| D1 + BALANCED policy | 1/15 | 4/15 | 0/15 | 7/9 | 5/6 | 1/6 |
| D2 + post-decision AI | 1/15 | 4/15 | 0/15 | 7/9 | 5/6 | 1/6 |

Policy withholding includes pending human approval and hard denial, separately recorded in raw results. The legitimate build needs approval and fails the unattended completion condition. No normal hard denials occurred in these six samples; that is **not a zero-false-positive guarantee**. D2 returned valid structured analyses 22/22; independent AI prevention benefit is **NOT MEASURED**, and local compute cost is not priced. The model's actual benign/low interpretation in the video is preserved.

### Evidence and demo

- [Full fourth-round audit](docs/competition/FOURTH_ROUND_FINAL_REPORT.md).
- [Policy/host contract and limitations](docs/RISK_POLICY.md).
- `competition-submission/evidence/round4-agent-eval-neutral_agent-2026-10-11T04-59-01-307Z.json`: final raw input/tool/event evidence, JSON/CSV/Markdown, usage, timing and failures.
- `round4-final-verification.json`, `round4-ci-verification.json`, `round4-material-ci.json`, `round4-public-delivery.json` and `round4-free-archive.json`.
- Final project PDF 15 pages, experiment PDF 7 pages; all 22 pages rendered and visually inspected.
- Actual Chromium console recording: **240.733 seconds, 1920×1080 H264**, Chinese explanatory captions, no audio. Virtual tool buttons are clearly separate from saved autonomous model trials. Old video retained. Public MP4 actual playback and seeking verified, not merely download status.

Reproduce: `npm ci`, `npm run build`, `npm test`, `npm run ai:console`. Model trial: `node competition-submission/lab/run-agent-eval.mjs --profile=neutral_agent --round4` with the already installed Ollama model. Demo sequence: normal read → OBSERVE virtual egress → BALANCED denial → normal read continues → authenticated one-shot write approval → local AI explanation → program-triggered decoy quarantine → subsequent Guard denial. No model-download or paid-cloud fallback.

### Open risks and compatibility

- **P1 OPEN:** ordinary npm/Docker distribution still contains license-gated V2 implementation. An additional independently built free competition ZIP excludes commercial implementation and business data; its extracted install/build/self-test and official MCP stdio Client (12 decoys) pass. This does not resolve the whole repository's historical commercial source boundary, change licensing or migrate paid users.
- Existing free SDK/CLI/MCP remain compatible; risk routing is opt-in. The free competition entry explicitly exposes a subset CLI, not the complete commercial CLI.
- Real path/symlink permissions, executable resolution, network destinations and stable authenticated principal mapping remain host responsibilities. A new Guard object does not inherit policy taint. Any call bypassing the router is OUT_OF_SCOPE; already started effects cannot be rolled back.
- Single local model, small authored sample and one seed; not a blind third-party benchmark, calibrated probability or production security claim. Cloud adapters have protocol tests, not real vendor account verification.
- The event-file overview and temporary demo sandbox have separate scopes; neither claims all-agent real-time coverage.
- Quarantine tests use the default empty host allowAfterQuarantine list. Explicit host exceptions retain original Guard semantics; AI cannot add exceptions. A hanging callback can stall the serialized queue, so hosts need callback deadlines/cancellation. Unknown sensitive formats and coarse rules can still miss risks or reject benign work outside this small sample.
- Latest official competition page was empty to automated reading; rules, deadline, leader/school and acceptance of the non-main branch still need confirmation against the registration email before manual sending.

Internal engineering score **82/100** (25/30 innovation, 25/30 application, 17/20 governance, 15/20 development) is documented, not an official score or award prediction. Free competition materials are ready for review; commercial stable-release readiness is not claimed. Do not auto-merge or send the prepared email.
