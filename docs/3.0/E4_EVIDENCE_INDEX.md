# Agent Canary 3.0 E4 Evidence Index

This index keeps evidence tied to the exact source, package and environment that produced it. Historical runs are not merged with the M6 source run. Local source archives stay on the author's workstation; this repository contains only their filenames, recorded digests and reviewed limitations, not raw synthetic canary values or device details.

## Historical candidate.4 evidence reviewed

The following artifacts are retained on the author workstation under `Desktop/Agent_Canary_3.0_E4_Auto_Test/` unless otherwise stated.

| Artifact | SHA-256 | Recorded scope and disposition |
|---|---|---|
| `Agent_Canary_3.0_E4_External_Test.zip` (original input at `Desktop/`) | `D2E45B07BD74FABB7D6AEB2C860DD43A5334A9EAB87E005ABA55B60E212C30AE` | Rechecked on 2026-10-13: 50,877 bytes, 33 ZIP entries, embedded manifest 32/32. External records are `PARTIAL`; operator identity/sign-off is self-asserted, tests used synthetic SDK/MCP drivers, no LLM, no clean Windows VM. Original ZIP was not executed or copied into this repository. |
| `Agent_Canary_3.0_E4_Auto_Test.before-final.zip` | `D3D18CDC1224D452E54DB88FF55AC41C5B6F4ACB4F50A0F5EE72988E60643E9D` | Historical author-side E4 collection snapshot; 38,204,694 bytes. Do not use its filename as an E4 certification. |
| `Agent_Canary_3.0_E4_Auto_Test.pre-delivery-refresh.zip` | `89B443EC7BCE8AE03835AD2F4D51EB20118127ECBD98087AF976185DA81625A8` | Later historical author-side collection; 38,437,808 bytes. It records the same blocked VM/model gates and does not turn an author run into E4. |
| `public-release-candidate4/AgentCanary-candidate4-acceptance-evidence.zip` and matching release asset | `9CBA2D2193164F17D4A8B4CA93AAA0232FF0AE0B11B602EE01B83695F754BBB8` | Candidate.4 supporting evidence ZIP; local copy was 173,289 bytes and its digest matched the release asset. This does not bind its contents to this M6 commit. |
| `E4_EVIDENCE_BUNDLE/public-release/AgentCanary-Community-Setup.exe` | `567B1E7E8832B6AA31FC80C86994EB915BF8D3DB9CAF125C1F7A08B42CF94CE6` | Public candidate.4 installer. `NotSigned`; historical record says it was not executed in the VM. It is not the artifact tested by the M6 author harness. |
| Candidate.4 community source ZIP `Agent_Canary_3_0_Community_Preview_48d5c440.zip` | `2A0065B68F07003D46C3A3E766F1B20E9E059487D12E7185F1727D4D1F672A8E` | Historical source bundle; recorded source SHA prefix `48d5c440`. Distinct from M6 branch source. |

The historical review normalized 40 raw external records to a 35-row review view only to remove four superseded path failures and one duplicate control. The 40 originals and four first-run failures remain preserved. The review view is not an independent sample count or efficacy denominator. Two native `child_process`/direct `fs` records were reported separately as confirmed boundary bypasses; the separate native Shell row must not be folded into Gateway results.

Historical release identity was `v3.0.0-competition-candidate.4`, with installer digest above. The public source SHA, package ZIP and installer are recorded as separate identities. The 2026-10-13 review found no authenticated external sign-off, no GPT-6 Luna Max call (0 requests), and no guest installation/test because the Windows 11 guest was still at OOBE network setup and the recorded VMware NAT service stopped with exit code 1067. These facts are the archived run's state, not a claim about a later VM state.

## M6 author automation run

| Field | Value |
|---|---|
| Recorded run | [`20261013T084123Z`](../../security-lab/e4-runs/20261013T084123Z/report.json) |
| Bound source | Commit `04b3d983a650b054447371c0dc2d30497033dbfd`, tree `2d47e7a60b417671f70aad3efd32feeda3afd7f0`; clean at run start (`dirtyAtStart=false`) |
| Package | Source package version `3.0.0`; no installable artifact supplied (`artifactSha256=NOT_SUPPLIED`) |
| Model | Requested display name `GPT-6 Luna Max`; provider, model ID, endpoint, and API key environment values absent; 0 model requests, 0 tool calls, identity `NOT_VERIFIED`, case `BLOCKED` |
| VM | No VM receipt or installed artifact supplied; no shared VMware test started or changed because the M0 coordination thread could not be read in this session |
| Case counts | 10 total: 5 `PASS_FIXTURE`, 1 `PASS_CONTROL`, 1 `OBSERVED_BYPASS`, 3 `BLOCKED`, 0 `FAIL` |
| Raw files | `raw.log`, `evidence/*.jsonl`, `report.json`, `report.md`, `SHA256SUMS.txt` |
| ZIP and verification | `evidence.zip` SHA-256 `f1cda41498f984cddf54c19b096ec5e7f4ab6f98ed1b2e806129d233bf017a6a`; `npm run e4:verify -- security-lab/e4-runs/20261013T084123Z` returned valid with 13 ZIP entries |
| E4 classification | `AUTHOR_AUTOMATION_RUN_NOT_E4`; `e4Status=NOT_VERIFIED` |

This is an author-run synthetic harness record. It does not establish an installed-app result, a clean-VM result, a real-model result, or independent testing. The bundle and report preserve the exact source and each case outcome. The model case was intentionally run with `--real-model` so the absence of a configured target is recorded as `BLOCKED` with zero requests; no replacement model was used.
## Integrity and limitations

- `npm run e4:verify -- <run-directory>` checks the ZIP central/local records, CRC-32 values, internal SHA-256 manifest, expected result files, required case IDs, and the rule that automation must not promote E4.
- `bundle.sha256` and `bundle.json` are sidecars and are not self-included in `evidence.zip`; `SHA256SUMS.txt` covers all files inside the ZIP other than itself.
- The local evidence writer and verifier are ordinary software in the same trust domain. They do not provide a signature, independent timestamp, immutable storage, or protection from an administrator rewriting the entire bundle.
- A third-party signature/receipt must be kept separately and reviewed against the artifact and environment. It is not inferred from `operatorRole=external-claim`.
