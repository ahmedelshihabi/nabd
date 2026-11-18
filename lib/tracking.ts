import { clickSig, unsubToken } from "@/lib/tokens";

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}

// A tracked, CAN-SPAM/compliance-friendly HTML email:
// - open pixel  -> records opens
// - CTA link    -> signed click-tracking redirect (no open-redirect abuse)
// - unsubscribe -> signed per-customer link (required footer)
export function buildEmailHtml(opts: {
  appUrl: string;
  messageId: string;
  customerId: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
}): string {
  const { appUrl, messageId, customerId, body, ctaText, ctaUrl } = opts;

  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 14px">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

  let cta = "";
  if (ctaText && ctaUrl) {
    const href =
      `${appUrl}/api/track/click?m=${encodeURIComponent(messageId)}` +
      `&u=${encodeURIComponent(ctaUrl)}&s=${clickSig(messageId, ctaUrl)}`;
    cta =
      `<p style="margin:22px 0"><a href="${esc(href)}" ` +
      `style="display:inline-block;background:#4136EC;color:#fff;text-decoration:none;` +
      `font-weight:600;padding:12px 24px;border-radius:10px">${esc(ctaText)}</a></p>`;
  }

  const unsub =
    `${appUrl}/api/unsubscribe?c=${encodeURIComponent(customerId)}` +
    `&t=${unsubToken(customerId)}`;
  const pixel = `${appUrl}/api/track/open?m=${encodeURIComponent(messageId)}`;

  return `<!doctype html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f6f4fd;font-family:system-ui,'Segoe UI',Tahoma,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#fff;border-radius:16px;padding:24px;color:#17143a;line-height:1.7;font-size:15px">
    ${paragraphs}
    ${cta}
  </div>
  <p style="text-align:center;color:#9690b5;font-size:12px;margin-top:18px">
    وصلتك الرسالة دي لأنك مشترك في قائمة المتجر.
    <a href="${esc(unsub)}" style="color:#9690b5">إلغاء الاشتراك</a>
  </p>
</div>
<img src="${esc(pixel)}" width="1" height="1" alt="" style="display:block">
</body></html>`;
}
