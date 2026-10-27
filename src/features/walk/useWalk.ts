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

  async function start(newWalk: NewWalk): Promise<Walk> {
    const walk = await startWalk(newWalk)
    setState({ walk, isLoading: false, error: null })
    return walk
  }

  /** The walk stays here until `finish`, so the screen can show the confirmation. */
  async function checkIn() {
    if (!state.walk) return
    const walk = await checkInWalk(state.walk.id)
    setState({ walk, isLoading: false, error: null })
  }

  async function extend(minutes: number) {
    if (!state.walk) return
    const walk = await extendWalk(state.walk.id, minutes)
    setState({ walk, isLoading: false, error: null })
  }

  async function refresh() {
    try {
      const walk = await fetchCurrentWalk()
      // Null: the walk ended on another device. Do not jump away from the screen.
      if (walk) setState({ walk, isLoading: false, error: null })
    } catch {
      // Offline for a moment: the next refresh tries again.
    }
  }

  async function cancel() {
    if (!state.walk) return
    await cancelWalk(state.walk.id)
    setState({ walk: null, isLoading: false, error: null })
  }

  function finish() {
    setState({ walk: null, isLoading: false, error: null })
  }

  return { ...state, start, checkIn, extend, cancel, refresh, finish }
}
