"use client";

import { useState } from "react";

const CH: Record<string, { label: string; color: string }> = {
  whatsapp: { label: "واتساب", color: "#1FA855" },
  sms: { label: "SMS", color: "#EC9A1E" },
  email: { label: "إيميل", color: "#3B82F6" },
};

export default function InboxItem(props: {
  id: string;
  channel: string;
  from: string;
  body: string;
  handled: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(props.handled);
  const [error, setError] = useState<string | null>(null);
  const ch = CH[props.channel] ?? { label: props.channel, color: "#6b6a78" };

  async function suggest() {
    setLoading(true);
    setError(null);
    setOpen(true);
    try {
      const res = await fetch(`/api/inbox/${props.id}/suggest`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message === "missing_api_key" ? "محتاج ANTHROPIC_API_KEY." : data.error);
        return;
      }
      setDraft(data.draft || "");
    } catch {
      setError("حصل خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    if (!draft.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/inbox/${props.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: draft }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "تعذّر الإرسال");
        return;
      }
      setSent(true);
      setOpen(false);
    } catch {
      setError("حصل خطأ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #e3ddf6", borderRadius: 16, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: ch.color, background: ch.color + "22", borderRadius: 999, padding: "3px 10px" }}>{ch.label}</span>
        <span dir="ltr" style={{ fontSize: 12, color: "#9690b5" }}>{props.from}</span>
        {sent && <span style={{ fontSize: 12, color: "#1FA855", marginInlineStart: "auto" }}>✓ تم الرد</span>}
      </div>
      <div dir="auto" style={{ fontSize: 14, color: "#17143a" }}>{props.body}</div>

      {!sent && (
        <>
          {!open ? (
            <button onClick={suggest} style={{ marginTop: 12, border: "1px dashed #b7adf5", background: "#eeeafe", color: "#4136EC", fontWeight: 600, fontSize: 14, borderRadius: 10, padding: "9px 14px", cursor: "pointer" }}>
              ✦ اقترح رد بالـ AI
            </button>
          ) : (
            <div style={{ marginTop: 12 }}>
              <textarea
                dir="auto"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={loading ? "الوكيل بيكتب…" : "الرد المقترح"}
                rows={3}
                style={{ width: "100%", border: "1px solid #e3ddf6", borderRadius: 10, padding: 10, fontSize: 14, background: "#f9f8ff" }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={send} disabled={loading || !draft.trim()} style={{ border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 600, color: "#fff", background: "linear-gradient(135deg,#4136EC,#9B6CFF)", cursor: "pointer" }}>إرسال عبر {ch.label}</button>
                <button onClick={suggest} disabled={loading} style={{ border: "1px solid #e3ddf6", borderRadius: 10, padding: "8px 14px", color: "#6b6a78", background: "#fff", cursor: "pointer" }}>رد تاني</button>
              </div>
            </div>
          )}
        </>
      )}
      {error && <div style={{ color: "#c0392b", fontSize: 13, marginTop: 8 }}>{error}</div>}
    </div>
  );
}
