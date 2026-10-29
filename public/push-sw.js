// Shows push notifications. Loaded by the generated sw.js (see vite.config.ts), so it is plain
// JavaScript that Vite does not touch.

self.addEventListener('push', (event) => {
  let message = { title: 'WayBack Safety' }
  try {
    message = { ...message, ...event.data.json() }
  } catch {
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

// An open app reloads from the server at once instead of waiting for its next check.
function tellOpenApp() {
  return self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((windows) => windows.forEach((client) => client.postMessage({ type: 'wayback-push' })))
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url ?? '', self.registration.scope).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => client.url.startsWith(self.registration.scope))
      // navigate() fails for a window this worker does not control yet.
      if (open) return open.focus().then(() => open.navigate(url).catch(() => open))
      return self.clients.openWindow(url)
    }),
  )
})
