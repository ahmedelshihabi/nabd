import crypto from "crypto";

// Signs short payloads so links we embed in emails cannot be forged:
// unsubscribe links (can't unsubscribe someone else) and click links
// (can't turn our domain into an open redirect to an arbitrary site).

function secret(): string {
  const s = process.env.APP_SECRET;
  if (!s) throw new Error("Missing env APP_SECRET");
  return s;
}

export function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex").slice(0, 32);
}

export function verify(payload: string, sig: string): boolean {
  const expected = sign(payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Unsubscribe token bound to a customer.
export function unsubToken(customerId: string): string {
  return sign(`unsub:${customerId}`);
}
export function verifyUnsub(customerId: string, token: string): boolean {
  return verify(`unsub:${customerId}`, token);
}

// Signature binding a click to a specific message + destination URL.
export function clickSig(messageId: string, url: string): string {
  return sign(`click:${messageId}:${url}`);
}
export function verifyClick(messageId: string, url: string, sig: string): boolean {
  return verify(`click:${messageId}:${url}`, sig);
}
