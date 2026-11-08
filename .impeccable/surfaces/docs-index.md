# Agent Canary public workbench

## Mode and audience
Operate mode. The primary visitor is a competition reviewer or security practitioner inspecting Agent Canary's safe demonstration. Audience details beyond this task are inferred.

## User-pinned visual direction
Use the five supplied dashboard screenshots as one family: warm ivory ground; hairline black dividers; a restrained rust warning color; editorial serif display text; compact sans-serif body; monospaced technical labels; dense tables and evidence panes. Screenshot 1 is the overview backbone; screenshots 2–5 specify the asset, policy, forensic, and redaction surfaces. Build the product UI in standard web controls, not as a faux printed artifact.

## Product work
Explain and demonstrate the host-registered Agent Canary path: inert MCP decoys and canary signals enter the Gateway/Guard policy flow, decisions are recorded, and sensitive text can be minimized before advisory analysis. Keep the five surfaces as Overview, Assets, Policy, Audit, and Redaction. The public page links to the loopback backend; when the same assets are served at `/workbench/` by the local console, use only the backend's CSRF-protected same-origin read APIs.

## First viewport
A narrow numbered rail on the left; a compact title/status bar; a wide overview with the factual product version as the main display figure, a synthetic event timeline, and a right-side priority stream. The public page states that sample telemetry is synthetic and links to the viewer's own loopback backend. The locally served route reports whether its same-origin APIs connected.

## Signature interaction
Selecting a synthetic MCP decoy opens an inspector dossier with its declared boundary and synthetic trace. This echoes the supplied asset-ledger and incident-dossier screenshots while keeping the interaction safe and browser-local.

## Claims and evidence
Do not show an invented security score, measured attack result, certification, real asset inventory, or real incident. Mark demo rows and event times as synthetic at the point of use. Use source-backed descriptions of registered callbacks, decoy tools, deny/approval decisions, and best-effort redaction. On GitHub Pages, make no API calls. On the loopback route, read only the existing state, runtime demo, and virtual policy status APIs with the process CSRF token; never place provider or operator secrets in browser storage.

## Responsive behavior
Desktop uses the left rail, split workspace, and inspector column. Tablet reduces the rail and collapses the inspector under the selected record. Mobile uses a compact top bar and slide-in navigation; tables become stacked rows, and all controls retain one-line labels and keyboard focus.
