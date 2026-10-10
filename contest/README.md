# 2026 Shanghai Open Source AI Tools Contest

- Project: Agent Canary 2.1.0, open source AI tools track.
- Source branch: [shanchuanzhi/v2-free-open-20261010](https://github.com/DorianChn/shanchuanzhi-agent-canary/tree/shanchuanzhi/v2-free-open-20261010); code commit: 69900c3.
- Project introduction: [Agent Canary 2.1.0 PDF](Agent-Canary-2026-Shanghai-Open-Source-AI-Tools-v2.1.0.pdf).
- Demo video: [Agent Canary 2.1.0 (60 seconds)](Agent-Canary-2.1.0-Demo-60s.mp4), H.264, 1280x720, 25 fps.
- The video explains the 2.1.0 containment and monitoring interfaces and includes a captured CLI token workflow from 2.0.0, which remains compatible. It does not claim a runtime demonstration of the new 2.1.0 behavior, a security certification, or a measured performance gain.
- The 2.1.0 TypeScript build and git diff --check passed on 2026-10-10. Automated regression tests and a performance benchmark were not run for this update.

Agent Canary uses inert MCP decoys, local canary-token scanning, guarded tool routing, and redacted audit events. Decoys return synthetic data only. Guard coverage applies only to calls routed through the integration; hosts must pass AbortSignal to cancellable downstream APIs for in-flight cancellation. The optional risk deny policy is off by default and uses coarse tool-name classification unless the host supplies its own classifier.
