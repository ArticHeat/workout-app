import { useTimer, timerLeft, fmtClock, togglePause, addTime, restartTimer, closeTimer } from "../state/timer.js";

/* The floating rest-timer bar: digital clock with pause, +/-15 s, restart and close */
export default function RestBar() {
  const t = useTimer(s => s);
  if (t.key === null) return null;
  const left = timerLeft(t), over = left < 0;
  return (
    <div id="rtbar" className={"show" + (over ? " over" : "")} role="timer">
      <div className="rtl"><b id="rtlabel">{t.label}</b><span id="rthint">{over ? "Rest done. Go lift" : t.hint}</span></div>
      <div className="rtd" id="rtdigits">{(over ? "+" : "") + fmtClock(left)}</div>
      <button type="button" id="rtpause" aria-label="Pause or resume" onClick={togglePause}>{t.paused ? "▶" : "⏸"}</button>
      <button type="button" id="rtminus" aria-label="Minus 15 seconds" onClick={() => addTime(-15)}>-15</button>
      <button type="button" id="rtplus" aria-label="Plus 15 seconds" onClick={() => addTime(15)}>+15</button>
      <button type="button" id="rtreset" aria-label="Restart" onClick={restartTimer}>↺</button>
      <button type="button" id="rtclose" aria-label="Close timer" onClick={closeTimer}>✕</button>
    </div>
  );
}
