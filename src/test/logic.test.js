import { describe, it, expect } from "vitest";
import { mergeRec } from "../state/log.js";
import { chunkDoc, addKeywords, makeIndex, searchIndex } from "../lib/refSearch.js";
import { raceWeek, hmPhase, hmSessions } from "../lib/hm.js";
import { coachStatus } from "../state/coach.js";
import { initApp, app } from "../state/app.js";
import { planCells, inAnyPlan, mainWork, tonnage, runFor, runDesc } from "../lib/plan.js";
import { nutDay } from "../lib/nutrition.js";
import { SLOT_DEF } from "../data/schedule.js";
import { sessionModel } from "../lib/session.js";

const iso = (d) => new Date(Date.now() - d * 86400000).toISOString();

describe("mergeRec", () => {
  const a = { done: { x: { at: "2026-01-02T10:00:00Z" } }, undone: {}, updated: "2026-01-02T10:00:00Z", items: ["x"], total: 1 };
  const b = { done: {}, undone: { x: "2026-01-02T11:00:00Z" }, updated: "2026-01-02T11:00:00Z", items: ["x", "y"], total: 2 };
  it("lets the newest tick or untick win", () => {
    expect(mergeRec(a, b).done.x).toBeUndefined();
    expect(mergeRec(a, b).undone.x).toBe("2026-01-02T11:00:00Z");
    expect(mergeRec(b, a).undone.x).toBe("2026-01-02T11:00:00Z");
    const later = { done: { x: { at: "2026-01-03T00:00:00Z" } }, undone: {} };
    expect(mergeRec(b, later).done.x.at).toBe("2026-01-03T00:00:00Z");
  });
  it("keeps the union of items and the larger total", () => {
    const m = mergeRec(a, b);
    expect(m.items.sort()).toEqual(["x", "y"]);
    expect(m.total).toBe(2);
  });
  it("keeps the newest detail per exercise and handles a missing side", () => {
    const m = mergeRec({ detail: { e: { sets: "3", at: "1" } } }, { detail: { e: { sets: "4", at: "2" }, f: { sets: "1", at: "0" } } });
    expect(m.detail.e.sets).toBe("4"); expect(m.detail.f.sets).toBe("1");
    expect(mergeRec(undefined, a)).toBe(a); expect(mergeRec(a, undefined)).toBe(a);
  });
});

describe("reference search", () => {
  const raw = "# Grip basics\nThe crushing grip is trained with grippers and thick bars. " + "word ".repeat(40) + "\n# Pinch grip\nPinch plates between thumb and fingers for pinch strength. " + "word ".repeat(40) + "\n# Recovery\nSleep and protein help tendons recover after heavy forearm work. " + "word ".repeat(40);
  it("splits at headings and finds the right section", () => {
    const parts = chunkDoc(raw);
    expect(parts.map(p => p.heading)).toEqual(["Grip basics", "Pinch grip", "Recovery"]);
    const chunks = parts.map((p, i) => ({ id: "d-" + (i + 1), docId: "d", n: i + 1, heading: p.heading, text: p.text, kw: [] }));
    addKeywords(chunks);
    const idx = makeIndex([{ id: "d", title: "Grip", tags: ["grip"] }], chunks);
    expect(searchIndex(idx, "pinch plates", null)[0].c.heading).toBe("Pinch grip");
    expect(searchIndex(idx, "how do tendons recover", null)[0].c.heading).toBe("Recovery");
    expect(searchIndex(idx, "pinch", "other")).toEqual([]);
    expect(searchIndex(idx, "the of", null)).toEqual([]);
  });
});

describe("half marathon dates", () => {
  it("counts the race week and picks phases", () => {
    expect(raceWeek({ start: "2026-10-05", race: "2027-06-27" })).toBe(38);
    expect(raceWeek({ start: "2027-01-01", race: "2026-01-01" })).toBe(0);
    expect(hmPhase(5, 38)).toBe("base"); expect(hmPhase(25, 38)).toBe("build");
    expect(hmPhase(36, 38)).toBe("taper"); expect(hmPhase(38, 38)).toBe("race"); expect(hmPhase(18, 60)).toBe("bridge");
    expect(hmSessions(38, 38, { days: ["Sat", "Sun"] }).map(s => s.l)).toEqual(["Shake-out run", "Race day"]);
    expect(hmSessions(3, 38, { days: ["Sat", "Sun"] }).length).toBe(2);
  });
});

describe("coach status", () => {
  it("waits for 7 days of logs", () => {
    expect(coachStatus({}, null).ready).toBe(false);
    const young = { a: { date: iso(3).slice(0, 10) } };
    expect(coachStatus(young, null)).toMatchObject({ ready: false, due: false });
    const old = { a: { date: iso(9).slice(0, 10) }, b: { date: iso(1).slice(0, 10) } };
    expect(coachStatus(old, null)).toMatchObject({ ready: true, due: true });
    expect(coachStatus(old, { at: iso(2) })).toMatchObject({ ready: true, due: false });
  });
});

describe("plan and migrations", () => {
  it("builds the tailored plan on a fresh device and is stable on the second start", () => {
    localStorage.clear(); initApp();
    const first = app.get();
    expect(first.library.length).toBeGreaterThan(30);
    expect(planCells(first.custom, "Chest expander")).toContain("bp-1");
    expect(planCells(first.custom, "Face pull")).not.toContain("bp-1");            // replaced by the chest expander
    expect(planCells(first.custom, "Good morning")).toContain("sq-1");
    expect(planCells(first.custom, "Behind-the-neck lat pulldown")).toEqual(["dl-1", "dl-2"]);
    expect(first.eq.map(e => e.name)).toContain("Landmine attachment");
    const snap = JSON.stringify([first.library, first.custom, first.eq]);
    initApp();
    expect(JSON.stringify([app.get().library, app.get().custom, app.get().eq])).toBe(snap);
  });
  it("does not bring back an exercise the user deleted", () => {
    localStorage.clear(); initApp();
    const lib = app.get().library.filter(x => x.name !== "Zercher squat");
    localStorage.setItem("plb-exercises", JSON.stringify(lib));
    initApp();
    expect(app.get().library.some(x => x.name === "Zercher squat")).toBe(false);
  });
  it("knows which exercises are in the plan", () => {
    localStorage.clear(); initApp();
    const a = app.get();
    expect(inAnyPlan("Leg press", a.custom, a)).toBe(true);
    expect(inAnyPlan("Cossack squat", a.custom, a)).toBe(true);        // mobility
    expect(inAnyPlan("Farmer's walk", a.custom, a)).toBe(false);
  });
  it("computes lift volume and run sessions", () => {
    expect(mainWork(16).length).toBe(6);
    expect(tonnage(1, 160)).toBe(4 * 10 * 95);
    expect(runDesc(runFor(1, "Sat", { days: ["Sat", "Sun"] }))).toBe("8 × (1 min jog + 2 min walk)");
    expect(runDesc(runFor(4, "Sun", { days: ["Sat", "Sun"] }))).toBe("5 × (3 min jog + 2 min walk)");   // Sat repeats the week before
    expect(runDesc(runFor(4, "Sat", { days: ["Sat", "Sun"] }))).toBe("6 × (2 min jog + 2 min walk)");
  });
  it("gives every tickable row a unique key", () => {
    localStorage.clear(); initApp();
    const a = app.get();
    for (let week = 1; week <= 16; week++) for (const day of ["sq", "bp", "dl", "oh", "off:Wed", "off:Sat", "off:Sun"]) {
      const m = sessionModel({ week, day, rm: a.rm, custom: a.custom, slots: a.slots, tib: a.tib, run: a.run, swim: a.swim, mob: a.mob, str: a.str }, false);
      expect(new Set(m.items).size, week + " " + day).toBe(m.items.length);
    }
  });
  it("scores nutrition load per day", () => {
    localStorage.clear(); initApp();
    const a = app.get(), c = { slots: SLOT_DEF, run: a.run, tib: a.tib, mob: a.mob, str: a.str, swim: a.swim };
    expect(nutDay(1, "Mon", c).level).toBe("High");        // squat + HIIT
    expect(nutDay(1, "Thu", c).level).toBe("Moderate");    // deadlift + sandbag + neck
    expect(nutDay(1, "Wed", c).level).toBe("Light");
  });
});
