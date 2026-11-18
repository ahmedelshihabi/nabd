"use client";

import { useState } from "react";

export default function SubscribeButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subscribe() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.message || data.error || "تعذّر بدء الاشتراك");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("حصل خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={subscribe}
        disabled={loading}
        style={{ border: "none", borderRadius: 12, padding: "12px 22px", fontWeight: 600, color: "#fff", background: "linear-gradient(135deg,#4136EC,#9B6CFF)", cursor: "pointer" }}
      >
        {loading ? "..." : "اشترك في Growth"}
      </button>
      {error && <div style={{ color: "#c0392b", fontSize: 13, marginTop: 8 }}>{error}</div>}
    </div>
  );
}
