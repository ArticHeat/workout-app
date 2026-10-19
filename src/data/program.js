/* Program data: phases, weekly ramp, lifts, default accessories. Moved unchanged from the single-file app. */
export const PHASES = [
  { id: 1, name: "Hypertrophy", tag: "Accumulation", weeks: [1,5], goal: "Build muscle mass and work capacity",
    intensity: "60–72% of 1RM", range: [60,72], volume: "High", sets: "Sets of 6–10", color: "var(--hyp)",
    focus: "Squat frequency and leg drive to balance out your advanced deadlift." },
  { id: 2, name: "Strength", tag: "Transmutation", weeks: [6,10], goal: "Convert new muscle into pure strength",
    intensity: "75–85% of 1RM", range: [75,85], volume: "Moderate", sets: "Sets of 4–6", color: "var(--str)",
    focus: "Overload the bench press (board presses, heavy pauses) to push past 110 kg." },
  { id: 3, name: "Peaking", tag: "Realization", weeks: [11,14], goal: "Acclimate the nervous system to heavy loads",
    intensity: "87–95%+ of 1RM", range: [87,95], volume: "Low", sets: "Sets of 1–3", color: "var(--peak)",
    focus: "Specificity on competition-standard squat, bench and deadlift, with long rest periods." },
  { id: 4, name: "Deload & Test", tag: "Taper", weeks: [15,16], goal: "Shed fatigue and test maximum strength",
    intensity: "50% / 100% of 1RM", range: [50,100], volume: "Very low", sets: "Light week, then test", color: "var(--taper)",
    focus: "A light week to drop fatigue, followed by a simulated meet or 1RM test day." }
];
export const INT = [60,63,66,69,72, 75,78,80,83,85, 87,90,93,95, 50,100];
export const VOL = [55,65,75,85,90, 70,72,66,60,55, 40,34,28,22, 12,20];
/* Main-lift sets x reps per week (example). Week 16 is a ramp to a max single. */
export const SCHEME = [[4,10],[4,9],[4,8],[4,7],[4,6], [5,6],[5,5],[5,5],[4,4],[4,4], [4,3],[4,2],[3,2],[3,1], [3,3], null];
export const RAMP = [[50,3],[70,2],[85,1],[92,1],[97,1],[100,1]];

export const LIFTS = [
  { key: "sq", name: "Squat" }, { key: "bp", name: "Bench" },
  { key: "dl", name: "Deadlift" }, { key: "oh", name: "Overhead press" }
];
export const DAYS = [
  { d: "Mon", lift: "sq" }, { d: "Tue", lift: "bp" }, { d: "Wed", lift: null },
  { d: "Thu", lift: "dl" }, { d: "Fri", lift: "oh" }, { d: "Sat", lift: null }, { d: "Sun", lift: null }
];

export const ACC_DEF = {
  sq: {
    1: [["Leg press","3 × 10–12"],["Romanian deadlift","3 × 8–10"],["Walking lunges","3 × 10 / leg"],["Leg curl","3 × 12"],["Ab wheel","3 × 10"]],
    2: [["Front squat","3 × 5"],["Leg press","3 × 8"],["Leg curl","3 × 10"],["Ab wheel","3 × 10"]],
    3: [["Pause squat","2 × 3"],["Leg curl","2 × 10"],["Core","2 × 10"]],
    4: [["Core","2 × 10"],["Mobility","10 min"]]
  },
  bp: {
    1: [["Close-grip bench","3 × 8–10"],["Incline dumbbell press","3 × 10"],["Chest-supported row","4 × 10"],["Triceps pushdown","3 × 12"],["Face pull","3 × 15"]],
    2: [["Board press","4 × 4"],["Pause bench","3 × 3"],["Chest-supported row","4 × 8"],["Triceps pushdown","3 × 10"],["Face pull","3 × 15"]],
    3: [["Pause bench","3 × 2"],["Chest-supported row","3 × 8"],["Triceps pushdown","2 × 10"]],
    4: [["Chest-supported row","2 × 10"],["Face pull","2 × 15"]]
  },
  dl: {
    1: [["Pause squat (extra squat frequency)","3 × 8"],["Romanian deadlift","3 × 8"],["Barbell row","4 × 8"],["Pull-up","3 × 8"],["Back extension","3 × 12"]],
    2: [["Pause squat","3 × 5"],["Deficit deadlift","3 × 4"],["Barbell row","4 × 6"],["Pull-up","3 × 6"],["Back extension","3 × 10"]],
    3: [["Barbell row","3 × 6"],["Pull-up","3 × 5"],["Back extension","2 × 10"]],
    4: [["Back extension","2 × 10"],["Core","2 × 10"]]
  },
  oh: {
    1: [["Incline dumbbell press","3 × 10"],["Lateral raise","4 × 15"],["Lat pulldown","3 × 10"],["Triceps extension","3 × 12"],["Rear delt fly","3 × 15"]],
    2: [["Seated dumbbell press","3 × 6"],["Lateral raise","3 × 12"],["Lat pulldown","3 × 8"],["Dips","3 × 8"]],
    3: [["Lateral raise","2 × 12"],["Lat pulldown","3 × 8"],["Triceps extension","2 × 10"]],
    4: [["Lateral raise","2 × 15"],["Rear delt fly","2 × 15"]]
  }
};

export const SPRING_PROG = {
  "chest crusher": {
    title: "Chest crusher",
    rule: "Add one rep per set each week. Weeks 1–5 stay on 2 springs and build from 8 to 12 reps. In week 6 add a third spring and restart at 6 reps. If your crusher does not take a third spring, stay on 2 springs, keep adding reps up to 15 and add a 3-second squeeze at the top. If you miss reps two weeks running, repeat the week. Your 80 reps on 1 super spring (30 kg of force) is the easy baseline, so the plan starts at 2 springs, where you managed about 8 reps.",
    weeks: [8, 9, 10, 11, 12].map(r => "2 springs · 3 × " + r).concat([6, 7, 8, 9, 10].map(r => "3 springs · 3 × " + r))
  },
  "chest expander": {
    title: "Chest expander",
    rule: "Overhead and above-chest pulls are already at your 4-spring maximum, so they progress with reps (10 up to 14), then a 2-second pause. In-front-of-chest pulls start at 3 springs and move to 4 springs in week 6, once you have built up to 14 reps. Add one rep per set each week, and repeat the week if you miss reps.",
    weeks: [10, 11, 12, 13, 14].map(r => "3 × " + r + " · overhead and above chest 4 springs, in front 3 springs").concat([10, 11, 12, 13, 14].map(r => "3 × " + r + " · all positions 4 springs, 2 s pause"))
  }
};

export const WEEK_ONLY = {
  "barbell side bend": [1, 3, 5, 7, 9],
  "landmine twist": [2, 4, 6, 8, 10, 11, 12, 13, 14, 15]
};
