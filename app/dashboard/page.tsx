import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { storeStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

function Empty({ note }: { note: string }) {
  return (
    <main dir="rtl" style={{ fontFamily: "system-ui,sans-serif", maxWidth: 560, margin: "0 auto", padding: "64px 16px" }}>
      <h1 style={{ color: "#4136EC" }}>لوحة النبض</h1>
      <p style={{ color: "#6b6a78", marginTop: 8 }}>{note}</p>
      <Link href="/connect" style={{ color: "#4136EC" }}>اربط متجرك للبدء ←</Link>
    </main>
  );
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store } = await searchParams;

  let storeId = store;
  let stats;
  try {
    if (!storeId) {
      const first = await prisma.store.findFirst({ orderBy: { createdAt: "asc" } });
      storeId = first?.id;
    }
    if (!storeId) return <Empty note="مفيش متجر مربوط لسه." />;
    stats = await storeStats(storeId);
  } catch {
    return <Empty note="قاعدة البيانات مش متصلة — شغّل DATABASE_URL و prisma migrate." />;
  }

  const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
  const statusLabel: Record<string, string> = {
    draft: "مسودة", scheduled: "مجدولة", sending: "بترسل", sent: "مكتملة", paused: "متوقفة",
  };

  const card: React.CSSProperties = {
    background: "#fff", border: "1px solid #e3ddf6", borderRadius: 16, padding: 16,
  };

  return (
    <main dir="rtl" style={{ fontFamily: "system-ui,sans-serif", maxWidth: 920, margin: "0 auto", padding: "32px 16px", background: "#f6f4fd", minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "#C4F030", color: "#17143A", display: "grid", placeItems: "center", fontWeight: 700 }}>ن</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: "#4136EC" }}>لوحة النبض</h1>
          <div style={{ fontSize: 13, color: "#6b6a78" }}>نظرة على أداء متجرك</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        <div style={card}>
          <div style={{ fontSize: 13, color: "#6b6a78" }}>الإيراد المنسوب</div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>{fmt(stats.revenue)} <span style={{ fontSize: 14 }}>ج.م</span></div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 13, color: "#6b6a78" }}>المشتركين</div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>{fmt(stats.subscribers)}</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 13, color: "#6b6a78" }}>الحملات</div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>{stats.campaigns.length}</div>
        </div>
      </div>

      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", fontWeight: 600, borderBottom: "1px solid #e3ddf6" }}>آخر الحملات</div>
        {stats.campaigns.length === 0 ? (
          <div style={{ padding: 24, color: "#9690b5", textAlign: "center" }}>مفيش حملات لسه.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ color: "#9690b5", fontSize: 12 }}>
                <th style={{ textAlign: "start", padding: "8px 16px" }}>الحملة</th>
                <th style={{ textAlign: "start", padding: "8px 16px" }}>مُرسَلة</th>
                <th style={{ textAlign: "start", padding: "8px 16px" }}>الإيراد</th>
                <th style={{ textAlign: "start", padding: "8px 16px" }}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {stats.campaigns.map((c) => (
                <tr key={c.id} style={{ borderTop: "1px solid #e3ddf6" }}>
                  <td style={{ padding: "11px 16px", fontWeight: 600 }}>
                    <Link href={`/campaigns/${c.id}`} style={{ color: "#17143a", textDecoration: "none" }}>{c.name}</Link>
                  </td>
                  <td style={{ padding: "11px 16px" }}>{fmt(c.sent)}</td>
                  <td style={{ padding: "11px 16px" }}>{fmt(c.revenue)} ج.م</td>
                  <td style={{ padding: "11px 16px" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#4136EC", background: "#e6e3fd", borderRadius: 999, padding: "3px 9px" }}>
                      {statusLabel[c.status] ?? c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
