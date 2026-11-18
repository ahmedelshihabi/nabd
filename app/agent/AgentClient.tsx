"use client";

import { useState } from "react";

export function AnalyzeButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/analyze", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.message === "missing_api_key"
            ? "محتاج ANTHROPIC_API_KEY لتشغيل الوكيل."
            : data.message || data.error || "تعذّر التحليل",
        );
        return;
      }
      location.reload();
    } catch {
      setError("حصل خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={run}
        disabled={loading}
        style={{ border: "none", borderRadius: 12, padding: "11px 20px", fontWeight: 600, color: "#fff", background: "linear-gradient(135deg,#4136EC,#9B6CFF)", cursor: "pointer" }}
      >
        {loading ? "الوكيل بيحلّل…" : "✦ حلّل متجري"}
      </button>
      {error && <div style={{ color: "#c0392b", fontSize: 13, marginTop: 8 }}>{error}</div>}
    </div>
  );
}

export function ProposalActions({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);

  async function act(action: "approve" | "reject") {
    setBusy(true);
    try {
      await fetch(`/api/agent/proposals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
      <button onClick={() => act("approve")} disabled={busy} style={{ border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 600, color: "#fff", background: "#4136EC", cursor: "pointer" }}>موافقة وتنفيذ</button>
      <button onClick={() => act("reject")} disabled={busy} style={{ border: "1px solid #e3ddf6", borderRadius: 10, padding: "8px 16px", color: "#6b6a78", background: "#fff", cursor: "pointer" }}>تجاهل</button>
    </div>
  );
}
