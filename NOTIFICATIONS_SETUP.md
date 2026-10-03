# تشغيل الإشعارات وإصلاح لوحة الأدمن

## النشر الآلي (المسار المفضل)

بدلاً من نسخ SQL يدوياً: سجّل أداة النشر بحساب Supabase مرة واحدة عبر
`npx supabase login`، ثم شغّل `npm run setup:database`.
الأمر يربط المشروع المحدد في config.toml ويطبّق إصلاح الإشعارات في معاملة واحدة،
ثم يتحقق من وجود الجداول والدوال قبل نجاح المعاملة. يمكن تكراره بأمان.
`npm run setup:database:preview` يعرض الخطة من غير اتصال أو تغيير البيانات.

Workflow `Update notification backend` يطبّق الإصلاح وينشر دالة Push تلقائياً
عند رفع تغييرات الخلفية إلى main. يلزم إعداد GitHub environment باسم production
وإضافة سر SUPABASE_ACCESS_TOKEN مرة واحدة؛ ويمكن ضبط SUPABASE_DB_PASSWORD إذا
طلبه ربط CLI. الأسرار تبقى على جهة النشر ولا توضع في التطبيق أو المحادثة.
إعداد مفاتيح VAPID وFCM/APNs والمجدول أدناه مطلوب أيضاً لتسليم Push بالخلفية.
تسجيل الدخول إلى لوحة Supabase في المتصفح لا يسجّل CLI تلقائياً.

الأمر `npm run setup:push` يضبط مفاتيح Web Push على الخادم، وينشر دالة الإرسال،
ويحدّث Vault والمجدول كل دقيقة تلقائياً. يقرأ من بيئة النشر:
`WEB_PUSH_PUBLIC_KEY` و`WEB_PUSH_PRIVATE_KEY` و`WEB_PUSH_SUBJECT`
و`NOTIFICATION_CRON_SECRET`. ضعها أيضاً في GitHub environment باسم production
لاستخدام workflow. الأمر يتحقق من تطابق زوج VAPID ولا يولد مفاتيح جديدة عند
كل نشر، حفاظاً على اشتراكات الأجهزة. `npm run setup:push:preview` يعرض الخطة
دون تعديل الخادم. إعداد FCM/APNs للتطبيقات الأصلية يبقى مطلوباً بشكل منفصل.

آخر فحص في 4 أكتوبر 2026: خدمة Auth وجدول cars وصندوق التنبيهات والتذكيرات
ودالة إحصائيات الأدمن موجودة. خدمة dispatch-notifications ترجع HTTP 404،
ومفتاح إشعارات الويب غير مضبوط في إعدادات البناء المحلية؛ لذلك تسليم Push لم يُثبت بعد.
شغّل `npm run check:database` لفحص المخطط، و`npm run check:release` لفحص
المخطط ومفتاح الواجهة ووجود خدمة الإرسال. الفحصان للقراءة فقط ولا يرسلان إشعارات.

الواجهة تقبل `VITE_SUPABASE_PUBLISHABLE_KEY` أو `VITE_SUPABASE_ANON_KEY`
مع `VITE_SUPABASE_URL` لنفس المشروع. تمت إزالة الاتصال الاحتياطي بمشروع ثابت.
بعد تعديل إعدادات النشر يجب إعادة بناء الموقع. لا تستعمل service_role في الواجهة.

## 1. إصلاح الإحصائيات والإرسال داخل التطبيق

المسار الآلي هو `npm run setup:database`. للاستعادة اليدوية فقط، نفّذ ملف
`supabase/migrations/20261001010000_repair_notification_setup.sql` كاملاً.
الملف قابل لإعادة التنفيذ، ويصلح الدوال والسياسات ويعيد تحميل schema cache.
لا يحذف بيانات السيارات ولا رسائل المستخدمين.

الحساب الإداري القديم `ohsobada@gmail.com` يُضاف إذا كان بريده مؤكداً.
لإضافة مسؤول آخر، ينفذ مالك قاعدة البيانات (بعد مراجعة البريد):

```sql
insert into public.garage_admins(user_id)
select id from auth.users where email = 'ADMIN_EMAIL' and email_confirmed_at is not null
on conflict do nothing;
```

بعد التنفيذ حدّث صفحة التطبيق. يجب أن تظهر الإحصائيات. الإرسال يحفظ نسخة لكل
حساب موجود وقت الإرسال؛ الحسابات الجديدة لا تُحسب ضمن الإرسالات السابقة.
لا تمنح المستخدمين العاديين صلاحيات الكتابة في جدول garage_admins.

## 2. إشعارات الخلفية والآيفون

الموقع يحتاج HTTPS، وiOS/iPadOS 16.4 أو أحدث. في Safari: مشاركة ← إضافة إلى
الشاشة الرئيسية، ثم افتح الأيقونة وفعّل الإشعارات من إعدادات كراج. زر التفعيل
يجب ضغطه من المستخدم. السماح بإشعارات Safari وحده لا يكفي.

جهّز زوج VAPID مرة واحدة باستخدام `web-push generate-vapid-keys`.
في إعدادات بناء الموقع ضع `VITE_WEB_PUSH_PUBLIC_KEY` ثم أعد البناء والنشر.
المفتاح العام نفسه يوضع في أسرار الخادم. لا تضع أي مفتاح خاص في VITE_.

أسرار Supabase Edge Functions:

| السر | الاستخدام |
| --- | --- |
| WEB_PUSH_PUBLIC_KEY | مفتاح VAPID العام المطابق للواجهة |
| WEB_PUSH_PRIVATE_KEY | مفتاح VAPID الخاص |
| WEB_PUSH_SUBJECT | mailto: بعنوان الدعم |
| NOTIFICATION_CRON_SECRET | قيمة عشوائية طويلة لنداء المجدول |
| FCM_SERVICE_ACCOUNT | JSON حساب خدمة Firebase لإرسال Android |
| APNS_PRIVATE_KEY | مفتاح Apple بصيغة .p8 |
| APNS_KEY_ID / APNS_TEAM_ID | معرّفات Apple |
| APNS_BUNDLE_ID | com.obada.garage.app |
| APNS_SANDBOX | true لبناء التطوير فقط؛ false للإنتاج/TestFlight |

انشر الدالة على المشروع الصحيح:

```sh
supabase functions deploy dispatch-notifications --project-ref ufaqfqcbovgkpqlujnxo
```

في Supabase Vault أضف `garage_project_url` بالقيمة
`https://ufaqfqcbovgkpqlujnxo.supabase.co` و`garage_notification_cron_secret` بنفس
قيمة NOTIFICATION_CRON_SECRET. نفّذ `supabase/setup-notification-cron.sql` لتشغيل
المعالجة كل دقيقة. أسرار VAPID وFCM/APNs لا تُرسل للمستخدمين.

## 3. تطبيقات Android وiOS الأصلية

نفّذ `npm install` و`npm run build` و`npx cap sync`.
Android يحتاج `android/app/google-services.json` للمشروع الصحيح.
Workflow بناء Android يقرأ `GOOGLE_SERVICES_JSON` من أسرار production ويتحقق من
معرّف التطبيق، ويقرأ إعدادات Supabase العامة من `VITE_SUPABASE_URL` و
`VITE_SUPABASE_PUBLISHABLE_KEY` (أو `VITE_SUPABASE_ANON_KEY`). لا ينشر نسخة
بإعدادات اتصال ناقصة. مفتاح حساب خدمة FCM يبقى في أسرار الخادم فقط.
iOS يحتاج تفعيل Push Notifications capability في Xcode وتوقيع التطبيق مع
entitlement الخاص بـ aps-environment. تم توصيل callbacks في AppDelegate، لكن
الشهادات والتوقيع يجب ضبطها في حساب Apple. أعد بناء التطبيق وثبّته.

## 4. تذكرني والتحقق

«تذكرني» يحفظ جلسة Supabase الفعلية ويجددها تلقائياً. إلغاؤه يستخدم تخزين جلسة
المتصفح. راجع إعدادات Supabase Auth: لا تضبط Inactivity timeout أو Time-box أو
Single session إذا أردت بقاء الدخول على كل الأجهزة. لا يمكن للواجهة تجاوز
جلسة ألغيت من الخادم. إرسال Push من الخادم لا يحتاج أن يبقى التطبيق مفتوحاً.

اختبر على حسابين وعلى جهازين للحساب نفسه: فعّل كل جهاز، أغلق التطبيق، أرسل
من الأدمن، ثم افتح مركز التنبيهات في الحساب الآخر. اختبر تذكيراً بعد دقيقتين
وتكراره وتعديله وحذفه. جرّب رفض الصلاحية وإعادة فتح التطبيق بعد انتهاء access
token. «قبله مزوّد Push» لا يثبت عرضه؛ تحقق فعلياً من شاشة كل جهاز. انقطاع
الشبكة أو إعدادات التركيز/النظام قد تؤخر العرض.

الاختبارات المحلية: `node --test tests/notifications.test.mjs` و
`npx tsc --noEmit -p tsconfig.app.json` و`npm run build`.

الفحص الكامل: `npm test` و`npm run typecheck` و`npm run lint` و`npm run build`.
يشمل اختبارات القراءة عند فتح الرسالة، فتح الرسالة من Push، حفظ جلسة «تذكرني»،
وصلاحيات قاعدة البيانات والتوزيع لكل الحسابات والأجهزة ومنع تكرار البث.

أزيل مفتاح Telegram المكتوب مباشرة في دالة البوت القديمة. يجب إلغاء المفتاح
القديم واستبداله في خدمة Telegram ثم ضبط `TELEGRAM_BOT_TOKEN` في أسرار الخادم؛
حذفه من الملف الحالي لا يحذفه من تاريخ المستودع.
دالة Telegram القديمة تتطلب أيضاً `TELEGRAM_WEBHOOK_SECRET` المطابق لقيمة
`secret_token` عند تسجيل webhook؛ الطلبات غير الموقعة ترفض. دخول كراج الحالي
يستخدم Supabase Auth ولا يعتمد على هذا البوت القديم.

المراجع الرسمية: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
و https://capacitorjs.com/docs/apis/push-notifications
و https://supabase.com/docs/guides/auth/sessions

