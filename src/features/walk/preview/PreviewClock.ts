import { createContext, useContext, useEffect, useState } from 'react'

// The prototype may stop its own clock; the real server timer is never changed.
export const PreviewClockContext = createContext<Date | null>(null)

export function useNow(): Date {
  const stoppedAt = useContext(PreviewClockContext)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (stoppedAt) return
    const update = () => setNow(new Date())
    const timer = setInterval(update, 1000)
    document.addEventListener('visibilitychange', update)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', update)
    }
  }, [stoppedAt])
  return stoppedAt ?? now
}
