import { useEffect, useState } from 'react'

/** The current time, refreshed every second, so a countdown on screen keeps moving. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return now
}
