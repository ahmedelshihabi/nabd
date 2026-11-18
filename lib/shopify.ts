import crypto from "crypto";

// Shopify Admin API version (date-based). Bump quarterly.
export const SHOPIFY_API_VERSION = "2025-01";

export const SHOPIFY_SCOPES =
  process.env.SHOPIFY_SCOPES ||
  "read_customers,read_products,read_orders,write_marketing_events";

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

// Only accept well-formed *.myshopify.com domains.
export function isValidShopDomain(shop: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop);
}

// Build the OAuth authorize URL the merchant is redirected to.
export function buildAuthUrl(shop: string, state: string): string {
  const params = new URLSearchParams({
    client_id: requiredEnv("SHOPIFY_API_KEY"),
    scope: SHOPIFY_SCOPES,
    redirect_uri: `${requiredEnv("APP_URL")}/api/shopify/callback`,
    state,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

// Constant-time compare of two hex/base64 digests.
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// Verify the HMAC on an OAuth callback query string (Shopify signs the params).
export function verifyOAuthHmac(params: URLSearchParams): boolean {
  const secret = requiredEnv("SHOPIFY_API_SECRET");
  const hmac = params.get("hmac") || "";
  const message = Array.from(params.entries())
    .filter(([k]) => k !== "hmac" && k !== "signature")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const digest = crypto.createHmac("sha256", secret).update(message).digest("hex");
  return safeEqual(digest, hmac);
}

// Verify a webhook's HMAC (base64) over the exact raw request body.
export function verifyWebhookHmac(rawBody: string, hmacHeader: string): boolean {
  const secret = requiredEnv("SHOPIFY_API_SECRET");
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  return safeEqual(digest, hmacHeader);
}

// Exchange an authorization code for a permanent access token.
export async function exchangeToken(shop: string, code: string): Promise<string> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: requiredEnv("SHOPIFY_API_KEY"),
      client_secret: requiredEnv("SHOPIFY_API_SECRET"),
      code,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

// Minimal authenticated Admin REST client.
export async function shopifyRest<T>(
  shop: string,
  token: string,
  path: string,
): Promise<T> {
  const res = await fetch(
    `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/${path}`,
    { headers: { "X-Shopify-Access-Token": token } },
  );
  if (!res.ok) throw new Error(`Shopify API ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}
