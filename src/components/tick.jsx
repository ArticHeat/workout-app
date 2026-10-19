/* Tick boxes, rest timer button and the sets/reps/weight panel. These are the pieces that sit inside each activity box. */
import { createContext, useContext, useEffect, useState } from "react";
import { SPRING_KG } from "../data/schedule.js";
import { logId, setDetail, setTick } from "../state/log.js";
import { sheetEnqueue, sheetRow } from "../lib/sheetlog.js";
import { useTimer, timerLeft, fmtClock, startTimer, togglePause } from "../state/timer.js";
import { timeOf } from "../lib/session.js";
import { nowISO } from "../lib/util.js";

export const SessionCtx = createContext(null);
export const useSession = () => useContext(SessionCtx);

const CLOCK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 2h6" /></svg>
);
export const restFor = (kind, main) => kind === "Powerlifting" ? (main ? 180 : 90) : 60;
export const restHint = (kind, main) => kind === "Powerlifting" ? (main ? "Heavy lifts: 3 min is optimal, more is fine" : "Accessories: 1-2 min is plenty") : "Short rest: about 1 min";

/* Tick or untick one exercise and queue it for the Google Sheet */
export function useTickActions() {
  const s = useSession();
  return function tick(row, checked, slot) {
    const time = timeOf(slot);
    setTick({ week: s.week, wd: s.wd, key: row.k, checked, planned: row.planned, time, items: s.items });
    const id = logId(s.week, s.wd);
    const rec = s.getRec();
    sheetEnqueue(sheetRow(id, row.k, checked ? rec.done[row.k] : { planned: row.planned, time_of_day: time }, checked));
  };
}

export function TickBox({ row, slot, kind }) {
  const s = useSession(), tick = useTickActions();
  const checked = !!(s.rec.done && s.rec.done[row.k]);
  return <input type="checkbox" className="tick" checked={checked} aria-label={"Mark done: " + row.name} onChange={e => tick(row, e.target.checked, slot)} />;
}

function RestFace({ row, kind, active, t }) {
  const left = active ? timerLeft(t) : 0, over = active && left < 0;
  const main = !!row.main, secs = restFor(kind, main), hint = restHint(kind, main);
  const label = row.name;
  return (
    <button type="button" className={"rtbtn" + (active && !over ? " on" : "") + (over ? " over" : "")} title={"Rest timer: " + hint} aria-label={"Rest timer for " + label}
      onClick={() => { if (active) togglePause(); else startTimer(row.k, label, secs, hint); }}>
      {CLOCK}
      <span className="rtt">{active ? (over ? "+" : "") + fmtClock(left) + (t.paused ? " ⏸" : "") : ""}</span>
    </button>
  );
}
/* Only the button whose timer is running re-renders every tick */
function ActiveRest({ row, kind }) { const t = useTimer(s => s); return <RestFace row={row} kind={kind} active t={t} />; }
export function RestButton({ row, kind }) {
  const active = useTimer(t => t.key === row.k);
  return active ? <ActiveRest row={row} kind={kind} /> : <RestFace row={row} kind={kind} active={false} t={null} />;
}

const springKg = k => SPRING_KG[k.split("|").slice(1).join("|").trim().toLowerCase()] || 0;
export function forceFor(k, springs) {
  const kg = springKg(k); if (!kg) return "";
  return String(springs || "").split("/").map(x => parseFloat(x)).filter(x => x > 0).map(x => x * kg).join("/");
}
/* Pre-fill sets, reps and weight from the planned text, e.g. "4 × 10 @ 85 kg" or "3 springs · 3 × 10" */
export function detailDefaults(planned, saved) {
  if (saved) return saved;
  const o = { sets: "", reps: "", weight: "", springs: "" };
  let m = String(planned).match(/(\d+)\s*×\s*(\d+)\s*@\s*([\d.]+)\s*kg/);
  if (m) { o.sets = m[1]; o.reps = m[2]; o.weight = m[3]; return o; }
  m = String(planned).match(/(\d+)\s*springs?\s*·\s*(\d+)\s*×\s*(\d+)/);
  if (m) { o.springs = m[1]; o.sets = m[2]; o.reps = m[3]; return o; }
  m = String(planned).match(/^\s*(\d+)\s*×\s*(\d+)\s*(?:$|·)/);
  if (m) { o.sets = m[1]; o.reps = m[2]; return o; }
  m = String(planned).match(/^\s*(\d+)\s*[×x]/);
  if (m) o.sets = m[1];
  return o;
}

export function LogButton({ row }) {
  const s = useSession(), open = !!s.open[row.k], has = !!(s.rec.detail && s.rec.detail[row.k]);
  return (
    <button type="button" className={"dtbtn" + (has ? " has" : "")} aria-expanded={open} title={"Log sets, reps and " + (springKg(row.k) ? "springs" : "weight")} onClick={() => s.toggleOpen(row.k)}>Log ▾</button>
  );
}

function Field({ label, value, onChange, onCommit, step, placeholder, field }) {
  return (
    <label>{label}
      <input type="number" inputMode="decimal" className="dtf" data-f={field} min="0" step={step} value={value} placeholder={placeholder || ""}
        onChange={e => onChange(e.target.value)} onBlur={onCommit} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} />
    </label>
  );
}

export function LogPanel({ row }) {
  const s = useSession(), saved = s.rec.detail && s.rec.detail[row.k];
  const nm = row.k.split("|").slice(1).join("|").trim().toLowerCase(), kg = springKg(row.k);
  const init = detailDefaults(row.planned, saved), sp = String(init.springs || "").split("/");
  const [f, setF] = useState({ sets: init.sets || "", reps: init.reps || "", weight: init.weight || "", springsA: sp[0] || "", springsB: sp[1] || "" });
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (saved && !dirty) {
      const p = String(saved.springs || "").split("/");
      setF({ sets: saved.sets || "", reps: saved.reps || "", weight: saved.weight || "", springsA: p[0] || "", springsB: p[1] || "" });
    }
  }, [saved && saved.at]); // eslint-disable-line
  const set = key => v => { setDirty(true); setF(x => Object.assign({}, x, { [key]: v })); };
  const commit = () => {
    if (!dirty) return;
    const springs = f.springsB ? f.springsA + "/" + f.springsB : f.springsA;
    const detail = { sets: f.sets, reps: f.reps, weight: f.weight, springs, force: forceFor(row.k, springs), at: nowISO() };
    const { rec } = setDetail({ week: s.week, wd: s.wd, key: row.k, detail, items: s.items });
    sheetEnqueue(sheetRow(logId(s.week, s.wd), row.k, rec.done && rec.done[row.k] ? rec.done[row.k] : { planned: row.planned, time_of_day: timeOf(row.slot) }, !!(rec.done && rec.done[row.k])));
    setDirty(false);
  };
  const springs = f.springsB ? f.springsA + "/" + f.springsB : f.springsA, force = forceFor(row.k, springs);
  return (
    <div className="logpanel" data-k={row.k}>
      {kg ? (
        <>
          {nm === "chest expander"
            ? <><Field field="springsA" label="Springs, overhead / above chest" value={f.springsA} onChange={set("springsA")} onCommit={commit} step={1} placeholder="4" />
                <Field field="springsB" label="Springs, in front of chest" value={f.springsB} onChange={set("springsB")} onCommit={commit} step={1} placeholder="3" /></>
            : <Field field="springsA" label="Springs" value={f.springsA} onChange={set("springsA")} onCommit={commit} step={1} />}
          <Field field="sets" label="Sets" value={f.sets} onChange={set("sets")} onCommit={commit} step={1} />
          <Field field="reps" label="Reps per set" value={f.reps} onChange={set("reps")} onCommit={commit} step={1} />
          <span className="force" data-force>{force ? "Force " + force + " kg" : ""}</span>
        </>
      ) : (
        <>
          <Field field="sets" label="Sets" value={f.sets} onChange={set("sets")} onCommit={commit} step={1} />
          <Field field="reps" label="Reps per set" value={f.reps} onChange={set("reps")} onCommit={commit} step={1} />
          <Field field="weight" label="Weight (kg)" value={f.weight} onChange={set("weight")} onCommit={commit} step={0.5} />
        </>
      )}
      <span className="logsaved">{saved && saved.at && !dirty ? "Saved" : dirty ? "Unsaved" : "Not logged yet"}</span>
    </div>
  );
}

/* A table whose rows each carry a tick box, rest timer and log button. `cells` are [name, planned, ...others]. */
export function TickTable({ kind, slot, headers, rows, empty }) {
  const s = useSession(), cols = headers.length + 1;
  return (
    <div className="tbl-scroll">
      <table>
        <thead><tr><th className="tickcell">Done</th>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 && empty}
          {rows.flatMap(r => {
            const row = Object.assign({ slot }, r.row), done = !!(s.rec.done && s.rec.done[row.k]);
            const out = [
              <tr key={row.k} className={done ? "ticked" : ""}>
                <td className="tickcell"><TickBox row={row} slot={slot} kind={kind} /></td>
                <td>{r.cells[0]}</td>
                <td>{r.cells[1]}<RestButton row={row} kind={kind} /><LogButton row={row} /></td>
                {r.cells.slice(2).map((c, i) => <td key={i}>{c}</td>)}
              </tr>
            ];
            if (s.open[row.k]) out.push(<tr key={row.k + "-log"} className="logrow"><td colSpan={cols}><LogPanel row={row} /></td></tr>);
            return out;
          })}
        </tbody>
      </table>
    </div>
  );
}
