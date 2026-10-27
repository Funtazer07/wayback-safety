/** Every push means a walk changed on the server. Returns a function that stops listening. */
export function onPushMessage(onPush: () => void): () => void {
  if (!('serviceWorker' in navigator)) return () => {}
  const serviceWorker = navigator.serviceWorker

  function handleMessage(event: MessageEvent) {
    if (event.data?.type === 'wayback-push') onPush()
  }

  serviceWorker.addEventListener('message', handleMessage)
  return () => serviceWorker.removeEventListener('message', handleMessage)
}
