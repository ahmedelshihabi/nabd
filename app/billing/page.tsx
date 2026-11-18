import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import SubscribeButton from "./SubscribeButton";

export const dynamic = "force-dynamic";

export default async function Billing() {
  let user;
  try {
    user = await getSessionUser();
  } catch {
    user = null;
  }

  if (!user) {
    return (
      <main dir="rtl" style={{ fontFamily: "system-ui,sans-serif", maxWidth: 520, margin: "0 auto", padding: "64px 16px" }}>
        <h1 style={{ color: "#4136EC" }}>الاشتراك</h1>
        <p style={{ color: "#6b6a78" }}>سجّل دخولك لإدارة اشتراكك.</p>
        <Link href="/login" style={{ color: "#4136EC" }}>سجّل دخول ←</Link>
      </main>
    );
  }

  const store = user.store;
  const isPaid = store.plan !== "free";

  const card: React.CSSProperties = { background: "#fff", border: "1px solid #e3ddf6", borderRadius: 16, padding: 20 };

  return (
    <main dir="rtl" style={{ fontFamily: "system-ui,sans-serif", maxWidth: 560, margin: "0 auto", padding: "40px 16px", minHeight: "100vh", background: "#f6f4fd" }}>
      <h1 style={{ color: "#4136EC" }}>الاشتراك</h1>
      <p style={{ color: "#6b6a78", fontSize: 14 }}>خطة متجر «{store.name}».</p>

      <div style={{ ...card, marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, color: "#6b6a78" }}>الخطة الحالية</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{isPaid ? "Growth" : "مجاني"}</div>
          {store.subscriptionStatus && (
            <div style={{ fontSize: 12, color: isPaid ? "#1FA855" : "#9690b5", marginTop: 4 }}>
              الحالة: {store.subscriptionStatus}
            </div>
          )}
        </div>
        {isPaid ? (
          <span style={{ fontSize: 13, color: "#1FA855", fontWeight: 600 }}>✓ مفعّلة</span>
        ) : (
          <SubscribeButton />
        )}
      </div>

      <div style={{ ...card, marginTop: 14 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>خطة Growth تشمل</div>
        <ul style={{ margin: 0, paddingInlineStart: 18, color: "#52525b", fontSize: 14, lineHeight: 1.9 }}>
          <li>حملات غير محدودة عبر الإيميل والواتساب والـ SMS</li>
          <li>الأتمتة (عربة متروكة + ترحيب)</li>
          <li>تحليلات الإيراد المنسوب</li>
        </ul>
      </div>
    </main>
  );
}
