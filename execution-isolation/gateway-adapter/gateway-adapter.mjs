/**
 * Package-facing strict host-composition entry point.
 *
 * Keep the lower-level capability adapter private to the package export map.
 * The trusted host must provide the actual M5 router factory; this facade
 * exposes only the host-composition entry, which requires OBSERVE mode and
 * real-path verification in its router options.
 */
export { createSecurityGatewayHostAdapter } from "./security-gateway-adapter.mjs";
