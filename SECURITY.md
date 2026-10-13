# Security policy

Agent Canary is an open-source tool for narrow, host-integrated tripwire and callback-containment workflows. It is not an operating-system sandbox, prompt-injection filter, or guarantee that an AI agent will act safely.

## Supported release scope

The current latest stable GitHub release is [v3.0.0](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0). V1.2.7 is an earlier stable release. The separate published [v3.0.0-competition Community bundle](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0-competition) has the same nine asset names and SHA-256 digests as the [candidate.4 pre-release](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0-competition-candidate.4); it is not the current stable CLI package. Development branches change independently of published artifacts. Report security issues against the exact tag, commit, package, and host configuration involved. Preview and development builds may behave differently from released assets. E4 independent reproduction remains NOT_VERIFIED; see [the evidence index](E4_EVIDENCE_INDEX.md).

## What is in scope

Please report privately:

- A bypass or defect in a Guard, Router, SDK, or registered Gateway callback that causes a later guarded callback to run after quarantine.
- Exposure of real credentials by the product's own logging, configuration, backup, webhook, installer, or package paths.
- Unsafe configuration writes, restore behavior, or package/update behavior attributable to Agent Canary.
- A reproducible defect that changes a documented security decision or effect in a supported released path.

Installing a decoy MCP server does not make unrelated tools guarded. Native shell and file operations, arbitrary third-party MCP servers, unregistered callbacks, operating-system calls, and actions already started are outside the product's general protection claim.

## Report a vulnerability

Use [GitHub Security Advisories](https://github.com/DorianChn/shanchuanzhi-agent-canary/security/advisories/new) to create a private report. Do not post exploit steps, real tokens, customer data, or sensitive logs in a public issue or discussion.

Include, when safe:

- Affected release/tag or full commit SHA, OS, Node.js version, and host/version.
- Minimal reproduction steps using synthetic data and a disposable project.
- The expected and observed callback or file/network effect.
- Redacted logs and hashes that help distinguish a decision label from an observed side effect.

Do not include real credentials, private keys, customer records, personal file paths, or production endpoints. No bug-bounty program, response-time SLA, or third-party certification is claimed. The maintainer will triage reports as capacity allows.

## Safe testing and evidence

Only test systems and accounts you own or are explicitly authorized to test. Prefer temporary directories, synthetic tokens, fixed local callbacks, and loopback-only receivers. Preserve negative results and failed attempts. A DENY label alone does not prove that an operation had no side effect.

See [SECURITY_TESTING.md](SECURITY_TESTING.md) for source-level reproduction and [E4_EVIDENCE_INDEX.md](E4_EVIDENCE_INDEX.md) for the current evidence boundary.

## Data and disclosure

The repository's tests use synthetic values. Event files and any configured webhook are controlled by the integrating host; inspect and redact them before sharing. Redaction is not a guarantee that arbitrary user-provided metadata is safe to publish. Coordinate disclosure through the private advisory until a fix or disclosure plan is agreed.
