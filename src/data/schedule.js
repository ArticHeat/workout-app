/* Non-lifting activities: defaults, slot times, activity identities, sandbag and neck plans. */
export const HIIT_DAYS = ["Mon", "Tue"];
export const OFF_DAYS = ["Wed", "Sat", "Sun"];
export const TIB_NAME = "Tibialis raise (tib tool)";
export const TIB_DEF = { day: "Wed", sets: 3, reps: 10, angles: ["Toes up (dorsiflexion)", "Foot turned in (inversion)", "Foot turned out (eversion)"] };
export const SWIM_DEF = { day: "Wed", mins: 30, notes: "" };
export const MOB_DEF = { day: "Wed", items: [
  { ex: "Cossack squat", rx: "3 × 9", note: "Alternate sides, sit deep into one hip." },
  { ex: "Couch stretch", rx: "3 × 30 s", note: "Each side. Rear foot up on a bench or couch." },
  { ex: "Pigeon pose", rx: "3 × 30 s", note: "Each side." },
  { ex: "Hip CARs", rx: "3 × 9", note: "Slow, controlled hip circles, each side." },
  { ex: "Side bend stretch", rx: "3 × 30 s", note: "Each side." }
] };
export const STR_DEF = { day: "Sun", items: [
  { ex: "Half-kneeling side bend", rx: "3 × 30 s", note: "Each side." },
  { ex: "Couch stretch", rx: "3 × 30 s", note: "Each side. Rear foot up on a bench or couch." },
  { ex: "Pigeon pose", rx: "3 × 30 s", note: "Each side." }
] };
export const RUN_DEF = { days: ["Sat", "Sun"] };

export const OFF_LABEL = { run: "Run", tib: "Tibialis", mob: "Mobility", str: "Stretching", swim: "Swim", fa: "Forearm", carry: "Sandbag carry" };
export const OFF_KIND = { run: "run", tib: "tib", mob: "mobility", str: "stretch", swim: "swim", fa: "forearm", carry: "sandbag" };

/* Morning / evening split. */
export const SLOT_DEF = { lift: "AM", hiit: "AM", forearm: "PM", run: "AM", tib: "AM", swim: "PM", sandbag: "PM", neck: "AM", mob: "AM", str: "PM" };
export const SLOT_NAME = { AM: "Morning", PM: "Evening" };
export const SLOT_ROWS = [["lift", "Lifting"], ["hiit", "HIIT"], ["forearm", "Forearm"], ["run", "Running"], ["tib", "Tibialis"], ["swim", "Swimming"], ["sandbag", "Sandbag"], ["neck", "Neck"], ["mob", "Mobility"], ["str", "Stretching"]];

/* Every activity type has one colour identity. */
export const ACT = {
  lift: { name: "Powerlifting", c: "var(--a-lift)" },
  hiit: { name: "HIIT", c: "var(--a-hiit)" },
  run: { name: "Running", c: "var(--a-run)" },
  tib: { name: "Tibialis", c: "var(--a-tib)" },
  forearm: { name: "Forearm", c: "var(--a-fa)" },
  swim: { name: "Swimming", c: "var(--a-swim)" },
  sandbag: { name: "Sandbag", c: "var(--a-sand)" },
  neck: { name: "Neck", c: "var(--a-neck)" },
  mobility: { name: "Mobility", c: "var(--a-mob)" },
  stretch: { name: "Stretching", c: "var(--a-str)" }
};

/* Sandbag Foundation work. `sets` and `note` depend on the week, so they are functions of it. */
export const SAND = {
  dl: [
    { ex: "Sandbag lean", sets: w => (w === 15 ? "2" : "3") + " × 3 five-second reps", rest: "60–90 s (band curls while you rest)", note: "Three five-second reps per set, controlled." },
    { ex: "Sandbag row", sets: w => (w === 15 ? "5" : "10") + " sets", rest: "45–60 s", note: "Start with 10 sets of 1 rep, then build to 10 sets of 2, then 3. Keep going as far as you can." }
  ],
  carry: [
    { ex: "Sandbag bear hug carry", sets: w => "Max distance in " + (w === 15 ? 5 : 10) + " min", rest: "Set the bag down when you need to", note: "Grip- and trunk-heavy. It sits on Saturday, 48 hours after Thursday's deadlifts and the day before your long run, so keep the bag on the lighter side." }
  ]
};
export const NECK_DAYS = ["dl", "oh"];
export const neckSets = w => (w === 16 ? 1 : w === 15 ? 2 : 3);

export const SN_PLAN = [["Sandbag lean", "Thu"], ["Sandbag row", "Thu"], ["Sandbag bear hug carry", "Sat"], ["Neck curl", "Thu, Fri"], ["Neck extension", "Thu, Fri"]];
export const SPRING_KG = { "chest expander": 10, "chest crusher": 30 };

/* Nutrition constants */
export const N_GOAL = { build: "Build muscle", maintain: "Maintain or recomposition", lose: "Lose fat gradually", perf: "Half-marathon performance" };
export const N_PROT = { build: 1.8, maintain: 1.6, lose: 2.0, perf: 1.6 };
export const N_CARB = { build: { Light: 3.5, Moderate: 5, High: 6.5 }, maintain: { Light: 3, Moderate: 4.5, High: 6 }, lose: { Light: 2.5, Moderate: 3.5, High: 5 }, perf: { Light: 4, Moderate: 5.5, High: 7 } };
export const N_WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const N_LIFT = { Mon: "sq", Tue: "bp", Thu: "dl", Fri: "oh" };
export const N_LIFTNAME = { sq: "Squat", bp: "Bench press", dl: "Deadlift", oh: "Overhead press" };
export const PHASE_SHORT = { 1: "Hyp", 2: "Str", 3: "Peak", 4: "Taper" };
