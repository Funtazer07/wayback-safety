import { useEffect, useState } from 'react'
import { checkInWalk, fetchActiveWalk, startWalk, type NewWalk, type Walk } from './walk.ts'

type WalkState = {
  walk: Walk | null
  isLoading: boolean
  error: string | null
}

const loading: WalkState = { walk: null, isLoading: true, error: null }

/** The walk the logged-in user is on, if any. Asks the server, so a walk survives closing the app. */
export function useWalk(userId: string | undefined) {
  const [state, setState] = useState(loading)

  useEffect(() => {
    if (!userId) return

    let isCurrent = true
    fetchActiveWalk()
      .then((walk) => isCurrent && setState({ walk, isLoading: false, error: null }))
      .catch(
        () =>
          isCurrent &&
          setState({ walk: null, isLoading: false, error: 'Could not check for a running walk.' }),
      )

    return () => {
      isCurrent = false
      setState(loading)
    }
  }, [userId])

  async function start(newWalk: NewWalk) {
    const walk = await startWalk(newWalk)
    setState({ walk, isLoading: false, error: null })
  }

  /**
   * Tells the server the user is home. The walk stays here with the status 'safe', so the screen
   * can show the confirmation, until `finish` is called.
   */
  async function checkIn() {
    if (!state.walk) return
    const walk = await checkInWalk(state.walk.id)
    setState({ walk, isLoading: false, error: null })
  }

  /** Forgets the walk that was checked in, so the app goes back to Home. */
  function finish() {
    setState({ walk: null, isLoading: false, error: null })
  }

  return { ...state, start, checkIn, finish }
}
