import { prisma } from "@/lib/prisma";
import { shopifyRest } from "@/lib/shopify";

type ShopifyCustomer = {
  id: number;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  orders_count: number;
  total_spent: string;
  email_marketing_consent: { state: string } | null;
  sms_marketing_consent: { state: string } | null;
};

type ShopifyProduct = {
  id: number;
  title: string;
  handle: string;
  variants: { price: string }[];
  image: { src: string } | null;
};

// Pull customers from Shopify and upsert them into the store's records.
export async function syncCustomers(
  storeId: string,
  shop: string,
  token: string,
): Promise<number> {
  const { customers } = await shopifyRest<{ customers: ShopifyCustomer[] }>(
    shop,
    token,
    "customers.json?limit=250",
  );

  for (const c of customers) {
    await prisma.customer.upsert({
      where: { storeId_externalId: { storeId, externalId: String(c.id) } },
      update: {
        email: c.email,
        phone: c.phone,
        firstName: c.first_name,
        ordersCount: c.orders_count,
        totalSpent: parseFloat(c.total_spent) || 0,
        consentEmail: c.email_marketing_consent?.state === "subscribed",
        consentSms: c.sms_marketing_consent?.state === "subscribed",
      },
      create: {
        storeId,
        externalId: String(c.id),
        email: c.email,
        phone: c.phone,
        firstName: c.first_name,
        ordersCount: c.orders_count,
        totalSpent: parseFloat(c.total_spent) || 0,
        consentEmail: c.email_marketing_consent?.state === "subscribed",
        consentSms: c.sms_marketing_consent?.state === "subscribed",
      },
    });
  }
  return customers.length;
}

// Pull products so campaigns can reference real items (image, price, link).
export async function syncProducts(
  storeId: string,
  shop: string,
  token: string,
): Promise<number> {
  const { products } = await shopifyRest<{ products: ShopifyProduct[] }>(
    shop,
    token,
    "products.json?limit=250",
  );

  for (const p of products) {
    await prisma.product.upsert({
      where: { storeId_externalId: { storeId, externalId: String(p.id) } },
      update: {
        title: p.title,
        price: parseFloat(p.variants?.[0]?.price ?? "") || null,
        imageUrl: p.image?.src ?? null,
        url: `https://${shop}/products/${p.handle}`,
      },
      create: {
        storeId,
        externalId: String(p.id),
        title: p.title,
        price: parseFloat(p.variants?.[0]?.price ?? "") || null,
        imageUrl: p.image?.src ?? null,
        url: `https://${shop}/products/${p.handle}`,
      },
    });
  }
  return products.length;
}
