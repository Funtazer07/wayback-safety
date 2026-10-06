import { useEffect, useState } from 'react'
import { fetchActiveWalk, startWalk, type NewWalk, type Walk } from './walk.ts'

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

  return { ...state, start }
}
