import { useEffect, useState } from 'react'
import { onPushMessage } from '../../lib/pushMessages.ts'
import { NotSharedError, fetchFollowedWalk, type FollowedWalk } from './followedWalk.ts'

type FollowedWalkState = {
  walk: FollowedWalk | null
  isLoading: boolean
  error: string | null
}

const loading: FollowedWalkState = { walk: null, isLoading: true, error: null }

// Assumption: soon enough for a worried contact, light enough for the battery.
const THIRTY_SECONDS = 30_000

/** Stops polling once the walk has ended, as it cannot change any more. */
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
    const refresh = () =>
      fetchFollowedWalk(walkId)
        .then((walk) => isCurrent && setState({ walk, isLoading: false, error: null }))
        .catch(() => {})
    const refreshWhenBackOnScreen = () => document.visibilityState === 'visible' && refresh()

    const timer = setInterval(refresh, THIRTY_SECONDS)
    document.addEventListener('visibilitychange', refreshWhenBackOnScreen)
    const stopListening = onPushMessage(refresh)
    return () => {
      isCurrent = false
      stopListening()
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshWhenBackOnScreen)
    }
  }, [walkId, isOngoing])

  return state
}
