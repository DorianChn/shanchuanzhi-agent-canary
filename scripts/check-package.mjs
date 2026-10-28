import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isPublicPackageFile,
  validateGatewayAdapterPackage,
} from "./package-file-policy.mjs";

const policyRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRootIndex = process.argv.indexOf("--package-root");
if (packageRootIndex !== -1 && (process.argv.indexOf("--package-root", packageRootIndex + 1) !== -1 || !process.argv[packageRootIndex + 1] || process.argv[packageRootIndex + 1].startsWith("--"))) {
  throw new Error("--package-root requires exactly one path");
}
const root = packageRootIndex === -1
  ? policyRoot
  : path.resolve(process.argv[packageRootIndex + 1]);
const npmCli = process.env.npm_execpath;
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "agent-canary-package-"));

function run(command, args, cwd = root) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runNpm(args, cwd = root) {
  // npm.cmd is a shell wrapper on Windows and cannot be passed to execFileSync
  // directly. npm exposes its own JS entrypoint while running package scripts.
  if (!npmCli) fail("npm_execpath is unavailable");
  return run(process.execPath, [npmCli, ...args], cwd);
}

function fail(message) {
  throw new Error(`package smoke check failed: ${message}`);
}

try {
  const pack = JSON.parse(runNpm(["pack", "--json", "--pack-destination", temp]))[0];
  if (!pack?.filename || !Array.isArray(pack.files)) fail("npm pack returned no file manifest");

  const files = pack.files.map((entry) => entry.path).sort();
  const packageManifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const required = ["LICENSE", "README.md", "README.zh-CN.md", "package.json", "dist/index.js", "dist/sdk.js", "dist/sdk.d.ts", "dist/runtime/gateway.d.ts"];
  for (const file of required) if (!files.includes(file)) fail(`missing required file ${file}`);

  try {
    validateGatewayAdapterPackage(packageManifest, files);
  } catch (error) {
    fail(error instanceof Error ? error.message : "invalid gateway adapter package boundary");
  }

  for (const file of files) {
    if (!isPublicPackageFile(file)) fail(`unexpected package file ${file}`);
    if (/(^|\/)(?:sponsor|test|src|docs|\.github)(\/|$)|(^|\/)\.env(?:\.|$)/i.test(file)) {
      fail(`sensitive or development path included: ${file}`);
    }
  }

  const packageFile = path.join(temp, pack.filename);
  const installDir = path.join(temp, "install");
  fs.mkdirSync(installDir);
  const packageSpec = `./${path.basename(packageFile)}`;
  runNpm(["install", "--prefix", installDir, "--ignore-scripts", "--no-audit", "--no-fund", packageSpec], temp);

  const installedPackageRoot = path.join(installDir, "node_modules", "@dorianchn", "agent-canary");
  if (!fs.existsSync(installedPackageRoot) || !fs.statSync(installedPackageRoot).isDirectory()) {
    fail("installed package root was not found");
  }
  const installedManifestPath = path.join(installedPackageRoot, "package.json");
  if (!fs.existsSync(installedManifestPath)) fail("installed package manifest was not found");
  const installedManifest = JSON.parse(fs.readFileSync(installedManifestPath, "utf8"));
  if (installedManifest.name !== packageManifest.name || installedManifest.version !== packageManifest.version) {
    fail("installed package identity does not match the packed package");
  }

  run(process.execPath, [path.join(policyRoot, 'scripts', 'check-sdk-types.mjs'), '--package-root', installedPackageRoot], installDir);

  const cli = path.join(installedPackageRoot, "dist", "index.js");
  if (!fs.existsSync(cli)) fail("installed CLI entrypoint was not found");
  const help = run(process.execPath, [cli, "--help"], installDir);
  if (!help.includes("self-test")) fail("installed CLI help does not include self-test");
  const selfTest = JSON.parse(run(process.execPath, [cli, "self-test", "--json"], installDir));
  if (selfTest.passed !== true) fail("installed CLI self-test did not pass");

  console.log(`package smoke check passed: ${pack.filename} (${files.length} files)`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
