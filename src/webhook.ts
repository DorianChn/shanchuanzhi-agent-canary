import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const DNS_TIMEOUT_MS = 1500;
const REQUEST_TIMEOUT_MS = 3000;

export type ResolvedAddress = { address: string; family: number };
export type WebhookResolver = (hostname: string) => Promise<ResolvedAddress[]>;

/**
 * Validate a webhook destination without making a network request.
 * HTTPS is required for remote destinations; HTTP is limited to loopback
 * development endpoints.
 */
export function validateWebhookUrl(input: string): string {
  const value = input.trim();
  if (!value) throw new Error("Webhook URL must not be empty; use null to clear it.");

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Webhook URL must be a valid URL.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("Webhook URL must not include username or password credentials.");
  }
  if (parsed.hash) throw new Error("Webhook URL must not include a fragment.");

  if (parsed.protocol === "https:") return value;

  const hostname = normalizeHost(parsed.hostname);
  if (parsed.protocol === "http:" && LOOPBACK_HOSTS.has(hostname)) return value;

  throw new Error("Webhook URL must use https; http is allowed only for localhost or loopback development.");
}

/** Resolve once, reject private/mixed answers, and pin the returned addresses to the socket. */
export async function resolveWebhookTargets(input: string, resolver: WebhookResolver = resolveAll): Promise<ResolvedAddress[]> {
  const value = validateWebhookUrl(input);
  const url = new URL(value);
  const hostname = normalizeHost(url.hostname);
  const ipFamily = net.isIP(hostname);
  const addresses = ipFamily
    ? [{ address: hostname, family: ipFamily }]
    : await withTimeout(resolver(hostname), DNS_TIMEOUT_MS);

  if (!addresses.length) throw new Error("Webhook host did not resolve.");
  const isLoopbackDevelopment = url.protocol === "http:" && LOOPBACK_HOSTS.has(hostname);
  if (isLoopbackDevelopment) {
    if (addresses.some(({ address }) => !isLoopback(address))) {
      throw new Error("Loopback webhook host resolved outside loopback.");
    }
  } else if (addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error("Webhook host resolved to a non-public address.");
  }
  return addresses;
}

/** POST a JSON alert without redirects and with DNS resolution pinned to the checked addresses. */
export async function postJsonWebhook(
  input: string,
  payload: unknown,
  resolver: WebhookResolver = resolveAll,
): Promise<boolean> {
  try {
    const target = new URL(validateWebhookUrl(input));
    const addresses = await resolveWebhookTargets(input, resolver);
    const selected = addresses[0];
    const body = Buffer.from(JSON.stringify(payload), "utf8");
    const pinnedLookup = ((hostname: string, options: unknown, callback: (...args: unknown[]) => void) => {
      if (normalizeHost(hostname) !== normalizeHost(target.hostname)) {
        callback(new Error("unexpected webhook lookup host"));
        return;
      }
      if (typeof options === "object" && options !== null && "all" in options && options.all) {
        callback(null, addresses);
      } else {
        callback(null, selected.address, selected.family);
      }
    }) as typeof dns.lookup;
    const transport = target.protocol === "https:" ? https : http;

    return await new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (result: boolean) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };
      const request = transport.request(target, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": String(body.byteLength),
        },
        lookup: pinnedLookup,
      }, (response) => {
        const ok = (response.statusCode ?? 0) >= 200 && (response.statusCode ?? 0) < 300;
        // The response body is irrelevant. Do not accept a redirect or retain
        // attacker-controlled response bytes.
        response.destroy();
        finish(ok);
      });
      request.setTimeout(REQUEST_TIMEOUT_MS, () => request.destroy(new Error("webhook request timed out")));
      request.once("error", () => finish(false));
      request.end(body);
    });
  } catch {
    // Alerts are best-effort and must never interrupt containment.
    return false;
  }
}

async function resolveAll(hostname: string): Promise<ResolvedAddress[]> {
  return await new Promise((resolve, reject) => {
    dns.lookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
      if (error) reject(error);
      else resolve(addresses);
    });
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("webhook DNS lookup timed out")), timeoutMs);
        timer.unref();
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/%25/g, "%");
}

function isLoopback(address: string): boolean {
  const host = normalizeHost(address).split("%")[0];
  if (net.isIPv4(host)) return host === "127.0.0.1";
  if (!net.isIPv6(host)) return false;
  return parseIPv6(host) === 1n;
}

function isPublicAddress(address: string): boolean {
  const host = normalizeHost(address).split("%")[0];
  const family = net.isIP(host);
  if (family === 4) return isPublicIPv4(host);
  if (family !== 6) return false;

  const value = parseIPv6(host);
  if (value === null) return false;
  const prefix = (bits: number) => value >> BigInt(128 - bits);
  // IPv4-mapped IPv6 addresses inherit the embedded IPv4 classification.
  if (prefix(96) === 0xffffn) {
    const v4 = Number(value & 0xffffffffn);
    return isPublicIPv4(`${v4 >>> 24}.${(v4 >>> 16) & 255}.${(v4 >>> 8) & 255}.${v4 & 255}`);
  }
  // Permit only global unicast (2000::/3); then exclude special-purpose
  // transition, documentation, and protocol-assignment ranges.
  if (prefix(3) !== 1n) return false;
  if (matchesIPv6Prefix(value, "2001:db8::", 32)) return false; // documentation
  if (matchesIPv6Prefix(value, "2002::", 16)) return false; // 6to4 embeds arbitrary IPv4
  if (matchesIPv6Prefix(value, "2001::", 23)) return false; // IETF protocol assignments
  if (matchesIPv6Prefix(value, "2001:10::", 28) || matchesIPv6Prefix(value, "2001:20::", 28)) return false; // ORCHID
  if (matchesIPv6Prefix(value, "64:ff9b::", 96) || matchesIPv6Prefix(value, "64:ff9b:1::", 48)) return false; // NAT64
  return true;
}

function isPublicIPv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b, c] = octets;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && (b === 0 || b === 168 || (b === 88 && c === 99))) return false;
  if (a === 192 && b === 0 && c === 2) return false;
  if (a === 198 && (b === 18 || b === 19 || b === 51)) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  if (a === 255) return false;
  return true;
}

function parseIPv6(address: string): bigint | null {
  let value = address.toLowerCase();
  if (value.includes("%")) return null;
  const ipv4 = value.match(/(?:^|:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (ipv4) {
    const parts = ipv4[1].split(".").map(Number);
    if (parts.some((part) => part < 0 || part > 255)) return null;
    const high = ((parts[0] << 8) | parts[1]).toString(16);
    const low = ((parts[2] << 8) | parts[3]).toString(16);
    value = value.slice(0, ipv4.index) + high + ":" + low;
  }
  const halves = value.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) return null;
  const groups = [...left, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...right];
  if (groups.length !== 8 || groups.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return null;
  return groups.reduce((current, part) => (current << 16n) | BigInt(`0x${part}`), 0n);
}

function matchesIPv6Prefix(value: bigint, baseAddress: string, bits: number): boolean {
  const base = parseIPv6(baseAddress);
  if (base === null) return false;
  const shift = BigInt(128 - bits);
  return (value >> shift) === (base >> shift);
}
