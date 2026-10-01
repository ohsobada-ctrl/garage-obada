import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from '@/integrations/supabase/client';

function deviceId() {
  let id = localStorage.getItem('garage_device_id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('garage_device_id', id); }
  return id;
}
async function saveDevice(values: { platform: string; token?: string; subscription?: PushSubscriptionJSON }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('سجّل دخولك أولاً');
  const { error } = await supabase.from('push_devices').upsert({ id: deviceId(), user_id: user.id, ...values, enabled: true, updated_at: new Date().toISOString() });
  if (error) throw error;
  localStorage.setItem('garage_push_enabled', 'true');
  window.dispatchEvent(new Event('garage_push_changed'));
}
let registration: Promise<void> | null = null;
async function registerNative() {
  if (registration) return registration;
  registration = (async () => {
    let resolveToken: (token: string) => void;
    let rejectToken: (error: Error) => void;
    const tokenPromise = new Promise<string>((resolve, reject) => { resolveToken = resolve; rejectToken = reject; });
    const success = await PushNotifications.addListener('registration', token => resolveToken(token.value));
    const failure = await PushNotifications.addListener('registrationError', () => rejectToken(new Error('تعذر تسجيل الجهاز بخدمة الإشعارات')));
    const timer = setTimeout(() => rejectToken(new Error('انتهت مهلة تسجيل الإشعارات، حاول مجدداً')), 20000);
    try {
      await PushNotifications.register();
      const token = await tokenPromise;
      await saveDevice({ platform: Capacitor.getPlatform(), token });
    } finally { clearTimeout(timer); await success.remove(); await failure.remove(); }
  })().finally(() => { registration = null; });
  return registration;
}
export const NotificationService = {
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) throw new Error('هذا المتصفح لا يدعم إشعارات الخلفية');
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return navigator.serviceWorker.ready;
  },
  async createChannel() {
    if (Capacitor.getPlatform() === 'android') await PushNotifications.createChannel({ id: 'garage-push', name: 'إشعارات كراج', importance: 5, visibility: 1, vibration: true, sound: 'default' });
  },
  async enable(prompt = true) {
    if (Capacitor.isNativePlatform()) {
      const permission = prompt ? await PushNotifications.requestPermissions() : await PushNotifications.checkPermissions();
      if (permission.receive !== 'granted') throw new Error('اسمح بالإشعارات من إعدادات الجهاز');
      await NotificationService.createChannel();
      await registerNative();
    } else {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone;
      if (ios && !standalone) throw new Error('على آيفون: افتح الموقع في Safari ← مشاركة ← إضافة إلى الشاشة الرئيسية. افتح أيقونة كراج ثم فعّل الإشعارات. يلزم iOS 16.4 أو أحدث');
      if (!window.isSecureContext) throw new Error('إشعارات الخلفية تحتاج رابط HTTPS آمن');
      if (!('Notification' in window) || !('PushManager' in window)) throw new Error('المتصفح لا يدعم Push. على آيفون ثبّت التطبيق على الشاشة الرئيسية أولاً');
      const key = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;
      if (!key) throw new Error('إعداد إشعارات الموقع ناقص: يلزم ضبط VITE_WEB_PUSH_PUBLIC_KEY وإعادة نشر الموقع');
      const permission = prompt ? await Notification.requestPermission() : Notification.permission;
      if (permission !== 'granted') throw new Error('اسمح بالإشعارات من إعدادات الجهاز أو المتصفح، ثم أعد المحاولة');
      const reg = await NotificationService.registerServiceWorker();
      let subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        const normalized = key.replace(/-/g, '+').replace(/_/g, '/');
        const bytes = Uint8Array.from(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')), c => c.charCodeAt(0));
        subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
      }
      await saveDevice({ platform: 'web', subscription: subscription.toJSON() });
    }
    // Retire legacy schedules after the device is registered; all reminders now use one server queue.
    if (Capacitor.isNativePlatform()) {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length) await LocalNotifications.cancel(pending);
    }
  },
  async disable() {
    const id = localStorage.getItem('garage_device_id');
    if (id) {
      const { error } = await supabase.from('push_devices').delete().eq('id', id);
      if (error) throw error;
    }
    if (Capacitor.isNativePlatform()) {
      await PushNotifications.unregister();
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length) await LocalNotifications.cancel(pending);
    } else if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration('/');
      await (await reg?.pushManager.getSubscription())?.unsubscribe();
    }
    localStorage.setItem('garage_push_enabled', 'false');
    localStorage.removeItem('garage_device_id');
    window.dispatchEvent(new Event('garage_push_changed'));
  },
  async requestPermissions() {
    await NotificationService.enable();
    return 'granted';
  },
};
