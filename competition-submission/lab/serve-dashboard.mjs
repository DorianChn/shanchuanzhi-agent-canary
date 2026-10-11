#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pagePath = path.resolve(here, "../evidence/index.html");
const port = Number(process.env.AGENT_CANARY_DASHBOARD_PORT || 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid dashboard port.");
if (!fs.existsSync(pagePath)) throw new Error("Build the report data and dashboard first.");

const server = http.createServer((req, res) => {
  if (!new Set(["GET", "HEAD"]).has(req.method) || !new Set(["/", "/index.html"]).has(new URL(req.url || "/", "http://127.0.0.1").pathname)) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  });
  if (req.method === "HEAD") res.end();
  else fs.createReadStream(pagePath).pipe(res);
});
server.listen(port, "127.0.0.1", () => console.log(`Dashboard available at http://127.0.0.1:${port}/ (loopback only; Ctrl+C to stop)`));
