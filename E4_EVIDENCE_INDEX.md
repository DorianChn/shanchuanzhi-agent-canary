# E4 evidence index

**Status as of 2026-10-13: independent E4 remains NOT_VERIFIED and its evidence gate remains BLOCKED.** The v3.0.0 GitHub Release is published but has no attached assets; the competition Release and candidate.4 prerelease have separate candidate/community assets. Publication status does not change the E4 result. This page indexes the recorded evidence and limits and does not claim an external certification or independent audit.

## v3.0.0 source-tag verification

The `v3.0.0` source tag points to commit `42d1d4d9f42fdc89a9c38c338310679afb924e54`. Its [mainline verification receipt](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/42d1d4d9f42fdc89a9c38c338310679afb924e54/docs/3.0/MAINLINE_VERIFY_2026-10-13.json) records `npm run verify` on a Windows host with Node.js 22.23.1: build passed, 100/100 automated tests passed, offline self-test 4/4, SDK type checks 5/5, source manifest 181 files with 0 mismatches, and packed-package smoke 72 files passed.

These are bounded source checks from the recorded host. They do not verify an independent operator/environment, a clean Windows VM, or global protection of native host tools. The published v3.0.0 Release and its source verification receipt are not evidence that E4 is complete.

## Competition releases and source tags

The `v3.0.0-competition` Release and `v3.0.0-competition-candidate.4` prerelease are published with separate candidate/community assets. Their publication and asset metadata do not establish equivalence to v3.0.0 or independent E4. Candidate-specific validation remains tied to its exact recorded source and artifact and does not become v3.0.0 evidence.

## Current external packet review

A packet described as a candidate.4 test on another Windows computer was received and reviewed for archive integrity. Its internal hash manifest matched 32 of 32 listed data files. That proves consistency with the archive's own manifest, not the operator's identity or independence.

The review records 40 raw result rows: 29 PASS, 4 PASS_CONTROL, 4 FAIL, 2 CONFIRMED_BYPASS, and 1 CONFIRMED_DOCUMENTED. The normalized 35-row view is a review aid, not an independent sample count or protection-rate denominator. The bypasses and failed attempts remain part of the evidence.

The packet self-attests to the separate computer/operator. Its security matrix did not use a real LLM, did not route native host tools through the Gateway, and did not run in a clean VM. The package review therefore records external reproduction evidence as PARTIAL, operator independence as NOT_VERIFIED, and overall E4 as NOT_VERIFIED. The raw archive is not included in this repository.

## 2026-10-13 VM attempt

The recorded Windows 11 VM run was BLOCKED before product testing: the guest remained at network setup, VMware NAT was stopped, and guest operations required an unlock credential. No candidate installation, SDK/MCP side-effect test, real-model call, or uninstall/reinstall was completed. Do not count this as a failed product test or as E4.

## Evidence map

| Record | What it supports | What it does not support |
|---|---|---|
| [v3.0.0 mainline verification receipt](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/42d1d4d9f42fdc89a9c38c338310679afb924e54/docs/3.0/MAINLINE_VERIFY_2026-10-13.json) and [test-results report](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/42d1d4d9f42fdc89a9c38c338310679afb924e54/docs/3.0/TEST_RESULTS.md) | Source build, bounded test, self-test, type, manifest, and package-smoke outcomes on the recorded host | Independent E4, clean-VM acceptance, or global native-host protection |
| [v3.0.0-competition source tag](https://github.com/DorianChn/shanchuanzhi-agent-canary/tree/v3.0.0-competition) | Competition source snapshot | Published Release assets, current stable CLI/package status, or new independent E4 evidence |
| [External packet review](docs/3.0/E4_EXTERNAL_EVIDENCE_REVIEW_2026-10-13.md) and [machine-readable summary](docs/3.0/E4_EXTERNAL_EVIDENCE_REVIEW_2026-10-13.json) | Archive self-consistency, reported test rows, explicit review status and limitations | Verified operator identity, clean VM, real LLM behavior, native host coverage, or independent E4 |
| [VM automation run](docs/3.0/E4_AUTOMATION_RUN_2026-10-13.md) | The exact blocked stages and why no product test occurred | Product pass/fail, guest execution, or release readiness |
| [Auto E4 scope](docs/3.0/AUTO_E4.md) | What the source runner inspects and the synthetic checks it can perform | A certifier, automatic VM control, a model call, GitHub writes, or external independence |
| [Security boundaries](docs/3.0/SECURITY_BOUNDARIES.md) and [limitations](docs/3.0/SECURITY_LIMITATIONS.md) | Product-level scope and known technical limits | Global protection of native host tools or rollback of started operations |
| [Candidate-specific reproduction guide](competition-submission/3.0-typefix/E4_REPRODUCTION.md) | Instructions and hashes for the named historical candidate artifact | Equivalence to candidate.4, current branch code, or external E4 completion |
| [Host coverage matrix](docs/3.0/AGENT_COVERAGE_MATRIX.md) | Dated, host- and tool-specific records | Coverage beyond the versions/tools actually listed |

## M6 Auto E4 workflow for an M8 evidence record

This workflow maps the bounded verifier currently in M6 PR #38 at source head [`98803607b89f11e24430c461bd91e9c1a0ece9d4`](https://github.com/DorianChn/shanchuanzhi-agent-canary/tree/98803607b89f11e24430c461bd91e9c1a0ece9d4) to a user-run evidence packet. The Auto E4 UI is available only in a Windows Community candidate built from reviewed source that contains this implementation. Do not assume an older public installer has it; this documentation change does not rebuild or replace any published artifact.

### Run and retain one bounded check

1. Build and identify the Windows Community candidate from the reviewed source. Record its exact source commit, candidate/version, installer SHA-256, Windows version, and architecture. A locally computed hash identifies the bytes you checked; it is not publisher authentication.
2. On Windows, launch that candidate and click **自动 E4 / Auto E4** once. Let all stages finish; the UI disables concurrent actions during the run. Do not mark an unrun stage as passing, rerun to erase a failure, or omit `FAIL`, `BLOCKED`, `SKIPPED`, or `NOT_VERIFIED` results.
3. Use **打开最终报告 / Open final report** and review the Markdown and structured JSON. The run directory is `%LOCALAPPDATA%\AgentCanaryCommunityData\auto-e4-runs\<run-id>\`. Retain `AUTO_E4_REPORT.md`, `AUTO_E4_REPORT.json`, `events.jsonl`, `EVIDENCE_INDEX.json`, and, when bundle creation succeeds, `AgentCanary-Auto-E4-Evidence.zip` with its `.sha256` sidecar. The index binds the generated report/event files by SHA-256; the sidecar hashes the ZIP. Review the contents and redact any remaining identifying material before sharing.
4. For a human-readable M8 evidence entry, report the exact source/artifact identity and run date, each stage's recorded status, `technicalResult`, the `overallE4` field, and the ZIP SHA-256 if present. Preserve failures and blocked prerequisites as observed. The `coverage.verified / coverage.total` value is stage coverage only, not a protection rate or security score.

### What each stage can establish

| Auto E4 stage | Evidence this run can record | Boundary to keep in the M8 report |
|---|---|---|
| `environment` | Host OS, architecture, Node version, and presence checks for `vmrun` / Codex CLI | CLI presence does not identify the active model or prove a model call; no credentials or machine fingerprint are collected. |
| `clean-vm` | Read-only VMware VM/snapshot inspection for the configured VMX | It never starts, restores, or edits a VM. A listed clean snapshot is still not guest execution or clean-VM acceptance; the stage remains `BLOCKED` in this implementation. |
| `release-package` | Public candidate Release digest compared with a local installer receipt when both exist | Digest equality is not a publisher signature; missing or unrecognized candidate/receipt remains unverified or blocked. |
| `sdk-side-effects` | Operator-triggered SDK fixture with temporary synthetic file writes, callback observations, loopback receiver, before/after hashes, and evidence-chain verification | This is a controlled same-host fixture, not a model-selected attack or third-party Agent host test. Report observed side effects, not a `DENY` log alone. |
| `gpt6-agent` | Whether the prerequisites were present for the planned path | This runner makes no model API call. The stage is `BLOCKED`; a detected Codex executable is not GPT-6 evidence. |
| `hook-failures` | Packaged hook wrapper subprocess checks, including a positive control and synthetic victim hash/callback observations | The host is a cooperative fixture. It does not establish live Codex/Claude/Cursor native-hook coverage, VM failure behavior, or global protection. |
| `evidence-review` | Consistency review of this run's release, SDK, and hook results | It reviews same-run evidence only and cannot establish independent operator/environment status. |
| `uninstall-reinstall` | Records whether lifecycle prerequisites are available | No VM installer lifecycle operation is performed; this stage is `BLOCKED`. |
| `github-pr` | Records that the packaged app lacks a source checkout and GitHub write credential | It performs no GitHub writes and does not create or update a PR. |
| `materials` | Run-specific report/index/event artifacts and, if the local archive tool succeeds, the ZIP and digest sidecar | A bundle is not a complete competition submission or an independent evidence signature. At the M6 source head below, archive-failure recovery has a targeted regression: it preserves a finalized `BLOCKED` report, appends and re-indexes the failure event, and leaves ordinary no-overwrite behavior intact. CI for that exact source commit is pending; if bundle creation fails, no verified ZIP exists and `materials` must remain `BLOCKED`. |

The generated report distinguishes technical execution from external E4: `technicalResult` can be `FAIL`, `BLOCKED`, `PARTIAL`, or `READY_FOR_EXTERNAL_REVIEW`, while `overallE4` remains **E4 EXTERNAL INDEPENDENCE NOT VERIFIED**. A user-run pass of these fixtures is not an independent E4 result, real-model test, installation/lifecycle acceptance, or clean-VM acceptance. The missing gates are listed in [the Auto E4 scope](docs/3.0/AUTO_E4.md) and in the future-E4 gate below.

### Exact M6 source and test objects checked

The file contents below were read from the exact M6 source head [`6f81ca48c3ecc8f92bfe70bd501ee2a5062b76a`](https://github.com/DorianChn/shanchuanzhi-agent-canary/tree/6f81ca48c3ecc8f92bfe70bd501ee2a5062b76a). Blob IDs identify the exact Git objects used for this mapping; use the source commit links, not a moving branch name. M6 reported 32 targeted checks passing, 2 skipped, and 0 failing; GitHub CI for this exact commit is pending, so the previous remote-head CI result does not validate this recovery change.

| Role | File at M6 source head | Blob ID |
|---|---|---|
| Run state, stages, report and evidence-index contract | [`packaging/windows/auto-e4.mjs`](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/6f81ca48c3ecc8f92bfe70bd501ee2a5062b76a/packaging/windows/auto-e4.mjs) | `e2539df287a2ac88628792a59371dd7b075512ba` |
| Windows runner orchestration, bounded stages, ZIP and sidecar | [`packaging/windows/worker.mjs`](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/6f81ca48c3ecc8f92bfe70bd501ee2a5062b76a/packaging/windows/worker.mjs) | `b21ddf67ac84f8c5203f758399335d3482153990` |
| SDK side-effect fixture | [`packaging/windows/verification.mjs`](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/6f81ca48c3ecc8f92bfe70bd501ee2a5062b76a/packaging/windows/verification.mjs) | `4652a88117f017a533460259ce5fc0b9df157bc1` |
| Packaged Hook fault fixture and scope | [`packaging/windows/e4-hook-faults.mjs`](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/6f81ca48c3ecc8f92bfe70bd501ee2a5062b76a/packaging/windows/e4-hook-faults.mjs) | `8d73bb9b59da787fde13b73ba6d2277e82b7bb1c` |
| Stage/status/artifact regression tests | [`test/auto-e4.test.mjs`](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/6f81ca48c3ecc8f92bfe70bd501ee2a5062b76a/test/auto-e4.test.mjs) | `18fcc4b91e229d029f0f55c420ca3d0580d2c68d` |
| Bundle-failure recovery regression | [`packaging/windows/test-worker.mjs`](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/6f81ca48c3ecc8f92bfe70bd501ee2a5062b76a/packaging/windows/test-worker.mjs) | `ecb9c3401fa0e42ae0e58ab7df9666ef99a29bb7` |
| Windows UI/package contract tests | [`test/windows-packaging.test.mjs`](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/6f81ca48c3ecc8f92bfe70bd501ee2a5062b76a/test/windows-packaging.test.mjs) | `4a0f5e53f2e7569a947ac277f32d67d353ffa006` |
| Desktop Auto E4 button and report-location contract | [`packaging/windows/Launcher.cs`](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/6f81ca48c3ecc8f92bfe70bd501ee2a5062b76a/packaging/windows/Launcher.cs) | `b9f91b0872228a94d42890b18fa1a252b0c7ac3a` |

For a source-level regression check (maintainer evidence only, not a user E4 run), run this from a checkout with dependencies installed:

```sh
npm run build
node --test test/auto-e4.test.mjs packaging/windows/test-worker.mjs test/windows-packaging.test.mjs
```

This tests the bounded harness contract and does not install the Windows candidate or exercise an independent environment.

## Gate for a future E4 claim

Before marking E4 verified, publish a protocol and evidence tied to one immutable release artifact and require:

1. A genuinely independent operator and environment, with identity/independence reviewed without publishing personal data.
2. A clean disposable VM or equivalent documented isolation, plus exact OS, host, artifact, and SHA-256.
3. Actual execution of the planned SDK/host tasks, with real side-effect observations such as before/after hashes and receiver counts.
4. Positive and negative controls, retained failures, and clear separation of model-selected behavior from operator-triggered tests.
5. Installation, removal, and repeat-install observations where claimed.
6. A signed or otherwise reviewable receipt that binds the operator, artifact, environment, commands, and results.

A SHA-256 manifest alone is not a signature or independent timestamp. CI and same-machine tests remain useful, but they do not satisfy this E4 gate.
