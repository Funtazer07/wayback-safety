import { useEffect, useState } from 'react'
import {
  cancelWalk,
  checkInWalk,
  extendWalk,
  fetchCurrentWalk,
  startWalk,
  type NewWalk,
  type Walk,
} from './walk.ts'

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
    fetchCurrentWalk()
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

  /** Starts a walk on the server, and returns it so the caller can keep things that belong to it. */
  async function start(newWalk: NewWalk): Promise<Walk> {
    const walk = await startWalk(newWalk)
    setState({ walk, isLoading: false, error: null })
    return walk
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

  /** Gives the user more time (the "Add 5 minutes" button, SCRUM-101). */
  async function extend(minutes: number) {
    if (!state.walk) return
    const walk = await extendWalk(state.walk.id, minutes)
    setState({ walk, isLoading: false, error: null })
  }

  /**
   * Asks the server for the walk again, to hear about the "Are you OK?" warning and about the walk
   * becoming overdue. A failed refresh keeps what is on screen: the next one tries again.
   */
  async function refresh() {
    try {
      const walk = await fetchCurrentWalk()
      // Null means the walk ended somewhere else (another device). Keep showing it until the user
      // acts, instead of jumping away from the screen they are looking at.
      if (walk) setState({ walk, isLoading: false, error: null })
    } catch {
      // Offline for a moment: nothing to show the user.
    }
  }

  /**
   * Stops the walk without a check-in (SCRUM-94), for example after getting a lift. The server
   * erases the last location and tells the contacts. The app then goes back to Home.
   */
  async function cancel() {
    if (!state.walk) return
    await cancelWalk(state.walk.id)
    setState({ walk: null, isLoading: false, error: null })
  }

  /** Forgets the walk that was checked in, so the app goes back to Home. */
  function finish() {
    setState({ walk: null, isLoading: false, error: null })
  }

  return { ...state, start, checkIn, extend, cancel, refresh, finish }
}
