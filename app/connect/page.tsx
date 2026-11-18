"use client";

import { useState } from "react";

export default function Connect() {
  const [shop, setShop] = useState("");
  const connected =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("connected") === "1";

  function install() {
    let domain = shop.trim().toLowerCase();
    if (!domain) return;
    if (!domain.includes(".")) domain = `${domain}.myshopify.com`;
    window.location.href = `/api/shopify/install?shop=${encodeURIComponent(domain)}`;
  }

  return (
    <main
      dir="rtl"
      className="mx-auto max-w-md px-4 py-16"
      style={{ fontFamily: "system-ui, 'Segoe UI', sans-serif" }}
    >
      <div
        className="mb-4 grid h-12 w-12 place-items-center rounded-xl text-xl font-bold"
        style={{ background: "#C4F030", color: "#17143A" }}
      >
        ن
      </div>
      <h1 className="text-2xl font-bold" style={{ color: "#4136EC" }}>
        اربط متجرك
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        اربط متجر Shopify عشان الوكيل يسحب عملاءك ومنتجاتك ويبني حملات حقيقية.
      </p>

      {connected && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          اتربط متجرك بنجاح ✓
        </div>
      )}

      <label className="mt-6 mb-2 block text-sm font-semibold">
        رابط متجرك على Shopify
      </label>
      <input
        value={shop}
        onChange={(e) => setShop(e.target.value)}
        dir="ltr"
        placeholder="your-store.myshopify.com"
        className="w-full rounded-xl border border-neutral-300 bg-neutral-50 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-neutral-700 dark:bg-neutral-900"
      />

      <button
        type="button"
        onClick={install}
        disabled={!shop.trim()}
        className="mt-4 w-full rounded-xl py-3 font-semibold text-white transition disabled:opacity-60"
        style={{ background: "linear-gradient(135deg,#4136EC,#9B6CFF)" }}
      >
        اربط عبر Shopify
      </button>

      <p className="mt-4 text-xs text-neutral-400">
        محتاج إعداد تطبيق Shopify (SHOPIFY_API_KEY/SECRET و APP_URL) في .env.
      </p>
    </main>
  );
}
