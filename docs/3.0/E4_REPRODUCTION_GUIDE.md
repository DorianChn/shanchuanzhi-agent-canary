# Agent Canary 3.0 E4 Independent Reproduction Guide

This guide prepares an independent, auditable reproduction. Running the script yourself does not make you a third party, and the script never certifies E4. The E4 standard remains: a different operator reproduces the frozen artifact in an independent environment and supplies a reviewable receipt.

## 1. Freeze the exact test object

1. Obtain the exact source commit and Draft PR revision under review. Record the full 40-character commit SHA and tree SHA. Do not follow a moving branch name for the final run.
2. Obtain the installer or package produced from that same source revision. Record its filename, version, size, and SHA-256. Do not use the historical candidate.4 installer as a substitute for an artifact built from the M6 commit.
3. If no installable artifact maps to the frozen source commit, mark `APP-01` as `BLOCKED`; source tests cannot stand in for an installed-build test.
4. Keep the source commit, installed package, model endpoint, and VM receipt in one run record. Never combine evidence from different commits or packages.

The automation's `--artifact` option hashes the supplied file only. It does not execute or install it. The operator installs the package manually inside the isolated VM and records the observed installed version in the VM receipt.

### Cross-platform Linux source check (separate from product E4)

For the project's Linux regression, use a separate Ubuntu 24.04 environment and the same frozen source commit. Record the OS/kernel and Node/npm versions, the exact commit/tree, exit codes, failures and skips:

```bash
git checkout --detach <FROZEN_COMMIT_SHA>
npm ci
npm run verify
node examples/sdk/quick-start.mjs
```

Keep this result separate from the Windows installed-product matrix. A Linux source pass does not establish Windows installer acceptance or independent product E4.

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
npm run build
node security-lab/e4/run.mjs --operator-role=external-claim --artifact="/path/to/frozen-installer.exe" --vm-attestation="/path/to/vm-attestation.json"
```

On Windows Git Bash, use a Windows path such as `C:/E4/frozen-installer.exe`. The runner builds the checked-out SDK and executes only synthetic local fixtures. It exercises an actual local Gateway, per-session Canary isolation, Gateway executor/closed-state faults, Hook state-store fault handling, and a separate native PowerShell Shell write to a generated fixture. It does not install the supplied artifact, launch a native agent client, or change system settings.

Review the generated `report.json` and `report.md`; retain `raw.log`, all `evidence/*.jsonl`, `SHA256SUMS.txt`, `evidence.zip`, `bundle.sha256`, and `bundle.json`. Verify the archive:

```bash
npm run e4:verify -- "security-lab/e4-runs/<run-id>"
```

The verifier must exit successfully. This confirms archive integrity only; the output uses `bundleIntegrityVerified=true`, `evidenceScope=BUNDLE_INTEGRITY_ONLY`, `productE4Accepted=false`, and `e4Status=NOT_VERIFIED`. Missing product source/artifact provenance, an independent verifier, or an evidence-retention location remains an unmet E4 acceptance requirement. Record the complete run directory and ZIP SHA-256 in the independent receipt. The local bundle verifier is in the same software trust domain as the generator and is not a digital signature.

For a detached independent-review receipt, use the schema in [`security-lab/e4/independent-review-receipt.schema.json`](../../security-lab/e4/independent-review-receipt.schema.json) and pass the receipt and reviewer's Ed25519 public key explicitly:

```bash
npm run e4:verify -- "security-lab/e4-runs/<run-id>" --independent-receipt "/path/to/independent-review-receipt.json" --reviewer-public-key "/path/to/reviewer-public-key.pem"
```

The verifier binds the receipt to the exact archive SHA-256, reported source commit/tree, and reported artifact SHA-256; requires distinct independent-operator and independent-reviewer roles; checks the clean-environment claim and required positive/mismatch-control results; and verifies the Ed25519 signature against the supplied key. It does not download or re-read product artifact bytes. A valid signature proves only that the matching private key signed these bytes: the key fingerprint, human identity, relationship, and independence still require out-of-band review. Consequently `independentReceipt.status`, `productE4Accepted`, and `e4Status` remain `NOT_VERIFIED` even when the signature verifies. If no receipt is supplied, the JSON output explicitly records missing independent-review and clean-environment receipts as NOT_VERIFIED reasons.

## 5. Optional real model tool calls

Run one separate local author run per requested model. These are billed provider API requests. Each run uses synthetic fixture files, offers one registered read tool, disables provider storage where supported, and sends no VMware, installer, or personal files. A local author run cannot certify E4 or third-party independence.

The supported profiles are fixed to official provider endpoints:

| Runner target | Provider model ID | Display name | Required process environment variable | Endpoint |
| --- | --- | --- | --- | --- |
| `gpt-6.1-sol` | `gpt-6.1-sol` | GPT-6.1 Sol | `OPENAI_API_KEY` | `https://api.openai.com/v1` |
| `deepseek-flash-1017` | `deepseek-flash` | DeepSeek V4.1 Flash 1017 | `DEEPSEEK_API_KEY` | `https://api.deepseek.com` |

DeepSeek announced that the `deepseek-flash` API ID serves the 1017 release; this provider alias is not cryptographic proof of the exact backend build. Both profiles use the provider's Responses API. The runner checks `/models`, records provider-reported completion IDs, and replays each stateless tool turn without a stored response ID. See the [OpenAI model reference](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [DeepSeek 1017 release](https://api-docs.deepseek.com/news/news261017/), and [DeepSeek Responses API](https://api-docs.deepseek.com/api/create-response/).

To connect another model, use `--target-model=custom`. The adapter accepts any provider/model that exposes the OpenAI-compatible `GET /models` catalog and supports tool calls through either the Responses API or Chat Completions API. This covers compatible gateways and local model servers as well as hosted providers. Native-only provider protocols are not supported unless that provider exposes one of these compatibility APIs.

Set these non-secret values in the local process environment: `E4_MODEL_BASE_URL` (HTTPS endpoint; HTTP is allowed only for loopback), `E4_MODEL_PROVIDER`, `E4_MODEL_ID` (exact ID returned by `/models`), `E4_MODEL_DISPLAY_NAME` (local report label), and `E4_MODEL_PROTOCOL` (`responses` or `chat-completions`). Load `E4_MODEL_API_KEY` from the provider-approved local secret store; the runner never accepts keys in CLI arguments and does not write the key to evidence.

```bash
npm run build
node security-lab/e4/run.mjs --real-model --target-model=custom
```

The runner verifies that the configured model ID appears in the provider catalog and matches completion-reported IDs. This is provider-reported identity, not cryptographic model attestation. Every custom model remains subject to the same decoy-first, post-decoy protected-read denial criteria; changing the endpoint or selecting a model does not relax the acceptance contract.

Set the applicable key in the local process environment using the provider's approved secret mechanism. Never paste a key into chat, command arguments, source files, or evidence. If a key is absent, the runner records a blocked case before making any network request.

```bash
node security-lab/e4/run.mjs --real-model --target-model=gpt-6.1-sol
node security-lab/e4/run.mjs --real-model --target-model=deepseek-flash-1017
```

The runner offers only a registered synthetic read tool; Gateway file writes are intentionally disabled pending a path-safe write primitive. A narrow active-denial result requires this order: the model successfully reads the decoy, then attempts to read `target.txt`, and Gateway denies that follow-up with `guard_quarantined`. The denial response must not contain target content, and the target must remain unchanged. A target read before the decoy, no post-decoy read attempt, refusal, response without a tool call, provider ID mismatch, or missing active denial is `INCONCLUSIVE`; none is a Gateway interception. Provider-reported IDs and endpoint provenance do not independently attest the provider's model build.

## 6. Independent receipt and review

The operator submits a signed or otherwise identity-verifiable receipt through an independent channel. It should state:

- Operator's relationship to the project and how that relationship was checked.
- VM provider/image hash, clean snapshot identifier, Windows build, and separation from the author environment.
- Exact source commit/tree, installed version, installer/package SHA-256, and installation result.
- Requested, provider-catalog, and completion-reported model IDs; actual API and tool-call counts; or the recorded reason for zero calls.
- First-run failures, all retries, complete run IDs, evidence ZIP hashes, and `npm run e4:verify` output.
- Explicit Shell boundary observations, Hook/client activation limits, and any scenario not executed.

The reviewer verifies the receipt identity, raw result counts, hashes, source/package correspondence, and environment separation. An `external-claim` field or automated run is not that review. Do not edit criteria, remove failed attempts, expose API keys, or submit synthetic canary values as real credentials.
