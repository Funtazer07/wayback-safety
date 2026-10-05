// Remembers on this phone that the onboarding was finished, so it is shown only once. It is kept
// on the phone and not in the database because permissions and installing are per phone.
const key = 'wayback.onboardingDone'

export function isOnboardingDone() {
  try {
    return localStorage.getItem(key) === 'true'
  } catch {
    // Storage can be blocked (private browsing). Then the onboarding is simply shown again.
    return false
  }
}

export function markOnboardingDone() {
  try {
    localStorage.setItem(key, 'true')
  } catch {
    // See isOnboardingDone.
  }
}

/** True when the app was opened from the home screen, so the install step can be skipped. */
export function isInstalled() {
  const isStandaloneOnIphone = 'standalone' in navigator && navigator.standalone === true
  return isStandaloneOnIphone || window.matchMedia?.('(display-mode: standalone)').matches === true
}
