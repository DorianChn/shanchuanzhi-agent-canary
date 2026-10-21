import assert from "node:assert/strict";
import test from "node:test";
import * as gatewayAdapter from "@dorianchn/agent-canary/gateway-adapter";

test("package-facing gateway adapter exposes only strict host composition", () => {
  assert.deepEqual(Object.keys(gatewayAdapter), [
    "createSecurityGatewayHostAdapter",
  ]);
  assert.equal(typeof gatewayAdapter.createSecurityGatewayHostAdapter, "function");
  assert.equal("createSecurityGatewayAdapter" in gatewayAdapter, false);
});

test("package export map does not expose the low-level implementation module", async () => {
  await assert.rejects(
    import("@dorianchn/agent-canary/execution-isolation/gateway-adapter/security-gateway-adapter.mjs"),
    { code: "ERR_PACKAGE_PATH_NOT_EXPORTED" },
  );
});
