import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { AnalyzeButton, ProposalActions } from "./AgentClient";

export const dynamic = "force-dynamic";

export default async function Agent() {
  let user;
  try {
    user = await getSessionUser();
  } catch {
    user = null;
  }

  if (!user) {
    return (
      <main dir="rtl" style={{ fontFamily: "system-ui,sans-serif", maxWidth: 560, margin: "0 auto", padding: "64px 16px" }}>
        <h1 style={{ color: "#4136EC" }}>الوكيل الذاتي</h1>
        <p style={{ color: "#6b6a78" }}>سجّل دخولك لتشغيل الوكيل على متجرك.</p>
        <Link href="/login" style={{ color: "#4136EC" }}>سجّل دخول ←</Link>
      </main>
    );
  }

  const proposals = await prisma.agentProposal
    .findMany({ where: { storeId: user.storeId }, orderBy: { createdAt: "desc" }, take: 20 })
    .catch(() => []);

  const pending = proposals.filter((p) => p.status === "pending");
  const done = proposals.filter((p) => p.status !== "pending");

  const card: React.CSSProperties = { background: "#fff", border: "1px solid #e3ddf6", borderRadius: 16, padding: 18 };

  return (
    <main dir="rtl" style={{ fontFamily: "system-ui,sans-serif", maxWidth: 680, margin: "0 auto", padding: "36px 16px", minHeight: "100vh", background: "#f6f4fd" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ color: "#4136EC", margin: 0 }}>الوكيل الذاتي</h1>
          <p style={{ color: "#6b6a78", fontSize: 14, marginTop: 4, maxWidth: "48ch" }}>
            بيحلّل بيانات متجرك، يكتشف الفرص، ويقترح تحسينات — وأنت توافق أو ترفض.
          </p>
        </div>
        <AnalyzeButton />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
        {pending.length === 0 && done.length === 0 && (
          <div style={{ ...card, textAlign: "center", color: "#9690b5" }}>
            مفيش اقتراحات لسه — اضغط «حلّل متجري» عشان الوكيل يشتغل.
          </div>
        )}

        {pending.length > 0 && <div style={{ fontSize: 13, fontWeight: 700, color: "#9690b5" }}>بانتظار موافقتك ({pending.length})</div>}
        {pending.map((p) => (
          <div key={p.id} style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#4136EC", marginBottom: 6 }}>✦ اقتراح جديد</div>
            <div style={{ fontSize: 14, color: "#6b6a78", marginBottom: 6 }}>📊 {p.insight}</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{p.action}</div>
            <div style={{ fontSize: 13, color: "#1FA855", marginTop: 7, fontWeight: 600 }}>↗ {p.impact}</div>
            <ProposalActions id={p.id} />
          </div>
        ))}

        {done.length > 0 && <div style={{ fontSize: 13, fontWeight: 700, color: "#9690b5", marginTop: 6 }}>اتعامل معاها</div>}
        {done.map((p) => (
          <div key={p.id} style={{ ...card, opacity: 0.75 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: p.status === "executed" ? "#1FA855" : "#9690b5", marginBottom: 6 }}>
              {p.status === "executed" ? "✓ نُفّذ" : "✕ مرفوض"}
            </div>
            <div style={{ fontSize: 14, color: "#6b6a78", marginBottom: 6 }}>📊 {p.insight}</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{p.action}</div>
            {p.result && <div style={{ fontSize: 13, color: "#1FA855", marginTop: 7 }}>{p.result}</div>}
          </div>
        ))}
      </div>
    </main>
  );
}
