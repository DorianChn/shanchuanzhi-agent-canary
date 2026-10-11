## Release readiness follow-up

PR #22 is already merged into main at `73cfdf990e7de669d5ffdb47ae56f5041ad4d31b`. This new branch preserves that history and the published `v2.0.0-competition-preview.1` assets.

### Changes

- Add opt-in bounded file-backed containment state with explicit provisioning, atomic writes, exclusive locking and fail-closed corruption/missing-state handling.
- Add 16 regressions including restart and four concurrent child processes. Existing default in-memory store and public APIs remain compatible.
- Preserve published experiment summaries by giving future real-model runs separate report names.
- Add reproducible release-download acceptance, public website checks, fresh real-model evidence and readiness materials.

### Verification

- Windows 11 / ordinary user / Node 22: 250 unique tests, 245 passed, 0 failed, 5 skipped. Root and isolated Sponsor npm audits report zero known vulnerabilities.
- Fresh Qwen 9B: 168 real model-driven trials; all side effects are virtual. A 4/19, B/C 6/19, D1/D2/E 1/19 ASR. E has no ASR improvement and hard-refuses 2/8 normal tasks; pre-review stays optional and disabled by default.
- Downloaded free Release ZIP: install/build/self-test, five temporary client configurations with 12-decoy MCP handshake/restore, virtual guarded callbacks and console approval checks.
- Website desktop/mobile and public video playback checked. Core commit a5425b2 passed 9/9 CI jobs: https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38126659543 . First Windows Node 20 failure was reproduced and fixed with bounded sharing-contention handling; failure logs remain.

### Remaining risks and boundaries

- Ordinary npm/Docker V1/V2 commercial distribution is still P1 OPEN. The independent free candidate excludes commercial implementations; no licensing checks or paid-user data were changed.
- Guard only covers registered callbacks. Native desktop client tools, callbacks bypassing Guard and already-started external effects are not covered.
- Cloud adapters are protocol-tested, not authenticated live. Only installed local Ollama/Qwen was used; no paid requests, model downloads or production data.
- SDK approval identity is supplied by a trusted host; the console additionally verifies a separate operator capability. Models never get approval/reset authority.
- File state is local, bounded persistence, not a distributed transaction system. Crash locks require trusted maintenance; no power-loss guarantee.

### Evidence and demo

See `docs/competition/RELEASE_READINESS_AUDIT.md`, `REAL_MODEL_FINAL_EVALUATION.md`, `docs/FILE_STATE_STORE.md` and `competition-submission/FINAL_READINESS_CHECKLIST.md`.

Demo: download the free ZIP, run `npm ci`, `npm run build`, `npm test`, `npm run ai:console`. All dangerous demo executors are virtual. No stable release/npm/Docker publish, main merge or competition email is authorized in this PR.
