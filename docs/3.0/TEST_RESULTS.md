# Agent Canary 3.0 test results

Updated: 2026-10-13

This page separates the new mainline source checks from the previously published product-acceptance evidence. Results from different commits are not combined into a single pass rate.

## Mainline source

On 2026-10-13, the repository root completed `npm ci` and `npm run verify` on the Windows host with Node.js 22.23.1. The exact summary is in [MAINLINE_VERIFY_2026-10-13.json](MAINLINE_VERIFY_2026-10-13.json).

| Mainline check | Result |
|---|---|
| Dependency install | Passed; 102 packages installed, npm reported 0 known vulnerabilities |
| TypeScript build | Passed |
| Root automated suite | 100/100 passed; 0 failed, 0 skipped |
| Offline self-test | Passed, 4/4 checks |
| SDK type consumer | Passed, 5 compile-time contract checks |
| Curated source manifest | 181 files checked; 0 mismatches |
| Bounded operator demo | 6 cases completed; `VERIFIED_BOUNDED_OPERATOR_DEMO`; E4 remains NOT VERIFIED |
| Packed package smoke | Passed; 72 files, installed CLI reported version 3.0.0 and self-test passed |

The release workflow repeats `npm run verify` for the tagged source before publishing. These checks do not establish independent E4 reproduction or protection of unrelated host tools.

## Previously published product acceptance

The following results belong to the public 3.0 source bundle identified by community source SHA `48d5c440de4b1ced45075b2a1c347545576d2e10`, security-core SHA `9007e3a9fa6def487416e1dbb183143829b44aca`, and wrapper SHA `725967fece0e3c8f5604765145a8a8906da88f4b`. They remain useful reference evidence, but are not represented as a rerun of the new mainline commit.

| Check | Result | Scope |
|---|---|---|
| Curated Community suite in public source ZIP | 100/100 passed | Candidate 4 archive; test result is not a population estimate |
| Windows install and GUI path | 9 steps passed | Windows 11, same-user environment; installer unsigned; clean VM blocked |
| Ubuntu portable ZIP | SDK types, doctor, effects, uninstall, repeat uninstall passed | Same operator in WSL2 Ubuntu 26.04 with Node 22.23.1 |
| Core CI | 9/9 jobs passed | Recorded source SHA; Windows, Linux, macOS and Node 20/22 matrix plus package, Sponsor and Docker jobs |
| Wrapper CI | 2/2 jobs passed | Recorded wrapper SHA |
| Local Qwen tool-selection experiment | 48 runs | 12 authored scenarios, two repeats, two arms; same controlled SDK fixture host |

### Model experiment details

- Direct restricted tasks: arm A observed the expected effect or normal completion in 12/12; guarded arm F observed 0/12 effects and actively rejected 12/12. This is a bounded local-fixture result, not an estimate for all attacks.
- Indirect README tasks: both arms had 0/4 effects and 0/4 active rejections. The set produced no attack effect, so it does not show an active prevention gain.
- Normal tasks: both arms completed 8/8. Four distinct task forms were repeated twice; this does not establish a general false-positive rate.
- Independent AI contribution and adaptive-versus-static gain were not measured.

## Evidence levels E0–E4

| Level | Status | Supported statement |
|---|---|---|
| E0 mechanism | VERIFIED | The listed gateway, policy, guard, evidence and honeypot mechanisms exist in the recorded source. |
| E1 signal | VERIFIED, bounded | Recorded direct honeypot contacts produced signals; deployment alone is not counted as contact. |
| E2 decision trail | VERIFIED, bounded | Recorded requests, decisions and execution states can be checked for internal consistency. |
| E3 observed effect | VERIFIED, local scope | In the controlled fixture, 12 guarded direct restricted tasks had no prohibited target effect; normal positive controls succeeded. This is not global OS monitoring or an unlimited observation window. |
| E4 independent reproduction | **BLOCKED / NOT VERIFIED** | No second operator has rerun the frozen build in an independent environment. Same-host runs, another worktree, hash recalculation, and log review do not count as E4. |

## Limits

Clean Windows VM validation is blocked. The Windows installer is unsigned. The native Claude/Qwen hook path is blocked, and global protection of Codex, Cursor, Cline, third-party MCP servers, or unrelated host tools is not verified. TOCTOU is not fully eliminated, and a callback that ignores cancellation may produce a late side effect. The model runs are small, authored, correlated samples; they do not establish a universal security rate, zero false positives, or independent AI benefit.

See [the full acceptance report](FINAL_3_0_ACCEPTANCE.md), [E0–E4 assurance mapping](EVIDENCE_ASSURANCE_MAPPING.md), and the [publicly downloadable candidate acceptance bundle](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/download/v3.0.0-competition-candidate.4/AgentCanary-candidate4-acceptance-evidence.zip).
