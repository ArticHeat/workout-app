/* The session card on the Weekly Dashboard: header, progress and the morning/evening activity boxes. */
import { useMemo, useState } from "react";
import { SLOT_NAME, OFF_LABEL } from "../data/schedule.js";
import { FA_OFF } from "../data/forearm.js";
import { phaseOf, offItems } from "../lib/plan.js";
import { sessionModel } from "../lib/session.js";
import { logId, logStore, useLog } from "../state/log.js";
import { useStatus } from "../state/status.js";
import { sheetSyncAll } from "../lib/sheetlog.js";
import { SessionCtx } from "./tick.jsx";
import { LiftBlock, ForearmBlock, SandBlock, NeckBlock, HiitBlock, RunBlock, TibBlock, MobBlock, StrBlock, SwimBlock } from "./blocks.jsx";
import { DAYS } from "../data/program.js";
import { liftName } from "../lib/plan.js";

const offLabel = (x, wd) => x === "fa" ? "Forearm " + FA_OFF[wd] : OFF_LABEL[x];

function renderBlock(b, c, rows, editing, setEditing) {
  const p = { b, c, rows }, key = c.day + "-" + b.id;
  switch (b.type) {
    case "lift": return <LiftBlock key={key} {...p} editing={editing} setEditing={setEditing} />;
    case "fa": return <ForearmBlock key={key} {...p} />;
    case "sand": return <SandBlock key={key} {...p} />;
    case "neck": return <NeckBlock key={key} {...p} />;
    case "hiit": return <HiitBlock key={key} {...p} />;
    case "run": return <RunBlock key={key} {...p} />;
    case "tib": return <TibBlock key={key} {...p} />;
    case "mob": return <MobBlock key={key} {...p} />;
    case "str": return <StrBlock key={key} {...p} />;
    case "swim": return <SwimBlock key={key} {...p} />;
    default: return null;
  }
}

export default function Session({ c, editing, setEditing }) {
  const { week, day } = c, off = day.indexOf("off:") === 0, wd = off ? day.slice(4) : DAYS.find(d => d.lift === day).d;
  const id = logId(week, wd), log = useLog(s => s.log), rec = log[id] || { done: {} };
  const st = useStatus(s => s);
  const model = useMemo(() => sessionModel(c, editing), [c, editing]); // eslint-disable-line
  const [openAll, setOpenAll] = useState({});
  const open = {}; model.items.forEach(k => { open[k] = !!openAll[id + "|" + k]; });
  const ctx = { week, wd, rec, items: model.items, open, toggleOpen: k => setOpenAll(o => Object.assign({}, o, { [id + "|" + k]: !o[id + "|" + k] })), getRec: () => logStore.get().log[id] || { done: {} } };
  const p = phaseOf(week), total = model.items.length, on = model.items.filter(k => rec.done && rec.done[k]).length;
  const it = off ? offItems(wd, week, c) : [];

  const sections = ["AM", "PM"].map(sl => {
    const bs = model.blocks.filter(b => b.slot === sl);
    return (
      <section className="slot" key={sl}>
        <div className="slot-h"><span className={"slotpill " + sl.toLowerCase()}>{SLOT_NAME[sl]}</span></div>
        {bs.length ? bs.map(b => renderBlock(b, c, model.rowsById[b.id], editing, setEditing)) : <p className="hint" style={{ margin: "8px 0 0" }}>Nothing scheduled.</p>}
      </section>
    );
  });

  const head = (
    <div className="session-head">
      <div>
        {off
          ? <><div className="tag">{wd} · Week {week} · Non-training day</div><h2>{it.length ? it.map(x => offLabel(x, wd)).join(" + ") + " day" : "Rest day"}</h2></>
          : <><div className="tag">{wd} · Week {week} · {p.name}</div><h2>{liftName(day)} day</h2></>}
      </div>
      {total ? (
        <div>
          <div className="tickprog" id="tickprog">{on} of {total} done</div>
          <div className="note" id="tickstatus" style={{ margin: "2px 0 0" }}>{st.tick}</div>
          <div className="note" id="sheetstatus" style={{ margin: "2px 0 0" }}>{st.sheet}</div>
          <button type="button" className="btn" id="sheetsync" style={{ marginTop: 6 }} onClick={sheetSyncAll}>Sync to Google Sheet</button>
        </div>
      ) : null}
    </div>
  );

  if (off && !it.length) return (
    <section className="card session" id="session" style={{ "--c": "var(--taper)" }}>{head}<p className="hint">Nothing scheduled. Rest and recover.</p></section>
  );
  return (
    <SessionCtx.Provider value={ctx}>
      <section className="card session" id="session" aria-live="polite" style={{ "--c": off ? "var(--taper)" : p.color }}>
        {head}
        {sections}
        <div className="focus"><dt>{off ? "Why a non-training day" : "Phase focus"}</dt>
          <p>{off
            ? (it.indexOf("fa") > -1 || it.indexOf("carry") > -1
              ? "These sessions sit away from your heavy lifts and your Monday and Tuesday HIIT, and the grip-heavy work is at least 48 hours after Thursday's deadlifts."
              : "Light, low-fatigue work, so it does not compete with your lifts or your Monday and Tuesday HIIT.")
            : p.focus}</p></div>
      </section>
    </SessionCtx.Provider>
  );
}
