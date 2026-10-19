import { useEffect, useMemo, useState } from "react";
import { DAYS, INT, LIFTS } from "../data/program.js";
import { ACT, HIIT_DAYS, NECK_DAYS, SAND, SLOT_NAME, SLOT_ROWS, OFF_LABEL, OFF_KIND, neckSets } from "../data/schedule.js";
import { FA_DAY, FA_OFF } from "../data/forearm.js";
import { useApp, setDay, setSlot, setTab } from "../state/app.js";
import { useLog, logId, tickCount } from "../state/log.js";
import { faInfo, liftName, mainWork, offItems, phaseOf, rmNum, tonnage, runFor, runDesc } from "../lib/plan.js";
import { hmChipText } from "../lib/hm.js";
import { fmt, round } from "../lib/util.js";
import WeekStrip from "../components/WeekStrip.jsx";
import Session from "../components/Session.jsx";

function Chips({ week, rm, hm }) {
  const log = useLog(s => s.log);
  const edit = () => { setTab("overview"); const k = (LIFTS.find(l => !rmNum(rm[l.key])) || LIFTS[0]).key; setTimeout(() => { const el = document.getElementById(k); if (el) { el.scrollIntoView({ block: "center" }); el.focus(); } }, 0); };
  return (
    <div className="chips">
      <span className="hint" style={{ margin: 0 }}>Your 1RMs:</span>
      {LIFTS.map(l => <span className="chip" key={l.key}>{l.name} <b>{rmNum(rm[l.key]) ? rmNum(rm[l.key]) + " kg" : "not set"}</b></span>)}
      <span className="chip">Ticked this week <b id="tickchip">{tickCount(log, week)}</b></span>
      <span className="chip">Half marathon <b>{hmChipText(hm)}</b></span>
      <button className="linkbtn" id="editrm" onClick={edit}>Edit in Training Overview</button>
    </div>
  );
}

function Summary({ c }) {
  const { week, run } = c, p = phaseOf(week);
  const total = LIFTS.reduce((t, l) => t + tonnage(week, rmNum(c.rm[l.key])), 0);
  return (
    <div className="summary">
      <div className="tile" style={{ "--c": p.color }}><span>Week {week} · {p.name}</span><b>{INT[week - 1]}% of 1RM</b></div>
      <div className="tile"><span>Training days</span><b>4 lifts · 2 HIIT · {run.days.length} run{run.days.length === 1 ? "" : "s"}</b><span>+ tibialis, swim{week <= 6 ? ", forearm A/B/C" : ""}</span></div>
      <div className="tile"><span>Main-lift volume this week</span><b>{total ? fmt(total) + " kg" : "—"}</b></div>
    </div>
  );
}

function SlotBar({ slots }) {
  return (
    <div className="slotbar" id="slotbar">
      <span>Session times:</span>
      {SLOT_ROWS.map(([k, label]) => (
        <label key={k}>{label}
          <select value={slots[k]} aria-label={label + " time of day"} onChange={e => setSlot(k, e.target.value)}>
            {["AM", "PM"].map(sl => <option key={sl} value={sl}>{SLOT_NAME[sl]}</option>)}
          </select>
        </label>
      ))}
      <div className="alegend" aria-label="Activity colours">
        {Object.keys(ACT).map(k => <span className="achip" key={k} style={{ "--ac": ACT[k].c }}><i></i>{ACT[k].name}</span>)}
      </div>
    </div>
  );
}

const slotRows = items => ["AM", "PM"].map(sl => items.filter(i => i.slot === sl).map((i, n) => (
  <span className="dm act" key={sl + n + i.kind} style={{ "--ac": ACT[i.kind].c }}><b>{sl}</b>{i.text}</span>
)));

function DayCards({ c }) {
  const { week, day, slots } = c, p = phaseOf(week), log = useLog(s => s.log);
  const prog = wd => { const rec = log[logId(week, wd)], n = rec && rec.done ? Object.keys(rec.done).length : 0; return n ? <span className="dm progline">✓ {n}{rec.total ? "/" + rec.total : ""} done</span> : null; };
  return (
    <div className="days" id="days" role="group" aria-label="Training days">
      {DAYS.map(d => {
        if (!d.lift) {
          const it = offItems(d.d, week, c);
          if (!it.length) return <div className="day rest" key={d.d}><span className="dn">{d.d}</span><span className="dl">Rest</span></div>;
          const text = x => x === "run" ? runText(week, d.d, c) : x === "tib" ? "Tibialis " + c.tib.sets + " × " + c.tib.reps + " each angle" : x === "swim" ? "Swim " + c.swim.mins + " min" : x === "mob" ? "Mobility, " + c.mob.items.length + " moves" : x === "str" ? "Stretching, " + c.str.items.length + " stretches" : x === "fa" ? "Forearm " + FA_OFF[d.d] + (week === 7 ? " (deload)" : "") : (week === 16 ? "Sandbag skipped (test week)" : "Sandbag carry " + (week === 15 ? 5 : 10) + " min");
          const slotOf = x => x === "fa" ? slots.forearm : x === "carry" ? slots.sandbag : slots[x];
          const parts = it.map(x => ({ slot: slotOf(x), kind: OFF_KIND[x], text: text(x) }));
          const label = it.map(x => x === "fa" ? "Forearm " + FA_OFF[d.d] : OFF_LABEL[x]).join(" + ");
          return (
            <button key={d.d} className="day" style={{ "--c": "var(--taper)" }} data-lift={"off:" + d.d} aria-pressed={day === "off:" + d.d} onClick={() => setDay("off:" + d.d)}>
              <span className="dn">{d.d}</span><span className="dl">{label}</span>{slotRows(parts)}<span className="dm">Non-training day</span>{prog(d.d)}
            </button>
          );
        }
        const rm = rmNum(c.rm[d.lift]), mw = mainWork(week);
        const meta = week === 16 ? "Max test" : mw[0].sets + " × " + mw[0].reps + " @ " + mw[0].pct + "%" + (rm ? " · " + round(rm * mw[0].pct / 100) + " kg" : "");
        const parts = [{ slot: slots.lift, kind: "lift", text: meta }];
        if (faInfo(week, d.lift)) parts.push({ slot: slots.forearm, kind: "forearm", text: "Forearm " + FA_DAY[d.lift] + (week === 7 ? " (deload)" : "") });
        if (SAND[d.lift]) parts.push({ slot: slots.sandbag, kind: "sandbag", text: week === 16 ? "Sandbag skipped (test week)" : d.lift === "dl" ? "Sandbag lean + row" : "Sandbag carry " + (week === 15 ? 5 : 10) + " min" });
        if (NECK_DAYS.indexOf(d.lift) > -1) parts.push({ slot: slots.neck, kind: "neck", text: "Neck " + neckSets(week) + " × 25" });
        if (HIIT_DAYS.indexOf(d.d) > -1) parts.push({ slot: slots.hiit, kind: "hiit", text: slots.hiit === slots.lift ? "then HIIT" : "HIIT" });
        return (
          <button key={d.d} className="day" style={{ "--c": p.color }} data-lift={d.lift} aria-pressed={d.lift === day} onClick={() => setDay(d.lift)}>
            <span className="dn">{d.d}</span><span className="dl">{liftName(d.lift)}</span>{slotRows(parts)}{prog(d.d)}
          </button>
        );
      })}
    </div>
  );
}
const runText = (week, wd, c) => runDesc(runFor(week, wd, c.run));

export default function Weekly() {
  const week = useApp(s => s.week), day = useApp(s => s.day), a = useApp(s => s);
  const [editing, setEditing] = useState(false);
  useEffect(() => { setEditing(false); }, [week, day]);
  const c = useMemo(() => ({ week, day, rm: a.rm, custom: a.custom, slots: a.slots, tib: a.tib, run: a.run, swim: a.swim, mob: a.mob, str: a.str }), [week, day, a.rm, a.custom, a.slots, a.tib, a.run, a.swim, a.mob, a.str]);
  return (
    <section id="tab-weekly" className="wrap">
      <h1>Weekly dashboard</h1>
      <p className="sub">Pick a week, then a training day to see the main lift, its weight, and the accessory work.</p>
      <WeekStrip />
      <Chips week={week} rm={a.rm} hm={a.hm} />
      <Summary c={c} />
      <SlotBar slots={a.slots} />
      <DayCards c={c} />
      <Session c={c} editing={editing} setEditing={setEditing} />
    </section>
  );
}
