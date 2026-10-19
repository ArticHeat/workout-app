/* Pure text helpers for the reference library: chunking, keywords and BM25-style search. */
const STOP = new Set("a an and are as at be but by for from has have i if in into is it its of on or that the their then there these they this to was were will with you your not can do does how what when which who why".split(" "));
export { STOP };
export function stem(w) {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 3 && /(s|x|z|ch|sh)es$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}
export function tokens(t) {
  return (String(t).toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter(w => w.length > 1 && !STOP.has(w)).map(stem);
}
function isHeadingLine(l) {
  const t = l.trim();
  if (!t) return null;
  const m = t.match(/^#{1,6}\s+(.+)$/);
  if (m) return m[1].trim();
  if (/^\d{1,2}\.\s+\S.{0,60}$/.test(t) && !/[.!?]$/.test(t)) return t.replace(/^\d{1,2}\.\s+/, "");
  if (t.length <= 60 && t === t.toUpperCase() && /[A-Z]{3}/.test(t) && !/[.!?]$/.test(t)) return t.charAt(0) + t.slice(1).toLowerCase();
  return null;
}
const wc = t => (t.match(/\S+/g) || []).length;
export function chunkDoc(raw) {
  const lines = raw.replace(/\r\n?/g, "\n").trim().split("\n");
  let secs = [], cur = { heading: "", body: [] };
  lines.forEach(l => {
    const h = isHeadingLine(l);
    if (h) { if (cur.body.join("").trim() || cur.heading) secs.push(cur); cur = { heading: h, body: [] }; }
    else cur.body.push(l);
  });
  secs.push(cur);
  secs = secs.map(s => ({ heading: s.heading, text: s.body.join("\n").trim() })).filter(s => s.text);
  const merged = [];
  secs.forEach(s => {
    if (merged.length && wc(s.text) < 25) merged[merged.length - 1].text += "\n\n" + (s.heading ? s.heading + ": " : "") + s.text;
    else merged.push({ heading: s.heading, text: s.text });
  });
  const out = [];
  merged.forEach((s, si) => {
    const base = s.heading || "Part " + (si + 1);
    if (wc(s.text) <= 380) { out.push({ heading: base, text: s.text }); return; }
    const paras = s.text.split(/\n\s*\n/).flatMap(p => wc(p) > 380 ? p.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g) || [p] : [p]);
    const groups = []; let g = [], n = 0;
    paras.forEach(p => { const w = wc(p); if (n + w > 300 && g.length) { groups.push(g); g = []; n = 0; } g.push(p); n += w; });
    if (g.length) groups.push(g);
    groups.forEach((gr, i) => out.push({ heading: groups.length > 1 ? base + " (" + (i + 1) + "/" + groups.length + ")" : base, text: gr.join("\n\n").trim() }));
  });
  return out;
}
export function addKeywords(chunks) {
  const N = chunks.length, df = {}, tfs = chunks.map(c => {
    const tf = {}; tokens(c.text + " " + c.heading).forEach(t => { tf[t] = (tf[t] || 0) + 1; });
    Object.keys(tf).forEach(t => { df[t] = (df[t] || 0) + 1; });
    return tf;
  });
  chunks.forEach((c, i) => {
    c.kw = Object.keys(tfs[i]).filter(t => tfs[i][t] >= 2 || N < 4)
      .map(t => [t, tfs[i][t] * Math.log(1 + N / df[t])]).sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0]);
  });
}
export function makeIndex(docs, chunks) {
  const byId = {}; docs.forEach(d => { byId[d.id] = d; });
  const items = chunks.map(c => {
    const d = byId[c.docId] || {}, tf = {}; let len = 0;
    const add = (str, w) => tokens(str).forEach(t => { tf[t] = (tf[t] || 0) + w; len += w; });
    add(c.text, 1); add(c.heading, 3); add((c.kw || []).join(" "), 2); add((d.tags || []).join(" "), 2); add(d.title || "", 2);
    return { c, tf, len };
  });
  const df = {}; items.forEach(it => Object.keys(it.tf).forEach(t => { df[t] = (df[t] || 0) + 1; }));
  const avg = items.reduce((a, it) => a + it.len, 0) / (items.length || 1);
  return { items, df, N: items.length, avg };
}
export function searchIndex(idx, q, docId) {
  const qt = Array.from(new Set(tokens(q)));
  if (!qt.length || !idx) return [];
  const k1 = 1.2, b = 0.75, ql = q.trim().toLowerCase();
  return idx.items.filter(it => !docId || it.c.docId === docId).map(it => {
    let sc = 0;
    qt.forEach(t => {
      const f = it.tf[t]; if (!f) return;
      const idf = Math.log(1 + (idx.N - (idx.df[t] || 0) + 0.5) / ((idx.df[t] || 0) + 0.5));
      sc += idf * f * (k1 + 1) / (f + k1 * (1 - b + b * it.len / idx.avg));
    });
    if (sc > 0 && ql.length > 3 && it.c.text.toLowerCase().indexOf(ql) > -1) sc += 2;
    return { c: it.c, score: sc };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
}
