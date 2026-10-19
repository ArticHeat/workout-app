import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, fireEvent, within, act } from "@testing-library/react";
import { boot, fakeScript, flush } from "./helpers.js";
import { saveCfg } from "../lib/backend.js";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
const click = name => fireEvent.click(screen.getByRole("button", { name }));
const logOf = () => JSON.parse(localStorage.getItem("plb-log") || "{}");

describe("weekly dashboard", () => {
  it("shows working weights from the 1RM and the right week", async () => {
    await boot("overview");
    fireEvent.change(document.getElementById("sq"), { target: { value: "160" } });
    click("Weekly Dashboard");
    expect(screen.getAllByText(/4 × 10 @ 95 kg/).length).toBeGreaterThan(0);   // 160 x 60%, rounded to 2.5
    click(/^Week 6,/);
    expect(screen.getAllByText(/5 × 6 @ 120 kg/).length).toBeGreaterThan(0);   // 75%
    expect(localStorage.getItem("plb-sq")).toBe("160");
  });

  it("ticks an exercise, keeps it after a reload, and unticks it", async () => {
    await boot("weekly");
    const box = () => screen.getByRole("checkbox", { name: "Mark done: Leg press" });
    expect(box().checked).toBe(false);
    fireEvent.click(box());
    expect(box().checked).toBe(true);
    let rec = logOf()["w01-Mon"];
    expect(Object.keys(rec.done)).toContain("Powerlifting|Leg press");
    expect(rec.items).toContain("Powerlifting|Main lift");
    expect(rec.total).toBe(rec.items.length);
    expect(screen.getByText(new RegExp("^1 of " + rec.total + " done"))).toBeTruthy();
    // a new session of the app reads the same ticks
    document.body.innerHTML = "";
    await boot("weekly");
    expect(screen.getByRole("checkbox", { name: "Mark done: Leg press" }).checked).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: "Mark done: Leg press" }));
    rec = logOf()["w01-Mon"];
    expect(rec.done["Powerlifting|Leg press"]).toBeUndefined();
    expect(rec.undone["Powerlifting|Leg press"]).toBeTruthy();
  });

  it("logs sets, reps and weight for an exercise", async () => {
    await boot("weekly");
    const row = screen.getByRole("checkbox", { name: "Mark done: Leg press" }).closest("tr");
    fireEvent.click(within(row).getByRole("button", { name: /Log/ }));
    const panel = document.querySelector(".logpanel");
    const f = k => panel.querySelector('[data-f="' + k + '"]');
    expect(f("sets").value).toBe("3");                       // pre-filled from "3 × 10–12"
    fireEvent.change(f("sets"), { target: { value: "4" } });
    fireEvent.change(f("reps"), { target: { value: "12" } });
    fireEvent.change(f("weight"), { target: { value: "140" } });
    fireEvent.blur(f("weight"));
    const d = logOf()["w01-Mon"].detail["Powerlifting|Leg press"];
    expect(d).toMatchObject({ sets: "4", reps: "12", weight: "140" });
    expect(d.at).toBeTruthy();
    expect(panel.textContent).toContain("Saved");
  });

  it("works out spring force for the chest expander", async () => {
    await boot("weekly");
    click(/Tue/);
    const row = screen.getByRole("checkbox", { name: "Mark done: Chest expander" }).closest("tr");
    fireEvent.click(within(row).getByRole("button", { name: /Log/ }));
    const panel = document.querySelector(".logpanel");
    fireEvent.change(panel.querySelector('[data-f="springsA"]'), { target: { value: "4" } });
    fireEvent.change(panel.querySelector('[data-f="springsB"]'), { target: { value: "3" } });
    fireEvent.blur(panel.querySelector('[data-f="springsB"]'));
    expect(logOf()["w01-Tue"].detail["Powerlifting|Chest expander"]).toMatchObject({ springs: "4/3", force: "40/30" });
    expect(panel.textContent).toContain("Force 40/30 kg");
  });

  it("edits accessories and saves them as the plan for that phase", async () => {
    await boot("weekly");
    click("Edit accessories");
    click("Add exercise");
    const inputs = screen.getAllByDisplayValue("New exercise");
    fireEvent.change(inputs[0], { target: { value: "Hack squat" } });
    click("Done");
    expect(screen.getByText("Hack squat")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("plb-acc"))["sq-1"].map(a => a[0])).toContain("Hack squat");
    // week 3 is the same phase, so it is there too
    click(/^Week 3,/);
    expect(screen.getByText("Hack squat")).toBeTruthy();
    click(/^Week 6,/);
    expect(screen.queryByText("Hack squat")).toBeNull();
  });

  it("rest timer starts, pauses and closes", async () => {
    await boot("weekly");
    fireEvent.click(screen.getByRole("button", { name: "Rest timer for Main lift" }));
    const bar = document.getElementById("rtbar");
    expect(bar).toBeTruthy();
    expect(document.getElementById("rtdigits").textContent).toMatch(/^[23]:\d\d$/);   // 3 minutes for a main lift
    fireEvent.click(document.getElementById("rtpause"));
    expect(document.getElementById("rtpause").textContent).toBe("▶");
    expect(JSON.parse(localStorage.getItem("plb-rt")).paused).toBe(true);
    fireEvent.click(document.getElementById("rtclose"));
    expect(document.getElementById("rtbar")).toBeNull();
    expect(localStorage.getItem("plb-rt")).toBeNull();
  });

  it("shows non-training days and edits their settings", async () => {
    await boot("weekly");
    click(/Wed/);
    expect(screen.getByRole("heading", { level: 2, name: /Tibialis \+ Mobility \+ Swim day/ })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Mark done: Cossack squat" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Mark done: Session" })).toBeTruthy();          // swim
    fireEvent.click(screen.getByRole("checkbox", { name: "Mark done: Session" }));
    expect(Object.keys(logOf()["w01-Wed"].done)).toEqual(["Swimming|Session"]);
    click("Edit swim");
    fireEvent.change(screen.getByLabelText("Minutes"), { target: { value: "45" } });
    click("Save");
    expect(JSON.parse(localStorage.getItem("plb-swim")).mins).toBe(45);
  });

  it("writes ticks to the Google Sheet and rebuilds them on a fresh device", async () => {
    const fake = fakeScript();
    vi.stubGlobal("fetch", fake.handler);
    saveCfg({ url: "https://script.google.com/macros/s/x/exec", token: "pw" });
    await boot("weekly");
    fireEvent.click(screen.getByRole("checkbox", { name: "Mark done: Leg press" }));
    await flush(1700);                                           // debounce, then flush
    const row = fake.state.log.find(r => r[0] === "w01-Mon|Powerlifting|Leg press");
    expect(row).toBeTruthy();
    expect(row[7]).toBe(true);
    expect(row[2]).toBe(1);
    // wipe this browser (keep only the connection), open the app again
    const keep = localStorage.getItem("plbapp-cfg");
    localStorage.clear(); localStorage.setItem("plbapp-cfg", keep);
    document.body.innerHTML = "";
    await boot("weekly");
    await flush(100);
    expect(screen.getByRole("checkbox", { name: "Mark done: Leg press" }).checked).toBe(true);
  });
});
