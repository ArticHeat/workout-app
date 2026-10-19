/* Rule-based nutrition: training load per day for any week, fuel timing and the context handed to the AI agent. */
import { HIIT_DAYS, NECK_DAYS, SAND, N_LIFT, N_LIFTNAME, N_GOAL, N_PROT, N_CARB, N_WD } from "../data/schedule.js";
import { FA_DAY, FA_OFF } from "../data/forearm.js";
import { HM_LONG } from "../data/running.js";
import { mainWork, faInfo, offItems, runFor, runMins, phaseOf } from "./plan.js";

export const r5 = v => Math.round(v / 5) * 5;
export const nutW = nut => { const v = parseFloat(nut.weight); return v > 0 ? v : 0; };
const tod = sl => sl === "AM" ? "morning" : "evening";

/* One training day for a given week: what is scheduled, plus a simple load score. c = { slots, run, tib, mob, str, swim } */
export function nutDay(w, wd, c) {
  const items = []; let score = 0;
  const add = (when, what, pts) => { items.push({ when, what }); score += pts; };
  const lift = N_LIFT[wd], S = c.slots;
  if (lift) {
    const mw = mainWork(w);
    add(tod(S.lift), N_LIFTNAME[lift] + (w === 16 ? " (1RM test)" : " " + mw[0].sets + " × " + mw[0].reps + " @ " + mw[0].pct + "%"), 1);
    if (HIIT_DAYS.indexOf(wd) > -1) add(tod(S.hiit), "HIIT after the lift", 1);
    if (faInfo(w, lift)) add(tod(S.forearm), "Forearm " + FA_DAY[lift], 0.25);
    if (SAND[lift] && w !== 16) add(tod(S.sandbag), "Sandbag lean and rows", 0.25);
    if (NECK_DAYS.indexOf(lift) > -1) add(tod(S.neck), "Neck work", 0.1);
  } else {
    offItems(wd, w, c).forEach(k => {
      if (k === "run") { const r = runFor(w, wd, c.run); add(tod(S.run), "Run-walk, about " + (runMins(r) + 10) + " min", (runMins(r) + 10) / 30); }
      if (k === "tib") add(tod(S.tib), "Tibialis", 0.1);
      if (k === "mob") add(tod(S.mob), "Mobility", 0.1);
      if (k === "str") add(tod(S.str), "Stretching", 0.1);
      if (k === "swim") add(tod(S.swim), "Swim " + c.swim.mins + " min", c.swim.mins / 60);
      if (k === "fa") add(tod(S.forearm), "Forearm " + FA_OFF[wd], 0.25);
      if (k === "carry" && w !== 16) add(tod(S.sandbag), "Sandbag carry", 0.5);
    });
  }
  const level = score >= 2 ? "High" : score >= 1 ? "Moderate" : "Light";
  return { items, score, level };
}
export function nutTiming(d) {
  const t = [];
  const am = d.items.some(i => i.when === "morning" && /lift|Squat|Bench|Deadlift|Overhead|HIIT|Run/.test(i.what));
  const pm = d.items.some(i => i.when === "evening" && !/Neck/.test(i.what));
  if (am) t.push("Carbs and some protein 1–3 h before the morning session (a light snack if you train early), then a protein-rich meal within a couple of hours after.");
  if (pm) t.push("A carb-based snack 1–2 h before the evening session and a proper meal after it.");
  if (!am && !pm) t.push("Even meals with protein at each, and enough carbs to stay fuelled for tomorrow.");
  return t.join(" ");
}
export function nutContext(q, { week, nut, hm, c, hits }) {
  const wt = nutW(nut), pf = N_PROT[nut.goal], cf = N_CARB[nut.goal];
  const days = N_WD.map(wd => { const d = nutDay(week, wd, c); return wd + " [" + d.level + " load]: " + (d.items.length ? d.items.map(i => i.when + " " + i.what).join("; ") : "rest"); }).join("\n");
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long" });
  return "Athlete details:\n- Goal: " + N_GOAL[nut.goal] + "\n- Body weight: " + (wt ? wt + " kg" : "not given") + "\n- Diet, allergies, foods avoided: " + (nut.notes.trim() || "none given") +
    "\n- Also training for a half marathon on " + hm.race + " (beginner runner), and doing a 16-week powerlifting block. Today is " + today + ".\n\n" +
    "Suggested starting targets: protein " + pf + " g/kg/day; fat at least 0.8 g/kg; carbohydrate g/kg by load: light " + cf.Light + ", moderate " + cf.Moderate + ", high " + cf.High + ".\n\n" +
    "Training schedule, week " + week + " (" + phaseOf(week).name + "):\n" + days +
    (hits.length ? "\n\nNotes from the athlete's reference library (may be relevant):\n" + hits.map(h => "- " + h.c.heading + ": " + h.c.text.slice(0, 500)).join("\n") : "");
}
export { HM_LONG };
