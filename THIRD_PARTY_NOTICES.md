# Third-party dependency notice

Agent Canary project code retains MIT. smol-toml 1.9.1 is a separately licensed BSD-3-Clause runtime dependency, pinned in package-lock.json. Its package contains the upstream copyright and license. The historical free ZIP described by the source receipt does not bundle node_modules; this is not a statement about all installer payloads.

## v3.0.0 source package

Direct dependencies declared by the [v3.0.0 package manifest](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/v3.0.0/package.json):

| Package | Role | Reported upstream license |
|---|---|---|
| @modelcontextprotocol/sdk | Runtime MCP protocol | MIT |
| commander | Runtime CLI | MIT |
| smol-toml | Runtime TOML parsing | BSD-3-Clause |

Declared development dependencies:

| Package | Role | Reported upstream license |
|---|---|---|
| @types/node | Type definitions | MIT |
| tsx | Test/runtime TypeScript loader | MIT |
| typescript | TypeScript compiler | Apache-2.0 |

Exact resolved versions are pinned by the [v3.0.0 package lock](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/v3.0.0/package-lock.json). Transitive package metadata recorded for the candidate product-acceptance build is in [the dependency inventory](docs/3.0/product-acceptance-evidence/DEPENDENCY_LICENSES.json); that snapshot describes only the installed inventory it examined and is not a substitute for reviewing an exact package artifact.

## Windows community installer

The Windows community installer has additional upstream notices for its bundled Node.js runtime and NSIS components in [packaging/windows/THIRD_PARTY_NOTICES.md](packaging/windows/THIRD_PARTY_NOTICES.md). A historical candidate.4 installer hash is `567b1e7e8832b6aa31fc80c86994eb915bf8d3db9caf125c1f7a08b42cf94ce6`; this hash does not establish that the installer is a published Release asset or a supported install path. Those notices apply to that installer payload and should not be assumed to describe the v3.0.0 package or a GHCR image.

Before each release, regenerate and review the dependency inventory from the exact lockfile and artifact. Preserve upstream license files and notices in redistributed packages.

Upstream: https://github.com/squirrelchat/smol-toml

For later artifact identity, see [M7-owned provenance](docs/3.0/M7_E4_ARTIFACT_PROVENANCE_2026-10-23.md). License metadata alone does not verify a new artifact or installer.
