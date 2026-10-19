/* Pure plan logic. Nothing here reads global state: week, settings and custom plans are always passed in. */
import { PHASES, INT, SCHEME, RAMP, LIFTS, DAYS, ACC_DEF, SPRING_PROG, WEEK_ONLY } from "../data/program.js";
import { FA_PROGRAM, FA_DAY, FA_OFF, SAND_OFF, faEx } from "../data/forearm.js";
import { RUN_WEEKS } from "../data/running.js";
import { OFF_DAYS, TIB_NAME, SN_PLAN } from "../data/schedule.js";
import { round, sameName } from "./util.js";

export const phaseOf = w => PHASES.find(p => w >= p.weeks[0] && w <= p.weeks[1]);
export const liftName = k => LIFTS.find(l => l.key === k).name;
export const rmNum = v => { const n = parseFloat(v); return n > 0 ? n : 0; };
export const dayNameOf = day => day.indexOf("off:") === 0 ? day.slice(4) : (DAYS.find(d => d.lift === day) || { d: "" }).d;

/* ---------- main lifts ---------- */
export function mainWork(w) {
  if (w === 16) return RAMP.map(r => ({ pct: r[0], reps: r[1], sets: 1 }));
  return [{ pct: INT[w - 1], reps: SCHEME[w - 1][1], sets: SCHEME[w - 1][0] }];
}
export function tonnage(w, rm) {
  if (!rm) return 0;
  return mainWork(w).reduce((t, s) => t + s.sets * s.reps * round(rm * s.pct / 100), 0);
}

/* ---------- accessories (custom plan overrides the defaults) ---------- */
export const accKey = (day, w) => day + "-" + phaseOf(w).id;
export const planList = (custom, l, p) => custom[l + "-" + p] || ACC_DEF[l][p];
export const getAcc = (custom, day, w) => custom[accKey(day, w)] || ACC_DEF[day][phaseOf(w).id];
export const weekOk = (name, w) => { const ws = WEEK_ONLY[String(name).trim().toLowerCase()]; return !ws || ws.indexOf(w) > -1; };
export const sprogFor = name => SPRING_PROG[String(name).trim().toLowerCase()];
export const progText = (name, fallback, w) => { const p = sprogFor(name); return p && w >= 1 && w <= p.weeks.length ? p.weeks[w - 1] : fallback; };
/* Returns a new custom object with the list for key cloned and changed by fn */
export function editPlan(custom, l, p, fn) {
  const k = l + "-" + p, next = Object.assign({}, custom);
  const list = (custom[k] || planList(custom, l, p)).map(a => a.slice());
  fn(list);
  next[k] = list;
  return next;
}

/* ---------- forearm ---------- */
export function faForWorkout(w, wo) {
  if (!wo) return null;
  if (w >= 1 && w <= 6) return { workout: wo, rows: FA_PROGRAM[wo].map(r => ({ ex: faEx(r, w), sets: r.sets[w - 1], reps: r.reps, rest: r.rest, note: r.note })) };
  if (w === 7) return { workout: wo, deload: true };
  return null;
}
export const faInfo = (w, lift) => faForWorkout(w, FA_DAY[lift]);
export function faWeeksFor(name) {
  const out = [];
  Object.keys(FA_PROGRAM).forEach(wo => FA_PROGRAM[wo].forEach(r => {
    const ws = [1, 2, 3, 4, 5, 6].filter(w => sameName(faEx(r, w), name));
    if (ws.length) out.push(wo + " wk " + ws[0] + "–" + ws[ws.length - 1]);
  }));
  return out;
}

/* ---------- running and non-training days ---------- */
export function runDesc(r) {
  if (r.reps) return r.reps + " × (" + r.run + " min jog + " + r.walk + " min walk)";
  if (r.seq) return r.seq;
  return r.cont + " min continuous easy jog";
}
export const runMins = r => r.reps ? r.reps * (r.run + r.walk) : r.seq ? r.mins : r.cont;
export const isLightRun = (wd, run) => run.days.length > 1 && OFF_DAYS.filter(d => run.days.indexOf(d) > -1)[0] === wd;
export const runFor = (w, wd, run) => RUN_WEEKS[(isLightRun(wd, run) ? Math.max(1, w - 1) : w) - 1];
/* settings: { run, tib, mob, str, swim } */
export const offItems = (wd, w, s) =>
  (s.run.days.indexOf(wd) > -1 ? ["run"] : [])
    .concat(s.tib.day === wd ? ["tib"] : [])
    .concat(s.mob.day === wd ? ["mob"] : [])
    .concat(s.str.day === wd ? ["str"] : [])
    .concat(s.swim.day === wd ? ["swim"] : [])
    .concat(FA_OFF[wd] && faForWorkout(w, FA_OFF[wd]) ? ["fa"] : [])
    .concat(SAND_OFF === wd ? ["carry"] : []);

/* ---------- which plans an exercise appears in ---------- */
export function planCells(custom, name) {
  const out = [];
  LIFTS.forEach(l => PHASES.forEach(ph => { if (planList(custom, l.key, ph.id).some(a => sameName(a[0], name))) out.push(l.key + "-" + ph.id); }));
  return out;
}
export const snFor = name => SN_PLAN.filter(x => sameName(x[0], name)).map(x => "Sandbag and neck plan: " + x[1]);
export const strFor = (name, str) => str.items.some(x => sameName(x.ex, name)) ? ["Stretching: " + str.day] : [];
export const mobFor = (name, mob) => mob.items.some(x => sameName(x.ex, name)) ? ["Mobility: " + mob.day] : [];
export const tibFor = (name, tib) => sameName(name, TIB_NAME) ? ["Non-training day: " + tib.day] : [];
export function otherPlanTags(name, s) {
  return tibFor(name, s.tib).concat(snFor(name)).concat(mobFor(name, s.mob)).concat(strFor(name, s.str));
}
export const inAnyPlan = (name, custom, s) => planCells(custom, name).length > 0 || faWeeksFor(name).length > 0 || otherPlanTags(name, s).length > 0;
export function suggestCells(x) {
  const lifts = x.lifts.filter(k => k !== "addon" && k !== "stretch");
  const phs = x.phases.length ? x.phases : PHASES.map(p => p.id);
  const c = [];
  lifts.forEach(l => phs.forEach(p => c.push(l + "-" + p)));
  return c;
}
export function planSummary(cells) {
  const SHORT = { 1: "Hyp", 2: "Str", 3: "Peak", 4: "Taper" };
  return LIFTS.map(l => {
    const ps = PHASES.filter(ph => cells.indexOf(l.key + "-" + ph.id) > -1).map(ph => SHORT[ph.id]);
    return ps.length ? l.name + ": " + ps.join(", ") : "";
  }).filter(Boolean).join(" · ");
}
export function renameInPlan(custom, oldName, newName) {
  let next = custom;
  LIFTS.forEach(l => PHASES.forEach(ph => {
    if (planList(next, l.key, ph.id).some(a => sameName(a[0], oldName)))
      next = editPlan(next, l.key, ph.id, arr => arr.forEach(a => { if (sameName(a[0], oldName)) a[0] = newName; }));
  }));
  return next;
}
