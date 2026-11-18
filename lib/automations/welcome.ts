import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { buildEmailHtml } from "@/lib/tracking";

const WELCOME_CAMPAIGN_NAME = "ترحيب بالعميل الجديد";

// Sends a one-time welcome email to a newly-created customer, if the store has
// the welcome automation enabled and the customer opted in to email.
export async function sendWelcome(
  storeId: string,
  customerId: string,
): Promise<{ sent: boolean; reason?: string }> {
  const automation = await prisma.automation.findFirst({
    where: { storeId, type: "welcome", enabled: true },
  });
  if (!automation) return { sent: false, reason: "disabled" };

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer?.consentEmail || !customer.email) return { sent: false, reason: "no_consent" };

  const already = await prisma.event.findFirst({
    where: { storeId, type: "welcome_sent", customerId },
  });
  if (already) return { sent: false, reason: "already_sent" };

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error("Missing env APP_URL");

  const subject = `أهلاً بيك في ${store?.name ?? "متجرنا"}! 🎉`;
  const body =
    `أهلاً ${customer.firstName ?? ""}،\n\n` +
    "مبسوطين إنك معانا! اكتشف أحدث منتجاتنا، ولو احتجت أي حاجة إحنا هنا.";
  const cta = "اكتشف منتجاتنا";

  let campaign = await prisma.campaign.findFirst({
    where: { storeId, name: WELCOME_CAMPAIGN_NAME },
  });
  if (!campaign) {
    campaign = await prisma.campaign.create({
      data: {
        storeId,
        name: WELCOME_CAMPAIGN_NAME,
        goal: "ترحيب بالعملاء الجدد",
        channel: "email",
        status: "sending",
        subject,
        body,
        cta,
      },
    });
  }

  const message = await prisma.message.create({
    data: { campaignId: campaign.id, customerId, channel: "email", status: "queued" },
  });

  try {
    const html = buildEmailHtml({
      appUrl,
      messageId: message.id,
      customerId,
      body,
      ctaText: cta,
      ctaUrl: `https://${store?.domain ?? "example.com"}`,
    });
    await sendEmail({ to: customer.email, subject, html });
    await prisma.message.update({
      where: { id: message.id },
      data: { status: "sent", sentAt: new Date() },
    });
    await prisma.event.create({ data: { storeId, type: "welcome_sent", customerId } });
    return { sent: true };
  } catch {
    await prisma.message.update({ where: { id: message.id }, data: { status: "failed" } });
    return { sent: false, reason: "send_failed" };
  }
}
