import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

// MFA is mandatory: a signed-in user must enroll an authenticator app, and every
// session must be upgraded to AAL2 (password + TOTP code) before reaching the app.
export type AuthStatus = 'loading' | 'signed-out' | 'needs-enroll' | 'needs-verify' | 'ready'

type AuthContextValue = {
  status: AuthStatus
  session: Session | null
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
