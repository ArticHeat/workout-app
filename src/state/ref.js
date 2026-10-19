/* Reference library: documents cut into searchable sections, stored in the account document store
   (path data/users/me/ref and its "chunks" collection), the same layout the single-file app used. */
import { createStore, useStore } from "./createStore.js";
import { db, userPath, cfg } from "../lib/backend.js";
import { makeIndex, searchIndex, chunkDoc, addKeywords } from "../lib/refSearch.js";

export const refStore = createStore({ docs: [], chunks: [], idx: null, loaded: false, status: "loading", at: 0 });
export const useRefLib = sel => useStore(refStore, sel);

const REF_LAYOUT = "Reference library. Read this doc first: docs[] lists every document (id, title, tags, summary, headings). Section text lives in the chunks subcollection (path ref/chunks): documents with the matching docId, ordered by n. Fetch only the sections you need.";
const root = () => db.collection(userPath()).doc("ref");

export const docById = id => refStore.get().docs.find(d => d.id === id);
export const chunkById = id => refStore.get().chunks.find(c => c.id === id);
export const docTitle = id => (docById(id) || { title: "Unknown" }).title;
export const refSearch = (q, docId) => searchIndex(refStore.get().idx, q, docId);

function reindex(docs, chunks) {
  const sorted = chunks.slice().sort((a, b) => a.docId === b.docId ? a.n - b.n : a.docId < b.docId ? -1 : 1).map(c => {
    const links = []; const re = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g; let m;
    while ((m = re.exec(c.text))) links.push(m[1].trim().toLowerCase());
    return Object.assign({}, c, { kw: c.kw && c.kw.length ? c.kw : [], _links: links });
  });
  return { chunks: sorted, idx: makeIndex(docs, sorted) };
}
function setLibrary(docs, chunks) { refStore.set(Object.assign({ docs }, reindex(docs, chunks))); }

export async function refLoad() {
  let docs = [], chunks = [], status = cfg().url ? "cloud" : "local";
  try {
    const snap = await root().get();
    const d = snap.exists ? snap.data() : null;
    docs = d && Array.isArray(d.docs) ? d.docs : [];
    const cs = await root().collection("chunks").limit(1000).get();
    chunks = cs.docs.map(x => Object.assign({ id: x.id }, x.data()));
  } catch (e) { status = "error"; }
  refStore.set({ loaded: true, status, at: Date.now() });
  setLibrary(docs, chunks);
}

async function persistIndex(docs) {
  try { await root().set({ v: 1, layout: REF_LAYOUT, updated: new Date().toISOString(), docs }); return { ok: true }; }
  catch (e) { return { ok: false, msg: "Couldn't save to your account (" + (e && e.code ? e.code : "error") + ")." }; }
}
async function persistChunks(list) {
  const col = root().collection("chunks");
  for (let i = 0; i < list.length; i += 4)
    await Promise.all(list.slice(i, i + 4).map(c => col.doc(c.id).set({ docId: c.docId, n: c.n, heading: c.heading, text: c.text, kw: c.kw })));
}
async function removeChunks(ids) {
  const col = root().collection("chunks");
  for (let i = 0; i < ids.length; i += 4) await Promise.all(ids.slice(i, i + 4).map(id => col.doc(id).delete()));
}

/* Each action returns { ok, msg, id? } so the screen can show the result */
export async function addDocument({ title, text, source, tags }) {
  if (!title || !text) return { ok: false, msg: "Add a title and some text first." };
  if (text.length > 300000) return { ok: false, msg: "That's over 300,000 characters. Split it into two documents." };
  const parts = chunkDoc(text), s = refStore.get();
  if (s.chunks.length + parts.length > 1000) return { ok: false, msg: "The library is full (1,000 sections). Delete a document first." };
  const id = (title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "doc") + "-" + Date.now().toString(36).slice(-4);
  const chunks = parts.map((p, i) => ({ id: id + "-" + (i + 1), docId: id, n: i + 1, heading: p.heading, text: p.text, kw: [] }));
  addKeywords(chunks);
  const doc = { id, title, source: source || "", tags: (tags || "").split(",").map(t => t.trim().toLowerCase()).filter(Boolean), summary: "", added: new Date().toISOString(), n: chunks.length, headings: chunks.map(c => c.heading) };
  try {
    await persistChunks(chunks);
    const docs = s.docs.concat([doc]);
    const r = await persistIndex(docs);
    if (!r.ok) throw new Error(r.msg);
    setLibrary(docs, s.chunks.concat(chunks));
  } catch (e) {
    try { await removeChunks(chunks.map(c => c.id)); } catch (e2) {}
    return { ok: false, msg: "Couldn't save the document. Nothing was added." };
  }
  return { ok: true, id, msg: "Saved " + chunks.length + " sections." };
}

export async function deleteDocument(id) {
  const s = refStore.get(), d = docById(id);
  if (!d) return { ok: false, msg: "" };
  try { await removeChunks(s.chunks.filter(c => c.docId === id).map(c => c.id)); } catch (e) { return { ok: false, msg: "Couldn't delete all sections." }; }
  const docs = s.docs.filter(x => x.id !== id);
  await persistIndex(docs);
  setLibrary(docs, s.chunks.filter(c => c.docId !== id));
  return { ok: true, msg: "" };
}

export async function saveDetails(id, { title, tags, source, summary }) {
  const s = refStore.get();
  const docs = s.docs.map(d => d.id !== id ? d : Object.assign({}, d, {
    title: (title || "").trim() || d.title,
    tags: (tags || "").split(",").map(t => t.trim().toLowerCase()).filter(Boolean),
    source: (source || "").trim(), summary: (summary || "").trim()
  }));
  const r = await persistIndex(docs);
  if (r.ok) setLibrary(docs, s.chunks);
  return r.ok ? { ok: true, msg: "Details saved." } : r;
}

export async function applyEnrichment(id, r) {
  const s = refStore.get();
  const docs = s.docs.map(d => {
    if (d.id !== id) return d;
    const n = Object.assign({}, d);
    if (r && typeof r.summary === "string") n.summary = r.summary.trim().slice(0, 400);
    if (r && Array.isArray(r.tags)) n.tags = Array.from(new Set((d.tags || []).concat(r.tags.map(t => String(t).toLowerCase().trim()).filter(Boolean)))).slice(0, 12);
    return n;
  });
  const res = await persistIndex(docs);
  if (res.ok) { setLibrary(docs, s.chunks); return { ok: true, msg: "Summary and tags added." }; }
  return res;
}
