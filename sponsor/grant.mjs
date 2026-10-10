#!/usr/bin/env node
/**
 * 人工确认工具（零成本收款模式配套）。
 *
 * 用法（在 sponsor/ 目录下）：
 *   node grant.mjs pending                 列出待确认的付款登记
 *   node grant.mjs grant <handle> [月数]   为该 GitHub 用户名/邮箱开通个人版（默认 1 个月=30 天，可叠加）
 *
 * 流程：付款人在赞助页登记 → 你在微信/支付宝账单里看到钱到账 → node grant.mjs grant xxx
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { readJsonFile, withFileLock, writeJsonFile } from "./state-store.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ORDERS_FILE = path.join(__dirname, "orders.json");
const SUBS_FILE = path.join(__dirname, "subscribers.json");
const ACTIVATIONS_FILE = path.join(__dirname, "activations.json");
const STATE_LOCK_FILE = path.join(__dirname, ".sponsor-state.lock");

function readMap(file) {
  const value = readJsonFile(file, {});
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`业务状态必须是 JSON 对象：${path.basename(file)}；未修改任何数据。`);
  }
  return Object.assign(Object.create(null), value);
}

function validateRecords(orders, subscribers, activations) {
  for (const subscription of Object.values(subscribers)) {
    if (typeof subscription !== "object" || subscription === null || Array.isArray(subscription) ||
      typeof subscription.expiresAt !== "string" || !Number.isFinite(Date.parse(subscription.expiresAt)) ||
      (subscription.lastOrderId !== undefined && typeof subscription.lastOrderId !== "string")) {
      throw new Error(`订阅状态损坏：${path.basename(SUBS_FILE)}；未修改任何数据。`);
    }
  }
  for (const activation of Object.values(activations)) {
    if (typeof activation !== "object" || activation === null || Array.isArray(activation) ||
      typeof activation.machines !== "object" || activation.machines === null || Array.isArray(activation.machines) ||
      Object.entries(activation.machines).some(([machine, timestamp]) =>
        !/^[0-9a-f]{64}$/.test(machine) || !Number.isSafeInteger(timestamp) || timestamp < 0)) {
      throw new Error(`激活状态损坏：${path.basename(ACTIVATIONS_FILE)}；未修改任何数据。`);
    }
  }
  for (const order of Object.values(orders)) {
    if (typeof order !== "object" || order === null || Array.isArray(order)) {
      throw new Error(`订单状态损坏：${path.basename(ORDERS_FILE)}；未修改任何数据。`);
    }
  }
}

function withStateLock(operation) {
  return withFileLock(STATE_LOCK_FILE, () => {
    const orders = readMap(ORDERS_FILE);
    const subscribers = readMap(SUBS_FILE);
    const activations = readMap(ACTIVATIONS_FILE);
    validateRecords(orders, subscribers, activations);
    return operation(orders, subscribers);
  });
}

function main() {
  const [cmd, arg, monthsArg] = process.argv.slice(2);

  if (cmd === "pending") {
    const orders = withStateLock((currentOrders) => Object.values(currentOrders)
      .filter((o) => o?.status === "pending_manual")
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
    if (orders.length === 0) {
      console.log("没有待确认的登记。");
      return;
    }
    for (const o of orders) {
      console.log(
        `${o.createdAt}  ${o.id.slice(0, 8)}  ${o.channel.padEnd(7)} ¥${String(o.amount).padEnd(6)} plan=${o.plan ?? "-"}  handle=${o.handle ?? "-"}  note=${o.note ?? ""}`
      );
    }
    return;
  }

  if (cmd === "grant") {
    const handle = String(arg || "").trim();
    const months = monthsArg === undefined ? 1 : Number(monthsArg);
    if (!handle) {
      console.log("用法: node grant.mjs grant <GitHub用户名或邮箱> [月数]");
      process.exit(1);
    }
    if (!Number.isInteger(months) || months < 1 || months > 120) {
      console.error("月数必须是 1 到 120 之间的整数；未修改任何数据。");
      process.exit(1);
    }
    const result = withStateLock((orders, subs) => {
      const matching = Object.values(orders).filter((o) =>
        o?.status === "pending_manual" && (o.handle === handle || (typeof o.note === "string" && o.note.includes(handle)))
      );
      const orderIds = matching.map((order) => String(order.id)).sort();
      // Derive an idempotency key from pending order IDs so retrying after a
      // crash between subscription and order writes does not extend twice.
      const grantId = orderIds.length ? `manual:${orderIds.join(",")}` : `manual:${randomUUID()}`;
      const existing = subs[handle];
      const now = Date.now();
      const current = existing?.expiresAt ? Date.parse(existing.expiresAt) : 0;
      if (existing?.lastOrderId !== grantId) {
        const expiresAt = new Date(Math.max(now, Number.isFinite(current) ? current : 0) + months * 30 * 864e5).toISOString();
        Object.defineProperty(subs, handle, {
          value: { handle, expiresAt, lastOrderId: grantId, updatedAt: new Date(now).toISOString() },
          enumerable: true, configurable: true, writable: true,
        });
        writeJsonFile(SUBS_FILE, subs);
      }
      const confirmedAt = new Date().toISOString();
      for (const order of matching) {
        order.status = "confirmed_manual";
        order.confirmedAt = confirmedAt;
      }
      if (matching.length) writeJsonFile(ORDERS_FILE, orders);
      return { expiresAt: subs[handle].expiresAt, confirmed: matching.length };
    });

    console.log(`✓ ${handle} 个人版已开通，有效期至 ${result.expiresAt}` + (result.confirmed ? `（已确认 ${result.confirmed} 条待审登记）` : ""));
    return;
  }

  console.log("用法:\n  node grant.mjs pending                 列出待确认登记\n  node grant.mjs grant <handle> [月数]   开通/延长个人版");
}

main();
