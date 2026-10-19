import { AuthCard } from './AuthCard'

export function SetupNeeded() {
  return (
    <AuthCard title="Connect Supabase" subtitle="Authentication isn't configured yet.">
      <ol className="steps">
        <li>Create a free project at supabase.com.</li>
        <li>Copy <code>.env.example</code> to <code>.env.local</code>.</li>
        <li>Fill in the project URL and publishable key from Project Settings → API.</li>
        <li>Restart <code>npm run dev</code>.</li>
      </ol>
    </AuthCard>
  )
}
