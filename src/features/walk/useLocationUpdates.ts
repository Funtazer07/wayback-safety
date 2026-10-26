import { useEffect, useState } from 'react'
import type { Fix } from './progress.ts'
import { updateWalkLocation } from './walk.ts'

const ONE_MINUTE = 60_000
// Enough to see whether the walker is moving and in which direction (progress.ts).
const KEPT_FIXES = 5

type LocationUpdates = {
  /** True when the location cannot be read, for example because the user said no. */
  isLocationOff: boolean
  /**
   * The last few positions, newest last. Kept only in this screen's memory, for "Running late?"
   * and "Are you home?" (SCRUM-113, SCRUM-112); only the newest one goes to the server, as before.
   */
  fixes: Fix[]
}

/**
 * Sends the phone's location to the server now, then every minute, and again when the phone is
 * unlocked, for as long as the screen using it is open. Pass null to stop: the walk has ended, so
 * the location is not read or sent any more (SCRUM-48).
 */
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
          // A failed update is not shown to the user: the next one, a minute later, replaces it.
          updateWalkLocation(id, position.coords.latitude, position.coords.longitude).catch(
            () => {},
          )
        },
        () => setIsLocationOff(true),
      )
    }

    // A locked phone pauses the timer below, so the saved location gets old. Send a fresh one as
    // soon as the app is back on screen instead of waiting for the next minute (SCRUM-45).
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
