import assert from "node:assert/strict";
import test from "node:test";
import { createSecurityGatewayAdapter } from "./security-gateway-adapter.mjs";

function setup() {
  const calls = [];
  const gateway = Object.freeze({
    agent: Object.freeze({
      dispatch(call, signal) {
        calls.push({ call, signal });
        return Promise.resolve({ content: "synthetic public fixture" });
      },
    }),
  });
  const adapter = createSecurityGatewayAdapter(gateway, {
    read_public: ["public/readable.txt"],
  });
  return { adapter, calls };
}

test("fixed read forwards a plain path string and the host AbortSignal to M1", async () => {
  const { adapter, calls } = setup();
  const signal = new AbortController().signal;
  const result = await adapter.executeRealTool(
    { name: "read_public", args: { path: "public/readable.txt" } },
    { signal },
  );

  assert.deepEqual(result, { content: "synthetic public fixture" });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].call, {
    name: "read_file",
    args: { path: "public/readable.txt" },
  });
  assert.equal(typeof calls[0].call.args.path, "string");
  assert.equal(calls[0].signal, signal);
  assert.deepEqual(Object.keys(adapter).sort(), ["executeRealTool", "tools"]);
});

test("unregistered paths, tools, and model-controlled fields fail before M1 dispatch", async () => {
  const { adapter, calls } = setup();
  const signal = new AbortController().signal;
  const rejected = [
    {
      call: { name: "read_public", args: { path: "public/../secrets/key.txt" } },
      error: "M2_SECURITY_GATEWAY_PATH_NOT_REGISTERED",
    },
    {
      call: { name: "read_public", args: { path: "public/linked/readable.txt" } },
      error: "M2_SECURITY_GATEWAY_PATH_NOT_REGISTERED",
    },
    {
      call: { name: "unknown", args: { path: "public/readable.txt" } },
      error: "M2_SECURITY_GATEWAY_TOOL_NOT_REGISTERED",
    },
    {
      call: {
        name: "read_public",
        args: { path: "public/readable.txt", write: true },
      },
      error: "M2_SECURITY_GATEWAY_ARGUMENTS_INVALID",
    },
  ];

  for (const item of rejected) {
    await assert.rejects(
      adapter.executeRealTool(item.call, { signal }),
      (error) => error.message === item.error,
    );
    assert.equal(calls.length, 0);
  }
});

test("an aborted signal fails closed before M1 dispatch", async () => {
  const { adapter, calls } = setup();
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    adapter.executeRealTool(
      { name: "read_public", args: { path: "public/readable.txt" } },
      { signal: controller.signal },
    ),
    (error) => error.name === "AbortError",
  );
  assert.equal(calls.length, 0);
});
