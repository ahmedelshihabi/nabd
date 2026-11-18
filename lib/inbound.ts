import { prisma } from "@/lib/prisma";
import type { Channel } from "@prisma/client";

// Records an inbound customer message and links it to a known customer/store
// when the sender can be matched (by phone for WhatsApp/SMS, email otherwise).
export async function recordInbound(opts: {
  channel: Channel;
  from: string;
  body: string;
}) {
  const customer =
    opts.channel === "email"
      ? await prisma.customer.findFirst({ where: { email: opts.from } })
      : await prisma.customer.findFirst({ where: { phone: opts.from } });

  return prisma.inboundMessage.create({
    data: {
      channel: opts.channel,
      fromAddr: opts.from,
      body: opts.body,
      customerId: customer?.id ?? null,
      storeId: customer?.storeId ?? null,
    },
  });
}
