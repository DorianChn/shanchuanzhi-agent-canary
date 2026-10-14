const toolIdPattern = /^[A-Za-z0-9_.:-]{1,100}$/;
const allowedRisks = new Set([
  "READ_ONLY",
  "WRITE",
  "EXECUTE",
  "NETWORK",
  "SENSITIVE_DATA",
  "DESTRUCTIVE",
]);
const metadataKeys = new Set(["approvalRequired", "risk"]);

function isPlainRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function readOwnDataEntries(value, label, allowedKeys) {
  if (!isPlainRecord(value)) {
    throw new TypeError("M2_GATEWAY_MCP_" + label + "_INVALID");
  }

  const ownKeys = Reflect.ownKeys(value);
  const enumerableKeys = Object.keys(value);
  if (ownKeys.length !== enumerableKeys.length) {
    throw new TypeError("M2_GATEWAY_MCP_" + label + "_INVALID");
  }

  return enumerableKeys.map((key) => {
    if (allowedKeys && !allowedKeys.has(key)) {
      throw new TypeError("M2_GATEWAY_MCP_" + label + "_INVALID");
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError("M2_GATEWAY_MCP_" + label + "_INVALID");
    }
    return [key, descriptor.value];
  });
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
  const error = new Error("M2_GATEWAY_MCP_ABORTED");
  error.name = "AbortError";
  return error;
}

/**
 * Build constructor-time GatewayOptions.mcpTools entries from host-fixed metadata.
 *
 * This binds the Gateway callback seam only. The injected backend must be a
 * host-owned isolation runner with a fixed per-tool resource map and must stop
 * its worker when the supplied signal aborts. This module does not launch an
 * AppContainer process or claim that such a backend is currently integrated.
 */
export function createGatewayMcpTools(fixedToolMetadata, backend) {
  const toolEntries = readOwnDataEntries(
    fixedToolMetadata,
    "REGISTRATIONS",
    null,
  );
  if (toolEntries.length === 0) {
    throw new TypeError("M2_GATEWAY_MCP_REGISTRATIONS_EMPTY");
  }

  if (!isPlainRecord(backend)) {
    throw new TypeError("M2_GATEWAY_MCP_BACKEND_INVALID");
  }
  const backendDescriptor = Object.getOwnPropertyDescriptor(
    backend,
    "executeIsolated",
  );
  if (
    !backendDescriptor ||
    !Object.hasOwn(backendDescriptor, "value") ||
    typeof backendDescriptor.value !== "function"
  ) {
    throw new TypeError("M2_GATEWAY_MCP_BACKEND_INVALID");
  }
  const executeIsolated = backendDescriptor.value;

  const registrations = Object.create(null);
  for (const [toolId, metadata] of toolEntries) {
    if (!toolIdPattern.test(toolId)) {
      throw new TypeError("M2_GATEWAY_MCP_TOOL_ID_INVALID");
    }

    const values = new Map(
      readOwnDataEntries(metadata, "METADATA", metadataKeys),
    );
    if (typeof values.get("approvalRequired") !== "boolean") {
      throw new TypeError("M2_GATEWAY_MCP_METADATA_INVALID");
    }
    const risk = values.get("risk");
    if (risk !== undefined && !allowedRisks.has(risk)) {
      throw new TypeError("M2_GATEWAY_MCP_METADATA_INVALID");
    }

    const descriptor = {
      approvalRequired: values.get("approvalRequired"),
      async execute(args, signal) {
        if (!isPlainRecord(args)) {
          throw new TypeError("M2_GATEWAY_MCP_ARGUMENTS_INVALID");
        }
        if (!isAbortSignal(signal)) {
          throw new TypeError("M2_GATEWAY_MCP_SIGNAL_INVALID");
        }
        if (signal.aborted) {
          throw abortError();
        }

        // Preserve object identity: M2 does not rewrite Gateway arguments or
        // replace/detach the Gateway-owned cancellation signal.
        return executeIsolated.call(backend, toolId, args, signal);
      },
    };
    if (risk !== undefined) {
      descriptor.risk = risk;
    }
    registrations[toolId] = Object.freeze(descriptor);
  }

  return Object.freeze(registrations);
}
