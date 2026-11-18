import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { verifyWebhookHmac } from "@/lib/shopify";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Receives Shopify webhooks. The HMAC is verified over the RAW body, so we
// must read the body as text (not JSON) before parsing.
export async function POST(req: Request) {
  const raw = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256") || "";
  const topic = req.headers.get("x-shopify-topic") || "";
  const shop = req.headers.get("x-shopify-shop-domain") || "";

  if (!verifyWebhookHmac(raw, hmac)) {
    return NextResponse.json({ error: "hmac_invalid" }, { status: 401 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    /* some topics send empty bodies */
  }

  try {
    await handleTopic(topic, shop, payload);
  } catch {
    // Always 200 on a verified webhook so Shopify does not retry forever;
    // processing failures are handled out of band.
  }

  return NextResponse.json({ ok: true });
}

async function handleTopic(
  topic: string,
  shop: string,
  payload: Record<string, unknown>,
) {
  const store = await prisma.store.findUnique({ where: { domain: shop } });
  if (!store) return;

  switch (topic) {
    case "orders/create":
      await prisma.event.create({
        data: { storeId: store.id, type: "purchase", data: payload as Prisma.InputJsonValue },
      });
      break;
    case "carts/update":
      // Signal for the abandoned-cart automation.
      await prisma.event.create({
        data: { storeId: store.id, type: "add_to_cart", data: payload as Prisma.InputJsonValue },
      });
      break;
    case "app/uninstalled":
      // Merchant removed the app — drop their stored token.
      await prisma.store.update({
        where: { id: store.id },
        data: { accessToken: null },
      });
      break;
    default:
      break;
  }
}
