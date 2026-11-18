import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export { hashPassword, verifyPassword } from "@/lib/password";

const COOKIE = "nabd_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Server-side sessions (revocable, stored in the DB) beat stateless JWTs for an
// app that handles customer data + money: a stolen token can be killed instantly.
export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + MAX_AGE * 1000);
  await prisma.session.create({ data: { token, userId, expiresAt } });
  return token;
}

export async function setSessionCookie(token: string): Promise<void> {
  const c = await cookies();
  c.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

async function sessionToken(): Promise<string | null> {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

export async function getSessionUser() {
  const token = await sessionToken();
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: { store: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function destroySession(): Promise<void> {
  const token = await sessionToken();
  if (token) await prisma.session.deleteMany({ where: { token } });
  (await cookies()).delete(COOKIE);
}
