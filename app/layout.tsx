import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nabd — وكيل التسويق الذكي",
  description: "منصة تسويق بالذكاء الاصطناعي لمتاجر التجارة الإلكترونية",
};

const linkStyle: React.CSSProperties = {
  color: "#4136EC",
  textDecoration: "none",
  fontSize: 14,
  fontWeight: 600,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, background: "#f6f4fd" }}>
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "12px 16px",
            background: "#fff",
            borderBottom: "1px solid #e3ddf6",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: "#C4F030", color: "#17143A", display: "grid", placeItems: "center", fontWeight: 700 }}>ن</span>
            <b style={{ color: "#4136EC", fontSize: 16 }}>Nabd</b>
          </Link>
          <div style={{ flex: 1 }} />
          <Link href="/" style={linkStyle}>الحملات</Link>
          <Link href="/dashboard" style={linkStyle}>لوحة النبض</Link>
          <Link href="/connect" style={linkStyle}>اربط متجرك</Link>
          <Link href="/login" style={{ ...linkStyle, color: "#6b6a78" }}>دخول</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
