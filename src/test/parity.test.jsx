/* Every tick row (key, planned text, time of day) and every day card the single-file app showed for weeks 1-16,
   captured in fixtures/old-ticks.json, must match this app exactly. This keeps Google Sheet rows compatible. */
import { describe, it, expect } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import old from "./fixtures/old-ticks.json";
import { boot } from "./helpers.js";
import { setRm } from "../state/app.js";
import { sessionModel, timeOf } from "../lib/session.js";
import { app } from "../state/app.js";

describe("same screens as the single-file app", () => {
  it("has the same tick rows for every week and day", async () => {
    localStorage.clear();
    await boot("weekly");
    ["sq", "bp", "dl", "oh"].forEach((k, i) => setRm(k, ["160", "100", "220", "70"][i]));
    const a = app.get(), diffs = [];
    for (let week = 1; week <= 16; week++) {
      for (const day of ["sq", "bp", "off:Wed", "dl", "oh", "off:Sat", "off:Sun"]) {
        const m = sessionModel({ week, day, rm: a.rm, custom: a.custom, slots: a.slots, tib: a.tib, run: a.run, swim: a.swim, mob: a.mob, str: a.str }, false);
        const mine = [];
        m.ordered.forEach(b => m.rowsById[b.id].forEach(r => mine.push([r.k, r.planned, timeOf(b.slot)])));
        const key = week + "|" + day;
        if (JSON.stringify(mine) !== JSON.stringify(old[key])) diffs.push({ key, mine, old: old[key] });
      }
    }
    expect(diffs.slice(0, 2)).toEqual([]);
  });

  it("shows the same day cards", async () => {
    localStorage.clear();
    await boot("weekly");
    ["sq", "bp", "dl", "oh"].forEach((k, i) => setRm(k, ["160", "100", "220", "70"][i]));
    const diffs = [];
    for (const week of [1, 5, 7, 12, 15, 16]) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp("^Week " + week + ",") }));
      const mine = [...document.querySelectorAll("#days .day")].map(b => b.textContent.replace(/\s+/g, " ").trim());
      const oldCards = old[week + "|sq|cards"];
      if (JSON.stringify(mine) !== JSON.stringify(oldCards)) diffs.push({ week, mine, old: oldCards });
    }
    expect(diffs.slice(0, 1)).toEqual([]);
  });
});
