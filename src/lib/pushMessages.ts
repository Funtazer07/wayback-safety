/**
 * Calls `onPush` each time a push message reaches this phone while the app is open. The service
 * worker (public/push-sw.js) passes every push on, because a push means a walk changed on the
 * server. Screens use it to ask the server again at once, instead of waiting for their next check.
 * Returns a function that stops listening.
 *
 * Without notifications nothing arrives here; the screens' own regular checks still work then.
 */
export function onPushMessage(onPush: () => void): () => void {
  if (!('serviceWorker' in navigator)) return () => {}
  // Kept, so stopping removes the listener from the same place it was added to.
  const serviceWorker = navigator.serviceWorker

  function handleMessage(event: MessageEvent) {
    if (event.data?.type === 'wayback-push') onPush()
  }

  serviceWorker.addEventListener('message', handleMessage)
  return () => serviceWorker.removeEventListener('message', handleMessage)
}
