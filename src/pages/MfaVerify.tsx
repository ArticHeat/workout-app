import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/context'
import { AuthCard } from './AuthCard'
import { CodeForm } from './CodeForm'

export function MfaVerify() {
  const { refresh, signOut } = useAuth()

  async function verify(code: string) {
    if (!supabase) return 'Auth is not configured.'
    const { data, error: listError } = await supabase.auth.mfa.listFactors()
    if (listError) return listError.message
    const factor = data.totp[0]
    if (!factor) return 'No authenticator is set up for this account.'
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code })
    if (error) return error.message
    await refresh()
    return null
  }

  return (
    <AuthCard title="Two-factor verification" subtitle="Enter the code from your authenticator app.">
      <CodeForm onSubmit={verify} label="Verify" />
      <button className="link-button" onClick={() => void signOut()}>Use a different account</button>
    </AuthCard>
  )
}
