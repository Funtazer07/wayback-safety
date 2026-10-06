import { useEffect, useState } from 'react'
import { updateWalkLocation } from './walk.ts'

const ONE_MINUTE = 60_000

/**
 * Sends the phone's location to the server now, then every minute, and again when the phone is
 * unlocked, for as long as the screen using it is open. Returns true when the location cannot be read, for example because the user
 * said no to the permission question.
 */
export function useLocationUpdates(walkId: string): boolean {
  const [isLocationOff, setIsLocationOff] = useState(() => !('geolocation' in navigator))

  useEffect(() => {
    if (!('geolocation' in navigator)) return

    function sendLocation() {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsLocationOff(false)
          // A failed update is not shown to the user: the next one, a minute later, replaces it.
          updateWalkLocation(walkId, position.coords.latitude, position.coords.longitude).catch(
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

  return isLocationOff
}
