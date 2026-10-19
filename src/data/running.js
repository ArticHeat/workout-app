/* Run-walk weeks and half-marathon plan data. */
export const RUN_WEEKS = [
  { reps: 8, run: 1, walk: 2 }, { reps: 7, run: 1.5, walk: 2 }, { reps: 6, run: 2, walk: 2 }, { reps: 5, run: 3, walk: 2 },
  { reps: 4, run: 4, walk: 2 }, { reps: 3, run: 6, walk: 2 }, { reps: 3, run: 7, walk: 2 }, { reps: 2, run: 10, walk: 2 },
  { reps: 2, run: 12, walk: 2 }, { seq: "15 min jog, 2 min walk, 10 min jog", mins: 27 },
  { cont: 20 }, { cont: 20 }, { cont: 20 }, { cont: 20 }, { cont: 15 }, { cont: 10 }
];
export const HM_LONG = [45, 50, 55, 45, 60, 65, 70, 55, 75, 80, 90, 70, 95, 100, 90];
export const HM_PH = {
  base: { name: "Base · lifting block", c: "var(--a-lift)", guide: "The powerlifting block is the priority. Two easy run-walk sessions a week, swimming on Wednesday evening, and HIIT after the Monday and Tuesday lifts, as in the Weekly Dashboard." },
  bridge: { name: "Run bridge", c: "var(--hyp)", guide: "Running steps up to three easy sessions a week, including a Sunday long run. Suggested: keep 3 to 4 lifting sessions, HIIT once a week (Tuesday), and keep the swim easy." },
  build: { name: "Half-marathon build", c: "var(--str)", guide: "Running is now the priority. Suggested lifting: squat on Monday and bench on Tuesday at maintenance (keep the weights, cut sets by about a third to a half), a lighter deadlift on Thursday, and overhead press cut to a short session or folded into Tuesday. HIIT once a week at most (Tuesday). Grip work at maintenance only, with one sandbag carry on Saturday, and the swim easy. Every fourth week is a lighter cutback week." },
  peak: { name: "Peak long runs", c: "var(--peak)", guide: "The longest runs of the plan. No HIIT, so your energy goes to the long runs. Keep the same maintenance lifting but lighter, skip anything that leaves your legs sore before the long run, and practise your race-day fuel and drinks." },
  taper: { name: "Taper", c: "var(--taper)", guide: "Run volume drops by roughly 30 to 50%. No HIIT. Keep a few short bursts of speed so the legs stay lively. Lift light and skip heavy leg days." },
  race: { name: "Race week", c: "var(--a-hiit)", guide: "Easy everything. Sleep, eat well, and keep any lifting to a short, light session early in the week." }
};
