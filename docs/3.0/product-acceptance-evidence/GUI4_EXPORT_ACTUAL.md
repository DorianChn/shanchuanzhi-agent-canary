# Agent Canary Community reproduction report

Mode: OPERATOR_TRIGGERED_REAL_TEMPORARY_IO_NOT_MODEL_ATTACK
Session: 12ebe97a-1901-4eb2-ac9e-13557fa0d2c9
Operator declaration: unspecified
E4: NOT_VERIFIED
Installer SHA-256: 567b1e7e8832b6aa31fc80c86994eb915bf8d3db9caf125c1f7a08b42cf94ce6
Version: 3.0.0-competition-candidate.4
Runtime baseline: 99660b36db9d5b1121eea6fe06b026c5f1e36bcf
Started: 2026-10-12T04:46:35.619Z
Completed: 2026-10-12T04:46:37.224Z

## Actual checks
- VERIFIED / payload-integrity: {"files":3853,"manifestSHA256":"c02ed823436489a9df7beac140d9d646809ff57aa5369cfcf0a36b28ad6daaf2","runtimeFiles":33,"runtimeByteIdentity":"VERSION.json coreRuntimeHashes verified for this installed candidate"}
- VERIFIED / runtime: {"node":"v22.23.1","platform":"win32","arch":"x64","noExternalNodeGitPythonRequired":true}
- VERIFIED / cli-self-test: {"exitCode":0,"selfTest":{"passed":true,"checks":[{"name":"safe_call","passed":true},{"name":"decoy_quarantine","passed":true},{"name":"blocked_callback","passed":true},{"name":"audit_order","passed":true}]},"error":null}
- VERIFIED_REFERENCE_EFFECT / A_SYNTHETIC_CREDENTIAL_READ: {"id":"A_SYNTHETIC_CREDENTIAL_READ","arm":"A","returnedVirtualSecret":true,"scope":"direct operator admission, not Prompt Injection"}
- VERIFIED / F_NORMAL_WRITE: {"id":"F_NORMAL_WRITE","status":"VERIFIED","actualWrittenValue":"NORMAL_OK"}
- VERIFIED / F_FIRST_CREDENTIAL_REJECTED: {"id":"F_FIRST_CREDENTIAL_REJECTED","status":"VERIFIED","reason":"credential_resource_denied","returnedVirtualSecret":false,"executionStatus":"NOT_STARTED"}
- VERIFIED_BOUNDED_SAME_HOST / F_CALLBACK_AND_SIDE_EFFECT: {"id":"F_CALLBACK_AND_SIDE_EFFECT","status":"VERIFIED_BOUNDED_SAME_HOST","unsafeCalls":0,"sinkRequests":0,"victimChanged":false,"victimHashBefore":"706a7518523f0a7ac5144d6c6d9b616e65b3c2206ea8e755cc6b0fbb9420c257","victimHashAfter":"706a7518523f0a7ac5144d6c6d9b616e65b3c2206ea8e755cc6b0fbb9420c257"}
- VERIFIED / TRUSTED_OPERATOR_APPROVAL: {"id":"TRUSTED_OPERATOR_APPROVAL","status":"VERIFIED","actualCalls":1,"modelHasOperator":false}
- VERIFIED / HONEYPOT_THEN_GUARD: {"id":"HONEYPOT_THEN_GUARD","status":"VERIFIED","state":"QUARANTINED","postTripWriteOccurred":false,"events":[{"eventId":"6963bfd9-1e7d-46d2-a6d0-bae108e21895","decoyId":"decoy-d8b37701-f3be-4022-842d-5c4e4a9b15d1","sessionId":"ac_23f1af65-eca9-47e7-92d8-bc7c33e1025a","kind":"DEPLOYED","timestamp":"2026-10-12T04:46:37.121Z"},{"eventId":"e12304ad-b18e-4427-9679-2ea9b1ab8174","decoyId":"decoy-d8b37701-f3be-4022-842d-5c4e4a9b15d1","sessionId":"ac_23f1af65-eca9-47e7-92d8-bc7c33e1025a","kind":"READ","timestamp":"2026-10-12T04:46:37.186Z"},{"eventId":"548dcc7a-6dc9-4b18-884c-1a3f9bc1cabb","decoyId":"decoy-d8b37701-f3be-4022-842d-5c4e4a9b15d1","sessionId":"ac_23f1af65-eca9-47e7-92d8-bc7c33e1025a","kind":"QUARANTINED","timestamp":"2026-10-12T04:46:37.186Z"}]}

## Actual commands and exit codes
- Exit 0: {"executable":"<INSTALL_DIR>\\runtime\\node.exe","arguments":["<INSTALL_DIR>\\app\\dist\\competition.js","self-test","--json"]}
- Exit 0: {"executable":"<INSTALL_DIR>\\runtime\\node.exe","arguments":["<INSTALL_DIR>\\verification.mjs","--root=<INSTALL_DIR>\\app"]}

## Limits
- Bounded fixture observations only; no OS-wide sandbox or global Agent protection.
- No real model or Claude Code experiment is run by these buttons.
- Local hash chain is not independent certification.

All paths and tokens are redacted before export. Independent status requires human review, not a machine fingerprint.
