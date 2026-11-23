import { useEffect, useState } from 'react'
import type { LngLat } from '../map/geometry.ts'
import {
  cancelWalk,
  checkInWalk,
  extendWalk,
  fetchCurrentWalk,
  sendSos,
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

  async function sos(position: LngLat | null) {
    if (!state.walk) throw new Error('There is no active walk.')
    const walk = await sendSos(state.walk.id, position)
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
      if (walk) {
        setState((current) => {
          // A grace-period refresh may have started before the SOS was sent.
          if (current.walk?.id === walk.id && current.walk.sosAt && !walk.sosAt) return current
          return { walk, isLoading: false, error: null }
        })
      }
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

  return { ...state, start, checkIn, sos, extend, cancel, refresh, finish }
}
