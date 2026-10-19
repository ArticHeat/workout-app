/* Training log: one record per day (id like "w01-Mon"). Ticks and sets/reps/weight detail live here.
   Records from this device, the account copy and the Google Sheet are merged per exercise, newest change wins. */
import { createStore, useStore } from "./createStore.js";
import { lsJSON, lsSetRaw } from "../lib/storage.js";
import { db, userPath } from "../lib/backend.js";
import { phaseOf } from "../lib/plan.js";
import { tickSay } from "./status.js";
import { nowISO, todayISO } from "../lib/util.js";

export const logStore = createStore({ log: {} });
export const useLog = sel => useStore(logStore, sel);

export const logId = (w, wd) => "w" + String(w).padStart(2, "0") + "-" + wd;
export const logDoneCount = (log, id) => log[id] && log[id].done ? Object.keys(log[id].done).length : 0;
export const tickCount = (log, w) => Object.keys(log).filter(k => k.indexOf("w" + String(w).padStart(2, "0") + "-") === 0).reduce((t, k) => t + logDoneCount(log, k), 0);

export function initLog() {
  const log = lsJSON("plb-log", {});
  logStore.replace({ log: log && typeof log === "object" ? log : {} });
}
const persistLog = log => lsSetRaw("plb-log", JSON.stringify(log));

/* Merge two copies of one day's record: per exercise, whichever tick or untick is newest wins, so nothing is lost or resurrected */
export function mergeRec(a, b) {
  if (!a) return b; if (!b) return a;
  const out = Object.assign({}, a, b), done = {}, undone = {};
  const keys = {};
  [a.done, b.done, a.undone, b.undone].forEach(m => Object.keys(m || {}).forEach(k => { keys[k] = 1; }));
  Object.keys(keys).forEach(k => {
    const c = [];
    [a, b].forEach(r => {
      if (r.done && r.done[k]) c.push({ t: r.done[k].at || "", d: r.done[k] });
      if (r.undone && r.undone[k]) c.push({ t: r.undone[k], d: null });
    });
    c.sort((x, y) => (x.t < y.t ? 1 : x.t > y.t ? -1 : 0));
    if (c[0].d) done[k] = c[0].d; else undone[k] = c[0].t;
  });
  out.done = done; out.undone = undone;
  const det = {};
  [a.detail, b.detail].forEach(m => Object.keys(m || {}).forEach(k => { if (!det[k] || (m[k].at || "") > (det[k].at || "")) det[k] = m[k]; }));
  out.detail = det;
  out.items = Array.from(new Set([].concat(a.items || [], b.items || [])));
  out.total = Math.max(a.total || 0, b.total || 0);
  out.updated = (a.updated || "") > (b.updated || "") ? a.updated : b.updated;
  return out;
}

export function mergeInto(parts) {
  const log = Object.assign({}, logStore.get().log);
  Object.keys(parts).forEach(id => { log[id] = mergeRec(log[id], parts[id]); });
  persistLog(log);
  logStore.set({ log });
}

const dayCol = () => db.collection(userPath()).doc("log").collection("days");

export async function logLoad() {
  try {
    const snap = await dayCol().limit(500).get();
    const cloud = {};
    snap.docs.forEach(d => { cloud[d.id] = d.data(); });
    mergeInto(cloud);
  } catch (e) {}
}
export async function logSave(id) {
  const rec = logStore.get().log[id];
  persistLog(logStore.get().log);
  try { await dayCol().doc(id).set(rec); tickSay("Saved to your account"); }
  catch (e) { tickSay("Saved on this device only (couldn't reach your account)"); }
}

function baseRec(log, id, week, wd) {
  return log[id] || { week, day: wd, phase: phaseOf(week).name, done: {}, undone: {} };
}

/* Tick or untick one exercise. `items` is every tickable key on the screen, in order. Returns the updated record. */
export function setTick({ week, wd, key, checked, planned, time, items }) {
  const id = logId(week, wd), log = Object.assign({}, logStore.get().log);
  const rec = Object.assign({}, baseRec(log, id, week, wd));
  rec.done = Object.assign({}, rec.done); rec.undone = Object.assign({}, rec.undone);
  const at = nowISO();
  if (checked) { rec.done[key] = { at, planned, time_of_day: time }; delete rec.undone[key]; }
  else { delete rec.done[key]; rec.undone[key] = at; }
  rec.items = items; rec.total = items.length;
  rec.date = todayISO(); rec.updated = at;
  log[id] = rec;
  logStore.set({ log });
  logSave(id);
  return { id, rec };
}

/* Save sets/reps/weight/springs for one exercise */
export function setDetail({ week, wd, key, detail, items }) {
  const id = logId(week, wd), log = Object.assign({}, logStore.get().log);
  const rec = Object.assign({}, baseRec(log, id, week, wd));
  rec.detail = Object.assign({}, rec.detail, { [key]: detail });
  rec.items = items; rec.total = items.length;
  rec.date = rec.date || todayISO(); rec.updated = detail.at;
  log[id] = rec;
  logStore.set({ log });
  logSave(id);
  return { id, rec };
}
