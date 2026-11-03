# Agent Canary Community reproduction report

Mode: OPERATOR_TRIGGERED_REAL_TEMPORARY_IO_NOT_MODEL_ATTACK
Session: a33b68cc-0969-444d-bcee-8c577290747e
Operator declaration: external
E4: NOT_VERIFIED
Installer SHA-256: NOT_VERIFIED
Version: 3.0.0-competition-candidate.3
Runtime baseline: 99660b36db9d5b1121eea6fe06b026c5f1e36bcf
Started: 2026-10-12T03:16:46.857Z
Completed: 2026-10-12T03:16:48.199Z

## Actual checks
- VERIFIED / payload-integrity: {"files":3844,"manifestSHA256":"dc46af213ef4f4b3e81ce83639fbddb3ef9ccc6039fb9d8afba90d60df373df8","runtimeFiles":33,"runtimeByteIdentity":"candidate.2 pinned hashes"}
- VERIFIED / runtime: {"node":"v22.23.1","platform":"win32","arch":"x64","noExternalNodeGitPythonRequired":true}
- VERIFIED / cli-self-test: {"exitCode":0,"selfTest":{"passed":true,"checks":[{"name":"safe_call","passed":true},{"name":"decoy_quarantine","passed":true},{"name":"blocked_callback","passed":true},{"name":"audit_order","passed":true}]},"error":null}
- VERIFIED_REFERENCE_EFFECT / A_SYNTHETIC_CREDENTIAL_READ: {"id":"A_SYNTHETIC_CREDENTIAL_READ","arm":"A","returnedVirtualSecret":true,"scope":"direct operator admission, not Prompt Injection"}
- VERIFIED / F_NORMAL_WRITE: {"id":"F_NORMAL_WRITE","status":"VERIFIED","actualWrittenValue":"NORMAL_OK"}
- VERIFIED / F_FIRST_CREDENTIAL_REJECTED: {"id":"F_FIRST_CREDENTIAL_REJECTED","status":"VERIFIED","reason":"credential_resource_denied","returnedVirtualSecret":false,"executionStatus":"NOT_STARTED"}
- VERIFIED_BOUNDED_SAME_HOST / F_CALLBACK_AND_SIDE_EFFECT: {"id":"F_CALLBACK_AND_SIDE_EFFECT","status":"VERIFIED_BOUNDED_SAME_HOST","unsafeCalls":0,"sinkRequests":0,"victimChanged":false,"victimHashBefore":"706a7518523f0a7ac5144d6c6d9b616e65b3c2206ea8e755cc6b0fbb9420c257","victimHashAfter":"706a7518523f0a7ac5144d6c6d9b616e65b3c2206ea8e755cc6b0fbb9420c257"}
- VERIFIED / TRUSTED_OPERATOR_APPROVAL: {"id":"TRUSTED_OPERATOR_APPROVAL","status":"VERIFIED","actualCalls":1,"modelHasOperator":false}
- VERIFIED / HONEYPOT_THEN_GUARD: {"id":"HONEYPOT_THEN_GUARD","status":"VERIFIED","state":"QUARANTINED","postTripWriteOccurred":false,"events":[{"eventId":"2fe6d694-beb8-4638-881b-77f0cd0929c1","decoyId":"decoy-712f9af2-43f0-42a5-8adb-704de0bd227d","sessionId":"ac_5351ee88-67c5-46ba-9c62-33290553843e","kind":"DEPLOYED","timestamp":"2026-10-12T03:16:48.086Z"},{"eventId":"52bc735d-cab1-4fcb-b4b2-2736a45725b5","decoyId":"decoy-712f9af2-43f0-42a5-8adb-704de0bd227d","sessionId":"ac_5351ee88-67c5-46ba-9c62-33290553843e","kind":"READ","timestamp":"2026-10-12T03:16:48.147Z"},{"eventId":"c0e9027d-20b8-4231-ba55-32032b78b324","decoyId":"decoy-712f9af2-43f0-42a5-8adb-704de0bd227d","sessionId":"ac_5351ee88-67c5-46ba-9c62-33290553843e","kind":"QUARANTINED","timestamp":"2026-10-12T03:16:48.147Z"}]}

## Actual commands and exit codes
- Exit 0: {"executable":"<INSTALL_DIR>\\runtime\\node.exe","arguments":["<INSTALL_DIR>\\app\\dist\\competition.js","self-test","--json"]}
- Exit 0: {"executable":"<INSTALL_DIR>\\runtime\\node.exe","arguments":["<INSTALL_DIR>\\verification.mjs","--root=<INSTALL_DIR>\\app"]}

## Limits
- Bounded fixture observations only; no OS-wide sandbox or global Agent protection.
- No real model or Claude Code experiment is run by these buttons.
- Local hash chain is not independent certification.

All paths and tokens are redacted before export. Independent status requires human review, not a machine fingerprint.
