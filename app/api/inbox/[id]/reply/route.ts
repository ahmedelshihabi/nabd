import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { sendSms } from "@/lib/sms";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

// Sends a reply to an inbound message over its own channel and marks it handled.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  if (!text?.trim()) return NextResponse.json({ error: "text_required" }, { status: 400 });

  const msg = await prisma.inboundMessage.findUnique({ where: { id } });
  if (!msg || msg.storeId !== user.storeId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    if (msg.channel === "whatsapp") await sendWhatsAppText(msg.fromAddr, text);
    else if (msg.channel === "sms") await sendSms(msg.fromAddr, text);
    else await sendEmail({ to: msg.fromAddr, subject: `رد من ${user.store.name}`, html: `<p>${text}</p>` });

    await prisma.inboundMessage.update({ where: { id }, data: { handled: true } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "reply_failed";
    return NextResponse.json({ error: "reply_failed", message }, { status: 502 });
  }
}
