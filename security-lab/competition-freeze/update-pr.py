import json
from pathlib import Path
root=Path(__file__).resolve().parents[2];dir=root/'security-lab/competition-freeze/local-only'
old=json.loads((dir/'pr-body-before.json').read_text(encoding='utf-8'))['body']
body='''## Frozen 3.0 competition candidate — 2026-10-11

Runtime/lab freeze: **99660b36db9d5b1121eea6fe06b026c5f1e36bcf**. Delivery evidence: **07ba8d2074c08321295c818b09e4a86b95ddaed2**. No runtime policy changes for the held-out data. Retain original 2.0 and all earlier raw samples.

- [Competition prerelease and downloadable artifacts](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0-competition-candidate.1)
- [Frozen-source CI9/9](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38149463925)
- [Delivery CI9/9](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38150987570)
- [Full readiness report](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/07ba8d2074c08321295c818b09e4a86b95ddaed2/docs/3.0/FINAL_COMPETITION_READINESS.md)
- [Held-out raw64](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/07ba8d2074c08321295c818b09e4a86b95ddaed2/security-lab/evidence/2026-10-11T15-04-14-292Z/results.json)

**Observed held-out results:** author-known, post-policy-freeze12 new indirect texts and4 normal tasks, twice repeated,A/F,64 complete trials. Attack effects A4/24,F0/24; normal tasks A8/8,F8/8;0 run errors. F6/24 attack trials had actual rejection. Four counterpart synthetic credential-read effects were absent after deterministic credential denial. The remainder is not counted as active prevention. Fixed seed, authored fixtures, correlated repeats; not independent E4 or a population guarantee.

Original48 separated: direct admission A12/12,F0/12/active12/12; indirect README both0/4 with no dangerous attempts; normal8/8. Explicit tool requests are not Prompt Injection protection-rate evidence. New cohort had0 AI review calls and0 honeypot triggers, so independent AI/adaptive benefit remains NOT MEASURED.

Root301 passed,0 failed,4 platform skips; independent Python7; curated free package96 passed, audit0; fresh Chinese/space-path ZIP ci/build/self-test and125 manifest hashes matched. Standard schema37 vectors,64JSONL/chains,5 source/5 build digests and all metadata/observations agree. Do not add subset tests to root totals.

Chinese PDFs12/5/6pages rendered/checked; actual1920×1080 browser recording213seconds with Chinese captions, no audio. Operator-triggered DEMO and saved model results clearly separated; no fake live inference. Video hosted as Release asset rather than a large Git commit. Use curated Community ZIP; full auto-generated source archive and legacy npm/Docker are not the free competition distribution.

**READY_WITH_LIMITATIONS:** controlled SDK registered tools only; native Codex/Claude/Cursor/Cline global coverage NOT VERIFIED; E4 absent; non-cooperative started callbacks and old inode effects remain bounded limitations; public hostileTLS/DNS E2E not done; hash chain has no independent signature/time anchor; legacy ordinary npm/Docker commercial distribution P1 still OPEN. MIT unchanged, no main merge/stable npm/Docker/production data. This remains Draft and depends on PR23/base2.0 readiness branch.

<details><summary>Preserved earlier acceptance notes</summary>

'''+old+'\n\n</details>\n'
(dir/'pr-update.json').write_text(json.dumps({'body':body},ensure_ascii=False),encoding='utf-8')
