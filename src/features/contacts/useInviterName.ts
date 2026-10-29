import { useEffect, useState } from 'react'
import { fetchInvite } from './contacts.ts'

/**
 * Who sent the invite link, for the sign-in screen. Null while loading, without a link, or when
 * the link no longer works: the accept screen explains that after signing in.
 */
export function useInviterName(token: string | null): string | null {
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let isCurrent = true
    fetchInvite(token)
      .then((details) => isCurrent && setName(details.inviterName))
      .catch(() => {})
    return () => {
      isCurrent = false
    }
  }, [token])

  return token ? name : null
}
