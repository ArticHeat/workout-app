import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AuthCard } from './AuthCard'

const MIN_PASSWORD_LENGTH = 10

export function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError(null)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) setError(error.message)
    // No session means Supabase requires email confirmation first.
    else if (!data.session) setCheckEmail(true)
    setBusy(false)
  }

  if (checkEmail) {
    return (
      <AuthCard title="Check your email" subtitle={`We sent a confirmation link to ${email}.`}>
        <p className="muted small">
          After confirming, <Link to="/login">sign in</Link> to set up two-factor authentication.
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Create account" subtitle="You'll set up an authenticator app next.">
      <form onSubmit={onSubmit}>
        <label>
          Email
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span className="hint">At least {MIN_PASSWORD_LENGTH} characters</span>
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>
      <p className="muted small">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthCard>
  )
}
