import path from "node:path";

const toolIdPattern = /^[a-z0-9_.-]{1,100}$/;
const contextKeys = new Set(["signal"]);
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
 * trusted host also registered in GatewayOptions.files. The adapter exposes
 * file-read policy descriptors only and forwards an allowlisted path through
 * gateway.agent.dispatch({ name: "read_file", args: { path } }, signal).
 *
 * It intentionally does not classify aliases or duplicate M5 policy. The
 * exact M2 allowlist prevents unregistered paths from reaching Gateway; M1
 * remains the final registered-resource and held-handle check.
 */
export function createSecurityGatewayAdapter(gateway, fixedFileReads) {
  if (!isPlainRecord(gateway)) {
    throw new TypeError("M2_SECURITY_GATEWAY_HANDLE_INVALID");
  }
  const gatewayAgentDescriptor = Object.getOwnPropertyDescriptor(gateway, "agent");
  const gatewayAgent = gatewayAgentDescriptor?.value;
  if (!isPlainRecord(gatewayAgent)) {
    throw new TypeError("M2_SECURITY_GATEWAY_HANDLE_INVALID");
  }
  const dispatchDescriptor = Object.getOwnPropertyDescriptor(
    gatewayAgent,
    "dispatch",
  );
  if (
    !dispatchDescriptor ||
    !Object.hasOwn(dispatchDescriptor, "value") ||
    typeof dispatchDescriptor.value !== "function"
  ) {
    throw new TypeError("M2_SECURITY_GATEWAY_HANDLE_INVALID");
  }
  const gatewayDispatch = dispatchDescriptor.value;

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
  for (const [toolId, paths] of toolEntries) {
    if (!toolIdPattern.test(toolId) || !Array.isArray(paths) || paths.length === 0) {
      throw new TypeError("M2_SECURITY_GATEWAY_FIXED_FILE_READ_INVALID");
    }

    const pathSet = new Set();
    for (const candidate of paths) {
      const relativePath = fixedRelativePath(candidate);
      if (pathSet.has(relativePath)) {
        throw new TypeError("M2_SECURITY_GATEWAY_FIXED_FILE_READ_INVALID");
      }
      pathSet.add(relativePath);
    }

    policyTools[toolId] = Object.freeze({
      operation: "file-read",
      pathArg: "path",
    });
    allowedPaths.set(toolId, pathSet);
  }

  const tools = Object.freeze(policyTools);
  const executeRealTool = async (call, context) => {
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

    const gatewayCall = Object.freeze({
      name: "read_file",
      args: Object.freeze({ path: argumentValues.get("path") }),
    });
    return Reflect.apply(gatewayDispatch, gatewayAgent, [gatewayCall, signal]);
  };

  return Object.freeze({ tools, executeRealTool });
}
