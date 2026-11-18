import Stripe from "stripe";

// Lazily construct the client so build-time module evaluation never runs with
// an empty key (Stripe throws when the key is missing).
let client: Stripe | null = null;
export function getStripe(): Stripe {
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY || "");
  return client;
}

export const PLANS = {
  free: { name: "مجاني", label: "Free" },
  growth: { name: "Growth", label: "Growth" },
} as const;
