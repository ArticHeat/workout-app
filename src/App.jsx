import { useEffect } from "react";
import { useApp, setTab } from "./state/app.js";
import Overview from "./tabs/Overview.jsx";
import Weekly from "./tabs/Weekly.jsx";
import Library from "./tabs/Library.jsx";
import Equipment from "./tabs/Equipment.jsx";
import Nutrition from "./tabs/Nutrition.jsx";
import HalfMarathon from "./tabs/HalfMarathon.jsx";
import Reference from "./tabs/Reference.jsx";
import RestBar from "./components/RestBar.jsx";
import { refLoad } from "./state/ref.js";
import { logLoad } from "./state/log.js";
import { sheetPull } from "./lib/sheetlog.js";

const TABS = [["overview", "Training Overview", Overview], ["weekly", "Weekly Dashboard", Weekly], ["library", "Exercise Library", Library], ["eq", "Equipment", Equipment], ["nut", "Nutrition", Nutrition], ["hm", "Half Marathon", HalfMarathon], ["ref", "Reference Library", Reference]];

export default function App() {
  const tab = useApp(s => s.tab);
  /* Load the saved library and log once the page is up, then pull any newer ticks from the Google Sheet */
  useEffect(() => { (async () => { await refLoad(); await logLoad(); sheetPull(); })(); }, []);
  const Active = (TABS.find(t => t[0] === tab) || TABS[0])[2];
  return (
    <div className="app">
      <nav className="side" aria-label="Dashboard sections">
        <div className="brand">Powerlifting block<span>16 weeks to meet day</span></div>
        {TABS.map(([k, label]) => <button key={k} className="nav" data-tab={k} aria-current={tab === k ? "page" : "false"} onClick={() => setTab(k)}>{label}</button>)}
      </nav>
      <main className="main"><Active /></main>
      <RestBar />
    </div>
  );
}
