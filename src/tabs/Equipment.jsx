import { useState } from "react";
import { SPRING_PROG } from "../data/program.js";
import { useApp, setEq, setUi, jumpToLibrary } from "../state/app.js";
import { inAnyPlan } from "../lib/plan.js";
import { sameName, qid } from "../lib/util.js";

function Progression({ e, week }) {
  const keys = e.links.map(n => n.trim().toLowerCase()).filter((n, i, arr) => SPRING_PROG[n] && arr.indexOf(n) === i);
  return keys.map(k => {
    const p = SPRING_PROG[k];
    return (
      <details key={k}><summary>Spring progression · {p.title}</summary>
        <p className="note" style={{ marginTop: 4 }}>{p.rule}</p>
        <div className="tbl-scroll"><table style={{ minWidth: 0 }}><thead><tr><th>Week</th><th>Prescription</th></tr></thead>
          <tbody>{p.weeks.map((t, i) => <tr key={i} className={week === i + 1 ? "active" : ""} style={week === i + 1 ? { "--c": "var(--str)" } : undefined}><td>{i + 1}</td><td>{t}</td></tr>)}</tbody></table></div>
        <p className="note">The highlighted row is the week selected in the Weekly Dashboard. Weeks 11 and later are not in the plan for this exercise.</p>
      </details>
    );
  });
}

function EqCard({ e, a, sure, onEdit, onDel }) {
  return (
    <article className="card wcard" style={{ "--c": "var(--taper)" }}>
      <h3>{e.name}</h3>
      {e.setting ? <div className="sr" style={{ fontSize: "1.3rem" }}>{e.setting} <small>current setting</small></div> : null}
      <div className="eqrow" style={{ marginTop: 10 }}><span className="plabel">Used for</span>
        {e.links.length ? e.links.map(n => {
          const ex = a.library.find(x => sameName(x.name, n)), inPlan = ex && inAnyPlan(ex.name, a.custom, a);
          return <button key={n} className={"eqchip" + (inPlan ? " in" : "") + (ex ? "" : " gone")} disabled={!ex} title={ex ? undefined : "Not in your library"} onClick={() => jumpToLibrary(n)}>{inPlan ? "✓ " : ""}{n}</button>;
        }) : <span className="hint" style={{ margin: 0 }}>No exercises linked yet.</span>}
      </div>
      {e.notes ? <p className="note">{e.notes}</p> : null}
      <Progression e={e} week={a.week} />
      <div className="acc-tools"><button className="btn" onClick={onEdit}>Edit</button><button className={"btn danger" + (sure ? " sure" : "")} onClick={onDel}>{sure ? "Confirm delete" : "Delete"}</button></div>
    </article>
  );
}

function EqEditor({ draft, setDraft, isNew, names, onSave, onCancel }) {
  const [filter, setFilter] = useState("");
  const missing = draft.links.filter(n => !names.some(x => sameName(x, n)));
  const q = filter.trim().toLowerCase();
  return (
    <section className="card editor"><h2>{isNew ? "Add equipment" : "Edit equipment"}</h2>
      <label>Name<input type="text" id="eqname" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Forearm finisher" /></label>
      {draft.err ? <p className="err">Give the equipment a name before saving.</p> : null}
      <label>Current setting (optional)<input type="text" id="eqsetting" value={draft.setting} onChange={e => setDraft({ ...draft, setting: e.target.value })} placeholder="e.g. 4 springs" /></label>
      <label>Notes<textarea id="eqnotes" value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="What you use it for, how you set it up…" /></label>
      <div style={{ marginTop: 12 }}><span className="hint">Exercises that use it</span>
        <input type="text" id="eqexfilter" placeholder="Filter exercises" aria-label="Filter exercises" style={{ marginTop: 6 }} value={filter} onChange={e => setFilter(e.target.value)} />
        <div className="eqlist" id="eqexlist">
          {names.concat(missing).filter(n => !q || n.toLowerCase().indexOf(q) > -1).map(n => (
            <label key={n}><input type="checkbox" data-eqlink={n} checked={draft.links.some(l => sameName(l, n))}
              onChange={e => setDraft({ ...draft, links: draft.links.filter(l => !sameName(l, n)).concat(e.target.checked ? [n] : []) })} />{n}</label>
          ))}
        </div>
      </div>
      <div className="acc-tools"><button className="btn primary" onClick={onSave}>Save equipment</button><button className="btn" onClick={onCancel}>Cancel</button></div>
    </section>
  );
}

export default function Equipment() {
  const a = useApp(s => s), EQ = a.eq, search = a.ui.eqSearch;
  const [edit, setEdit] = useState(null), [draft, setDraft] = useState(null), [del, setDel] = useState(null);
  const q = search.trim().toLowerCase();
  const list = EQ.filter(e => !q || (e.name + " " + e.setting + " " + e.notes + " " + e.links.join(" ")).toLowerCase().indexOf(q) > -1).sort((x, y) => x.name.localeCompare(y.name));
  const names = a.library.map(x => x.name).sort((x, y) => x.localeCompare(y));
  const startNew = () => { setEdit("new"); setDraft({ name: "", setting: "", notes: "", links: [] }); setDel(null); };
  const save = () => {
    if (!draft.name.trim()) { setDraft({ ...draft, err: true }); return; }
    const rec = { name: draft.name.trim(), setting: draft.setting.trim(), notes: draft.notes.trim(), links: draft.links.slice() };
    if (edit === "new") setEq(EQ.concat([Object.assign({ id: qid() }, rec)]));
    else setEq(EQ.map(z => z.id === edit ? Object.assign({}, z, rec) : z));
    setEdit(null); setDraft(null);
  };
  return (
    <section id="tab-eq" className="wrap">
      <h1>Equipment</h1>
      <p className="sub">Your kit, linked to the exercises that use it. Tap an exercise to jump to it in the Exercise Library.</p>
      <div className="toolbar">
        <input type="text" id="eqsearch" className="search" placeholder="Search equipment" aria-label="Search equipment" value={search} onChange={e => setUi({ eqSearch: e.target.value })} />
        <span className="spacer"></span>
        <button className="btn primary" onClick={startNew}>Add equipment</button>
      </div>
      <div id="eqmain">
        {edit ? <EqEditor draft={draft} setDraft={setDraft} isNew={edit === "new"} names={names} onSave={save} onCancel={() => { setEdit(null); setDraft(null); }} /> : null}
        {!EQ.length && !edit ? <section className="card empty-state"><h2>No equipment yet</h2><p>Add the kit you own and link it to the exercises that use it.</p><div className="acc-tools"><button className="btn primary" onClick={startNew}>Add equipment</button></div></section>
          : !list.length && !edit ? <p className="hint" style={{ marginTop: 16 }}>Nothing matches that search.</p>
          : <div className="lib-grid">{list.map(e => <EqCard key={e.id} e={e} a={a} sure={del === e.id}
              onEdit={() => { setEdit(e.id); setDraft({ name: e.name, setting: e.setting, notes: e.notes, links: e.links.slice() }); setDel(null); }}
              onDel={() => { if (del === e.id) { setEq(EQ.filter(z => z.id !== e.id)); setDel(null); } else setDel(e.id); }} />)}</div>}
      </div>
    </section>
  );
}
