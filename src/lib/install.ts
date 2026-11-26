export function isInstalled() {
  const isStandaloneOnIphone = 'standalone' in navigator && navigator.standalone === true
  return isStandaloneOnIphone || window.matchMedia?.('(display-mode: standalone)').matches === true
}

export function isIphone() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
}

/** Chrome's own "Install app" prompt on Android. TypeScript does not know this event yet. */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let savedPrompt: InstallPromptEvent | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => listener())
}

/** Call once at start-up: Chrome offers the prompt early, often before Home is on screen. */
export function listenForInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Keep it for our own Install button instead of letting Chrome decide when to show it.
    event.preventDefault()
    savedPrompt = event as InstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    savedPrompt = null
    notify()
  })
}

export function canShowInstallPrompt() {
  return savedPrompt !== null
}

export function subscribeToInstallPrompt(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Chrome lets a prompt be shown only once. Resolves true when the user installed the app. */
export async function showInstallPrompt() {
  const installPrompt = savedPrompt
  if (!installPrompt) return false
  savedPrompt = null
  notify()
  await installPrompt.prompt()
  const { outcome } = await installPrompt.userChoice
  return outcome === 'accepted'
}
