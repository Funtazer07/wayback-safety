// SCRUM-68: shows push notifications, also when the phone is locked or the app is closed.
//
// vite-plugin-pwa writes the main service worker (sw.js) for us. That one only handles offline
// files, so vite.config.ts tells it to load this small file as well (workbox.importScripts).
// Plain JavaScript on purpose: the browser loads it as it is, without Vite.
//
// The server (SCRUM-69, SCRUM-73) sends a message as JSON: { "title", "body", "url" }. Only the
// title is required. The url says which page opens when the notification is tapped.

self.addEventListener('push', (event) => {
  let message = { title: 'WayBack Safety' }
  try {
    message = { ...message, ...event.data.json() }
  } catch {
    // Not JSON (or empty): show the text as it came, under the app name.
    if (event.data) message.body = event.data.text()
  }

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(message.title, {
        body: message.body,
        icon: 'pwa-192x192.png',
        badge: 'pwa-64x64.png',
        data: { url: message.url },
      }),
      tellOpenApp(),
    ]),
  )
})

// A push means something changed on the server: a walk started, ended or became overdue. An app
// that is open on this phone hears it at once and asks the server again, instead of waiting for
// its next check (src/lib/pushMessages.ts). Nothing from the message is passed on: the app reads
// the news from the server itself.
function tellOpenApp() {
  return self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((windows) => windows.forEach((client) => client.postMessage({ type: 'wayback-push' })))
}

// Tapping the notification brings the app to the front, or opens it if it was closed.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  // Relative to the service worker, so it works in the subfolder of the live site too.
  const url = new URL(event.notification.data?.url ?? '', self.registration.scope).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => client.url.startsWith(self.registration.scope))
      // navigate() can fail for a window this worker does not control yet; then the app is at
      // least in front.
      if (open) return open.focus().then(() => open.navigate(url).catch(() => open))
      return self.clients.openWindow(url)
    }),
  )
})
