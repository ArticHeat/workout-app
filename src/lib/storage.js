/* Safe localStorage helpers. Every write to a synced key notifies the settings-sync module through a hook. */
let hook = null;
export const setWriteHook = f => { hook = f; };

export function lsGet(k, fallback = null) {
  try { const v = localStorage.getItem(k); return v === null ? fallback : v; } catch (e) { return fallback; }
}
export function lsJSON(k, fallback) {
  try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v === null || v === undefined ? fallback : v; } catch (e) { return fallback; }
}
export function lsSet(k, v) {
  try { localStorage.setItem(k, v); } catch (e) { return false; }
  try { if (hook) hook(k); } catch (e) {}
  return true;
}
export const lsSetJSON = (k, v) => lsSet(k, JSON.stringify(v));
export function lsRemove(k) {
  try { localStorage.removeItem(k); } catch (e) {}
  try { if (hook) hook(k); } catch (e) {}
}
/* writes that must not trigger a sync push (used by the sync module itself) */
export function lsSetRaw(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
