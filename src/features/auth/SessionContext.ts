import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

export type SessionState = {
  session: Session | null
  isLoading: boolean
}

export const SessionContext = createContext<SessionState>({ session: null, isLoading: true })

export function useSession() {
  return useContext(SessionContext)
}
