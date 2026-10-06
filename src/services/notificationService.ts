import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from '@/integrations/supabase/client';

function deviceId() {
  let id = localStorage.getItem('garage_device_id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('garage_device_id', id); }
  return id;
}
let registrationVersion = 0;
const pendingEnables = new Set<Promise<void>>();
let disabling: Promise<void> | null = null;
function assertRegistrationCurrent(version: number) {
  if (version !== registrationVersion) throw new Error('تم إيقاف تفعيل الإشعارات');
}
async function saveDevice(values: { platform: string; token?: string; subscription?: PushSubscriptionJSON }, version: number) {
  assertRegistrationCurrent(version);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('سجّل دخولك أولاً');
  assertRegistrationCurrent(version);
  const { error } = await supabase.from('push_devices').upsert({ id: deviceId(), user_id: user.id, ...values, enabled: true, updated_at: new Date().toISOString() });
  if (error) throw error;
  assertRegistrationCurrent(version);
  localStorage.setItem('garage_push_enabled', 'true');
  window.dispatchEvent(new Event('garage_push_changed'));
}
let registration: Promise<void> | null = null;
async function registerNative(version: number) {
  if (registration) return registration;
  registration = (async () => {
    let resolveToken: (token: string) => void;
    let rejectToken: (error: Error) => void;
    const tokenPromise = new Promise<string>((resolve, reject) => { resolveToken = resolve; rejectToken = reject; });
    // Attach the handler before register() can fail or the timeout can fire.
    void tokenPromise.catch(() => {});
    const success = await PushNotifications.addListener('registration', token => resolveToken(token.value));
    const failure = await PushNotifications.addListener('registrationError', () => rejectToken(new Error('تعذر تسجيل الجهاز بخدمة الإشعارات')));
    const timer = setTimeout(() => rejectToken(new Error('انتهت مهلة تسجيل الإشعارات، حاول مجدداً')), 20000);
    try {
      await PushNotifications.register();
      const token = await tokenPromise;
      await saveDevice({ platform: Capacitor.getPlatform(), token }, version);
    } finally { clearTimeout(timer); await success.remove(); await failure.remove(); }
  })().finally(() => { registration = null; });
  return registration;
}
export const NotificationService = {
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) throw new Error('هذا المتصفح لا يدعم إشعارات الخلفية');
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    let timer: ReturnType<typeof setTimeout>;
    try {
      return await Promise.race([navigator.serviceWorker.ready, new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('تعذر تشغيل خدمة الإشعارات. حدّث التطبيق وحاول مجدداً')), 15000);
      })]);
    } finally { clearTimeout(timer); }
  },
  async getStatus(): Promise<{ active: boolean; title: string; detail: string; canEnable: boolean }> {
    const inactive = (title: string, detail: string, canEnable = true) => ({ active: false, title, detail, canEnable });
    if (!Capacitor.isNativePlatform()) {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone;
      if (ios && !standalone) return inactive('أضف كراج إلى الشاشة الرئيسية', 'من Safari اضغط مشاركة، ثم إضافة إلى الشاشة الرئيسية. افتح أيقونة كراج لتفعيل الإشعارات.', false);
      if (!window.isSecureContext || !('Notification' in window) || !('PushManager' in window)) return inactive('الإشعارات غير مدعومة هنا', 'استخدم متصفحاً حديثاً ورابطاً آمناً. على آيفون يلزم iOS 16.4 أو أحدث.', false);
      if (!import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY) return inactive('خدمة الإشعارات قيد التجهيز', 'تظل رسائلك متاحة داخل مركز التنبيهات.', false);
      if (Notification.permission === 'denied') return inactive('الإشعارات محظورة', 'اسمح بإشعارات كراج من إعدادات الجهاز ثم ارجع للتطبيق.', false);
      if (Notification.permission !== 'granted') return inactive('فعّل تذكيراتك', 'اسمح لكراج بتنبيهك بمواعيد الصيانة حتى بعد إغلاق التطبيق.');
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (!await reg?.pushManager?.getSubscription()) return inactive('الإشعارات غير مفعّلة', 'فعّل الإشعارات على هذا الجهاز لاستقبال تذكيراتك.');
    } else {
      const permission = await PushNotifications.checkPermissions();
      if (permission.receive !== 'granted') return inactive('الإشعارات غير مفعّلة', 'اسمح بالإشعارات من إعدادات الجهاز أو اضغط تفعيل.');
    }
    const id = localStorage.getItem('garage_device_id');
    if (!id) return inactive('الإشعارات غير مفعّلة', 'سجّل هذا الجهاز لاستقبال تذكيراتك.');
    const { data, error } = await supabase.from('push_devices').select('enabled').eq('id', id).maybeSingle();
    if (error) return inactive('تعذر التحقق من الإشعارات', 'تحقق من الاتصال وأعد المحاولة. تظل رسائلك متاحة في مركز التنبيهات.');
    return data?.enabled ? { active: true, title: 'هذا الجهاز مسجّل للإشعارات', detail: 'تتحكم إعدادات الجهاز في الصوت وعرض التنبيهات.', canEnable: true }
      : inactive('يلزم تجديد تفعيل الإشعارات', 'اضغط تفعيل لربط هذا الجهاز بتذكيراتك.');
  },
  async createChannel() {
    if (Capacitor.getPlatform() === 'android') await PushNotifications.createChannel({ id: 'garage-push', name: 'إشعارات كراج', importance: 5, visibility: 1, vibration: true, sound: 'default' });
  },
  enable(prompt = true) {
    if (disabling) return Promise.reject(new Error('انتظر اكتمال إيقاف الإشعارات ثم أعد المحاولة'));
    const version = registrationVersion;
    const work = (async () => {
    if (Capacitor.isNativePlatform()) {
      const permission = prompt ? await PushNotifications.requestPermissions() : await PushNotifications.checkPermissions();
      if (permission.receive !== 'granted') throw new Error('اسمح بالإشعارات من إعدادات الجهاز');
      assertRegistrationCurrent(version);
      await NotificationService.createChannel();
      await registerNative(version);
    } else {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone;
      if (ios && !standalone) throw new Error('على آيفون: افتح الموقع في Safari ← مشاركة ← إضافة إلى الشاشة الرئيسية. افتح أيقونة كراج ثم فعّل الإشعارات. يلزم iOS 16.4 أو أحدث');
      if (!window.isSecureContext) throw new Error('إشعارات الخلفية تحتاج رابط HTTPS آمن');
      if (!('Notification' in window) || !('PushManager' in window)) throw new Error('المتصفح لا يدعم Push. على آيفون ثبّت التطبيق على الشاشة الرئيسية أولاً');
      const key = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;
      if (!key) throw new Error('خدمة إشعارات الجهاز قيد التجهيز. رسائلك متاحة داخل مركز التنبيهات');
      const permission = prompt ? await Notification.requestPermission() : Notification.permission;
      if (permission !== 'granted') throw new Error('اسمح بالإشعارات من إعدادات الجهاز أو المتصفح، ثم أعد المحاولة');
      assertRegistrationCurrent(version);
      const reg = await NotificationService.registerServiceWorker();
      let subscription = await reg.pushManager.getSubscription();
      const normalized = key.replace(/-/g, '+').replace(/_/g, '/');
      const bytes = Uint8Array.from(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')), c => c.charCodeAt(0));
      if (bytes.length !== 65 || bytes[0] !== 4) throw new Error('تعذر إعداد خدمة الإشعارات. تواصل مع الدعم');
      const oldKey = subscription?.options.applicationServerKey;
      if (subscription && oldKey && !new Uint8Array(oldKey).every((value, index) => value === bytes[index])) {
        await subscription.unsubscribe(); subscription = null;
      }
      if (!subscription) {
        subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
      }
      await saveDevice({ platform: 'web', subscription: subscription.toJSON() }, version);
    }
    // Retire legacy schedules after the device is registered; all reminders now use one server queue.
    if (Capacitor.isNativePlatform()) {
      try {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length) await LocalNotifications.cancel(pending);
      } catch { /* Legacy local permissions do not determine Push registration. */ }
    }
    })();
    pendingEnables.add(work);
    return work.finally(() => { pendingEnables.delete(work); });
  },
  disable() {
    if (disabling) return disabling;
    registrationVersion++;
    disabling = (async () => {
    // An automatic renewal may be waiting on the network when logout starts.
    // Drain it before deleting the server row so it cannot reattach afterwards.
    await Promise.allSettled([...pendingEnables]);
    const id = localStorage.getItem('garage_device_id');
    if (id) {
      const { error } = await supabase.from('push_devices').delete().eq('id', id);
      if (error) throw error;
    }
    if (Capacitor.isNativePlatform()) {
      // Server detachment above is authoritative. OS cleanup must not trap a user
      // in their account after the backend has already stopped deliveries.
      await PushNotifications.unregister().catch(() => {});
      try {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length) await LocalNotifications.cancel(pending);
      } catch { /* The OS may deny access after permissions were revoked. */ }
    } else if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration('/');
        await (await reg?.pushManager?.getSubscription())?.unsubscribe();
      } catch { /* Server detachment already stopped deliveries to this device. */ }
    }
    localStorage.setItem('garage_push_enabled', 'false');
    localStorage.removeItem('garage_device_id');
    window.dispatchEvent(new Event('garage_push_changed'));
    })().finally(() => { disabling = null; });
    return disabling;
  },
  async requestPermissions() {
    await NotificationService.enable();
    return 'granted';
  },
};
