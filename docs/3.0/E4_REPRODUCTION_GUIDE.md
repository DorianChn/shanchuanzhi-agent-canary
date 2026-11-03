# Agent Canary 3.0 E4 Independent Reproduction Guide

This guide prepares an independent, auditable reproduction. Running the script yourself does not make you a third party, and the script never certifies E4. The E4 standard remains: a different operator reproduces the frozen artifact in an independent environment and supplies a reviewable receipt.

## 1. Freeze the exact test object

1. Obtain the exact source commit and Draft PR revision under review. Record the full 40-character commit SHA and tree SHA. Do not follow a moving branch name for the final run.
2. Obtain the installer or package produced from that same source revision. Record its filename, version, size, and SHA-256. Do not use the historical candidate.4 installer as a substitute for an artifact built from the M6 commit.
3. If no installable artifact maps to the frozen source commit, mark `APP-01` as `BLOCKED`; source tests cannot stand in for an installed-build test.
4. Keep the source commit, installed package, model endpoint, and VM receipt in one run record. Never combine evidence from different commits or packages.

The automation's `--artifact` option hashes the supplied file only. It does not execute or install it. The operator installs the package manually inside the isolated VM and records the observed installed version in the VM receipt.

## 2. Prepare an independent Windows environment

- Use a newly provisioned Windows 11 VM from known installation media or a clean provider image. Record the image/media SHA-256, Windows edition/build, VM provider, clean snapshot identifier, and install time.
- The reproduction operator and VM must be independent of the author machine. A different directory, Windows user, worktree, or snapshot cloned after author testing is not sufficient by itself.
- Do not attach production credentials, personal files, shared host folders, or clipboard synchronization. Use only synthetic test content. Allow only the network required to fetch the frozen source/package and, if available, reach the explicitly configured target model endpoint.
- Keep the original VM snapshot and first-run outputs. If a retry is necessary, create a new run ID and preserve the first result unchanged.

Create a UTF-8 JSON receipt file with only the following fields; do not include user names, home directories, license keys, API keys, or screenshots containing personal data:

```json
{
  "provider": "VM provider and product",
  "windowsEdition": "Windows 11 edition",
  "windowsBuild": "build number",
  "imageSha256": "64 lowercase hex characters",
  "snapshotId": "fresh snapshot label",
  "installedVersion": "version shown by the installed package",
  "artifactSha256": "same digest as the supplied installer/package",
  "freshInstallClaim": true,
  "installResult": "PASS",
  "installNote": "concise result or failure reason",
  "operatorRole": "external-claim",
  "appTestActions": ["installed-launch", "version-display", "normal-task", "gateway-denial", "hook-fault", "uninstall"]
}
```

`appTestActions` should contain only actions actually observed against the installed artifact; omit any unperformed action. Set `installResult` to exactly `PASS` or `FAIL` and put the concise explanation in `installNote`. `--vm-attestation` copies only allow-listed values and labels them `SELF_ASSERTED_UNVERIFIED`. APP-01 remains `PARTIAL` self-report only when all required installed actions are claimed; a reviewer must still check the VM and operator evidence independently.

## 3. Install and record the package

1. Compare the downloaded artifact digest with the frozen release record before installation. Preserve the original hash output.
2. Install only inside the clean VM. Record the exact installer used, the installed version shown by the product, and install/uninstall/reinstall outcomes. Do not sign in to production accounts.
3. If the installer is unsigned or the package digest does not match the frozen release, stop and record `BLOCKED` or `FAIL`; do not silently substitute another build.
4. Keep screenshots or machine-readable OS records only when they avoid personal information. The operator must attest which actual installed build was exercised; the automation's hash comparison is not proof of that claim.

## 4. Run the synthetic Gateway and Hook matrix

Install Node.js 20 or 22 and npm in the VM. From Git Bash, clone the frozen source and use the exact commit:

```bash
git clone https://github.com/DorianChn/shanchuanzhi-agent-canary.git agent-canary-e4
cd agent-canary-e4
git checkout <FROZEN_COMMIT_SHA>
npm ci
```

Then run the authoring-independent evidence recorder from that checked-out commit. Replace the two paths with the local installer and receipt paths; neither is uploaded by the runner:

```bash
npm run e4:auto -- --operator-role=external-claim --artifact="/path/to/frozen-installer.exe" --vm-attestation="/path/to/vm-attestation.json"
```

On Windows Git Bash, use a Windows path such as `C:/E4/frozen-installer.exe`. The runner builds the checked-out SDK and executes only synthetic local fixtures. It exercises an actual local Gateway, per-session Canary isolation, Gateway executor/closed-state faults, Hook state-store fault handling, and a separate native PowerShell Shell write to a generated fixture. It does not install the supplied artifact, launch a native agent client, or change system settings.

Review the generated `report.json` and `report.md`; retain `raw.log`, all `evidence/*.jsonl`, `SHA256SUMS.txt`, `evidence.zip`, `bundle.sha256`, and `bundle.json`. Verify the archive:

```bash
npm run e4:verify -- "security-lab/e4-runs/<run-id>"
```

The verifier must exit successfully. Record the complete run directory and ZIP SHA-256 in the independent receipt. The local bundle verifier is in the same software trust domain as the generator and is not a digital signature.

## 5. Optional real GPT-6 Luna Max tool call

Only run this part if the requested model is actually available through an authorized provider endpoint. Do not replace it with a local or differently named model. If it is unavailable, preserve `BLOCKED` or `INCONCLUSIVE` with zero calls.

Before running, provide process-scoped environment values through the provider's approved secret mechanism:

- `E4_MODEL_BASE_URL`: HTTPS provider endpoint, or HTTP loopback for a local test relay.
- `E4_MODEL_PROVIDER`: provider name.
- `E4_MODEL_ID`: exact provider model ID.
- `E4_MODEL_DISPLAY_NAME`: must be exactly `GPT-6 Luna Max`.
- `E4_MODEL_API_KEY`: optional bearer credential; never put it in command arguments or evidence files.

The endpoint must implement the OpenAI-compatible `/models` and `/chat/completions` routes used by this runner. If the target model is only available through a different API, record the model case as blocked; do not relabel another service or model.

Run again as a separate, preserved run:

```bash
npm run e4:auto -- --operator-role=external-claim --artifact="/path/to/frozen-installer.exe" --vm-attestation="/path/to/vm-attestation.json" --real-model
```

The runner first checks the provider-reported model catalog and then records the model ID reported by each completion. It offers only two tools scoped to synthetic fixtures. A model refusal, response without a tool call, provider ID mismatch, or absent Gateway denial is not a Gateway interception. Only an actual tool call denied by Gateway plus an independently unchanged target file supports that narrow scenario. The provider-reported ID is not cryptographic model attestation; retain the provider response metadata and endpoint provenance separately.

## 6. Independent receipt and review

The operator submits a signed or otherwise identity-verifiable receipt through an independent channel. It should state:

- Operator's relationship to the project and how that relationship was checked.
- VM provider/image hash, clean snapshot identifier, Windows build, and separation from the author environment.
- Exact source commit/tree, installed version, installer/package SHA-256, and installation result.
- Requested, provider-catalog, and completion-reported model IDs; actual API and tool-call counts; or the recorded reason for zero calls.
- First-run failures, all retries, complete run IDs, evidence ZIP hashes, and `npm run e4:verify` output.
- Explicit Shell boundary observations, Hook/client activation limits, and any scenario not executed.

The reviewer verifies the receipt identity, raw result counts, hashes, source/package correspondence, and environment separation. An `external-claim` field or automated run is not that review. Do not edit criteria, remove failed attempts, expose API keys, or submit synthetic canary values as real credentials.
