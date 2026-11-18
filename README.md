# Nabd

منصة تسويق بالذكاء الاصطناعي لمتاجر التجارة الإلكترونية — وكيل ذاتي يكتب وينفّذ حملات عبر الإيميل والواتساب والـ SMS.

**الحلقة الشغّالة دلوقتي:** ربط Shopify → سحب العملاء → توليد حملة بالـ AI → إرسال فعلي متتبَّع → فتح/ضغط/شراء → إيراد منسوب → تحليلات، مع أتمتة (عربة متروكة + ترحيب) والأمن والامتثال.

## 🚀 نشر على رابط عام (Vercel)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fahmedelshihabi%2Fnabd&env=DATABASE_URL,APP_URL,APP_SECRET,ANTHROPIC_API_KEY)

1. **قاعدة بيانات:** اعمل Postgres مجاني على [Neon](https://neon.tech) أو [Supabase](https://supabase.com) وانسخ رابط الاتصال (`DATABASE_URL`).
2. **اضغط زر Deploy فوق**، واربط حساب GitHub، وحط المتغيّرات:
   - `DATABASE_URL` — رابط Postgres
   - `APP_URL` — رابط مشروعك على Vercel (مثلاً `https://nabd.vercel.app`)
   - `APP_SECRET` — أي نص عشوائي طويل
   - `ANTHROPIC_API_KEY` — مفتاح Claude (يشغّل الـ AI)
3. **أنشئ الجداول:** محليًا `DATABASE_URL="..." npx prisma db push`، وبعدها `npm run seed` (اختياري لبيانات تجريبية).
4. افتح رابط Vercel — النظام شغّال عام على النت ✅.

> بعد النشر، تقدر تضيف باقي المفاتيح (Shopify, SES, WhatsApp, Twilio, Stripe) من إعدادات Vercel لتشغيل القنوات والفوترة.

## الـ Stack

- **Next.js 16** + TypeScript + Tailwind
- **Prisma** + PostgreSQL
- **Claude API** (توليد الحملات) · **Amazon SES** (الإرسال) · **Zod** (التحقق)

## التشغيل محليًا

```bash
npm install
cp .env.example .env          # املأ المفاتيح (شوف .env.example)
npx prisma generate
npx prisma migrate dev --name init   # يحتاج DATABASE_URL شغّال
npm run seed                  # (اختياري) بيانات تجريبية تملأ اللوحة
npm run dev
```

- توليد حملة: افتح `/` واكتب هدفك (يحتاج `ANTHROPIC_API_KEY`).
- لوحة النبض: `/dashboard` (بعد الـ seed أو ربط متجر).
- اربط متجر: `/connect` (يحتاج `SHOPIFY_API_KEY/SECRET`).

## الاختبارات

```bash
npm test     # 24 اختبار: تحقق HMAC، توقيع الروابط، النسب، اختيار العربات
```

## البنية

```
app/
  page.tsx                          واجهة توليد الحملة
  dashboard/page.tsx                لوحة التحليلات
  campaigns/[id]/page.tsx           مسار تحويل الحملة
  connect/page.tsx                  ربط المتجر
  api/
    campaigns/generate              توليد الحملة بالـ AI
    campaigns/[id]/send             إرسال الحملة
    campaigns/[id]/stats            تحليلات الحملة
    stats                           نظرة عامة على المتجر
    shopify/{install,callback,webhooks}   OAuth + webhooks (HMAC)
    track/{open,click}              تتبّع الفتح والضغط
    unsubscribe                     إلغاء الاشتراك (امتثال)
    automations/process             تشغيل الأتمتة (Vercel Cron)
lib/
  anthropic.ts  campaign.ts         توليد الحملة
  shopify.ts  sync.ts               تكامل Shopify
  email.ts  tracking.ts  tokens.ts  الإرسال + التتبّع + التوقيع الآمن
  send-campaign.ts  attribution.ts  stats.ts   الإرسال + النسب + التحليلات
  automations/{abandoned-cart,welcome}.ts      الأتمتة
prisma/schema.prisma  seed.ts
```

## الأمن والامتثال

- تحقق HMAC على OAuth والـ webhooks (`timingSafeEqual`) + state nonce ضد CSRF.
- روابط الضغط موقّعة (منع open-redirect)، وإلغاء الاشتراك مربوط بالعميل بتوقيع.
- الإرسال للمشتركين فقط (`consent`)، وكل إيميل فيه رابط إلغاء اشتراك.
- عزل بيانات كل متجر، والمدفوعات عبر مزوّد PCI (مش بنخزّن أرقام كروت).

## خريطة الطريق

1. ✅ الأساس — ربط Shopify + مزامنة
2. ✅ حملات الإيميل — إرسال فعلي + تتبّع + إيراد منسوب
3. ✅ الأتمتة والتحليلات — عربة متروكة + ترحيب + لوحة نبض
4. ⬜ واتساب + SMS
5. ⬜ الصندوق الموحّد + الوكيل الذاتي + الفوترة + المصادقة
