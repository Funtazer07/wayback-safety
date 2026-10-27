import { useEffect, useState } from 'react'
import { onPushMessage } from '../../lib/pushMessages.ts'
import { fetchWalkWatchers } from './walk.ts'

// Assumption: the same as the contact's own screens.
const THIRTY_SECONDS = 30_000

/** Pass null to load nothing, for example after the walk ended. */
export function useWalkWatchers(walkId: string | null): string[] {
  const [names, setNames] = useState<string[]>([])

  useEffect(() => {
    if (!walkId) return

    let isCurrent = true
    // A failed check keeps what is on screen; the next one tries again.
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
