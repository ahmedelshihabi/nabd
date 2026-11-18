import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { anthropic, CAMPAIGN_MODEL } from "@/lib/anthropic";

export const runtime = "nodejs";

const CHANNEL_AR: Record<string, string> = { whatsapp: "واتساب", sms: "SMS", email: "الإيميل" };

// AI-drafted reply to an inbound message: POST /api/inbox/<id>/suggest
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "missing_api_key" }, { status: 500 });
  }

  const { id } = await params;
  const msg = await prisma.inboundMessage.findUnique({ where: { id } });
  if (!msg || msg.storeId !== user.storeId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const prompt =
      `أنت وكيل خدمة عملاء ومبيعات محترف لمتجر «${user.store.name}». ` +
      `العميل راسلنا على ${CHANNEL_AR[msg.channel] ?? msg.channel}.\n` +
      "اكتب رد واحد مناسب وودود ومختصر، بنفس لغة ولهجة العميل، وبيحاول يحلّ المشكلة أو يقفل البيعة. " +
      "رُدّ بنص الرسالة فقط من غير أي مقدمات.\n\nرسالة العميل:\n" +
      msg.body;

    const res = await anthropic.messages.create({
      model: CAMPAIGN_MODEL,
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });
    const draft = res.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("")
      .trim();

    return NextResponse.json({ ok: true, draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : "suggest_failed";
    return NextResponse.json({ error: "suggest_failed", message }, { status: 502 });
  }
}
