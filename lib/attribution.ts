import { prisma } from "@/lib/prisma";

type Touch = {
  id: string;
  clickedAt: Date | null;
  openedAt: Date | null;
};

// Pure attribution rule (testable without a DB): credit the purchase to the
// customer's most recent CLICKED message within the window; if none was
// clicked, fall back to the most recent OPENED message within the window.
export function pickAttributableMessage(
  touches: Touch[],
  now: Date,
  windowDays = 7,
): string | null {
  const cutoff = now.getTime() - windowDays * 24 * 60 * 60 * 1000;

  const within = (d: Date | null) => d !== null && d.getTime() >= cutoff;
  const latest = (pick: (t: Touch) => Date | null) =>
    touches
      .filter((t) => within(pick(t)))
      .sort((a, b) => (pick(b)!.getTime() - pick(a)!.getTime()))[0] ?? null;

  const clicked = latest((t) => t.clickedAt);
  if (clicked) return clicked.id;
  const opened = latest((t) => t.openedAt);
  return opened ? opened.id : null;
}

// Credits an order's value to the customer's attributable message and updates
// the customer's lifetime aggregates. Called from the orders/create webhook.
export async function attributeOrder(
  storeId: string,
  externalCustomerId: string | null,
  orderValue: number,
): Promise<string | null> {
  if (!externalCustomerId) return null;

  const customer = await prisma.customer.findUnique({
    where: { storeId_externalId: { storeId, externalId: externalCustomerId } },
  });
  if (!customer) return null;

  // Refresh lifetime stats.
  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      ordersCount: { increment: 1 },
      totalSpent: { increment: orderValue },
      lastOrderAt: new Date(),
    },
  });

  const touches = await prisma.message.findMany({
    where: { customerId: customer.id },
    select: { id: true, clickedAt: true, openedAt: true },
  });

  const messageId = pickAttributableMessage(touches, new Date());
  if (!messageId) return null;

  await prisma.message.update({
    where: { id: messageId },
    data: { revenue: { increment: orderValue } },
  });
  return messageId;
}
