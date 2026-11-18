import { NextResponse } from "next/server";
import { campaignStats } from "@/lib/stats";

export const runtime = "nodejs";

// Funnel + revenue for one campaign: GET /api/campaigns/<id>/stats
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    return NextResponse.json({ ok: true, stats: await campaignStats(id) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "stats_failed";
    return NextResponse.json({ error: "stats_failed", message }, { status: 500 });
  }
}
