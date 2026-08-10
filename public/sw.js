// Service Worker for background push notifications
// This file is registered when the user grants notification permissions

const CACHE_NAME = 'garage-sw-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Listen for messages from the main app to store scheduled alerts
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATIONS') {
    const { notifications } = event.data;
    scheduleNotifications(notifications);
  }

  if (event.data && event.data.type === 'CLEAR_NOTIFICATIONS') {
    clearScheduledNotifications();
  }
});

// Store scheduled timeouts
const scheduledTimers = [];

function clearScheduledNotifications() {
  scheduledTimers.forEach(id => clearTimeout(id));
  scheduledTimers.length = 0;
}

function scheduleNotifications(notifications) {
  clearScheduledNotifications();

  notifications.forEach((notification) => {
    const delay = new Date(notification.at).getTime() - Date.now();
    if (delay <= 0) return; // Skip already-past notifications

    const timerId = setTimeout(() => {
      self.registration.showNotification(notification.title, {
        body: notification.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.tag || 'garage-alert',
        requireInteraction: false,
        silent: false,
      });
    }, delay);

    scheduledTimers.push(timerId);
  });
}

// Handle notification click: open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
