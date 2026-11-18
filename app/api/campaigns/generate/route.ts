import { NextResponse } from "next/server";
import { anthropic, CAMPAIGN_MODEL } from "@/lib/anthropic";
import { buildCampaignPrompt, extractJson, CampaignSchema } from "@/lib/campaign";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { brief?: unknown; tone?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json_body" }, { status: 400 });
  }

  const brief = typeof body.brief === "string" ? body.brief.trim() : "";
  const tone = typeof body.tone === "string" ? body.tone : undefined;

  if (!brief) {
    return NextResponse.json({ error: "brief_required" }, { status: 400 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "missing_api_key", message: "ضع ANTHROPIC_API_KEY في .env" },
      { status: 500 },
    );
  }

  try {
    const msg = await anthropic.messages.create({
      model: CAMPAIGN_MODEL,
      max_tokens: 2000,
      messages: [{ role: "user", content: buildCampaignPrompt(brief, tone) }],
    });

    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");

    const raw = extractJson(text);
    const parsed = CampaignSchema.safeParse(raw);

    // Return the validated campaign; if validation is partial, still return the
    // raw object so the client can render what came back.
    return NextResponse.json({
      ok: true,
      valid: parsed.success,
      campaign: parsed.success ? parsed.data : raw,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "generation_failed";
    return NextResponse.json({ error: "generation_failed", message }, { status: 502 });
  }
}
