# M6 E4 Independent Acceptance Audit

**Snapshot:** 2026-10-23 04:58 UTC  
**M6 source:** `feature/ac3-e4-validation-ac3` at `82d4e25a210a4c6d1f2c7f8e6d94ce56af1cd56b`  
**Tracking:** [Issue #57](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/57), OPEN / P1 / NOT_VERIFIED; [M6 PR #38](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/38), OPEN / Draft

## Disposition

No M6 verifier fail-open was found for product E4 acceptance. The bundle verifier validates archive and external-copy integrity, but explicitly reports `evidenceScope=BUNDLE_INTEGRITY_ONLY`, `productE4Accepted=false`, and `e4Status=NOT_VERIFIED`. It rejects a promoted E4 status or classification. The author runner likewise labels its result NOT_VERIFIED; an optional `--artifact` input is hashed only and is not installed or executed. A valid bundle therefore means its recorded bytes and internal consistency were checked; it does not mean product acceptance passed.

The open gate is missing product-bound, independently witnessed evidence, not an unhandled verifier success path. Keep Issue #57 OPEN / NOT_VERIFIED. Do not infer a product E4 PASS from local tests, source CI, synthetic fixtures, or bundle integrity.

## Evidence checked

- The latest public M6 verifier update at this source head records malformed, missing, and duplicate case IDs as rejected, with its local and hosted validation. This validates verifier behavior only ([Issue #57 comment](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/57#issuecomment-6357296423)).
- The local archived M6 run `security-lab/e4-runs/20261013T084123Z` is bound to source `04b3d983a650b054447371c0dc2d30497033dbfd`, has `artifact.status=NOT_SUPPLIED`, and records `AUTHOR_AUTOMATION_RUN_NOT_E4` / `e4Status=NOT_VERIFIED`. Its test cases use synthetic fixtures.
- The later hosted lifecycle record names run `39893792191`, artifact `12475873203`, M7 source `1448a46ce43a2211e14be70fcd9c256b21d74c1f`, and Setup.exe SHA-256 `25442c5e350225cea8f2c33bc8d09bc9e4008734a38ccbcca87dc1caa9eb086f`. It reports bounded hosted install/uninstall checks, but is not an independently run product E4 bundle or clean Windows 11 VM / real-model validation ([Issue #57 comment](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/57#issuecomment-6356849216)).
- An earlier build artifact's archive download was incomplete and its internal files were not verified ([Issue #57 comment](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/57#issuecomment-6356052473)). It cannot supply the missing provenance.
- The latest issue update says no qualifying independent product E4 was executed; the issue remains NOT_VERIFIED ([Issue #57 comment](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/57#issuecomment-6357296423)).

No installer, VM, real-model, or external product test was run for this audit.

## Evidence still required

1. **Exact product identity:** M7, as owner of the Windows package/build, provides a complete retrievable product artifact, producer run/build ID, source commit/tree, archive SHA-256, and the independently re-read inner Setup.exe SHA-256. Bind the tested install to this exact artifact. The current M7 installer/VM resource remains exclusive and must be scheduled on Issue #29 before use.
2. **Independent execution:** a named operator who is not the artifact author runs the documented M6 procedure from a clean independent checkout and environment against the unmodified product artifact. Record the exact checkout commit, command, runner/environment identity, artifact hashes, and sanitized PASS/FAIL summary. The M6 runner's self-reported `operatorRole=external-claim` is not identity proof.
3. **Copy-integrity controls:** from disposable copies, first verify that the genuine product E4 bundle passes, then independently alter each external copy of `SHA256SUMS.txt`, `report.json`, `report.md`, and `raw.log`; each altered copy must fail while the archived source remains byte-identical. Record command, result, and before/after source hashes. Existing synthetic tests cover verifier behavior but do not fulfill this product-artifact acceptance criterion.
4. **Review and retention:** preserve a signed or otherwise identity-verifiable reviewer receipt and sanitized evidence bundle at a stable, access-controlled location. Record the reviewer identity, relationship check, environment separation, and location without publishing credentials, raw user data, or secrets.

## Ownership and safe completion condition

- **M7:** produce and bind the complete Windows product artifact/build provenance; arrange the authorized exclusive VM/installer slot if required.
- **Independent operator/reviewer:** execute and attest the clean independent run, copy-integrity controls, and evidence retention.
- **M6:** run the verifier and mismatch controls on a disposable copy after the qualifying artifact and independent receipt are supplied; report exact hashes and sanitized results. M6 must not synthesize, infer, or promote missing producer or operator evidence.
- **Earliest delivery:** not confirmed in the public issue record as of this snapshot.

Close #57 only when all four evidence groups above are tied to the exact product build and independently reviewed. Until then, keep `productE4Accepted=false` and `e4Status=NOT_VERIFIED`.

## Follow-up — 2026-10-23 06:14 UTC

- GitHub identifies M7 PR #39 head `97bb8de315f2c19edbaa4d6536abc50876fecffd`; run `39904585994` completed successfully at 05:16:49 UTC. Its artifact inventory includes `windows-community-build-evidence-97bb8de315f2c19edbaa4d6536abc50876fecffd` (38,195,704 bytes, SHA-256 `fe1080b83e338a7eef0227462a1663d26b59e6387525f5eafd4bd523f4193782`) and `windows-community-installer-lifecycle-97bb8de315f2c19edbaa4d6536abc50876fecffd` (1,308 bytes, SHA-256 `5b64c23eb4acee37a4bbef54ebe549361ce03edb03859531715840b5f9fd0e76`). The workflow jobs report success. I inspected GitHub run and artifact metadata only; I did not download or inspect either artifact. Their same-run provenance does not provide an independent operator or clean-environment E4 receipt.
- `security-lab/e4/verify-bundle.mjs` now accepts a detached signed receipt and reviewer public key, binds the receipt to the archive digest plus report source commit/tree and reported package digest, and enforces distinct operator/reviewer role claims and clean-environment fields. The machine-readable output exposes the claimed roles, environment, checks, and signature state while keeping `independentReceipt.status`, `productE4Accepted`, and `e4Status` at `NOT_VERIFIED`. A signature only proves possession of the supplied key; identity and independence remain an out-of-band review requirement, and this verifier does not re-read product artifact bytes.
- `security-lab/e4/independent-review-receipt.schema.json` defines the strict receipt contract. Focused tests cover missing receipts, validly signed but untrusted claims, forged signatures, role collision, and package-digest mismatch.
- No M7 artifact was downloaded, no installer or model was executed, and no VMware resource was used.

## Follow-up — 2026-10-23: receipt identity and execution claims

The receipt contract now requires operator/reviewer identity-source references and a reviewer-key source reference, plus a producer run ID, product version, exact artifact filename/size/SHA-256, source commit/tree, UTC start/completion timestamps, and an overall run result alongside individual product and verifier check statuses. The verifier binds artifact filename, size, digest, source commit/tree, and archive digest to the signed receipt; it rejects invalid/reversed times and a PASS run result when any required check is not PASS. The parsed run and identity-source claims are surfaced in machine-readable output.

The Ed25519 signature is checked against the supplied public key and the key fingerprint is recorded, but that key is not an external trust anchor. Operator/reviewer identity, independence, producer-run authenticity, and timestamp trust still require out-of-band verification. These fields do not promote the receipt or bundle: `independentReceipt.status`, `productE4Accepted`, and `e4Status` stay NOT_VERIFIED. No qualifying product receipt or M7 build identity was available in this worktree, and no product install, VM, or real-model test was run.
