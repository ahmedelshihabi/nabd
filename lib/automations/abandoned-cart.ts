import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { buildEmailHtml } from "@/lib/tracking";

// ---- Pure core (testable without a DB) ----

export type CartTouch = { id: string; createdAt: Date };

// A cart counts as "abandoned" once it has sat untouched for at least
// `minAgeMin` minutes, but no older than `maxAgeHours` (don't chase stale carts).
export function isCartAbandoned(
  createdAt: Date,
  now: Date,
  opts: { minAgeMin?: number; maxAgeHours?: number } = {},
): boolean {
  const { minAgeMin = 60, maxAgeHours = 24 } = opts;
  const ageMs = now.getTime() - createdAt.getTime();
  return ageMs >= minAgeMin * 60_000 && ageMs <= maxAgeHours * 3_600_000;
}

export function selectAbandonedCarts(
  carts: CartTouch[],
  now: Date,
  opts?: { minAgeMin?: number; maxAgeHours?: number },
): CartTouch[] {
  return carts.filter((c) => isCartAbandoned(c.createdAt, now, opts));
}

// ---- Orchestration ----

const CART_CAMPAIGN_NAME = "استرجاع العربة المتروكة";
const REMINDER = {
  subject: "نسيت حاجة في عربتك؟ 🛒",
  body:
    "أهلاً،\n\nلاحظنا إنك سبت حاجات في عربتك — لسه محجوزة لك!\n\n" +
    "كمّل طلبك قبل ما تخلص الكمية.",
  cta: "كمّل طلبي",
};

// Reuse one durable campaign per store for this automation's messages, so the
// existing tracking + revenue + stats all apply to it with no special-casing.
async function cartCampaign(storeId: string): Promise<string> {
  const existing = await prisma.campaign.findFirst({
    where: { storeId, name: CART_CAMPAIGN_NAME },
  });
  if (existing) return existing.id;
  const created = await prisma.campaign.create({
    data: {
      storeId,
      name: CART_CAMPAIGN_NAME,
      goal: "استرجاع العربات المتروكة",
      channel: "email",
      status: "sending",
      subject: REMINDER.subject,
      body: REMINDER.body,
      cta: REMINDER.cta,
    },
  });
  return created.id;
}

export type CartRunSummary = { candidates: number; reminded: number; skipped: boolean };

// Finds abandoned carts and sends one reminder each — skipping carts that were
// already reminded or already converted to a purchase.
export async function processAbandonedCarts(storeId: string): Promise<CartRunSummary> {
  const automation = await prisma.automation.findFirst({
    where: { storeId, type: "abandoned_cart", enabled: true },
  });
  if (!automation) return { candidates: 0, reminded: 0, skipped: true };

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  const storeUrl = `https://${store?.domain ?? "example.com"}`;

  const since = new Date(Date.now() - 24 * 3_600_000);
  const cartEvents = await prisma.event.findMany({
    where: { storeId, type: "add_to_cart", createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error("Missing env APP_URL");

  let candidates = 0;
  let reminded = 0;

  for (const cart of cartEvents) {
    if (!isCartAbandoned(cart.createdAt, now)) continue;

    const data = (cart.data ?? {}) as { customer?: { id?: number } };
    const extId = data.customer?.id != null ? String(data.customer.id) : null;
    if (!extId) continue;

    const customer = await prisma.customer.findUnique({
      where: { storeId_externalId: { storeId, externalId: extId } },
    });
    if (!customer || !customer.consentEmail || !customer.email) continue;
    candidates++;

    // Already reminded for this exact cart?
    const already = await prisma.event.findFirst({
      where: { storeId, type: "cart_reminder_sent", customerId: customer.id },
    });
    if (already) continue;

    // Converted since the cart? Then don't nag.
    const purchased = await prisma.event.findFirst({
      where: {
        storeId,
        type: "purchase",
        customerId: customer.id,
        createdAt: { gte: cart.createdAt },
      },
    });
    if (purchased) continue;

    const campaignId = await cartCampaign(storeId);
    const message = await prisma.message.create({
      data: { campaignId, customerId: customer.id, channel: "email", status: "queued" },
    });

    try {
      const html = buildEmailHtml({
        appUrl,
        messageId: message.id,
        customerId: customer.id,
        body: REMINDER.body,
        ctaText: REMINDER.cta,
        ctaUrl: storeUrl,
      });
      await sendEmail({ to: customer.email, subject: REMINDER.subject, html });
      await prisma.message.update({
        where: { id: message.id },
        data: { status: "sent", sentAt: new Date() },
      });
      await prisma.event.create({
        data: { storeId, type: "cart_reminder_sent", customerId: customer.id },
      });
      reminded++;
    } catch {
      await prisma.message.update({ where: { id: message.id }, data: { status: "failed" } });
    }
  }

  return { candidates, reminded, skipped: false };
}
