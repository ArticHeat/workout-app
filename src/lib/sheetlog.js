/* Google Sheet log: every tick and set is written to the "Log" tab, one row per day|kind|exercise key.
   Writes are queued on this device, debounced, then updated in place or appended. */
import { sheets } from "./backend.js";
import { lsJSON, lsSetRaw } from "./storage.js";
import { syncSnapshot } from "./sync.js";
import { logStore, mergeInto } from "../state/log.js";
import { sheetSay, status } from "../state/status.js";
import { timeLabel } from "./util.js";

const SHEET = { busy: false, t: null };
let SHQ = [];
export function initSheetQueue() { SHQ = lsJSON("plb-sheetq", []); if (!Array.isArray(SHQ)) SHQ = []; }
const shqSave = () => lsSetRaw("plb-sheetq", JSON.stringify(SHQ));
export const queueLength = () => SHQ.length;

export function sheetErr(e) {
  const c = e && e.code;
  if (c === "server_not_connected" || c === "selection_required") return "Not connected to your Google Sheet yet. Open App connection at the bottom of the Training Overview, enter your link and password, then press Sync.";
  if (c === "needs_reauth" || c === "not_in_manifest" || c === "consent_required" || c === "blocked_by_policy" || c === "approval_required") return "Google Sheet link or password was refused. Check App connection at the bottom of the Training Overview.";
  if (c === "not_granted" || c === "capability_disabled" || c === "capability_removed") return "Google Sheets isn't available. Check App connection at the bottom of the Training Overview.";
  return "Couldn't reach Google Sheets (" + (c || "error") + "). Your ticks are kept and will go up when you press Sync.";
}

/* columns A-O: key, date, week, day, phase, "kind - exercise", planned, done, time of day, at, sets, reps, weight, springs, force */
export function sheetRow(id, k, e, done) {
  const rec = logStore.get().log[id] || {}, parts = k.split("|");
  const at = e && e.at ? e.at : new Date().toISOString();
  const d = rec.detail && rec.detail[k];
  return [id + "|" + k, at.slice(0, 10), rec.week || 0, rec.day || "", rec.phase || "", parts[0] + " - " + parts.slice(1).join("|"), (e && e.planned) || "", done, (e && e.time_of_day) || "", at]
    .concat(d ? [d.sets || "", d.reps || "", d.weight || "", d.springs || "", d.force || ""] : ["", "", "", "", ""]);
}

export function sheetEnqueue(row, soon) {
  SHQ = SHQ.filter(x => x[0] !== row[0]); SHQ.push(row); shqSave();
  sheetSay("Google Sheet: saving...");
  clearTimeout(SHEET.t); SHEET.t = setTimeout(sheetFlush, soon ? 50 : 1500);
}

export async function sheetFlush() {
  if (SHEET.busy || !SHQ.length) return;
  SHEET.busy = true;
  let ok = false;
  const batch = SHQ.slice();
  try {
    const col = await sheets.getValues("Log!A:A"), pos = {};
    col.forEach((r, i) => { if (r && r[0] !== undefined && r[0] !== "") pos[r[0]] = i + 1; });
    const adds = [];
    for (const row of batch) {
      const r = pos[row[0]];
      if (r) await sheets.updateValues("Log!A" + r + ":O" + r, [row]);
      else adds.push(row);
    }
    if (adds.length) await sheets.appendValues("Log!A1", adds);
    SHQ = SHQ.filter(x => batch.indexOf(x) < 0); shqSave(); ok = true;
    sheetSay("Saved to Google Sheet at " + timeLabel());
  } catch (e) { sheetSay(sheetErr(e)); }
  SHEET.busy = false;
  if (ok && SHQ.length) setTimeout(sheetFlush, 300);
}

/* Rebuild ticks from the Google Sheet when the page opens, so a wiped browser or stale copy never loses them */
export async function sheetPull() {
  try {
    const rows = await sheets.getValues("Log!A:O"), part = {};
    rows.slice(1).forEach(r => {
      if (!r || !r[0] || String(r[0]).indexOf("|") < 0) return;
      const key = String(r[0]), i = key.indexOf("|"), id = key.slice(0, i), k = key.slice(i + 1);
      const on = r[7] === true || String(r[7]).toUpperCase() === "TRUE", at = r[9] || "";
      const rec = part[id] || (part[id] = { week: +r[2] || 0, day: r[3] || "", phase: r[4] || "", done: {}, undone: {} });
      if (on) rec.done[k] = { at, planned: r[6] || "", time_of_day: r[8] || "" }; else rec.undone[k] = at;
      if (r[10] || r[11] || r[12] || r[13]) { rec.detail = rec.detail || {}; rec.detail[k] = { sets: r[10] || "", reps: r[11] || "", weight: r[12] || "", springs: r[13] || "", force: r[14] || "", at }; }
      rec.items = rec.items || []; if (rec.items.indexOf(k) < 0) rec.items.push(k);
    });
    mergeInto(part);
    sheetSay("Loaded from Google Sheet at " + timeLabel());
  } catch (e) { sheetSay(sheetErr(e)); }
}

async function sheetPushSettings() {
  const kv = syncSnapshot(), now = new Date().toISOString();
  const rows = Object.keys(kv).filter(k => k !== "plb-view" && k !== "plb-rt").sort().map(k => [k, String(kv[k]).slice(0, 49000), now]);
  if (!rows.length) return;
  await sheets.updateValues("Settings!A2:C" + (rows.length + 1), rows);
}

export async function sheetSyncAll() {
  sheetSay("Google Sheet: syncing everything...");
  const log = logStore.get().log;
  Object.keys(log).forEach(id => {
    const rec = log[id];
    Object.keys(rec.done || {}).forEach(k => { SHQ = SHQ.filter(x => x[0] !== id + "|" + k); SHQ.push(sheetRow(id, k, rec.done[k], true)); });
  });
  shqSave();
  await sheetFlush();
  try { await sheetPushSettings(); } catch (e) { if (status.get().sheet.indexOf("Saved") === 0) sheetSay("Ticks saved, but settings could not be saved: " + sheetErr(e)); }
}

export async function reviewToSheet(review) {
  await sheets.appendValues("Reviews!A1", [[review.at.slice(0, 10), review.from, review.to, review.reply, JSON.stringify(review.suggestions), ""]]);
}
