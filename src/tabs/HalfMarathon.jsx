import { useState } from "react";
import { HM_PH } from "../data/running.js";
import { useApp, setHm, setWeekAndTab } from "../state/app.js";
import { raceWeek, parseD, fmtD, fmtShort, todayMs, todayWeek, weekStartMs, hmPhase, hmSessions } from "../lib/hm.js";
import { dayMs } from "../lib/util.js";

const WK = 7 * dayMs;
export default function HalfMarathon() {
  const hm = useApp(s => s.hm), run = useApp(s => s.run), rw = raceWeek(hm), [sel, setSel] = useState(0);
  const rd = parseD(hm.race);
  let body = null;
  if (rw) {
    const away = Math.ceil((rd - todayMs()) / WK), dedicated = rw - 16, cap = Math.min(rw, 60);
    const cur = sel || Math.min(Math.max(todayWeek(hm), 1), cap), ph = hmPhase(cur, rw), P = HM_PH[ph], ss = hmSessions(cur, rw, run), ws = weekStartMs(hm, cur);
    body = (
      <>
        <section className="strip-card">
          <div className="hmstrip" id="hmstrip" role="group" aria-label="Weeks to race day">
            {Array.from({ length: cap }, (_, i) => { const w = i + 1, p = hmPhase(w, rw); return <button key={w} className="hmw" style={{ "--c": HM_PH[p].c }} data-hmw={w} aria-pressed={w === cur} aria-label={"Week " + w + ", " + HM_PH[p].name} onClick={() => setSel(w)}>{w}</button>; })}
          </div>
          <div className="alegend" id="hmlegend" style={{ marginTop: 10 }}>{Object.keys(HM_PH).map(k => <span className="achip" key={k} style={{ "--ac": HM_PH[k].c }}><i></i>{HM_PH[k].name}</span>)}</div>
        </section>
        <section className="card" id="hmdetail" style={{ marginTop: 16 }} aria-live="polite">
          <div className="session-head"><div><div className="tag" style={{ color: P.c }}>Week {cur} · {fmtShort(ws)} – {fmtShort(ws + 6 * dayMs)}</div><h2>{P.name}</h2></div></div>
          <p className="hint" style={{ margin: "6px 0 0" }}>{P.guide}</p>
          <div className="tbl-scroll"><table><thead><tr><th>Run</th><th>Time or distance</th><th>Notes</th></tr></thead><tbody>
            {ss.map((x, i) => <tr key={i}><td>{x.l}</td><td>{x.t}</td><td>{x.n}</td></tr>)}</tbody></table></div>
          {cur <= 16 && ph !== "race" ? <div className="acc-tools"><button className="btn" data-hm="open" onClick={() => setWeekAndTab(cur, "weekly")}>Open this week in the Weekly Dashboard</button></div> : null}
          {cur > 16 && ph !== "race" ? <p className="note">Beyond week 16 the Weekly Dashboard has no lifting prescription. Before you set maintenance weights, enter your week 16 test results as your 1RMs in the Training Overview, then use the suggestions above for how much to lift.</p> : null}
        </section>
      </>
    );
    var summary = (
      <>Race day: <b>{fmtD(rd)}</b> · week {rw} of the plan{away > 0 ? " · " + away + " weeks from today" : ""}.
        {dedicated < 17 ? <> <span className="warn">Only {Math.max(0, dedicated)} weeks after the lifting block: tight for a first half marathon. A later race date, or a shorter lifting block, would give a safer build.</span></> : null}</>
    );
  }
  return (
    <section id="tab-hm" className="wrap">
      <h1>Half marathon plan</h1>
      <p className="sub">A run timeline from week 1 to race day. Weeks 1–16 are your lifting block with beginner run-walk sessions. After that the running takes over, and lifting drops to maintenance.</p>
      <section className="card" style={{ marginTop: 18 }}>
        <div className="hmset">
          <label>Race date<input type="date" id="hmrace" value={hm.race} onChange={e => { setHm({ ...hm, race: e.target.value }); setSel(0); }} /></label>
          <label>Week 1 starts (Monday)<input type="date" id="hmstart" value={hm.start} onChange={e => { setHm({ ...hm, start: e.target.value }); setSel(0); }} /></label>
        </div>
        <p className="hint" id="hmsummary" style={{ margin: "12px 0 0" }}>{rw ? summary : <span className="warn">Set a race date after the start date.</span>}</p>
      </section>
      {body}
    </section>
  );
}
