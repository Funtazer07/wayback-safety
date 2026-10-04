import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

export type SessionState = {
  session: Session | null
  isLoading: boolean
}

export const SessionContext = createContext<SessionState>({ session: null, isLoading: true })

/** The logged-in user's session, or null when logged out. */
export function useSession() {
  return useContext(SessionContext)
}
