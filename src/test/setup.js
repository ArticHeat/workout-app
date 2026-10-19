import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { closeTimer } from "../state/timer.js";

window.scrollTo = () => {};
Element.prototype.scrollIntoView = () => {};
beforeEach(() => { localStorage.clear(); });
afterEach(() => { cleanup(); closeTimer(); });

/* Store updates that land after an awaited network call run outside React's act(); that is expected here, so keep the log readable */
const origError = console.error;
console.error = (...a) => { if (typeof a[0] === "string" && a[0].includes("not wrapped in act")) return; origError(...a); };
