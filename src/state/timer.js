/* Rest timer. One timer at a time, survives page reloads (plb-rt), beeps and vibrates when rest is over. */
import { createStore, useStore } from "./createStore.js";
import { lsJSON, lsRemove, lsSetRaw } from "../lib/storage.js";

export const timer = createStore({ key: null, label: "", hint: "", target: 0, end: 0, paused: false, left: 0, beeped: false, tick: 0 });
export const useTimer = sel => useStore(timer, sel);
export const timerLeft = s => s.paused ? s.left : (s.end - Date.now()) / 1000;
export const fmtClock = s => { s = Math.abs(Math.round(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };

let iv = null, ac = null;
function beep() {
  try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) {}
  try {
    if (!ac) return;
    [0, .25, .5].forEach(d => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 880; g.gain.value = .15; o.connect(g); g.connect(ac.destination); o.start(ac.currentTime + d); o.stop(ac.currentTime + d + .15); });
  } catch (e) {}
}
function save() {
  const s = timer.get();
  if (s.key === null) lsRemove("plb-rt");
  else lsSetRaw("plb-rt", JSON.stringify({ key: s.key, label: s.label, hint: s.hint, target: s.target, end: s.end, paused: s.paused, left: s.left, beeped: s.beeped }));
}
function loop() {
  const s = timer.get();
  if (s.key !== null && !s.paused && !s.beeped && timerLeft(s) < 0) { timer.set({ beeped: true }); beep(); save(); }
  timer.set({ tick: s.tick + 1 });
}
const ensureLoop = () => { if (!iv) iv = setInterval(loop, 250); };

export function startTimer(key, label, secs, hint) {
  try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); } catch (e) {}
  timer.set({ key, label, hint, target: secs, end: Date.now() + secs * 1000, paused: false, beeped: false });
  ensureLoop(); save();
}
export function closeTimer() {
  timer.set({ key: null });
  if (iv) { clearInterval(iv); iv = null; }
  save();
}
export function addTime(sec) {
  const s = timer.get();
  if (s.key === null) return;
  if (s.paused) timer.set({ left: s.left + sec }); else timer.set({ end: s.end + sec * 1000 });
  if (timerLeft(timer.get()) > 0) timer.set({ beeped: false });
  save();
}
export function togglePause() {
  const s = timer.get();
  if (s.key === null) return;
  if (s.paused) timer.set({ end: Date.now() + s.left * 1000, paused: false });
  else timer.set({ left: (s.end - Date.now()) / 1000, paused: true });
  save();
}
export function restartTimer() { const s = timer.get(); if (s.key !== null) startTimer(s.key, s.label, s.target, s.hint); }
export function restoreTimer() {
  const o = lsJSON("plb-rt", null);
  if (!o || !o.key) return;
  if (!o.paused && Date.now() - o.end > 30 * 60 * 1000) { lsRemove("plb-rt"); return; }
  timer.set(o);
  ensureLoop();
}
export function stopTimerLoop() { if (iv) { clearInterval(iv); iv = null; } }
