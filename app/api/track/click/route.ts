import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyClick } from "@/lib/tokens";

export const runtime = "nodejs";

// Click tracking + safe redirect: GET /api/track/click?m=&u=&s=
// The signature `s` proves WE generated this link, so our domain can't be
// used as an open redirect to an arbitrary destination.
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const m = params.get("m") || "";
  const u = params.get("u") || "";
  const s = params.get("s") || "";

  if (!m || !u || !s || !verifyClick(m, u, s)) {
    return NextResponse.json({ error: "invalid_link" }, { status: 400 });
  }
  // Only ever redirect to http(s) URLs.
  if (!/^https?:\/\//i.test(u)) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  try {
    await prisma.message.updateMany({
      where: { id: m, clickedAt: null },
      data: { clickedAt: new Date(), status: "clicked" },
    });
  } catch {
    /* don't block the redirect on a tracking failure */
  }

  return NextResponse.redirect(u);
}
