# E4 evidence index

**Status as of 2026-10-13: independent E4 remains NOT_VERIFIED and its evidence gate remains BLOCKED.** The stable v3.0.0 release is published; that release status does not change the E4 result. This page indexes the recorded evidence and limits and does not claim an external certification or independent audit.

## Published v3.0.0 mainline verification

The current stable release is tag `v3.0.0`, commit `42d1d4d9f42fdc89a9c38c338310679afb924e54`. Its [mainline verification receipt](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/42d1d4d9f42fdc89a9c38c338310679afb924e54/docs/3.0/MAINLINE_VERIFY_2026-10-13.json) records `npm run verify` on a Windows host with Node.js 22.23.1: build passed, 100/100 automated tests passed, offline self-test 4/4, SDK type checks 5/5, source manifest 181 files with 0 mismatches, and packed-package smoke 72 files passed.

These are bounded release-source checks from the recorded host. They do not verify an independent operator/environment, a clean Windows VM, or global protection of native host tools. The [release page](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0) marks v3.0.0 as the current stable release while continuing to list E4 as BLOCKED / NOT VERIFIED.

## Separate competition bundle

The published [v3.0.0-competition Community bundle](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0-competition) is a separate competition release, not the current stable CLI/package release. Its release notes say its assets were copied unchanged from [candidate.4](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0-competition-candidate.4). GitHub release metadata lists identical names, sizes, and SHA-256 digests for all nine assets in those two releases. This establishes asset identity only; candidate-specific validation remains tied to those assets and does not become v3.0.0 stable evidence.

## Current external packet review

A packet described as a candidate.4 test on another Windows computer was received and reviewed for archive integrity. Its internal hash manifest matched 32 of 32 listed data files. That proves consistency with the archive's own manifest, not the operator's identity or independence.

The review records 40 raw result rows: 29 PASS, 4 PASS_CONTROL, 4 FAIL, 2 CONFIRMED_BYPASS, and 1 CONFIRMED_DOCUMENTED. The normalized 35-row view is a review aid, not an independent sample count or protection-rate denominator. The bypasses and failed attempts remain part of the evidence.

The packet self-attests to the separate computer/operator. Its security matrix did not use a real LLM, did not route native host tools through the Gateway, and did not run in a clean VM. The package review therefore records external reproduction evidence as PARTIAL, operator independence as NOT_VERIFIED, and overall E4 as NOT_VERIFIED. The raw archive is not included in this repository.

## 2026-10-13 VM attempt

The recorded Windows 11 VM run was BLOCKED before product testing: the guest remained at network setup, VMware NAT was stopped, and guest operations required an unlock credential. No candidate installation, SDK/MCP side-effect test, real-model call, or uninstall/reinstall was completed. Do not count this as a failed product test or as E4.

## Evidence map

| Record | What it supports | What it does not support |
|---|---|---|
| [v3.0.0 mainline verification receipt](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/42d1d4d9f42fdc89a9c38c338310679afb924e54/docs/3.0/MAINLINE_VERIFY_2026-10-13.json) and [test-results report](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/42d1d4d9f42fdc89a9c38c338310679afb924e54/docs/3.0/TEST_RESULTS.md) | Release-source build, bounded test, self-test, type, manifest, and package-smoke outcomes on the recorded host | Independent E4, clean-VM acceptance, or global native-host protection |
| [v3.0.0-competition release](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0-competition) | Published competition bundle with asset digests matching candidate.4 | Current stable CLI/package status or new independent E4 evidence |
| [External packet review](docs/3.0/E4_EXTERNAL_EVIDENCE_REVIEW_2026-10-13.md) and [machine-readable summary](docs/3.0/E4_EXTERNAL_EVIDENCE_REVIEW_2026-10-13.json) | Archive self-consistency, reported test rows, explicit review status and limitations | Verified operator identity, clean VM, real LLM behavior, native host coverage, or independent E4 |
| [VM automation run](docs/3.0/E4_AUTOMATION_RUN_2026-10-13.md) | The exact blocked stages and why no product test occurred | Product pass/fail, guest execution, or release readiness |
| [Auto E4 scope](docs/3.0/AUTO_E4.md) | What the source runner inspects and the synthetic checks it can perform | A certifier, automatic VM control, a model call, GitHub writes, or external independence |
| [Security boundaries](docs/3.0/SECURITY_BOUNDARIES.md) and [limitations](docs/3.0/SECURITY_LIMITATIONS.md) | Product-level scope and known technical limits | Global protection of native host tools or rollback of started operations |
| [Candidate-specific reproduction guide](competition-submission/3.0-typefix/E4_REPRODUCTION.md) | Instructions and hashes for the named historical candidate artifact | Equivalence to candidate.4, current branch code, or external E4 completion |
| [Host coverage matrix](docs/3.0/AGENT_COVERAGE_MATRIX.md) | Dated, host- and tool-specific records | Coverage beyond the versions/tools actually listed |

## Gate for a future E4 claim

Before marking E4 verified, publish a protocol and evidence tied to one immutable release artifact and require:

1. A genuinely independent operator and environment, with identity/independence reviewed without publishing personal data.
2. A clean disposable VM or equivalent documented isolation, plus exact OS, host, artifact, and SHA-256.
3. Actual execution of the planned SDK/host tasks, with real side-effect observations such as before/after hashes and receiver counts.
4. Positive and negative controls, retained failures, and clear separation of model-selected behavior from operator-triggered tests.
5. Installation, removal, and repeat-install observations where claimed.
6. A signed or otherwise reviewable receipt that binds the operator, artifact, environment, commands, and results.

A SHA-256 manifest alone is not a signature or independent timestamp. CI and same-machine tests remain useful, but they do not satisfy this E4 gate.
