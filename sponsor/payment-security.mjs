const ACTIVE_ORDER_STATES = new Set(["created", "pending", "paid"]);

function usableOrder(order, channel) {
  return Boolean(
    order &&
    ACTIVE_ORDER_STATES.has(order.status) &&
    order.channel === channel &&
    order.currency === "CNY" &&
    typeof order.outTradeNo === "string" &&
    order.outTradeNo.length > 0 &&
    Number.isSafeInteger(Math.round(Number(order.amount) * 100)) &&
    Number(order.amount) > 0
  );
}

export function decimalToMinorUnits(value) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value);
  if (!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const amount = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  return Number.isSafeInteger(amount) ? amount : null;
}

export function validWechatPayment(order, transaction, merchant) {
  if (!usableOrder(order, "wechat") || !transaction || !merchant?.mchid || !merchant?.appid) return false;
  return (
    transaction.mchid === merchant.mchid &&
    transaction.appid === merchant.appid &&
    transaction.out_trade_no === order.outTradeNo &&
    transaction.trade_state === "SUCCESS" &&
    typeof transaction.transaction_id === "string" && transaction.transaction_id.length > 0 &&
    transaction.amount?.currency === "CNY" &&
    Number.isSafeInteger(transaction.amount?.total) &&
    transaction.amount.total === decimalToMinorUnits(order.amount)
  );
}

export function validAlipayPayment(order, form, merchant) {
  if (!usableOrder(order, "alipay") || !form || !merchant?.appId || !merchant?.sellerId) return false;
  return (
    form.app_id === merchant.appId &&
    (form.auth_app_id === undefined || form.auth_app_id === merchant.appId) &&
    (form.currency === undefined || form.currency === "CNY") &&
    form.sign_type === "RSA2" &&
    form.seller_id === merchant.sellerId &&
    form.out_trade_no === order.outTradeNo &&
    (form.trade_status === "TRADE_SUCCESS" || form.trade_status === "TRADE_FINISHED") &&
    typeof form.trade_no === "string" && form.trade_no.length > 0 &&
    decimalToMinorUnits(form.total_amount) === decimalToMinorUnits(order.amount)
  );
}

export function validEpayPayment(order, form, merchant) {
  if (!form || !merchant?.pid) return false;
  const providerType = order?.channel === "alipay" ? "alipay" : order?.channel === "wechat" ? "wxpay" : "";
  return Boolean(
    providerType && usableOrder(order, order.channel) &&
    form.pid === merchant.pid &&
    form.type === providerType &&
    (form.currency === undefined || form.currency === "CNY") &&
    form.out_trade_no === order.outTradeNo &&
    form.trade_status === "TRADE_SUCCESS" &&
    typeof form.trade_no === "string" && form.trade_no.length > 0 &&
    decimalToMinorUnits(form.money) === decimalToMinorUnits(order.amount)
  );
}

export function validVmqPayment(order, form) {
  if (!form) return false;
  const expectedType = order?.channel === "alipay" ? "2" : order?.channel === "wechat" ? "1" : "";
  const expectedAmount = decimalToMinorUnits(order?.amount);
  const declaredAmount = decimalToMinorUnits(form.price);
  const collectedAmount = decimalToMinorUnits(form.reallyPrice);
  return Boolean(
    expectedType && usableOrder(order, order.channel) &&
    form.payId === order.outTradeNo &&
    form.param === order.id &&
    form.type === expectedType &&
    (form.currency === undefined || form.currency === "CNY") &&
    declaredAmount === expectedAmount &&
    collectedAmount !== null &&
    // Upstream VMQ can shift the actual amount by at most 9 fen to avoid collisions.
    Math.abs(collectedAmount - declaredAmount) <= 9
  );
}

export function parseUniqueForm(raw) {
  const params = new URLSearchParams(raw);
  const form = Object.create(null);
  for (const [key, value] of params) {
    if (Object.hasOwn(form, key)) throw new Error("duplicate callback form field");
    form[key] = value;
  }
  return form;
}
