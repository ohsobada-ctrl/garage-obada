self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
// Browser timers cannot deliver after the browser stops the worker. Only real push does.
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data?.json() || {}; } catch { data = { body: event.data?.text() }; }
  event.waitUntil(self.registration.showNotification(data.title || 'كراج', {
    body: data.body || '', icon: '/favicon.ico', tag: data.id || 'garage', data: { url: '/' },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async list => {
    const client = list.find(item => new URL(item.url).origin === self.location.origin);
    if (client) { await client.navigate('/'); return client.focus(); }
    return self.clients.openWindow('/');
  }));
});
