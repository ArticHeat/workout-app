/* Main app state. Every slice is saved to the same localStorage key the single-file app used, so existing
   devices and the Sheet backup keep working. */
import { createStore, useStore } from "./createStore.js";
import { lsGet, lsJSON, lsSet, lsSetJSON } from "../lib/storage.js";

/* write only when the saved copy differs, so opening the app does not trigger a settings sync */
const saveIfChanged = (k, v) => { const sv = JSON.stringify(v); if (lsGet(k) !== sv) lsSet(k, sv); };
import { migrateLibrary, migrateEquipment } from "../lib/migrations.js";
import { LIFTS, DAYS } from "../data/program.js";
import { TIB_DEF, SWIM_DEF, MOB_DEF, STR_DEF, RUN_DEF, SLOT_DEF, OFF_DAYS } from "../data/schedule.js";

const TABS = ["overview", "weekly", "library", "ref", "hm", "nut", "eq"];
const clone = x => JSON.parse(JSON.stringify(x));
const obj = v => (v && typeof v === "object" && !Array.isArray(v) ? v : null);

export const app = createStore({
  ready: false,
  tab: "overview", week: 1, day: "sq",
  rm: { sq: "", bp: "", dl: "", oh: "" },
  custom: {}, library: [], slots: Object.assign({}, SLOT_DEF),
  tib: clone(TIB_DEF), run: clone(RUN_DEF), swim: clone(SWIM_DEF), mob: clone(MOB_DEF), str: clone(STR_DEF),
  eq: [], hm: { race: "2027-06-27", start: "2026-10-05" }, nut: { weight: "", goal: "build", notes: "" },
  ui: { libQuery: "", libFilter: "all", libStatus: "all", eqSearch: "" }
});
export const useApp = sel => useStore(app, sel);

export function initApp() {
  let custom = obj(lsJSON("plb-acc", {})) || {};
  let library = lsJSON("plb-exercises", []); if (!Array.isArray(library)) library = [];
  let done = lsJSON("plb-seeded", []); if (!Array.isArray(done)) done = [];

  const m = migrateLibrary(library, custom, done);
  library = m.library; custom = m.custom;
  if (m.libChanged) lsSetJSON("plb-exercises", library);
  if (m.customChanged) lsSetJSON("plb-acc", custom);
  saveIfChanged("plb-seeded", m.done);

  /* time-of-day slots */
  const slots = Object.assign({}, SLOT_DEF);
  const sv = obj(lsJSON("plb-slots", null));
  if (sv) Object.keys(SLOT_DEF).forEach(k => { if (sv[k] === "AM" || sv[k] === "PM") slots[k] = sv[k]; });
  if (!lsGet("plb-slots-fix-1")) { slots.neck = "AM"; lsSetJSON("plb-slots", slots); lsSet("plb-slots-fix-1", "1"); }

  /* off-day activity settings */
  let tib = clone(TIB_DEF); const t = obj(lsJSON("plb-tib", null));
  if (t && Array.isArray(t.angles) && t.angles.length) tib = Object.assign({}, TIB_DEF, t);
  let run = clone(RUN_DEF); const r = obj(lsJSON("plb-run", null));
  if (r && Array.isArray(r.days)) run = { days: r.days.filter(d => OFF_DAYS.indexOf(d) > -1) };
  let swim = clone(SWIM_DEF); const sw = obj(lsJSON("plb-swim", null)); if (sw) swim = Object.assign({}, SWIM_DEF, sw);
  let mob = clone(MOB_DEF); const mb = obj(lsJSON("plb-mob", null)); if (mb && Array.isArray(mb.items) && mb.items.length) mob = { day: mb.day || MOB_DEF.day, items: mb.items };
  let str = clone(STR_DEF); const st = obj(lsJSON("plb-stretch", null)); if (st && Array.isArray(st.items) && st.items.length) str = { day: st.day || STR_DEF.day, items: st.items };

  /* equipment */
  let eq = lsJSON("plb-equip", []); if (!Array.isArray(eq)) eq = [];
  const me = migrateEquipment(eq, { seeded: !!lsGet("plb-equip-seeded"), fix1: !!lsGet("plb-equip-fix-1"), fix2: !!lsGet("plb-equip-fix-2"), fix3: !!lsGet("plb-equip-fix-3") });
  eq = me.EQ;
  saveIfChanged("plb-equip", eq);
  ["seeded", "fix1", "fix2", "fix3"].forEach((f, i) => { if (me.flags[f]) lsSet(["plb-equip-seeded", "plb-equip-fix-1", "plb-equip-fix-2", "plb-equip-fix-3"][i], "1"); });

  let hm = { race: "2027-06-27", start: "2026-10-05" }; const h = obj(lsJSON("plb-hm", null)); if (h && h.race && h.start) hm = { race: h.race, start: h.start };
  const nut = Object.assign({ weight: "", goal: "build", notes: "" }, obj(lsJSON("plb-nutri", null)) || {});
  const rm = {}; LIFTS.forEach(l => { rm[l.key] = lsGet("plb-" + l.key, ""); });

  /* last view */
  let tab = "overview", week = 1, day = "sq";
  const v = obj(lsJSON("plb-view", null));
  if (v) {
    if (+v.week >= 1 && +v.week <= 16) week = +v.week;
    if (typeof v.day === "string" && (DAYS.some(d => d.lift === v.day) || v.day.indexOf("off:") === 0)) day = v.day;
    if (TABS.indexOf(v.tab) >= 0) tab = v.tab;
  }
  app.set({ ready: true, tab, week, day, rm, custom, library, slots, tib, run, swim, mob, str, eq, hm, nut, ui: { libQuery: "", libFilter: "all", libStatus: "all", eqSearch: "" } });
}

/* ---------- actions ---------- */
function saveView() { const { tab, week, day } = app.get(); const sv = JSON.stringify({ tab, week, day }); if (lsGet("plb-view") !== sv) lsSet("plb-view", sv); }
export function setTab(tab) { app.set({ tab }); saveView(); if (typeof window !== "undefined" && window.scrollTo) { try { window.scrollTo(0, 0); } catch (e) {} } }
export function setWeek(week) { app.set({ week }); saveView(); }
export function setDay(day) { app.set({ day }); saveView(); }
export function setWeekAndTab(week, tab) { app.set({ week, tab }); saveView(); try { window.scrollTo(0, 0); } catch (e) {} }
export function setRm(key, val) { app.set(s => ({ rm: Object.assign({}, s.rm, { [key]: val }) })); lsSet("plb-" + key, val); }
export function setCustom(custom) { app.set({ custom }); lsSetJSON("plb-acc", custom); }
export function setLibrary(library) { app.set({ library }); lsSetJSON("plb-exercises", library); }
export function setSlot(k, v) { app.set(s => ({ slots: Object.assign({}, s.slots, { [k]: v }) })); lsSetJSON("plb-slots", app.get().slots); }
export function setTib(tib) { app.set({ tib }); lsSetJSON("plb-tib", tib); }
export function setRun(run) { app.set({ run }); lsSetJSON("plb-run", run); }
export function setSwim(swim) { app.set({ swim }); lsSetJSON("plb-swim", swim); }
export function setMob(mob) { app.set({ mob }); lsSetJSON("plb-mob", mob); }
export function setStr(str) { app.set({ str }); lsSetJSON("plb-stretch", str); }
export function setEq(eq) { app.set({ eq }); lsSetJSON("plb-equip", eq); }
export function setHm(hm) { app.set({ hm }); lsSetJSON("plb-hm", hm); }
export function setNut(nut) { app.set({ nut }); lsSetJSON("plb-nutri", nut); }
export function setUi(patch) { app.set(s => ({ ui: Object.assign({}, s.ui, patch) })); }
export function jumpToLibrary(query) { app.set(s => ({ ui: Object.assign({}, s.ui, { libQuery: query, libFilter: "all", libStatus: "all" }) })); setTab("library"); }
export function jumpToEquipment(name) { app.set(s => ({ ui: Object.assign({}, s.ui, { eqSearch: name }) })); setTab("eq"); }
