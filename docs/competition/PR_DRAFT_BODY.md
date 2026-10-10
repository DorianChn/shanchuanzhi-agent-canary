## Summary

This Draft PR preserves the second-round security fixes and adds reproducible 2026 Shanghai Open Source Software Application Innovation Competition materials for Agent Canary. No SDK API, CLI command, MIT license, npm release, Docker release, or production payment architecture is changed in this competition sprint.

## Changes in this sprint

- Add a real local-model tool-selection harness with isolated synthetic callbacks and three comparison arms: no Canary, decoy signal without callback enforcement, and decoy plus `createGuardedToolRouter()`.
- Save per-trial redacted JSON, separate model-triggered detection from a harness-seeded quarantine follow-up, derive summary metrics from the raw trials, and render a Chinese local results dashboard bound only to loopback.
- Add Chinese technical, evaluation, governance, demo, video-script/SRT, checklist, and unsent email materials; generate a 17-page project introduction PDF and a 7-page experiment report PDF.
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
- GitHub Actions Run 38072020061 passed **9/9 jobs** for the substantive materials commit `dad03c747d514d121a5487c51fde58ece548a490`: Node 20/22 on Ubuntu/Windows/macOS, sponsor smoke, package smoke, and Docker build/container CLI smoke. The subsequent docs-only pointer update is checked separately before final handoff.

## Known risks and limits

- **P1 remains open:** public npm/Docker build artifacts still include license-gated V2 compiled modules (`eval`, dashboard, export, license). This PR does not remove license checks or migrate commercial delivery architecture; do not treat the branch as release-ready.
- The real model selected no Canary decoy in either verified profile. Neutral-model examples show that a dangerous callback can run while the Guard is SAFE. Agent Canary does not detect every prompt injection.
- A dangerous first call before a signal, a host callback that bypasses Guard/Router, and an external action already in progress are outside full protection.
- The direct router-bypass attack was not observed in the LLM pilot. The programmatic security regression suite demonstrates the boundary, not an LLM bypass rate.
- Only Windows x64 / Node 22 was run locally this sprint. Cross-platform CI and Docker smoke must be assessed against the workflow run for the final pushed HEAD; local Docker CLI is unavailable.
- No new MP4 or public video link was created. A 4:45 script and SRT are provided. Official submission materials therefore still need a current hosted video link.
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
