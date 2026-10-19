import { useAuth } from '../auth/context'

const sections = [
  { title: 'Coach chat', body: 'Ask your AI coach about training, form and plans.' },
  { title: 'Log workout', body: 'Record sets, reps, weight and effort.' },
  { title: 'History', body: 'See past sessions and personal records.' },
  { title: 'Plan', body: 'Your current program, week by week.' },
]

export function Home() {
  const { session, signOut } = useAuth()

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">Workout App</span>
        <div className="topbar-right">
          <span className="muted small">{session?.user.email}</span>
          <button className="secondary" onClick={() => void signOut()}>Sign out</button>
        </div>
      </header>
      <main className="dashboard">
        <h1>Welcome back</h1>
        <p className="muted">Signed in with two-factor authentication.</p>
        <div className="grid">
          {sections.map((s) => (
            <section key={s.title} className="tile">
              <h2>{s.title}</h2>
              <p className="muted">{s.body}</p>
              <span className="badge">Coming soon</span>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
