import { useEffect, useState } from 'react'
import { onPushMessage } from '../../lib/pushMessages.ts'
import { fetchContactWalks, type ContactWalk } from './followedWalk.ts'

// Assumption: the same as useFollowedWalk.ts, so the tab and the walk screen agree.
const THIRTY_SECONDS = 30_000

/** Polls as well as listening for pushes, for phones without notifications. */
export function useContactWalks(): ContactWalk[] {
  const [walks, setWalks] = useState<ContactWalk[]>([])

  useEffect(() => {
    let isCurrent = true
    // A failed check keeps what is on screen; the next one tries again.
    const load = () =>
      fetchContactWalks()
        .then((found) => isCurrent && setWalks(found))
        .catch(() => {})
    const loadWhenBackOnScreen = () => document.visibilityState === 'visible' && load()

    load()
    const timer = setInterval(load, THIRTY_SECONDS)
    document.addEventListener('visibilitychange', loadWhenBackOnScreen)
    const stopListening = onPushMessage(load)
    return () => {
      isCurrent = false
      stopListening()
      clearInterval(timer)
      document.removeEventListener('visibilitychange', loadWhenBackOnScreen)
    }
  }, [])

  return walks
}
