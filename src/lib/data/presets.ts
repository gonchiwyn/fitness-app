import type { PlannedDay } from "@/lib/types";

// Block preset — a 1-8 week training block with a clear intent. Presets are
// shared by the Plan tab's "Change block" modal and the standalone Plans
// library at /plans, so new blocks only need to be added here once.
//
// Durations per Galpin (real hypertrophy adaptation takes 5-6 weeks minimum,
// strength peaks want 6-8 with a real deload). Every preset holds 2x Zone 2
// minimum - Attia/Patrick's non-negotiable for aerobic maintenance and
// mortality prevention regardless of block focus.
//
// `name`: short, goal-driven (2-4 words). No jargon, no parens.
// `tagline`: one sentence, what you'll actually do each week.
// `days`: ordered priority - index 0 is the most important session, used
//         when the user picks fewer training days than the full pattern has.
// `defaultFrequency`: suggested days/week when applying. Also what the chip
//         picker pre-selects.
export type BlockPreset = {
  name: string;
  tagline: string;
  focusName: string;
  durationWeeks: number;
  defaultFrequency: number;
  days: PlannedDay[];
};

export const BLOCK_PRESETS: BlockPreset[] = [
  {
    name: "Beginner",
    tagline: "Build the habit. Full-body sessions + easy cardio.",
    focusName: "Beginner",
    durationWeeks: 4,
    defaultFrequency: 3,
    // Priority: 3 strength (hits every muscle each session) → cardio → mobility
    days: [
      { category: "split", templateId: "split_full_body" },
      { category: "split", templateId: "split_full_body" },
      { category: "split", templateId: "split_full_body" },
      { category: "cardio", templateId: "attia_zone2_45" },
      { category: "stretching" },
      { category: "cardio", templateId: "attia_zone2_45" },
    ],
  },
  {
    name: "Build muscle",
    tagline: "Push / Pull / Legs twice a week + Z2 cardio.",
    focusName: "Hypertrophy",
    durationWeeks: 6,
    defaultFrequency: 5,
    days: [
      { category: "split", templateId: "split_push" },
      { category: "split", templateId: "split_pull" },
      { category: "split", templateId: "split_legs" },
      { category: "cardio", templateId: "attia_zone2_45" },
      { category: "hypertrophy" },
      { category: "cardio", templateId: "attia_zone2_45" },
    ],
  },
  {
    name: "Build muscle — autoregulated",
    tagline: "ABAB hypertrophy. Load adapts rep-by-rep (Menno/Galpin).",
    focusName: "Menno Hypertrophy",
    durationWeeks: 8,
    defaultFrequency: 4,
    days: [
      { category: "hypertrophy", templateId: "menno_hyp_a" },
      { category: "hypertrophy", templateId: "menno_hyp_b" },
      { category: "hypertrophy", templateId: "menno_hyp_a" },
      { category: "hypertrophy", templateId: "menno_hyp_b" },
      { category: "cardio", templateId: "attia_zone2_45" },
      { category: "cardio", templateId: "attia_zone2_45" },
    ],
  },
  {
    name: "Get stronger",
    tagline: "Heavy bench, squat, deadlift. 8-week peak.",
    focusName: "Strength peak",
    durationWeeks: 8,
    defaultFrequency: 4,
    days: [
      { category: "strength", templateId: "strength_lower_a" },
      { category: "strength", templateId: "strength_upper_a" },
      { category: "strength", templateId: "strength_deadlift_day" },
      { category: "split", templateId: "split_arms" },
      { category: "cardio", templateId: "attia_zone2_45" },
      { category: "cardio", templateId: "attia_zone2_45" },
    ],
  },
  {
    name: "Cardio base",
    tagline: "Mostly Z2 running / biking + 2× strength maintenance.",
    focusName: "Cardio base",
    durationWeeks: 8,
    defaultFrequency: 5,
    days: [
      { category: "cardio", templateId: "attia_zone2_45" },
      { category: "cardio", templateId: "attia_zone2_45" },
      { category: "cardio", templateId: "attia_4x4_vo2" },
      { category: "strength" },
      { category: "strength" },
      { category: "cardio", templateId: "attia_zone2_45" },
    ],
  },
  {
    name: "Athletic power",
    tagline: "Jumps, sprints, Hyrox stations, heavy legs.",
    focusName: "Athletic",
    durationWeeks: 6,
    defaultFrequency: 5,
    days: [
      { category: "athlete" },
      { category: "hyrox" },
      { category: "split", templateId: "split_legs" },
      { category: "hyrox" },
      { category: "cardio", templateId: "attia_zone2_45" },
      { category: "cardio", templateId: "attia_zone2_45" },
    ],
  },
  {
    name: "Longevity",
    tagline: "3 strength · 2 Z2 · 1 VO2 · 1 stretch. The Attia week.",
    focusName: "Longevity",
    durationWeeks: 8,
    defaultFrequency: 6,
    days: [
      { category: "strength" },
      { category: "cardio", templateId: "attia_zone2_45" },
      { category: "hypertrophy" },
      { category: "cardio", templateId: "attia_4x4_vo2" },
      { category: "strength" },
      { category: "cardio", templateId: "attia_zone2_45" },
      { category: "stretching" },
    ],
  },
  {
    name: "Push / Pull / Legs",
    tagline: "Classic PPL — Push & Pull twice, Legs once.",
    focusName: "PPL",
    durationWeeks: 6,
    defaultFrequency: 6,
    days: [
      { category: "split", templateId: "split_push" },
      { category: "split", templateId: "split_pull" },
      { category: "split", templateId: "split_legs" },
      { category: "split", templateId: "split_push" },
      { category: "split", templateId: "split_pull" },
      { category: "cardio", templateId: "attia_zone2_45" },
      { category: "cardio", templateId: "attia_zone2_45" },
    ],
  },
  {
    name: "Recovery week",
    tagline: "Mobility, easy Z2, no barbell. Reset the system.",
    focusName: "Recovery",
    durationWeeks: 1,
    defaultFrequency: 5,
    days: [
      { category: "stretching" },
      { category: "cardio", templateId: "attia_zone2_45" },
      { category: "stretching" },
      { category: "recovery" },
      { category: "cardio", templateId: "attia_zone2_45" },
      { category: "recovery" },
    ],
  },
  {
    // Fixed layout — frequency chip is cosmetic here, structure is designed
    // around sailing week 3 and auto-override; see applyPreset.
    name: "Surf trip prep",
    tagline: "Paddle, pop-up, back-safe. Built for a 6-week countdown.",
    focusName: "Surf prep",
    durationWeeks: 6,
    defaultFrequency: 6,
    days: [
      { category: "athlete", templateId: "surf_paddle_push" },
      { category: "athlete", templateId: "surf_paddle_pull" },
      { category: "cardio", templateId: "attia_zone2_45" },
      { category: "athlete", templateId: "surf_legs" },
      { category: "athlete", templateId: "surf_pop_up_core" },
      { category: "cardio", templateId: "attia_zone2_45" },
    ],
  },
  {
    // Fixed layout — phase-based template progression W1-2 vs W3-5 vs W6.
    // Sim day uses the "Station Blocks" variant by default — real Hyrox
    // equipment but held one station at a time. Thursday (short mid-week
    // sim) and Saturday (long run) added per Hunter McIntyre + Nick Bare.
    name: "Hyrox prep",
    tagline: "First-time Hyrox: learn → build → peak. Back-aware.",
    focusName: "Hyrox prep",
    durationWeeks: 6,
    defaultFrequency: 5,
    days: [
      { category: "hyrox", templateId: "hyrox_strength_pull" },
      { category: "hyrox", templateId: "hyrox_sim_pairs" },
      { category: "hyrox", templateId: "hyrox_strength_push" },
      { category: "hyrox", templateId: "hyrox_sim_short" },
      { category: "cardio", templateId: "attia_zone2_45" },
      { category: "cardio", templateId: "nick_bare_long_run" },
    ],
  },
  {
    // 6-week sustainable block — Hyrox engine + preserved aesthetics.
    // Mon push + Thu pull/posterior keep chest/shoulders + hamstrings in the
    // program (Hyrox alone relegates them). Tue sim + Fri VO2 train the two
    // real limiters — race-pattern conditioning and lactate buffering. Wed
    // Z2 is the aerobic floor. Weekend floats: rest, optional long Z2, or
    // a sport day if the body's asking.
    name: "Hybrid athlete",
    tagline: "Hyrox engine + aesthetic. Push & pull preserved, conditioning dense.",
    focusName: "Hybrid athlete",
    durationWeeks: 6,
    defaultFrequency: 5,
    days: [
      { category: "split", templateId: "split_push" },
      { category: "hyrox", templateId: "hyrox_sim_short" },
      { category: "cardio", templateId: "attia_zone2_45" },
      { category: "hyrox", templateId: "hyrox_strength_pull" },
      { category: "cardio", templateId: "attia_4x4_vo2" },
    ],
  },
  {
    // 2-week bridge after a deload. Lower volume than the full Hybrid block
    // so the nervous system re-sensitizes; push day returns (if the previous
    // block relegated chest/shoulders), one sim re-tests the race pattern.
    // Not meant to progress — meant to prime the next block.
    name: "Re-entry bridge",
    tagline: "2 weeks to re-introduce push day + test the pattern post-deload.",
    focusName: "Re-entry bridge",
    durationWeeks: 2,
    defaultFrequency: 4,
    days: [
      { category: "split", templateId: "split_push" },
      { category: "hyrox", templateId: "hyrox_strength_pull" },
      { category: "cardio", templateId: "attia_zone2_45" },
      { category: "hyrox", templateId: "hyrox_sim_short" },
    ],
  },
  {
    // 8-week maintenance block for extended travel (Uruguay, long trips).
    // 3-day structure keeps gym dependence low; swim / surf / paddleboard
    // backfill the aerobic volume outside the gym. Push / Pull / Legs
    // because travel gyms vary wildly — these are the three sessions that
    // work with any functional setup. Goal: lose <5% fitness, come back
    // fresh. Not meant to progress — meant to preserve.
    name: "Travel mode",
    tagline: "3 gym days + swim/surf/run. Preserve fitness through long trips.",
    focusName: "Travel mode",
    durationWeeks: 8,
    defaultFrequency: 3,
    days: [
      { category: "split", templateId: "split_push" },
      { category: "split", templateId: "split_pull" },
      { category: "split", templateId: "split_legs" },
      { category: "cardio", templateId: "attia_zone2_45" },
    ],
  },
];

// Grouping for the Plan tab's picker modal and the /plans library.
// Peloton / Nike group programs by intent — users pick by WHY, not anatomy.
// A preset's focusName must appear in exactly one group's `items`; anything
// unlisted falls into "Specialty" via the consumer.
export const PRESET_GROUPS: { id: string; label: string; items: string[] }[] = [
  { id: "strength", label: "Strength", items: ["Hypertrophy", "Menno Hypertrophy", "Strength peak", "PPL"] },
  { id: "endurance", label: "Endurance", items: ["Cardio base"] },
  { id: "hybrid", label: "Hybrid / Athletic", items: ["Hybrid athlete", "Hyrox prep", "Athletic", "Longevity"] },
  { id: "reset", label: "Reset", items: ["Re-entry bridge", "Travel mode", "Recovery", "Beginner"] },
  { id: "specialty", label: "Specialty", items: ["Surf prep"] },
];

export function presetByFocusName(name: string): BlockPreset | undefined {
  return BLOCK_PRESETS.find((p) => p.focusName === name);
}

// URL-safe slug for /plans/[slug] routes — derived from focusName so links
// stay stable even if the display name changes.
export function presetSlug(preset: BlockPreset): string {
  return preset.focusName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function presetBySlug(slug: string): BlockPreset | undefined {
  return BLOCK_PRESETS.find((p) => presetSlug(p) === slug);
}
