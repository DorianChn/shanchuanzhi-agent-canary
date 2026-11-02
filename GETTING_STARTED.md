# Getting started

This guide builds the tested Agent Canary 3.0.0 source snapshot. It pins the source commit so the result is reproducible; it does not install an arbitrary moving branch.

## Requirements

- Git
- Node.js 20 or newer

## Build and verify

```sh
git clone https://github.com/DorianChn/shanchuanzhi-agent-canary.git
cd shanchuanzhi-agent-canary
git checkout --detach 70fcc211b8c84b8613bc1ca5f10d30a8d4a832c2
npm ci
npm run verify
npm run self-test
```

At this snapshot, `npm run verify` passed the build, all 103 automated tests, offline acceptance checks, source-manifest verification, and package smoke check. `npm run self-test` reports four passing checks: `safe_call`, `decoy_quarantine`, `blocked_callback`, and `audit_order`.

These are source and local checks. They do not establish independent E4 acceptance, clean-VM installation, or protection for tools the host did not register with Agent Canary. See [security limitations](docs/3.0/SECURITY_LIMITATIONS.md) and the [acceptance report](docs/3.0/FINAL_3_0_ACCEPTANCE.md).

## Connect a Codex project

From the repository directory, preview the project MCP entry:

```sh
node dist/competition.js integrate --agent codex --project .
```

The default is preview-only. Review the printed config path, command, and coverage. It registers Agent Canary's MCP server callbacks; Codex-native tools remain out of scope. To apply the reviewed entry, run the same command with `--apply`; the helper keeps a private backup. Then check the effective server list with `codex mcp list`. See [OpenAI's MCP configuration guide](https://developers.openai.com/learn/docs-mcp).

To start the server directly over standard input/output, run:

```sh
node dist/competition.js serve --stdio
```

For the published npm package and container options, see the [installation section](README.md#install). GitHub Packages authentication can be required; the source build above avoids that registry login.
