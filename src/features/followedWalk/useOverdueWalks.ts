import { useEffect, useState } from 'react'
import { fetchOverdueWalks, type OverdueWalk } from './followedWalk.ts'

/**
 * The overdue walks the user follows, for the Contacts tab (SCRUM-104). Loaded once when the tab
 * opens; coming back from a walk opens the tab again, so it is fresh then too.
 */
export function useOverdueWalks(): OverdueWalk[] {
  const [walks, setWalks] = useState<OverdueWalk[]>([])

  useEffect(() => {
    let isCurrent = true
    fetchOverdueWalks()
      .then((found) => isCurrent && setWalks(found))
      // The contacts list has its own error message for a lost connection. The alert itself
      // (SCRUM-74) still reaches the contact, so a failed check here shows nothing extra.
      .catch(() => {})
    return () => {
      isCurrent = false
    }
  }, [])

  return walks
}
