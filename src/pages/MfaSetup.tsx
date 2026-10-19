import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/context'
import { AuthCard } from './AuthCard'
import { CodeForm } from './CodeForm'

type Enrollment = { factorId: string; qrCode: string; secret: string }

export function MfaSetup() {
  const { refresh, signOut } = useAuth()
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    // Guard against StrictMode's double effect run creating two factors.
    if (!supabase || started.current) return
    started.current = true
    const client = supabase
    void (async () => {
      // Drop factors left unverified by an abandoned earlier attempt.
      const { data: factors } = await client.auth.mfa.listFactors()
      for (const f of factors?.all ?? []) {
        if (f.factor_type === 'totp' && f.status === 'unverified') {
          await client.auth.mfa.unenroll({ factorId: f.id })
        }
      }
      const { data, error } = await client.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Authenticator ${new Date().toISOString()}`,
      })
      if (error) return setError(error.message)
      setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret })
    })()
  }, [])

  async function verify(code: string) {
    if (!supabase || !enrollment) return 'Setup is not ready yet.'
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollment.factorId, code })
    if (error) return error.message
    await refresh()
    return null
  }

  return (
    <AuthCard
      title="Set up two-factor authentication"
      subtitle="Scan this QR code with an authenticator app (Google Authenticator, 1Password, Authy…), then enter the code it shows."
    >
      {error && <p className="error" role="alert">{error}</p>}
      {!enrollment && !error && <p className="muted">Generating QR code…</p>}
      {enrollment && (
        <>
          <img className="qr" src={enrollment.qrCode} alt="QR code for your authenticator app" width={200} height={200} />
          <details>
            <summary>Can't scan? Enter this key instead</summary>
            <code className="secret">{enrollment.secret}</code>
          </details>
          <CodeForm onSubmit={verify} label="Verify and finish" />
        </>
      )}
      <button className="link-button" onClick={() => void signOut()}>Sign out</button>
    </AuthCard>
  )
}
