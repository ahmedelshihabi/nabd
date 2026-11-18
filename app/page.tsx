"use client";

import { useState } from "react";
import type { Campaign } from "@/lib/campaign";

const TONES = ["ودّية", "احترافية", "فخمة وراقية", "مرِحة", "عاجلة"];

const CHANNELS: Record<string, { label: string; color: string }> = {
  email: { label: "الإيميل", color: "#3B82F6" },
  whatsapp: { label: "واتساب", color: "#1FA855" },
  sms: { label: "SMS", color: "#EC9A1E" },
};

export default function Home() {
  const [brief, setBrief] = useState("");
  const [tone, setTone] = useState(TONES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  async function generate() {
    if (!brief.trim()) return;
    setLoading(true);
    setError(null);
    setCampaign(null);
    try {
      const res = await fetch("/api/campaigns/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, tone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "حصل خطأ");
        return;
      }
      setCampaign(data.campaign as Campaign);
    } catch (e) {
      setError(e instanceof Error ? e.message : "حصل خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }

  const ch = campaign && CHANNELS[campaign.recommendedChannel];

  return (
    <main
      dir="rtl"
      className="mx-auto max-w-3xl px-4 py-10"
      style={{ fontFamily: "system-ui, 'Segoe UI', sans-serif" }}
    >
      <header className="mb-8 flex items-center gap-3">
        <div
          className="grid h-10 w-10 place-items-center rounded-xl text-lg font-bold"
          style={{ background: "#C4F030", color: "#17143A" }}
        >
          ن
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#4136EC" }}>
            Nabd
          </h1>
          <p className="text-sm text-neutral-500">
            وكيل التسويق الذكي — توليد حملة بالـ AI
          </p>
        </div>
      </header>

      <label className="mb-2 block text-sm font-semibold">
        وصف المتجر + الهدف
      </label>
      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        dir="auto"
        rows={4}
        placeholder="مثال: متجر ملابس نسائية أونلاين، وصلتنا تشكيلة شتوية جديدة. عايزين نزوّد مبيعاتها ونرجّع العملاء القدام."
        className="w-full resize-y rounded-xl border border-neutral-300 bg-neutral-50 p-3 text-sm leading-relaxed outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-neutral-700 dark:bg-neutral-900"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {TONES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTone(t)}
            className="rounded-full border px-3 py-1.5 text-sm transition"
            style={
              tone === t
                ? { background: "#4136EC", color: "#fff", borderColor: "#4136EC" }
                : { borderColor: "#d4d4d8", color: "#52525b" }
            }
          >
            {t}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={generate}
        disabled={loading || !brief.trim()}
        className="mt-5 w-full rounded-xl py-3 font-semibold text-white transition disabled:opacity-60"
        style={{ background: "linear-gradient(135deg,#4136EC,#9B6CFF)" }}
      >
        {loading ? "الوكيل بيكتب الحملة…" : "ابنِ الحملة"}
      </button>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {campaign && (
        <section className="mt-8 space-y-4">
          <div>
            <h2 className="text-xl font-bold" dir="auto">
              {campaign.campaignName}
            </h2>
            <p className="mt-1 text-sm text-neutral-500" dir="auto">
              {campaign.goal}
            </p>
          </div>

          {ch && (
            <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="mb-2 text-sm font-semibold">القناة المقترحة</div>
              <span
                className="inline-block rounded-full px-3 py-1 text-sm font-semibold"
                style={{ background: ch.color + "22", color: ch.color }}
              >
                {ch.label}
              </span>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300" dir="auto">
                {campaign.channelReason}
              </p>
            </div>
          )}

          {campaign.segments?.length > 0 && (
            <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="mb-3 text-sm font-semibold">الشرائح المستهدفة</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {campaign.segments.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-900"
                  >
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span dir="auto">{s.name}</span>
                      <span style={{ color: "#4136EC" }}>~{Math.round(s.estimatedPct)}%</span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500" dir="auto">
                      {s.criteria}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {campaign.email && (
            <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="mb-2 text-sm font-semibold">معاينة الإيميل</div>
              <div className="font-semibold" dir="auto">
                {campaign.email.subject}
              </div>
              <div className="mb-2 text-xs text-neutral-500" dir="auto">
                {campaign.email.preview}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed" dir="auto">
                {campaign.email.body}
              </p>
              {campaign.email.cta && (
                <span
                  className="mt-3 inline-block rounded-lg px-4 py-2 text-sm font-semibold text-white"
                  style={{ background: "#4136EC" }}
                >
                  {campaign.email.cta}
                </span>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {campaign.whatsapp?.message && (
              <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                <div className="mb-2 text-sm font-semibold" style={{ color: "#1FA855" }}>
                  واتساب
                </div>
                <p className="whitespace-pre-wrap text-sm" dir="auto">
                  {campaign.whatsapp.message}
                </p>
              </div>
            )}
            {campaign.sms?.message && (
              <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                <div className="mb-2 text-sm font-semibold" style={{ color: "#EC9A1E" }}>
                  SMS
                </div>
                <p className="whitespace-pre-wrap text-sm" dir="auto">
                  {campaign.sms.message}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      <footer className="mt-12 border-t border-neutral-200 pt-4 text-center text-xs text-neutral-400 dark:border-neutral-800">
        Nabd — نموذج أولي للمشروع الحقيقي · أول جزء شغّال (توليد الحملة بالـ AI)
      </footer>
    </main>
  );
}
