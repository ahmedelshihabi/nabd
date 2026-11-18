import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  await destroySession();
  return NextResponse.json({ ok: true });
}

// Convenience GET so a plain link can log out.
export async function GET(req: Request) {
  await destroySession();
  return NextResponse.redirect(new URL("/login", req.url));
}
