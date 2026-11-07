# Third-party dependency notice

Agent Canary project code retains MIT. `koffi` 3.3.6 is an MIT-licensed runtime dependency used for relative OS file-handle operations; `smol-toml` 1.9.1 is a separately licensed BSD-3-Clause runtime dependency. Both are pinned in package-lock.json and retain their upstream licenses in their npm packages. The free ZIP does not bundle node_modules.

Koffi upstream: https://github.com/Koromix/koffi
Upstream: https://github.com/squirrelchat/smol-toml

The optional cloud red-team lab may use `agent-governance-toolkit-core==5.0.0` from Microsoft Agent Governance Toolkit for offline MCP metadata preflight. It is MIT-licensed and installed only into the lab's separate Python environment; it is not bundled into the Agent Canary npm package or loaded by the core runtime. Its upstream source and license are available at https://github.com/microsoft/agent-governance-toolkit.
