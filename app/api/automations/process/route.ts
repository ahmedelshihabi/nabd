import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processAbandonedCarts } from "@/lib/automations/abandoned-cart";

export const runtime = "nodejs";

// Runs due automations across all stores. Called on a schedule (Vercel Cron),
// authenticated with CRON_SECRET so it can't be triggered by the public.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const automations = await prisma.automation.findMany({
      where: { type: "abandoned_cart", enabled: true },
      select: { storeId: true },
      distinct: ["storeId"],
    });

    const results = [];
    for (const { storeId } of automations) {
      results.push({ storeId, ...(await processAbandonedCarts(storeId)) });
    }
    return NextResponse.json({ ok: true, ran: results.length, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "run_failed";
    return NextResponse.json({ error: "run_failed", message }, { status: 500 });
  }
}
