import assert from "node:assert/strict";
import test from "node:test";
import * as gatewayAdapter from "./gateway-adapter.mjs";

test("package-facing gateway adapter exposes only strict host composition", () => {
  assert.deepEqual(Object.keys(gatewayAdapter), [
    "createSecurityGatewayHostAdapter",
  ]);
  assert.equal(typeof gatewayAdapter.createSecurityGatewayHostAdapter, "function");
  assert.equal("createSecurityGatewayAdapter" in gatewayAdapter, false);
});
