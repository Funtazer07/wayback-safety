import { useCallback, useEffect, useRef, useState } from 'react'
import type { LngLat } from './geometry.ts'

export type UserPosition = {
  coordinates: LngLat
  /** In metres. */
  accuracy: number
}

/** Never stores or sends the position. */
export function useUserPosition() {
  const [position, setPosition] = useState<UserPosition | null>(null)
  const [isUnavailable, setIsUnavailable] = useState(false)
  const watchId = useRef<number | null>(null)

  const start = useCallback(() => {
    if (watchId.current !== null) return
    if (!('geolocation' in navigator)) {
      setIsUnavailable(true)
      return
    }
    watchId.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setIsUnavailable(false)
        setPosition({ coordinates: [coords.longitude, coords.latitude], accuracy: coords.accuracy })
      },
      () => setIsUnavailable(true),
      { enableHighAccuracy: true },
    )
  }, [])

  useEffect(
    () => () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    },
    [],
  )

  return { position, isUnavailable, start }
}
