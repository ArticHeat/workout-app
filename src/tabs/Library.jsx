import { useState } from "react";
import { PHASES, LIFTS } from "../data/program.js";
import { FOCI } from "../data/library.js";
import { PHASE_SHORT } from "../data/schedule.js";
import { useApp, setCustom, setLibrary, setEq, setUi, jumpToEquipment } from "../state/app.js";
import { planCells, faWeeksFor, otherPlanTags, planSummary, suggestCells, inAnyPlan, editPlan, renameInPlan } from "../lib/plan.js";
import { sameName, uid } from "../lib/util.js";

const LIB_LIFTS = LIFTS.concat([{ key: "addon", name: "Grip conditioning" }, { key: "stretch", name: "Stretching" }]);
const libLiftName = k => (LIB_LIFTS.find(l => l.key === k) || { name: k }).name;
const isStretch = x => (x.lifts || []).indexOf("stretch") > -1;

function PlanPicker({ x, sel, setSel, onApply, onCancel }) {
  const toggle = (c, on) => setSel(on ? sel.filter(v => v !== c).concat([c]) : sel.filter(v => v !== c));
  return (
    <div className="planpick">
      <p className="hint" style={{ margin: "0 0 6px" }}>Tick where this exercise goes. Ticked boxes are in your Weekly Dashboard accessory work for that lift day and phase.</p>
      <table className="pgrid">
        <thead><tr><th></th>{PHASES.map(ph => <th scope="col" key={ph.id}>{PHASE_SHORT[ph.id]}</th>)}</tr></thead>
        <tbody>
          {LIFTS.map(l => (
            <tr key={l.key}><th scope="row">{l.name}</th>
              {PHASES.map(ph => { const c = l.key + "-" + ph.id; return <td key={c}><input type="checkbox" data-cell={c} aria-label={l.name + " day, " + ph.name} checked={sel.indexOf(c) > -1} onChange={e => toggle(c, e.target.checked)} /></td>; })}
            </tr>
          ))}
        </tbody>
      </table>
      {x.lifts.indexOf("addon") > -1 ? <p className="note">Grip-heavy work is best kept at least 48 h away from heavy deadlifts.</p> : null}
      <div className="acc-tools"><button className="btn primary" onClick={onApply}>Apply to plan</button><button className="btn" onClick={onCancel}>Cancel</button></div>
    </div>
  );
}

function Editor({ draft, setDraft, isNew, onSave, onCancel }) {
  const toggleIn = (key, v, on) => setDraft({ ...draft, [key]: on ? draft[key].filter(k => k !== v).concat([v]) : draft[key].filter(k => k !== v) });
  return (
    <section className="card editor" aria-label="Exercise editor">
      <h2>{isNew ? "New exercise" : "Edit exercise"}</h2>
      <label>Exercise name<input type="text" id="dname" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Pause bench" /></label>
      {draft.err ? <p className="err">Give the exercise a name before saving.</p> : null}
      <div className="two">
        <label>Muscle focus<select id="dfocus" value={draft.focus} onChange={e => setDraft({ ...draft, focus: e.target.value })}><option value="">Not set</option>{FOCI.map(f => <option key={f}>{f}</option>)}</select></label>
        <label>Default sets × reps<input type="text" id="dsets" value={draft.sets} onChange={e => setDraft({ ...draft, sets: e.target.value })} placeholder="e.g. 3 × 8–10" /></label>
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: "12px 0 0" }}><legend className="hint" style={{ padding: 0 }}>Supports which lift day, grip conditioning, or stretching</legend>
        <div className="checks">{LIB_LIFTS.map(l => <label key={l.key}><input type="checkbox" data-lift={l.key} checked={draft.lifts.indexOf(l.key) > -1} onChange={e => toggleIn("lifts", l.key, e.target.checked)} />{l.name}</label>)}</div></fieldset>
      <fieldset style={{ border: 0, padding: 0, margin: "14px 0 0" }}><legend className="hint" style={{ padding: 0 }}>Best use in periodisation (leave all unticked for all phases)</legend>
        <div className="checks">{PHASES.map(ph => <label key={ph.id}><input type="checkbox" data-phase={ph.id} checked={draft.phases.indexOf(ph.id) > -1} onChange={e => toggleIn("phases", ph.id, e.target.checked)} />{ph.name}</label>)}</div></fieldset>
      <label>Notes and cues<textarea id="dnotes" value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="Setup, tempo, when to use it…" /></label>
      <div className="acc-tools"><button className="btn primary" onClick={onSave}>Save exercise</button><button className="btn" onClick={onCancel}>Cancel</button></div>
    </section>
  );
}

function Card({ x, a, st, onAct }) {
  const cells = planCells(a.custom, x.name), fa = faWeeksFor(x.name), tb = otherPlanTags(x.name, a);
  const inPlan = cells.length > 0 || fa.length > 0 || tb.length > 0, open = st.planOpen === x.id, sure = st.delId === x.id;
  const eqs = a.eq.filter(e => e.links.some(n => sameName(n, x.name)));
  const tags = x.lifts.map(k => libLiftName(k)).concat(x.focus ? [x.focus] : []);
  return (
    <article className={"card wcard " + (inPlan ? "in" : "out")}>
      <h3>{x.name}</h3>
      <div className="status" role="status">
        <span className={"pill " + (inPlan ? "on" : "off")}><span aria-hidden="true">{inPlan ? "✓" : "○"}</span>{inPlan ? "In plan" : "Not in plan"}</span>
        {inPlan ? <small>{[planSummary(cells)].concat(fa.length ? ["Forearm program: " + fa.join(", ")] : []).concat(tb).filter(Boolean).join(" · ")}</small> : null}
      </div>
      <div className="periodrow"><span className="plabel">Best use in periodisation</span>
        {x.phases.length ? PHASES.filter(p => x.phases.indexOf(p.id) > -1).map(p => <span className="pchip" key={p.id} style={{ "--c": p.color }}>{p.name}</span>) : <span className="pchip">All phases</span>}</div>
      {eqs.length ? <div className="eqrow"><span className="plabel">Equipment</span>{eqs.map(e => <button key={e.id} className="eqchip" data-act="eq" onClick={() => jumpToEquipment(e.name)}>{e.name}</button>)}</div> : null}
      <div className="tags">{tags.map((t, i) => <span className="tag2" key={i}>{t}</span>)}</div>
      {x.sets ? <div className="sr">{x.sets} <small>default</small></div> : null}
      {x.notes ? <p className="note">{x.notes}</p> : null}
      <div className="acc-tools">
        <button className={"btn" + (inPlan ? "" : " primary")} aria-expanded={open} onClick={() => onAct("plan", x)}>{inPlan ? "Edit plan" : "Add to plan"}</button>
        <button className="btn" onClick={() => onAct("edit", x)}>Edit</button>
        <button className="btn" onClick={() => onAct("dup", x)}>Duplicate</button>
        <button className={"btn danger" + (sure ? " sure" : "")} onClick={() => onAct("del", x)}>{sure ? "Confirm delete" : "Delete"}</button>
      </div>
      {open ? <PlanPicker x={x} sel={st.planSel} setSel={v => onAct("sel", x, v)} onApply={() => onAct("planapply", x)} onCancel={() => onAct("plancancel", x)} /> : null}
    </article>
  );
}

export default function Library() {
  const a = useApp(s => s), { libQuery, libFilter, libStatus } = a.ui, library = a.library;
  const [st, setSt] = useState({ libEdit: null, draft: null, delId: null, msg: "", planOpen: null, planSel: [] });
  const patch = p => setSt(s => ({ ...s, ...p }));

  const q = libQuery.trim().toLowerCase();
  const list = library
    .filter(x => libFilter === "all" || x.lifts.indexOf(libFilter) > -1)
    .filter(x => libStatus === "all" || (libStatus === "in") === inAnyPlan(x.name, a.custom, a))
    .filter(x => !q || (x.name + " " + x.focus + " " + x.notes).toLowerCase().indexOf(q) > -1)
    .sort((x, y) => x.name.localeCompare(y.name));
  const nIn = library.filter(x => inAnyPlan(x.name, a.custom, a)).length;

  const act = (k, x, v) => {
    if (k !== "del") patch({ delId: null });
    if (k === "sel") { patch({ planSel: v }); return; }
    if (k === "plan") {
      if (st.planOpen === x.id) patch({ planOpen: null, msg: "" });
      else { const cur = planCells(a.custom, x.name); patch({ planOpen: x.id, planSel: cur.length ? cur : suggestCells(x), msg: "" }); }
    } else if (k === "plancancel") patch({ planOpen: null });
    else if (k === "planapply") {
      const cur = planCells(a.custom, x.name); let next = a.custom, add = 0, rem = 0;
      LIFTS.forEach(l => PHASES.forEach(ph => {
        const c = l.key + "-" + ph.id, was = cur.indexOf(c) > -1, want = st.planSel.indexOf(c) > -1;
        if (!was && want) { next = editPlan(next, l.key, ph.id, arr => arr.push([x.name, x.sets || "3 × 10"])); add++; }
        else if (was && !want) { next = editPlan(next, l.key, ph.id, arr => { const keep = arr.filter(r => !sameName(r[0], x.name)); arr.length = 0; keep.forEach(r => arr.push(r)); }); rem++; }
      }));
      setCustom(next);
      patch({ planOpen: null, msg: add || rem ? x.name + ": " + add + " added to and " + rem + " removed from your plan." : "No changes to your plan." });
    } else if (k === "edit") patch({ libEdit: x.id, draft: { name: x.name, focus: x.focus, sets: x.sets, lifts: x.lifts.slice(), phases: x.phases.slice(), notes: x.notes }, msg: "" });
    else if (k === "dup") { setLibrary(library.concat([Object.assign({}, x, { id: uid(), name: x.name + " (copy)", lifts: x.lifts.slice(), phases: x.phases.slice(), created: Date.now() })])); patch({ msg: "" }); }
    else if (k === "del") { if (st.delId === x.id) { setLibrary(library.filter(e => e.id !== x.id)); patch({ delId: null }); } else patch({ delId: x.id }); }
  };
  const save = () => {
    const d = st.draft;
    if (!d.name.trim()) { patch({ draft: { ...d, err: true } }); setTimeout(() => { const n = document.getElementById("dname"); if (n) n.focus(); }, 0); return; }
    const rec = { name: d.name.trim(), focus: d.focus, sets: d.sets.trim(), lifts: d.lifts, phases: d.phases.length === PHASES.length ? [] : d.phases.slice().sort(), notes: d.notes.trim() };
    if (st.libEdit === "new") setLibrary(library.concat([Object.assign({ id: uid(), created: Date.now() }, rec)]));
    else {
      const old = library.find(x => x.id === st.libEdit);
      if (old && old.name !== rec.name) {
        setCustom(renameInPlan(a.custom, old.name, rec.name));
        const eq = a.eq.map(e => Object.assign({}, e, { links: e.links.map(n => sameName(n, old.name) ? rec.name : n) }));
        setEq(eq);
      }
      setLibrary(library.map(x => x.id === st.libEdit ? Object.assign({}, x, rec) : x));
    }
    patch({ libEdit: null, draft: null, msg: "" });
  };
  const newEx = () => patch({ libEdit: "new", draft: { name: "", focus: "", sets: "", lifts: libFilter !== "all" ? [libFilter] : [], phases: [], notes: "" }, msg: "", delId: null });

  const cards = xs => <div className="lib-grid">{xs.map(x => <Card key={x.id} x={x} a={a} st={st} onAct={act} />)}</div>;
  let grid;
  if (!library.length && !st.libEdit) grid = <section className="card empty-state"><h2>No exercises yet</h2><p>Add the exercises you like to use, with the lift they support and your usual sets and reps.</p><div className="acc-tools"><button className="btn primary" onClick={newEx}>Add your first exercise</button></div></section>;
  else if (!list.length) grid = library.length ? <p className="hint" style={{ marginTop: 16 }}>No exercises match this filter.</p> : null;
  else if (libFilter === "all") {
    const main = list.filter(x => !isStretch(x)), s = list.filter(isStretch);
    grid = <>{main.length ? cards(main) : null}{s.length ? <><h2 className="libsec">Stretching <span className="pill on" style={{ fontSize: ".8rem", verticalAlign: "middle" }}>{s.length}</span></h2>{cards(s)}</> : null}</>;
  } else grid = cards(list);

  return (
    <section id="tab-library" className="wrap">
      <h1>Exercise library</h1>
      <p className="sub">Your own exercises, one at a time. Later they can feed AI suggestions and the accessory work in the Weekly Dashboard.</p>
      <div id="lib">
        <div className="toolbar" role="group" aria-label="Filter by lift day or grip conditioning">
          {[{ key: "all", name: "All" }].concat(LIB_LIFTS).map(f => <button key={f.key} className="btn" aria-pressed={libFilter === f.key} onClick={() => { setUi({ libFilter: f.key }); patch({ msg: "", delId: null }); }}>{f.name}</button>)}
          <input type="text" id="lsearch" className="search" placeholder="Search exercises" aria-label="Search exercises" value={libQuery} onChange={e => setUi({ libQuery: e.target.value })} />
          <span className="spacer"></span><button className="btn primary" onClick={newEx}>New exercise</button>
        </div>
        <div className="toolbar statusrow" role="group" aria-label="Filter by plan status">
          <button className="btn" aria-pressed={libStatus === "all"} onClick={() => setUi({ libStatus: "all" })}>All status ({library.length})</button>
          <button className="btn stat-in" aria-pressed={libStatus === "in"} onClick={() => setUi({ libStatus: "in" })}>✓ In plan ({nIn})</button>
          <button className="btn stat-out" aria-pressed={libStatus === "out"} onClick={() => setUi({ libStatus: "out" })}>○ Not in plan ({library.length - nIn})</button>
        </div>
        {st.msg ? <p className="hint" role="status">{st.msg}</p> : null}
        {st.libEdit ? <Editor draft={st.draft} setDraft={d => patch({ draft: d })} isNew={st.libEdit === "new"} onSave={save} onCancel={() => patch({ libEdit: null, draft: null })} /> : null}
        <div id="lgrid">{grid}</div>
        <details><summary>Export library as JSON</summary><textarea className="json" readOnly aria-label="Library JSON" value={JSON.stringify(library, null, 2)} /><p className="note">Select and copy this to back up your exercises or hand them to an AI later. {library.length} saved.</p></details>
      </div>
    </section>
  );
}
