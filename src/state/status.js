import { createStore, useStore } from "./createStore.js";
export const status = createStore({ tick: "", sheet: "" });
export const useStatus = sel => useStore(status, sel);
export const sheetSay = m => status.set({ sheet: m });
export const tickSay = m => status.set({ tick: m });
