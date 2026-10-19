/* Half-marathon plan: dates and weekly sessions. Pure functions; settings are passed in. */
import { HM_LONG, HM_PH } from "../data/running.js";
import { OFF_DAYS } from "../data/schedule.js";
import { runFor, runDesc } from "./plan.js";
import { dayMs } from "./util.js";

const WK = 7 * dayMs;
export const parseD = str => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str || ""); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN; };
export const fmtD = ms => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const fmtShort = ms => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
export const raceWeek = hm => { const a = parseD(hm.start), b = parseD(hm.race); return (isNaN(a) || isNaN(b) || b < a) ? 0 : Math.floor((b - a) / WK) + 1; };
export const weekStartMs = (hm, w) => parseD(hm.start) + (w - 1) * WK;
export const todayMs = () => { const t = new Date(); return Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()); };
export const todayWeek = hm => Math.floor((todayMs() - parseD(hm.start)) / WK) + 1;
export function hmChipText(hm) {
  const r = parseD(hm.race);
  if (isNaN(r)) return "date not set";
  const wk = Math.ceil((r - todayMs()) / WK);
  return fmtD(r) + (wk > 0 ? " · " + wk + " wk to go" : "");
}
export function hmPhase(w, rw) {
  const wr = rw - w;
  if (wr <= 0) return "race";
  if (w <= 16) return "base";
  if (wr <= 2) return "taper";
  if (wr <= 5) return "peak";
  if (wr >= 18) return "bridge";
  return "build";
}
export function hmSessions(w, rw, run) {
  const wr = rw - w, ph = hmPhase(w, rw);
  const easyNote = "Easy, conversational pace. Walk breaks are fine.", longNote = "Slow and steady. Practise your race-day fuel and drinks.";
  if (ph === "race") return [{ l: "Shake-out run", t: "15–20 min very easy", n: "Earlier in the week, with a few short bursts of speed if your legs feel flat." }, { l: "Race day", t: "Half marathon · 21.1 km", n: "Start easy and walk through aid stations if you need to." }];
  if (ph === "base") return OFF_DAYS.filter(d => run.days.indexOf(d) > -1).map(d => ({ l: d + " run-walk", t: runDesc(runFor(w, d, run)), n: "5 min brisk warm-up walk and a 5 min cool-down walk." }));
  if (ph === "bridge") {
    const nb = rw - 34, k = w - 17, t = nb > 1 ? k / (nb - 1) : 0;
    const easy = Math.round(20 + 15 * t), long = Math.round(25 + 20 * t);
    return [{ l: "Easy run 1", t: easy + " min", n: easyNote }, { l: "Easy run 2", t: (easy + 5) + " min", n: easyNote }, { l: "Long run (Sunday)", t: long + " min", n: longNote }];
  }
  if (ph === "taper") {
    const long = wr === 2 ? 60 : 40, easy = wr === 2 ? 30 : 25;
    return [{ l: "Easy run 1", t: easy + " min", n: easyNote }, { l: "Easy run 2", t: easy + " min + a few short bursts of speed", n: "Keep the bursts short and relaxed." }, { l: "Long run (Sunday)", t: long + " min", n: "Shorter than before, easy pace." }];
  }
  /* The build can never run ahead of the weeks since the lifting block ended, even on a short timeline. */
  const idx = Math.max(0, Math.min(17 - wr, w - 17, 14)), long = HM_LONG[idx], cut = idx > 0 && long < HM_LONG[idx - 1];
  let a = Math.min(40, 35 + Math.floor(idx * 0.4)), b = Math.min(50, 40 + Math.floor(idx * 0.6));
  if (cut) { a = Math.round(a * 0.85); b = Math.round(b * 0.85); }
  return [{ l: "Easy run 1", t: a + " min", n: easyNote }, { l: "Easy run 2", t: b + " min", n: easyNote }, { l: "Long run (Sunday)", t: long + " min", n: cut ? "Cutback week: shorter, to absorb the training." : longNote }];
}
export { HM_PH, HM_LONG };
