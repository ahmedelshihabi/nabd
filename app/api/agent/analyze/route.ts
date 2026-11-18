import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { analyzeStore } from "@/lib/agent";

export const runtime = "nodejs";

// Runs the autonomous agent's analysis for the signed-in user's store.
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const proposals = await analyzeStore(user.storeId);
    return NextResponse.json({ ok: true, proposals });
  } catch (err) {
    const message = err instanceof Error ? err.message : "analyze_failed";
    const status = message === "missing_api_key" ? 500 : 502;
    return NextResponse.json({ error: "analyze_failed", message }, { status });
  }
}
