import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";

const home = fs.mkdtempSync(path.join(os.tmpdir(), "agent-canary-scan-bench-"));
process.env.AGENT_CANARY_HOME = home;

try {
  const { generateTokens, scanFile } = await import("../dist/tokens.js");
  const [token] = generateTokens("synthetic-benchmark", 1);
  const sizes = [1, 10, 50].map((mib) => mib * 1024 * 1024);
  const report = [];

  for (const size of sizes) {
    const fixture = Buffer.alloc(size, 0x61);
    const tokenBytes = Buffer.from(token.token);
    tokenBytes.copy(fixture, size - tokenBytes.length);
    const file = path.join(home, `synthetic-${size}.bin`);
    fs.writeFileSync(file, fixture);

    const samplesMs = [];
    for (let sample = 0; sample < 3; sample++) {
      const start = performance.now();
      const hits = scanFile(file);
      const elapsed = performance.now() - start;
      if (hits.length !== 1 || hits[0].token !== token.token) {
        throw new Error(`scanner missed the synthetic token in ${size} bytes`);
      }
      samplesMs.push(elapsed);
    }
    samplesMs.sort((a, b) => a - b);
    const medianMs = samplesMs[1];
    report.push({
      bytes: size,
      samples: samplesMs.length,
      medianMs: Number(medianMs.toFixed(2)),
      medianMiBPerSecond: Number(((size / 1024 / 1024) / (medianMs / 1000)).toFixed(2)),
    });
  }

  console.log(JSON.stringify({
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    cpu: os.cpus()[0]?.model ?? "unknown",
    fixture: "synthetic binary files; token at final bytes; temporary directory only",
    report,
  }, null, 2));
} finally {
  fs.rmSync(home, { recursive: true, force: true });
}
