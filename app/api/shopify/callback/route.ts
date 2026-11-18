import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  isValidShopDomain,
  verifyOAuthHmac,
  exchangeToken,
} from "@/lib/shopify";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

// OAuth callback: verifies the request, exchanges the code for a token,
// and stores the connected shop.
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const shop = params.get("shop") || "";
  const code = params.get("code") || "";
  const state = params.get("state") || "";

  if (!isValidShopDomain(shop) || !code) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  // CSRF: the state must match the cookie we set at install time.
  const cookieStore = await cookies();
  const expected = cookieStore.get("shopify_oauth_state")?.value;
  if (!expected || expected !== state) {
    return NextResponse.json({ error: "state_mismatch" }, { status: 403 });
  }

  // Integrity: Shopify signs the callback params.
  if (!verifyOAuthHmac(params)) {
    return NextResponse.json({ error: "hmac_invalid" }, { status: 403 });
  }

  let token: string;
  try {
    token = await exchangeToken(shop, code);
  } catch {
    return NextResponse.json({ error: "token_exchange_failed" }, { status: 502 });
  }

  // Persist the connected store. NOTE: encrypt `accessToken` at rest before
  // production — plain storage here is a scaffold placeholder.
  try {
    const user = await getSessionUser();
    if (user) {
      // Link the Shopify store to the signed-in user's store.
      await prisma.store.update({
        where: { id: user.storeId },
        data: {
          domain: shop,
          name: shop.replace(".myshopify.com", ""),
          platform: "shopify",
          accessToken: token,
        },
      });
    } else {
      await prisma.store.upsert({
        where: { domain: shop },
        update: { accessToken: token },
        create: {
          domain: shop,
          name: shop.replace(".myshopify.com", ""),
          platform: "shopify",
          accessToken: token,
        },
      });
    }
  } catch (err) {
    // DB not configured yet in this environment — surface clearly.
    const message = err instanceof Error ? err.message : "db_error";
    return NextResponse.json({ error: "store_save_failed", message }, { status: 500 });
  }

  const res = NextResponse.redirect(`${process.env.APP_URL}/connect?connected=1`);
  res.cookies.delete("shopify_oauth_state");
  return res;
}
