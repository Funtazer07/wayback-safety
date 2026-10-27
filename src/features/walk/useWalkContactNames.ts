import { useEffect, useState } from 'react'
import { fetchWalkContactNames } from './walk.ts'

/** Null while loading or after an error. Pass null to load nothing. */
export function useWalkContactNames(walkId: string | null): string[] | null {
  const [names, setNames] = useState<string[] | null>(null)

  useEffect(() => {
    if (!walkId) return

    let isCurrent = true
    fetchWalkContactNames(walkId)
      .then((loaded) => isCurrent && setNames(loaded))
      .catch(() => {})

    return () => {
      isCurrent = false
    }
  }, [walkId])

  return names
}
