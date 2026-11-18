import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { buildEmailHtml } from "@/lib/tracking";
import type { Campaign } from "@prisma/client";

export type SendSummary = { total: number; sent: number; failed: number };

// Dispatches a campaign to the right channel. Email + WhatsApp supported;
// SMS comes with the SMS provider integration.
export async function sendCampaign(campaignId: string): Promise<SendSummary> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error("campaign_not_found");

  await prisma.campaign.update({ where: { id: campaign.id }, data: { status: "sending" } });

  let summary: SendSummary;
  if (campaign.channel === "email") summary = await sendEmailCampaign(campaign);
  else if (campaign.channel === "whatsapp") summary = await sendWhatsAppCampaign(campaign);
  else throw new Error(`channel_not_supported_yet:${campaign.channel}`);

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: "sent", sentAt: new Date() },
  });
  return summary;
}

async function sendEmailCampaign(campaign: Campaign): Promise<SendSummary> {
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error("Missing env APP_URL");
  if (!campaign.subject || !campaign.body) throw new Error("campaign_missing_content");

  const store = await prisma.store.findUnique({ where: { id: campaign.storeId } });
  const storeUrl = `https://${store?.domain ?? "example.com"}`;

  const recipients = await prisma.customer.findMany({
    where: { storeId: campaign.storeId, consentEmail: true, email: { not: null } },
  });

  let sent = 0;
  let failed = 0;
  for (const customer of recipients) {
    const message = await prisma.message.create({
      data: { campaignId: campaign.id, customerId: customer.id, channel: "email", status: "queued" },
    });
    try {
      const html = buildEmailHtml({
        appUrl,
        messageId: message.id,
        customerId: customer.id,
        body: campaign.body,
        ctaText: campaign.cta ?? undefined,
        ctaUrl: storeUrl,
      });
      await sendEmail({ to: customer.email!, subject: campaign.subject, html });
      await prisma.message.update({ where: { id: message.id }, data: { status: "sent", sentAt: new Date() } });
      sent++;
    } catch {
      await prisma.message.update({ where: { id: message.id }, data: { status: "failed" } });
      failed++;
    }
  }
  return { total: recipients.length, sent, failed };
}

async function sendWhatsAppCampaign(campaign: Campaign): Promise<SendSummary> {
  if (!campaign.whatsappMsg) throw new Error("campaign_missing_whatsapp_message");

  const recipients = await prisma.customer.findMany({
    where: { storeId: campaign.storeId, consentWhatsapp: true, phone: { not: null } },
  });

  let sent = 0;
  let failed = 0;
  for (const customer of recipients) {
    const message = await prisma.message.create({
      data: { campaignId: campaign.id, customerId: customer.id, channel: "whatsapp", status: "queued" },
    });
    try {
      await sendWhatsAppText(customer.phone!, campaign.whatsappMsg);
      await prisma.message.update({ where: { id: message.id }, data: { status: "sent", sentAt: new Date() } });
      sent++;
    } catch {
      await prisma.message.update({ where: { id: message.id }, data: { status: "failed" } });
      failed++;
    }
  }
  return { total: recipients.length, sent, failed };
}
