# M9 M1 source-pin evidence — 2026-11-03

## Current exact source

At M9 source commit `58320b795568b387850bae8b1c19e9a6e86c8887`, `docs/3.0/M9_EXACT_SOURCE_REFS.json` pins M1 to PR #152 head `b08078b7f81589e6649d9a855c2ae18d802af9ca` on `feature/ac3-m1-mount-boundary`. The remote branch head matched that SHA when checked on 2026-11-03. The pin's tree is `68e142fc8df4833dea627f08cf2f92d4ab0df096`.

The prior `5eaf323b4188dc4228eadd099d2e27af3e61ae79` value was PR #149's intermediate head, not the current M9 pin. PR #149 merged as `0831ed4979ae4d9f4c6698296726732d427fb7ae`; PR #151 then merged M9 source-pin changes as `301d169d5ae586f14a1a7acf9ac2d5c3784419e7`. The current PR #152 M1 pin `b08078b` is a descendant of both merge commits: it retains PR #149's held-handle file-open changes and adds the POSIX mount-crossing checks. The manifest names PR #152 because it selects that later exact M1 source.

## Verification

- Git ancestry checks confirmed PR #149 merge `0831ed4` and PR #151 merge `301d169` are ancestors of M1 pin `b08078b`.
- M9 exact-source composition run [41526853771](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/41526853771) passed on Ubuntu and Windows. Both jobs checked out the exact manifest pins and passed the M1 held-Gateway regression, cross-module composition suite, and M6/M8 disposition gate.
- At M0 evidence PR head `ff24b4c7cb808170edf9afd165c44cacc9b74dbf`, the exact M1–M8 manifest validator passed with `EXPECTED_M9_SHA` set to that checkout SHA; no module pins were changed.
- The earlier M9 pin workflow checks on PR #151 passed 21/21; the M1/M3/M5 tuple also passed hosted composition on Ubuntu and Windows in run [41508666850](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/41508666850).

## Evidence limits

These checks establish exact-source CI and synthetic/source-level Gateway composition. They do not establish independent product E4, clean-VM installer acceptance, protection for native Shell or arbitrary callbacks, or an atomic operating-system path-resolution guarantee. Issue #52 remains open for the remaining host and TOCTOU acceptance requirements.
