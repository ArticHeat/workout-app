/* One-time library and plan migrations, run once per device (tracked in "plb-seeded"). Pure: takes the current
   library, custom plan and done-list, and returns the new ones. Logic is unchanged from the single-file app, so
   existing devices keep behaving the same. */
import { LIB_SEEDS, GRIP_PACK, ACC_FOCUS, PERIOD } from "../data/library.js";
import { ACC_DEF } from "../data/program.js";
import { EQ_SEED } from "../data/equipment.js";
import { uid, qid } from "./util.js";

const clone = x => JSON.parse(JSON.stringify(x));

export function migrateLibrary(libIn, customIn, doneIn) {
  const library = clone(libIn), custom = clone(customIn), done = doneIn.slice();
  let changed = false, customChanged = false;
  const saveCustom = () => { customChanged = true; };
  LIB_SEEDS.forEach(sd => {
    if (done.indexOf(sd.key) > -1) return;
    if (!library.some(e => e.name.toLowerCase() === sd.name.toLowerCase())) {
      library.push({ id: uid(), name: sd.name, focus: sd.focus, sets: sd.sets, lifts: sd.lifts.slice(), phases: sd.phases.slice(), notes: sd.notes, created: Date.now() });
      changed = true;
    }
    done.push(sd.key);
  });
  if (done.indexOf("grip-pack-1") < 0) {
    if (!library.some(e => (e.lifts || []).indexOf("addon") > -1)) {
      GRIP_PACK.forEach(g => {
        if (library.some(e => e.name.toLowerCase() === g.name.toLowerCase())) return;
        library.push({ id: uid(), name: g.name, focus: "Forearms / Grip", sets: g.sets, lifts: ["addon"], phases: g.phases.slice(), notes: g.notes, created: Date.now() });
        changed = true;
      });
    }
    done.push("grip-pack-1");
  }
  if (done.indexOf("plan-grip-remove-1") < 0) {
    /* Take out the accessory entries added earlier by hand; the forearm program now covers them */
    if (done.indexOf("plan-grip-1") > -1) {
      const gone = [
        ["sq", [1, 2], "Hand gripper (crushing grip)", "2 × 6–12"],
        ["bp", [1, 2], "Wrist extension (reverse wrist curl)", "3 × 12–15"],
        ["bp", [1, 2], "Pronation and supination (lever)", "2–3 × 12–15"],
        ["oh", [1, 2], "Wrist extension (reverse wrist curl)", "3 × 12–15"],
        ["oh", [1, 2, 3, 4], "Finger extension (rice bucket or bands)", "2 × 10–15"]
      ];
      let any = false;
      gone.forEach(g => g[1].forEach(pid => {
        const k = g[0] + "-" + pid;
        if (!custom[k]) return;
        const n = custom[k].length;
        custom[k] = custom[k].filter(x => !(String(x[0]).toLowerCase() === g[2].toLowerCase() && x[1] === g[3]));
        if (custom[k].length !== n) any = true;
      }));
      if (any) saveCustom();
    }
    done.push("plan-grip-remove-1");
  }
  if (done.indexOf("plan-expander-1") < 0) {
    /* Chest expander replaces face pulls on bench day; dips and the chest crusher join bench-day accessories */
    [1, 2, 4].forEach(pid => {
      const k = "bp-" + pid;
      const list = custom[k] || ACC_DEF.bp[pid].map(x => x.slice());
      const i = list.findIndex(x => String(x[0]).trim().toLowerCase() === "face pull");
      if (i > -1) { list[i] = ["Chest expander", list[i][1]]; custom[k] = list; }
    });
    [["Dips", "3 × 10", 1], ["Dips", "3 × 8", 2], ["Chest crusher", "3 × 80–90", 1], ["Chest crusher", "3 × 80–90", 2]].forEach(a => {
      const k = "bp-" + a[2];
      const list = custom[k] || ACC_DEF.bp[a[2]].map(x => x.slice());
      if (!list.some(x => String(x[0]).trim().toLowerCase() === a[0].toLowerCase())) list.push([a[0], a[1]]);
      custom[k] = list;
    });
    saveCustom();
    done.push("plan-expander-1");
  }
  if (done.indexOf("tag-fix-dips-1") < 0) {
    library.forEach(e => { if (String(e.name).toLowerCase() === "dips") { e.phases = [1, 2]; if ((e.lifts || []).indexOf("bp") < 0) e.lifts = (e.lifts || []).concat(["bp"]); changed = true; } });
    done.push("tag-fix-dips-1");
  }
  if (done.indexOf("expander-detail-1") < 0) {
    /* Chest expander: overhead and above-chest pulls at 4 springs, in-front-of-chest pulls at 3 springs, 10 reps each */
    const EXP_NOTE = "4 springs overhead and above chest, 3 in front";
    Object.keys(custom).forEach(k => custom[k].forEach(x => {
      if (String(x[0]).trim().toLowerCase() === "chest expander") x[1] = ((String(x[1]).match(/^\d+/) || ["3"])[0]) + " × 10 · " + EXP_NOTE;
    }));
    saveCustom();
    library.forEach(e => {
      if (String(e.name).toLowerCase() === "chest expander") {
        e.sets = "3 × 10 each position";
        e.notes = "Three positions, 10 reps each: overhead and above the chest at 4 springs (your max, 10 kg tension), and in front of the chest at 3 springs, where you are weaker. Replaces face pulls in the plan.";
        changed = true;
      }
    });
    done.push("expander-detail-1");
  }
  if (done.indexOf("crusher-detail-1") < 0) {
    /* Chest crusher: 1 super spring (30 kg of force) for 80 reps; 2 springs gives about 8 reps after a week of training */
    Object.keys(custom).forEach(k => custom[k].forEach(x => {
      if (String(x[0]).trim().toLowerCase() === "chest crusher" && x[1] === "3 × 80–90") x[1] = "3 × 80";
    }));
    saveCustom();
    library.forEach(e => {
      if (String(e.name).toLowerCase() === "chest crusher") {
        if (e.sets === "3 × 80–90") e.sets = "3 × 80";
        if (/Two springs is too hard/.test(e.notes || "") || !e.notes) e.notes = "Do both top-facing and bottom-facing. 1 super spring (30 kg of force) is comfortable for 80 reps. 2 springs is much harder: 8 reps after a week of training, so build up from there.";
        changed = true;
      }
    });
    done.push("crusher-detail-1");
  }
  if (done.indexOf("obliques-1") < 0) {
    /* Oblique work on squat day: barbell side bend (weeks 1-10) and landmine twist (weeks 1-14) */
    library.forEach(e => { if (String(e.name).toLowerCase() === "barbell side bend" && e.focus === "Core") { e.focus = "Obliques"; changed = true; } });
    [["sq", 1, "Barbell side bend", "3 × 10–12 each side"], ["sq", 1, "Landmine twist", "3 × 8 each side"],
     ["sq", 2, "Barbell side bend", "3 × 8–10 each side"], ["sq", 2, "Landmine twist", "3 × 8 each side"],
     ["sq", 3, "Landmine twist", "2 × 8 each side"]].forEach(a => {
      const k = a[0] + "-" + a[1];
      const list = custom[k] || ACC_DEF[a[0]][a[1]].map(x => x.slice());
      if (!list.some(x => String(x[0]).trim().toLowerCase() === a[2].toLowerCase())) list.push([a[2], a[3]]);
      custom[k] = list;
    });
    saveCustom();
    done.push("obliques-1");
  }
  if (done.indexOf("obliques-rotation-1") < 0) {
    /* Landmine twist joins the light week (phase 4); library notes explain the rotation */
    const k4 = "sq-4", l4 = custom[k4] || ACC_DEF.sq[4].map(x => x.slice());
    if (!l4.some(x => String(x[0]).trim().toLowerCase() === "landmine twist")) l4.push(["Landmine twist", "2 × 8 each side"]);
    custom[k4] = l4;
    saveCustom();
    library.forEach(e => {
      const n = String(e.name).toLowerCase();
      if (n === "barbell side bend" || n === "landmine twist") {
        const rule = n === "barbell side bend" ? "Rotates with landmine twist: barbell side bend in weeks 1, 3, 5, 7 and 9." : "Rotates with barbell side bend: landmine twist in weeks 2, 4, 6, 8 and 10 to 15.";
        if (!/Rotates with/.test(e.notes || "")) e.notes = ((e.notes || "") + " " + rule).trim();
        if (n === "landmine twist") e.phases = [1, 2, 3, 4];
        changed = true;
      }
    });
    done.push("obliques-rotation-1");
  }
  if (done.indexOf("good-morning-1") < 0) {
    /* Squat day gets good mornings in place of Romanian deadlifts (Romanian deadlifts stay on deadlift day) */
    const k = "sq-1", list = custom[k] || ACC_DEF.sq[1].map(x => x.slice());
    const i = list.findIndex(x => String(x[0]).trim().toLowerCase() === "romanian deadlift");
    if (i > -1) { list[i] = ["Good morning", list[i][1]]; custom[k] = list; saveCustom(); }
    library.forEach(e => {
      if (String(e.name).toLowerCase() === "romanian deadlift") { e.lifts = (e.lifts || []).filter(l => l !== "sq"); changed = true; }
    });
    done.push("good-morning-1");
  }
  if (done.indexOf("plan-btn-1") < 0) {
    /* Behind-the-neck press on OHP day; behind-the-neck pulldown on bench day, so the two are 3 days apart */
    const adds = [
      { lift: "oh", name: "Behind-the-neck overhead press", sets: "3 × 8", phases: [1, 2] },
      { lift: "bp", name: "Behind-the-neck lat pulldown", sets: "3 × 10", phases: [1, 2] }
    ];
    adds.forEach(a => a.phases.forEach(pid => {
      const k = a.lift + "-" + pid;
      const list = custom[k] || ACC_DEF[a.lift][pid].map(x => x.slice());
      if (!list.some(x => String(x[0]).trim().toLowerCase() === a.name.toLowerCase())) list.push([a.name, a.sets]);
      custom[k] = list;
    }));
    saveCustom();
    done.push("plan-btn-1");
  }
  if (done.indexOf("btn-move-1") < 0) {
    /* Behind-the-neck lat pulldown comes off whichever day(s) it was on and moves to deadlift day (weeks 1-10) */
    const nm = "behind-the-neck lat pulldown";
    let keepSets = null;
    Object.keys(custom).forEach(k => {
      const before = custom[k].length;
      const kept = custom[k].filter(x => { const m = String(x[0]).trim().toLowerCase() === nm; if (m && keepSets === null) keepSets = x[1]; return !m; });
      if (kept.length !== before) custom[k] = kept;
    });
    [1, 2].forEach(pid => {
      const k = "dl-" + pid, list = custom[k] || ACC_DEF.dl[pid].map(x => x.slice());
      if (!list.some(x => String(x[0]).trim().toLowerCase() === nm)) list.push(["Behind-the-neck lat pulldown", keepSets || "3 × 10"]);
      custom[k] = list;
    });
    saveCustom();
    library.forEach(e => { if (String(e.name).toLowerCase() === nm) { e.lifts = ["dl"]; changed = true; } });
    done.push("btn-move-1");
  }
  if (done.indexOf("stretch-section-1") < 0) {
    /* All stretches and mobility drills move into their own Stretching section */
    const names = ["half-kneeling side bend", "cossack squat", "couch stretch", "pigeon pose", "hip cars", "side bend stretch"];
    library.forEach(e => { if (names.indexOf(String(e.name).toLowerCase()) > -1) { e.lifts = ["stretch"]; changed = true; } });
    done.push("stretch-section-1");
  }
  if (done.indexOf("period-regen-1") < 0) {
    library.forEach(e => { const ph = PERIOD[String(e.name).toLowerCase()]; if (ph) { e.phases = ph.slice(); changed = true; } });
    done.push("period-regen-1");
  }
  if (done.indexOf("focus-backfill-1") < 0) {
    library.forEach(e => { const f = ACC_FOCUS[String(e.name).toLowerCase()]; if (!e.focus && f) { e.focus = f; changed = true; } });
    done.push("focus-backfill-1");
  }
  return { library, custom, done, libChanged: changed, customChanged };
}

/* Equipment seeds and fixes, tracked by their own flags. flags: { seeded, fix1, fix2, fix3 } as booleans */
export function migrateEquipment(eqIn, flags) {
  let EQ = clone(eqIn);
  const f = Object.assign({}, flags);
  if (!f.seeded) {
    EQ_SEED.forEach(sd => { if (!EQ.some(e => e.name.toLowerCase() === sd.name.toLowerCase())) EQ.push({ id: qid(), name: sd.name, setting: sd.setting, notes: sd.notes, links: sd.links.slice() }); });
    f.seeded = true;
  }
  if (!f.fix1) {
    EQ.forEach(e => { if (e.name.toLowerCase() === "chest expander" && (!e.setting || e.setting === "4 springs")) { e.setting = "Overhead and above chest: 4 springs max (10 kg tension). In front of chest: 3 springs."; e.notes = "10 reps at every position."; } });
    f.fix1 = true;
  }
  if (!f.fix2) {
    EQ.forEach(e => { if (e.name.toLowerCase() === "chest crusher" && (!e.setting || e.setting === "1 spring (2 springs is too hard for now)")) e.setting = "1 super spring (30 kg of force) for 80 reps. 2 springs: 8 reps after a week of training."; });
    f.fix2 = true;
  }
  if (!f.fix3) {
    if (!EQ.some(e => e.name.toLowerCase() === "landmine attachment")) EQ.push({ id: qid(), name: "Landmine attachment", setting: "", notes: "Barbell anchor for landmine twists.", links: ["Landmine twist"] });
    f.fix3 = true;
  }
  return { EQ, flags: f };
}
