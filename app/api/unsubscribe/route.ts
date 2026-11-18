import { prisma } from "@/lib/prisma";
import { verifyUnsub } from "@/lib/tokens";

export const runtime = "nodejs";

function page(message: string, ok: boolean): Response {
  const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>إلغاء الاشتراك</title></head>
<body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#f6f4fd;font-family:system-ui,sans-serif">
<div style="background:#fff;border-radius:16px;padding:32px;max-width:360px;text-align:center;color:#17143a">
<div style="font-size:28px;margin-bottom:8px">${ok ? "✓" : "⚠"}</div>
<p style="font-size:16px">${message}</p></div></body></html>`;
  return new Response(html, {
    status: ok ? 200 : 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// One-click unsubscribe (compliance): GET /api/unsubscribe?c=<customerId>&t=<token>
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const c = params.get("c") || "";
  const t = params.get("t") || "";

  if (!c || !t || !verifyUnsub(c, t)) {
    return page("رابط إلغاء الاشتراك غير صالح.", false);
  }

  try {
    await prisma.customer.updateMany({
      where: { id: c },
      data: { consentEmail: false },
    });
  } catch {
    return page("حصل خطأ مؤقت، حاول تاني.", false);
  }

  return page("تم إلغاء اشتراكك. مش هتوصلك رسائل تانية.", true);
}
