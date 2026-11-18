import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Stripe webhook: verified against the raw body, then updates the store's plan.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "not_configured" }, { status: 400 });
  }

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, secret);
  } catch {
    return NextResponse.json({ error: "signature_invalid" }, { status: 401 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      const storeId = s.metadata?.storeId || s.client_reference_id;
      if (storeId) {
        await prisma.store.updateMany({
          where: { id: storeId },
          data: {
            plan: "growth",
            subscriptionStatus: "active",
            stripeCustomerId: typeof s.customer === "string" ? s.customer : null,
            stripeSubscriptionId: typeof s.subscription === "string" ? s.subscription : null,
          },
        });
      }
    } else if (
      event.type === "customer.subscription.deleted" ||
      event.type === "customer.subscription.updated"
    ) {
      const sub = event.data.object as Stripe.Subscription;
      const active = sub.status === "active" || sub.status === "trialing";
      await prisma.store.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { subscriptionStatus: sub.status, plan: active ? "growth" : "free" },
      });
    }
  } catch {
    /* don't fail the webhook on a processing error */
  }

  return NextResponse.json({ received: true });
}
