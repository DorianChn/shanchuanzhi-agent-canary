import { readFile, writeFile } from "node:fs/promises";

const sourceUrl = new URL("./security-gateway-adapter.mjs", import.meta.url);
const bundleUrl = new URL("./gateway-adapter.mjs", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
const exportMarker = "export function createSecurityGatewayAdapter(";
const matches = source.split(exportMarker).length - 1;

if (matches !== 1) {
  throw new Error("M2_GATEWAY_ADAPTER_BUNDLE_SOURCE_SHAPE_INVALID");
}

const expected =
  "/* Generated from security-gateway-adapter.mjs; do not edit directly. */\n" +
  source.replace(exportMarker, "function createSecurityGatewayAdapter(");

if (process.argv.includes("--check")) {
  const current = await readFile(bundleUrl, "utf8");
  if (current !== expected) {
    throw new Error("M2_GATEWAY_ADAPTER_BUNDLE_OUT_OF_DATE");
  }
} else {
  await writeFile(bundleUrl, expected, "utf8");
}
