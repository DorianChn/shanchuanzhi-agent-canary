# Agent Canary — future release notes draft

> **DRAFT — NOT FOR PUBLISHING.** Agent Canary v3.0.0 has already been published as the current stable release. This document is a template for a future release; it does not revise or describe v3.0.0 and does not create a release.

## Release identity (maintainer must fill after freeze)

- Version/tag: **TBD**
- Channel: **TBD; keep pre-release until all release gates are met**
- Source commit: **TBD**
- Artifact names and SHA-256: **TBD**
- Release date: **TBD**
- Release owner/reviewer: **TBD**

The current stable release is [v3.0.0](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0). A separate published [v3.0.0-competition Community bundle](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0-competition) reuses candidate.4 assets; candidate.4 is a separate pre-release. Do not reuse this draft for any already published release or attach it to a moving branch.

## Proposed release summary

For a future version, write the final summary only from its exact tagged source and packaged artifacts. Describe verified user-visible behavior, installation requirements, data written, and rollback steps. Link each security statement to a test of that same tag or artifact.

Potential topics to include after verification:

- Stable CLI/SDK behavior retained from the V1 line.
- Any 3.0 SDK Gateway or MCP integration included in the final artifact.
- Offline self-check and candidate-specific acceptance commands.
- Supported operating systems, Node versions, and tested host versions.

Do not include a feature merely because it appears on a development branch, in a source-only test, or in a candidate with a different hash.

## Security and compatibility notes to carry forward

- Only callbacks registered and routed through Agent Canary are in the covered path.
- Native Codex/Claude/Cursor/Cline shell, file, browser, and unrelated MCP tools are not generally protected.
- Installing a decoy does not prevent an unguarded first action or undo an operation already started.
- The current E4 status is NOT_VERIFIED; do not call the release independently certified.
- Review the [compatibility matrix](COMPATIBILITY.md), [security policy](SECURITY.md), and [E4 evidence index](E4_EVIDENCE_INDEX.md) against the tagged artifact.

## Release gate checklist

- [ ] Freeze source and build from the exact source commit.
- [ ] Record artifact SHA-256 values, package contents, and dependency-license inventory.
- [ ] Run `npm ci`, `npm run build`, `npm test`, `npm run pack:check`, and `node scripts/check-docs.mjs`; retain failures.
- [ ] Verify install, self-test, uninstall, and repeat-install from the exact public artifact on each claimed platform.
- [ ] Review security boundaries, privacy text, vulnerability-report route, and known limitations.
- [ ] Complete the chosen E4 protocol or clearly retain NOT_VERIFIED.
- [ ] Resolve release signing and any package/distribution licensing questions that apply to the proposed channel.
- [ ] Fill the upgrade guide with exact state/config migration results; do not imply migration support without a test.
- [ ] Obtain maintainer review, then publish only through an explicit release action.

## Upgrade notice

No verified in-place migration from V1.2.7 to v3.0.0 is documented in this draft. For any future upgrade, do not claim migration support until versioned migration tests and rollback steps are recorded. See [UPGRADING.md](UPGRADING.md).
