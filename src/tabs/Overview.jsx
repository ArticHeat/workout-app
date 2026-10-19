import { useState } from "react";
import { PHASES, INT, VOL, LIFTS } from "../data/program.js";
import { useApp, setWeek, setRm } from "../state/app.js";
import { useCfg, saveCfg, api } from "../lib/backend.js";
import { useCoach, coachStatus, coachRun, coachApply } from "../state/coach.js";
import { useLog } from "../state/log.js";
import { phaseOf, rmNum } from "../lib/plan.js";
import { round, reloadPage } from "../lib/util.js";
import WeekStrip from "../components/WeekStrip.jsx";

function WeekWeights({ week, rm }) {
  const pct = INT[week - 1], label = week === 15 ? " (light week)" : week === 16 ? " (test day)" : "";
  const any = LIFTS.some(l => rmNum(rm[l.key]) > 0);
  return (
    <div className="focus"><dt>Week {week} working weights · {pct}% of 1RM{label}</dt>
      {!any ? <p className="hint">Enter your 1RMs in the calculator below to see weights for this week.</p> : (
        <div className="lifts">{LIFTS.map(l => { const v = rmNum(rm[l.key]); return <div className="lift" key={l.key}><span>{l.name}</span><b>{v > 0 ? round(v * pct / 100) + " kg" : "—"}</b></div>; })}</div>
      )}
    </div>
  );
}

function PhaseDetail({ week, rm }) {
  const p = phaseOf(week);
  return (
    <section className="card detail" id="detail" aria-live="polite" style={{ "--c": p.color }}>
      <div className="tag">Phase {p.id} · {p.tag}</div>
      <h2>{p.name}</h2>
      <p className="goal">{p.goal}</p>
      <p className="now">Selected: week {week} of 16 — example intensity {INT[week - 1]}%</p>
      <dl>
        <div><dt>Average intensity</dt><dd className="big">{p.intensity}</dd></div>
        <div><dt>Volume</dt><dd>{p.volume} ({p.sets})</dd></div>
        <div><dt>Weeks</dt><dd>{p.weeks[0]}–{p.weeks[1]} ({p.weeks[1] - p.weeks[0] + 1} weeks)</dd></div>
      </dl>
      <WeekWeights week={week} rm={rm} />
      <div className="focus"><dt>Key focus for your lifts</dt><p>{p.focus}</p></div>
    </section>
  );
}

function Chart({ week }) {
  const W = 560, H = 300, L = 34, R = 6, T = 10, bw = (W - L - R) / 16;
  const iy = v => T + (1 - (v - 40) / 60) * 170, vBase = 280, vTop = 205, vy = v => vBase - (v / 100) * (vBase - vTop);
  const pts = VOL.map((v, i) => (L + i * bw + bw / 2) + "," + vy(v)).join(" ");
  return (
    <section className="card" aria-label="Intensity and volume by week">
      <div className="chart-head">
        <h3>Intensity and volume by week</h3>
        <div className="legend"><span><i style={{ background: "var(--hyp)" }}></i>Hypertrophy</span><span><i style={{ background: "var(--str)" }}></i>Strength</span><span><i style={{ background: "var(--peak)" }}></i>Peaking</span><span><i style={{ background: "var(--taper)" }}></i>Deload &amp; test</span></div>
      </div>
      <div id="chart">
        <svg viewBox={"0 0 " + W + " " + H} role="img" aria-label="Bar chart of intensity by week with a volume line below">
          {[50, 70, 90, 100].map(t => <g key={t}><line x1={L} x2={W - R} y1={iy(t)} y2={iy(t)} stroke="var(--line)" strokeWidth="1" /><text x={L - 6} y={iy(t) + 4} textAnchor="end">{t}%</text></g>)}
          {INT.map((v, i) => {
            const w = i + 1, p = phaseOf(w), x = L + i * bw + 2, y = iy(v), sel = w === week;
            return (
              <g key={w}>
                <rect x={x} y={y} width={bw - 4} height={iy(40) - y} rx="2" fill={p.color} opacity={sel ? 1 : 0.5} stroke={sel ? "var(--ink)" : undefined} strokeWidth={sel ? 2 : undefined} />
                <text x={x + (bw - 4) / 2} y={iy(40) + 14} textAnchor="middle" style={sel ? { fill: "var(--ink)", fontWeight: 600 } : undefined}>{w}</text>
                <rect x={x - 2} y="0" width={bw} height={H} fill="transparent" style={{ cursor: "pointer" }} data-w={w} onClick={() => setWeek(w)} />
              </g>
            );
          })}
          <text x={L} y="198">Volume (relative)</text>
          <line x1={L} x2={W - R} y1={vBase} y2={vBase} stroke="var(--line)" />
          <polyline points={pts} fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
          {VOL.map((v, i) => <circle key={i} cx={L + i * bw + bw / 2} cy={vy(v)} r={(i + 1) === week ? 5 : 3.5} fill={phaseOf(i + 1).color} stroke="var(--panel)" strokeWidth="1.5" />)}
        </svg>
      </div>
      <p className="note">Weekly values are an example ramp inside each phase's range. Volume shows the shape (high to low), not a set count.</p>
    </section>
  );
}

const Kg = ({ rm, lo, hi }) => {
  if (!rm || rm <= 0) return <td className="empty">—</td>;
  const a = round(rm * lo / 100), b = round(rm * hi / 100);
  return <td>{a === b ? a : a + "–" + b} kg</td>;
};

function Calculator({ week, rm }) {
  const cur = phaseOf(week).id;
  return (
    <section className="card calc" aria-label="Load calculator">
      <h2>Working weights from your 1RM</h2>
      <div className="inputs">
        {[["sq", "Squat", "160"], ["bp", "Bench", "100"], ["dl", "Deadlift", "220"], ["oh", "Overhead press", "70"]].map(([k, name, ph]) => (
          <label key={k}>{name} 1RM (kg)<input type="number" id={k} inputMode="decimal" min="0" step="2.5" placeholder={"e.g. " + ph} value={rm[k]} onChange={e => setRm(k, e.target.value)} /></label>
        ))}
      </div>
      <div className="tbl-scroll">
        <table>
          <thead><tr><th>Phase</th><th>Intensity</th><th>Squat</th><th>Bench</th><th>Deadlift</th><th>Overhead press</th></tr></thead>
          <tbody id="tbody">
            {PHASES.map(p => (
              <tr key={p.id} style={{ "--c": p.color }} className={p.id === cur ? "active" : ""}>
                <th scope="row">{p.name}</th><td>{p.intensity.replace(" of 1RM", "")}</td>
                {LIFTS.map(l => <Kg key={l.key} rm={rmNum(rm[l.key])} lo={p.range[0]} hi={p.range[1]} />)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">Weights are rounded to the nearest 2.5 kg. In the last phase, 50% is the light week and 100% is test day.</p>
      <details>
        <summary>Week-by-week weights</summary>
        <div className="tbl-scroll">
          <table>
            <thead><tr><th>Week</th><th>Intensity</th><th>Squat</th><th>Bench</th><th>Deadlift</th><th>Overhead press</th></tr></thead>
            <tbody id="wbody">
              {INT.map((pct, i) => {
                const w = i + 1, p = phaseOf(w);
                return (
                  <tr key={w} data-w={w} style={{ "--c": p.color }} className={w === week ? "active" : ""} onClick={() => setWeek(w)}>
                    <th scope="row">Week {w}</th><td>{pct}%</td>{LIFTS.map(l => <Kg key={l.key} rm={rmNum(rm[l.key])} lo={pct} hi={pct} />)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="note">Tap a row to select that week. Percentages are the example ramp shown in the chart.</p>
      </details>
    </section>
  );
}

function AppConnection() {
  const c = useCfg();
  const [f, setF] = useState({ url: c.url || "", token: c.token || "", gemini: c.gemini || "" });
  const [msg, setMsg] = useState(c.url ? "Connected setting saved on this device." : "Not connected yet.");
  const save = async () => {
    const next = { url: f.url.trim(), token: f.token, gemini: f.gemini.trim(), model: c.model || "" };
    saveCfg(next);
    if (!next.url) { setMsg("Saved. No sheet link, so data stays on this device."); return; }
    setMsg("Testing...");
    try { await api({ op: "ping" }); setMsg("Connected. Reloading to load your data..."); setTimeout(reloadPage, 700); }
    catch (e) { setMsg(e && e.code === "needs_reauth" ? "The link works but the password is wrong." : "Could not reach the script. Check the link, and that access is set to Anyone."); }
  };
  return (
    <section className="card" id="appconn" aria-label="App connection">
      <h2>App connection</h2>
      <p className="note" style={{ marginTop: 0 }}>Your data is kept on this device. Connect your Google Sheet to back it up and use it on other devices. Everything here is free.</p>
      <div className="inputs">
        <label style={{ flex: "1 1 100%" }}>Sheet script link<input type="url" id="acurl" placeholder="https://script.google.com/macros/s/.../exec" value={f.url} onChange={e => setF({ ...f, url: e.target.value })} /></label>
        <label style={{ flex: "1 1 100%" }}>Sheet password<input type="password" id="actoken" autoComplete="off" value={f.token} onChange={e => setF({ ...f, token: e.target.value })} /></label>
        <label style={{ flex: "1 1 100%" }}>Free AI key (optional, from Google AI Studio)<input type="password" id="acgem" autoComplete="off" value={f.gemini} onChange={e => setF({ ...f, gemini: e.target.value })} /></label>
      </div>
      <div className="toolbar" style={{ marginTop: 12 }}><button type="button" className="btn primary" id="acsave" onClick={save}>Save and test</button><span className="note" id="acstat" style={{ margin: 0 }}>{msg}</span></div>
    </section>
  );
}

function SuggestionCard({ s, mi, si, applied }) {
  const lbl = { scheme: "Change to " + (s.scheme || ""), remove: "Remove from plan", add: "Add " + (s.scheme || ""), note: "" }[s.type] || "";
  const can = (s.type === "scheme" || s.type === "remove" || s.type === "add") && s.lift && s.phase;
  return (
    <div className={"sug" + (applied ? " done" : "")}><b>{s.title || "Suggestion"}</b>
      <small>{(s.why || "") + (s.exercise ? " · " + s.exercise : "") + (lbl ? " · " + lbl : "")}</small>
      {can ? (applied ? <small>Applied</small> : <button type="button" className="btn" data-sug={mi + ":" + si} onClick={() => coachApply(mi + ":" + si)}>Apply to my plan</button>) : null}
    </div>
  );
}

function Coach() {
  const { chat, review, busy, wait } = useCoach(s => s), log = useLog(s => s.log);
  const [q, setQ] = useState("");
  const st = coachStatus(log, review);
  const all = [];
  if (review) all.push({ role: "ai", text: "Weekly review (" + review.at.slice(0, 10) + "): " + review.reply, suggestions: review.suggestions || [], applied: review.applied || [], rv: true });
  chat.forEach((m, i) => all.push(Object.assign({}, m, { idx: i })));
  const send = e => { e.preventDefault(); const t = q.trim(); if (!t) return; setQ(""); coachRun(t); };
  return (
    <section className="card coach" id="coach" aria-label="Coach">
      <h2>Coach</h2>
      <p className="note" style={{ marginTop: 0 }}>Reads everything you log (ticks, sets, reps, weight, springs) and suggests changes only when a pattern repeats over at least 7 days. It is fine for it to say nothing needs changing.</p>
      <div className="cstat" id="coachstat">{st.text}</div>
      <div className="toolbar" style={{ marginTop: 0 }}><button type="button" className="btn primary" id="coachreview" disabled={busy} onClick={() => coachRun("")}>{st.due ? "Run weekly review (due)" : "Run weekly review"}</button></div>
      <div className="coachlog" id="coachlog" role="log" aria-live="polite">
        {all.length === 0 && !wait ? <div className="note">Nothing yet. Ask a question or run the weekly review.</div> : null}
        {all.map((m, k) => (
          <div key={k} className={"msg " + (m.role === "me" ? "me" : "ai")}>{m.text}
            {(m.suggestions || []).map((s, si) => <SuggestionCard key={si} s={s} mi={m.rv ? "r" : String(m.idx)} si={si} applied={(m.applied || []).indexOf(si) > -1} />)}
          </div>
        ))}
        {wait ? <div className="msg ai" id="coachwait">Reading your logs...</div> : null}
      </div>
      <form id="coachform" onSubmit={send}>
        <textarea id="coachin" rows="2" placeholder="Ask about your training, e.g. why am I skipping dips? Should I change anything?" value={q} onChange={e => setQ(e.target.value)} />
        <button type="submit" className="btn" id="coachsend" disabled={busy}>Send</button>
      </form>
    </section>
  );
}

export default function Overview() {
  const week = useApp(s => s.week), rm = useApp(s => s.rm);
  return (
    <section id="tab-overview" className="wrap">
      <h1>Training overview</h1>
      <p className="sub">Four phases, one meet-day peak. Tap a week or a phase to see the plan, and enter your one-rep maxes to get working weights in kg.</p>
      <WeekStrip />
      <div className="grid"><PhaseDetail week={week} rm={rm} /><Chart week={week} /></div>
      <Calculator week={week} rm={rm} />
      <AppConnection />
      <Coach />
    </section>
  );
}
