/* Coach: feedback and suggested edits from everything logged. Suggestions only appear once logs span 7+ days. */
import { createStore, useStore } from "./createStore.js";
import { lsJSON, lsSetRaw, lsSetJSON } from "../lib/storage.js";
import { app, setCustom } from "./app.js";
import { logStore } from "./log.js";
import { sheetPull, reviewToSheet } from "../lib/sheetlog.js";
import { getSample, sampleErr } from "../lib/backend.js";
import { PHASES, LIFTS, ACC_DEF } from "../data/program.js";
import { SPRING_KG } from "../data/schedule.js";
import { phaseOf, rmNum } from "../lib/plan.js";
import { dayMs } from "../lib/util.js";

export const coachStore = createStore({ chat: [], review: null, busy: false, wait: false });
export const useCoach = sel => useStore(coachStore, sel);

export function initCoach() {
  const chat = lsJSON("plb-chat", []);
  coachStore.set({ chat: Array.isArray(chat) ? chat : [], review: lsJSON("plb-review", null), busy: false, wait: false });
}
const saveChat = () => lsSetJSON("plb-chat", coachStore.get().chat.slice(-30));
const saveReview = () => lsSetJSON("plb-review", coachStore.get().review);
const pushChat = m => { coachStore.set(s => ({ chat: s.chat.concat([m]) })); saveChat(); };

export function coachRecs(log) {
  return Object.keys(log).map(id => Object.assign({ id }, log[id])).filter(r => r.date).sort((a, b) => (a.date + a.id < b.date + b.id ? -1 : 1));
}
export function coachStatus(log, review) {
  const recs = coachRecs(log);
  if (!recs.length) return { ready: false, span: 0, first: "", last: "", due: false, text: "No logs yet. Tick exercises and log sets to start. Suggestions begin once you have 7 days of logs." };
  const first = recs[0].date, last = recs[recs.length - 1].date;
  const span = Math.floor((Date.now() - new Date(first + "T00:00:00").getTime()) / dayMs);
  const ready = span >= 7;
  const since = review ? Math.floor((Date.now() - new Date(review.at).getTime()) / dayMs) : 99;
  const due = ready && since >= 7;
  let text = recs.length + " day" + (recs.length === 1 ? "" : "s") + " logged since " + first + ". ";
  if (!ready) text += "Suggestions start after day 7 (day " + (span + 1) + " now).";
  else if (due) text += "Weekly review is due.";
  else text += "Next weekly review in " + (7 - since) + " day" + (7 - since === 1 ? "" : "s") + ".";
  return { ready, span, first, last, due, text };
}
const tail = k => k.split("|").slice(1).join("|");
export function coachData(log, a) {
  const recs = coachRecs(log).slice(-28), lastRec = recs[recs.length - 1];
  const ph = lastRec ? (PHASES.find(p => p.name === lastRec.phase) || phaseOf(a.week)).id : phaseOf(a.week).id;
  const days = recs.map(r => {
    const dn = Object.keys(r.done || {}), det = {};
    Object.keys(r.detail || {}).forEach(k => { const d = r.detail[k]; det[tail(k)] = { sets: d.sets, reps: d.reps, weight_kg: d.weight, springs: d.springs, spring_force_kg: d.force }; });
    return { date: r.date, week: r.week, weekday: r.day, phase: r.phase, done: dn.map(tail), not_done: (r.items || []).filter(k => dn.indexOf(k) < 0).map(tail), logged: det };
  });
  const plan = {};
  LIFTS.forEach(l => { const list = a.custom[l.key + "-" + ph] || ACC_DEF[l.key][ph]; plan[l.key] = { lift: l.name, phase: ph, accessories: list.map(x => ({ exercise: x[0], scheme: x[1] })) }; });
  return { today: new Date().toISOString().slice(0, 10), current_week: a.week, phases: PHASES.map(p => ({ id: p.id, name: p.name, weeks: p.weeks })), plan, one_rm_kg: LIFTS.reduce((o, l) => { o[l.key] = rmNum(a.rm[l.key]) || null; return o; }, {}), spring_kg_per_spring: SPRING_KG, logs: days };
}
export function coachPrompt(question, st, chat) {
  const a = app.get();
  return "You are the coaching feedback engine for one athlete's 16-week powerlifting block (with running, grip, neck, sandbag and mobility work). Use ONLY the logged data below; never invent logs.\n" +
    "RULES:\n1. The logs span " + st.span + " days. Suggest plan adjustments ONLY if the logs span at least 7 days AND a pattern repeats at least 3 times (for example an exercise skipped 3 times, or reps, sets or weight logged consistently above or below plan 3 times). Otherwise return an empty suggestions list.\n" +
    "2. It is fine and good to report that nothing needs changing. Say so plainly when the athlete has stuck to the plan.\n" +
    "3. Each suggestion is an object: {\"title\": short, \"why\": one sentence citing counts or dates from the logs, \"type\": \"scheme\"|\"remove\"|\"add\"|\"note\", \"lift\": \"sq\"|\"bp\"|\"dl\"|\"oh\" (not for note), \"phase\": number 1-4, \"exercise\": exact exercise name, \"scheme\": new sets x reps text such as \"3 × 12\" (for scheme and add)}. Use type scheme or remove only for exercises that appear in plan for that lift and phase. Use note for advice that is not a plan edit.\n" +
    "4. Keep the 48-hour rule: grip-heavy work stays at least 48 hours away from Thursday deadlifts. Do not raise spring counts faster than the written spring progression unless logs show every set completed at the top of the rep range for 3 sessions.\n" +
    "5. You are not a doctor. If pain or injury comes up, suggest seeing a professional and do not push load.\n" +
    "6. Write the reply in plain, short, friendly language, no jargon.\n" +
    "Return JSON only: {\"reply\": string, \"suggestions\": []}.\n\nDATA:\n" + JSON.stringify(coachData(logStore.get().log, a)) + "\n\n" +
    (question ? "RECENT CHAT:\n" + chat.slice(-6).map(m => (m.role === "me" ? "Athlete: " : "Coach: ") + m.text).join("\n") + "\n\nATHLETE QUESTION: " + question : "TASK: Do the weekly review of everything logged. Summarise what was done and not done, then give suggestions if the rules allow.");
}

export async function coachRun(question) {
  if (coachStore.get().busy) return;
  coachStore.set({ busy: true, wait: true });
  if (question) pushChat({ role: "me", text: question });
  try {
    try { await sheetPull(); } catch (e) {}
    const log = logStore.get().log, st = coachStatus(log, coachStore.get().review);
    if (!question && !st.ready) {
      pushChat({ role: "ai", text: "It is too early to suggest changes: " + (st.first ? "your logs cover " + st.span + " day" + (st.span === 1 ? "" : "s") + " so far" : "nothing is logged yet") + ". I look for patterns once you have at least 7 days, so keep ticking and logging sets, reps and weight." });
    } else {
      const sample = getSample();
      if (!sample) {
        const pr = coachPrompt(question, st, coachStore.get().chat);
        let copied = false;
        try { await navigator.clipboard.writeText(pr); copied = true; } catch (e) {}
        pushChat({ role: "ai", text: (copied ? "I copied your coach prompt to the clipboard. " : "Your browser would not let me copy it. ") + "Paste it into a chat with Claude (or any AI assistant) to get the review, then come back here and apply any changes by hand with Edit accessories. To get answers inside this app for free, add a Gemini key under App connection at the bottom of this page." });
      } else {
        const out = await sample.json(coachPrompt(question, st, coachStore.get().chat), { cache: false });
        const reply = out && typeof out.reply === "string" ? out.reply : "I could not read a reply. Try again.";
        let sug = out && Array.isArray(out.suggestions) ? out.suggestions.slice(0, 5) : [];
        if (!st.ready) sug = [];
        if (!question) {
          const review = { at: new Date().toISOString(), from: st.first, to: st.last, reply, suggestions: sug, applied: [] };
          coachStore.set({ review }); saveReview();
          reviewToSheet(review).catch(() => {});
        } else pushChat({ role: "ai", text: reply, suggestions: sug, applied: [] });
      }
    }
  } catch (e) {
    pushChat({ role: "ai", text: e && e.code === "not_granted" ? "Coach needs permission to ask the AI. Allow it when prompted and try again." : "Coach could not reach the AI just now. Try again in a moment." });
  }
  coachStore.set({ busy: false, wait: false });
}

export function coachSay(t) { pushChat({ role: "ai", text: t }); }

/* ref is "r:<suggestion index>" for the weekly review, or "<chat index>:<suggestion index>" */
export function coachApply(ref) {
  const parts = ref.split(":"), si = +parts[1], s = coachStore.get();
  const holder = parts[0] === "r" ? s.review : s.chat[+parts[0]];
  const sg = holder && holder.suggestions && holder.suggestions[si];
  if (!sg || (holder.applied || []).indexOf(si) > -1) return;
  const lift = sg.lift, ph = +sg.phase;
  if (!ACC_DEF[lift] || !ACC_DEF[lift][ph]) return;
  const key = lift + "-" + ph, custom = Object.assign({}, app.get().custom);
  custom[key] = (custom[key] || ACC_DEF[lift][ph]).map(a => a.slice());
  const list = custom[key], idx = list.findIndex(a => String(a[0]).trim().toLowerCase() === String(sg.exercise || "").trim().toLowerCase());
  if (sg.type === "scheme" && idx > -1 && sg.scheme) list[idx][1] = String(sg.scheme);
  else if (sg.type === "remove" && idx > -1) list.splice(idx, 1);
  else if (sg.type === "add" && idx < 0 && sg.exercise) list.push([String(sg.exercise), String(sg.scheme || "3 × 10")]);
  else { coachSay("That change no longer matches your plan, so I left it alone."); return; }
  setCustom(custom);
  const applied = (holder.applied || []).concat([si]);
  if (parts[0] === "r") { coachStore.set({ review: Object.assign({}, s.review, { applied }) }); saveReview(); }
  else { coachStore.set({ chat: s.chat.map((m, i) => i === +parts[0] ? Object.assign({}, m, { applied }) : m) }); saveChat(); }
}
export { sampleErr };
