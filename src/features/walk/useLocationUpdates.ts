import { useEffect, useState } from 'react'
import type { Fix } from './progress.ts'
import { updateWalkLocation } from './walk.ts'

const ONE_MINUTE = 60_000
const KEPT_FIXES = 5

type LocationUpdates = {
  isLocationOff: boolean
  /** Newest last. Kept only in memory; only the newest goes to the server. */
  fixes: Fix[]
}

/** Sends the location every minute while the screen is open. Pass null to stop. */
export function useLocationUpdates(walkId: string | null): LocationUpdates {
  const [isLocationOff, setIsLocationOff] = useState(() => !('geolocation' in navigator))
  const [fixes, setFixes] = useState<Fix[]>([])

  useEffect(() => {
    if (!walkId || !('geolocation' in navigator)) return
    const id = walkId

    function sendLocation() {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsLocationOff(false)
          const fix: Fix = {
            coordinates: [position.coords.longitude, position.coords.latitude],
            accuracy: position.coords.accuracy,
            at: new Date(position.timestamp || Date.now()),
          }
          setFixes((current) => [...current, fix].slice(-KEPT_FIXES))
          // The next update, a minute later, replaces a failed one.
          updateWalkLocation(id, position.coords.latitude, position.coords.longitude).catch(
            () => {},
          )
        },
        () => setIsLocationOff(true),
      )
    }

    // A locked phone pauses the timer, so send a fresh location when the app is back.
    function sendWhenBackOnScreen() {
      if (document.visibilityState === 'visible') sendLocation()
    }

    sendLocation()
    const timer = setInterval(sendLocation, ONE_MINUTE)
    document.addEventListener('visibilitychange', sendWhenBackOnScreen)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', sendWhenBackOnScreen)
    }
  }, [walkId])

  return { isLocationOff, fixes }
}
