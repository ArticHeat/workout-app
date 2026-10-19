import { useState } from "react";
import { N_GOAL, N_PROT, N_CARB, N_WD } from "../data/schedule.js";
import { useApp, setNut } from "../state/app.js";
import { refStore } from "../state/ref.js";
import { createStore, useStore } from "../state/createStore.js";
import { useCfg, getSample, sampleErr } from "../lib/backend.js";
import { searchIndex } from "../lib/refSearch.js";
import { nutDay, nutTiming, nutW, nutContext, r5 } from "../lib/nutrition.js";
import { HM_LONG } from "../data/running.js";
import { phaseOf } from "../lib/plan.js";
import { todayWeek } from "../lib/hm.js";

/* The agent chat lives outside the component so it survives switching tabs */
const chat = createStore({ hist: [], busy: false });
let ctl = null;
const QUICK = ["Plan my meals for today", "What should I eat before and after this week's hardest day?", "Give me a grocery list for this week", "How do I fuel Sunday's long run?"];

async function ask(q, ctx) {
  q = (q || "").trim();
  const sample = getSample();
  if (!q || chat.get().busy || !sample) return;
  const turn = { q, a: "", busy: true, err: "" };
  const upd = p => chat.set(s => ({ hist: s.hist.map(t => t === turn ? Object.assign(turn, p) : t) }));
  chat.set(s => ({ hist: s.hist.concat([turn]), busy: true }));
  const history = chat.get().hist.slice(-5, -1).filter(t => t.a).map(t => "Athlete: " + t.q + "\nAgent: " + t.a.slice(0, 900)).join("\n\n");
  const hits = refStore.get().idx ? searchIndex(refStore.get().idx, q, null).slice(0, 3) : [];
  const prompt = "You are the nutrition agent in an athlete's training dashboard. Give practical sports-nutrition guidance built around their real training schedule below. Use ranges and everyday foods, be concise, and ask about allergies or preferences if they matter and are missing. " +
    "You are not a doctor or dietitian: for medical conditions, pregnancy, an eating-disorder history, medications, or wanting to lose weight quickly, tell them to see a doctor or registered dietitian. Never suggest extreme restriction or very low calorie intake. If the athlete shows signs of disordered eating, respond with care, do not give numbers, and encourage professional support.\n\n" +
    nutContext(q, Object.assign({}, ctx, { hits })) + (history ? "\n\nConversation so far:\n" + history : "") + "\n\nAthlete's question: " + q;
  ctl = new AbortController();
  try {
    const r = await sample(prompt, { signal: ctl.signal, onText: u => upd({ a: u.text }) });
    upd({ a: r.text });
  } catch (e) {
    const p = {}; if (e && e.text) p.a = e.text; if (!e || e.code !== "cancelled") p.err = sampleErr(e && e.code);
    upd(p);
  }
  upd({ busy: false }); chat.set({ busy: false }); ctl = null;
}

function Targets({ nut }) {
  const w = nutW(nut), pf = N_PROT[nut.goal], cf = N_CARB[nut.goal], g = f => w ? " · " + r5(w * f) + " g" : "";
  return (
    <section className="card" id="ntargets" style={{ marginTop: 16 }}>
      <h2>Daily targets</h2>
      <p className="hint" style={{ margin: "4px 0 8px" }}>Starting points for {N_GOAL[nut.goal].toLowerCase()}. Adjust with your results, and see a registered dietitian for anything more specific.</p>
      {!w ? <p className="hint"><span className="warn">Enter your body weight above to turn these into grams.</span></p> : null}
      <div className="tbl-scroll"><table><thead><tr><th>Target</th><th>Amount</th><th>Notes</th></tr></thead><tbody>
        <tr><td>Protein</td><td>{pf} g/kg{w ? " · " + Math.round(w * pf) + " g/day" : ""}</td><td>Common range 1.6–2.2 g/kg. Spread over 3–5 meals, about 0.3–0.4 g/kg each{w ? " (" + Math.round(w * 0.3) + "–" + Math.round(w * 0.4) + " g)" : ""}.</td></tr>
        <tr><td>Fat</td><td>0.8–1.0 g/kg{w ? " · " + Math.round(w * 0.8) + "–" + Math.round(w) + " g" : ""}</td><td>A floor, not a target to chase. Include some omega-3 rich foods.</td></tr>
        {["Light", "Moderate", "High"].map(l => <tr key={l}><td>Carbs, <span className={"nlevel " + l}>{l}</span> day</td><td>{cf[l]} g/kg{g(cf[l])}</td><td>{l === "Light" ? "Rest or low-load days." : l === "Moderate" ? "One main session." : "Lift plus HIIT, or a long run."}</td></tr>)}
        <tr><td>Fluids</td><td>Drink to thirst, aim for pale urine</td><td>Add fluids and sodium for long or hot sessions.</td></tr>
      </tbody></table></div>
      <p className="note">Calories are not set here, because they depend on your age, height, job and results. Ask the agent below or a dietitian for a starting estimate.</p>
    </section>
  );
}

function WeekTable({ nut, c, wk, setWk }) {
  const wt = nutW(nut), cf = N_CARB[nut.goal];
  return (
    <section className="card" id="nweek" style={{ marginTop: 16 }}>
      <h2>Fuel by day</h2>
      <label style={{ maxWidth: 320, marginTop: 8 }}>Week
        <select id="nweeksel" value={wk} onChange={e => setWk(+e.target.value)}>
          {Array.from({ length: 16 }, (_, i) => <option key={i} value={i + 1}>Week {i + 1} · {phaseOf(i + 1).name}</option>)}
        </select></label>
      <div className="tbl-scroll" style={{ marginTop: 10 }}><table><thead><tr><th>Day</th><th>Training</th><th>Load</th><th>Carbs</th><th>Fuel timing</th></tr></thead><tbody>
        {N_WD.map(wd => {
          const d = nutDay(wk, wd, c);
          return (
            <tr key={wd}><td><b>{wd}</b></td>
              <td>{d.items.length ? d.items.map((i, n) => <span key={n}>{n ? <br /> : null}{(i.when === "morning" ? "AM " : "PM ") + i.what}</span>) : "Rest"}</td>
              <td><span className={"nlevel " + d.level}>{d.level}</span></td>
              <td>{cf[d.level]} g/kg{wt ? <><br />{r5(wt * cf[d.level])} g</> : null}</td>
              <td>{nutTiming(d)}</td></tr>
          );
        })}
      </tbody></table></div>
      <p className="note">Load is a simple score from the sessions in your program. Pick a heavier level for the day if you feel flat, and a lighter one if you are struggling to eat.</p>
    </section>
  );
}

const Race = () => (
  <section className="card" id="nrace" style={{ marginTop: 16 }}>
    <h2>Long-run and race fuelling</h2>
    <p className="hint" style={{ margin: "4px 0 8px" }}>General guidance for your half-marathon build. Your longest planned run is about {Math.max.apply(null, HM_LONG)} minutes.</p>
    <div className="tbl-scroll"><table><thead><tr><th>Run length</th><th>During the run</th></tr></thead><tbody>
      <tr><td>Under about 60 min</td><td>Water is usually enough. Eat normally beforehand.</td></tr>
      <tr><td>About 60–150 min (your long runs and the race)</td><td>Roughly 30–60 g of carbohydrate per hour, from gels, chews, drink or real food, plus regular sips of fluid.</td></tr>
      <tr><td>Over about 2.5 h</td><td>Some people build up to as much as 90 g an hour with training. Practise before relying on it.</td></tr></tbody></table></div>
    <p className="note">Practise your race-day breakfast and fuel on long runs, never try something new on race day. Add sodium in hot weather or when you sweat heavily. Stop and seek medical help for dizziness, confusion or severe cramping.</p>
  </section>
);

export default function Nutrition() {
  const a = useApp(s => s), nut = a.nut, cfg = useCfg(), sample = !!cfg.gemini;
  const [wk, setWk] = useState(() => Math.min(16, Math.max(1, todayWeek(a.hm) || 1)));
  const [q, setQ] = useState("");
  const { hist, busy } = useStore(chat);
  const c = { slots: a.slots, run: a.run, tib: a.tib, mob: a.mob, str: a.str, swim: a.swim };
  const ctx = { week: wk, nut, hm: a.hm, c };
  const submit = text => { setQ(""); ask(text, ctx); };
  return (
    <section id="tab-nut" className="wrap">
      <h1>Nutrition</h1>
      <p className="sub">Fuel targets built from your real training week, plus a nutrition agent you can ask. This is general sports-nutrition guidance, not medical advice.</p>
      <section className="card" style={{ marginTop: 18 }}>
        <h2>Your details</h2>
        <div className="hmset" style={{ marginTop: 12 }}>
          <label>Body weight (kg)<input type="number" id="nwt" min="30" max="250" step="0.5" inputMode="decimal" placeholder="e.g. 85" value={nut.weight} onChange={e => setNut({ ...nut, weight: e.target.value })} /></label>
          <label>Main goal<select id="ngoal" value={nut.goal} onChange={e => setNut({ ...nut, goal: e.target.value })}>{Object.keys(N_GOAL).map(k => <option key={k} value={k}>{N_GOAL[k]}</option>)}</select></label>
        </div>
        <label style={{ marginTop: 12 }}>Diet, allergies and foods you avoid<textarea id="nnotes" placeholder="e.g. vegetarian, no dairy, nut allergy, big breakfast person" value={nut.notes} onChange={e => setNut({ ...nut, notes: e.target.value })} /></label>
      </section>
      <Targets nut={nut} />
      <WeekTable nut={nut} c={c} wk={wk} setWk={setWk} />
      <Race />
      <section className="card" id="nagent" style={{ marginTop: 16 }} aria-live="polite">
        <h2>Nutrition agent</h2>
        <p className="hint" style={{ margin: "4px 0 10px" }}>Ask anything about eating around your training. It sees your week, your targets and your notes above.</p>
        <div className="acc-tools" id="nquick" style={{ margin: "0 0 10px" }}>{QUICK.map(t => <button key={t} className="btn" data-nq={t} onClick={() => submit(t)}>{t}</button>)}</div>
        <div id="nlog">{hist.map((t, i) => <div className="nturn" key={i}><div className="q">{t.q}</div><div className="a">{t.a || (t.busy ? "Thinking…" : "")}{t.err ? "\n" + t.err : ""}</div></div>)}</div>
        <label style={{ marginTop: 10 }}>Your question<textarea id="nq" placeholder="e.g. What should I eat before Monday's squats and HIIT?" value={q} onChange={e => setQ(e.target.value)} /></label>
        <div className="acc-tools">
          <button className="btn primary" id="nask" disabled={!sample || busy} onClick={() => submit(q)}>Ask the agent</button>
          {busy ? <button className="btn" id="nstop" onClick={() => ctl && ctl.abort()}>Stop</button> : null}
          <button className="btn" id="nclear" onClick={() => chat.set({ hist: [] })}>Clear chat</button>
        </div>
        <p className="note" id="nnote">{sample ? "Answers come from the free AI key you added in App connection. General guidance, not medical advice." : "To ask the agent, add a free AI key under App connection in the Training Overview."}</p>
      </section>
    </section>
  );
}
