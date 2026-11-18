import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSession, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { email?: string; password?: string; storeName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const storeName = (body.storeName || "").trim() || "متجري";

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "weak_password", message: "كلمة السر لازم 8 حروف على الأقل" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }

  // A store is created now; connecting Shopify later links to this same store.
  const user = await prisma.$transaction(async (tx) => {
    const store = await tx.store.create({
      data: {
        name: storeName,
        platform: "shopify",
        domain: `pending-${crypto.randomUUID()}.nabd`,
      },
    });
    return tx.user.create({
      data: { email, passwordHash: await hashPassword(password), storeId: store.id },
    });
  });

  const token = await createSession(user.id);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true, storeId: user.storeId });
}
