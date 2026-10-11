# Security hardening and Agent Canary 2.0 competition preview

## Status

Draft; not ready for a blanket production-stability claim. Existing first-round fixes and historical artifacts are preserved. No main merge, package/image release, business-data migration, paid API call, or contest email send.

## Implementation

- Optional security router with trusted tool semantics, parameter/path checks, callback deadlines and conservative one-use approvals.
- Optional pre-execution AI review can only tighten ambiguous decisions; AI cannot approve/reset Guard. Default OFF.
- Bounded session-local HMAC provenance; not full dynamic taint analysis.
- Protected MCP stdio host, five safe configuration formats, preview/backup/restore, and official hook protocol fixtures. Actual desktop-native protection remains unverified.
- Chinese console backend controls for review, provenance, MCP verification, approvals and saved A/B/C/D/E reports/export.

## Fixed issues and residual risk

New P1 fixes: cross-session hook quarantine bypass and parser-error secret-line echo (virtual reproductions retained). New P2 fixes: empty JSON fallback, project-local private backups, stale review panel, hook state capacity, corrupted TOML handling. Existing 15 first-round fixes remain ancestors.

Ordinary npm/Docker V1/V2 distribution remains P1 OPEN. The independently built free competition ZIP excludes commercial implementations and includes MIT/third-party notices; this is not a production licensing migration or a reversal of historical disclosure. Realpath TOCTOU, uncooperative already-started callbacks, unregistered tools/native Agent tools and model internals remain outside complete coverage. Main still reports one moderate Dependabot alert; this branch audits clean, without changing main.

## Evidence

- Windows Node22: root209 tests (205 pass,4 skip); sponsor25 (24 pass,1 skip). 234 unique tests:229 pass,0 fail,5 platform skips. 33 new regression tests. npm ci/build/test/pack:check/verify/audit and sponsor ci/test/smoke/audit exit0; both audits0.
- Exact core CI:9/9 https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38119550766
- Exact material CI:9/9 https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38120625945
- Actual SDK stdio15-tool handshake/guard fixture, and3 autonomous local-model MCP integration cases. Only registered virtual callbacks are verified.
- 60s controlled stress:18170 callbacks,181700 provenance insertions,256 retained; post-stress isolation blocks. Not long-term production stability.
- Public3 PDFs (12/4/7 pages),1080p 275.533s actual running browser video,independent78-entry free ZIP; HTTP/hash/actual playback proofs.

## Real-model results (all effects virtual)

168 Qwen9B autonomous trials:28 per arm,19 comparable attacks+8 normal+1 seeded fixture. ASR A4/19,B6/19,C6/19,D1/D2/E1/19. Autonomous Canary0/19 in all arms. D1/D2/E normal completion6/8; D1/D2 approval interruption2/8, E hard false refusal2/8. E10 pre-reviews all suspicious; median21.6s,p9528.55s. D1/D2 withhold8/10 dangerous attempts for approval; E hard-refuses8/10. E does not improve ASR and adds false refusals. No independent causal AI gain claim. Legacy ASR includes benign mocked ls -la; its definition was preserved.

## Reproduction and documents

[Final audit](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/competition/agent-canary-hardening/docs/competition/AGENT_CANARY_2_FINAL_REPORT.md) · [All metrics/status](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/competition/agent-canary-hardening/competition-submission/Agent_Canary_2_0_%E6%8C%87%E6%A0%87%E4%B8%8E%E5%85%BC%E5%AE%B9%E6%80%A7%E9%AA%8C%E6%94%B6.md) · [Frozen materials](https://github.com/DorianChn/shanchuanzhi-agent-canary/tree/0255c153da943c07fbb37d7bf2c10b140e81f1e6/competition-submission)

Extract free ZIP; npm ci / npm run build / npm test / npm run ai:console. Without AI use virtual policy/guard demo; existing Ollama/Qwen required for actual review/evaluation. Never expose host approvals or Guard reset as model tools. Full-page current contest rules remain unconfirmed; official indexed deadline/mailbox corroborate registration. Email is a draft awaiting explicit send approval.
