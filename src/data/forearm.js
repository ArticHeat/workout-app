/* Golden Grip forearm hypertrophy program, 6 weeks, workouts A, B and C. */
export const FA_PROGRAM = {
  A: [
    { ex: "Wrist curl", sets: [2,2,2,3,3,3], reps: "12–15", rest: "45 s", note: "Thumbless grip, full range of motion, squeeze at the top." },
    { ex: "Wrist extension (reverse wrist curl)", sets: [2,2,2,3,3,3], reps: "12–15", rest: "45 s", note: "Full range of motion, steady mind-muscle focus." },
    { ex: "Reverse EZ-bar curl", sets: [2,3,3,3,3,3], reps: "10–12", rest: "1 min", note: "Keep the body still to hit the brachioradialis. After your last clean rep, a few light-swing partials are fine." },
    { ex: "Pronation and supination (lever)", sets: [2,2,2,2,2,2], reps: "12–15", rest: "30 s", note: "Superset both directions. Rest the forearm on something solid so the biceps stay out of it." }
  ],
  B: [
    { ex: "Dead hang", sets: [2,2,2,2,2,2], reps: "hold 20–60 s", rest: "30 s", note: "Hang to failure. Add weight or go one-arm when bodyweight is easy; chalk if needed." },
    { ex: ["Zottman curl","Zottman curl","Zottman curl","Hammer curl","Hammer curl","Hammer curl"], sets: [3,3,3,3,3,3], reps: "12–15", rest: "45 s", note: "Slow, controlled lowering. Zottman in weeks 1–3, hammer curls in weeks 4–6." },
    { ex: "Wrist roller", sets: [2,2,2,2,2,2], reps: "3 × up and down", rest: "45 s", note: "Add weight until you can no longer finish all three trips." },
    { ex: "Hand gripper (crushing grip)", sets: [2,2,2,2,2,2], reps: "6–12", rest: "1 min", note: "Pick a gripper you can close 6–12 times and take each set to failure." }
  ],
  C: [
    { ex: "Behind-the-back barbell wrist curl", sets: [2,2,2,2,2,2], reps: "12–15", rest: "45 s", note: "Thumbless grip, hold about 1 s at the top." },
    { ex: "Wrist extension (reverse wrist curl)", sets: [2,2,3,2,3,3], reps: "12–15", rest: "45 s", note: "Full range of motion, steady mind-muscle focus." },
    { ex: "Pinch grip hold", sets: [2,2,2,2,2,2], reps: "hold 30 s", rest: "1 min", note: "Pinch a plate or block. Add weight once 30 s feels easy." },
    { ex: "Pronation and supination (lever)", sets: [2,2,2,2,3,3], reps: "12–15", rest: "30 s", note: "Superset both directions, forearm supported." },
    { ex: "Radial and ulnar deviation (lever)", sets: [2,2,2,2,2,2], reps: "15–20", rest: "30 s", note: "Move toward the thumb side, then the pinky side. Chase a pump." }
  ]
};
/* Mon squat = B (three days before Thursday deadlifts), Tue bench = A, Fri OHP = C. No forearm work on deadlift day. */
export const FA_DAY = { sq: "B", bp: "A" };
export const FA_OFF = { Sat: "C" };   /* Workout C moved to Saturday evening: 48+ hours after Thursday deadlifts */
export const SAND_OFF = "Sat";        /* bear hug carry on Saturday evening for the same reason */
export const faEx = (row, w) => Array.isArray(row.ex) ? row.ex[w - 1] : row.ex;
