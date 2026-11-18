// WhatsApp sending via Meta's Cloud API.
// Needs WHATSAPP_TOKEN (permanent system-user token) and WHATSAPP_PHONE_ID.
// Marketing messages outside the 24h service window require an APPROVED
// template; `sendWhatsAppText` suits replies/testing, `sendWhatsAppTemplate`
// suits campaigns.

const GRAPH_VERSION = "v21.0";

function cfg() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) throw new Error("Missing WHATSAPP_TOKEN / WHATSAPP_PHONE_ID");
  return { token, phoneId };
}

async function post(body: unknown): Promise<{ id: string }> {
  const { token, phoneId } = cfg();
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...(body as object) }),
    },
  );
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`WhatsApp send failed: ${res.status} ${detail}`);
  }
  const data = (await res.json()) as { messages?: { id: string }[] };
  return { id: data.messages?.[0]?.id ?? "" };
}

export function sendWhatsAppText(to: string, body: string) {
  return post({ to, type: "text", text: { body } });
}

// Approved marketing/utility template. `components` carries variable values.
export function sendWhatsAppTemplate(
  to: string,
  template: string,
  language = "ar",
  components?: unknown[],
) {
  return post({
    to,
    type: "template",
    template: {
      name: template,
      language: { code: language },
      ...(components ? { components } : {}),
    },
  });
}
