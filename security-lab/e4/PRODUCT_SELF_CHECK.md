# Product artifact intake: developer SELF_CHECK

This M6 adapter reads downloaded Windows build evidence as untrusted data. It never imports artifact modules or executes the setup, bundled scripts, Hook, VM, or a model. It supplements `run.mjs`; it does not run that SDK harness or replace independent product acceptance.

Use Node 20+ without installing dependencies. Pin the expected producer head, installer digest and canonical Hook blob before intake. The installer digest below was read from the downloaded build metadata: it is a local consistency pin, not an independently authenticated artifact digest. Run/artifact IDs are supplied by M0; this offline command cannot authenticate GitHub provenance.

For this candidate, M0 separately retained an authenticated GitHub metadata receipt at `<DEV_ROOT>/coordinator/reports/M6-product-authenticated-provenance-20261025.json`. It binds source `e3d89ba12f210a10f1f4942e60019517d25cfb60`, tree `13f15b324d406778ace56bec3cbfadf772c8014d`, successful run `40109676133`, and artifact `12566227087`. GitHub reports outer archive digest `7413c68b8631921304188d52ac2e8385090241edb9a1f27b8f88c590085e2830`; the receipt explicitly says that digest was not locally reverified. This coordinator receipt supplements the offline intake's provenance limits; it does not authenticate an independent operator/reviewer or establish installed lifecycle or product E4. Historical output bundles retain their original offline-only provenance statements.

Replace the quoted artifact-directory placeholder below with the downloaded artifact directory.

```sh
node security-lab/e4/product-self-check.mjs \
  --artifact-dir "<DOWNLOADED_ARTIFACT_DIRECTORY>" \
  --expected-head e3d89ba12f210a10f1f4942e60019517d25cfb60 \
  --expected-installer-sha256 6998e2eeaa08e4eb756e924e801963ef707a75142226cf14f3df893de5b57c2a \
  --expected-hook-blob b7ed4aba70a597f4f63a05decc6de1b32f67372e \
  --producer-run-id 40109676133 \
  --producer-artifact-id 12566227087 \
  --output-dir security-lab/e4-handoffs/NEW-UNUSED-DIRECTORY/product-bundle
node security-lab/e4/verify-bundle.mjs security-lab/e4-handoffs/NEW-UNUSED-DIRECTORY/product-bundle
node security-lab/e4/product-self-check-controls.mjs \
  security-lab/e4-handoffs/NEW-UNUSED-DIRECTORY/product-bundle \
  security-lab/e4-handoffs/NEW-UNUSED-DIRECTORY/controls
node --test security-lab/e4/product-self-check.test.mjs security-lab/e4/verify-bundle.test.mjs
```

The output directory must not exist or be inside the downloaded artifact. Intake rejects unlisted files, traversal, symlinks/junctions, size overruns, checksum mismatch, source-head drift, run binding drift, installer mismatch and canonical Hook mismatch. It compares source/payload declarations but does not possess or reverify all installed payload bytes. A null product source tree in the offline bundle means the artifact input did not supply that tree; M0's separate authenticated receipt now records the tree above. The local verifier commit/tree and exact script hashes remain separate fields.

`evidence.zip` contains `report.json`, `report.md`, `raw.log`, `SHA256SUMS.txt` and unmodified producer JSON/checksum metadata under `evidence/product/`. The setup executable is hash-bound, not embedded. Producer canary PASS is retained only as a producer claim. Every new report is author/developer `SELF_CHECK`, `productE4Accepted:false`, with all ten E4 cases `NOT_VERIFIED`. A successful verifier exit means bundle integrity only.

The control command retains disposable copies: one accepted positive bundle, four rejected external-copy mismatches (SHA256SUMS.txt/report.json/report.md/raw.log), and a truncated ZIP whose outer digest was recomputed to reach the ZIP parser. Timeout, signal, oversized subprocess output, unexpected errors or invalid JSON never count as successful controls. Original archive bytes must remain unchanged. The result and sanitized stdout/stderr are saved as `controls.json` and `raw.log`.

## Remaining independent operator gate for #57

M0 must hand the authenticated coordinator receipt to a distinct operator and reviewer, complete local verification of the downloaded outer archive digest, and establish the trusted installer-digest chain. The operator must use a clean disposable Windows environment and retain its identity/image/snapshot records. Actual install, launch, uninstall/reinstall, real Agent/Hook/Gateway/model tool effects and synthetic target before/after hashes require separately authorized resources and execution evidence. Native shell and model refusal remain separate from Gateway denial. The verifier positive and all four external-copy controls must be repeated against the resulting genuine evidence bundle in that independent environment. A distinct reviewer must provide the existing signed receipt plus out-of-band role/key validation. No receipt or clean-environment attestation is created by this adapter. Keep #57 OPEN / NOT_VERIFIED until those gates are met.
