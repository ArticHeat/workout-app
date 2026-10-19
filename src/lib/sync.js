/* Keep settings in the sheet so a wiped browser or a new phone does not start from scratch.
   Same document path and format as the single-file app, so existing data still loads. */
import { db, userPath } from "./backend.js";
import { lsGet, lsSetRaw, setWriteHook } from "./storage.js";

const SYNC = { t: null, ready: false };
export const syncSkip = k => !/^plb-/.test(k) || k === "plb-log" || k === "plb-sync-at" || k === "plb-sheetq";

export function syncSnapshot() {
  const kv = {};
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!syncSkip(k)) kv[k] = localStorage.getItem(k); } } catch (e) {}
  return kv;
}
const syncDoc = () => db.collection(userPath()).doc("settings");

export function syncPush() {
  if (!SYNC.ready) return;
  clearTimeout(SYNC.t);
  SYNC.t = setTimeout(async () => {
    try {
      const at = Date.now();
      await syncDoc().set({ kv: syncSnapshot(), at, updated: new Date(at).toISOString() });
      lsSetRaw("plb-sync-at", String(at));
    } catch (e) {}
  }, 800);
}

/* Runs BEFORE the page builds: restores saved settings from the account when they are newer than this device's copy. */
export async function bootRestore(timeoutMs = 6000) {
  let cloudHad = null;
  setWriteHook(k => { if (!syncSkip(String(k))) syncPush(); });
  try {
    const work = (async () => {
      const snap = await syncDoc().get();
      const data = snap.exists ? snap.data() : null;
      cloudHad = !!data;
      const mine = +lsGet("plb-sync-at", "0") || 0;
      if (data && data.kv && (data.at || 0) > mine) {
        Object.keys(data.kv).forEach(k => { if (/^plb-/.test(k) && k !== "plb-log" && k !== "plb-sync-at") lsSetRaw(k, data.kv[k]); });
        lsSetRaw("plb-sync-at", String(data.at));
      }
    })();
    await Promise.race([work, new Promise(r => setTimeout(r, timeoutMs))]);
  } catch (e) {}
  SYNC.ready = true;
  if (cloudHad === false) syncPush();
  return cloudHad;
}
