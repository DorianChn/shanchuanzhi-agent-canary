# Agent Canary Community reproduction report

Mode: OPERATOR_TRIGGERED_REAL_TEMPORARY_IO_NOT_MODEL_ATTACK
Session: 12ebe97a-1901-4eb2-ac9e-13557fa0d2c9
Operator declaration: unspecified
E4: NOT_VERIFIED
Installer SHA-256: 6c78620d249ec7e9f13ad929c4c1fb44c307f4b818751e7446f193a09a5d27e1
Version: 3.0.0-competition-candidate.3
Runtime baseline: 99660b36db9d5b1121eea6fe06b026c5f1e36bcf
Started: 2026-10-12T03:44:38.362Z
Completed: 2026-10-12T03:44:39.820Z

## Actual checks
- VERIFIED / payload-integrity: {"files":3844,"manifestSHA256":"dc46af213ef4f4b3e81ce83639fbddb3ef9ccc6039fb9d8afba90d60df373df8","runtimeFiles":33,"runtimeByteIdentity":"candidate.2 pinned hashes"}
- VERIFIED / runtime: {"node":"v22.23.1","platform":"win32","arch":"x64","noExternalNodeGitPythonRequired":true}
- VERIFIED / cli-self-test: {"exitCode":0,"selfTest":{"passed":true,"checks":[{"name":"safe_call","passed":true},{"name":"decoy_quarantine","passed":true},{"name":"blocked_callback","passed":true},{"name":"audit_order","passed":true}]},"error":null}
- VERIFIED_REFERENCE_EFFECT / A_SYNTHETIC_CREDENTIAL_READ: {"id":"A_SYNTHETIC_CREDENTIAL_READ","arm":"A","returnedVirtualSecret":true,"scope":"direct operator admission, not Prompt Injection"}
- VERIFIED / F_NORMAL_WRITE: {"id":"F_NORMAL_WRITE","status":"VERIFIED","actualWrittenValue":"NORMAL_OK"}
- VERIFIED / F_FIRST_CREDENTIAL_REJECTED: {"id":"F_FIRST_CREDENTIAL_REJECTED","status":"VERIFIED","reason":"credential_resource_denied","returnedVirtualSecret":false,"executionStatus":"NOT_STARTED"}
- VERIFIED_BOUNDED_SAME_HOST / F_CALLBACK_AND_SIDE_EFFECT: {"id":"F_CALLBACK_AND_SIDE_EFFECT","status":"VERIFIED_BOUNDED_SAME_HOST","unsafeCalls":0,"sinkRequests":0,"victimChanged":false,"victimHashBefore":"706a7518523f0a7ac5144d6c6d9b616e65b3c2206ea8e755cc6b0fbb9420c257","victimHashAfter":"706a7518523f0a7ac5144d6c6d9b616e65b3c2206ea8e755cc6b0fbb9420c257"}
- VERIFIED / TRUSTED_OPERATOR_APPROVAL: {"id":"TRUSTED_OPERATOR_APPROVAL","status":"VERIFIED","actualCalls":1,"modelHasOperator":false}
- VERIFIED / HONEYPOT_THEN_GUARD: {"id":"HONEYPOT_THEN_GUARD","status":"VERIFIED","state":"QUARANTINED","postTripWriteOccurred":false,"events":[{"eventId":"b6385ade-5ab2-48de-95c7-e390f72dfbe1","decoyId":"decoy-9d7658e2-1468-4aa4-bcc1-afda39018197","sessionId":"ac_1c8a8468-6748-4354-855a-f597ee9e0bdb","kind":"DEPLOYED","timestamp":"2026-10-12T03:44:39.717Z"},{"eventId":"bf1d30e8-8241-4152-bb2d-bc798d0ef631","decoyId":"decoy-9d7658e2-1468-4aa4-bcc1-afda39018197","sessionId":"ac_1c8a8468-6748-4354-855a-f597ee9e0bdb","kind":"READ","timestamp":"2026-10-12T03:44:39.781Z"},{"eventId":"8716a397-5f50-4c90-ad2f-c415d4fa8ee9","decoyId":"decoy-9d7658e2-1468-4aa4-bcc1-afda39018197","sessionId":"ac_1c8a8468-6748-4354-855a-f597ee9e0bdb","kind":"QUARANTINED","timestamp":"2026-10-12T03:44:39.781Z"}]}

## Actual commands and exit codes
- Exit 0: {"executable":"<INSTALL_DIR>\\runtime\\node.exe","arguments":["<INSTALL_DIR>\\app\\dist\\competition.js","self-test","--json"]}
- Exit 0: {"executable":"<INSTALL_DIR>\\runtime\\node.exe","arguments":["<INSTALL_DIR>\\verification.mjs","--root=<INSTALL_DIR>\\app"]}

## Limits
- Bounded fixture observations only; no OS-wide sandbox or global Agent protection.
- No real model or Claude Code experiment is run by these buttons.
- Local hash chain is not independent certification.

All paths and tokens are redacted before export. Independent status requires human review, not a machine fingerprint.
