import { useEffect, useRef } from 'react'
import { onPushMessage } from '../../lib/pushMessages.ts'

// Assumption: every 15 seconds is quick enough to show "overdue" soon after the server sets it
// (the server itself checks once a minute) and light enough for a phone battery.
const FIFTEEN_SECONDS = 15_000

/**
 * While the "Are you okay?" countdown runs, asks the server for the walk now, every 15 seconds and
 * when the app comes back on screen. That is how the screen hears that the server sent the warning
 * (the countdown then follows the server exactly) and that the walk became overdue. During the
 * whole walk, a push message also makes it ask at once.
 */
export function useRefreshDuringGrace(isInGrace: boolean, refresh: () => Promise<void>) {
  // refresh is a new function on every render. Keeping the latest one here means the timer below
  // only restarts when the grace period starts or ends, not every second.
  const latestRefresh = useRef(refresh)
  useEffect(() => {
    latestRefresh.current = refresh
  })

  // "Are you OK?" itself is a push message. Whenever one arrives during the walk, ask the server at
  // once, so the screen does not wait for the deadline or the next check to show it.
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
