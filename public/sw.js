self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
// Browser timers cannot deliver after the browser stops the worker. Only real push does.
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data?.json() || {}; } catch { data = { body: event.data?.text() }; }
  event.waitUntil(self.registration.showNotification(data.title || 'كراج', {
    body: data.body || '', icon: '/app-icon-192.png', tag: data.id || 'garage', data: { url: data.id ? '/?notification=' + encodeURIComponent(data.id) : '/' },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin);
  const url = target.origin === self.location.origin ? target.href : self.location.origin + '/';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async list => {
    const client = list.find(item => new URL(item.url).origin === self.location.origin);
    if (client) { await client.navigate(url); return client.focus(); }
    return self.clients.openWindow(url);
  }));
});
