# AC3 API Contracts

## M5 Policy Audit Events

This section defines the public event semantics for schema `agent-canary.policy-audit/1`.

### Event and decision invariants

- `DECISION` records a pre-execution policy outcome. Its `decision` is `ALLOW`, `DENY`, `UNKNOWN`, or `REQUIRE_CONFIRMATION`; `execution_status` and `side_effect_verification` are both `NOT_STARTED`.
- `EXECUTION_RESULT` records the outcome after execution has started. Its `decision` is `NOT_APPLICABLE`; `execution_status` is not `NOT_STARTED`, and `side_effect_verification` is not `NOT_STARTED`.
- `POLICY_APPLIED`, `POLICY_ROLLED_BACK`, and `POLICY_CHANGE_REJECTED` are policy-management events, not tool decisions or execution results. They use `decision=NOT_APPLICABLE`, `execution_status=NOT_STARTED`, and `side_effect_verification=NOT_STARTED`.
- An event that violates its event-type invariant is invalid. The producer rejects it before appending it to the audit chain; evidence verification rejects the same invalid event when reading an existing chain or an exported bundle.

### Interpretation

- `DENY` with `execution_status=NOT_STARTED` states that the callback represented by that event did not start. An audit record alone does not prove that every host, Hook, Gateway, or external execution path was blocked.
- `UNKNOWN` preserves uncertainty about a decision or execution outcome. It must not be converted to `ALLOW`, `DENY`, or a confirmed failure without evidence.
- `SUCCEEDED` means the callback returned successfully. Unless a trusted verifier establishes otherwise, `side_effect_verification=NOT_VERIFIED`; callback success is not proof of an external side effect.
- A callback failure whose effects cannot be established is represented as `execution_status=UNKNOWN` and `side_effect_verification=UNKNOWN`, with `decision=NOT_APPLICABLE`.

The M5 implementation enforces these invariants when appending events and when verifying policy evidence and exports. This audit contract does not replace final authorization at the trusted host or Gateway execution boundary.
