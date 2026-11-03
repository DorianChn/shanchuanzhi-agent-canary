# Third-party runtime and installer notices

Agent Canary Community core: MIT, DorianChn. Existing MIT license retained in `app/LICENSE`; no license conversion.

Node.js v22.23.1: bundled official Windows x64 `node.exe`. Full upstream license and incorporated component notices are provided at `runtime/NODE_LICENSE`.

NSIS 3.13: installer stub and nsExec/System plugins are distributed under upstream NSIS licenses, including the zlib/libpng license. Official source and licensing: https://nsis.sourceforge.io/License . Full upstream COPYING accompanies this distribution. This installer uses zlib compression.

Production npm dependencies retain upstream license files in `app/node_modules`. The dependency package lock is retained for reproducibility. No sponsor service, private signing key, production order database or commercial V2 CLI implementation is intentionally included in this curated payload.

.NET Framework and Windows are preexisting operating system components, not bundled third-party redistributions. Unsigned candidate: publisher identity has not been verified by an Authenticode certificate.
