"use client";

import { useState } from "react";
import Link from "next/link";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "invalid_credentials" ? "الإيميل أو كلمة السر غلط" : data.error);
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      setError("حصل خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir="rtl" style={{ fontFamily: "system-ui,sans-serif", maxWidth: 400, margin: "0 auto", padding: "48px 16px" }}>
      <h1 style={{ color: "#4136EC" }}>تسجيل الدخول</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" placeholder="your@email.com" style={inp} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" type="password" placeholder="كلمة السر" style={inp} />
        {error && <div style={{ color: "#c0392b", fontSize: 13 }}>{error}</div>}
        <button onClick={submit} disabled={loading} style={btn}>{loading ? "..." : "دخول"}</button>
      </div>
      <p style={{ fontSize: 13, marginTop: 16, color: "#6b6a78" }}>
        لسه مش عندك حساب؟ <Link href="/signup" style={{ color: "#4136EC" }}>أنشئ حساب</Link>
      </p>
    </main>
  );
}

const inp: React.CSSProperties = { border: "1px solid #e3ddf6", borderRadius: 12, padding: "11px 13px", fontSize: 14, background: "#fff" };
const btn: React.CSSProperties = { border: "none", borderRadius: 12, padding: 13, fontWeight: 600, color: "#fff", background: "linear-gradient(135deg,#4136EC,#9B6CFF)", cursor: "pointer" };
