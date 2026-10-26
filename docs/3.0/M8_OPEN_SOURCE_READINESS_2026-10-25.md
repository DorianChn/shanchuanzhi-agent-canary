# M8 open-source readiness audit — 2026-10-25

This is a dated source/documentation audit, not release approval. Local M8 source at inspection: `1c94ed4b8beb8ab3f9e04004c0bc3b0f372b2841`. GitHub's feature target was `b0d8d77c1f13a6f3ee3a9270ddd4fc0507ff4097`; those are different source identities. This audit does not update either published artifacts or the feature target.

## Current source evidence

| Evidence | Exact scope and result |
| --- | --- |
| [PR #40](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/40) | MERGED into feature on 2026-10-24 17:41:30 UTC; head `1c94ed4…`, merge `c13c40f06fd066ef204c3fb082f070b5b4c8a93d`. It is no longer an open Draft. |
| [CI 40116479494](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/40116479494) | Exact M8 head above; 9/9 jobs succeeded, including six OS/Node combinations, sponsor smoke, Docker and package smoke. These are CI/source checks. |
| [Hook output 40116479476](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/40116479476) | Both Node 20/22 jobs succeeded at that head. |
| [Wrapper/build 40116479427](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/40116479427) | Wrapper jobs and Community build evidence succeeded; installer lifecycle was SKIPPED. |
| [M9 composition 40116481278](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/40116481278) | Both Ubuntu/Windows jobs succeeded at M9 head `0c8d7d1a8b68480bbc49aa02b4e7e2be34bb1107`, pinning M8 `1c94ed4…` per the [owner integration record](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/99#issuecomment-6387440118). Not product-host or installer acceptance. |

Live read-back found Issues [#53](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/53), [#59](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/59), [#65](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/65), [#75](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/75), [#80](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/80) and [#99](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/99) CLOSED. Their closures apply only to recorded source/owner scopes. M6's exact unchanged-file acceptance is [#80 comment 6387136527](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/80#issuecomment-6387136527); M7's sourcePath-only compatibility acceptance is [#99 comment 6386942906](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/99#issuecomment-6386942906). Neither approves installed lifecycle or independent E4.

## Onboarding and package findings

- [Getting Started](../../GETTING_STARTED.md) now begins with an immutable reviewed source checkout, an offline self-test and separate entrypoint help. The checked manifest version is **1.2.7**, with `agent-canary` bound to `dist/index.js`. Product `integrate/onboard/build-info` commands are in `dist/competition.js`. Running the wrong global command is not a supported substitute.
- Executed locally on the reviewed source: `node dist/index.js --help`, `node dist/index.js self-test --help`, `node dist/index.js self-test --json`, `node dist/competition.js --help`, and `node dist/competition.js integrate --help`. All exited 0; the self-test returned four passing checks. It does not exercise the separate Gateway bug below.
- A preview against an empty scratch directory returned `PREVIEW_ONLY`, `originalExisted=false` and `PARTIAL` coverage. It wrote no `.codex/config.toml`. No Codex/model was run, no host configuration was applied, and native Codex Shell remains **UNPROTECTED**.
- `npm pack --dry-run --ignore-scripts --json` exited 0 before documentation edits: 103 files, 669446 unpacked bytes, version 1.2.7. No package was published or installed. The tarball file list omits GETTING_STARTED/SECURITY/COMPATIBILITY/UPGRADING; README local guide links therefore are not available as bundled offline guides. The list also includes compiled license/evaluation/dashboard modules. License gating does not create a separately curated Community artifact.
- **Manifest-owner handoff:** reconcile the intended channel's binary entrypoint and included guides; review the exact package/file list and license/distribution boundary before advertising a package-ready product. M8 changed no shared manifest, export, packaging implementation or dependency.
- [v3.0.0 Release](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0) exists (published 2026-10-13) with zero attached assets. GitHub Packages retrieval and current GHCR tags/pull/runtime remain **NOT_VERIFIED**. Candidate.4 is a separate published prerelease; a feature merge does not update it. No new release is proposed by this audit.

## Remaining product gates

| Open gate | Owner boundary / implication |
| --- | --- |
| [#118 — decoy-read result/quarantine](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/118) | M1 owns Gateway/Guard. M0 reproduced two synthetic E4-case failures on feature `b0d8d77…`; targets stayed unchanged, but the decoy read threw before the intended follow-up denial evidence. Keep the failure visible; do not advertise that intended flow as accepted. |
| [#52 — protected reads](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/52) | Owner integration/product acceptance remains separate from fixed-probe/configured-target source composition; no OS-atomic/global protection claim. |
| [#45 — native Codex Shell](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/45) | M2 host boundary; native Shell stays UNPROTECTED. MCP registration is not interception. |
| [#57 — independent E4](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/57) | M6 evidence gate; source harnesses, supplied-key signatures and CI do not establish independence or a product pass. |
| [#41 — installer matrix](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/41) | M7 owns clean-VM/install lifecycle; the skipped job above does not satisfy this gate. |
| [#70 — dependency advisory/manifest](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/70) | Shared manifest/dependency coordination; route changes through its assigned owner, not M8. No dependency change/install was made here. |

M8's historical offline-demo assertion explicitly expects the currently observed Gateway exception and retains quarantine/no-write negatives. That bounded demo result does not resolve #118's intended product contract. Once M1 supplies an approved fix, M8 must reconcile the demo expectation with that exact source and rerun the relevant fixture; do not remove the denial/effect assertions to manufacture a pass.

Keep [future release notes](../../RELEASE_NOTES_DRAFT.md) a draft and [upgrade guidance](../../UPGRADING.md) explicit about unverified migrations. No user counts, certifications, real-host protection, new artifact checks, installer acceptance or independent E4 are inferred from this audit. All dated older receipts remain tied to their original source.
