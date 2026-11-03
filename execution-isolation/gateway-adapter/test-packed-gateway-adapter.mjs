import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const packageRoot = fileURLToPath(new URL("../../", import.meta.url));
const bundleCheck = path.join(
  packageRoot,
  "execution-isolation",
  "gateway-adapter",
  "bundle-gateway-adapter.mjs",
);

test("packed package cannot load the low-level gateway bypass by file path", async () => {
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "ac3-m2-packed-gateway-"),
  );

  try {
    execFileSync(process.execPath, [bundleCheck, "--check"], {
      cwd: packageRoot,
      stdio: "pipe",
      windowsHide: true,
    });

    const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
    const packed = execFileSync(
      npmCommand,
      [
        "pack",
        "--ignore-scripts",
        "--json",
        "--pack-destination",
        temporaryRoot,
      ],
      {
        cwd: packageRoot,
        encoding: "utf8",
        shell: process.platform === "win32",
        windowsHide: true,
      },
    );
    const metadata = JSON.parse(packed)[0];
    assert.ok(
      !metadata.files.some((entry) =>
        entry.path.endsWith("/security-gateway-adapter.mjs"),
      ),
    );
    const adapterEntries = metadata.files
      .map((entry) => entry.path)
      .filter((entry) => entry.startsWith("execution-isolation/gateway-adapter/"));
    assert.deepEqual(adapterEntries, [
      "execution-isolation/gateway-adapter/gateway-adapter.mjs",
    ]);

    const archiveEntries = execFileSync("tar", ["-tzf", metadata.filename], {
      cwd: temporaryRoot,
      encoding: "utf8",
      windowsHide: true,
    })
      .split(/\r?\n/u)
      .filter(Boolean);
    assert.ok(
      !archiveEntries.some((entry) =>
        entry.endsWith("/security-gateway-adapter.mjs"),
      ),
    );
    assert.ok(
      archiveEntries.includes(
        "package/execution-isolation/gateway-adapter/gateway-adapter.mjs",
      ),
    );
    assert.ok(
      !archiveEntries.includes(
        "package/execution-isolation/gateway-adapter/security-gateway-adapter.mjs",
      ),
    );

    const extractionRoot = path.join(temporaryRoot, "extracted");
    await mkdir(extractionRoot, { recursive: true });
    execFileSync("tar", ["-xzf", metadata.filename, "-C", "extracted"], {
      cwd: temporaryRoot,
      windowsHide: true,
    });

    const packageDirectory = path.join(extractionRoot, "package");
    const smokePath = path.join(packageDirectory, "__m2_package_boundary_smoke__.mjs");
    await writeFile(
      smokePath,
      `import assert from "node:assert/strict";
import * as facade from "@dorianchn/agent-canary/gateway-adapter";

assert.deepEqual(Object.keys(facade), ["createSecurityGatewayHostAdapter"]);
await assert.rejects(
  import("@dorianchn/agent-canary/execution-isolation/gateway-adapter/security-gateway-adapter.mjs"),
  { code: "ERR_PACKAGE_PATH_NOT_EXPORTED" },
);
await assert.rejects(
  import(new URL("./execution-isolation/gateway-adapter/security-gateway-adapter.mjs", import.meta.url).href),
  { code: "ERR_MODULE_NOT_FOUND" },
);
`,
      "utf8",
    );
    execFileSync(process.execPath, [smokePath], {
      cwd: packageDirectory,
      stdio: "pipe",
      windowsHide: true,
    });
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
