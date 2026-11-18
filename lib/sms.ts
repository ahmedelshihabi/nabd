// SMS sending via Twilio's REST API (no SDK — just fetch + basic auth).
// For MENA you can swap the provider (Unifonic, Vonage, local aggregators)
// behind this same sendSms() interface. Needs TWILIO_ACCOUNT_SID,
// TWILIO_AUTH_TOKEN and TWILIO_FROM (a sender ID or number).

function cfg() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) {
    throw new Error("Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM");
  }
  return { sid, token, from };
}

export async function sendSms(to: string, body: string): Promise<{ sid: string }> {
  const { sid, token, from } = cfg();
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
    },
  );
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`SMS send failed: ${res.status} ${detail}`);
  }
  const data = (await res.json()) as { sid?: string };
  return { sid: data.sid ?? "" };
}
