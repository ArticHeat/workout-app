export const round = v => Math.round(v / 2.5) * 2.5;
export const fmt = n => n.toLocaleString("en-GB");
export const sameName = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
export const uid = () => "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const qid = () => "q" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const nowISO = () => new Date().toISOString();
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const dayMs = 86400000;
export const timeLabel = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const reloadPage = () => { try { location.reload(); } catch (e) {} };
