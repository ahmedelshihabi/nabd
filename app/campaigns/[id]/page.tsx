import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { campaignStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function CampaignDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let campaign;
  let stats;
  try {
    campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) {
      return <Shell><p style={{ color: "#6b6a78" }}>الحملة مش موجودة.</p></Shell>;
    }
    stats = await campaignStats(id);
  } catch {
    return <Shell><p style={{ color: "#6b6a78" }}>قاعدة البيانات مش متصلة.</p></Shell>;
  }

  const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
  const funnel = [
    { label: "أُرسلت", value: stats.sent },
    { label: "اتفتحت", value: stats.opened },
    { label: "اتضغطت", value: stats.clicked },
    { label: "اشترت", value: stats.purchased },
  ];
  const max = Math.max(stats.sent, 1);

  const kpi = (label: string, value: string) => (
    <div style={{ background: "#fff", border: "1px solid #e3ddf6", borderRadius: 16, padding: 16 }}>
      <div style={{ fontSize: 13, color: "#6b6a78" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );

  return (
    <Shell>
      <Link href="/dashboard" style={{ color: "#4136EC", fontSize: 13 }}>→ رجوع للوحة</Link>
      <h1 style={{ fontSize: 22, margin: "8px 0 2px" }}>{campaign.name}</h1>
      <p style={{ color: "#6b6a78", marginTop: 0, fontSize: 14 }}>{campaign.goal}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, margin: "16px 0 22px" }}>
        {kpi("الإيراد", `${fmt(stats.revenue)} ج.م`)}
        {kpi("نسبة الفتح", `${stats.openRate}%`)}
        {kpi("نسبة الضغط", `${stats.clickRate}%`)}
        {kpi("نسبة التحويل", `${stats.convRate}%`)}
      </div>

      <div style={{ background: "#fff", border: "1px solid #e3ddf6", borderRadius: 16, padding: 18 }}>
        <div style={{ fontWeight: 600, marginBottom: 14 }}>مسار التحويل</div>
        {funnel.map((f) => (
          <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 64, fontSize: 13, color: "#6b6a78" }}>{f.label}</div>
            <div style={{ flex: 1, height: 26, background: "#efebfb", borderRadius: 7, overflow: "hidden" }}>
              <div style={{ width: `${Math.max((f.value / max) * 100, 2)}%`, height: "100%", background: "linear-gradient(90deg,#4136EC,#9B6CFF)" }} />
            </div>
            <div style={{ width: 90, fontSize: 13, fontWeight: 600, textAlign: "start" }}>
              {fmt(f.value)} <span style={{ color: "#9690b5", fontWeight: 400 }}>{Math.round((f.value / max) * 100)}%</span>
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main dir="rtl" style={{ fontFamily: "system-ui,sans-serif", maxWidth: 720, margin: "0 auto", padding: "32px 16px", background: "#f6f4fd", minHeight: "100vh" }}>
      {children}
    </main>
  );
}
