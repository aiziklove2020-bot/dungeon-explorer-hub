/**
 * Minimal service worker — exists only to make the site an installable PWA
 * (Chrome/Android require a fetch handler for installability, which in turn
 * lets it be wrapped as an APK / TWA).
 *
 * Intentionally does NO caching: every request passes straight through to the
 * network, so the installed app always shows the same live, in-sync content as
 * the website. If offline caching is ever wanted, add it here — but that would
 * trade freshness for offline support.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  // No respondWith() — the browser handles the request normally (network).
});

// Web Push: shows a notification even when the site/app isn't open. The
// payload is JSON set by api/send-push.js: { title, body, url }.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'LIBRAL PARTY', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'LIBRAL PARTY';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
