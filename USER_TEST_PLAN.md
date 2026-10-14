# Independent usability trial plan

**Plan only.** No participants have been recruited or tested. This document is not a user-count or satisfaction claim.

## Goal and sample

Run a small formative pilot with **5–10 people who are not software developers and have not contributed to this repository**. The aim is to find confusing setup, trust-boundary, and recovery instructions, not to estimate market demand or prove product security.

Recruit participants only after the test artifact and instructions are frozen. Record a pseudonymous participant code, broad experience band, OS, app/Node versions, exact artifact/commit and hash. Do not collect names, employer, account identifiers, project contents, or credentials in the results.

## Safety and consent

- Use a disposable OS account or VM and a scratch project with synthetic files.
- Never connect production accounts, real secrets, payment systems, or non-loopback network targets.
- Default to the published v3.0.0 stable tag/package and record the exact version, source commit, and artifact hash used. The published [v3.0.0-competition bundle](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0-competition) reuses [candidate.4](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0-competition-candidate.4) assets; if either is included, label the exact tag and asset hash as a separate study arm and never substitute it silently. Treat moving development builds as separate arms too.
- GitHub Packages installation requires a GitHub token with `read:packages`. Do not ask participants to create, reveal, or share a maintainer token. If install friction is part of the study, the organizer must prepare an isolated environment and document its credential setup without exposing the token; otherwise, make install prerequisites explicit before recruitment.
- Explain what will be observed before the session. Recording is optional and requires separate consent; a participant may stop at any time.
- Do not bypass SmartScreen, UAC, host sandboxing, or other security warnings for the study.
- Keep raw notes private, redact them before sharing, and delete recordings after the agreed review period.

## Session protocol

Budget 30 minutes per participant, excluding dependency-download time. Use the same task sheet and artifact for everyone. The facilitator reads each prompt verbatim, does not coach during a task, and records when a safety clarification is necessary.

1. **Understand the product (5 minutes):** Read the README and explain in their own words what is and is not protected.
2. **Install and self-check (10 minutes):** Follow [GETTING_STARTED.md](GETTING_STARTED.md) in the prepared scratch environment; run the self-test and identify the expected success result.
3. **Optional Codex setup (10 minutes):** Only for participants using Codex. Use the exact v3.0.0 CLI in a scratch project; preview the project config, apply it, inspect MCP status, then use the documented receipt-based rollback. Explain before the task that this registers Agent Canary's MCP server and does not guard Codex's built-in tools.
4. **Feedback (5 minutes):** Complete the public product-feedback issue form only if they choose to share feedback. Private notes remain with the study organizer and are not posted automatically.

Do not ask a participant to trigger a decoy against a real workspace. If an optional decoy demonstration is included, use a new throwaway session and explain that it quarantines the Agent Canary route.

## Measures and decision rules

Record task completion, elapsed hands-on time, assistance needed, wrong turns, installation errors, whether the participant can accurately describe the native-tool boundary, and any privacy or safety concern. Separate download time from active task time.

Treat the pilot as ready for another iteration only if:

- At least 80% of participants complete the self-check with no more than one non-safety clarification.
- Every participant can identify that native Codex Shell/file tools are outside the documented protection path; any repeated misunderstanding blocks the copy from release.
- No real secret, private project file, or non-loopback destination is used.
- Failures and dissenting feedback are retained; no outcome is omitted to improve the summary.

With 5–10 participants these are product iteration gates, not statistically representative findings. Publish no conclusion until the sessions actually occur and the artifact, sample, and method are recorded.

## Feedback and issue collection

- Use the Product feedback GitHub issue form for optional public, redacted reports.
- Use GitHub Discussions for general setup and usability questions.
- Use a private [Security Advisory](https://github.com/DorianChn/shanchuanzhi-agent-canary/security/advisories/new) for vulnerabilities; never put exploit details in the feedback form.
- Ask before quoting or attributing feedback. Do not make participants' comments, identities, or recordings public by default.
