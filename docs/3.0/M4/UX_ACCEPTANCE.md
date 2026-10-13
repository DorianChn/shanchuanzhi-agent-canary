# M4 UX Acceptance — Windows Security Center

Date: 2026-10-13
Product surface: existing local Agent Canary Console at **src/ai/console-page.ts**

## Status rules

Every protection status is normalized to exactly one of:

- **PROTECTED**
- **PARTIALLY_PROTECTED**
- **NOT_PROTECTED**
- **UNKNOWN**

Only the optional live security-center response may set protection statuses. Missing fields, invalid values, unavailable endpoints, timeouts, permission failures, and malformed responses resolve to **UNKNOWN**. The UI never derives protection from sandbox actions, demo runtime state, historical events, or configuration-file presence.

## Feature acceptance

| Capability | UX acceptance | Current backend evidence |
| --- | --- | --- |
| Protection overview | Shows the exact normalized status and explains that **UNKNOWN** is not a safety claim. | No aggregate protection endpoint; **UNKNOWN**. |
| Gateway | Shows protection status and exact connection state when returned. | No live Gateway status endpoint; both **UNKNOWN**. |
| Hook health | Shows live Hook protection status only. | No live Hook health endpoint; **UNKNOWN**. |
| Agent list | Shows actual detected Agent configuration records separately from connection and protection status. | **/api/agents** reports configuration detection. Its demo **installed** entries are ignored; connection/protection remain **UNKNOWN**. |
| Protected tool count | Shows only a non-negative integer from the live status payload. | No current field; **UNKNOWN**. |
| Unprotected execution paths | Shows only paths returned by the live status payload. | No current field; **UNKNOWN**. |
| Security events | Polls **/api/state** every 10 seconds and displays only the latest 100 real audit records. Empty data says “no recorded event in this range”; it does not claim the system is safe. | **/api/state** is available and returns recorded events. |
| Intercept explanation | Maps known event kinds to Chinese explanations and appends the sanitized backend reason when present. | Based on actual event records; no synthetic alerts are added. |
| Canary isolation | Keeps product-wide isolation **UNKNOWN** unless a dedicated live status is returned. Shows the Runtime demo Guard separately with its explicit scope. | **/api/runtime3** reports only the controlled SDK demo session; it is not product-wide isolation evidence. |
| Current policy | Keeps live Agent policy **UNKNOWN**. Shows the local Console sandbox mode separately and labels its virtual-executor scope. | **/api/policy/state** reports a **VIRTUAL_EXECUTORS** demo mode, not a live Agent policy. |
| One-click health check | Checks the four existing read APIs (**/api/state**, **/api/agents**, **/api/policy/state**, **/api/runtime3**) plus optional security-center and E4-status APIs; reports timeout, permission, unsupported, malformed, and unavailable outcomes. | The health check confirms API readability only, not protection. |
| Diagnostic export | Creates a JSON diagnostic with status/source availability and event kind/time summary; omits event arguments, raw reasons, filesystem paths, and secrets. | Browser generated a valid diagnostic object. Headless Chrome cancelled its file write; see **UI_TEST_RESULTS.md**. |
| Automatic E4 entry | One click opens the local Auto E4 test command and copy control. It displays **UNKNOWN** until a backend runner exists. | No Console E4 status/run route. The command is not a full independent E4 run. |
| First-use guide | Explains local Console checks, Agent configuration detection, the limits of configuration detection, and the E4 resource constraint. | Available in the current page. |
| Install/connection recovery | Gives actionable guidance for disconnects, timeouts, permissions, missing routes, malformed data, empty records, and Agent configuration failures. | API failure classification is covered by adapter tests; no installation result endpoint exists. |

## Interaction and accessibility

- The security center is the first section in the incumbent Console page; no second product shell is created.
- Buttons have direct action labels, keyboard focus uses the existing visible focus ring, and changing health/event state is announced with live regions.
- The overview collapses to one column at narrow widths. The 390 CSS-pixel browser check measured a 390-pixel document width with no horizontal overflow.
- Event rows are selectable by keyboard and pointer; the explanation area reports the selected real record.
- Demo policy/runtime sections remain visibly labeled as virtual demonstrations.

## Acceptance boundary

The UI portion is implemented. Backend-backed protection claims remain **UNKNOWN** until the owning modules provide live status data. The E4 control is a copyable local test entry; automatically launching the full E4 suite from Console is pending a coordinated backend runner API and resource scheduling.
