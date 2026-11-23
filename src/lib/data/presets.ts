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
// `personal`: hidden from the public catalog + picker. Reveals only when a
//         consumer passes an opt-in flag. Used today for owner-authored
//         blocks that aren't ready to share; replaced by user-authored
//         blocks once in-app block creation ships.
export type BlockPreset = {
  name: string;
  tagline: string;
  focusName: string;
  durationWeeks: number;
  defaultFrequency: number;
  days: PlannedDay[];
  personal?: boolean;
  // Per-week overrides of the base `days` pattern, keyed by 1-indexed week
  // number. Weeks not listed use the base pattern. Lives on the preset (not
  // inline in applyPreset) so ANY week can be regenerated later — otherwise
  // the app writes these once at apply time and permanently forgets what a
  // given week was supposed to be, leaving no way to repair a week that
  // drifted onto the wrong dates.
  weekPatterns?: Record<number, PlannedDay[]>;
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
    // 3-day full-body for time-constrained users. Galpin/Nippard: minimum
    // effective dose, hit every muscle 2-3× per week, 48h between hits. Plus
    // one Z2 as the aerobic floor you don't skip.
    name: "Minimalist",
    tagline: "3 full-body sessions + 1 Z2. Minimum effective dose.",
    focusName: "Minimalist",
    durationWeeks: 4,
    defaultFrequency: 3,
    days: [
      { category: "split", templateId: "split_full_body" },
      { category: "split", templateId: "split_full_body" },
      { category: "split", templateId: "split_full_body" },
      { category: "cardio", templateId: "attia_zone2_45" },
    ],
  },
  {
    // Body-composition block — hold strength (preserve muscle in a deficit)
    // with metabolic conditioning on top + aerobic base. Schoenfeld/Nippard:
    // strength is the single most important variable when cutting. Pair with
    // ~300-500 kcal daily deficit + 1.8-2.2 g/kg protein (not coded here).
    name: "Fat loss",
    tagline: "Strength + metabolic + Z2. Preserve muscle while leaning out.",
    focusName: "Fat loss",
    durationWeeks: 6,
    defaultFrequency: 5,
    days: [
      { category: "split", templateId: "split_push" },
      { category: "cardio", templateId: "attia_4x4_vo2" },
      { category: "split", templateId: "split_pull" },
      { category: "cardio", templateId: "attia_zone2_45" },
      { category: "split", templateId: "split_legs" },
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
    // Attia's own prescription for raising VO2 max + mortality metrics.
    // 2× VO2 (4×4 Norwegian) + 3× Z2 + 1× strength maintenance. Grounded in
    // the "going from low to below-average VO2 drops mortality ~50%" data.
    name: "VO2 + aerobic",
    tagline: "Attia's cardio recipe. 2× VO2, 3× Z2, 1 strength.",
    focusName: "VO2 + aerobic",
    durationWeeks: 8,
    defaultFrequency: 5,
    days: [
      { category: "cardio", templateId: "attia_4x4_vo2" },
      { category: "cardio", templateId: "attia_zone2_45" },
      { category: "cardio", templateId: "attia_4x4_vo2" },
      { category: "cardio", templateId: "attia_zone2_45" },
      { category: "strength" },
      { category: "cardio", templateId: "attia_zone2_45" },
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
    weekPatterns: {
      // W1-2 Learn — intro sim, easy engine, RDL instead of deadlift.
      1: [
        { category: "hyrox", templateId: "hyrox_strength_pull" },
        { category: "hyrox", templateId: "hyrox_sim_pairs_intro" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "hyrox", templateId: "hyrox_strength_push" },
        { category: "hyrox", templateId: "hyrox_engine_easy" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "recovery" },
      ],
      2: [
        { category: "hyrox", templateId: "hyrox_strength_pull" },
        { category: "hyrox", templateId: "hyrox_sim_pairs_intro" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "hyrox", templateId: "hyrox_strength_push" },
        { category: "hyrox", templateId: "hyrox_engine_easy" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "recovery" },
      ],
      // W3-4 fall through to the base pattern (full race sim).
      // W5 Peak — Tuesday becomes the timed benchmark. One real test.
      5: [
        { category: "hyrox", templateId: "hyrox_strength_pull" },
        { category: "hyrox", templateId: "hyrox_sim_test" },
        { category: "hyrox", templateId: "hyrox_strength_push" },
        { category: "hyrox", templateId: "hyrox_sim_short" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "cardio", templateId: "nick_bare_long_run" },
        { category: "recovery" },
      ],
      // W6 Deload — CNS recovery is the point (Galpin/Attia: ~50% volume cut
      // off a peak). ONE light skill sim keeps pattern specificity, two Z2s
      // hold the aerobic floor, everything else is mobility or recovery.
      // Friday deliberately is NOT hyrox_engine_easy — despite the name that
      // template prescribes 6 × 400 m intervals, a tempo day after a peak TT.
      6: [
        { category: "stretching" },
        { category: "hyrox", templateId: "hyrox_sim_pairs_light" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "stretching" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "recovery" },
        { category: "recovery" },
      ],
    },
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
    // General surf conditioning — paddle strength, pop-up power, back-safe
    // legs. Used to be timed to a specific trip (auto-overrode a sailing
    // week) — generalized now so it's reusable any time surf fitness matters.
    name: "Surf training",
    tagline: "Paddle, pop-up, back-safe. General surf conditioning.",
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
  // ─── Personal blocks (hidden from public catalog + picker) ───
  // Visible only when a consumer passes the opt-in flag; owner-authored, not
  // meant for friends sharing the app. Will be replaced by user-authored
  // blocks when in-app creation ships.
  {
    personal: true,
    // 2-week bridge after a deload. Lower volume than the full Hybrid block
    // so the nervous system re-sensitizes; push day returns (if the previous
    // block relegated chest/shoulders), one sim re-tests the race pattern.
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
    personal: true,
    // 8-week maintenance block for extended travel (Uruguay, long trips).
    // 3-day structure keeps gym dependence low; swim / surf / paddleboard
    // backfill the aerobic volume outside the gym. Goal: lose <5% fitness,
    // come back fresh.
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

// Return the catalog, optionally including personal (owner-only) blocks.
// Centralized so consumers don't each re-implement the filter.
export function visiblePresets(options?: { includePersonal?: boolean }): BlockPreset[] {
  const includePersonal = options?.includePersonal ?? false;
  return includePersonal ? BLOCK_PRESETS : BLOCK_PRESETS.filter((p) => !p.personal);
}

// Grouping for the Plan tab's picker modal and the /plans library.
// Peloton / Nike group programs by intent — users pick by WHY, not anatomy.
// A preset's focusName must appear in exactly one group's `items`; anything
// unlisted falls into "Specialty" via the consumer.
export const PRESET_GROUPS: { id: string; label: string; items: string[] }[] = [
  { id: "strength", label: "Strength", items: ["Hypertrophy", "Strength peak", "Minimalist", "Fat loss"] },
  { id: "endurance", label: "Endurance", items: ["Cardio base", "VO2 + aerobic"] },
  { id: "hybrid", label: "Hybrid / Athletic", items: ["Hybrid athlete", "Hyrox prep", "Longevity"] },
  { id: "reset", label: "Reset", items: ["Beginner", "Recovery"] },
  { id: "specialty", label: "Specialty", items: ["Surf prep"] },
  { id: "personal", label: "Personal", items: ["Re-entry bridge", "Travel mode"] },
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

// "What next" recommender — maps a focus name to 2-3 blocks that make sense
// as the next phase. Logic follows classical periodization + guru consensus:
// hypertrophy → strength → hypertrophy; cardio → more cardio + VO2; hybrid
// stays hybrid with race/aesthetic swap-ins. "Again" (same block repeated) is
// a valid option — some adaptations take 2-3 cycles. First suggestion is the
// "safest next step"; later ones are variants.
const NEXT_BLOCK_MAP: Record<string, string[]> = {
  "Beginner": ["Hypertrophy", "Hybrid athlete", "Cardio base"],
  "Hypertrophy": ["Hypertrophy", "Strength peak", "Fat loss"],
  "Strength peak": ["Hypertrophy", "Hybrid athlete", "Recovery"],
  "Minimalist": ["Hypertrophy", "Minimalist", "Hybrid athlete"],
  "Fat loss": ["Hypertrophy", "Hybrid athlete", "Recovery"],
  "Cardio base": ["VO2 + aerobic", "Hybrid athlete", "Longevity"],
  "VO2 + aerobic": ["Cardio base", "Hybrid athlete", "Longevity"],
  "Hybrid athlete": ["Hyrox prep", "Hybrid athlete", "Fat loss"],
  "Hyrox prep": ["Hybrid athlete", "Hyrox prep", "Recovery"],
  "Longevity": ["Longevity", "Hypertrophy", "VO2 + aerobic"],
  "Recovery": ["Hypertrophy", "Hybrid athlete", "Cardio base"],
  "Surf prep": ["Surf prep", "Hybrid athlete", "Recovery"],
  // Personal blocks route back to public ones (so the end-of-block prompt
  // never re-suggests a personal block unless the owner is actively viewing).
  "Re-entry bridge": ["Hybrid athlete", "Hyrox prep", "Hypertrophy"],
  "Travel mode": ["Hybrid athlete", "Hypertrophy", "Hyrox prep"],
};

export function nextBlockSuggestions(focusName: string): BlockPreset[] {
  const focuses = NEXT_BLOCK_MAP[focusName] ?? ["Hybrid athlete", "Hypertrophy", "Recovery"];
  return focuses
    .map((f) => BLOCK_PRESETS.find((p) => p.focusName === f))
    .filter((p): p is BlockPreset => !!p);
}
