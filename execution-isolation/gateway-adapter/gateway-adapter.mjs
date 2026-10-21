/* Generated from security-gateway-adapter.mjs; do not edit directly. */
import path from "node:path";

const toolIdPattern = /^[a-z0-9_.-]{1,100}$/;
const contextKeys = new Set(["signal", "fileReadCapability"]);
const callKeys = new Set(["name", "args", "traceId"]);
const argsKeys = new Set(["path"]);

function isPlainRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function readOwnDataEntries(value, label, allowedKeys) {
  if (!isPlainRecord(value)) {
    throw new TypeError("M2_SECURITY_GATEWAY_" + label + "_INVALID");
  }

  const ownKeys = Reflect.ownKeys(value);
  const enumerableKeys = Object.keys(value);
  if (ownKeys.length !== enumerableKeys.length) {
    throw new TypeError("M2_SECURITY_GATEWAY_" + label + "_INVALID");
  }

  return enumerableKeys.map((key) => {
    if (allowedKeys && !allowedKeys.has(key)) {
      throw new TypeError("M2_SECURITY_GATEWAY_" + label + "_INVALID");
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError("M2_SECURITY_GATEWAY_" + label + "_INVALID");
    }
    return [key, descriptor.value];
  });
}

function fixedRelativePath(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.includes("\0") ||
    value.includes("\\") ||
    value.includes(":") ||
    path.posix.isAbsolute(value) ||
    path.posix.normalize(value) !== value ||
    value.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new TypeError("M2_SECURITY_GATEWAY_FIXED_PATH_INVALID");
  }
  return value;
}

function isAbortSignal(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.aborted === "boolean" &&
    typeof value.addEventListener === "function" &&
    typeof value.removeEventListener === "function"
  );
}

function abortError() {
  const error = new Error("M2_SECURITY_GATEWAY_ABORTED");
  error.name = "AbortError";
  return error;
}

/**
 * Adapt M5's host-owned executeRealTool callback to M1's Gateway capability.
 *
 * fixedFileReads maps exact, lowercase M5 tool IDs to relative paths that the
 * trusted host also registered in GatewayOptions.files. The adapter asks M1
 * to bind an opaque capability to each exact tool/path pair, exposes M5's
 * resolver/verifier contract, and uses M1's capability-bound read method.
 *
 * It intentionally does not classify aliases or duplicate M5 policy. The
 * exact M2 allowlist prevents unregistered paths from reaching Gateway; M1
 * remains the final registered-resource and held-handle check.
 */
function createSecurityGatewayAdapter(gateway, fixedFileReads) {
  if (!isPlainRecord(gateway)) {
    throw new TypeError("M2_SECURITY_GATEWAY_HANDLE_INVALID");
  }
  const gatewayMethods = new Map();
  for (const name of [
    "bindFileReadCapability",
    "verifyFileReadCapability",
    "readFileWithCapability",
  ]) {
    const descriptor = Object.getOwnPropertyDescriptor(gateway, name);
    if (
      !descriptor ||
      !Object.hasOwn(descriptor, "value") ||
      typeof descriptor.value !== "function"
    ) {
      throw new TypeError("M2_SECURITY_GATEWAY_HANDLE_INVALID");
    }
    gatewayMethods.set(name, descriptor.value);
  }

  const toolEntries = readOwnDataEntries(
    fixedFileReads,
    "FIXED_FILE_READS",
    null,
  );
  if (toolEntries.length === 0) {
    throw new TypeError("M2_SECURITY_GATEWAY_FIXED_FILE_READS_EMPTY");
  }

  const policyTools = Object.create(null);
  const allowedPaths = new Map();
  const capabilities = new Map();
  for (const [toolId, paths] of toolEntries) {
    if (!toolIdPattern.test(toolId) || !Array.isArray(paths) || paths.length === 0) {
      throw new TypeError("M2_SECURITY_GATEWAY_FIXED_FILE_READ_INVALID");
    }

    const pathSet = new Set();
    const pathCapabilities = new Map();
    for (const candidate of paths) {
      const relativePath = fixedRelativePath(candidate);
      if (pathSet.has(relativePath)) {
        throw new TypeError("M2_SECURITY_GATEWAY_FIXED_FILE_READ_INVALID");
      }
      pathSet.add(relativePath);
      let capability;
      try {
        capability = Reflect.apply(
          gatewayMethods.get("bindFileReadCapability"),
          gateway,
          [{ toolName: toolId, operation: "file-read", path: relativePath, pathArg: "path" }],
        );
      } catch {
        throw new TypeError("M2_SECURITY_GATEWAY_CAPABILITY_UNAVAILABLE");
      }
      if (capability === null || typeof capability !== "object") {
        throw new TypeError("M2_SECURITY_GATEWAY_CAPABILITY_UNAVAILABLE");
      }
      pathCapabilities.set(relativePath, capability);
    }

    policyTools[toolId] = Object.freeze({
      operation: "file-read",
      pathArg: "path",
    });
    allowedPaths.set(toolId, pathSet);
    capabilities.set(toolId, pathCapabilities);
  }

  function parseBoundCall(call) {
    const callValues = new Map(
      readOwnDataEntries(call, "CALL", callKeys),
    );
    const toolId = callValues.get("name");
    const pathSet = allowedPaths.get(toolId);
    if (typeof toolId !== "string" || !pathSet) {
      throw new TypeError("M2_SECURITY_GATEWAY_TOOL_NOT_REGISTERED");
    }

    const argumentValues = new Map(
      readOwnDataEntries(callValues.get("args"), "ARGUMENTS", argsKeys),
    );
    if (
      argumentValues.size !== 1 ||
      typeof argumentValues.get("path") !== "string" ||
      !pathSet.has(argumentValues.get("path"))
    ) {
      throw new TypeError("M2_SECURITY_GATEWAY_PATH_NOT_REGISTERED");
    }

    const relativePath = argumentValues.get("path");
    return {
      toolId,
      call: Object.freeze({
        name: toolId,
        args: Object.freeze({ path: relativePath }),
      }),
      capability: capabilities.get(toolId).get(relativePath),
    };
  }

  const fileReadCapability = Object.freeze({
    resolve(call) {
      try {
        const bound = parseBoundCall(call);
        const valid = Reflect.apply(
          gatewayMethods.get("verifyFileReadCapability"),
          gateway,
          [bound.capability, bound.call, "file-read"],
        );
        return valid === true ? bound.capability : undefined;
      } catch {
        return undefined;
      }
    },
    verify(capability, call, operation) {
      if (operation !== "file-read") return false;
      try {
        const bound = parseBoundCall(call);
        if (capability !== bound.capability) return false;
        return Reflect.apply(
          gatewayMethods.get("verifyFileReadCapability"),
          gateway,
          [capability, bound.call, "file-read"],
        ) === true;
      } catch {
        return false;
      }
    },
  });

  const tools = Object.freeze(policyTools);
  const executeRealTool = async (call, context) => {
    const bound = parseBoundCall(call);
    const contextValues = new Map(
      readOwnDataEntries(context, "CONTEXT", contextKeys),
    );
    const signal = contextValues.get("signal");
    if (!isAbortSignal(signal)) {
      throw new TypeError("M2_SECURITY_GATEWAY_SIGNAL_INVALID");
    }
    if (signal.aborted) {
      throw abortError();
    }

    const capability = contextValues.get("fileReadCapability");
    if (
      capability === undefined ||
      capability !== bound.capability ||
      !fileReadCapability.verify(capability, bound.call, "file-read")
    ) {
      throw new TypeError("M2_SECURITY_GATEWAY_CAPABILITY_INVALID");
    }

    return Reflect.apply(
      gatewayMethods.get("readFileWithCapability"),
      gateway,
      [capability, bound.call, "file-read", signal],
    );
  };

  return Object.freeze({ tools, executeRealTool, fileReadCapability });
}

const hostAdapterOptionKeys = new Set([
  "gateway",
  "fixedFileReads",
  "createSecurityToolRouter",
  "routerOptions",
]);

/**
 * Compose the M2 fixed-read adapter with the host-supplied M5 policy router.
 *
 * This boundary accepts only OBSERVE plus verifyRealPaths:true and reserves
 * the router's tool map, callback, and M1 capability provider for the M2
 * adapter. M5 receives only capabilities issued and checked by M1 for the
 * exact registered tool/path pair. Missing, mismatched, or stale capabilities
 * remain denied before M1's file effect.
 */
export function createSecurityGatewayHostAdapter(options) {
  const inputValues = new Map(
    readOwnDataEntries(options, "HOST_ADAPTER_OPTIONS", hostAdapterOptionKeys),
  );
  if (
    inputValues.size !== hostAdapterOptionKeys.size ||
    typeof inputValues.get("createSecurityToolRouter") !== "function"
  ) {
    throw new TypeError("M2_SECURITY_GATEWAY_HOST_ADAPTER_OPTIONS_INVALID");
  }

  const routerOptionEntries = readOwnDataEntries(
    inputValues.get("routerOptions"),
    "HOST_ROUTER_OPTIONS",
    null,
  );
  const routerOptionValues = new Map(routerOptionEntries);
  if (
    routerOptionValues.get("mode") !== "OBSERVE" ||
    routerOptionValues.get("verifyRealPaths") !== true
  ) {
    throw new TypeError("M2_SECURITY_GATEWAY_STRICT_OBSERVE_REQUIRED");
  }
  if (routerOptionValues.has("tools") || routerOptionValues.has("executeRealTool")) {
    throw new TypeError("M2_SECURITY_GATEWAY_HOST_ROUTER_CALLBACKS_RESERVED");
  }
  if (routerOptionValues.has("fileReadCapability")) {
    throw new TypeError("M2_SECURITY_GATEWAY_HOST_ROUTER_CALLBACKS_RESERVED");
  }

  const adapter = createSecurityGatewayAdapter(
    inputValues.get("gateway"),
    inputValues.get("fixedFileReads"),
  );
  const wiredRouterOptions = Object.create(null);
  for (const [key, value] of routerOptionEntries) {
    wiredRouterOptions[key] = value;
  }
  wiredRouterOptions.tools = adapter.tools;
  wiredRouterOptions.executeRealTool = adapter.executeRealTool;
  wiredRouterOptions.fileReadCapability = adapter.fileReadCapability;

  const router = Reflect.apply(
    inputValues.get("createSecurityToolRouter"),
    undefined,
    [Object.freeze(wiredRouterOptions)],
  );
  if (!isPlainRecord(router)) {
    throw new TypeError("M2_SECURITY_GATEWAY_POLICY_ROUTER_INVALID");
  }
  const dispatch = Object.getOwnPropertyDescriptor(router, "dispatch")?.value;
  const pendingApprovals = Object.getOwnPropertyDescriptor(
    router,
    "pendingApprovals",
  )?.value;
  if (typeof dispatch !== "function" || typeof pendingApprovals !== "function") {
    throw new TypeError("M2_SECURITY_GATEWAY_POLICY_ROUTER_INVALID");
  }

  return Object.freeze({
    dispatch(call) {
      return Reflect.apply(dispatch, router, [call]);
    },
    pendingApprovals() {
      return Reflect.apply(pendingApprovals, router, []);
    },
  });
}
