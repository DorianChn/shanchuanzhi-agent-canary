const gatewayAdapterPath = "execution-isolation/gateway-adapter/";
const gatewayAdapterFacade = `${gatewayAdapterPath}gateway-adapter.mjs`;

export const reviewedGatewayAdapterPackageFiles = Object.freeze([
  gatewayAdapterFacade,
]);

const reviewedGatewayAdapterFileSet = new Set(reviewedGatewayAdapterPackageFiles);

export function isPublicPackageFile(file) {
  return (
    file === "LICENSE" ||
    file === "README.md" ||
    file === "README.zh-CN.md" ||
    file === "package.json" ||
    file.startsWith("dist/") ||
    reviewedGatewayAdapterFileSet.has(file)
  );
}

function exportTargets(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(exportTargets);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(exportTargets);
  }
  return [];
}

/**
 * Keep the M2 runtime files package-private except for the reviewed strict
 * host-composition facade. npm package exports are an import boundary, not a
 * filesystem security boundary.
 */
export function validateGatewayAdapterPackage(packageManifest, packedFiles) {
  const artifacts = packedFiles.filter((file) => file.startsWith(gatewayAdapterPath));
  const entry = packageManifest?.exports?.["./gateway-adapter"];

  if (entry === undefined) {
    if (artifacts.length !== 0) {
      throw new Error("gateway adapter runtime files require the reviewed export");
    }
    return;
  }

  if (entry !== `./${gatewayAdapterFacade}`) {
    throw new Error("gateway adapter export must target only the strict facade");
  }

  for (const file of reviewedGatewayAdapterPackageFiles) {
    if (!packedFiles.includes(file)) {
      throw new Error(`gateway adapter package is missing ${file}`);
    }
  }

  for (const file of artifacts) {
    if (!reviewedGatewayAdapterFileSet.has(file)) {
      throw new Error(`unexpected gateway adapter package file ${file}`);
    }
  }

  for (const [subpath, target] of Object.entries(packageManifest.exports ?? {})) {
    if (subpath === "./gateway-adapter") continue;
    if (exportTargets(target).some((value) => value.includes(gatewayAdapterPath))) {
      throw new Error(`gateway adapter internals exposed by package export ${subpath}`);
    }
  }
}
