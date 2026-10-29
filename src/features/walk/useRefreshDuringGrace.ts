import { useEffect, useRef } from 'react'
import { onPushMessage } from '../../lib/pushMessages.ts'

// Assumption: quick enough to show "overdue" soon, light enough for the battery.
const FIFTEEN_SECONDS = 15_000

export function useRefreshDuringGrace(isInGrace: boolean, refresh: () => Promise<void>) {
  // A ref, so the timer does not restart on every render.
  const latestRefresh = useRef(refresh)
  useEffect(() => {
    latestRefresh.current = refresh
  })

  useEffect(() => onPushMessage(() => latestRefresh.current()), [])

  useEffect(() => {
    if (!isInGrace) return

    const refreshNow = () => latestRefresh.current()
    function refreshWhenBackOnScreen() {
      if (document.visibilityState === 'visible') refreshNow()
    }

    refreshNow()
    const timer = setInterval(refreshNow, FIFTEEN_SECONDS)
    document.addEventListener('visibilitychange', refreshWhenBackOnScreen)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshWhenBackOnScreen)
    }
  }, [isInGrace])
}
