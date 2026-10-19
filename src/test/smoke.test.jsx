import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent, within } from "@testing-library/react";
import { boot } from "./helpers.js";

const TABS = [["Training Overview", /Training overview/], ["Weekly Dashboard", /Weekly dashboard/], ["Exercise Library", /Exercise library/], ["Equipment", /^Equipment$/], ["Nutrition", /^Nutrition$/], ["Half Marathon", /Half marathon plan/], ["Reference Library", /Reference library/]];

describe("app shell", () => {
  it("renders every tab without errors", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await boot();
    for (const [nav, heading] of TABS) {
      fireEvent.click(screen.getByRole("button", { name: nav }));
      expect(screen.getByRole("heading", { level: 1, name: heading })).toBeTruthy();
    }
    expect(err.mock.calls.map(c => String(c[0]).slice(0, 160))).toEqual([]);
    err.mockRestore();
  });

  it("remembers the last tab, week and day", async () => {
    await boot();
    fireEvent.click(screen.getByRole("button", { name: "Weekly Dashboard" }));
    fireEvent.click(screen.getByRole("button", { name: /^Week 9,/ }));
    fireEvent.click(screen.getByRole("button", { name: /Thu/ }));
    expect(JSON.parse(localStorage.getItem("plb-view"))).toEqual({ tab: "weekly", week: 9, day: "dl" });
  });
});
