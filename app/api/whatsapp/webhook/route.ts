import { NextResponse } from "next/server";
import { recordInbound } from "@/lib/inbound";

export const runtime = "nodejs";

// Meta webhook verification handshake.
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  if (
    p.get("hub.mode") === "subscribe" &&
    p.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new Response(p.get("hub.challenge") || "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

// Inbound WhatsApp messages.
// TODO(production): verify the X-Hub-Signature-256 header with the app secret.
export async function POST(req: Request) {
  let payload: {
    entry?: {
      changes?: { value?: { messages?: { from: string; text?: { body: string } }[] } }[];
    }[];
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const m of change.value?.messages ?? []) {
        const body = m.text?.body;
        if (body) {
          await recordInbound({ channel: "whatsapp", from: m.from, body }).catch(() => {});
        }
      }
    }
  }
  return NextResponse.json({ ok: true });
}
