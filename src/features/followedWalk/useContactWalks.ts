import { useEffect, useState } from 'react'
import { fetchContactWalks, type ContactWalk } from './followedWalk.ts'

// Assumption: the same 30 seconds as the walk view (useFollowedWalk.ts), so the tab and the walk
// screen agree, without draining the battery.
const THIRTY_SECONDS = 30_000

/**
 * The latest walk of each person the user looks out for, for the Contacts tab (SCRUM-115). Asked
 * for again every 30 seconds and when the app comes back on screen, so "On the way" turns into
 * "Home safe" or "Check-in overdue" without reloading.
 */
export function useContactWalks(): ContactWalk[] {
  const [walks, setWalks] = useState<ContactWalk[]>([])

  useEffect(() => {
    let isCurrent = true
    // The contacts list has its own error message for a lost connection, and the alert itself
    // (SCRUM-74) still reaches the contact. A failed check keeps what is on screen; the next one
    // tries again.
    const load = () =>
      fetchContactWalks()
        .then((found) => isCurrent && setWalks(found))
        .catch(() => {})
    const loadWhenBackOnScreen = () => document.visibilityState === 'visible' && load()

    load()
    const timer = setInterval(load, THIRTY_SECONDS)
    document.addEventListener('visibilitychange', loadWhenBackOnScreen)
    return () => {
      isCurrent = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', loadWhenBackOnScreen)
    }
  }, [])

  return walks
}
