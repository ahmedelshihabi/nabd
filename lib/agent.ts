import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { anthropic, CAMPAIGN_MODEL } from "@/lib/anthropic";
import { extractJson } from "@/lib/campaign";

export const ProposalSchema = z.object({
  insight: z.string(),
  action: z.string(),
  impact: z.string(),
});
export const ProposalsSchema = z.array(ProposalSchema);

// Gathers the store's recent performance into a compact set of numbers the
// agent reasons over.
export async function gatherSignals(storeId: string) {
  const [subscribers, emailConsent, waConsent, smsConsent, msgAgg, carts, reminders] =
    await Promise.all([
      prisma.customer.count({ where: { storeId } }),
      prisma.customer.count({ where: { storeId, consentEmail: true } }),
      prisma.customer.count({ where: { storeId, consentWhatsapp: true } }),
      prisma.customer.count({ where: { storeId, consentSms: true } }),
      prisma.message.aggregate({
        where: { campaign: { storeId } },
        _count: { _all: true },
        _sum: { revenue: true },
      }),
      prisma.event.count({ where: { storeId, type: "add_to_cart" } }),
      prisma.event.count({ where: { storeId, type: "cart_reminder_sent" } }),
    ]);

  const [opened, clicked] = await Promise.all([
    prisma.message.count({ where: { campaign: { storeId }, openedAt: { not: null } } }),
    prisma.message.count({ where: { campaign: { storeId }, clickedAt: { not: null } } }),
  ]);

  const sent = msgAgg._count._all;
  const pct = (p: number, w: number) => (w > 0 ? Math.round((p / w) * 1000) / 10 : 0);

  return {
    subscribers,
    consent: { email: emailConsent, whatsapp: waConsent, sms: smsConsent },
    messagesSent: sent,
    openRate: pct(opened, sent),
    clickRate: pct(clicked, opened),
    attributedRevenue: msgAgg._sum.revenue ?? 0,
    abandonedCarts: carts,
    cartRemindersSent: reminders,
  };
}

function buildPrompt(signals: unknown): string {
  return (
    "أنت وكيل تسويق ذكي ومحلّل بيانات لمتجر تجارة إلكترونية.\n" +
    "دي بيانات أداء المتجر:\n" +
    JSON.stringify(signals, null, 2) +
    "\n\nحلّل الأرقام واقترح من 2 لـ 3 تحسينات عملية وملموسة تزوّد الإيراد أو التفاعل.\n" +
    "لكل اقتراح: إيه اللي لاحظته في الأرقام، إيه اللي تقترح تعمله، والأثر المتوقّع.\n" +
    'رُدّ بـ JSON array فقط: [{"insight":"...","action":"...","impact":"..."}]'
  );
}

// Asks Claude to turn the signals into concrete proposals and stores them.
export async function analyzeStore(storeId: string) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("missing_api_key");

  const signals = await gatherSignals(storeId);
  const msg = await anthropic.messages.create({
    model: CAMPAIGN_MODEL,
    max_tokens: 1500,
    messages: [{ role: "user", content: buildPrompt(signals) }],
  });
  const text = msg.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("");

  const parsed = ProposalsSchema.safeParse(extractJson(text));
  if (!parsed.success) throw new Error("invalid_proposals");

  const created = await prisma.$transaction(
    parsed.data.slice(0, 3).map((p) =>
      prisma.agentProposal.create({
        data: { storeId, insight: p.insight, action: p.action, impact: p.impact },
      }),
    ),
  );
  return created;
}
