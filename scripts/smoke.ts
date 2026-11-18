/* Real tests of Nabd's own logic — no external API keys needed.
 * Run: npx tsx scripts/smoke.ts
 */
import crypto from "crypto";
import { extractJson, CampaignSchema } from "../lib/campaign";
import {
  isValidShopDomain,
  verifyOAuthHmac,
  verifyWebhookHmac,
} from "../lib/shopify";
import {
  unsubToken,
  verifyUnsub,
  clickSig,
  verifyClick,
} from "../lib/tokens";
import { pickAttributableMessage } from "../lib/attribution";
import { isCartAbandoned, selectAbandonedCarts } from "../lib/automations/abandoned-cart";

process.env.SHOPIFY_API_SECRET = "shpss_test_secret";
process.env.APP_SECRET = "test_app_secret";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}`);
  }
}

console.log("\n1) Shop domain validation");
check("accepts valid *.myshopify.com", isValidShopDomain("my-store.myshopify.com"));
check("rejects arbitrary domain", !isValidShopDomain("evil.com"));
check("rejects spoofed suffix", !isValidShopDomain("x.myshopify.com.evil.com"));

console.log("\n2) Tolerant JSON extraction from model replies");
check("parses a fenced block", (extractJson('```json\n{"a":1}\n```') as { a: number }).a === 1);
check("parses JSON amid prose", (extractJson('هنا الرد: {"a":2} شكراً') as { a: number }).a === 2);
check("parses a bare object", (extractJson('{"a":3}') as { a: number }).a === 3);

console.log("\n3) Campaign schema validation");
const sample = {
  lang: "ar",
  campaignName: "تشكيلة الشتاء",
  goal: "زيادة المبيعات",
  recommendedChannel: "whatsapp",
  channelReason: "أعلى نسبة فتح",
  segments: [{ name: "عملاء سابقون", criteria: "اشتروا", estimatedPct: 30, why: "ثقة" }],
  email: { subject: "s", preview: "p", body: "b", cta: "c" },
  whatsapp: { message: "hi" },
  sms: { message: "sms" },
  bestSendTime: "الخميس",
  performance: { expectedOpenRate: "50%", expectedConversion: "5%", note: "تقديري" },
  flow: { name: "عربة", steps: [{ when: "ساعة", channel: "whatsapp", action: "تذكير" }] },
};
check("accepts a valid campaign", CampaignSchema.safeParse(sample).success);
check(
  "rejects an invalid channel",
  !CampaignSchema.safeParse({ ...sample, recommendedChannel: "fax" }).success,
);
check(
  "rejects a non-numeric pct",
  !CampaignSchema.safeParse({
    ...sample,
    segments: [{ ...sample.segments[0], estimatedPct: "lots" }],
  }).success,
);

console.log("\n4) Shopify OAuth HMAC verification (security)");
const oauthParams = new URLSearchParams({ shop: "s.myshopify.com", code: "abc", state: "xyz" });
const oauthMsg = Array.from(oauthParams.entries())
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `${k}=${v}`)
  .join("&");
const goodHmac = crypto.createHmac("sha256", "shpss_test_secret").update(oauthMsg).digest("hex");
oauthParams.set("hmac", goodHmac);
check("accepts a correctly signed callback", verifyOAuthHmac(oauthParams));
const tampered = new URLSearchParams(oauthParams);
tampered.set("code", "tampered");
check("rejects a tampered callback", !verifyOAuthHmac(tampered));

console.log("\n5) Shopify webhook HMAC verification (security)");
const body = JSON.stringify({ id: 1, total_price: "100.00" });
const webhookHmac = crypto.createHmac("sha256", "shpss_test_secret").update(body, "utf8").digest("base64");
check("accepts a correctly signed webhook", verifyWebhookHmac(body, webhookHmac));
check("rejects a forged webhook", !verifyWebhookHmac(body + "x", webhookHmac));

console.log("\n6) Signed email links (unsubscribe + click)");
const custId = "cus_123";
const ut = unsubToken(custId);
check("accepts a valid unsubscribe token", verifyUnsub(custId, ut));
check("rejects unsubscribing another customer", !verifyUnsub("cus_999", ut));
const dest = "https://store.example.com/winter";
const cs = clickSig("msg_1", dest);
check("accepts a valid click signature", verifyClick("msg_1", dest, cs));
check("rejects a swapped redirect target", !verifyClick("msg_1", "https://evil.com", cs));

console.log("\n7) Revenue attribution rule");
const now = new Date("2026-02-10T12:00:00Z");
const d = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000);
check(
  "prefers the most recent clicked message",
  pickAttributableMessage(
    [
      { id: "a", clickedAt: d(5), openedAt: d(5) },
      { id: "b", clickedAt: d(1), openedAt: d(1) },
    ],
    now,
  ) === "b",
);
check(
  "falls back to opened when none clicked",
  pickAttributableMessage([{ id: "c", clickedAt: null, openedAt: d(2) }], now) === "c",
);
check(
  "ignores touches outside the 7-day window",
  pickAttributableMessage([{ id: "x", clickedAt: d(30), openedAt: d(30) }], now) === null,
);

console.log("\n8) Abandoned-cart selection");
const mins = (m: number) => new Date(now.getTime() - m * 60000);
check("a 90-min-old cart is abandoned", isCartAbandoned(mins(90), now));
check("a 10-min-old cart is NOT yet abandoned", !isCartAbandoned(mins(10), now));
check("a 2-day-old cart is too stale to chase", !isCartAbandoned(mins(60 * 48), now));
check(
  "selects only carts in the window",
  selectAbandonedCarts(
    [
      { id: "fresh", createdAt: mins(5) },
      { id: "ready", createdAt: mins(120) },
      { id: "stale", createdAt: mins(60 * 48) },
    ],
    now,
  )
    .map((c) => c.id)
    .join(",") === "ready",
);

console.log(`\n${failed === 0 ? "✅ ALL PASSED" : "❌ FAILURES"} — ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
