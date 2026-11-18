import { NextResponse } from "next/server";
import { storeStats } from "@/lib/stats";

export const runtime = "nodejs";

// Store overview for the dashboard: GET /api/stats?store=<storeId>
// (store id comes from the authenticated session in production.)
export async function GET(req: Request) {
  const storeId = new URL(req.url).searchParams.get("store") || "";
  if (!storeId) {
    return NextResponse.json({ error: "store_required" }, { status: 400 });
  }
  try {
    return NextResponse.json({ ok: true, stats: await storeStats(storeId) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "stats_failed";
    return NextResponse.json({ error: "stats_failed", message }, { status: 500 });
  }
}
