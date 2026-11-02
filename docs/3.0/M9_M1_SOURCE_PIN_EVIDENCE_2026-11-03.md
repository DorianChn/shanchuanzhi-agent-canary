# M9 M1 source-pin evidence — 2026-11-03

## Change

The M9 exact-source manifest previously selected M1 PR #133 at `42d362a9a1f4f1972400f2d3414d77982b0fb4e6`, which predates the protected-path follow-up. It now selects merged PR #149 head `5eaf323b4188dc4228eadd099d2e27af3e61ae79` from `shanchuanzhi/issue52-toctou-race-20261102`.

PR #149 merge commit `0831ed4979ae4d9f4c6698296726732d427fb7ae` has the same tree as that exact head: `04a73c2701489e00fb2ffb341772c822d65ec2e7`. The composition test records owner-head, tree, base, and first-parent provenance for the selected M1 source.

## Local checks

On Windows with Node.js `v24.22.1`:

- `node --test test/m9-exact-source-workflow.test.mjs test/ac3-coordination-baseline.test.mjs` — 21 passed, 0 failed.
- `node scripts/validate-m9-exact-source-manifest.mjs` with `EXPECTED_M9_SHA=1090ddcb2d2d04480e60574cc51cb64a558773ee` — passed and reported all M1–M8 pins.
- `git diff --check` — passed.

The current merged candidate had separately passed `npm run build` and the focused Gateway/Console suites: 87 passed, 4 platform skips, 0 failures. Those results are baseline evidence for the runtime change; this source-pin PR changes the manifest, provenance, governance, and documentation, not runtime code.

## Limits and hosted checks

The Ubuntu/Windows M9 composition and repository CI results are linked from PR #151 and are the merge gates for this change. A green composition workflow verifies the pinned module sources and regression suite; it does not establish independent product E4, clean-VM installer acceptance, all-filesystem atomicity, or protection of native Shell and arbitrary host callbacks. Issue #52 remains open until its broader acceptance requirements are satisfied.
