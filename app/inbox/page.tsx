import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import InboxItem from "./InboxItem";

export const dynamic = "force-dynamic";

export default async function Inbox() {
  let user;
  try {
    user = await getSessionUser();
  } catch {
    user = null;
  }

  if (!user) {
    return (
      <main dir="rtl" style={{ fontFamily: "system-ui,sans-serif", maxWidth: 560, margin: "0 auto", padding: "64px 16px" }}>
        <h1 style={{ color: "#4136EC" }}>الصندوق الموحّد</h1>
        <p style={{ color: "#6b6a78" }}>سجّل دخولك لعرض رسائل عملائك.</p>
        <Link href="/login" style={{ color: "#4136EC" }}>سجّل دخول ←</Link>
      </main>
    );
  }

  const messages = await prisma.inboundMessage
    .findMany({ where: { storeId: user.storeId }, orderBy: { createdAt: "desc" }, take: 50 })
    .catch(() => []);

  return (
    <main dir="rtl" style={{ fontFamily: "system-ui,sans-serif", maxWidth: 680, margin: "0 auto", padding: "36px 16px", minHeight: "100vh", background: "#f6f4fd" }}>
      <h1 style={{ color: "#4136EC", margin: 0 }}>الصندوق الموحّد</h1>
      <p style={{ color: "#6b6a78", fontSize: 14, marginTop: 4 }}>
        كل رسائل عملائك من الإيميل والواتساب والـ SMS في مكان واحد — والوكيل يكتبلك الرد.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
        {messages.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #e3ddf6", borderRadius: 16, padding: 24, textAlign: "center", color: "#9690b5" }}>
            مفيش رسائل واردة لسه.
          </div>
        ) : (
          messages.map((m) => (
            <InboxItem key={m.id} id={m.id} channel={m.channel} from={m.fromAddr} body={m.body} handled={m.handled} />
          ))
        )}
      </div>
    </main>
  );
}
