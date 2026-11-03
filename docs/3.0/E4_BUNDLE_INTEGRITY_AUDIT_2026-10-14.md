# M6 E4 bundle integrity audit — 2026-10-14

## Scope and result

This audit checked the saved run `security-lab/e4-runs/20261013T114513Z` with the M6 verifier and performed mutation experiments only on disposable copies in the operating system's temporary directory. The original run directory was only read; no original file was written. No real model/API, secrets, VMware, installer, or external E4 environment was used.

The saved archive has SHA-256 `260764cb176339cf43a55e9873f64bfcf888666777d3e5df96f859ce296696d6`, size 30,526 bytes, 13 ZIP entries, and 12 payload files. Its report binds source commit `2ff6873487b7dccaa04191f8bbf25a88c281b394`. Verification returns `valid=true`, while retaining `e4Status=NOT_VERIFIED`, classification `AUTHOR_AUTOMATION_RUN_NOT_E4`, `MODEL-REAL-TOOLCALL=BLOCKED`, and `SHELL-BOUNDARY-BYPASS=OBSERVED_BYPASS`. This is archive-consistency evidence, not an E4 pass.

## Reproducible findings and change

Before the change, two mutations in isolated copies were accepted as `valid=true`: changing a saved `evidence/*.jsonl` sidecar without changing the ZIP, and changing `bundle.json.size` without changing the ZIP. A one-byte ZIP mutation was already rejected by the outer digest check.

The M6 verifier now compares every present archived `evidence/*.jsonl` sidecar against the verified ZIP and checks the bundle metadata's schema, archive name, byte size, entry count, inner-manifest summary, verification label, and classification against the archive and report. Sidecar copies may be absent because the ZIP is authoritative; if a copy is present, it must agree. Regression tests cover these checks.

## Verification evidence

Commands run from the M6 worktree:

```text
C:/Users/36712/AppData/Local/hermes/node/node.exe --test C:/Users/36712/Desktop/Agent-Canary-Dev/agents/M6-e4-ac3/security-lab/e4/verify-bundle.test.mjs
C:/Users/36712/AppData/Local/hermes/node/node.exe C:/Users/36712/Desktop/Agent-Canary-Dev/agents/M6-e4-ac3/security-lab/e4/verify-bundle.mjs C:/Users/36712/Desktop/Agent-Canary-Dev/agents/M6-e4-ac3/security-lab/e4-runs/20261013T114513Z
git diff --check
```

The targeted test file passed 12/12 tests with no failures or skips. The saved bundle still verifies after the change with the digest, counts, source commit, and non-promotion statuses above.

Post-change mutation checks, each against a temporary copy of the saved bundle:

| Mutation | Result |
|---|---|
| Change a present `evidence/*.jsonl` sidecar only | Rejected: `E4_EXTERNAL_COPY_MISMATCH` |
| Change `bundle.json.size` only | Rejected: `E4_BUNDLE_METADATA_MISMATCH_OR_PROMOTED` |
| Flip one byte in `evidence.zip` only | Rejected: `E4_OUTER_ZIP_SHA256_MISMATCH` |
| Change `report.md`, then coherently rebuild the ZIP, internal manifest, and outer SHA sidecars | Accepted as internally consistent (`valid=true`) |

The last result is an explicit trust boundary: an unsigned, self-contained hash chain can detect accidental or partial edits, but a person able to rewrite the whole bundle can recompute it. The verifier provides no signature, trusted timestamp, immutable storage, or proof of who produced the evidence. Bind the archive digest to an independently controlled, authenticated receipt before treating its origin or time as established.

## External E4 gate

External E4 remains **NOT_VERIFIED**. Changing that status requires evidence bound to the same frozen source commit/tree and exact installable artifact digest, an observed fresh Windows VM environment and installed build, and the required real-model run with provider-reported identity plus an actual tool call and active Gateway decision. Required cases also need independent pre/post side-effect observations and fault-injection evidence; native shell bypass must remain separately classified. An independent operator/environment receipt must authenticate the operator and bind those results to the bundle digest. Synthetic fixtures, a self-asserted VM record, a model refusal, or a self-recomputed bundle hash do not satisfy these gates.

The original run directory was not staged or included in this report; it remains an untracked local evidence artifact.
