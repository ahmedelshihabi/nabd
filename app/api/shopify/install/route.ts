import { NextResponse } from "next/server";
import crypto from "crypto";
import { isValidShopDomain, buildAuthUrl } from "@/lib/shopify";

export const runtime = "nodejs";

// Starts the OAuth flow: GET /api/shopify/install?shop=xxx.myshopify.com
export async function GET(req: Request) {
  const shop = new URL(req.url).searchParams.get("shop") || "";
  if (!isValidShopDomain(shop)) {
    return NextResponse.json({ error: "invalid_shop_domain" }, { status: 400 });
  }

  // CSRF nonce: stored in an httpOnly cookie, echoed back in the callback.
  const state = crypto.randomBytes(16).toString("hex");

  let authUrl: string;
  try {
    authUrl = buildAuthUrl(shop, state);
  } catch {
    return NextResponse.json(
      { error: "shopify_not_configured", message: "ضع SHOPIFY_API_KEY و APP_URL في .env" },
      { status: 500 },
    );
  }

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("shopify_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
