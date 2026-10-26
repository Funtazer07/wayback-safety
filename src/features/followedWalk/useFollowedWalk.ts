import { useEffect, useState } from 'react'
import { NotSharedError, fetchFollowedWalk, type FollowedWalk } from './followedWalk.ts'

type FollowedWalkState = {
  walk: FollowedWalk | null
  isLoading: boolean
  /** A sentence for the contact, or null. */
  error: string | null
}

const loading: FollowedWalkState = { walk: null, isLoading: true, error: null }

// Assumption: every 30 seconds is soon enough for a worried contact to see "is safe" after the
// walker checks in, without draining their battery.
const THIRTY_SECONDS = 30_000

/**
 * The walk a contact opened. While it is on the way or overdue it is asked for again every 30
 * seconds and when the app comes back on screen, so "overdue", "safe" or "cancelled" shows up
 * without reloading. A walk that ended does not change any more, so then it stops asking.
 */
export function useFollowedWalk(walkId: string): FollowedWalkState {
  const [state, setState] = useState(loading)
  const isOngoing = state.walk?.status === 'active' || state.walk?.status === 'overdue'

  useEffect(() => {
    let isCurrent = true
    fetchFollowedWalk(walkId)
      .then((walk) => isCurrent && setState({ walk, isLoading: false, error: null }))
      .catch(
        (error) =>
          isCurrent &&
          setState({
            walk: null,
            isLoading: false,
            error:
              error instanceof NotSharedError
                ? 'This walk is not shared with you, or it no longer exists.'
                : 'Could not load this walk. Check your connection and try again.',
          }),
      )
    return () => {
      isCurrent = false
    }
  }, [walkId])

  useEffect(() => {
    if (!isOngoing) return

    let isCurrent = true
    // A failed refresh keeps what is on screen; the next one tries again.
    const refresh = () =>
      fetchFollowedWalk(walkId)
        .then((walk) => isCurrent && setState({ walk, isLoading: false, error: null }))
        .catch(() => {})
    const refreshWhenBackOnScreen = () => document.visibilityState === 'visible' && refresh()

    const timer = setInterval(refresh, THIRTY_SECONDS)
    document.addEventListener('visibilitychange', refreshWhenBackOnScreen)
    return () => {
      isCurrent = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshWhenBackOnScreen)
    }
  }, [walkId, isOngoing])

  return state
}
