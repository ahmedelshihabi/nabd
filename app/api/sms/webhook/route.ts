import { recordInbound } from "@/lib/inbound";

export const runtime = "nodejs";

// Inbound SMS (Twilio posts application/x-www-form-urlencoded).
// TODO(production): validate the X-Twilio-Signature header.
export async function POST(req: Request) {
  const form = new URLSearchParams(await req.text());
  const from = form.get("From");
  const body = form.get("Body");
  if (from && body) {
    await recordInbound({ channel: "sms", from, body }).catch(() => {});
  }
  // Empty TwiML response.
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
