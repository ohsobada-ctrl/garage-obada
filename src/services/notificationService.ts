import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Car } from '@/types/car';
import { supabase } from "@/integrations/supabase/client";

export const NotificationService = {
  async initPushNotifications() {
    try {
      if (!Capacitor.isNativePlatform()) return;
      await LocalNotifications.requestPermissions();
    } catch (e) {
      console.error('Notification Init Error:', e);
    }
  },

  async requestPermissions() {
    try {
      if (Capacitor.getPlatform() === 'web') {
        if (!('Notification' in window)) {
          console.warn('This browser does not support desktop notification');
          return 'denied';
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // Register Service Worker for background notifications
          await NotificationService.registerServiceWorker();
        }
        return permission === 'granted' ? 'granted' : 'denied';
      }

      const result = await LocalNotifications.requestPermissions();
      return result.display;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return 'denied';
    }
  },

  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    try {
      if (!('serviceWorker' in navigator)) return null;
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('Service Worker registered:', reg.scope);
      return reg;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  },

  async scheduleMaintenanceAlerts(carName: string) {
    try {
      const isPushSupported = Capacitor.isPluginAvailable('LocalNotifications');
      
      if (!isPushSupported && Capacitor.getPlatform() === 'web') {
        // Fallback for web if plugin not available or on plain web
        if (Notification.permission === 'granted') {
          // Web notifications don't support future scheduling in the same way as native without Service Workers
          // But we can show an immediate one to confirm it works
          new Notification('تذكير صيانة', {
            body: `تم تفعيل تذكيرات الصيانة لـ ${carName}`,
            icon: '/favicon.ico'
          });
        }
        return;
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'تذكير صيانة',
            body: `حان موعد فحص ${carName}`,
            id: Math.floor(Math.random() * 100000),
            schedule: { at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) }, // 30 days
            sound: 'default',
            channelId: 'maintenance-alerts',
            actionTypeId: "MAINTENANCE_REMINDER",
          }
        ]
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  },

  async createChannel() {
    try {
      if (Capacitor.getPlatform() === 'android') {
        // Delete old cached channels if they exist to force sound settings refresh
        try {
          await LocalNotifications.deleteChannel({ id: 'maintenance-alerts' });
          await LocalNotifications.deleteChannel({ id: 'default-channel' });
        } catch (_) {}

        // Create high importance maintenance channel v2
        await LocalNotifications.createChannel({
          id: 'maintenance-alerts-v2',
          name: 'تنبيهات الصيانة الفورية',
          importance: 5,
          description: 'تنبيهات هامة لمواعيد الصيانة مع الصوت والاهتزاز',
          sound: 'default',
          visibility: 1,
          vibration: true
        });

        // Create high importance default channel v2
        await LocalNotifications.createChannel({
          id: 'default-channel-v2',
          name: 'التنبيهات العامة المباشرة',
          importance: 5,
          description: 'تنبيهات عامة مع الصوت والاهتزاز',
          sound: 'default',
          visibility: 1,
          vibration: true
        });
      }
    } catch (error) {
      console.error('Error creating notification channel:', error);
    }
  },

  async scheduleBackgroundNotifications(cars: Car[]) {
    try {
      const notificationsToSchedule: { title: string; body: string; at: Date; tag: string }[] = [];
      const today = new Date();

      cars.forEach(car => {
        const carName = `${car.make} ${car.model}`;

        // 1. Legal Documents
        car.legalDocs.forEach(doc => {
          const expiryDate = new Date(doc.expiryDate);

          // Warning notification: 7 days before expiry
          const warningDate = new Date(expiryDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (warningDate > today) {
            notificationsToSchedule.push({
              title: `تذكير تجديد مستند`,
              body: `باقي 7 أيام على انتهاء صلاحية مستند لـ ${carName}. جهز ورقك يا بطل!`,
              at: warningDate,
              tag: `doc-warning-${car.id}-${doc.id}`,
            });
          }

          // Exact expiry notification
          if (expiryDate > today) {
            notificationsToSchedule.push({
              title: `انتهاء صلاحية مستند`,
              body: `انتهت صلاحية مستند لـ ${carName} اليوم. يرجى التجديد في أقرب وقت!`,
              at: expiryDate,
              tag: `doc-expired-${car.id}-${doc.id}`,
            });
          }
        });

        // 2. Oil Service (Based on time)
        const latestOilService = car.oilServices[car.oilServices.length - 1];
        if (latestOilService) {
          const serviceDate = new Date(latestOilService.dateOfChange);
          const expiryMonths = car.settings.oilExpiryMonths || 6;
          const expiryDate = new Date(serviceDate);
          expiryDate.setMonth(expiryDate.getMonth() + expiryMonths);

          const warningDate = new Date(expiryDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (warningDate > today) {
            notificationsToSchedule.push({
              title: `موعد تغيير الزيت`,
              body: `اقترب موعد تغيير الزيت لـ ${carName}. رفيق دربك يستاهل الدلال!`,
              at: warningDate,
              tag: `oil-warning-${car.id}`,
            });
          }
        }

        // 3. Mileage Update Reminder (15 days after last update)
        const lastUpdate = new Date(car.lastMileageUpdate || new Date());
        const reminderDate = new Date(lastUpdate.getTime() + 15 * 24 * 60 * 60 * 1000);
        if (reminderDate > today) {
          notificationsToSchedule.push({
            title: `تحديث عداد السيارة`,
            body: `مر أسبوعان على آخر تحديث لعداد ${carName}. كم وصل توه؟`,
            at: reminderDate,
            tag: `mileage-${car.id}`,
          });
        }
      });

      if (notificationsToSchedule.length === 0) return;

      // --- Web: delegate scheduling to Service Worker ---
      if (Capacitor.getPlatform() === 'web') {
        if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') return;

        let reg = await navigator.serviceWorker.getRegistration('/');
        if (!reg) reg = await NotificationService.registerServiceWorker() ?? undefined;
        if (!reg || !reg.active) return;

        reg.active.postMessage({
          type: 'SCHEDULE_NOTIFICATIONS',
          notifications: notificationsToSchedule.map(n => ({
            ...n,
            at: n.at.toISOString(),
          })),
        });
        return;
      }

      // --- Native Mobile: use Capacitor LocalNotifications ---
      if (!Capacitor.isNativePlatform()) return;

      const isPushSupported = await LocalNotifications.checkPermissions();
      if (isPushSupported.display !== 'granted') return;

      // Cancel all pending notifications to prevent duplicates
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }

      let notificationId = 1;
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule.map(n => ({
          id: notificationId++,
          title: n.title,
          body: n.body,
          schedule: { at: n.at },
          sound: 'default',
          channelId: 'maintenance-alerts-v2',
        })),
      });

    } catch (error) {
      console.error('Error scheduling background notifications:', error);
    }
  }
};
