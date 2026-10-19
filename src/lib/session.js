/* Builds one day's session as plain data: which activity boxes appear (in morning/evening order) and which rows
   in them can be ticked. The screens render this, and tick keys come from it, so they can never drift apart. */
import { DAYS, RAMP } from "../data/program.js";
import { HIIT_DAYS, NECK_DAYS, SAND, OFF_KIND, ACT, neckSets } from "../data/schedule.js";
import { FA_OFF, FA_DAY } from "../data/forearm.js";
import { phaseOf, liftName, rmNum, mainWork, getAcc, weekOk, progText, faForWorkout, faInfo, offItems, runFor, runDesc } from "./plan.js";
import { round } from "./util.js";

/* "main lift" headline, e.g. "4 × 10 @ 85 kg" with the "60% of 1RM" caption. `planned` is the text saved to the log. */
export function mainHeadline(week, lift, rmRaw) {
  const rm = rmNum(rmRaw), name = liftName(lift);
  if (week === 16) return { week16: true, big: name, small: "work up to a max single", planned: name + " work up to a max single" };
  const m = mainWork(week)[0], kg = rm ? round(rm * m.pct / 100) + " kg" : "—";
  return { week16: false, big: m.sets + " × " + m.reps + " @ " + kg, small: m.pct + "% of 1RM", planned: m.sets + " × " + m.reps + " @ " + kg + " " + m.pct + "% of 1RM" };
}

export function liftDayBlocks(c) {
  const { week, day, slots } = c, dname = DAYS.find(d => d.lift === day).d, blocks = [];
  blocks.push({ id: "lift", type: "lift", act: "lift", slot: slots.lift, sub: liftName(day) });
  if (faInfo(week, day)) blocks.push({ id: "fa", type: "fa", act: "forearm", slot: slots.forearm, sub: "Hypertrophy program", workout: FA_DAY[day] });
  if (SAND[day]) blocks.push({ id: "sand", type: "sand", act: "sandbag", slot: slots.sandbag, sub: "Sandbag Foundation", dk: day });
  if (NECK_DAYS.indexOf(day) > -1) blocks.push({ id: "neck", type: "neck", act: "neck", slot: slots.neck, sub: "Neck training" });
  if (HIIT_DAYS.indexOf(dname) > -1) blocks.push({ id: "hiit", type: "hiit", act: "hiit", slot: slots.hiit, sub: "After your main lifts", dname });
  return blocks;
}
export function offDayBlocks(c, wd) {
  const { week, slots } = c, it = offItems(wd, week, c), blocks = [];
  if (it.indexOf("run") > -1) blocks.push({ id: "run", type: "run", act: "run", slot: slots.run, sub: "Beginner run-walk", wd });
  if (it.indexOf("tib") > -1) blocks.push({ id: "tib", type: "tib", act: "tib", slot: slots.tib, sub: "Tib tool" });
  if (it.indexOf("mob") > -1) blocks.push({ id: "mob", type: "mob", act: "mobility", slot: slots.mob, sub: "Hips and trunk" });
  if (it.indexOf("str") > -1) blocks.push({ id: "str", type: "str", act: "stretch", slot: slots.str, sub: "Static stretching" });
  if (it.indexOf("swim") > -1) blocks.push({ id: "swim", type: "swim", act: "swim", slot: slots.swim, sub: "Easy aerobic" });
  if (it.indexOf("fa") > -1) blocks.push({ id: "fa", type: "fa", act: "forearm", slot: slots.forearm, sub: "Hypertrophy program", workout: FA_OFF[wd] });
  if (it.indexOf("carry") > -1) blocks.push({ id: "carry", type: "sand", act: "sandbag", slot: slots.sandbag, sub: "Sandbag Foundation", dk: "carry" });
  return blocks;
}
export const slotOrder = blocks => ["AM", "PM"].flatMap(sl => blocks.filter(b => b.slot === sl));
export const timeOf = slot => slot === "AM" ? "morning" : "evening";

/* Tickable rows for one block: [{ k, planned, name, main? }]. `ed` is whether the accessory list is being edited. */
export function blockRows(b, c, ed) {
  const { week, day, tib, mob, str, swim, run } = c, kind = ACT[b.act].name, key = n => kind + "|" + n;
  switch (b.type) {
    case "hiit": return [{ k: key("Session"), planned: "HIIT", name: "Session", session: true }];
    case "run": return [{ k: key("Session"), planned: runDesc(runFor(week, b.wd, run)), name: "Session", session: true }];
    case "swim": return [{ k: key("Session"), planned: swim.mins + " min easy aerobic", name: "Session", session: true }];
    case "lift": {
      const rows = [{ k: key("Main lift"), planned: mainHeadline(week, day, c.rm[day]).planned, name: "Main lift", main: true }];
      if (!ed) getAcc(c.custom, day, week).filter(a => weekOk(a[0], week)).forEach(a => rows.push({ k: key(a[0]), planned: progText(a[0], a[1], week), name: a[0] }));
      return rows;
    }
    case "fa": { const f = faForWorkout(week, b.workout); return f && f.rows ? f.rows.map(r => ({ k: key(r.ex), planned: String(r.sets), name: r.ex })) : []; }
    case "sand": return week === 16 ? [] : SAND[b.dk].map(r => ({ k: key(r.ex), planned: r.sets(week), name: r.ex }));
    case "neck": return ["Neck curl", "Neck extension"].map(n => ({ k: key(n), planned: neckSets(week) + " × 25", name: n }));
    case "tib": return ed ? [] : tib.angles.map(a => ({ k: key(a), planned: tib.sets + " × " + tib.reps, name: a }));
    case "mob": return mob.items.map(x => ({ k: key(x.ex), planned: x.rx, name: x.ex }));
    case "str": return str.items.map(x => ({ k: key(x.ex), planned: x.rx, name: x.ex }));
    default: return [];
  }
}

export function sessionModel(c, editing) {
  const blocks = c.day.indexOf("off:") === 0 ? offDayBlocks(c, c.day.slice(4)) : liftDayBlocks(c);
  const ordered = slotOrder(blocks);
  const rowsById = {}, items = [];
  ordered.forEach(b => { rowsById[b.id] = blockRows(b, c, editing); rowsById[b.id].forEach(r => items.push(r.k)); });
  return { blocks, ordered, rowsById, items };
}
export { OFF_KIND, RAMP };
