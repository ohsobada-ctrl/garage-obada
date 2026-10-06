# كراج — Garage

تطبيق لإدارة السيارات والصيانة والوثائق والتذكيرات، بواجهة عربية. يعمل كتطبيق
ويب قابل للتثبيت، ويمكن بناء نسخ Android وiOS باستخدام Capacitor.

## التشغيل المحلي

يتطلب Node.js 22 أو أحدث وnpm. أنشئ `.env.local` بهذه الإعدادات العامة:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_KEY
VITE_WEB_PUSH_PUBLIC_KEY=YOUR_VAPID_PUBLIC_KEY
```

يمكن استخدام `VITE_SUPABASE_ANON_KEY` بدلاً من publishable key. يجب أن يكون
العنوان والمفتاح للمشروع نفسه. لا تضع service_role أو مفاتيح Push الخاصة في الواجهة.

```sh
npm ci
npm run dev
```

## الفحص قبل النشر

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run check:release
```

فحص الإصدار للقراءة فقط: يتحقق من الاتصال والجداول والدالة الإدارية ومفتاح
Web Push ووجود خدمة الإرسال. لا يثبت وصول الإشعار فعلياً؛ يلزم اختبار على أجهزة
حقيقية بعد ضبط أسرار الخادم والمجدول.

## النشر

الواجهة React/Vite ويمكن نشرها مباشرة على Vercel بإعدادات `vercel.json`.
لا تحتاج Lovable لتشغيل المشروع أو تطويره. تبقى Supabase مسؤولة عن البيانات
وتسجيل الدخول والتذكيرات وإرسال الإشعارات في الخلفية.

```sh
npx supabase login
npm run setup:database
npm run setup:push
```

تتطلب أوامر الإعداد حساباً مخولاً وأسرار النشر، وتتوقف عند عدم توفرها. يحدّث
workflow الخاص بالخلفية قاعدة البيانات وخدمة الإرسال تلقائياً بعد إعداد بيئة
GitHub المسماة `production`. لا ترسل مفاتيح خاصة في المحادثات أو المستودع.

تفاصيل إعداد iPhone وAndroid، المتغيرات المطلوبة، اختبار «تذكرني» والتوقيع:
[دليل الإشعارات والنشر](NOTIFICATIONS_SETUP.md).

## حدود جاهزية الإصدار

آخر فحص بتاريخ 6 أكتوبر 2026 أكد وجود خدمات البيانات المطلوبة، لكنه وجد أن
خدمة Push غير منشورة وأن مفتاح Web Push غير مضبوط في البناء المحلي. يلزم إكمال
تفعيل الخادم والتوقيع والتحقق على أجهزة حقيقية قبل إطلاق التطبيق للجمهور.
