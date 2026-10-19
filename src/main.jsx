import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import App from "./App.jsx";
import { bootRestore } from "./lib/sync.js";
import { initApp } from "./state/app.js";
import { initLog } from "./state/log.js";
import { initCoach } from "./state/coach.js";
import { initSheetQueue } from "./lib/sheetlog.js";
import { restoreTimer } from "./state/timer.js";

/* Restore saved settings from the sheet BEFORE the page builds, so a wiped browser never starts from scratch */
async function start() {
  await bootRestore();
  initApp(); initLog(); initCoach(); initSheetQueue();
  createRoot(document.getElementById("root")).render(<StrictMode><App /></StrictMode>);
  restoreTimer();
}
start();

if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0 && import.meta.env.PROD) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
