import { NextResponse } from "next/server";
import { sendCampaign } from "@/lib/send-campaign";

export const runtime = "nodejs";

// Triggers sending a campaign: POST /api/campaigns/<id>/send
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });

  try {
    const summary = await sendCampaign(id);
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "send_failed";
    const status = message === "campaign_not_found" ? 404 : 500;
    return NextResponse.json({ error: "send_failed", message }, { status });
  }
}
