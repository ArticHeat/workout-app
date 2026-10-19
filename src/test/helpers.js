import { render, act } from "@testing-library/react";
import { createElement } from "react";
import App from "../App.jsx";
import { initApp, setTab } from "../state/app.js";
import { initLog } from "../state/log.js";
import { initCoach } from "../state/coach.js";
import { initSheetQueue } from "../lib/sheetlog.js";
import { closeTimer } from "../state/timer.js";

export async function boot(tab) {
  closeTimer();
  initApp(); initLog(); initCoach(); initSheetQueue();
  if (tab) setTab(tab);
  let r;
  await act(async () => { r = render(createElement(App)); await settle(); });
  return r;
}
export const settle = (ms = 20) => new Promise(r => setTimeout(r, ms));
export const flush = async (ms = 20) => { await act(async () => { await settle(ms); }); };

/* A fake Apps Script web app: a Log tab, a Data key-value store and a password */
export function fakeScript(password = "pw") {
  const s = { log: [["key", "date", "week", "day", "phase", "ex", "planned", "done", "tod", "at", "sets", "reps", "weight", "springs", "force"]], kv: {}, calls: [] };
  const handler = async (url, init) => {
    const b = JSON.parse(init.body);
    s.calls.push(b.op);
    const ok = payload => ({ ok: true, json: async () => payload });
    if (b.token !== password) return ok({ error: "bad token" });
    switch (b.op) {
      case "ping": return ok({ ok: true });
      case "kv_get": return ok(b.path in s.kv ? { exists: true, data: s.kv[b.path] } : { exists: false });
      case "kv_set": s.kv[b.path] = b.data; return ok({ ok: true });
      case "kv_delete": delete s.kv[b.path]; return ok({ ok: true });
      case "kv_list": {
        const n = b.path.split("/").length + 1;
        return ok({ docs: Object.keys(s.kv).filter(k => k.indexOf(b.path + "/") === 0 && k.split("/").length === n).map(k => ({ id: k.split("/").pop(), data: s.kv[k] })) });
      }
      case "get_values": { const col = b.range === "Log!A:A"; return ok({ payload: { values: col ? s.log.map(r => [r[0]]) : s.log } }); }
      case "update_values": { const m = /Log!A(\d+):O\d+/.exec(b.range); if (m) s.log[+m[1] - 1] = b.values[0]; return ok({ ok: true }); }
      case "append_values": b.values.forEach(r => s.log.push(r)); return ok({ ok: true });
      default: return ok({ error: "unknown op" });
    }
  };
  return { state: s, handler };
}
