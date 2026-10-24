/** True when the app was opened from the home screen, so there is nothing left to install. */
export function isInstalled() {
  const isStandaloneOnIphone = 'standalone' in navigator && navigator.standalone === true
  return isStandaloneOnIphone || window.matchMedia?.('(display-mode: standalone)').matches === true
}

/** iPhones and iPads install from Safari's Share menu; every other phone from the browser menu. */
export function isIphone() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
}
