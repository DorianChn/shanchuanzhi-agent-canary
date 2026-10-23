# M6 Issue #57 — live GitHub product-artifact audit

**Snapshot:** 2026-10-22 21:18 UTC  
**Disposition:** **E4 BLOCKED / NOT_VERIFIED.** No product-level E4 acceptance bundle was located in the public evidence examined. A current product-build artifact exists, but its own records explicitly limit it to extraction and a controlled synthetic Hook fixture; it does not prove installation or independent E4.

## Scope and handling

Read current GitHub release/tag metadata, the complete current Actions-artifact metadata listing, M6 PR #38 and its exact-head runs, and the relevant release evidence archives. Downloaded artifacts only for hashing, ZIP integrity, and central-directory or acceptance-metadata inspection. No raw user log was opened or printed. No installer, VM, or real-model test was run.

This audit describes public GitHub artifacts and the inspected local M6 checkout only. It does not rule out evidence held outside the repository or inside older Actions archives whose contents are not listed here.

## Current M6 head

PR [#38](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/38) is OPEN/Draft at ef4679b276a90767bb1a6d7bd852aadc45b2d1cb.

- Exact-head CI run 39837166188: 9/9 jobs passed.
- Exact-head Windows Community wrapper run 39837166397: 2/2 jobs passed.
- Both run artifact endpoints return total_count: 0. These checks validate source/test behavior, not product E4.

## Product-build artifact found; not an E4 bundle

The newest unexpired Actions artifact is:

| Field | Value |
|---|---|
| Artifact | windows-community-build-evidence-868842b1b7d76cf94a8d84a5f76c6acd4ca67f50 |
| Artifact ID | 12442531312 |
| Producer | M7 PR [#39](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/39), Windows Community wrapper run 39815479411, attempt 1 |
| Producer branch / source commit | feature/ac3-reliability-ac3 / 868842b1b7d76cf94a8d84a5f76c6acd4ca67f50 |
| Created / expires | 2026-10-22 16:40:09 UTC / 2026-10-29 16:40:07 UTC |
| ZIP size / SHA-256 | 38,188,440 bytes / ecc4a73543a08216f30deb894cdbd4a57dc562fa35e79c7dc56dd484b027e62d |
| Independent retrieval path | GET /repos/DorianChn/shanchuanzhi-agent-canary/actions/artifacts/12442531312/zip or gh run download 39815479411 --name windows-community-build-evidence-868842b1b7d76cf94a8d84a5f76c6acd4ca67f50 |

The downloaded ZIP SHA-256 matches the GitHub artifact API digest. Its seven entries are AgentCanary-Community-Setup.exe, BUILD_REPORT.json, CANARY_RESULT.json, extracted-hook/claude-native-hook.mjs, extracted-hook/e4-hook-faults.mjs, PAYLOAD_MANIFEST.json, and SHA256SUMS.txt.

Relevant acceptance metadata inside the archive:

- BUILD_REPORT.json says status=SETUP_EXTRACTED_HOOK_CANARY_EXECUTED_INSTALLER_NOT_RUN, installerExecuted=false, and records package version 3.0.0-competition-candidate.2.
- CANARY_RESULT.json says status=PASS, but scopes that result to REAL_PACKAGED_HOOK_WRAPPER_WITH_CONTROLLED_HOST_FIXTURE; NOT A THIRD-PARTY HOST OR VM TEST. It records synthetic input, unsafeCallbackStarts=0, and an unchanged protected fixture.
- The Setup.exe digest in the archive manifest is 7f04419e9250ec03fa5c936e7caac46b7c641ad1290c054a99bfb2d206998843.

Thus this is usable product-build and packaged-Hook fixture evidence, but its PASS is not an installed-product, clean-VM, real-host, or independent E4 PASS. The label e4-hook-faults.mjs does not change the declared test scope.

## Release evidence checked

The public v3.0 candidate tags include candidates 1–4 and v3.0.0-competition; the stable v3.0.0 release currently has no assets.

For v3.0.0-competition-candidate.4 (tag commit 725967fece0e3c8f5604765145a8a8906da88f4b):

- FINAL_PUBLIC_ACCEPTANCE.json (asset 635832894, SHA-256 51efe608461f3065ca3d881b88dc23da5985895a95dbaa020a1331c05800bdab) records GUI.E4=NOT_VERIFIED and cleanVM=BLOCKED.
- PACKAGE_RELEASE_VERIFICATION.json (asset 635833038, SHA-256 147bcc7e9fe392489ffe9b252f5f71bad4e148e6ea2bc9dc310a8984d759711f) records E4=NOT_VERIFIED.
- AgentCanary-Community-Setup.exe (asset 635832916) is a separate public package with SHA-256 567b1e7e8832b6aa31fc80c86994eb915bf8d3db9caf125c1f7a08b42cf94ce6.
- AgentCanary-candidate4-acceptance-evidence.zip (asset 635832895, 173,289 bytes, SHA-256 9cba2d2193164f17d4a8b4ca93aaa0232ff0ae0b11b602ee01b83695f754bbb8) has no M6 verifier bundle file set (SHA256SUMS.txt, report.json, report.md, raw.log). Only ZIP entry names and sizes were inspected.

The similarly named evidence ZIPs on candidate tags 1–3 were also checked by hash and ZIP entry names. None had the M6 verifier report set; candidate.3 had only a standalone SHA256SUMS.txt. No file contents from raw-log paths were opened.

## Current Actions inventory boundary

GitHub currently reports seven non-expired Actions artifacts; all are named windows-community-build-evidence-* and originate from the M7 feature/ac3-reliability-ac3 branch:

| Artifact ID | Producer run | Source commit | Expires |
|---:|---:|---|---|
| 12442531312 | 39815479411 | 868842b1b7d76cf94a8d84a5f76c6acd4ca67f50 | 2026-10-29 16:40 UTC |
| 12436327642 | 39802355210 | 167ebe81b76cc434facdaa3ddc62b42b9843951a | 2026-10-29 15:13 UTC |
| 12361371963 | 39635364779 | cdae8baf13a4ee2f06cc7655a684b7eab0b6ed3a | 2026-10-28 16:33 UTC |
| 12360096878 | 39632431555 | f1adbfd95430f1193c8aabb7de195ed1dcee1f9e | 2026-10-28 16:13 UTC |
| 12332644890 | 39573529232 | 9330005b2e15c521b9645a728d34e9477d8d6340 | 2026-10-28 09:02 UTC |
| 12309135499 | 39517510296 | b0581407def769946fa710f55cd1d0986ce0cf3b | 2026-10-27 23:52 UTC |
| 12306808994 | 39515330089 | a3c62f3d7f1f7aa408facf85bcc43e978fb0e46e | 2026-10-27 23:31 UTC |

The newest archive was inspected in detail. The other six are identified by live API metadata but their ZIP contents were not independently opened in this audit, so this report does not make a claim about their internal entries.

## M6 owner disposition and missing dependencies

Keep Issue #57 OPEN / NOT_VERIFIED. M6 owns E4 verifier semantics and reporting; M7 owns the installer, shipped payload, and build provenance. The current M7 artifact supplies a Setup.exe and build evidence, but says the installer was not run. The required missing evidence is an installed build tested in a clean independent Windows environment, product/host actions bound to the exact build and hashes, the required provider-confirmed real-model call where applicable, and an identity-verifiable independent operator receipt. Any VMware, real-model, or installer execution must use the exclusive reservation process on Issue #29.

The latest Issue #57 comment is the M0 lane-end entry from 2026-10-21 18:30 UTC; no M6/M7 owner response or delivery date is recorded there. **Earliest delivery cannot be confirmed from this repository or current Issue #57 history.** No fixture, source CI, extracted Hook result, or package metadata should be presented as product E4 PASS.

## Follow-up snapshot — 2026-10-23 03:20 UTC

This follow-up supersedes the time-sensitive PR, Actions inventory, and Issue #57 statements above. The 2026-10-22 release-archive inspection remains a historical snapshot.

M6 PR [#38](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/38) is OPEN/Draft at `3578e7ba10b2fd160efa0e4683aba863c666db8a`, based on `62496d4020bd90ba2eede49b2e80a2bbebb036b4`. Its exact-head CI run `39877189592` passed 9/9 jobs and Windows Community wrapper run `39877189739` passed 2/2. These remain verifier/source checks, not product E4 acceptance.

M7 PR [#39](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/39) is OPEN/Draft at `1448a46ce43a2211e14be70fcd9c256b21d74c1f`. Exact-head workflow run `39893792191` completed successfully. It uploaded:

| Artifact | ID | Size | GitHub artifact digest |
|---|---:|---:|---|
| `windows-community-build-evidence-1448a46ce43a2211e14be70fcd9c256b21d74c1f` | 12476161230 | 38,195,763 bytes | `sha256:d2a322e4b19e9ae2782e735a26a4377fda8b60f5245fd8e34dde2ea600054d8b` |
| `windows-community-installer-lifecycle-1448a46ce43a2211e14be70fcd9c256b21d74c1f` | 12475873203 | 1,308 bytes | `sha256:08f9ae288a316625e34fed019ea4cc91be85c4fb57c658e884042e9b6527a3a2` |

The lifecycle artifact was downloaded and its sanitized `INSTALLER_LIFECYCLE_RESULT.json` read. It reports `PASS_BOUNDED_GITHUB_HOSTED_INSTALL_UNINSTALL`, source SHA `1448a46ce43a2211e14be70fcd9c256b21d74c1f`, and installer SHA-256 `25442c5e350225cea8f2c33bc8d09bc9e4008734a38ccbcca87dc1caa9eb086f`. All four recorded checks passed: artifact provenance, silent install to a Unicode/space path, duplicate-candidate refusal, and silent uninstall. The recorded runner was GitHub-hosted Windows Server 2025 Datacenter, build `26100`; the report says its execution context does not assert a standard-user token. It also explicitly leaves EFS, in-place upgrade, Windows 11 client, real model/native agent, cancellation/rollback, and ordinary-user-token behavior untested or unverified.

This is new bounded hosted installer-lifecycle evidence and improves artifact traceability. It does not establish a Windows 11 clean-VM reproduction by an independent operator, real-model/host actions against the installed package, or an authenticated independent receipt. M6 has not run its verifier positive and mismatch controls against a qualifying product E4 bundle because none is identified in the current public inventory. Issue #57 therefore remains OPEN/P1/NOT_VERIFIED; no E4 PASS is claimed, and earliest delivery remains unconfirmed.

## Follow-up snapshot — 2026-10-23 04:12 UTC

### Exact owner heads and hosted evidence

M6 PR [#38](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/38) is OPEN/Draft at `c0b4a0b969323b5d0c1b032d40b2c41286eb5f45`. Exact-head CI run `39895141579` passed 9/9 jobs and Windows Community wrapper run `39895141608` passed 2/2. These are source and fixture checks.

M7 PR [#39](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/39) is OPEN/Draft at `1ab085abc6a242be563912a423ff1ee7f11e7127`. Workflow run `39897235833` completed successfully and published the current build and lifecycle artifacts:

| Artifact | ID | Size | GitHub artifact digest |
|---|---:|---:|---|
| `windows-community-build-evidence-1ab085abc6a242be563912a423ff1ee7f11e7127` | 12477356625 | 38,195,641 bytes | `sha256:004a4076dc35881a43a7eab9a1671ebd3b813f9a01937d522e178a0dcbcaac81` |
| `windows-community-installer-lifecycle-1ab085abc6a242be563912a423ff1ee7f11e7127` | 12477472135 | 1,305 bytes | `sha256:36a3c2eae1311d126367f266c3a290fbd0827b17e051a39f0f4453dde18f46fe` |

The latest sanitized lifecycle result was downloaded and read. It binds source `1ab085abc6a242be563912a423ff1ee7f11e7127` to installer SHA-256 `ae6add6905ddcbef4dd04a3f14089caa37527e93c6e883a0a0c906f48740247f`. All four checks passed: package provenance, silent install into a Unicode/space path, duplicate-candidate refusal, and silent uninstall with zero reported residue and unknown sentinel preserved. The runner is GitHub-hosted Windows Server 2025 Datacenter build `26100`; the result does not assert a standard-user token. It explicitly leaves Windows 11 client, EFS, upgrade, cancellation/rollback, real-model/native-agent use, and ordinary-user-token behavior untested or unverified.

M9 PR [#36](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/36) is OPEN/Draft at `8775020b802af71946cd921939d8441f75d8bb64`. Exact-head composition run `39898436423` succeeded on Ubuntu and Windows. Inspection of that workflow shows it pins M6 at `3578e7ba10b2fd160efa0e4683aba863c666db8a`, so the run does not include current M6 head `c0b4a0b`; it pins M7 at current head `1ab085a`. The composition result is synthetic module/package evidence and does not test independent product E4.

### M6 verifier regression

The verifier previously accepted a synthetic report containing two `MODEL-REAL-TOOLCALL` rows, then summarized only the first row. This was reproduced before the fix: the verifier exited 0 and emitted `modelStatus: BLOCKED` for the ambiguous report. The verifier now rejects malformed case arrays, missing/blank case IDs, and duplicate case IDs before summarizing required matrix cases. Regression tests cover a duplicate ID, a non-array case list, and a row without an ID. `npm run e4:test` passes 21/21 tests and `git diff --check` passes. This closes a report-ambiguity gap only; it does not establish model identity, product behavior, or E4 acceptance.

Issue [#57](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/57) remains OPEN/P1. No qualifying independent product E4 bundle or authenticated independent-operator receipt is identified, and earliest delivery remains unconfirmed. No E4 PASS is claimed.
