/* A fresh start of the old single-file app (captured in fixtures/old-fresh.json) must produce the same saved
   plan, library, equipment and flags as a fresh start of this app. */
import { describe, it, expect } from "vitest";
import old from "./fixtures/old-fresh.json";
import { initApp } from "../state/app.js";

const strip = list => list.map(({ id, created, ...rest }) => rest).sort((a, b) => a.name.localeCompare(b.name));
describe("compatibility with the single-file app", () => {
  it("starts from the same library, plan, equipment and flags", () => {
    localStorage.clear(); initApp();
    const mine = k => JSON.parse(localStorage.getItem(k));
    const theirs = k => JSON.parse(old[k]);
    expect(mine("plb-acc")).toEqual(theirs("plb-acc"));
    expect(strip(mine("plb-exercises"))).toEqual(strip(theirs("plb-exercises")));
    expect(strip(mine("plb-equip"))).toEqual(strip(theirs("plb-equip")));
    expect(mine("plb-seeded")).toEqual(theirs("plb-seeded"));
    expect(mine("plb-slots")).toEqual(theirs("plb-slots"));
    ["plb-equip-seeded", "plb-equip-fix-1", "plb-equip-fix-2", "plb-equip-fix-3", "plb-slots-fix-1"].forEach(k => expect(localStorage.getItem(k)).toBe(old[k]));
  });
  it("loads data saved by the old app without changing it", () => {
    localStorage.clear();
    Object.keys(old).forEach(k => localStorage.setItem(k, old[k]));
    localStorage.setItem("plb-sq", "160");
    const before = { acc: localStorage.getItem("plb-acc"), lib: localStorage.getItem("plb-exercises"), eq: localStorage.getItem("plb-equip") };
    initApp();
    expect(localStorage.getItem("plb-acc")).toBe(before.acc);
    expect(localStorage.getItem("plb-exercises")).toBe(before.lib);
    expect(localStorage.getItem("plb-equip")).toBe(before.eq);
  });
});
