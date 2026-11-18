import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { buildEmailHtml } from "@/lib/tracking";

export type SendSummary = { total: number; sent: number; failed: number };

// Sends an email campaign to every opted-in customer of its store, creating a
// tracked Message per recipient. Only the email channel is supported in v1.
export async function sendCampaign(campaignId: string): Promise<SendSummary> {
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error("Missing env APP_URL");

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error("campaign_not_found");
  if (campaign.channel !== "email") throw new Error("only_email_supported_in_v1");
  if (!campaign.subject || !campaign.body) throw new Error("campaign_missing_content");

  // Compliance: only customers who opted in to email, with an address.
  const recipients = await prisma.customer.findMany({
    where: { storeId: campaign.storeId, consentEmail: true, email: { not: null } },
  });

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: "sending" },
  });

  let sent = 0;
  let failed = 0;

  for (const customer of recipients) {
    const message = await prisma.message.create({
      data: {
        campaignId: campaign.id,
        customerId: customer.id,
        channel: "email",
        status: "queued",
      },
    });

    try {
      const html = buildEmailHtml({
        appUrl,
        messageId: message.id,
        customerId: customer.id,
        body: campaign.body,
        ctaText: campaign.cta ?? undefined,
        // TODO: real campaign landing URL; the store domain is a sensible default.
        ctaUrl: `https://${(await storeDomain(campaign.storeId)) ?? "example.com"}`,
      });

      await sendEmail({ to: customer.email!, subject: campaign.subject, html });
      await prisma.message.update({
        where: { id: message.id },
        data: { status: "sent", sentAt: new Date() },
      });
      sent++;
    } catch {
      await prisma.message.update({
        where: { id: message.id },
        data: { status: "failed" },
      });
      failed++;
    }
  }

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: "sent", sentAt: new Date() },
  });

  return { total: recipients.length, sent, failed };
}

async function storeDomain(storeId: string): Promise<string | null> {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  return store?.domain ?? null;
}
