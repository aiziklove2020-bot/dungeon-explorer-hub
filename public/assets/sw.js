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
