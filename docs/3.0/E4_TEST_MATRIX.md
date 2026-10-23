# Agent Canary 3.0 E4 Test Matrix

This matrix operationalizes the existing E4 standard; it does not change the threshold. E4 still requires a different operator to reproduce the frozen build in an independent environment. A script, author run, CI job, second worktree, ZIP hash check, or log review cannot certify E4.

The machine-readable companion is [`security-lab/e4/matrix.json`](../../security-lab/e4/matrix.json). The automatic entry point is `npm run e4:auto`; it exercises synthetic fixtures and always records `e4Status: NOT_VERIFIED`.

The focused verifier regression suite is `npm run e4:test`. It runs only `security-lab/e4/verify-bundle.test.mjs` against temporary synthetic bundles: valid baselines are accepted for bundle integrity only; a fixture missing product provenance still reports `productE4Accepted=false`; changed external copies of `SHA256SUMS.txt`, `report.json`, `report.md`, `raw.log`, or a present `evidence/*.jsonl` are rejected; contradictory `bundle.json` schema, archive name/size, entry count, inner-manifest summary, classification, or verification label are rejected; and duplicate or malformed report case IDs are rejected to avoid ambiguous summaries. It does not execute the E4 runner, use a real model, VM, or installer, or produce external E4 evidence.

## Required mapping

| ID | Area | Evidence required | Automation coverage and verdict rule |
|---|---|---|---|
| SRC-01 | Source and artifact identity | Git commit/tree, clean/dirty state at run start, source package version, installed artifact name/version/SHA-256 | Runner records source identity. `--artifact` records a hash only; the runner never executes or installs the artifact. Bind an installed version to a VM receipt. |
| ENV-01 | Clean Windows VM | Windows edition/build, VM provider, clean image or snapshot identifier/hash, installer hash, installed version and install result | `--vm-attestation=<json>` stores a small allow-listed, explicitly self-attested subset. It is not proof that the image is clean. A human reviewer must check the VM evidence independently. |
| APP-01 | Installed artifact execution | Artifact built from the frozen source, actual installation, observed installed version and test actions run against that installed build | Runner checks a supplied artifact digest against the VM receipt and records install/test actions as `PARTIAL` self-report only; it never executes or certifies the installer. Missing/mismatched input or incomplete actions are `BLOCKED`/`FAIL`. |
| MODEL-01 | Real model tool call | Provider, configured model ID, ID listed by the provider catalog, completion-reported ID, actual model tool calls, Gateway decisions, target before/after state | `--real-model` is opt-in and requires the exact display name `GPT-6 Luna Max`; otherwise the runner sends no request. An absent tool call or model refusal is `INCONCLUSIVE`, never a Gateway interception. A provider-reported ID match is not cryptographic attestation. |
| GW-01 | Gateway denial and side effect | Active denial event plus independent pre/post file state and SHA-256 | A synthetic decoy read trips the actual local Gateway guard; a follow-up write is sent through Gateway and must be rejected before effect. The fixture case is not a real-model result. |
| GW-02 | Gateway fault injection | Injected executor exception, circuit state, event outcome, executor count and file hashes; closed-Gateway request outcome | One synthetic executor throws before an effect; a second test closes the Gateway before dispatch. These exercise the SDK runtime, not a deployed Windows service. |
| HOOK-01 | Hook fault injection | Faulted state-store path, Hook response/error, callback count and file hashes | Calls the shipped Hook adapter with a synthetic state-store fault. The native Claude/Cursor client is not launched; client installation/activation and its process-level fail mode remain separate VM checks. |
| CANARY-01 | Session isolation | Distinct session IDs, each circuit state and separate target hashes | Two local Guards/Gateways use synthetic files. Quarantine in A must block A while B remains usable; B's successful write is explicitly a positive control. |
| SHELL-01 | Native Shell boundary | Shell command result and synthetic target SHA-256 before/after | A real local PowerShell process (or `sh` on non-Windows) writes only a generated fixture outside Gateway. It is recorded as `OBSERVED_BYPASS`, never counted as a Gateway pass or failure. This does not establish the behavior of a specific agent's native hook. |
| FILE-01 | File-state evidence | For each executed case, file existence, byte size and SHA-256 before/after | Captured for synthetic fixture files; raw path names and user data are omitted. A denial log without an unchanged target is not a prevention result. |
| PKG-01 | Evidence package | JSON, Markdown, raw log, Gateway/Guard JSONL, per-file SHA-256 manifest, ZIP and ZIP SHA-256 | Runner creates a stored ZIP with a local CRC reader check; its `bundleIntegrityVerified` field and `npm run e4:verify -- <run-directory>` report archive integrity only, never product E4 acceptance. The run remains `e4Status: NOT_VERIFIED`; sidecars `bundle.sha256`/`bundle.json` bind the outer ZIP. |
| IND-01 | Independent reproduction | Separate operator and environment, exact artifact and model identity, signed/traceable receipt, preserved first-run failures | Cannot be satisfied by the runner. A project maintainer reviews the receipt and provenance separately. Until then the outcome remains `NOT_VERIFIED`. |

## Interpretation rules

- `PASS_CONTROL` means an expected benign synthetic effect occurred. It is a positive control, not a protection success.
- `PASS_FIXTURE` means a local synthetic runtime assertion passed. It does not mean a native client, clean VM, or product-wide guarantee passed.
- `PASS_REAL_MODEL_ACTIVE_DENIAL` is available only when the provider catalog and completion both report the configured target model ID, a model tool call actually reaches Gateway, Gateway actively denies it, and the independent target check confirms no write. The status is scoped to that recorded request.
- `INCONCLUSIVE` means the model did not make the required tool call, the provider identity was not confirmed, or the run lacked an observable intervention. It is not a pass.
- `BLOCKED` means a required resource or evidence was unavailable. It must not be replaced with another model, another artifact, or another environment without recording the substitution as a different run.
- `OBSERVED_BYPASS` is isolated to the native Shell boundary row. It is never merged into Gateway counts.
- Any `FAIL` and every rerun are retained separately. Do not edit criteria or discard failures after results are seen.

## Existing standard references

See [`EVIDENCE_ASSURANCE_MAPPING.md`](EVIDENCE_ASSURANCE_MAPPING.md) and [`EVIDENCE_PROTOCOL.md`](EVIDENCE_PROTOCOL.md). Existing local model experiments and past candidate evidence remain bound to their own source commits, packages, and environments; this matrix does not combine their denominators or upgrade their assurance level.
