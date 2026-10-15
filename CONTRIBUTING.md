# Contributing

Thanks for helping improve Agent Canary. Small, reproducible changes with a clear security boundary are easiest to review.

## Before opening an issue

- For a bug, include the affected release or full commit SHA, OS, Node.js version, host, expected behavior, and a minimal reproduction.
- Remove secrets, personal paths, customer data, private configuration, and payment information.
- Use [GitHub Security Advisories](https://github.com/DorianChn/shanchuanzhi-agent-canary/security/advisories/new) for exploitable vulnerabilities. Do not put exploit details in a public issue.
- For usability feedback, use the product-feedback issue form or [GitHub Discussions](https://github.com/DorianChn/shanchuanzhi-agent-canary/discussions). See [SUPPORT.md](SUPPORT.md) for what belongs in each channel.

## Set up the source tree

Requirements: Git, Node.js 20+, and npm.

~~~sh
git clone https://github.com/DorianChn/shanchuanzhi-agent-canary.git
cd shanchuanzhi-agent-canary
npm ci
npm run build
~~~

Before submitting a change, run the checks that match its scope:

~~~sh
node scripts/check-docs.mjs
npm run build
npm test
npm run pack:check
~~~

For Gateway changes, also run the focused temporary-I/O acceptance test:

~~~sh
node --import tsx --test test/gateway-acceptance.test.ts
~~~

Do not run real credentials, production endpoints, or destructive operations in tests. Use temporary fixtures and loopback-only endpoints. Report commands that were not run; do not turn an unverified check into a pass claim.

## Make a reviewable change

1. State the user problem and expected behavior.
2. Keep the change focused and preserve existing behavior unless the PR explains the compatibility impact.
3. Update user documentation and the [compatibility matrix](COMPATIBILITY.md) when host, release, or feature status changes.
4. Explain the security effect, data written, new permissions/network access, failure behavior, and dependency-license impact.
5. Link evidence to the exact source or artifact version. Do not describe development-branch behavior as released or claim that native Shell is protected.

The repository code is MIT-licensed. Retain the upstream license and notices for third-party code; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Do not add a dependency without explaining why it is needed and recording its license.

## Pull requests

Use the pull-request template. Include a concise summary, exact verification commands and outcomes, compatibility impact, and links to any security or release evidence. Passing fixtures prove only those fixtures and callbacks; they do not establish operating-system isolation, third-party certification, or general host coverage.
