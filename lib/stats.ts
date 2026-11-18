import { prisma } from "@/lib/prisma";

export type CampaignStats = {
  sent: number;
  opened: number;
  clicked: number;
  purchased: number;
  revenue: number;
  openRate: number;
  clickRate: number;
  convRate: number;
};

function rate(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}

// Funnel + revenue for one campaign, computed from its Message rows.
export async function campaignStats(campaignId: string): Promise<CampaignStats> {
  const [sent, opened, clicked, purchased, revenueAgg] = await Promise.all([
    prisma.message.count({ where: { campaignId, sentAt: { not: null } } }),
    prisma.message.count({ where: { campaignId, openedAt: { not: null } } }),
    prisma.message.count({ where: { campaignId, clickedAt: { not: null } } }),
    prisma.message.count({ where: { campaignId, revenue: { gt: 0 } } }),
    prisma.message.aggregate({ where: { campaignId }, _sum: { revenue: true } }),
  ]);

  return {
    sent,
    opened,
    clicked,
    purchased,
    revenue: revenueAgg._sum.revenue ?? 0,
    openRate: rate(opened, sent),
    clickRate: rate(clicked, opened),
    convRate: rate(purchased, sent),
  };
}

export type StoreStats = {
  subscribers: number;
  revenue: number;
  campaigns: { id: string; name: string; status: string; revenue: number; sent: number }[];
};

// Store-level overview for the dashboard.
export async function storeStats(storeId: string): Promise<StoreStats> {
  const [subscribers, campaigns] = await Promise.all([
    prisma.customer.count({ where: { storeId, consentEmail: true } }),
    prisma.campaign.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, name: true, status: true },
    }),
  ]);

  let revenue = 0;
  const rows = [];
  for (const c of campaigns) {
    const agg = await prisma.message.aggregate({
      where: { campaignId: c.id },
      _sum: { revenue: true },
      _count: { _all: true },
    });
    const r = agg._sum.revenue ?? 0;
    revenue += r;
    rows.push({ ...c, revenue: r, sent: agg._count._all });
  }

  return { subscribers, revenue, campaigns: rows };
}
