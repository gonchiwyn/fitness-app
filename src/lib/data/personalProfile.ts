// ============================================================
// PROFILES
//   GENERIC_PROFILE — cold-start default. Used to seed a new browser.
//   PERSONAL_PROFILE — Gonzalo's dev seed. Loaded via Settings on demand.
// A first-time visitor gets GENERIC and lands in the onboarding wizard.
// ============================================================
import type { PlannedDay, Profile, WeeklyPlan } from "../types";

export const GENERIC_PROFILE: Profile = {
  id: "me",
  name: "Athlete",
  units: "kg",
  sex: "prefer_not_to_say",
  experience: "intermediate",
  focusAreas: [],
  goals: [],
  maxes: {},
  defaultEquipment: "full_gym",
  coreFocus: "protection",
  activeConcerns: [],
  chronicLumbarCare: false,
  levels: {},
  onboarded: false,
};

export const GENERIC_WEEKLY_PLAN: WeeklyPlan = {
  id: "me",
  // Sensible starter week — 3 strength, 2 cardio, 1 stretch, 1 rest.
  // The user will overwrite this once they pick a focus block.
  days: [
    { category: "strength" },
    { category: "cardio", templateId: "attia_zone2_45" },
    { category: "hypertrophy" },
    { category: "cardio" },
    { category: "strength" },
    { category: "stretching" },
    null,
  ] as PlannedDay[],
};

export const PERSONAL_PROFILE: Profile = {
  id: "me",
  name: "Gonzalo",
  units: "kg",
  age: 31,
  heightCm: 180,
  weightKg: 72,
  sex: "male",
  experience: "advanced",
  // Lower back history + shoulder issues — focus all three by default
  focusAreas: ["lower_back", "shoulder", "hip"],
  goals: ["strength", "athletic_performance", "longevity"],
  maxes: {
    bench_press: { weight: 100, reps: 2 },          // ~107 1RM
    back_squat: { weight: 80, reps: 4 },            // ~91 1RM
    deadlift: { weight: 60, reps: 6 },              // ~72 1RM (back-limited)
    weighted_pullup: { weight: 20, reps: 2 },       // ~21kg added (98 total)
    overhead_press: { weight: 50, reps: 4 },        // ~57 1RM
  },
  runBenchmark: {
    distanceKm: 10,
    timeMinutes: 52,
  },
  defaultEquipment: "full_gym",
  coreFocus: "protection",
  // Shoulder recovered — no active concerns. Text history stays as context.
  // Turn on/off from Settings when something flares up.
  activeConcerns: [],
  // Lumbar is chronic — keep caps on hinge/squat + glute-forward warmup,
  // but don't blanket-swap squats/deadlifts.
  chronicLumbarCare: true,
  // Per-category proficiency. Pro at lifting, starter at Hyrox/CrossFit.
  levels: {
    split: "pro",
    hypertrophy: "pro",
    strength: "pro",
    hyrox: "starter",
    crossfit: "starter",
    athlete: "comfortable",
    cardio: "comfortable",
    core: "comfortable",
    surf: "comfortable",
    burn: "comfortable",
    stretching: "comfortable",
    recovery: "comfortable",
    beach: "comfortable",
  },
  workoutHistory:
    "15+ years lifting. Long history of hypertrophy + strength cycles. " +
    "Vegetarian 8 years (lifts a bit lighter than pre-veg, otherwise stable). " +
    "Background: tennis (kid → competitive 11-18), soccer (5-12), surf 10+ years (occasional now), " +
    "casual swim, weekend runs. Wants to explore more functional / Hyrox-style training.",
  injuryHistory:
    "Lower back: history of acute lumbar spasm (last one Feb 4), spasms since teens, recovers with rest. " +
    "No pain during exercise now. Residual sensitivity in transitions (standing up after sitting). " +
    "Lumbar overuse vs glute initiation issue — focus: glute activation, pelvic control, anti-extension core. " +
    "Left shoulder: mild rotator cuff / posterior capsule irritation (resolved). Discomfort in end-range IR + adduction. " +
    "Responds to scap stability + rotator cuff work. Near full function. " +
    "Unilateral L-side weakness: scapular control deficit. Improved with face pulls, external rotation, pull-aparts. " +
    "Movement profile: psoas dominance, weak glute engagement, weak isometric anti-extension, weak Bulgarian split squats, weak hamstrings. Good mobility overall.",
  currentGoal:
    "Coming back from 4-wk surgery break. Rebuild muscle + get more functional/athletic. Considering Hyrox in coming months.",
  otherCommitments:
    "Run 10k Sundays. Tennis ~every 2 weeks. Swim occasionally. Train 6×/week, mornings.",
  onboarded: true,
};

// ============================================================
// PERSONAL WEEKLY PLAN
// Mon Push · Tue Pull · Wed Hyrox/Athletic · Thu Legs ·
// Fri Hypertrophy · Sat Cardio Z2 · Sun 10k Run (cardio)
// ============================================================
export const PERSONAL_WEEKLY_PLAN: WeeklyPlan = {
  id: "me",
  days: [
    { category: "split", templateId: "split_push" },        // Mon
    { category: "split", templateId: "split_pull" },        // Tue
    { category: "hyrox" },                                  // Wed — rotation across Hyrox templates
    { category: "split", templateId: "split_legs" },        // Thu
    { category: "hypertrophy" },                            // Fri — rotation across Hyp templates
    { category: "cardio", templateId: "attia_zone2_45" },   // Sat — Zone 2 base
    { category: "cardio" },                                 // Sun — your 10k (cardio rotation)
  ] as PlannedDay[],
};
