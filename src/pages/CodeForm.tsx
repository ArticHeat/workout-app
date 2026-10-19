import { useState, type FormEvent } from 'react'

// Six-digit TOTP code entry shared by MFA setup and sign-in verification.
export function CodeForm({ onSubmit, label }: { onSubmit: (code: string) => Promise<string | null>; label: string }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handle(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(await onSubmit(code))
    setBusy(false)
  }

  return (
    <form onSubmit={handle}>
      <label>
        6-digit code
        <input
          className="code-input"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : label}</button>
    </form>
  )
}
