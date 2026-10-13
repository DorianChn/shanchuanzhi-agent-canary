# Agent Canary

**Tripwires and guarded callbacks for controlled AI-agent workflows.**

Agent Canary provides inert MCP decoys and synthetic canary tokens that can surface a compromise signal. A trusted host can route its registered tool callbacks through Agent Canary and block later routed calls after that signal.

## Project status

- **Current stable release:** v3.0.0. V1.2.7 is an earlier stable release; candidate.4 and the moving development branch are separate pre-release/development artifacts.
- **Install:** the v3.0.0 CLI package is published to GitHub Packages and requires a GitHub token with `read:packages`; see [Getting Started](GETTING_STARTED.md).
- **Independent E4 reproduction:** NOT_VERIFIED; the evidence index records what was and was not tested.
- **License:** MIT for this repository. Third-party dependencies retain their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- **Runtime:** Node.js 20 or newer for the source build.

## Security boundary

Agent Canary protects only calls that a trusted host actually routes through its Guard, Router, or registered Gateway callbacks. Installing an MCP server or hook does not put an agent inside an operating-system sandbox.

In particular, Agent Canary does **not** claim to prevent prompt injection, stop an unguarded first action, control every tool in Codex/Claude/Cursor/Cline, undo an operation already started, or protect native shell access. Review [SECURITY.md](SECURITY.md) and the [host compatibility matrix](COMPATIBILITY.md) before relying on it.

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
