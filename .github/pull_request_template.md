## What changed

<!-- Describe the user-facing behavior and motivation. -->

## Verification

- [ ] Focused tests pass.
- [ ] `npm run build` and relevant package/sponsor checks pass.
- [ ] Failure and boundary behavior are covered where relevant.
- [ ] Documentation reflects actual behavior and known limits.

## Security and compatibility

- [ ] No real credentials, customer data, payment records, or private configuration are included.
- [ ] Decoy handlers remain inert; no real shell/network/payment operation is added to a test.
- [ ] Guarded integrations route every protected callback through the reviewed guard.
- [ ] Public V1 CLI/SDK/MCP behavior and existing license checks remain compatible, or the impact is explained.
- [ ] New dependencies, permissions, network access, or persistent state are described.

## Reviewer notes

<!-- Add reproducible commands, screenshots, or a risk note. Never paste secrets. -->
