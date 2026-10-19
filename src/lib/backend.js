/* Free back end: your own Google Sheet through an Apps Script web app, plus an optional Gemini key.
   - cfg    : link, password and key, kept on this device only
   - api    : one POST to the script (text/plain avoids a CORS preflight)
   - db     : tiny document store (local copy + write queue) so the app works offline
   - sheets : Google Sheets reads and writes
   - getSample : free AI, only when a Gemini key is set */
import { useSyncExternalStore } from "react";

const CFG_KEY = "plbapp-cfg";
let cfgRaw = null, cfgObj = {};
const cfgListeners = new Set();
function readCfg() {
  let raw = null;
  try { raw = localStorage.getItem(CFG_KEY); } catch (e) {}
  if (raw !== cfgRaw) {
    cfgRaw = raw;
    try { cfgObj = JSON.parse(raw || "{}") || {}; } catch (e) { cfgObj = {}; }
  }
  return cfgObj;
}
export const cfg = () => readCfg();
export function saveCfg(c) {
  try { localStorage.setItem(CFG_KEY, JSON.stringify(c)); } catch (e) {}
  readCfg();
  cfgListeners.forEach(f => f());
}
export function useCfg() {
  return useSyncExternalStore(f => { cfgListeners.add(f); return () => cfgListeners.delete(f); }, readCfg, readCfg);
}

export async function api(body) {
  const c = cfg();
  if (!c.url) throw { code: "server_not_connected", message: "No sheet connection set up" };
  let r;
  try {
    r = await fetch(c.url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ token: c.token || "" }, body)) });
  } catch (e) { throw { code: "server_unavailable", message: "Offline or unreachable", retryable: true }; }
  let j;
  try { j = await r.json(); } catch (e) { throw { code: "upstream_error", message: "Bad reply from the sheet script" }; }
  if (j && j.error) throw { code: j.error === "bad token" ? "needs_reauth" : "tool_error", message: j.error };
  return j;
}

/* ----- local copy + write queue ----- */
const LK = "plbdb:", QK = "plbdb-q";
function lget(p) { try { const v = localStorage.getItem(LK + p); return v == null ? null : JSON.parse(v); } catch (e) { return null; } }
function lset(p, v) { try { localStorage.setItem(LK + p, JSON.stringify(v)); } catch (e) {} }
function ldel(p) { try { localStorage.removeItem(LK + p); } catch (e) {} }
function llist(base) {
  const out = [], n = base.split("/").length + 1;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.indexOf(LK + base + "/") !== 0) continue;
      const p = k.slice(LK.length);
      if (p.split("/").length === n) out.push({ id: p.split("/").pop(), data: JSON.parse(localStorage.getItem(k)) });
    }
  } catch (e) {}
  return out;
}
const queue = () => { try { return JSON.parse(localStorage.getItem(QK) || "[]") || []; } catch (e) { return []; } };
const setQueue = q => { try { localStorage.setItem(QK, JSON.stringify(q)); } catch (e) {} };
let flushing = false;
export async function flushQueue() {
  if (flushing || !cfg().url) return;
  flushing = true;
  try {
    const q = queue();
    while (q.length) { await api(q[0]); q.shift(); setQueue(q); }
  } catch (e) {}
  flushing = false;
}
async function write(op) {
  const q = queue().filter(x => x.path !== op.path);
  q.push(op); setQueue(q);
  await flushQueue();
}
if (typeof window !== "undefined") window.addEventListener("online", flushQueue);

const snap = (exists, data) => ({ exists: !!exists, data: () => JSON.parse(JSON.stringify(data == null ? {} : data)) });
function docRef(path) {
  return {
    id: path.split("/").pop(),
    async get() {
      if (cfg().url) {
        try {
          const pend = queue().some(x => x.path === path);
          if (!pend) {
            const j = await api({ op: "kv_get", path });
            if (j.exists) { lset(path, j.data); return snap(true, j.data); }
          }
        } catch (e) {}
      }
      const v = lget(path);
      return snap(v != null, v);
    },
    async set(v) { lset(path, v); await write({ op: "kv_set", path, data: v }); },
    async delete() { ldel(path); await write({ op: "kv_delete", path }); },
    collection(c) { return collRef(path + "/" + c); }
  };
}
function collRef(path) {
  const list = async () => {
    const byId = {};
    llist(path).forEach(d => { byId[d.id] = d; });
    if (cfg().url) {
      try {
        const j = await api({ op: "kv_list", path });
        (j.docs || []).forEach(d => { if (!queue().some(x => x.path === path + "/" + d.id)) { byId[d.id] = d; lset(path + "/" + d.id, d.data); } });
      } catch (e) {}
    }
    return { docs: Object.keys(byId).map(id => { const d = byId[id]; return { id, data: () => JSON.parse(JSON.stringify(d.data)) }; }) };
  };
  return { doc: id => docRef(path + "/" + id), limit: () => ({ get: list }), get: list };
}
export const db = { collection: p => collRef(p), doc: p => docRef(p) };
export const USER_ID = "me";
export const userPath = () => "data/users/" + USER_ID;

/* ----- Google Sheets ----- */
const parsePayload = p => { if (typeof p === "string") { try { return JSON.parse(p); } catch (e) { return null; } } return p || null; };
export const sheets = {
  async getValues(range) { const j = await api({ op: "get_values", range }); const p = parsePayload(j.payload); return (p && p.values) || []; },
  async updateValues(range, values) { await api({ op: "update_values", range, values }); },
  async appendValues(range, values) { await api({ op: "append_values", range, values }); }
};

/* ----- optional free AI: Gemini key from Google AI Studio ----- */
export function getSample() {
  const c = cfg();
  if (!c.gemini) return null;
  const model = c.model || "gemini-flash-latest";
  async function call(input, opts, wantJson) {
    const text = typeof input === "string" ? input : (input || []).map(t => t.content).join("\n");
    const body = { contents: [{ role: "user", parts: [{ text }] }] };
    if (wantJson) body.generationConfig = { responseMimeType: "application/json" };
    let r;
    try {
      r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(c.gemini), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: opts && opts.signal });
    } catch (e) { throw { code: e && e.name === "AbortError" ? "cancelled" : "server_unavailable", message: "Could not reach the AI service" }; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw { code: r.status === 429 ? "rate_limited" : "upstream_error", message: (j.error && j.error.message) || "AI request failed" };
    const t = ((((j.candidates || [])[0] || {}).content || {}).parts || []).map(p => p.text || "").join("");
    if (opts && opts.onText) opts.onText({ text: t, delta: t });
    return t;
  }
  const f = async (input, opts) => ({ text: await call(input, opts, false), truncated: false });
  f.json = async (input, opts) => {
    let t = await call(input, opts, true);
    t = t.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();
    try { return JSON.parse(t); } catch (e) { throw { code: "upstream_error", message: "The AI did not return valid JSON" }; }
  };
  return f;
}
export const sampleErr = code => ({ not_granted: "Claude access wasn't allowed for this page.", sampling_disabled: "The AI isn't available right now.", rate_limited: "Too many requests. Wait a moment and try again.", prompt_too_large: "That was too much text for one request." }[code] || "Couldn't get an answer just now.");
