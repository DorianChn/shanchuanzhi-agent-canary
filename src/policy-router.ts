/**
 * Stable M5-owned package entry point for the canonical security router.
 * Keep the implementation in its owner-maintained module; this file only
 * publishes that API without claiming the shared `./sdk` entry point.
 */
export {
  createSecurityToolRouter,
  type SecurityRouterOptions,
  type SecurityDecision,
  type SecurityAction,
} from './security-router.js';
export type { RiskPolicyExecutionContext, TrustedFileReadCapabilityProvider } from './risk-policy.js';
export {
  createGatewayFileReadCapabilityProvider,
  type GatewayFileReadCapabilityAPI,
  type GatewayFileReadCapabilityBinding,
  type GatewayFileReadCapabilityProvider,
} from './risk-policy.js';
