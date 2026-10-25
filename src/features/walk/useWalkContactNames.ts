import { useEffect, useState } from 'react'
import { fetchWalkContactNames } from './walk.ts'

/**
 * The names of the contacts who follow this walk, for the "Are you OK?" screen ("We'll notify Mum
 * and Alex"). Null while loading, or when they could not be loaded; pass null to load nothing.
 */
export function useWalkContactNames(walkId: string | null): string[] | null {
  const [names, setNames] = useState<string[] | null>(null)

  useEffect(() => {
    if (!walkId) return

    let isCurrent = true
    fetchWalkContactNames(walkId)
      .then((loaded) => isCurrent && setNames(loaded))
      // The screen then says "your contacts" instead of their names.
      .catch(() => {})

    return () => {
      isCurrent = false
    }
  }, [walkId])

  return names
}
