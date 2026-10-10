# Roadmap

This is a proposal maintained by the project owner, not a promise of delivery dates. Planned items are not implemented until released and documented.

## Current public line

- **V1.2.7:** MIT-licensed decoys, token utilities, CLI/MCP server, SDK session guard, guarded tool router, JSONL audit, and offline self-test.
- The public repository also contains license-gated modules whose commercial distribution boundary remains under review. Do not interpret license checks as source isolation.

## Near term: reproducibility and integration quality

- Keep CI verification on Node 20/22 and Windows/Linux/macOS, and retain a deterministic no-model demo.
- Expand framework integration examples only when they demonstrate a complete guarded callback path and have executable tests.
- Publish model-evaluation artifacts with model/version, prompts, sample counts, exact denominators, failures, and scope limitations.
- Continue dependency, package-content, and secret scans; no release should be inferred from a passing PR.

## Next: host integrations and operator controls

- Evaluate opt-in adapters for common JavaScript agent tool loops and MCP host setups.
- Specify a human-owned reset/incident response control plane; never expose reset to model-callable tools.
- Explore durable/shared state adapters only with explicit consistency, outage, and identity-scope tests.
- Improve audit export and policy configuration without collecting telemetry by default.

## Longer term: evidence and governance

- Maintain versioned synthetic and authorized local-model scenarios; seek independent, permissioned evaluations before making general performance claims.
- Track compatibility requests and community contributions through GitHub Issues, Discussions, and reviewed pull requests.
- Consider broader framework coverage based on reproducible user needs and maintainer capacity; no existing user or partner count is claimed here.
- Review commercial/public packaging separately with maintainers and affected users; preserve the V1 API and paid-user compatibility before any migration.

## Versioning and contribution path

- Patch releases should fix defects without changing documented behavior.
- Minor releases may add backwards-compatible V1 APIs and examples.
- Breaking V1 changes require a migration note and a major version review.
- See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [CHANGELOG.md](CHANGELOG.md).
