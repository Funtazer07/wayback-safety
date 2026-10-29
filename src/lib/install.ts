export function isInstalled() {
  const isStandaloneOnIphone = 'standalone' in navigator && navigator.standalone === true
  return isStandaloneOnIphone || window.matchMedia?.('(display-mode: standalone)').matches === true
}

export function isIphone() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
}
