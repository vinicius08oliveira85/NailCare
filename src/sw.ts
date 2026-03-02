import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare let self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
self.skipWaiting();
clientsClaim();

self.addEventListener('push', (event: PushEvent) => {
  let title = 'NailCare';
  let body = '';
  if (event.data) {
    try {
      const data = event.data.json() as { title?: string; body?: string };
      if (data.title) title = data.title;
      if (data.body != null) body = data.body;
    } catch {
      // ignore
    }
  }
  event.waitUntil(self.registration.showNotification(title, { body }));
});
