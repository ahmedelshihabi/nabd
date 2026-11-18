import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Seeds a demo store with customers, a sent campaign, and realistic
// open/click/purchase tracking so the dashboard shows real numbers locally.
async function main() {
  const store = await prisma.store.upsert({
    where: { domain: "demo.myshopify.com" },
    update: {},
    create: { domain: "demo.myshopify.com", name: "متجر تجريبي", platform: "shopify" },
  });

  // Fresh slate for the demo data.
  await prisma.message.deleteMany({ where: { campaign: { storeId: store.id } } });
  await prisma.campaign.deleteMany({ where: { storeId: store.id } });
  await prisma.customer.deleteMany({ where: { storeId: store.id } });

  const customers = [];
  for (let i = 0; i < 120; i++) {
    customers.push(
      await prisma.customer.create({
        data: {
          storeId: store.id,
          externalId: `demo-${i}`,
          email: `customer${i}@example.com`,
          firstName: `عميل ${i}`,
          consentEmail: i % 10 !== 0, // ~90% opted in
          ordersCount: i % 4,
          totalSpent: (i % 4) * 420,
        },
      }),
    );
  }

  const campaign = await prisma.campaign.create({
    data: {
      storeId: store.id,
      name: "تشكيلة الشتاء — عروض نهاية الأسبوع",
      goal: "زيادة مبيعات التشكيلة الجديدة",
      channel: "email",
      status: "sent",
      subject: "تشكيلة الشتاء وصلت 🧥 وخصم 15%",
      body: "أهلاً،\n\nوصلتنا تشكيلة الشتاء الجديدة وخصّينالك خصم 15% لحد الأحد.",
      cta: "اتسوّق دلوقتي",
      sentAt: new Date(),
    },
  });

  // Realistic funnel: ~90% opted-in get a message; ~62% open, ~19% click, ~4.5% buy.
  const recipients = customers.filter((c) => c.consentEmail);
  let created = 0;
  for (const c of recipients) {
    const r = Math.random();
    const opened = r < 0.62;
    const clicked = r < 0.19;
    const purchased = r < 0.045;
    await prisma.message.create({
      data: {
        campaignId: campaign.id,
        customerId: c.id,
        channel: "email",
        status: purchased ? "clicked" : clicked ? "clicked" : opened ? "opened" : "sent",
        sentAt: new Date(),
        openedAt: opened ? new Date() : null,
        clickedAt: clicked ? new Date() : null,
        revenue: purchased ? 420 : 0,
      },
    });
    created++;
  }

  await prisma.automation.upsert({
    where: { id: `${store.id}-abandoned` },
    update: { enabled: true },
    create: {
      id: `${store.id}-abandoned`,
      storeId: store.id,
      type: "abandoned_cart",
      name: "استرجاع العربة المتروكة",
      enabled: true,
      steps: [{ when: "بعد ساعة", channel: "email", action: "تذكير" }],
    },
  });

  console.log(`Seeded store ${store.id}: ${customers.length} customers, ${created} messages.`);
  console.log(`Open /dashboard?store=${store.id}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
