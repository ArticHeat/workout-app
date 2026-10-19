import { PHASES, INT } from "../data/program.js";
import { phaseOf } from "../lib/plan.js";
import { useApp, setWeek } from "../state/app.js";

/* The 16-week timeline with phase labels, shared by the Overview and Weekly tabs */
export default function WeekStrip({ onPick }) {
  const week = useApp(s => s.week), cur = phaseOf(week);
  const pick = w => { setWeek(w); onPick && onPick(); };
  return (
    <section className="strip-card" aria-label="Block timeline">
      <div className="strip">
        {Array.from({ length: 16 }, (_, i) => {
          const w = i + 1, p = phaseOf(w);
          return (
            <button key={w} className="wk" style={{ "--c": p.color }} aria-pressed={w === week} aria-label={"Week " + w + ", " + p.name + ", " + INT[w - 1] + "% of 1RM"} onClick={() => pick(w)}>
              {w}<small>{INT[w - 1]}%</small>
            </button>
          );
        })}
      </div>
      <div className="phases">
        {PHASES.map(p => (
          <button key={p.id} className="ph" style={{ "--c": p.color }} aria-pressed={p.id === cur.id} onClick={() => pick(p.weeks[0])}>
            {p.name}<span>Weeks {p.weeks[0]}–{p.weeks[1]}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
