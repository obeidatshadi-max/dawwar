/* global self, clients */
// Imported into the Workbox service worker via vite-plugin-pwa importScripts.
// Handles real web-push delivery (works while browser is closed).

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch (_e) { /* non-JSON payload */ }

  const title = data.title || 'دوّار'
  const options = {
    body: data.body || 'لديك إشعار جديد',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'dawwar',
    dir: 'rtl',
    lang: 'ar',
    data: { url: data.url || '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.includes(target) && 'focus' in w) return w.focus()
      }
      if (clients.openWindow) return clients.openWindow(target)
    })
  )
})
