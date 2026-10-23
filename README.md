# Agent Canary

**Tripwires and guarded callbacks for controlled AI-agent workflows.**

Agent Canary provides inert MCP decoys and synthetic canary tokens that can surface a compromise signal. A trusted host can route its registered tool callbacks through Agent Canary and block later routed calls after that signal.

## Project status

- **Release status:** v3.0.0 is published as the [Agent Canary 3.0 GitHub Release](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0). The release is tied to its source snapshot.
- **Install:** the v3.0.0 source manifest declares a CLI package on GitHub Packages, which requires a GitHub token with `read:packages`. Package retrieval was not verified in this review; see [Getting Started](GETTING_STARTED.md) for the tag-pinned source-build path.
- **Container image:** Current GHCR package/tag availability, local pull, and runtime behavior are **NOT_VERIFIED** in this review. Do not assume the `3.0.0` or `latest` tags are pullable.
- **Independent E4 reproduction:** NOT_VERIFIED; the evidence index records what was and was not tested.
- **License:** MIT for this repository. Third-party dependencies retain their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- **Runtime:** Node.js 20 or newer for the source build.

## Security boundary

Agent Canary protects only calls that a trusted host actually routes through its Guard, Router, or registered Gateway callbacks. Installing an MCP server or hook does not put an agent inside an operating-system sandbox.

In particular, Agent Canary does **not** claim to prevent prompt injection, stop an unguarded first action, control every tool in Codex/Claude/Cursor/Cline, undo an operation already started, or protect native shell access. Review [SECURITY.md](SECURITY.md) and the [host compatibility matrix](COMPATIBILITY.md) before relying on it.

## Coverage and limitations

- **Native Codex Shell — UNPROTECTED:** Agent Canary does not intercept Codex's built-in Shell; MCP/Guard setup does not change that.
- **AppContainer — LIMITED:** Verified coverage is limited to the tested child-process operations; this is not evidence of whole-host or general shell protection.
- **First-party Security Center protected read — NOT_VERIFIED:** The reviewed M4 desktop source has no first-party OBSERVE read callsite consuming an M1-bound file identity through the M2 adapter. Its status UI hardcodes `NOT_VERIFIED`, and `GET /api/security-center` has no handler (404). Temporary-file demos and virtual policy reads do not prove product-file protection; see [issue #52](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/52).
- **Security Center / E4 status APIs — UNKNOWN:** The reviewed desktop server also has no `GET /api/e4/status` handler (404). A missing status endpoint is not evidence of protection or of a successful security denial.
- **E4 — NOT_VERIFIED:** Fixture-only evidence is not a product pass. Independent E4 remains NOT_VERIFIED.

## Start here

- [Five-minute getting started and Codex MCP setup](GETTING_STARTED.md)
- [Safe security-test reproduction guide](SECURITY_TESTING.md)
- [Compatibility and feature maturity](COMPATIBILITY.md)
- [E4 evidence index and current limitations](E4_EVIDENCE_INDEX.md)
- [Upgrade notes](UPGRADING.md)

## Project and community

- [Contributing](CONTRIBUTING.md)
- [Support and feedback channels](SUPPORT.md)
- [Report a vulnerability privately](SECURITY.md#report-a-vulnerability)
- [Share product feedback](https://github.com/DorianChn/shanchuanzhi-agent-canary/discussions)
- [Open a reproducible bug](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/new/choose)
- [Releases and pre-release status](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases)

A self-test or passing CI job verifies only the tested code path and environment. It is not a third-party certification, a guarantee of safe agent behavior, or evidence that native host tools are protected.
