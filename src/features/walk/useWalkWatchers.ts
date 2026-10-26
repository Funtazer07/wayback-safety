import { useEffect, useState } from 'react'
import { onPushMessage } from '../../lib/pushMessages.ts'
import { fetchWalkWatchers } from './walk.ts'

// Assumption: every 30 seconds is soon enough to see "Mum is watching", like the contact's own
// screens (useContactWalks.ts), and light on the battery during a walk.
const THIRTY_SECONDS = 30_000

/**
 * Who tapped "I'm watching" on this walk (SCRUM-114), kept up to date while the walk screen is open:
 * every 30 seconds, when the app comes back on screen, and when a push message arrives. Pass null
 * to load nothing, for example after the walk ended.
 */
export function useWalkWatchers(walkId: string | null): string[] {
  const [names, setNames] = useState<string[]>([])

  useEffect(() => {
    if (!walkId) return

    let isCurrent = true
    // A failed check keeps what is on screen; the next one tries again. The walk itself does not
    // depend on this line.
    const load = () =>
      fetchWalkWatchers(walkId)
        .then((found) => isCurrent && setNames(found))
        .catch(() => {})
    const loadWhenBackOnScreen = () => document.visibilityState === 'visible' && load()

    load()
    const timer = setInterval(load, THIRTY_SECONDS)
    document.addEventListener('visibilitychange', loadWhenBackOnScreen)
    const stopListening = onPushMessage(load)
    return () => {
      isCurrent = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', loadWhenBackOnScreen)
      stopListening()
    }
  }, [walkId])

  return names
}
