# M3 configured-target readiness contract

Status: additive M3-owned API contract; `API-Contract-Change: yes`.

## Endpoint

`GET /api/security-center/configured-target-readiness` is a read-only, same-origin Console endpoint. It requires the existing `x-canary-csrf` header and Host/Origin checks. It does not require or return the operator code.

The response has exactly these fields:

```json
{
  "scope": "M3_CONFIGURED_TARGET_READINESS",
  "schemaVersion": 1,
  "generatedAt": "2026-10-28T08:17:00.000Z",
  "configurationStatus": "CONFIGURED",
  "bindingStatus": "BOUND",
  "actionReadiness": "READY",
  "operatorAuthStatus": "CONFIGURED",
  "targets": [
    { "targetId": "summary", "bindingStatus": "BOUND" }
  ]
}
```

`targets` contains only startup-configured stable public labels and their binding state; it is not a target count or arbitrary discovery result. A label must be a non-sensitive operator-defined identifier matching `^[a-z][a-z0-9_-]{0,62}$`. It must not encode a path, filename, secret, credential, or capability. Labels remain immutable for the lifetime of the Console process.

No dynamic path, path mapping, content, exception, held-file capability, credential, or executable token is returned. The response never includes a callback, authorization header, or caller/model-selected target.

`schemaVersion` is the integer `1`. `generatedAt` is an ISO-8601 UTC timestamp created for each request; responses use `Cache-Control: no-store`. M4 must validate the version, timestamp, scope, exact field set and every enum before using metadata. A snapshot older than 15 seconds, or more than 5 seconds in the future, is stale/invalid and must produce disabled controls with `UNKNOWN`.

## Stable field semantics

- `scope` is always `M3_CONFIGURED_TARGET_READINESS`.
- `configurationStatus` is `CONFIGURED` when a non-empty fixed-target configuration was supplied, `NOT_CONFIGURED` when absent or empty, and `UNKNOWN` when the configuration container is malformed.
- `bindingStatus` is `BOUND` when at least one startup-configured target was validated and bound through the M1/M2/M5 owner chain; `BLOCKED` when configured targets are known and all recognized IDs failed closed before binding; `UNAVAILABLE` when configuration is absent; otherwise `UNKNOWN`.
- `operatorAuthStatus` is `CONFIGURED` when a non-empty server-side operator code is configured, and `NOT_CONFIGURED` otherwise. This reports configuration presence only; it does not report or validate a caller's submitted code.
- `actionReadiness` is `READY` only when `bindingStatus` is `BOUND` and `operatorAuthStatus` is `CONFIGURED`; `BLOCKED` when the binding is known blocked or a bound target lacks configured operator auth; `UNAVAILABLE` when no fixed-target configuration exists; otherwise `UNKNOWN`.
- Each `targets[]` entry contains exactly `targetId` and `bindingStatus`. The ID is the fixed public label supplied at Console startup, not the path or capability; M4 may present those labels for explicit operator selection only after validating this exact response shape.

Missing, malformed, or internally inconsistent state must not be upgraded to `READY`. The aggregate values make no claim that a later read will succeed; replacement, policy, authorization, or owner-adapter failures still fail closed in the separate read route.

## Authority and UI boundary

This endpoint is informational. `READY` is not an authorization decision, approval, M1 held-file capability, target-selection token, or proof of product/native-host/OS-atomic protection. `targetId` is an identifier only: the read route separately requires CSRF and operator-code checks, and re-resolves it against the process-startup binding. M4 must keep its control disabled and display `UNKNOWN` when this response is absent, stale, malformed, or contains an unknown scope/status/field; only a separately reviewed operator flow may use an ID from a validated snapshot. The existing `POST /api/security-center/target-read` remains separate and retains its exact `{ "targetId": "<configured-id>" }` request shape.

The stable labels are not authorization capabilities and cannot invoke a read. This endpoint cannot be used to execute a configured target.
