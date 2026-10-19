import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth, type AuthStatus } from './context'

const homeFor: Record<Exclude<AuthStatus, 'loading'>, string> = {
  'signed-out': '/login',
  'needs-enroll': '/mfa/setup',
  'needs-verify': '/mfa/verify',
  ready: '/',
}

// Renders children only in the allowed auth states; otherwise redirects to the
// page for the current state, so users can't skip a step by typing a URL.
export function RequireStatus({ allow, children }: { allow: AuthStatus[]; children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') return <p className="centered muted">Loading…</p>
  if (!allow.includes(status)) return <Navigate to={homeFor[status]} replace />
  return <>{children}</>
}
