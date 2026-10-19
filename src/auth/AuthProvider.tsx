import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthContext, type AuthStatus } from './context'

async function resolveStatus(session: Session | null): Promise<AuthStatus> {
  if (!supabase || !session) return 'signed-out'
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error) return 'signed-out'
  if (data.currentLevel === 'aal2') return 'ready'
  // nextLevel is aal2 only when the user has a verified factor to challenge.
  return data.nextLevel === 'aal2' ? 'needs-verify' : 'needs-enroll'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  const refresh = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase.auth.getSession()
    setSession(data.session)
    setStatus(await resolveStatus(data.session))
  }, [])

  useEffect(() => {
    if (!supabase) return
    // Fires immediately with INITIAL_SESSION, so no separate initial load is needed.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      // Supabase warns against awaiting its own calls inside this callback; defer them.
      setTimeout(() => {
        void resolveStatus(next).then(setStatus)
      }, 0)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut()
  }, [])

  return (
    <AuthContext.Provider value={{ status, session, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
