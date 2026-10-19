/* One component per activity box on the Weekly Dashboard session card. */
import { useState } from "react";
import { RAMP, PHASES, WEEK_ONLY } from "../data/program.js";
import { ACT, HIIT_DAYS, OFF_DAYS, SAND, TIB_DEF, MOB_DEF, STR_DEF, SWIM_DEF, neckSets } from "../data/schedule.js";
import { faForWorkout, getAcc, weekOk, progText, sprogFor, accKey, tonnage, phaseOf, runFor, runDesc, runMins, isLightRun, rmNum } from "../lib/plan.js";
import { mainHeadline } from "../lib/session.js";
import { fmt, round, clamp } from "../lib/util.js";
import { setCustom, setTib, setRun, setSwim, setMob, setStr } from "../state/app.js";
import { TickBox, RestButton, LogButton, LogPanel, TickTable, useSession } from "./tick.jsx";

export function ActivityBox({ act, sub, doneRow, slot, children }) {
  const a = ACT[act];
  return (
    <section className="abox" style={{ "--ac": a.c }} aria-label={a.name}>
      <div className="abox-h">
        <span className="abox-tag">{a.name}</span>
        {sub ? <span className="abox-sub">{sub}</span> : null}
        {doneRow ? <label className="tickrow" style={{ margin: "0 0 0 auto" }}><TickBox row={Object.assign({ slot }, doneRow)} slot={slot} />Done</label> : null}
      </div>
      {children}
    </section>
  );
}
const Hint = ({ children, top = 4 }) => <p className="hint" style={{ margin: top + "px 0 0" }}>{children}</p>;
const Acts = ({ children }) => <div className="acc-tools">{children}</div>;
const NamedTable = ({ headers, rows }) => (
  <div className="tbl-scroll"><table><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>
);
const DaySelect = ({ id, value, onChange }) => (
  <label>Day<select id={id} value={value} onChange={e => onChange(e.target.value)}>{OFF_DAYS.map(d => <option key={d}>{d}</option>)}</select></label>
);

/* ---------- lifting ---------- */
export function LiftBlock({ b, c, rows, editing, setEditing }) {
  const s = useSession(), week = c.week, day = c.day, p = phaseOf(week), rm = rmNum(c.rm[day]);
  const head = mainHeadline(week, day, c.rm[day]), name = b.sub;
  const mainRow = Object.assign({ slot: b.slot }, rows[0]);
  const accRows = rows.slice(1);
  const list = getAcc(c.custom, day, week), key = accKey(day, week);
  const upd = fn => { const next = Object.assign({}, c.custom); next[key] = (c.custom[key] || list).map(a => a.slice()); fn(next[key]); setCustom(next); };
  const shown = editing ? list : list.filter(a => weekOk(a[0], week));
  return (
    <ActivityBox act="lift" sub={name}>
      <div className="main-lift">
        <div className="tickrow" style={{ justifyContent: "space-between" }}>
          <label className="tickrow" style={{ margin: 0 }}><TickBox row={mainRow} slot={b.slot} />Main lift done</label>
          <RestButton row={mainRow} kind="Powerlifting" /><LogButton row={mainRow} />
        </div>
        {s.open[mainRow.k] ? <LogPanel row={mainRow} /> : null}
        <div className="ml-label">Main lift</div>
        {head.week16 ? (
          <>
            <div className="ml-big">{head.big} <small>{head.small}</small></div>
            <NamedTable headers={["Step", "Intensity", "Reps", "Weight"]} rows={RAMP.map((r, i) => [i === RAMP.length - 1 ? "Test" : "Warm-up " + (i + 1), r[0] + "%", r[1], rm ? round(rm * r[0] / 100) + " kg" : "—"])} />
          </>
        ) : (
          <>
            <div className="ml-big">{head.big} <small>{head.small}</small></div>
            {!rm ? <p className="hint">Set your {name.toLowerCase()} 1RM in the Training Overview to see the weight.</p>
              : <p className="hint" style={{ marginTop: 2 }}>Session volume for this lift: {fmt(tonnage(week, rm))} kg{week === 15 ? " · light week to drop fatigue" : ""}</p>}
          </>
        )}
      </div>
      <h3>Accessory work</h3>
      {!editing ? (
        <>
          <TickTable kind="Powerlifting" slot={b.slot} headers={["Exercise", "Sets × reps"]} rows={accRows.map(r => ({ row: r, cells: [r.name, r.planned] }))}
            empty={<tr><td colSpan={3} className="empty">No accessory work. Use Edit to add some.</td></tr>} />
          {shown.some(a => WEEK_ONLY[String(a[0]).trim().toLowerCase()]) ? <p className="note">Oblique work rotates: barbell side bend in weeks 1, 3, 5, 7 and 9, and landmine twist in weeks 2, 4, 6, 8 and 10 to 15. Never both on the same day.</p> : null}
          {shown.some(a => sprogFor(a[0])) && week <= 10 ? <p className="note">Spring exercises follow the week-by-week spring progression in the Equipment tab.</p> : null}
          <Acts><button className="btn" onClick={() => { upd(() => {}); setEditing(true); }}>Edit accessories</button></Acts>
        </>
      ) : (
        <>
          {list.map((a, i) => (
            <div className="acc-row" key={i}>
              <label>Exercise<input type="text" value={a[0]} onChange={e => upd(l => { l[i][0] = e.target.value; })} /></label>
              <label>Sets × reps<input type="text" value={a[1]} onChange={e => upd(l => { l[i][1] = e.target.value; })} /></label>
              <button className="btn" aria-label={"Remove " + a[0]} onClick={() => upd(l => { l.splice(i, 1); })}>Remove</button>
            </div>
          ))}
          <Acts>
            <button className="btn" onClick={() => upd(l => { l.push(["New exercise", "3 × 10"]); })}>Add exercise</button>
            <button className="btn" onClick={() => { const next = Object.assign({}, c.custom); delete next[key]; setCustom(next); upd(() => {}); }}>Reset to defaults</button>
            <button className="btn primary" onClick={() => setEditing(false)}>Done</button>
          </Acts>
          <p className="note">Changes apply to {name.toLowerCase()} day in every week of the {p.name} phase, and are saved on this device.</p>
        </>
      )}
    </ActivityBox>
  );
}

/* ---------- forearm, sandbag, neck, HIIT ---------- */
export function ForearmBlock({ b, c, rows }) {
  const f = faForWorkout(c.week, b.workout);
  return (
    <ActivityBox act="forearm" sub={b.sub}>
      <h3>Forearm program · Workout {f.workout}</h3>
      {f.deload
        ? <Hint>Forearm deload week. Rest, or repeat this workout with weights about 40% lighter, then decide whether to run the program again.</Hint>
        : <>
            <TickTable kind="Forearm" slot={b.slot} headers={["Exercise", "Sets", "Reps", "Rest", "Notes"]}
              rows={f.rows.map((r, i) => ({ row: rows[i], cells: [r.ex, r.sets, r.reps, r.rest, r.note] }))} />
            <p className="note">Week {c.week} of 6. Aim for RPE 8–10 and add a little weight or a rep each week. About 15–20 minutes.</p>
          </>}
    </ActivityBox>
  );
}
export function SandBlock({ b, c, rows }) {
  const w = c.week;
  return (
    <ActivityBox act="sandbag" sub={b.sub}>
      {w === 16 ? <Hint>Test week: skip sandbag work so your grip and back are fresh.</Hint> : (
        <>
          <TickTable kind="Sandbag" slot={b.slot} headers={["Exercise", "Sets", "Rest", "Notes"]}
            rows={SAND[b.dk].map((r, i) => ({ row: rows[i], cells: [r.ex, r.sets(w), r.rest, r.note] }))} />
          <p className="note">The program starts with a 35–45 kg bag. Choose one you can move with good form, and add weight only once the target is easy.{w === 15 ? " Light week: lighter bag, half the sets." : ""}</p>
        </>
      )}
    </ActivityBox>
  );
}
export function NeckBlock({ b, c, rows }) {
  const w = c.week;
  return (
    <ActivityBox act="neck" sub={b.sub}>
      <TickTable kind="Neck" slot={b.slot} headers={["Exercise", "Sets × reps"]} rows={rows.map(r => ({ row: r, cells: [r.name, r.planned] }))} />
      <p className="note">Start with just enough resistance to make 25 reps hard. Once 3 × 25 is comfortable, add resistance a little at a time. Move slowly, and stop if you feel sharp pain, tingling or dizziness.{w === 16 ? " Test week: keep it light." : ""}</p>
    </ActivityBox>
  );
}
export function HiitBlock({ b, rows }) {
  return (
    <ActivityBox act="hiit" sub={b.sub} slot={b.slot} doneRow={rows[0]}>
      {HIIT_DAYS.indexOf(b.dname) > -1 ? <Hint>Your HIIT session, done after the main lifts. Running and tibialis are kept on other days so the hard sessions do not stack.</Hint> : null}
    </ActivityBox>
  );
}

/* ---------- non-training day activities ---------- */
export function RunBlock({ b, c, rows }) {
  const [editing, setEditing] = useState(false), [sel, setSel] = useState(c.run.days);
  const wd = b.wd, r = runFor(c.week, wd, c.run), light = isLightRun(wd, c.run), total = runMins(r) + 10;
  return (
    <ActivityBox act="run" sub={b.sub} slot={b.slot} doneRow={rows[0]}>
      <div className="main-lift"><div className="ml-label">Easy jog and walk intervals</div><div className="ml-big">{runDesc(r)}</div>
        <Hint top={2}>About {total} min in total including the warm-up and cool-down</Hint></div>
      <NamedTable headers={["Step", "What to do"]} rows={[["Warm-up", "5 min brisk walk"], ["Main set", runDesc(r)], ["Cool-down", "5 min easy walk"]]} />
      <p className="note">Jog at an easy pace where you could speak in short sentences. {light ? "This is the lighter run of the week: it repeats last week's session, so your legs stay fresh for the next lift. " : ""}If a session feels too hard, repeat the previous week. Runs sit on non-HIIT, non-lifting days so the hard sessions do not stack.{c.week === 15 ? " Light week: keep it easy." : ""}{c.week === 16 ? " Test week: skip or shorten if your legs feel heavy." : ""}</p>
      {!editing ? <Acts><button className="btn" onClick={() => { setSel(c.run.days); setEditing(true); }}>Edit run days</button></Acts> : (
        <div className="planpick"><p className="hint" style={{ margin: "0 0 6px" }}>Run on these non-training days</p>
          <div className="checks">{OFF_DAYS.map(d => <label key={d}><input type="checkbox" checked={sel.indexOf(d) > -1} onChange={e => setSel(e.target.checked ? sel.concat([d]) : sel.filter(x => x !== d))} />{d}</label>)}</div>
          <Acts><button className="btn primary" onClick={() => { setRun({ days: OFF_DAYS.filter(d => sel.indexOf(d) > -1) }); setEditing(false); }}>Save</button><button className="btn" onClick={() => setEditing(false)}>Cancel</button></Acts></div>
      )}
    </ActivityBox>
  );
}
export function TibBlock({ b, c, rows }) {
  const t = c.tib, [editing, setEditing] = useState(false);
  const [d, setD] = useState({ day: t.day, sets: t.sets, reps: t.reps, angles: t.angles.join("\n") });
  const total = t.angles.length * t.sets * t.reps;
  const save = () => {
    const ang = d.angles.split("\n").map(x => x.trim()).filter(Boolean);
    setTib(Object.assign({}, t, { angles: ang.length ? ang : TIB_DEF.angles.slice(), sets: clamp(parseInt(d.sets, 10) || 3, 1, 10), reps: clamp(parseInt(d.reps, 10) || 10, 1, 50), day: d.day }));
    setEditing(false);
  };
  return (
    <ActivityBox act="tib" sub={b.sub}>
      <div className="main-lift"><div className="ml-label">Tib tool</div><div className="ml-big">{t.sets} × {t.reps} <small>at every ankle angle</small></div>
        <Hint top={2}>{t.angles.length} angles · {total} reps in total</Hint></div>
      {!editing ? (
        <>
          <TickTable kind="Tibialis" slot={b.slot} headers={["Ankle angle", "Sets × reps"]} rows={rows.map(r => ({ row: r, cells: [r.name, r.planned] }))} />
          <Acts><button className="btn" onClick={() => { setD({ day: t.day, sets: t.sets, reps: t.reps, angles: t.angles.join("\n") }); setEditing(true); }}>Edit angles, sets or day</button></Acts>
        </>
      ) : (
        <div className="planpick"><DaySelect value={d.day} onChange={v => setD({ ...d, day: v })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <label>Sets<input type="number" min="1" max="10" value={d.sets} onChange={e => setD({ ...d, sets: e.target.value })} /></label>
            <label>Reps<input type="number" min="1" max="50" value={d.reps} onChange={e => setD({ ...d, reps: e.target.value })} /></label></div>
          <label style={{ marginTop: 12 }}>Ankle angles (one per line)<textarea value={d.angles} onChange={e => setD({ ...d, angles: e.target.value })} /></label>
          <Acts><button className="btn primary" onClick={save}>Save</button>
            <button className="btn" onClick={() => { setTib(Object.assign({}, TIB_DEF, { angles: TIB_DEF.angles.slice() })); setEditing(false); }}>Reset to defaults</button>
            <button className="btn" onClick={() => setEditing(false)}>Cancel</button></Acts></div>
      )}
    </ActivityBox>
  );
}

function ListBlock({ b, rows, cfg, defs, setter, act, kind, headers, noun, note, editLabel, placeholderLabel }) {
  const [editing, setEditing] = useState(false);
  const [d, setD] = useState({ day: cfg.day, text: cfg.items.map(x => [x.ex, x.rx, x.note || ""].join(" | ")).join("\n") });
  const save = () => {
    const items = d.text.split("\n").map(l => l.trim()).filter(Boolean).map(l => { const p = l.split("|").map(x => x.trim()); return { ex: p[0], rx: p[1] || "", note: p[2] || "" }; }).filter(x => x.ex);
    setter({ day: d.day, items: items.length ? items : defs.items.map(x => Object.assign({}, x)) });
    setEditing(false);
  };
  return (
    <ActivityBox act={act} sub={b.sub}>
      <TickTable kind={kind} slot={b.slot} headers={headers} rows={rows.map((r, i) => ({ row: r, cells: [r.name, r.planned, cfg.items[i].note || ""] }))} />
      <p className="note">{note}</p>
      {!editing ? <Acts><button className="btn" onClick={() => { setD({ day: cfg.day, text: cfg.items.map(x => [x.ex, x.rx, x.note || ""].join(" | ")).join("\n") }); setEditing(true); }}>{editLabel}</button></Acts> : (
        <div className="planpick"><DaySelect value={d.day} onChange={v => setD({ ...d, day: v })} />
          <label style={{ marginTop: 12 }}>{placeholderLabel}<textarea style={{ minHeight: 140 }} value={d.text} onChange={e => setD({ ...d, text: e.target.value })} /></label>
          <Acts><button className="btn primary" onClick={save}>Save</button>
            <button className="btn" onClick={() => { setter({ day: defs.day, items: defs.items.map(x => Object.assign({}, x)) }); setEditing(false); }}>Reset to defaults</button>
            <button className="btn" onClick={() => setEditing(false)}>Cancel</button></Acts></div>
      )}
    </ActivityBox>
  );
}
export const MobBlock = p => <ListBlock {...p} cfg={p.c.mob} defs={MOB_DEF} setter={setMob} act="mobility" kind="Mobility" headers={["Exercise", "Sets × reps or time", "Notes"]}
  note="About 10 to 15 minutes. Move into each position gradually and stay within a range that feels comfortable." editLabel="Edit mobility" placeholderLabel="Exercises (one per line: name | sets × reps | note)" />;
export const StrBlock = p => <ListBlock {...p} cfg={p.c.str} defs={STR_DEF} setter={setStr} act="stretch" kind="Stretching" headers={["Stretch", "Sets × time", "Notes"]}
  note="Hold each stretch steadily and breathe. Ease off if you feel sharp pain or tingling." editLabel="Edit stretching" placeholderLabel="Stretches (one per line: name | sets × time | note)" />;

export function SwimBlock({ b, c, rows }) {
  const sw = c.swim, [editing, setEditing] = useState(false), [d, setD] = useState({ day: sw.day, mins: sw.mins, notes: sw.notes });
  return (
    <ActivityBox act="swim" sub={b.sub} slot={b.slot} doneRow={rows[0]}>
      <div className="main-lift"><div className="ml-label">Swim</div><div className="ml-big">{sw.mins} min <small>easy aerobic</small></div>
        {sw.notes ? <Hint>{sw.notes}</Hint> : null}
        <Hint>Low-impact volume that suits half-marathon training. Keep it easy so your legs and back are fresh for the next lift.</Hint></div>
      {!editing ? <Acts><button className="btn" onClick={() => { setD({ day: sw.day, mins: sw.mins, notes: sw.notes }); setEditing(true); }}>Edit swim</button></Acts> : (
        <div className="planpick"><DaySelect value={d.day} onChange={v => setD({ ...d, day: v })} />
          <label style={{ marginTop: 12 }}>Minutes<input type="number" min="5" max="180" value={d.mins} onChange={e => setD({ ...d, mins: e.target.value })} /></label>
          <label style={{ marginTop: 12 }}>What you swim (optional)<textarea placeholder="e.g. 20 × 50 m, steady laps" value={d.notes} onChange={e => setD({ ...d, notes: e.target.value })} /></label>
          <Acts><button className="btn primary" onClick={() => { setSwim({ day: d.day, mins: clamp(parseInt(d.mins, 10) || 30, 5, 180), notes: d.notes.trim() }); setEditing(false); }}>Save</button>
            <button className="btn" onClick={() => setEditing(false)}>Cancel</button></Acts></div>
      )}
    </ActivityBox>
  );
}
