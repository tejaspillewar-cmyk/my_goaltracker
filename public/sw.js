// Service Worker for Web Push Notifications
// Handles incoming push events and shows OS-level notifications

// ── Update behaviour ────────────────────────────────────────────────────────
// skipWaiting: new SW activates immediately instead of waiting for all tabs to close
// clients.claim: the new SW takes control of every open page right away
// Together these ensure that after a Vercel deploy the home-screen PWA picks up
// the new version on the very next app launch (no reinstall needed).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) =>
  event.waitUntil(self.clients.claim())
);
// ────────────────────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Reminder', body: event.data.text() };
  }

  const { title = '⏰ Reminder', body = '', icon = '/favicon.ico' } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: icon,
      tag: 'life-tracker-reminder',  // replaces previous notification of same tag
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // Focus existing window if open
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) return clients.openWindow('/reminders');
    })
  );
});
