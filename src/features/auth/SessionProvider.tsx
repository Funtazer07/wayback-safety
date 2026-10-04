import { type ReactNode, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.ts'
import { SessionContext, type SessionState } from './SessionContext.ts'

type SessionProviderProps = {
  children: ReactNode
}

function SessionProvider({ children }: SessionProviderProps) {
  const [state, setState] = useState<SessionState>({ session: null, isLoading: supabase !== null })

  useEffect(() => {
    if (!supabase) return

    // Fires once with the stored session (users stay logged in), then on every login and logout.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, isLoading: false })
    })

    return () => data.subscription.unsubscribe()
  }, [])

  return <SessionContext value={state}>{children}</SessionContext>
}

export default SessionProvider
