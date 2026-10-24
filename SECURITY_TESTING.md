# Safe security-test reproduction

This guide runs Agent Canary code with synthetic inputs. It does not test a live target, use real credentials, or prove that an agent host's native tools are intercepted.

For current development, consult [M6 E4 scope](docs/3.0/E4_EVIDENCE_INDEX.md) and [current API contracts](docs/3.0/API_CONTRACTS.md). Configured-target reads are separately authorized host operations; these historical tag instructions do not validate them or a shipped installer.

## 1. Pin what you are testing

The `v3.0.0` GitHub Release is published but has no attached assets. Use its immutable `v3.0.0` source tag for a reproducible source check; this does not establish package equivalence or independent E4. The `v3.0.0-competition` Release and `v3.0.0-competition-candidate.4` prerelease are published with separate candidate/community assets. Keep each candidate result bound to its exact source tag and artifact SHA-256; do not substitute it for v3.0.0. The moving `feature/agent-canary-3.0` branch is a different artifact; record its full commit SHA.

Record:

~~~sh
git rev-parse HEAD
node --version
npm --version
~~~

Do not combine results from different tags, candidate ZIPs, installers, or development commits.

## 2. Run the v3.0.0 offline self-test

From the pinned checkout:

~~~sh
npm ci
npm run build
node dist/competition.js self-test --json
~~~

The v3.0.0 source verification receipt records four passing offline self-test checks. This is a bounded local code-path check; it is not a real-model attack, native-host integration test, independent E4 reproduction, or certification.

## 3. Observe the SDK/Gateway path with temporary effects

From the exact v3.0.0 source checkout after installing its locked dependencies:

~~~sh
npm ci
npm run build
node --import tsx --test test/gateway-acceptance.test.ts
~~~

The focused test exercises the source Gateway with temporary files and a receiver bound to 127.0.0.1. It checks local file hashes, callback counts, approvals, and receiver counts. One negative case records a late write by a callback that ignores cancellation; that temporary write is an observed limitation, not a successful block. The test does not contact public networks or touch a production workspace. `npm run verify` is the broader source verification command and includes the project test suite.

Run only in a disposable checkout. Preserve the complete test output, including failures.

## 4. Optional model experiments

The repository has separate local-model evaluation runners under security-lab/ and competition evidence folders. Read the runner and its preregistration before executing it. A model run is not required for the deterministic checks above; do not substitute a different model or task set and call the result a reproduction. Model trials use synthetic fixtures and still do not verify Codex's native shell/file tools or independent E4.

For earlier candidate-specific offline I/O instructions, see [the candidate reproduction guide](competition-submission/3.0-typefix/E4_REPRODUCTION.md). Those instructions apply to that candidate artifact, not automatically to the current source or another candidate.

## 5. Report evidence carefully

Include the exact tag/commit and artifact hash, OS, Node version, commands, full pass/fail output, and before/after effect observations. Keep all failures and control results. Redact private paths and never include actual credentials.

A decision label such as DENY is not enough by itself: report the relevant callback count, file hash, or loopback receiver count. Do not call same-machine testing, CI, a self-attested archive, or a source harness an independent E4 run. See [E4_EVIDENCE_INDEX.md](E4_EVIDENCE_INDEX.md).
