import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const { fireAlerts, logEvent, readEvents, safeDisplayText, sanitizeEvent, sendAlertTest } = await import("../src/alerts.js");

function unsafeEvent() {
  return {
    ts: "2026-09-21T00:00:00.000Z",
    kind: "decoy_called" as const,
    tool: "canary_read_secrets",
    token: "cnry_secret_value_must_not_leave_registry",
    args: { apiKey: "live-key", destination: "https://example.test/?token=leak" },
    metadata: { apiKey: "live-key", source: "test", detail: "token=leak" },
  };
}

test("audit log omits raw arguments and redacts canary and secret values", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "agent-canary-alerts-"));
  const eventsFile = path.join(home, "events.jsonl");
  try {
    logEvent(unsafeEvent(), eventsFile);
    const [event] = readEvents(eventsFile);
    assert.equal(event.args, undefined);
    assert.equal(event.token, "[CANARY_REDACTED]");
    assert.equal(event.metadata?.apiKey, "[REDACTED]");
    assert.equal(event.metadata?.detail, "token=[REDACTED]");
    assert.equal(JSON.stringify(event).includes("live-key"), false);
    assert.equal(JSON.stringify(event).includes("cnry_secret_value"), false);

    // Existing installations can have a pre-1.2.2 line. Reading it must not
    // re-expose data through `events`, reports, dashboards, or exports.
    fs.writeFileSync(eventsFile, JSON.stringify(unsafeEvent()) + "\n");
    const [legacyEvent] = readEvents(eventsFile);
    assert.equal(legacyEvent.args, undefined);
    assert.equal(legacyEvent.token, "[CANARY_REDACTED]");
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("audit fields cannot inject terminal control sequences or forged log lines", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "agent-canary-log-injection-"));
  const eventsFile = path.join(home, "events.jsonl");
  try {
    logEvent({
      ts: "2026-09-21T00:00:00.000Z",
      kind: "session_tripped",
      reason: "synthetic\nforged event\u001b[2J",
      metadata: { acknowledgedBy: "operator\r\nforged" },
    }, eventsFile);

    const rawLines = fs.readFileSync(eventsFile, "utf8").trimEnd().split("\n");
    const [event] = readEvents(eventsFile);
    assert.equal(rawLines.length, 1);
    assert.ok(!/[\u0000-\u001f\u007f-\u009f]/.test(event.reason ?? ""));
    assert.ok(!/[\u0000-\u001f\u007f-\u009f]/.test(String(event.metadata?.acknowledgedBy ?? "")));
    assert.match(event.reason ?? "", /forged event/);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("legacy event headers and CLI display values cannot inject terminal controls", () => {
  const poisoned = sanitizeEvent({
    ts: "2026-09-21\u001b[2J\nforged",
    kind: "action_blocked\u001b[31m" as never,
    eventType: "\nforged-event" as never,
    riskLevel: "SECRET\u001b[0m" as never,
    reason: "token=cnry_attacker\r\nforged",
  });

  assert.equal(poisoned.kind, "test");
  assert.equal(poisoned.eventType, "test");
  assert.ok(!/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/.test(poisoned.ts));
  assert.equal(safeDisplayText("label\u001b[2J\nforged token=cnry_attacker"), "label [2J forged token=[REDACTED]");
});

test("new audit logs are owner-readable on POSIX systems", { skip: process.platform === "win32" }, () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "agent-canary-log-permissions-"));
  const eventsFile = path.join(home, "events.jsonl");
  try {
    logEvent({ ts: new Date().toISOString(), kind: "test" }, eventsFile);
    assert.equal(fs.statSync(eventsFile).mode & 0o777, 0o600);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("webhook receives the same sanitized event shape", async () => {
  let resolveEvent: ((value: unknown) => void) | undefined;
  const received = new Promise<unknown>((resolve) => {
    resolveEvent = resolve;
  });
  const server = http.createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      resolveEvent?.(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      response.writeHead(204).end();
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    fireAlerts(unsafeEvent(), { webhook: `http://127.0.0.1:${address.port}`, notify: false, eventsFile: "unused" });
    const event = (await Promise.race([
      received,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("webhook was not received")), 1500)),
    ])) as Record<string, unknown>;
    assert.equal("args" in event, false);
    assert.equal(event.token, "[CANARY_REDACTED]");
    assert.equal((event.metadata as Record<string, unknown>).apiKey, "[REDACTED]");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
function makeEventLogPath(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "agent-canary-alert-test-"));
  return path.join(directory, "events.jsonl");
}

test("sendAlertTest reports event log success and webhook success without desktop notification", async () => {
  const eventsFile = makeEventLogPath();
  const originalFetch = globalThis.fetch;
  let requestBody = "";
  globalThis.fetch = (async (_input, init) => {
    requestBody = String(init?.body ?? "");
    return new Response(null, { status: 204 });
  }) as typeof fetch;

  try {
    const status = await sendAlertTest(
      { ts: "2026-09-21T00:00:00.000Z", kind: "test", note: "manual test" },
      { webhook: "https://hooks.example.test/alert", notify: false, eventsFile }
    );
    assert.deepEqual(status, {
      eventLog: "success",
      desktop: "disabled",
      webhook: "success",
    });
    assert.match(requestBody, /manual test/);
    assert.equal(fs.readFileSync(eventsFile, "utf8").split("\n").filter(Boolean).length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("sendAlertTest reports webhook failures and does not throw", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error("simulated network failure");
  }) as typeof fetch;

  try {
    const status = await sendAlertTest(
      { ts: "2026-09-21T00:00:00.000Z", kind: "test" },
      { webhook: "https://hooks.example.test/alert", notify: false, eventsFile: makeEventLogPath() }
    );
    assert.equal(status.webhook, "failed");
    assert.equal(status.eventLog, "success");
    assert.equal(status.desktop, "disabled");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("sendAlertTest sanitizes its webhook payload", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody = "";
  globalThis.fetch = (async (_input, init) => {
    requestBody = String(init?.body ?? "");
    return new Response(null, { status: 204 });
  }) as typeof fetch;

  try {
    const status = await sendAlertTest(unsafeEvent(), {
      webhook: "https://hooks.example.test/alert",
      notify: false,
      eventsFile: makeEventLogPath(),
    });
    assert.equal(status.webhook, "success");
    assert.equal(requestBody.includes("live-key"), false);
    assert.equal(requestBody.includes("cnry_secret_value"), false);
    assert.equal(requestBody.includes('"args"'), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("sendAlertTest reports an unconfigured webhook and event-log failure", async () => {
  const eventsDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "agent-canary-alert-log-"));
  const status = await sendAlertTest(
    { ts: "2026-09-21T00:00:00.000Z", kind: "test" },
    { webhook: null, notify: false, eventsFile: eventsDirectory }
  );

  assert.deepEqual(status, {
    eventLog: "failure",
    desktop: "disabled",
    webhook: "not configured",
  });
  fs.rmSync(eventsDirectory, { recursive: true, force: true });
});

test("webhook delivery does not follow redirects to a second destination", async () => {
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
    const status = await sendAlertTest(
      { ts: new Date().toISOString(), kind: "test" },
      {
        webhook: `http://127.0.0.1:${redirectorAddress.port}/redirect`,
        notify: false,
        eventsFile: makeEventLogPath(),
      }
    );
    assert.equal(status.webhook, "failed");
    assert.equal(redirectedRequests, 0);
  } finally {
    await Promise.all(
      [redirector, destination].map((server) => new Promise<void>((resolve) => server.close(() => resolve())))
    );
  }
});
