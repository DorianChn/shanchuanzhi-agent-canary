import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

const { validateWebhookUrl, resolveWebhookTargets, postJsonWebhook } = await import("../src/webhook.js");

test("validateWebhookUrl trims and accepts HTTPS destinations", () => {
  assert.equal(validateWebhookUrl("  https://hooks.example.test/agent  "), "https://hooks.example.test/agent");
});

test("validateWebhookUrl permits loopback HTTP development endpoints", () => {
  assert.equal(validateWebhookUrl("http://localhost:8787/hook"), "http://localhost:8787/hook");
  assert.equal(validateWebhookUrl("http://127.0.0.1:8787/hook"), "http://127.0.0.1:8787/hook");
  assert.equal(validateWebhookUrl("http://[::1]:8787/hook"), "http://[::1]:8787/hook");
});

test("validateWebhookUrl rejects unsafe schemes and remote HTTP", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/plain,alert(1)",
    "file:///tmp/webhook",
    "http://example.test/hook",
    "http://127.0.0.2/hook",
    "https://user:password@example.test/hook",
    "https://example.test/hook#fragment",
    "not a URL",
    "",
  ]) {
    assert.throws(() => validateWebhookUrl(value), /Webhook URL/);
  }
});

test("webhook DNS validation rejects private, special, and mixed answers", async () => {
  for (const address of [
    "10.0.0.2", "100.64.0.1", "127.0.0.1", "169.254.1.1", "172.20.1.2",
    "192.168.1.2", "192.0.2.1", "198.51.100.4", "203.0.113.5", "224.0.0.1",
    "::1", "::ffff:127.0.0.1", "fc00::1", "fe80::1", "2001:db8::1", "2002:0808:0808::1",
  ]) {
    await assert.rejects(
      resolveWebhookTargets("https://hooks.example.test/alert", async () => [{ address, family: address.includes(":") ? 6 : 4 }]),
      /non-public/
    );
  }

  await assert.rejects(
    resolveWebhookTargets("https://hooks.example.test/alert", async () => [
      { address: "8.8.8.8", family: 4 },
      { address: "10.0.0.1", family: 4 },
    ]),
    /non-public/
  );
  assert.deepEqual(
    await resolveWebhookTargets("https://hooks.example.test/alert", async () => [{ address: "2606:4700:4700::1111", family: 6 }]),
    [{ address: "2606:4700:4700::1111", family: 6 }]
  );
});

test("webhook connects to a checked loopback address and does not follow redirects", async () => {
  let redirectedRequests = 0;
  const destination = http.createServer((_request, response) => {
    redirectedRequests++;
    response.writeHead(204).end();
  });
  await new Promise<void>((resolve) => destination.listen(0, "127.0.0.1", resolve));
  const destinationAddress = destination.address();
  assert.ok(destinationAddress && typeof destinationAddress !== "string");

  const redirector = http.createServer((_request, response) => {
    response.writeHead(302, { Location: `http://127.0.0.1:${destinationAddress.port}/redirected` }).end();
  });
  await new Promise<void>((resolve) => redirector.listen(0, "127.0.0.1", resolve));
  const redirectorAddress = redirector.address();
  assert.ok(redirectorAddress && typeof redirectorAddress !== "string");
  try {
    const result = await postJsonWebhook(`http://127.0.0.1:${redirectorAddress.port}/hook`, { kind: "test" });
    assert.equal(result, false);
    assert.equal(redirectedRequests, 0);
  } finally {
    await Promise.all([redirector, destination].map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
  }
});

test("webhook resolves once and pins the checked address for the complete request", async () => {
  let received = 0;
  const destination = http.createServer((_request, response) => {
    received++;
    response.writeHead(204).end();
  });
  await new Promise<void>((resolve) => destination.listen(0, "127.0.0.1", resolve));
  const address = destination.address();
  assert.ok(address && typeof address !== "string");
  let resolutions = 0;
  try {
    const result = await postJsonWebhook(
      `http://localhost:${address.port}/hook`,
      { kind: "dns-pin-test" },
      async () => {
        resolutions++;
        return resolutions === 1
          ? [{ address: "127.0.0.1", family: 4 }]
          : [{ address: "192.168.1.10", family: 4 }];
      },
    );
    assert.equal(result, true);
    assert.equal(resolutions, 1, "the request must not re-resolve after validation");
    assert.equal(received, 1);
  } finally {
    await new Promise<void>((resolve) => destination.close(() => resolve()));
  }
});
