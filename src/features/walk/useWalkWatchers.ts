import { useEffect, useState } from 'react'
import { onPushMessage } from '../../lib/pushMessages.ts'
import { fetchWalkWatchers } from './walk.ts'

// "I'm watching" sends the walker no push, so asking often is the only way it shows quickly.
// Assumption: every 5 seconds while the walk screen is open is quick enough and costs little.
const FIVE_SECONDS = 5_000

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
    const timer = setInterval(load, FIVE_SECONDS)
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
