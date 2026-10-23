# M7 product-candidate provenance for independent E4

## Current exact-head refresh — 2026-10-23 15:52 local / 07:52 UTC

The evidence below from the earlier `1ab085a` producer is superseded for candidate selection by the newer exact-head run. The M7 branch head is `97bb8de315f2c19edbaa4d6536abc50876fecffd`; GitHub reports both the [Windows Community wrapper run 39904585994](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/39904585994) and [CI run 39904585997](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/39904585997) succeeded on that SHA.

- Exact build artifact: [12479419522](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/39904585994), `windows-community-build-evidence-97bb8de315f2c19edbaa4d6536abc50876fecffd`, 38,195,704 bytes, `expired=false`, expires `2026-10-30T05:16:17Z` at inspection. Its producing `windows-community-build-evidence` job completed successfully, including package build and upload.
- Exact lifecycle artifact: [12479619066](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/39904585994), `windows-community-installer-lifecycle-97bb8de315f2c19edbaa4d6536abc50876fecffd`, 1,308 bytes, `expired=false`, expires `2026-10-30T05:16:46Z` at inspection. I retrieved and parsed its 2,868-byte `INSTALLER_LIFECYCLE_RESULT.json` directly from the artifact ZIP.
- The lifecycle receipt binds `sourceSHA=97bb8de315f2c19edbaa4d6536abc50876fecffd`, `candidateId=competition-candidate.2`, and installer SHA-256 `718ddcc18db9f2c2bfdc4782d50c314afed9c76f327a3fb9efd7dd4231d4f392`. It records seven checksum-verified files; silent install, duplicate-candidate refusal, uninstall, registry/shortcut cleanup, and preservation of an unknown sentinel all passed in the hosted run.
- Runtime provenance is specifically GitHub-hosted Windows Server 2025 Datacenter, build 26100. The receipt explicitly does **not** assert a standard-user token. The separate 38 MB build archive was not unpacked in this audit; artifact identity/size/retention are confirmed from GitHub metadata, and the installer digest and seven-file provenance check are confirmed by the retrieved same-run lifecycle receipt.

This is traceable producer and bounded installer lifecycle evidence that M6 can use to bind a future independent E4 run to one exact candidate. It is not an independent operator receipt or E4 PASS. Windows 11 client behavior, clean independent environment, standard-user token, real model/native agent behavior, EFS, cancel/rollback, and in-place upgrade remain unverified or untested. Keep Issue #57 `OPEN / P1 / NOT_VERIFIED`; reserve those assertions for the independent operator/reviewer receipt.

**Observed:** 2026-10-23 05:07 UTC
**M7 source:** `feature/ac3-reliability-ac3` at `1ab085abc6a242be563912a423ff1ee7f11e7127`
**Disposition:** A retrievable, traceable installer candidate and its exact Setup.exe SHA-256 are available for a future independent E4 run. This is provenance evidence only; independent product E4 remains `NOT_VERIFIED`.

## Exact candidate and producer

- Windows Community workflow run [39897235833](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/39897235833) used source commit `1ab085abc6a242be563912a423ff1ee7f11e7127`. All four jobs, including build evidence and installer lifecycle, completed successfully.
- The run produced build artifact [12477356625](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/39897235833) named `windows-community-build-evidence-1ab085abc6a242be563912a423ff1ee7f11e7127`. GitHub reported 38,195,641 bytes, `expired=false`, with expiry `2026-10-30T03:54:18Z` at inspection. The workflow uploads `AgentCanary-Community-Setup.exe`, `BUILD_REPORT.json`, `PAYLOAD_MANIFEST.json`, `CANARY_RESULT.json`, the extracted Hook and harness, lifecycle script, and `SHA256SUMS.txt` (see `.github/workflows/windows-community.yml`).
- The same run produced lifecycle result artifact [12477472135](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/39897235833), also non-expired at inspection. Its retrieved `INSTALLER_LIFECYCLE_RESULT.json` binds `sourceSHA=1ab085abc6a242be563912a423ff1ee7f11e7127`, `candidateId=competition-candidate.2`, and **Setup.exe SHA-256 `ae6add6905ddcbef4dd04a3f14089caa37527e93c6e883a0a0c906f48740247f`**. It records `artifact-provenance=PASS`, `checksummedFiles=7`, and `installerExecuted=true` for that hosted lifecycle run.
- The workflow builds this wrapper from the pinned `competition-candidate.2` community ZIP whose SHA-256 is `e9ba7b153ad267c3275f0d213fcb49b81fb372b2047ee18e95139a7e9ed134d7`; it is not a newly published release candidate. `BUILD_REPORT.json` and `SHA256SUMS.txt` carry the exact installer digest alongside the source/run provenance.

## What this establishes and what remains open

M7 now supplies the exact product-candidate locator, producer commit/run, artifact IDs, candidate identity, and a Setup.exe hash suitable to bind a later independent E4 result. The current workflow's lifecycle job downloaded the same-run build artifact, checked its seven-file checksum set and source/candidate fields, and ran the installer in a disposable GitHub-hosted runner.

That hosted M7 run is not an independent operator acceptance. It does not establish clean Windows 11 client behavior, an ordinary-user token, real-model/native-agent behavior, or the independent M6 verifier's genuine-bundle positive run and four external-copy mismatch controls. No VMware, local installer, or real-model test was run for this report. The M7-owned dependency for Issue #57 is therefore narrowed to the reserved clean-environment/operator E4 execution and its sanitized bundle/receipt; earliest delivery remains unknown. Keep Issue #57 `OPEN / P1 / NOT_VERIFIED`; do not claim E4 PASS.

The build-artifact API returned a downloadable ZIP reference and the same-run lifecycle artifact was retrieved and inspected. The full 38 MB build ZIP was not independently unpacked during this audit; candidate-file presence and Setup hash here are corroborated by the successful same-run lifecycle download/checksum/install record, not by a second independent extraction.
