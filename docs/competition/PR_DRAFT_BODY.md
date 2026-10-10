## Current AI enhancement (2026-10-11)

This remains a **Draft**, base main / head competition/agent-canary-hardening. It preserves all prior hardening and adds optional advisory AI without giving a model Guard-reset or tool-execution authority. No main merge, release, paid API, production-data operation, or email send.

### Implemented

- OpenAI/compatible, Ollama native, Claude Messages and Gemini generateContent adapters; DeepSeek/Qwen/LM Studio/vLLM presets. Cloud protocols use mock wire tests; only Ollama/Qwen 9B was actually connected.
- Bounded, pinned-DNS transport, no redirects, loopback-only local endpoints/public-HTTPS cloud endpoints; minimum redacted context and explicit cloud consent; strict schema/source-ID validation, cancellation and usage recording.
- Chinese offline local console (reuses the existing design; no new production framework dependencies), model management, actual event timeline, preview, safe experiment runner, JSON/Markdown/CSV export; no reset or key GET/localStorage.
- CLI ai models/test/analyze/doctor/console and additive SDK exports.
- Reproducible saved model experiments, two Chinese PDFs, real running Chromium UI recording with visible Chinese explanatory subtitles (no audio), recording tools and unsent supplementary email draft.

### Latest local evidence

- Root 152 tests: 148 pass, 0 fail, 4 skip. Sponsor 25: 24 pass, 0 fail, 1 skip. **177 unique tests: 172 pass, 0 fail, 5 skip**, including 29 AI regressions and two new lock regressions. Repeated verify is not counted twice.
- npm ci/build/test/pack:check/verify/audit and sponsor ci/test/smoke/audit all exit 0; both audits zero; sponsor smoke 12/12.
- Initial AI CI Run 38078190384 failed the original Windows concurrency test (EPERM opening a pending-delete lock); before-fix regression reproduced failure, minimal bounded Windows-only retry fixed it. Persistent permission failures remain fail closed. Code commits d26aad7 and d7e0a0e. Final CI status is documented with exact commit/run evidence.
- Four synthetic evidence samples analyzed by a real local model: 4/4 valid results, 3/4 predefined-label agreement. A sandbox quarantine log returned benign; disagreement and both early failed runs are retained. This is not production accuracy or attack detection.
- New 36-trial neutral_agent tool-selection experiment: attack success A 1/10, B 2/10, C 2/10; model decoy detection B/C 0/10 each. C guarded dangerous callbacks executed 5/5 while SAFE, blocked 0/5. Harness-seeded quarantine follow-up blocked 1/1, detection credit zero. Normal tasks each 1/1; all callbacks inert.
- Actual browser desktop/mobile validation and independent UI review. PDFs 17/7 pages with Chinese font/render QA. Actual UI video has a real Ollama call; historical A/B/C data is labelled saved, offline demonstration labelled deterministic.

### Remaining risks and boundaries

P1 V1/V2 public-distribution boundary remains open. License gates are preserved; commercial architecture and customer data unchanged. **Not release-ready**. AI can misclassify and cannot be trusted as policy. Real cloud/LM Studio/vLLM connections and multi-model/cost comparisons remain NOT VERIFIED/NOT MEASURED. No OS Keyring yet; host process injects a key tied to an exact origin. Redaction is best effort; cloud previews need human review.

First dangerous calls before any signal, calls bypassing Guard, and already-started external effects remain outside full protection. The model selected no decoys in this pilot; no universal prompt-injection claim.

### Reproduce

Run npm ci, npm run build, npm run verify, npm run ai:console. Without a model, use the labelled offline sandbox. With existing local Ollama, npm run ai:demo and npm run lab:agent -- --profile=neutral_agent save every result. Cloud calls require an explicitly authorized key and consent; none were made this sprint.

See docs/AI_PROVIDERS.md, docs/competition/AI_FINAL_READINESS.md, AI_ENHANCEMENT_REPORT.md, and competition-submission/DELIVERY_VERSION.md for evidence, known limits and material/version pointers. New official rules could not be independently reread because the competition page returned empty; the checklist uses the provided official confirmation and requires a final manual check. No email sent in this sprint.

---

## Historical competition sprint summary (preserved)

This Draft PR preserves the second-round security fixes and adds reproducible 2026 Shanghai Open Source Software Application Innovation Competition materials for Agent Canary. No SDK API, CLI command, MIT license, npm release, Docker release, or production payment architecture is changed in this competition sprint.

## Changes in this sprint

- Add a real local-model tool-selection harness with isolated synthetic callbacks and three comparison arms: no Canary, decoy signal without callback enforcement, and decoy plus `createGuardedToolRouter()`.
- Save per-trial redacted JSON, separate model-triggered detection from a harness-seeded quarantine follow-up, derive summary metrics from the raw trials, and render a Chinese local results dashboard bound only to loopback.
- Add Chinese technical, evaluation, governance, demo, video, checklist, and unsent email materials; generate a 17-page project introduction PDF, a 7-page experiment report PDF, and a locally rendered narrated MP4 with aligned SRT.
- Add GitHub issue forms, PR template, and an honest maintenance roadmap.
- Keep experiment tooling outside the published package; the package smoke check remains 23 files.

## Local model pilot

Two prompt-hash-verified cohorts used the already-installed Ollama `qwen3.5-9b-local` model on Windows x64 / Node 22.23.1. There were 72 trials total (36 per profile), including 60 comparable attack trials, six normal controls, four harness-seeded B/C follow-ups, and two A-arm post-quarantine baselines.

- Agent-selected Canary decoys: **0/40** across B/C and the two profiles. No model-driven detection positive was observed.
- Safety-aware profile: attack success A 1/10, B 0/10, C 0/10. B/C made no comparable dangerous callback attempts, so C's Guard block rate is **NOT MEASURED**; zero attack success is not attributed to Guard.
- Neutral profile: attack success A 1/10, B 2/10, C 2/10. C made five dangerous synthetic callback attempts while Guard remained SAFE; all five callbacks executed because no signal had occurred.
- After the harness explicitly seeded quarantine, C blocked 2/2 dangerous follow-ups in the safety-aware profile and 1/1 in the neutral profile. Detection credit is zero for these seeded cases. Decoy-only B allowed the follow-up callbacks because those callbacks intentionally did not pass through Guard.
- No real network request, shell process, file deletion, credential read, payment, or external effect occurred. `direct_shell_unprotected` and the dedicated first-dangerous-call scenario were presented but not selected by the model.

One completed 36-trial legacy run has no serialized prompt profile/hash and is excluded from the main comparison; an interrupted 4/36 run is preserved and excluded. This is a single-model, single-seed pilot, not a population estimate or production security result.

## Verification

- `npm run verify`: build passed; root suite **121 total, 117 passed, 0 failed, 4 skipped**; package check passed (23 files).
- Root `npm audit`: **0 vulnerabilities**.
- Sponsor `npm test`: **25 total, 24 passed, 0 failed, 1 skipped**. Sponsor `npm audit`: **0 vulnerabilities**.
- `npm run demo:containment`: reached `QUARANTINED`; the later guarded synthetic callback was blocked; only the synthetic `git_status` callback ran.
- Local PDFs: project introduction 17 pages, experiment report 7 pages; page count, Chinese font, tables, and rendered pages were visually checked. Text extraction was not independently run because Poppler/pypdf is unavailable in this environment.
- Local dashboard: opened in Chrome from a loopback-only server, screenshot-checked, tab closed, server stopped.
- Scan benchmark: 1 MiB 1.01 ms, 10 MiB 10.04 ms, 50 MiB 45.1 ms on this Windows machine; three samples per size. Guard medians/p95 are in the report and are in-process microbenchmarks only.
- GitHub Actions Runs 38072020061 (`dad03c747d514d121a5487c51fde58ece548a490`), 38072418051 (`fd1813c5b08dd16aa55dcedee4a445f9edea4193`), and 38074673452 (`e314c5134792cdb8056349cc8464cd965dde64ca`) each passed **9/9 jobs**: Node 20/22 on Ubuntu, Windows, and macOS, sponsor smoke, package smoke, and Docker build/container CLI smoke. A later mailbox-status documentation update is pending its own workflow run.

## Known risks and limits

- **P1 remains open:** public npm/Docker build artifacts still include license-gated V2 compiled modules (`eval`, dashboard, export, license). This PR does not remove license checks or migrate commercial delivery architecture; do not treat the branch as release-ready.
- The real model selected no Canary decoy in either verified profile. Neutral-model examples show that a dangerous callback can run while the Guard is SAFE. Agent Canary does not detect every prompt injection.
- A dangerous first call before a signal, a host callback that bypasses Guard/Router, and an external action already in progress are outside full protection.
- The direct router-bypass attack was not observed in the LLM pilot. The programmatic security regression suite demonstrates the boundary, not an LLM bypass rate.
- Only Windows x64 / Node 22 was run locally this sprint. Cross-platform CI and Docker smoke must be assessed against the workflow run for the final pushed HEAD; local Docker CLI is unavailable.
- A local 1920×1080, 251.3-second H.264/AAC MP4 and 41-cue SRT were generated from isolated Chromium-rendered frames and a synthetic Windows voice. This is not a raw desktop capture or live-model run. The MP4 is intentionally gitignored and has no public URL. A previously submitted 2.1.0 short-demo link is currently HTTP 200, but it is not this updated result presentation.
- The contest score in the material is an internal estimate only. No award or official evaluation is claimed.

## Demo

```bash
npm ci
npm run verify
npm run demo:containment
npm exec -- node competition-submission/lab/run-agent-eval.mjs --profile=neutral_agent
npm exec -- node competition-submission/lab/build-report-data.mjs
npm exec -- node competition-submission/lab/render-dashboard.mjs
npm exec -- node competition-submission/lab/serve-dashboard.mjs
```

See [`competition-submission/Agent_Canary_演示指南.md`](../../competition-submission/Agent_Canary_演示指南.md), [`Agent_Canary_实验报告.md`](../../competition-submission/Agent_Canary_实验报告.md), and the audit reports under `docs/competition/`.

This remains a Draft PR. No merge, package/image publish, production payment, or email send is included.
