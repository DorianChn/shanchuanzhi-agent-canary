# Security Policy

## Agent Canary 3.0 security boundary

Agent Canary is a defensive SDK and MCP security toolkit. Its guarantees apply
to operations that a trusted host explicitly registers and routes through the
Gateway. It is not a host-wide monitor or an operating-system sandbox.

The 3.0 Gateway can mediate registered file capabilities, fixed-argument
commands, host-owned MCP callbacks, and explicitly allowlisted HTTPS reads. A
request outside those registrations is denied. Common credential paths are
deny-only by default; hosts should also mark application-specific confidential
files with `sensitive: true` rather than relying on filename patterns alone.

### Guarantees

- A represented decoy action is inert. `canary_run_shell` does not run a
  command, and `canary_transfer_funds` does not move money. A decoy call can
  create a local trace token and audit event; configured notifications may run.
- Canary tokens are random `cnry_` strings that unlock nothing.
- Events stay local unless the operator configures a webhook. Desktop alerts
  are local.
- The Gateway accepts only registered tool names and parameters. It checks the
  Guard and host policy before invoking the registered callback. The host-owned
  approval capability must stay outside the model-callable tool set.
- A registered decoy read can quarantine that Guard session. This is a signal
  of possible compromise; accidental integration calls and copied fixtures
  can also trigger it.
- Optional AI analysis is advisory. It cannot approve an operation, reset the
  Guard, change the registered policy, or execute a tool. Cloud analysis
  requires host consent; input redaction is best effort, not a DLP guarantee.

### Limits and safe deployment

- Calls made directly by native host tools, arbitrary Shell, unregistered
  callbacks, or other processes bypass the Gateway. Hook protection applies
  only when the hook is installed, enabled, and matches the host operation.
- File registration checks workspace containment, common aliases, and held
  file identity. Revalidation narrows path-replacement races, but it is not an
  atomic operating-system path-resolution guarantee. Do not describe Agent
  Canary as preventing every TOCTOU race or protecting every file on the host.
- Filename rules cover common credential stores, not every secret format.
  Mark additional confidential resources explicitly and keep the registration
  list under trusted host control.
- A callback that ignores cancellation, an operation already started, or a
  subprocess outside the registered execution path can still cause side
  effects. The Gateway cannot retroactively cancel or roll back such effects.
- Evidence hash chains can reveal changes to a retained chain. They do not
  prove the writer's identity or honesty, and a local operator can rewrite the
  complete chain. Source tests and bundle hashes are not independent product
  acceptance; see [3.0 acceptance](docs/3.0/FINAL_3_0_ACCEPTANCE.md) and the
  [security limitations](docs/3.0/SECURITY_LIMITATIONS.md).
- `guard.reset()` is a host API. Never expose it, approval authority, or
  resource registration as a model-callable tool. Deploy decoys only on
  systems you own or are authorized to test.

## Legacy V1.1 containment API

The `createAgentGuard()` API remains available for compatibility. Its
`SAFE → TRIPPED → QUARANTINED` circuit breaker can block callbacks that the host
routes through `guard.executeToolCall()` or checks with
`guard.beforeToolCall()`. A decoy signal cannot block a callback that bypasses
the Guard, and it does not prevent a first dangerous operation that bypasses
the Guard. Use the 3.0 Gateway for newly integrated execution paths.

## Reporting a vulnerability

Open a private security advisory through the repository's GitHub Security tab.
Do not publish exploitable details or attach credentials, tokens, private
keys, or unredacted production data to a public issue.
