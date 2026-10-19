import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, fireEvent, within, act } from "@testing-library/react";
import { boot, fakeScript, flush } from "./helpers.js";
import { saveCfg } from "../lib/backend.js";
import { bootRestore } from "../lib/sync.js";
import { refStore } from "../state/ref.js";

vi.mock("../lib/util.js", async orig => ({ ...(await orig()), reloadPage: vi.fn() }));

afterEach(() => { vi.unstubAllGlobals(); });
const click = name => fireEvent.click(screen.getByRole("button", { name }));
const store = k => JSON.parse(localStorage.getItem(k));

describe("exercise library", () => {
  it("adds an exercise, puts it in the plan, renames it and deletes it", async () => {
    await boot("library");
    click("New exercise");
    fireEvent.click(screen.getByRole("button", { name: "Save exercise" }));
    expect(screen.getByText(/Give the exercise a name/)).toBeTruthy();
    fireEvent.change(document.getElementById("dname"), { target: { value: "Spoto press" } });
    fireEvent.change(document.getElementById("dsets"), { target: { value: "3 × 6" } });
    fireEvent.click(document.querySelector('[data-lift="bp"]'));
    click("Save exercise");
    const card = () => screen.getByRole("heading", { level: 3, name: "Spoto press" }).closest("article");
    expect(card().textContent).toContain("Not in plan");
    // add to bench day in every phase (suggested from the tags)
    fireEvent.click(within(card()).getByRole("button", { name: "Add to plan" }));
    expect(card().querySelector('[data-cell="bp-1"]').checked).toBe(true);
    fireEvent.click(within(card()).getByRole("button", { name: "Apply to plan" }));
    expect(screen.getByText(/Spoto press: 4 added to and 0 removed/)).toBeTruthy();
    expect(store("plb-acc")["bp-2"].map(a => a[0])).toContain("Spoto press");
    expect(card().textContent).toContain("In plan");
    // rename follows into the plan
    fireEvent.click(within(card()).getByRole("button", { name: "Edit" }));
    fireEvent.change(document.getElementById("dname"), { target: { value: "Spoto bench" } });
    click("Save exercise");
    expect(store("plb-acc")["bp-1"].map(a => a[0])).toContain("Spoto bench");
    expect(store("plb-acc")["bp-1"].map(a => a[0])).not.toContain("Spoto press");
    // delete needs a second click
    const c2 = screen.getByRole("heading", { level: 3, name: "Spoto bench" }).closest("article");
    fireEvent.click(within(c2).getByRole("button", { name: "Delete" }));
    expect(store("plb-exercises").some(x => x.name === "Spoto bench")).toBe(true);
    fireEvent.click(within(c2).getByRole("button", { name: "Confirm delete" }));
    expect(store("plb-exercises").some(x => x.name === "Spoto bench")).toBe(false);
  });

  it("filters by lift, plan status and search, and jumps to equipment and back", async () => {
    await boot("library");
    click("Deadlift");
    expect(screen.queryByRole("heading", { level: 3, name: "Chest expander" })).toBeNull();
    expect(screen.getByRole("heading", { level: 3, name: "Behind-the-neck lat pulldown" })).toBeTruthy();
    click("All");
    fireEvent.change(document.getElementById("lsearch"), { target: { value: "crusher" } });
    const card = screen.getByRole("heading", { level: 3, name: "Chest crusher" }).closest("article");
    fireEvent.click(within(card).getByRole("button", { name: "Chest crusher" }));     // equipment chip
    expect(screen.getByRole("heading", { level: 1, name: "Equipment" })).toBeTruthy();
    expect(document.getElementById("eqsearch").value).toBe("Chest crusher");
    const ecard = screen.getByRole("heading", { level: 3, name: "Chest crusher" }).closest("article");
    expect(within(ecard).getByText(/Spring progression/)).toBeTruthy();
    fireEvent.click(within(ecard).getByRole("button", { name: /Wrist extension/ }));  // linked exercise
    expect(document.getElementById("lsearch").value).toMatch(/Wrist extension/);
  });
});

describe("equipment", () => {
  it("adds, edits and removes equipment with links to exercises", async () => {
    await boot("eq");
    click("Add equipment");
    fireEvent.change(document.getElementById("eqname"), { target: { value: "Sandbag" } });
    fireEvent.change(document.getElementById("eqexfilter"), { target: { value: "sandbag" } });
    fireEvent.click(document.querySelector('[data-eqlink="Sandbag lean"]'));
    expect(document.querySelector('[data-eqlink="Face pull"]')).toBeNull();           // filtered out
    click("Save equipment");
    const eq = store("plb-equip").find(e => e.name === "Sandbag");
    expect(eq.links).toEqual(["Sandbag lean"]);
    const card = screen.getByRole("heading", { level: 3, name: "Sandbag" }).closest("article");
    fireEvent.click(within(card).getByRole("button", { name: "Delete" }));
    fireEvent.click(within(card).getByRole("button", { name: "Confirm delete" }));
    expect(store("plb-equip").some(e => e.name === "Sandbag")).toBe(false);
  });
});

describe("reference library", () => {
  it("adds a document, searches it, follows a [[link]] and deletes it", async () => {
    await boot("ref");
    click("Add document");
    fireEvent.change(document.getElementById("adtitle"), { target: { value: "Grip notes" } });
    fireEvent.change(document.getElementById("adtags"), { target: { value: "grip, forearms" } });
    const text = "# Crush grip\nUse a gripper and close it to failure. See [[Pinch grip]] for the other side. " + "filler ".repeat(40) + "\n# Pinch grip\nPinch a plate between thumb and fingers and hold. " + "filler ".repeat(40);
    fireEvent.change(document.getElementById("adtext"), { target: { value: text } });
    expect(document.getElementById("adcount").textContent).toContain("2 sections");
    await act(async () => { fireEvent.click(document.getElementById("adsave")); await flush(30); });
    expect(screen.getByRole("heading", { level: 2, name: "Grip notes" })).toBeTruthy();
    expect(refStore.get().docs.length).toBe(1);
    // search
    fireEvent.change(document.getElementById("refq"), { target: { value: "pinch plate" } });
    await flush(300);
    expect(screen.getByRole("heading", { level: 3, name: "Pinch grip" })).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Open section" })[0]);
    expect(document.querySelector("details.sec[open] summary").textContent).toBe("Pinch grip");
    expect(document.querySelector("details.sec[open]").textContent).toContain("Linked from: Crush grip");
    // delete
    click("Delete"); await act(async () => { click("Confirm delete"); await flush(30); });
    expect(refStore.get().docs.length).toBe(0);
  });
});

describe("overview, coach and connection", () => {
  it("saves and tests the sheet connection", async () => {
    const fake = fakeScript();
    vi.stubGlobal("fetch", fake.handler);
    await boot("overview");
    fireEvent.change(document.getElementById("acurl"), { target: { value: "https://script.google.com/macros/s/x/exec" } });
    fireEvent.change(document.getElementById("actoken"), { target: { value: "wrong" } });
    await act(async () => { fireEvent.click(document.getElementById("acsave")); await flush(30); });
    expect(document.getElementById("acstat").textContent).toMatch(/password is wrong/);
    fireEvent.change(document.getElementById("actoken"), { target: { value: "pw" } });
    await act(async () => { fireEvent.click(document.getElementById("acsave")); await flush(30); });
    expect(document.getElementById("acstat").textContent).toMatch(/Connected/);
    expect(JSON.parse(localStorage.getItem("plbapp-cfg")).url).toContain("script.google.com");
  });

  it("coach copies a prompt when there is no AI key, and replies and applies a change with one", async () => {
    await boot("overview");
    const copy = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: copy } });
    // 10 days of logs
    const old = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10);
    localStorage.setItem("plb-log", JSON.stringify({ "w01-Mon": { week: 1, day: "Mon", phase: "Hypertrophy", date: old, done: { "Powerlifting|Leg press": { at: "x" } }, undone: {}, items: ["Powerlifting|Leg press", "Powerlifting|Leg curl"], total: 2 } }));
    document.body.innerHTML = ""; await boot("overview");
    expect(document.getElementById("coachstat").textContent).toMatch(/Weekly review is due/);
    await act(async () => { fireEvent.click(document.getElementById("coachreview")); await flush(30); });
    expect(copy).toHaveBeenCalled();
    expect(copy.mock.calls[0][0]).toContain("Leg curl");                       // not-done list is in the data
    expect(document.getElementById("coachlog").textContent).toContain("copied your coach prompt");

    // with a key: the model answers with a suggestion
    saveCfg({ url: "", token: "", gemini: "key", model: "" });
    vi.stubGlobal("fetch", async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: "You skipped leg curls.", suggestions: [{ title: "Drop leg curls", why: "Skipped 3 times", type: "remove", lift: "sq", phase: 1, exercise: "Leg curl" }] }) }] } }] }) }));
    await act(async () => { fireEvent.click(document.getElementById("coachreview")); await flush(50); });
    expect(document.getElementById("coachlog").textContent).toContain("You skipped leg curls.");
    expect(store("plb-review").suggestions.length).toBe(1);
    expect(store("plb-acc")["sq-1"].map(a => a[0])).toContain("Leg curl");
    click("Apply to my plan");
    expect(store("plb-acc")["sq-1"].map(a => a[0])).not.toContain("Leg curl");
    expect(screen.getByText("Applied")).toBeTruthy();
  });
});

describe("nutrition and half marathon", () => {
  it("turns body weight into grams and shows the week", async () => {
    await boot("nut");
    fireEvent.change(document.getElementById("nwt"), { target: { value: "80" } });
    expect(document.getElementById("ntargets").textContent).toContain("144 g/day");     // 1.8 g/kg x 80
    fireEvent.change(document.getElementById("ngoal"), { target: { value: "lose" } });
    expect(document.getElementById("ntargets").textContent).toContain("160 g/day");     // 2.0 g/kg
    fireEvent.change(document.getElementById("nweeksel"), { target: { value: "6" } });
    expect(document.getElementById("nweek").textContent).toContain("Squat");
    expect(store("plb-nutri")).toMatchObject({ weight: "80", goal: "lose" });
    expect(document.getElementById("nask").disabled).toBe(true);                         // no AI key
  });
  it("shows the race plan and opens a week in the dashboard", async () => {
    await boot("hm");
    expect(document.getElementById("hmsummary").textContent).toMatch(/week 38 of the plan/);
    fireEvent.click(document.querySelector('[data-hmw="3"]'));
    expect(document.getElementById("hmdetail").textContent).toContain("Base · lifting block");
    click("Open this week in the Weekly Dashboard");
    expect(screen.getByRole("heading", { level: 1, name: "Weekly dashboard" })).toBeTruthy();
    expect(store("plb-view").week).toBe(3);
    document.body.innerHTML = "";
    await boot("hm");
    fireEvent.change(document.getElementById("hmrace"), { target: { value: "2026-12-01" } });
    expect(document.getElementById("hmsummary").textContent).toMatch(/Only/);
  });
});

describe("settings restore", () => {
  it("restores saved settings from the sheet before the page builds", async () => {
    const fake = fakeScript();
    fake.state.kv["data/users/me/settings"] = { at: Date.now() + 1000, kv: { "plb-sq": "150", "plb-hm": JSON.stringify({ race: "2027-09-01", start: "2026-10-05" }), "plb-log": "should not copy" } };
    vi.stubGlobal("fetch", fake.handler);
    saveCfg({ url: "https://script.google.com/macros/s/x/exec", token: "pw" });
    await bootRestore();
    expect(localStorage.getItem("plb-sq")).toBe("150");
    expect(localStorage.getItem("plb-log")).toBeNull();
    await boot("weekly");
    expect(screen.getAllByText(/150 kg/).length).toBeGreaterThan(0);
  });
  it("pushes settings to the sheet when you change them", async () => {
    const fake = fakeScript();
    vi.stubGlobal("fetch", fake.handler);
    saveCfg({ url: "https://script.google.com/macros/s/x/exec", token: "pw" });
    await bootRestore();
    await boot("overview");
    fireEvent.change(document.getElementById("bp"), { target: { value: "112.5" } });
    await flush(1000);
    const doc = fake.state.kv["data/users/me/settings"];
    expect(doc.kv["plb-bp"]).toBe("112.5");
  });
});
