import { useEffect, useState } from 'react'

/**
 * The current time, refreshed every second, so a countdown on screen keeps moving. A locked phone
 * pauses that refresh, so the time is also read again the moment the app is back on screen.
 * Without it the user would see the old number for a moment after unlocking.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const refresh = () => setNow(new Date())

    const timer = setInterval(refresh, 1000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  return now
}
