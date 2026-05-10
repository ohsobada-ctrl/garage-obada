import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const NotificationService = {
  async requestPermissions() {
    try {
      if (Capacitor.getPlatform() === 'web') {
        if (!('Notification' in window)) {
          console.warn('This browser does not support desktop notification');
          return 'denied';
        }
        
        const permission = await Notification.requestPermission();
        return permission === 'granted' ? 'granted' : 'denied';
      }

      const result = await LocalNotifications.requestPermissions();
      return result.display;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return 'denied';
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
            smallIcon: 'res://drawable/ic_stat_name', // Good practice for Android
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
        await LocalNotifications.createChannel({
          id: 'maintenance-alerts',
          name: 'تنبيهات الصيانة',
          importance: 5,
          description: 'تنبيهات هامة لمواعيد الصيانة',
          sound: 'default',
          visibility: 1,
          vibration: true
        });
      }
    } catch (error) {
      console.error('Error creating notification channel:', error);
    }
  }
};
