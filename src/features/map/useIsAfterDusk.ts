import { useEffect, useState } from 'react'
import { isAfterDusk } from './daylight.ts'

/** Checked every minute, and when the app is back on screen. */
export function useIsAfterDusk(): boolean {
  const [afterDusk, setAfterDusk] = useState(() => isAfterDusk(new Date()))

  useEffect(() => {
    const refresh = () => setAfterDusk(isAfterDusk(new Date()))

    const timer = setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  return afterDusk
}
