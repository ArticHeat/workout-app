import { Fragment, useEffect, useRef, useState } from "react";
import { useRefLib as useRefStore, refStore, refLoad, refSearch, docById, docTitle, chunkById, addDocument, deleteDocument, saveDetails, applyEnrichment } from "../state/ref.js";
import { STOP, chunkDoc } from "../lib/refSearch.js";
import { useCfg, getSample, sampleErr } from "../lib/backend.js";

function findTarget(name) {
  const n = name.trim().toLowerCase(), { chunks, docs } = refStore.get();
  const c = chunks.find(c => c.heading.toLowerCase() === n); if (c) return { t: "chunk", id: c.id };
  const d = docs.find(d => d.title.toLowerCase() === n); if (d) return { t: "doc", id: d.id };
  return null;
}
/* [[wiki links]] inside a note become links to other sections or documents */
function Note({ raw, onLink }) {
  const parts = []; let last = 0, m; const re = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  while ((m = re.exec(raw))) {
    if (m.index > last) parts.push(raw.slice(last, m.index));
    const tg = findTarget(m[1]), label = m[2] || m[1];
    parts.push(tg ? <a key={m.index} href="#" className="wl" data-t={tg.t} data-id={tg.id} onClick={e => { e.preventDefault(); onLink(tg); }}>{label}</a> : <span key={m.index} className="wl broken" title="No matching note">{label}</span>);
    last = re.lastIndex;
  }
  parts.push(raw.slice(last));
  const paras = [[]];
  parts.forEach(p => {
    if (typeof p !== "string") { paras[paras.length - 1].push(p); return; }
    p.split(/\n\s*\n/).forEach((seg, i) => { if (i > 0) paras.push([]); seg.split("\n").forEach((ln, j) => { if (j > 0) paras[paras.length - 1].push(<br key={"b" + paras.length + j} />); paras[paras.length - 1].push(ln); }); });
  });
  return <>{paras.map((p, i) => <p key={i}>{p.map((x, j) => <Fragment key={j}>{x}</Fragment>)}</p>)}</>;
}
function Snippet({ text, q }) {
  const terms = (q.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter(t => t.length > 1 && !STOP.has(t));
  const low = text.toLowerCase(); let pos = -1;
  terms.forEach(t => { const i = low.indexOf(t); if (i > -1 && (pos < 0 || i < pos)) pos = i; });
  const start = Math.max(0, (pos < 0 ? 0 : pos) - 80), part = (text.slice(start, start + 260)).replace(/\s+/g, " ");
  const s = (start > 0 ? "… " : "") + part + (start + 260 < text.length ? " …" : "");
  if (!terms.length) return <>{s}</>;
  const re = new RegExp("(" + terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi");
  return <>{s.split(re).map((seg, i) => i % 2 ? <mark key={i}>{seg}</mark> : seg)}</>;
}

function DocView({ s, set, lib, onLink }) {
  const d = docById(s.docId), sample = !!getSample();
  const [ed, setEd] = useState({});
  if (!d) return <p className="hint">Document not found.</p>;
  const chs = lib.chunks.filter(c => c.docId === d.id).sort((a, b) => a.n - b.n);
  return (
    <>
      <article className="card"><h2>{d.title}</h2>
        <div className="tags">{(d.tags || []).map(t => <span className="tag2" key={t}>{t}</span>)}</div>
        {d.summary ? <p style={{ margin: "0 0 6px" }}>{d.summary}</p> : <p className="hint" style={{ margin: "0 0 6px" }}>No summary yet.{sample ? " Use “Summarise & tag” to have the AI write one." : ""}</p>}
        {d.source ? <p className="note" style={{ margin: 0 }}>Source: {d.source}</p> : null}
        <p className="note" style={{ margin: "2px 0 0" }}>{chs.length} sections · added {String(d.added || "").slice(0, 10)}</p>
        {s.msg ? <p className="hint" role="status">{s.msg}</p> : null}
        <div className="acc-tools">
          {sample ? <button className="btn" disabled={s.busy === "enrich"} onClick={async () => {
            set({ busy: "enrich", msg: "" });
            const body = chs.map(c => "## " + c.heading + "\n" + c.text.slice(0, 600)).join("\n\n").slice(0, 12000);
            try {
              const r = await getSample().json('Reply with only a JSON object {"summary": string, "tags": string[]}. summary: one or two sentences (under 45 words) saying what this document is and when to use it. tags: 4 to 7 short lowercase topic tags.\n\nTitle: ' + d.title + "\n\n" + body, {});
              const res = await applyEnrichment(d.id, r); set({ busy: "", msg: res.msg });
            } catch (e) { set({ busy: "", msg: sampleErr(e && e.code) }); }
          }}>{s.busy === "enrich" ? "Working…" : "Summarise & tag with AI"}</button> : null}
          <button className="btn" onClick={() => { setEd({ title: d.title, tags: (d.tags || []).join(", "), source: d.source || "", summary: d.summary || "" }); set({ editing: !s.editing }); }}>Edit details</button>
          <button className={"btn danger" + (s.delConfirm ? " sure" : "")} onClick={async () => {
            if (!s.delConfirm) { set({ delConfirm: true }); return; }
            await deleteDocument(d.id); set({ docId: null, mode: "home", delConfirm: false, msg: "" });
          }}>{s.delConfirm ? "Confirm delete" : "Delete"}</button>
        </div>
        {s.editing ? (
          <div className="planpick">
            <label>Title<input type="text" id="edtitle" value={ed.title || ""} onChange={e => setEd({ ...ed, title: e.target.value })} /></label>
            <label style={{ marginTop: 10 }}>Tags (comma-separated)<input type="text" id="edtags" value={ed.tags || ""} onChange={e => setEd({ ...ed, tags: e.target.value })} /></label>
            <label style={{ marginTop: 10 }}>Source note<input type="text" id="edsource" value={ed.source || ""} onChange={e => setEd({ ...ed, source: e.target.value })} /></label>
            <label style={{ marginTop: 10 }}>Summary<textarea id="edsummary" value={ed.summary || ""} onChange={e => setEd({ ...ed, summary: e.target.value })} /></label>
            <div className="acc-tools"><button className="btn primary" onClick={async () => { const r = await saveDetails(d.id, ed); set({ editing: false, msg: r.msg || "" }); }}>Save details</button><button className="btn" onClick={() => set({ editing: false })}>Cancel</button></div>
          </div>
        ) : null}
      </article>
      <div style={{ marginTop: 8 }}>
        {chs.map(c => {
          const back = lib.chunks.filter(o => o.id !== c.id && (o._links || []).indexOf(c.heading.toLowerCase()) > -1);
          return (
            <details className="sec" key={c.id} open={s.chunkId === c.id ? true : undefined} ref={el => { if (el && s.chunkId === c.id) { el.open = true; if (el.scrollIntoView) el.scrollIntoView({ block: "center" }); } }}>
              <summary>{c.heading}</summary>
              <div className="body">
                {(c.kw || []).length ? <div className="kw">{c.kw.map(k => <span key={k}>{k}</span>)}</div> : null}
                <Note raw={c.text} onLink={onLink} />
                {back.length ? <p className="backl">Linked from: {back.map((o, i) => <Fragment key={o.id}>{i ? ", " : ""}<a href="#" className="wl" onClick={e => { e.preventDefault(); onLink({ t: "chunk", id: o.id }); }}>{o.heading}</a></Fragment>)}</p> : null}
              </div>
            </details>
          );
        })}
      </div>
    </>
  );
}

function AddView({ s, set }) {
  const [f, setF] = useState({ title: "", tags: "", source: "", text: "" }), [busy, setBusy] = useState(false), [count, setCount] = useState("Sections will be listed here.");
  const onText = text => {
    setF(x => ({ ...x, text }));
    const t = text.trim();
    if (!t) { setCount("Sections will be listed here."); return; }
    const p = chunkDoc(t);
    setCount(p.length + " section" + (p.length === 1 ? "" : "s") + ": " + p.slice(0, 6).map(x => x.heading).join(" · ") + (p.length > 6 ? " …" : ""));
  };
  const save = async () => {
    setBusy(true);
    const r = await addDocument(f);
    setBusy(false);
    if (!r.ok) { set({ msg: r.msg }); return; }
    set({ docId: r.id, mode: "doc", msg: r.msg, editing: false });
  };
  return (
    <section className="card editor"><h2>Add a document</h2>
      <label>Title<input type="text" id="adtitle" placeholder="e.g. Forearm Growth Guide" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></label>
      <label>Tags (comma-separated)<input type="text" id="adtags" placeholder="e.g. grip, forearms, program" value={f.tags} onChange={e => setF({ ...f, tags: e.target.value })} /></label>
      <label>Source note (optional)<input type="text" id="adsource" placeholder="e.g. PDF, book chapter, article" value={f.source} onChange={e => setF({ ...f, source: e.target.value })} /></label>
      <label>Text<textarea id="adtext" style={{ minHeight: 220 }} placeholder="Paste the document text here. Lines starting with # , numbered lines like “3. Grip strength”, and short ALL-CAPS lines start a new section." value={f.text} onChange={e => onText(e.target.value)} /></label>
      <label>Or upload a .txt or .md file<input type="file" id="adfile" accept=".txt,.md,.markdown,text/plain" style={{ display: "block", marginTop: 4 }} onChange={async e => {
        const file = e.target.files && e.target.files[0]; if (!file) return;
        try { const txt = await file.text(); setF(x => ({ ...x, title: x.title || file.name.replace(/\.[^.]+$/, "") })); onText(txt); } catch (err) { setCount("Couldn't read that file."); }
      }} /></label>
      <p className="note" id="adcount">{count}</p>
      <p className="note">PDFs: paste the text, or ask Claude in a chat to read the PDF and give you the text to paste here.</p>
      {s.msg ? <p className="err" role="status">{s.msg}</p> : null}
      <div className="acc-tools"><button className="btn primary" id="adsave" disabled={busy} onClick={save}>{busy ? "Saving…" : "Split and save"}</button><button className="btn" onClick={() => set({ mode: s.docId ? "doc" : "home", msg: "" })}>Cancel</button></div>
    </section>
  );
}

export default function Reference() {
  const ref = useRefStore(s => s), cfg = useCfg(), sample = !!cfg.gemini;
  const [s, setS] = useState({ mode: "home", docId: null, chunkId: null, tag: null, q: "", editing: false, delConfirm: false, busy: "", msg: "" });
  const set = p => setS(x => ({ ...x, ...p }));
  const [qIn, setQIn] = useState(""), [scope, setScope] = useState(false), [answer, setAnswer] = useState(null);
  const ctl = useRef(null), timer = useRef(null);
  useEffect(() => { if (ref.loaded && ref.status !== "loading" && Date.now() - ref.at > 3000) refLoad(); }, []); // refresh on opening the tab
  useEffect(() => () => clearTimeout(timer.current), []);

  const docs = ref.docs, tags = Array.from(new Set(docs.flatMap(d => d.tags || []))).sort();
  const list = docs.filter(d => !s.tag || (d.tags || []).indexOf(s.tag) > -1);
  const statusMap = { loading: ["off", "Connecting…"], cloud: ["on", "✓ Synced to your Google Sheet · " + docs.length + " document" + (docs.length === 1 ? "" : "s")], local: ["off", "○ Saved on this device only"], error: ["off", "○ Couldn't reach your sheet · showing this device"] };
  const st = statusMap[ref.status] || statusMap.loading;
  const scopeId = scope && s.docId ? s.docId : null;
  const openChunk = id => { const c = chunkById(id); if (c) set({ docId: c.docId, chunkId: id, mode: "doc", editing: false, delConfirm: false, msg: "" }); };
  const onLink = tg => { if (tg.t === "chunk") openChunk(tg.id); else set({ docId: tg.id, mode: "doc", chunkId: null }); };
  const onQ = v => { setQIn(v); clearTimeout(timer.current); timer.current = setTimeout(() => set(v.trim() ? { q: v, mode: "search" } : { q: v, mode: s.docId ? "doc" : "home" }), 180); };
  const doSearch = () => set({ q: qIn, mode: qIn.trim() ? "search" : "home" });

  async function doAsk() {
    const q = qIn.trim(); set({ q });
    if (!q) { set({ msg: "Type a question first." }); return; }
    const sampleFn = getSample(); if (!sampleFn) return;
    const hits = refSearch(q, scopeId).slice(0, 6);
    const a = { q, sources: hits, text: "", err: "", busy: hits.length > 0 };
    set({ mode: "ask" }); setAnswer(a);
    if (!hits.length) { setAnswer({ ...a, err: "No matching sections found in your library." }); return; }
    const notes = hits.map((h, i) => "[" + (i + 1) + "] " + docTitle(h.c.docId) + " › " + h.c.heading + "\n" + h.c.text.slice(0, 1800)).join("\n\n");
    const prompt = "You are answering from the user's own reference notes. Use only the numbered notes below and cite the ones you use like [1] or [2]. If the notes do not answer the question, say what is missing instead of guessing. Be practical and concise.\n\nQuestion: " + q + "\n\nNotes:\n" + notes;
    const c = new AbortController(); ctl.current = c;
    let text = "", err = "";
    try { const r = await sampleFn(prompt, { signal: c.signal, onText: u => { text = u.text; setAnswer({ ...a, text }); } }); text = r.text; }
    catch (e) { if (e && e.text) text = e.text; if (!e || e.code !== "cancelled") err = sampleErr(e && e.code); }
    ctl.current = null; setAnswer({ ...a, text, err, busy: false });
  }

  let main;
  if (!ref.loaded) main = <div className="card"><p className="hint" style={{ margin: 0 }}>Loading your library…</p></div>;
  else if (s.mode === "add") main = <AddView s={s} set={set} />;
  else if (s.mode === "search") {
    const hits = refSearch(s.q.trim(), scopeId).slice(0, 15);
    main = !hits.length ? <div className="card"><p className="hint" style={{ margin: 0 }}>No sections match “{s.q.trim()}”. Try different words, or drop the “This document only” tick.</p></div>
      : <><p className="hint" style={{ margin: "0 0 8px" }}>{hits.length} best-matching section{hits.length === 1 ? "" : "s"}</p>
        {hits.map(h => <div className="hit" key={h.c.id}><h3>{h.c.heading}</h3><div className="where">{docTitle(h.c.docId)}</div><p><Snippet text={h.c.text} q={s.q} /></p><button className="btn" onClick={() => openChunk(h.c.id)}>Open section</button></div>)}</>;
  } else if (s.mode === "ask" && answer) {
    main = (
      <article className="card"><h2>{answer.q}</h2><div id="ansbox" className="answer">{answer.text || (answer.busy ? "Thinking…" : "")}</div>
        {answer.err ? <p className="err">{answer.err}</p> : null}
        {answer.busy ? <div className="acc-tools"><button className="btn" onClick={() => ctl.current && ctl.current.abort()}>Stop</button></div> : null}
        {answer.sources.length ? <><h3 style={{ marginTop: 16, fontSize: "1.3rem" }}>Sources</h3>{answer.sources.map((x, i) => <div className="where" style={{ margin: "4px 0" }} key={x.c.id}><b>[{i + 1}]</b> <a href="#" className="wl" onClick={e => { e.preventDefault(); openChunk(x.c.id); }}>{docTitle(x.c.docId) + " › " + x.c.heading}</a></div>)}</> : null}
      </article>
    );
  } else if (s.mode === "doc") main = <DocView s={s} set={set} lib={ref} onLink={onLink} />;
  else {
    const nd = docs.length, nc = ref.chunks.length;
    main = (
      <section className="card refinfo"><h2>{nd ? nd + " document" + (nd === 1 ? "" : "s") + " · " + nc + " sections" : "Your library is empty"}</h2>
        <p style={{ margin: "4px 0 0" }}>Pick a document on the left, search across everything, or add a new one. Sections link to each other with [[double brackets]], and each section lists what links back to it.</p>
        <h3>How search works</h3>
        <ol><li>Each document is split into small sections at its headings.</li><li>Search ranks sections by keyword match, with extra weight on headings, tags and each section’s key terms.</li><li>“Ask AI” sends only the top few sections with your question, and cites them.</li><li>Everything is stored in your own Google Sheet, so you can also paste sections into any AI chat.</li></ol>
      </section>
    );
  }

  return (
    <section id="tab-ref" className="wrap">
      <h1>Reference library</h1>
      <p className="sub">Documents you want on hand, cut into searchable sections. Search them, or ask the AI a question and it answers from your own notes.</p>
      <div className="refbar">
        <span id="refstatus" className={"pill " + st[0]}>{st[1]}</span>
        <button className="btn" id="refreshbtn" aria-label="Refresh the library" onClick={() => refLoad()}>Refresh</button>
        <div className="refsearch">
          <input type="text" id="refq" placeholder="Search your documents, or ask a question" aria-label="Search or ask a question" value={qIn} onChange={e => onQ(e.target.value)} onKeyDown={e => { if (e.key === "Enter") doSearch(); }} />
          <button className="btn" id="refsearchbtn" onClick={doSearch}>Search</button>
          {sample ? <button className="btn primary" id="refaskbtn" onClick={doAsk}>Ask AI</button> : null}
        </div>
        {s.docId ? <label id="refscopewrap" style={{ display: "inline-flex", margin: 0, color: "var(--ink)" }}><input type="checkbox" id="refscope" style={{ width: "auto", marginRight: 6, accentColor: "var(--str)" }} checked={scope} onChange={e => setScope(e.target.checked)} />This document only</label> : null}
        <button className="btn" onClick={() => set({ mode: "add", msg: "" })}>Add document</button>
      </div>
      <div className="reflayout">
        <aside id="reflist">
          {tags.length ? <div className="tagrow" role="group" aria-label="Filter by tag">{tags.map(t => <button key={t} className="tagchip" aria-pressed={s.tag === t} onClick={() => set({ tag: s.tag === t ? null : t })}>{t}</button>)}</div> : null}
          {list.map(d => <button key={d.id} className="docitem" aria-pressed={s.docId === d.id && s.mode === "doc"} onClick={() => { setQIn(""); set({ docId: d.id, mode: "doc", chunkId: null, editing: false, msg: "", q: "" }); }}><b>{d.title}</b><span>{d.n} section{d.n === 1 ? "" : "s"}{d.tags && d.tags.length ? " · " + d.tags.slice(0, 3).join(", ") : ""}</span></button>)}
          {!docs.length && ref.loaded ? <p className="hint">No documents yet.</p> : null}
        </aside>
        <div id="refmain">{main}</div>
      </div>
    </section>
  );
}
