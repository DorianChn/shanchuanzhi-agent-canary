import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decimalToMinorUnits,
  parseUniqueForm,
  validAlipayPayment,
  validEpayPayment,
  validVmqPayment,
  validWechatPayment,
} from "./payment-security.mjs";

const wechatOrder = {
  id: "order-wx-1", channel: "wechat", amount: 72, currency: "CNY", status: "pending", outTradeNo: "AC-WX-1",
};
const wechatTransaction = {
  appid: "synthetic-app", mchid: "synthetic-merchant", out_trade_no: "AC-WX-1",
  transaction_id: "synthetic-wechat-transaction", trade_state: "SUCCESS",
  amount: { total: 7200, currency: "CNY" },
};
const wechatMerchant = { appid: "synthetic-app", mchid: "synthetic-merchant" };

test("WeChat settlement binds signed merchant, app, order, state, currency, amount, and channel", () => {
  assert.equal(validWechatPayment(wechatOrder, wechatTransaction, wechatMerchant), true);
  for (const [field, value] of [
    ["appid", "other-app"], ["mchid", "other-merchant"], ["out_trade_no", "other-order"],
    ["trade_state", "NOTPAY"], ["transaction_id", ""],
  ]) {
    assert.equal(validWechatPayment(wechatOrder, { ...wechatTransaction, [field]: value }, wechatMerchant), false, field);
  }
  assert.equal(validWechatPayment(wechatOrder, { ...wechatTransaction, amount: { total: 7199, currency: "CNY" } }, wechatMerchant), false);
  assert.equal(validWechatPayment(wechatOrder, { ...wechatTransaction, amount: { total: 7200, currency: "USD" } }, wechatMerchant), false);
  assert.equal(validWechatPayment({ ...wechatOrder, channel: "alipay" }, wechatTransaction, wechatMerchant), false);
});

const alipayOrder = {
  id: "order-ali-1", channel: "alipay", amount: 72, currency: "CNY", status: "pending", outTradeNo: "AC-ALI-1",
};
const alipayForm = {
  app_id: "synthetic-app", seller_id: "synthetic-seller", out_trade_no: "AC-ALI-1",
  total_amount: "72.00", trade_no: "synthetic-alipay-transaction", trade_status: "TRADE_SUCCESS", sign_type: "RSA2",
};
const alipayMerchant = { appId: "synthetic-app", sellerId: "synthetic-seller" };

test("Alipay settlement binds signed app, seller, order, paid status, currency, and exact amount", () => {
  assert.equal(validAlipayPayment(alipayOrder, alipayForm, alipayMerchant), true);
  for (const [field, value] of [
    ["app_id", "other-app"], ["auth_app_id", "other-app"], ["seller_id", "other-seller"],
    ["out_trade_no", "other-order"], ["trade_status", "WAIT_BUYER_PAY"], ["trade_no", ""],
    ["total_amount", "71.99"], ["currency", "USD"], ["sign_type", "RSA"],
  ]) {
    assert.equal(validAlipayPayment(alipayOrder, { ...alipayForm, [field]: value }, alipayMerchant), false, field);
  }
  assert.equal(validAlipayPayment({ ...alipayOrder, channel: "wechat" }, alipayForm, alipayMerchant), false);
  assert.equal(validAlipayPayment(alipayOrder, alipayForm, { appId: "synthetic-app", sellerId: "" }), false);
});

test("Epay and VMQ callbacks bind the configured merchant, local order, channel, amount, and paid state", () => {
  const epayForm = {
    pid: "synthetic-pid", type: "alipay", out_trade_no: "AC-ALI-1", money: "72.00",
    trade_status: "TRADE_SUCCESS", trade_no: "synthetic-epay-transaction", currency: "CNY",
  };
  assert.equal(validEpayPayment(alipayOrder, epayForm, { pid: "synthetic-pid" }), true);
  for (const [field, value] of [
    ["pid", "other-pid"], ["type", "wxpay"], ["out_trade_no", "other-order"],
    ["money", "71.99"], ["trade_status", "WAIT_BUYER_PAY"], ["currency", "USD"],
  ]) {
    assert.equal(validEpayPayment(alipayOrder, { ...epayForm, [field]: value }, { pid: "synthetic-pid" }), false, field);
  }

  const vmqForm = {
    payId: "AC-ALI-1", param: "order-ali-1", type: "2", price: "72.00", reallyPrice: "72.00", currency: "CNY",
  };
  assert.equal(validVmqPayment(alipayOrder, vmqForm), true);
  for (const [field, value] of [
    ["payId", "other-order"], ["param", "other-id"], ["type", "1"],
    ["price", "71.99"], ["reallyPrice", "72.10"], ["currency", "USD"],
  ]) {
    assert.equal(validVmqPayment(alipayOrder, { ...vmqForm, [field]: value }), false, field);
  }
  assert.equal(validVmqPayment(alipayOrder, { ...vmqForm, reallyPrice: "72.09" }), true, "upstream nine-fen collision adjustment");
  assert.equal(validVmqPayment({ ...alipayOrder, status: "pending_manual" }, vmqForm), false);
});

test("decimal conversion rejects rounded, scientific, negative, and malformed amounts", () => {
  assert.equal(decimalToMinorUnits("72.00"), 7200);
  assert.equal(decimalToMinorUnits(1), 100);
  for (const value of ["72.001", "7.2e1", "-1", "01.00", "", "Infinity"]) {
    assert.equal(decimalToMinorUnits(value), null, String(value));
  }
});

test("callback form parser rejects ambiguous duplicate fields", () => {
  assert.equal(parseUniqueForm("a=1&b=2").b, "2");
  assert.throws(() => parseUniqueForm("out_trade_no=first&out_trade_no=second"), /duplicate/);
});
