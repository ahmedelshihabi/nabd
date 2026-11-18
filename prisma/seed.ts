import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@nabd.app";
const DEMO_PASSWORD = "demodemo123";

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

  // Demo login so the dashboard can be used with real auth.
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });
  await prisma.user.create({
    data: { email: DEMO_EMAIL, passwordHash: await hashPassword(DEMO_PASSWORD), storeId: store.id },
  });

  // A couple of inbound messages so the unified inbox isn't empty.
  await prisma.inboundMessage.deleteMany({ where: { storeId: store.id } });
  await prisma.inboundMessage.createMany({
    data: [
      { storeId: store.id, channel: "whatsapp", fromAddr: "+201000000001", body: "الجاكت متوفر بمقاس M؟" },
      { storeId: store.id, channel: "sms", fromAddr: "+201000000002", body: "العرض لسه شغّال؟" },
    ],
  });

  // A sample agent proposal (pending) so the agent screen has content.
  await prisma.agentProposal.deleteMany({ where: { storeId: store.id } });
  await prisma.agentProposal.create({
    data: {
      storeId: store.id,
      insight: "نسبة الفتح أعلى مساءً بكتير من الصبح.",
      action: "حوّل وقت إرسال الحملات للساعة 8:30 مساءً.",
      impact: "متوقّع +15% نسبة فتح.",
    },
  });

  console.log(`Seeded store ${store.id}: ${customers.length} customers, ${created} messages.`);
  console.log(`Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`Dashboard (no login): /dashboard?store=${store.id}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
