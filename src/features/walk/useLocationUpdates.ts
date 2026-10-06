import { useEffect, useState } from 'react'
import { updateWalkLocation } from './walk.ts'

const ONE_MINUTE = 60_000

/**
 * Sends the phone's location to the server now and then every minute, for as long as the screen
 * using it is open. Returns true when the location cannot be read, for example because the user
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

    sendLocation()
    const timer = setInterval(sendLocation, ONE_MINUTE)
    return () => clearInterval(timer)
  }, [walkId])

  return isLocationOff
}
