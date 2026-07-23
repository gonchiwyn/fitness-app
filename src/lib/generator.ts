import { format, getISOWeek } from "date-fns";
import { EXERCISES } from "./data/exercises";
import { isTemplateAtLevel, templatesFor, type Template } from "./data/templates";
import { lastRatingForCategory, lastSessionForExercise, lastWeeklyReview } from "./db";
import {
  CATEGORY_DURATION,
  CATEGORY_LABELS,
  EQUIPMENT_PRESET_INCLUDES,
  TRACKED_LIFTS,
  getBlockPhase,
  getCurrentCyclePhase,
  type Block,
  type Category,
  type CoreFocus,
  type CoreFunction,
  type CyclePhase,
  type Equipment,
  type Intensity,
  type LiftId,
  type Prescription,
  type Profile,
  type RehabZone,
  type Workout,
  type WorkoutModifiers,
} from "./types";

// ============================================================
// Deterministic PRNG so a given seed reproduces the same workout
// ============================================================
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============================================================
// 1RM
// ============================================================
export function estimateOneRm(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function getEstimatedOneRm(profile: Profile, lift: LiftId): number | null {
  const m = profile.maxes?.[lift];
  if (!m || !m.weight || !m.reps) return null;
  return estimateOneRm(m.weight, m.reps);
}

// Personalized: lifts the user must be careful with (lower-back history).
// Targets get capped + a caution note attaches.
const LUMBAR_SENSITIVE_LIFTS = new Set<string>([
  "deadlift",
  "romanian_deadlift",
  "rdl_deficit_band",
  "back_squat",
  "overhead_press",
  "power_clean",
  "hang_clean",
  "hang_clean_below_knee",
  "clean_and_jerk",
  "snatch",
  "barbell_row",
  "thruster",
]);

function targetPercentForCategory(
  category: Category,
  prescribedReps: string,
  rpe: number | undefined,
  intensity: Intensity
): number | null {
  const repsNum = parseInt(prescribedReps, 10);
  if (!Number.isFinite(repsNum)) return null;

  let base: number | null = null;
  if (category === "strength") {
    if (repsNum <= 3) base = 85;
    else if (repsNum <= 5) base = 80;
    else if (repsNum <= 8) base = 72;
    else base = 65;
  } else if (category === "hypertrophy" || category === "beach") {
    if (repsNum <= 6) base = 75;
    else if (repsNum <= 10) base = 70;
    else base = 60;
  } else if (category === "athlete" || category === "crossfit") {
    base = repsNum <= 5 ? 75 : 65;
  } else if (category === "hyrox" || category === "split") {
    base = 65;
  } else if (rpe && rpe >= 8) {
    base = 70;
  }

  if (base === null) return null;
  // 3-mode intensity — wider deltas so the effect is visible on load hints
  const delta: Record<Intensity, number> = {
    easy: -12,
    normal: 0,
    push: 8,
  };
  base += delta[intensity] ?? 0;
  return Math.max(40, Math.min(95, base));
}

function roundToIncrement(weight: number, units: "kg" | "lb"): number {
  const inc = units === "kg" ? 2.5 : 5;
  return Math.round(weight / inc) * inc;
}

// ============================================================
// INJURY / REHAB
// ============================================================
type InjuryFlag = "knee" | "shoulder" | "lower_back" | "elbow" | "hip" | "neck";

// Each entry is a CHAIN of preferred swaps. Generator tries them in order,
// skipping any that are already used earlier in the same workout.
const INJURY_SWAPS: Record<InjuryFlag, Record<string, string[]>> = {
  knee: {
    back_squat: ["leg_press", "goblet_squat_hold", "hip_thrust"],
    front_squat: ["leg_press", "goblet_squat_hold"],
    box_jump: ["kb_swing", "hip_thrust"],
    broad_jump: ["kb_swing", "hip_thrust"],
    depth_jump_24: ["kb_swing"],
    depth_jump_30: ["kb_swing"],
    sprint: ["easy_bike", "easy_row"],
    walking_lunge: ["leg_press", "hip_thrust"],
    bulgarian_split_squat: ["leg_press", "step_up"],
  },
  shoulder: {
    overhead_press: ["incline_db_press", "db_bench", "seated_row"],
    snatch_balance: ["front_squat"],
    bhn_push_press: ["front_squat", "incline_db_press"],
    overhead_squat: ["front_squat", "goblet_squat_hold"],
    weighted_pullup: ["lat_pulldown", "seated_row", "db_row"],
    pullup: ["lat_pulldown", "seated_row"],
    weighted_dip: ["db_bench", "incline_db_press", "tricep_pushdown"],
    bench_press: ["incline_db_press", "db_bench", "weighted_dip"],
  },
  lower_back: {
    deadlift: ["romanian_deadlift", "hip_thrust", "kb_swing"],
    barbell_row: ["seated_row", "db_row", "lat_pulldown"],
    power_clean: ["kb_swing", "hip_thrust"],
    hang_clean: ["kb_swing", "hip_thrust"],
    hang_clean_below_knee: ["kb_swing", "hip_thrust"],
    clean_and_jerk: ["kb_swing"],
    back_squat: ["leg_press", "goblet_squat_hold"],
  },
  elbow: {
    pullup: ["lat_pulldown", "seated_row"],
    weighted_pullup: ["lat_pulldown", "seated_row"],
    chinup: ["lat_pulldown", "seated_row"],
    db_curl: ["hammer_curl", "face_pull"],
  },
  hip: {
    back_squat: ["leg_press", "goblet_squat_hold"],
    deadlift: ["romanian_deadlift", "hip_thrust"],
  },
  neck: {
    bhn_push_press: ["overhead_press", "incline_db_press"],
    snatch_balance: ["front_squat"],
  },
};

function applyInjurySwaps(
  p: Prescription,
  flags: Set<InjuryFlag>,
  availableEquipment: Set<Equipment>,
  usedExerciseIds: Set<string>
): Prescription {
  for (const flag of flags) {
    const chain = INJURY_SWAPS[flag]?.[p.exerciseId];
    if (!chain || chain.length === 0) continue;
    for (const candidate of chain) {
      // Don't dup an exercise already in this workout
      if (usedExerciseIds.has(candidate)) continue;
      const swapEx = EXERCISES.find((e) => e.id === candidate);
      if (!swapEx) continue;
      if (!swapEx.equipment.some((eq) => availableEquipment.has(eq))) continue;
      return {
        ...p,
        exerciseId: candidate,
        notes: [p.notes, `Swapped for ${flag.replace("_", " ")} consideration`].filter(Boolean).join(" · "),
      };
    }
  }
  return p;
}

// ============================================================
// EQUIPMENT
// ============================================================
function resolveAvailableEquipment(profile: Profile, modifiers: WorkoutModifiers): Set<Equipment> {
  if (modifiers.equipmentAvailable && modifiers.equipmentAvailable.length > 0) {
    return new Set(modifiers.equipmentAvailable);
  }
  const preset = modifiers.equipmentPreset ?? profile.defaultEquipment ?? "full_gym";
  return new Set(EQUIPMENT_PRESET_INCLUDES[preset]);
}

function findEquipmentAlternative(
  exerciseId: string,
  available: Set<Equipment>,
  rng: () => number,
  usedExerciseIds: Set<string>
): string | null {
  const target = EXERCISES.find((e) => e.id === exerciseId);
  if (!target) return null;
  if (target.equipment.some((eq) => available.has(eq))) return null; // OK as-is

  const candidates = shuffle(
    EXERCISES.filter(
      (e) =>
        e.id !== exerciseId &&
        !usedExerciseIds.has(e.id) &&
        e.pattern === target.pattern &&
        e.weighted === target.weighted &&
        e.equipment.some((eq) => available.has(eq))
    ),
    rng
  );
  return candidates[0]?.id ?? null;
}

function adaptToEquipment(
  p: Prescription,
  available: Set<Equipment>,
  rng: () => number,
  usedExerciseIds: Set<string>
): Prescription | null {
  const target = EXERCISES.find((e) => e.id === p.exerciseId);
  if (!target) return p;
  if (target.equipment.some((eq) => available.has(eq))) return p;

  const alt = findEquipmentAlternative(p.exerciseId, available, rng, usedExerciseIds);
  if (!alt) return null; // can't adapt; drop
  return {
    ...p,
    exerciseId: alt,
    notes: [p.notes, `Adapted from ${target.name} for available equipment`].filter(Boolean).join(" · "),
  };
}

// If a prescription ends up as a duplicate of something already in the workout
// (typically because an injury swap landed on the same exercise), find a
// same-pattern alternative. Keeps original as a fallback if no match.
function dedupeAgainstUsed(
  p: Prescription,
  used: Set<string>,
  available: Set<Equipment>,
  rng: () => number
): Prescription {
  if (!used.has(p.exerciseId)) return p;
  const target = EXERCISES.find((e) => e.id === p.exerciseId);
  if (!target) return p;
  const alternatives = shuffle(
    EXERCISES.filter(
      (e) =>
        e.id !== p.exerciseId &&
        !used.has(e.id) &&
        e.pattern === target.pattern &&
        e.weighted === target.weighted &&
        e.equipment.some((eq) => available.has(eq))
    ),
    rng
  );
  if (alternatives.length === 0) return p; // no alt available, tolerate the dupe
  return {
    ...p,
    exerciseId: alternatives[0].id,
    // Load hint no longer applies since exercise changed
    loadHint: undefined,
    notes: [p.notes, `Swapped from ${target.name} to avoid duplicate`].filter(Boolean).join(" · "),
  };
}

// ============================================================
// CORE BLOCK — auto-injected based on profile.coreFocus
// ============================================================
const CORE_REP_PRESCRIPTIONS: Record<CoreFunction, { reps: string; sets: number }> = {
  anti_extension: { sets: 3, reps: "30-45s or 8 reps" },
  anti_rotation: { sets: 3, reps: "8-10/side" },
  anti_lateral_flexion: { sets: 3, reps: "30-45s/side" },
  rotation: { sets: 3, reps: "10-12" },
  isolation: { sets: 3, reps: "12-15" },
};

// Categories where core is already covered (or doesn't fit)
const SKIP_CORE_INJECTION: Category[] = ["stretching", "recovery", "core", "cardio"];

function pickCoreExercise(
  fn: CoreFunction,
  available: Set<Equipment>,
  rng: () => number
): string | null {
  const candidates = EXERCISES.filter(
    (e) => e.coreFunction === fn && e.equipment.some((eq) => available.has(eq))
  );
  if (candidates.length === 0) return null;
  return pick(candidates, rng).id;
}

function buildCoreBlock(
  coreFocus: CoreFocus,
  category: Category,
  available: Set<Equipment>,
  rng: () => number,
  date: Date
): Block | null {
  if (coreFocus === "off") return null;
  if (SKIP_CORE_INJECTION.includes(category)) return null;

  const prescriptions: Prescription[] = [];

  // Personalized: bias rotation toward anti-extension (his weak spot + lumbar protection)
  // Anti-extension hits on day idx 0, 1, 3, 4, 6 (5 of 7 days/week)
  // Anti-rotation on 2, anti-lateral on 5
  const protectionRotation: CoreFunction[] = [
    "anti_extension",
    "anti_extension",
    "anti_rotation",
    "anti_extension",
    "anti_extension",
    "anti_lateral_flexion",
    "anti_extension",
  ];
  const dayIdx = date.getDate() % 7;
  const primary = protectionRotation[dayIdx];
  // Secondary always covers a different function so each session hits 2 different patterns
  const secondaryPool: CoreFunction[] = primary === "anti_extension"
    ? ["anti_rotation", "anti_lateral_flexion"]
    : ["anti_extension", primary === "anti_rotation" ? "anti_lateral_flexion" : "anti_rotation"];
  const secondary = secondaryPool[date.getDate() % secondaryPool.length];

  if (coreFocus === "protection" || coreFocus === "both") {
    for (const fn of [primary, secondary]) {
      const exId = pickCoreExercise(fn, available, rng);
      if (exId) {
        const prescript = CORE_REP_PRESCRIPTIONS[fn];
        prescriptions.push({
          exerciseId: exId,
          sets: prescript.sets,
          reps: prescript.reps,
          rest: "45s",
          notes: humanCoreFunction(fn),
        });
      }
    }
  }

  if (coreFocus === "aesthetic" || coreFocus === "both") {
    const exId = pickCoreExercise("isolation", available, rng);
    if (exId) {
      const prescript = CORE_REP_PRESCRIPTIONS.isolation;
      prescriptions.push({
        exerciseId: exId,
        sets: prescript.sets,
        reps: prescript.reps,
        rest: "45s",
        notes: "Aesthetic",
      });
    }
  }

  if (prescriptions.length === 0) return null;

  return {
    id: `core-${Date.now()}`,
    title: "Core",
    scheme: coreFocus === "protection" ? "Galpin 3-part rotation"
      : coreFocus === "aesthetic" ? "Isolation focus"
      : "Protection + aesthetic",
    note: coreFocus !== "aesthetic"
      ? "Core function rotates daily so all three protective patterns get hit this week."
      : undefined,
    prescriptions,
  };
}

function humanCoreFunction(fn: CoreFunction): string {
  return {
    anti_extension: "Anti-extension (protects lumbar)",
    anti_rotation: "Anti-rotation",
    anti_lateral_flexion: "Anti-lateral flexion",
    rotation: "Rotational power",
    isolation: "Aesthetic",
  }[fn];
}

// ============================================================
// WARMUP
// ============================================================
// Day-specific movement prep. Picks 1-2 mobility exercises that mirror the
// day's session — Push day gets thoracic/shoulder prep, Legs day gets
// hip/ankle prep, Cardio gets hip flexor + easy movement. Chronic focus
// (lumbar/scap/glutes) is still covered by the main warmup blocks; this is
// the "what am I about to train" specificity layer.
function dayPrepFor(
  templateId: string | undefined,
  category: Category,
  available: Set<Equipment>
): Prescription[] {
  // Preferred exercise IDs per day type, in order. Missing IDs get skipped
  // gracefully — the warmup falls back on the generic focus-area moves.
  const pickFirst = (ids: string[], reps: string): Prescription | null => {
    for (const id of ids) {
      const ex = EXERCISES.find((e) => e.id === id);
      if (ex && ex.equipment.some((eq) => available.has(eq))) {
        return { exerciseId: id, sets: 1, reps };
      }
    }
    return null;
  };

  const tid = templateId ?? "";
  const out: Prescription[] = [];

  const isUpperPush = /push|chest|shoulders|arms|upper/.test(tid);
  const isUpperPull = /pull|back/.test(tid);
  const isLower = /legs|lower|deadlift/.test(tid);
  const isCardio = category === "cardio";

  if (isUpperPush) {
    const w = pickFirst(["wall_slide", "prone_ytw", "band_pull_apart"], "10 reps");
    const t = pickFirst(["thoracic_opener", "cat_cow"], "8 reps");
    if (w) out.push({ ...w, notes: "Day prep — shoulder + scap" });
    if (t) out.push({ ...t, notes: "Day prep — thoracic mobility" });
  } else if (isUpperPull) {
    const s = pickFirst(["scap_pushup", "band_pull_apart", "prone_ytw", "wall_slide"], "10 reps");
    const t = pickFirst(["thoracic_opener", "cat_cow"], "8 reps");
    if (s) out.push({ ...s, notes: "Day prep — scap engagement" });
    if (t) out.push({ ...t, notes: "Day prep — thoracic mobility" });
  } else if (isLower) {
    const h = pickFirst(["ninety_ninety", "world_greatest_stretch", "hip_cars"], "6/side");
    const a = pickFirst(["goblet_squat_hold", "thoracic_extension_squat", "ankle_bound"], "10 reps");
    if (h) out.push({ ...h, notes: "Day prep — hip mobility" });
    if (a) out.push({ ...a, notes: "Day prep — squat pattern + ankle" });
  } else if (isCardio) {
    const hf = pickFirst(["couch_stretch", "world_greatest_stretch", "hip_cars"], "45s/side");
    const easy = pickFirst(["easy_row", "easy_bike"], "2 min easy");
    if (hf) out.push({ ...hf, notes: "Day prep — open the hips" });
    if (easy) out.push({ ...easy, notes: "Day prep — build up to Z2 pace" });
  }

  return out;
}

// Cooldown that reflects the day's session. Push day gets pec + shoulder;
// Pull gets lat + bicep; Legs gets quad + hip flexor; Cardio gets calf +
// standing hamstring. Couch stretch (hip flexor) is a default anchor —
// carries the chronic focus everyone benefits from.
function cooldownFor(
  templateId: string | undefined,
  category: Category
): Prescription[] {
  const tid = templateId ?? "";
  const isUpperPush = /push|chest|shoulders|arms|upper/.test(tid);
  const isUpperPull = /pull|back/.test(tid);
  const isLower = /legs|lower|deadlift/.test(tid);
  const isCardio = category === "cardio";

  // Default fallback if nothing matches — the previous static cooldown.
  const base: Prescription[] = [
    { exerciseId: "child_pose", sets: 1, reps: "60s" },
    { exerciseId: "couch_stretch", sets: 1, reps: "45s/side" },
    { exerciseId: "thread_needle", sets: 1, reps: "30s/side" },
  ];

  if (isUpperPush) {
    return [
      { exerciseId: "child_pose", sets: 1, reps: "60s", notes: "Chest opener" },
      { exerciseId: "thread_needle", sets: 1, reps: "30s/side", notes: "Thoracic mobility after pressing" },
      { exerciseId: "wall_slide", sets: 1, reps: "10 slow reps", notes: "Reset the scap after volume" },
    ];
  }
  if (isUpperPull) {
    return [
      { exerciseId: "child_pose", sets: 1, reps: "60s", notes: "Lat lengthen" },
      { exerciseId: "thoracic_opener", sets: 1, reps: "8/side", notes: "Open the mid-back after rowing" },
      { exerciseId: "couch_stretch", sets: 1, reps: "45s/side", notes: "Chronic hip flexor priority" },
    ];
  }
  if (isLower) {
    return [
      { exerciseId: "couch_stretch", sets: 1, reps: "60s/side", notes: "Quad + hip flexor after squats" },
      { exerciseId: "pigeon", sets: 1, reps: "45s/side", notes: "Glute + external hip" },
      { exerciseId: "world_greatest_stretch", sets: 1, reps: "5 slow/side", notes: "Full-body reset" },
    ];
  }
  if (isCardio) {
    return [
      { exerciseId: "couch_stretch", sets: 1, reps: "45s/side", notes: "Open the hip flexors after running" },
      { exerciseId: "pigeon", sets: 1, reps: "45s/side", notes: "Glute recovery" },
    ];
  }
  return base;
}

function buildWarmup(
  profile: Profile,
  category: Category,
  modifiers: WorkoutModifiers,
  rng: () => number,
  available: Set<Equipment>
): Block {
  const baseTargets: string[] = profile.focusAreas.length
    ? [...profile.focusAreas]
    : ["lower_back", "hip", "shoulder"];

  // Bias focus areas to what the session actually trains — otherwise every
  // Push day gets hip mobility and every Legs day gets wall slides, which
  // is noise. Lumbar/lower_back is always kept (chronic care).
  const tid = modifiers.templateId ?? "";
  const isUpperPush = /push|chest|shoulders|arms|upper/.test(tid);
  const isUpperPull = /pull|back/.test(tid);
  const isLower = /legs|lower|deadlift/.test(tid);
  let targets: string[] = baseTargets;
  if (isUpperPush || isUpperPull) {
    targets = baseTargets.filter((t) => t !== "hip");
  } else if (isLower || category === "cardio" || category === "recovery") {
    targets = baseTargets.filter((t) => t !== "shoulder");
  }

  // If a rehab zone is set, push it to the front to ensure coverage
  if (modifiers.rehab && !targets.includes(modifiers.rehab)) {
    targets.unshift(modifiers.rehab);
  }

  const prescriptions: Prescription[] = [];

  // Steady-state modalities only for Z2/cardio warmup — jumping jacks +
  // burpees don't belong in aerobic prep.
  const isSteadyCardio = category === "cardio" || category === "recovery" || category === "stretching";
  const heartRaiserCandidates = (
    isSteadyCardio
      ? ["easy_row", "easy_bike", "run"]
      : ["easy_row", "easy_bike", "jumping_jacks", "jump_rope_continuous"]
  )
    .map((id) => EXERCISES.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => !!e && e.equipment.some((eq) => available.has(eq)));
  if (heartRaiserCandidates.length > 0) {
    prescriptions.push({
      exerciseId: pick(heartRaiserCandidates, rng).id,
      sets: 1,
      reps: "3 min easy",
      notes: "Just raise the heart rate",
    });
  }

  // Galpin's tissue-tolerance protocol — for run-based cardio days, a short
  // dose of Pogo hops builds Achilles / ankle tolerance to running volume.
  // 2-3 minutes of low-level springy hops. Not for conditioning, for joints.
  const templatePicksRun = modifiers.templateId?.includes("run") ||
    modifiers.templateId?.includes("nick_bare") ||
    modifiers.templateId?.includes("norwegian");
  if (isSteadyCardio && templatePicksRun) {
    const pogoAvailable = EXERCISES.find(
      (e) => e.id === "pogo_hop" && e.equipment.some((eq) => available.has(eq))
    );
    if (pogoAvailable) {
      prescriptions.push({
        exerciseId: "pogo_hop",
        sets: 2,
        reps: "20 sec",
        rest: "30s",
        notes: "Tissue tolerance for running — not conditioning. Springy and light.",
      });
    }
  }

  // Time scaling: under 40 min, 1 mobility per target; under 30, only main focus areas
  const time = modifiers.timeMinutes ?? CATEGORY_DURATION[category];
  const perTarget = time < 40 ? 1 : 2;
  const trimmedTargets = time < 30 ? targets.slice(0, 2) : targets;

  for (const target of trimmedTargets) {
    const options = shuffle(
      EXERCISES.filter(
        (e) =>
          e.warmupTarget === target &&
          e.equipment.some((eq) => available.has(eq))
      ),
      rng
    ).slice(0, perTarget);
    for (const ex of options) {
      prescriptions.push({
        exerciseId: ex.id,
        sets: 1,
        reps: ex.pattern === "mobility" ? "45s" : "10 reps",
      });
    }
  }

  // Day-specific movement prep — mirrors the day's session so the warmup
  // "matches" the workout, not just the chronic focus areas.
  // Kept lightweight (1-2 moves) so we don't blow up the warmup length.
  const dayPrep = dayPrepFor(modifiers.templateId, category, available);
  if (time >= 25 && dayPrep.length > 0) {
    prescriptions.push(...dayPrep);
  }

  // Personalized activation. Scapular activation is a priority on
  // upper-body days (psoas dominance + L-scap weakness); glute activation
  // is a priority on lower-body/cardio days. Cross-mixing (scap on Legs
  // day, glute on Push day) is noise and stretches the warmup for no gain.
  if (time >= 30 && (isUpperPush || isUpperPull)) {
    const scapPool = ["band_pull_apart", "ws_trx", "prone_ytw", "face_pull"]
      .map((id) => EXERCISES.find((e) => e.id === id))
      .filter((e): e is NonNullable<typeof e> => !!e && e.equipment.some((eq) => available.has(eq)));
    if (scapPool.length > 0 && !prescriptions.some((p) => scapPool.find((e) => e.id === p.exerciseId))) {
      prescriptions.push({
        exerciseId: pick(scapPool, rng).id,
        sets: 2,
        reps: "12",
        notes: "Scap activation — daily priming for left side",
      });
    }
  }

  if (time >= 30 && (isLower || category === "cardio" || category === "recovery")) {
    const glutePool = ["glute_bridge", "glute_clam_side_plank", "unilateral_standing_hip_abduction"]
      .map((id) => EXERCISES.find((e) => e.id === id))
      .filter((e): e is NonNullable<typeof e> => !!e && e.equipment.some((eq) => available.has(eq)));
    if (glutePool.length > 0 && !prescriptions.some((p) => glutePool.find((e) => e.id === p.exerciseId))) {
      prescriptions.push({
        exerciseId: pick(glutePool, rng).id,
        sets: 2,
        reps: "10/side",
        notes: "Glute activation — wake them up before they have to work",
      });
    }
  }

  return {
    id: `warmup-${Date.now()}`,
    title: "Warmup",
    scheme: time < 30 ? "~5 min — focused" : "~10-12 min — lumbar, hips, shoulders, scap, glutes",
    note: "Move slow. Breathe. This is the work that keeps you in the game.",
    prescriptions,
  };
}

// ============================================================
// LOAD HINTS
// ============================================================
const LIFT_ID_SET: Set<string> = new Set(TRACKED_LIFTS.map((l) => l.id));

async function buildLoadHint(
  prescription: Prescription,
  profile: Profile,
  category: Category,
  intensity: Intensity,
  phase: CyclePhase | null = null
): Promise<string | undefined> {
  const exId = prescription.exerciseId;
  const units = profile.units;

  if (LIFT_ID_SET.has(exId) && profile.maxes) {
    const oneRm = getEstimatedOneRm(profile, exId as LiftId);
    if (oneRm) {
      let pct = targetPercentForCategory(category, prescription.reps, prescription.rpe, intensity);
      if (pct) {
        // Cap on lumbar-sensitive lifts
        let cautionTag = "";
        // Lumbar caps only when user opts in via chronicLumbarCare
        if (profile.chronicLumbarCare && LUMBAR_SENSITIVE_LIFTS.has(exId)) {
          if (pct > 78) {
            pct = Math.min(pct, 78);
            cautionTag = " · brace 360, no grinders";
          } else {
            cautionTag = " · brace, neutral spine";
          }
        }
        // Apply periodization wave (only for tracked lifts, per phase multiplier)
        let phaseTag = "";
        if (phase && phase.intensityMultiplier !== 1.0) {
          pct = Math.max(40, Math.min(95, Math.round(pct * phase.intensityMultiplier)));
          phaseTag = ` · ${phase.label} week`;
        }
        const target = roundToIncrement((oneRm * pct) / 100, units);
        return `Target ${target}${units} (~${pct}% of est. 1RM ${oneRm}${units})${cautionTag}${phaseTag}`;
      }
    }
  }

  const history = await lastSessionForExercise(exId);
  if (!history) return undefined;
  const sets = history.sets;
  if (sets.length === 0) return undefined;
  const maxWeight = sets.reduce((m, s) => Math.max(m, s.weight ?? 0), 0);
  if (maxWeight <= 0) return undefined;

  const repsTarget = parseInt(prescription.reps, 10);
  const lastReps = sets[0].reps ?? 0;
  const pushingIt = intensity === "push";
  if (
    pushingIt &&
    Number.isFinite(repsTarget) &&
    lastReps >= repsTarget &&
    (prescription.rpe ?? 7) >= 7
  ) {
    const bump = maxWeight < 60 ? 2.5 : 5;
    return `Try ${maxWeight + bump}${units} (+${bump}). Last: ${maxWeight}${units} × ${lastReps}`;
  }
  return `Last: ${maxWeight}${units} × ${lastReps}`;
}

// ============================================================
// CARDIO
// ============================================================
function tuneCardioPrescription(p: Prescription, profile: Profile): Prescription {
  if (!profile.runBenchmark) return p;
  const { distanceKm, timeMinutes } = profile.runBenchmark;
  if (!distanceKm || !timeMinutes) return p;
  const paceMinPerKm = timeMinutes / distanceKm;

  const z2Pace = paceMinPerKm * 1.20;
  const vo2Pace = paceMinPerKm * 0.95;
  const fmt = (m: number) => {
    const mm = Math.floor(m);
    const ss = Math.round((m - mm) * 60);
    return `${mm}:${ss.toString().padStart(2, "0")}`;
  };

  if (/Z2|zone 2|easy|z2/i.test(p.reps) || /easy/i.test(p.notes ?? "")) {
    return { ...p, notes: [p.notes, `Z2 target ~${fmt(z2Pace)}/km`].filter(Boolean).join(" · ") };
  }
  if (/hard|vo2|interval|95%|sprint/i.test(p.reps) || /vo2|hard/i.test(p.notes ?? "")) {
    return { ...p, notes: [p.notes, `Hard target ~${fmt(vo2Pace)}/km`].filter(Boolean).join(" · ") };
  }
  return p;
}

// ============================================================
// TEMPLATE SELECTION
// ============================================================
function pickTemplate(templates: Template[], profile: Profile, rng: () => number): Template {
  if (templates.length === 1) return templates[0];
  const goals = profile.goals ?? [];
  const scored = templates.map((t) => {
    let score = 1 + rng() * 0.5;
    const infl = t.influences ?? [];
    if (goals.includes("longevity") && (infl.includes("attia") || infl.includes("patrick"))) score += 2;
    if (goals.includes("strength") && infl.includes("galpin")) score += 2;
    if (goals.includes("athletic_performance") && infl.includes("galpin")) score += 1.5;
    if (goals.includes("aesthetic") && infl.includes("hemsworth")) score += 1.5;
    if (goals.includes("endurance") && (infl.includes("attia") || infl.includes("patrick"))) score += 1.5;
    return { t, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const topHalf = scored.slice(0, Math.max(2, Math.ceil(scored.length / 2)));
  return pick(topHalf.map((s) => s.t), rng);
}

// ============================================================
// TIME SCALING
// ============================================================
function timeScaleBlocks(blocks: Block[], targetMinutes: number, baselineMinutes: number): Block[] {
  if (!targetMinutes || targetMinutes === baselineMinutes) return blocks;
  const ratio = targetMinutes / baselineMinutes;

  // Warmup, Core (auto-injected), and Cooldown are all protected — main blocks scale.
  const warmup = blocks.filter((b) => b.title === "Warmup");
  const core = blocks.filter((b) => b.title === "Core");
  const cooldown = blocks.filter((b) => b.title === "Cooldown");
  const main = blocks.filter(
    (b) => b.title !== "Warmup" && b.title !== "Core" && b.title !== "Cooldown"
  );
  if (main.length === 0) return blocks;

  if (ratio < 1) {
    const keepCount = Math.max(1, Math.round(main.length * ratio));
    return [...warmup, ...main.slice(0, keepCount), ...core, ...cooldown];
  }

  const expanded = main.map((b) => ({
    ...b,
    prescriptions: b.prescriptions.map((p) => ({
      ...p,
      sets: Math.min(p.sets + 1, p.sets + Math.round(ratio - 1)),
    })),
  }));
  return [...warmup, ...expanded, ...core, ...cooldown];
}

// ============================================================
// REHAB ADJUSTMENTS — when rehab mode is active, lower intensity + add extra warmup for the zone
// ============================================================
function applyRehabAdjustments(blocks: Block[], rehab: RehabZone): Block[] {
  return blocks.map((b) => ({
    ...b,
    prescriptions: b.prescriptions.map((p) => {
      const ex = EXERCISES.find((e) => e.id === p.exerciseId);
      const involvesZone = ex
        ? ex.muscles.some((m) =>
            (rehab === "shoulder" ? ["shoulder", "rotator_cuff", "rear_delt", "front_delt", "side_delt"] :
             rehab === "knee" ? ["quads", "hamstrings", "calves"] :
             rehab === "lower_back" ? ["lower_back", "back", "posterior_chain"] :
             rehab === "elbow" ? ["biceps", "tris", "forearms"] :
             rehab === "hip" ? ["hip", "hip_flexor", "glutes", "adductors"] :
             rehab === "neck" ? ["traps", "neck"] : []
            ).includes(m)
          )
        : false;
      if (!involvesZone) return p;
      return {
        ...p,
        rpe: p.rpe ? Math.max(5, p.rpe - 2) : undefined,
        sets: Math.max(1, p.sets - 1),
        notes: [p.notes, `Rehab mode — lighter & lower volume`].filter(Boolean).join(" · "),
      };
    }),
  }));
}

// ============================================================
// MAIN ENTRY
// ============================================================
// Periodization applies to strength-focused categories where wave loading makes sense.
// Doesn't apply to cardio, stretching, recovery, etc.
const PERIODIZED_CATEGORIES: Category[] = ["strength", "hypertrophy", "split", "athlete"];

// Scale any "X min" duration references in a prescription's reps text.
// Push extends, easy shortens — so intensity feels real on cardio / stretching / mobility.
// Focus block name → per-prescription bias. Applied on top of intensity + phase.
// Kept minimal: only touches reps target, sets, rest — nothing that would break
// the template's structure or coach attribution.
function applyBlockBias(
  p: Prescription,
  focusName: string | undefined,
  isMainLift: boolean
): Prescription {
  if (!focusName) return p;
  const name = focusName.toLowerCase();
  // Extract the top-end rep target from bare numbers ("8") and simple ranges
  // ("6-8", "8-12"). Skips time-based ("30 sec", "5 min"), AMRAP, etc.
  const trimmedReps = p.reps.trim();
  const bareReps = /^\d+$/.test(trimmedReps) ? parseInt(trimmedReps, 10) : null;
  const rangeMatch = trimmedReps.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  const rangeHigh = rangeMatch ? parseInt(rangeMatch[2], 10) : null;
  const repsIsNumeric = bareReps !== null || rangeHigh !== null;
  const currentTop = bareReps ?? rangeHigh ?? 0;

  if (name.includes("hypertrophy") || name.includes("aesthetic")) {
    // 8–12 rep range, moderate rest, +1 set on accessories.
    let next = { ...p };
    if (repsIsNumeric && (currentTop < 8 || currentTop > 12)) {
      next.reps = "8-12";
    }
    if (!isMainLift && next.sets < 4) next.sets = next.sets + 1;
    if (!isMainLift && next.rest && /^\d+/.test(next.rest)) {
      // Cap rest at 60s for accessories to keep density up.
      next.rest = "60s";
    }
    return next;
  }

  if (name.includes("strength")) {
    // 3–5 rep range on main lifts, longer rest.
    let next = { ...p };
    if (isMainLift && repsIsNumeric && currentTop > 5) {
      next.reps = "3-5";
    }
    if (isMainLift) next.rest = "3 min";
    return next;
  }

  if (name.includes("cardio")) {
    // Cap accessory volume so lifting days stay maintenance.
    if (!isMainLift && p.sets > 2) return { ...p, sets: 2 };
    return p;
  }

  if (name.includes("recovery")) {
    // Everything easy — cap sets and reduce load intent.
    if (p.sets > 2) return { ...p, sets: 2 };
    return p;
  }

  return p;
}

// 4-week rotation of accessory schemes. Coaches don't run the same 3×12
// every week — the volume varies to keep stimulus fresh. Index is derived from
// the ISO week number so it's deterministic AND consistent across a program.
// Schemes are tuned to sit inside the block's rep intent (Hypertrophy: 8–15,
// Strength: 3–5 mains + moderate accessories, Cardio: capped volume).
const ACCESSORY_SCHEME_CYCLES: Record<string, { sets: number; reps: string }[]> = {
  hypertrophy: [
    { sets: 3, reps: "12" },
    { sets: 4, reps: "8-10" },
    { sets: 3, reps: "15" },
    { sets: 4, reps: "10" },
  ],
  strength: [
    { sets: 3, reps: "8" },
    { sets: 4, reps: "6-8" },
    { sets: 3, reps: "10" },
    { sets: 4, reps: "5-6" },
  ],
  cardio: [
    { sets: 2, reps: "12" },
    { sets: 2, reps: "15" },
    { sets: 3, reps: "10" },
    { sets: 2, reps: "10-12" },
  ],
  default: [
    { sets: 3, reps: "10" },
    { sets: 4, reps: "8" },
    { sets: 3, reps: "12" },
    { sets: 4, reps: "6-8" },
  ],
};

function applyWeeklySchemeRotation(
  p: Prescription,
  seedDate: Date,
  focusName: string | undefined,
  isMainLift: boolean
): Prescription {
  // Only rotate schemes on accessories with numeric-ish rep prescriptions —
  // never touch main lifts (progression anchor) or time/AMRAP prescriptions.
  if (isMainLift) return p;
  const trimmed = p.reps.trim();
  const isNumeric = /^\d+$/.test(trimmed) || /^\d+\s*[-–]\s*\d+$/.test(trimmed);
  if (!isNumeric) return p;

  const cycleKey = pickCycleKey(focusName);
  const cycle = ACCESSORY_SCHEME_CYCLES[cycleKey];
  const week = getISOWeek(seedDate);
  const scheme = cycle[week % cycle.length];
  return { ...p, sets: scheme.sets, reps: scheme.reps };
}

function pickCycleKey(focusName: string | undefined): string {
  const n = focusName?.toLowerCase() ?? "";
  if (n.includes("hypertrophy") || n.includes("aesthetic")) return "hypertrophy";
  if (n.includes("strength")) return "strength";
  if (n.includes("cardio")) return "cardio";
  return "default";
}

function applyIntensityToDuration(p: Prescription, intensity: Intensity): Prescription {
  if (intensity === "normal") return p;
  const factor = intensity === "easy" ? 0.75 : 1.2;
  const scaleNumber = (n: string) => {
    const num = parseFloat(n);
    if (!Number.isFinite(num) || num <= 0) return n;
    const scaled = Math.max(1, Math.round(num * factor));
    return String(scaled);
  };
  const newReps = p.reps
    .replace(/(\d+(?:\.\d+)?)\s*min/g, (_, n) => `${scaleNumber(n)} min`)
    .replace(/(\d+(?:\.\d+)?)\s*sec/g, (_, n) => `${scaleNumber(n)} sec`)
    .replace(/(\d+(?:\.\d+)?)s(?![a-z])/g, (_, n) => `${scaleNumber(n)}s`);
  if (newReps === p.reps) return p;
  return { ...p, reps: newReps };
}

export async function generateWorkout(
  category: Category,
  profile: Profile,
  seedDate?: Date,
  modifiers: WorkoutModifiers = {}
): Promise<Workout> {
  const date = seedDate ?? new Date();
  // If the user didn't pick a readiness explicitly and the current focus is
  // a Recovery block, default to easy — a recovery block should feel like one.
  const focusName = profile.currentFocus?.name?.toLowerCase();
  const defaultIntensity: Intensity =
    focusName?.includes("recovery") ? "easy" : "normal";
  const intensity = modifiers.intensity ?? defaultIntensity;
  const targetMinutes = modifiers.timeMinutes ?? CATEGORY_DURATION[category];

  // Last rating for this category — small nudge on accessory volume so the
  // coach reads the room. "Hard" last week → -1 set on accessories today.
  // "Easy" → +1. Ignored if user's readiness override differs (they've
  // already told us how they feel today).
  const lastRating =
    intensity === "normal" ? await lastRatingForCategory(category) : undefined;

  // Most recent Weekly Review — the coach's structured read on the whole
  // week. Its answers ripple into individual sessions:
  //  · low energy / poor sleep → less accessory volume
  //  · exercises flagged Hard → -1 set on match
  //  · exercises flagged Easy → +1 set on match
  //  · beat/missed lift progression → the load anchor shifts
  const review = await lastWeeklyReview();
  const reviewFresh =
    review &&
    (Date.now() - new Date(review.weekEndDate + "T00:00:00").getTime()) <
      14 * 86400000;
  const activeReview = reviewFresh ? review : undefined;

  // Wave phase — computed automatically from the active focus block.
  // Galpin's frame: Accumulation → Intensification → Realization → Deload
  // spread across the block duration. No profile toggle — this is how
  // programs actually work. Falls back to legacy programStartDate mode
  // for old profiles that were on the manual 4-week wave.
  let phase: CyclePhase | null = null;
  if (PERIODIZED_CATEGORIES.includes(category)) {
    if (profile.currentFocus?.startedAt && profile.currentFocus.durationWeeks) {
      phase = getBlockPhase(
        profile.currentFocus.startedAt,
        profile.currentFocus.durationWeeks,
        date
      );
    } else if (profile.periodizationEnabled && profile.programStartDate) {
      phase = getCurrentCyclePhase(profile.programStartDate, date);
    }
  }

  // Seed includes modifiers so different combos give different workouts
  const seed =
    date.getFullYear() * 10000 +
    (date.getMonth() + 1) * 100 +
    date.getDate() +
    category.charCodeAt(0) * 7 +
    (targetMinutes ?? 60) * 13 +
    (modifiers.equipmentPreset?.charCodeAt(0) ?? 0) * 17 +
    (intensity.charCodeAt(0)) * 31 +
    (modifiers.rehab?.charCodeAt(0) ?? 0) * 41;
  const rng = mulberry32(seed);

  const available = resolveAvailableEquipment(profile, modifiers);

  const allTemplates = templatesFor(category);
  if (allTemplates.length === 0) {
    throw new Error(`No templates for category ${category}`);
  }
  // Locked template (from Plan day) takes precedence — respect user's explicit choice
  const lockedTemplate = modifiers.templateId
    ? allTemplates.find((t) => t.id === modifiers.templateId)
    : undefined;
  // For rotation, filter to templates at user's level for this category
  const userLevel = profile.levels?.[category] ?? "comfortable";
  const levelFiltered = allTemplates.filter((t) => isTemplateAtLevel(t, userLevel));
  const pool = levelFiltered.length > 0 ? levelFiltered : allTemplates;
  const template = lockedTemplate ?? pickTemplate(pool, profile, rng);

  // Injury swaps only from explicitly-active concerns + per-session rehab modifier.
  // Old behavior parsed injuryHistory text — that made past injuries permanent.
  // Now text is just context; swaps come from what's currently affecting you.
  const injuryFlags = new Set<InjuryFlag>(
    (profile.activeConcerns ?? []) as InjuryFlag[]
  );
  if (modifiers.rehab) injuryFlags.add(modifiers.rehab);

  const warmup = buildWarmup(profile, category, modifiers, rng, available);
  // Track every exercise added to the workout so injury swaps + equipment
  // adaptations avoid producing duplicates within a single session.
  const usedExerciseIds = new Set<string>(
    warmup.prescriptions.map((p) => p.exerciseId)
  );

  let blocks: Block[] = [warmup];

  for (let i = 0; i < template.blocks.length; i++) {
    const b = template.blocks[i];
    const enriched: Prescription[] = [];
    for (const rawP of b.prescriptions) {
      // Resolve rotation pool first — pick one exercise for this session.
      // Prefer options not already used (variety within workout).
      let resolvedP = rawP;
      if (rawP.pool && rawP.pool.length > 0) {
        const availableFromPool = rawP.pool.filter(
          (id) => !usedExerciseIds.has(id) && EXERCISES.find((e) => e.id === id)
        );
        const chosen =
          availableFromPool.length > 0
            ? pick(availableFromPool, rng)
            : pick(rawP.pool, rng);
        resolvedP = { ...rawP, exerciseId: chosen };
      }

      let p: Prescription | null = applyInjurySwaps(resolvedP, injuryFlags, available, usedExerciseIds);
      p = adaptToEquipment(p, available, rng, usedExerciseIds);
      if (!p) continue;
      p = dedupeAgainstUsed(p, usedExerciseIds, available, rng);

      // Apply periodization wave. Main compounds follow phase.setAdjustment
      // directly (Realization +1 set, Deload -1). Accessories run the opposite
      // direction on Realization — cut a set so energy is preserved for the
      // main-lift PR attempt — and match the Deload cut.
      if (phase && LIFT_ID_SET.has(p.exerciseId) && phase.setAdjustment !== 0) {
        p = { ...p, sets: Math.max(1, p.sets + phase.setAdjustment) };
      } else if (phase && !LIFT_ID_SET.has(p.exerciseId)) {
        const isRealization = phase.label === "Realization";
        const isDeload = phase.label === "Deload";
        if ((isRealization || isDeload) && p.sets > 2) {
          p = { ...p, sets: p.sets - 1 };
        }
      }

      // Intensity mode also adjusts volume — makes readiness feel real, not cosmetic.
      // Push: +1 set on main lifts. Easy: -1 set on accessories (never below 2).
      if (intensity === "push" && LIFT_ID_SET.has(p.exerciseId)) {
        p = { ...p, sets: p.sets + 1 };
      } else if (intensity === "easy" && !LIFT_ID_SET.has(p.exerciseId) && p.sets > 2) {
        p = { ...p, sets: p.sets - 1 };
      }

      // Feedback from the last rated session of this category. Only nudges
      // accessories, so main lifts stay a stable progression anchor.
      if (lastRating && !LIFT_ID_SET.has(p.exerciseId)) {
        if (lastRating === "hard" && p.sets > 2) {
          p = { ...p, sets: p.sets - 1 };
        } else if (lastRating === "easy" && p.sets < 5) {
          p = { ...p, sets: p.sets + 1 };
        }
      }

      // Weekly review shapes the next week's sessions. Bias toward what the
      // athlete told us: less if drained/tired, more if flagged Easy, less
      // if flagged Hard. Main lifts feel the progression edits.
      if (activeReview) {
        // Energy: 1 (drained) → -1 set on accessories; 5 (charged) → +1
        if (!LIFT_ID_SET.has(p.exerciseId)) {
          if (activeReview.energy <= 2 && p.sets > 2) {
            p = { ...p, sets: p.sets - 1 };
          } else if (activeReview.energy >= 4 && p.sets < 5) {
            p = { ...p, sets: p.sets + 1 };
          }
          // Sleep quality — poor sleep = extra cut on accessories
          if (activeReview.sleep === "poor" && p.sets > 2) {
            p = { ...p, sets: p.sets - 1 };
          }
          // Per-exercise flags — the most direct signal
          if (activeReview.hardExerciseIds.includes(p.exerciseId) && p.sets > 2) {
            p = { ...p, sets: p.sets - 1 };
          } else if (
            activeReview.easyExerciseIds.includes(p.exerciseId) &&
            p.sets < 5
          ) {
            p = { ...p, sets: p.sets + 1 };
          }
        }
        // Main-lift progression: "beat" → nudge target reps down a hair to
        // encourage heavier attempts; "missed" → hold steady (don't bury them).
        const exId = p.exerciseId;
        if (LIFT_ID_SET.has(exId)) {
          const prog = activeReview.liftProgression.find((x) => x.liftId === exId);
          if (prog?.result === "beat") {
            // Signal: keep the sets, but drop lower end of rep range if it's
            // a range like "6-8" → "6".
            const trimmed = p.reps.trim();
            const range = trimmed.match(/^(\d+)\s*[-–]\s*(\d+)$/);
            if (range) p = { ...p, reps: range[1] };
          }
        }
      }

      // Focus block bias — the coach thinks in blocks. Hypertrophy shifts reps to
      // 8-12; Strength peak to 3-5 w/ long rest; Cardio caps accessory volume;
      // Recovery caps everything. See applyBlockBias for the exact rules.
      p = applyBlockBias(p, profile.currentFocus?.name, LIFT_ID_SET.has(p.exerciseId));

      // Week-to-week scheme rotation on accessories. Same Monday next week
      // won't be an identical 3×12 — the sets/reps step through a 4-week
      // cycle tuned to the block. Main lifts are never touched.
      p = applyWeeklySchemeRotation(
        p,
        date,
        profile.currentFocus?.name,
        LIFT_ID_SET.has(p.exerciseId)
      );

      // Scale time-based durations (cardio, stretching holds, warmup, etc.) — visible on
      // categories where load% doesn't apply. "45 min Z2" becomes 34 min easy / 54 min push.
      p = applyIntensityToDuration(p, intensity);

      const loadHint = (await buildLoadHint(p, profile, category, intensity, phase)) ?? p.loadHint;
      p = { ...p, loadHint };
      if (category === "cardio") p = tuneCardioPrescription(p, profile);
      enriched.push(p);
      usedExerciseIds.add(p.exerciseId);
    }
    if (enriched.length > 0) {
      blocks.push({
        id: `${template.id}-${i}`,
        title: b.title,
        scheme: b.scheme,
        note: b.note,
        prescriptions: enriched,
      });
    }
  }

  // Auto-inject Core block (Galpin 3-part rotation + optional aesthetic)
  // Skip if the template already provides one — don't double-up.
  // Per-session core override wins; otherwise the profile default.
  const coreFocus = modifiers.coreFocus ?? profile.coreFocus ?? "protection";
  const templateAlreadyHasCore = blocks.some((b) => b.title === "Core");
  if (targetMinutes >= 30 && !templateAlreadyHasCore) {
    const coreBlock = buildCoreBlock(coreFocus, category, available, rng, date);
    if (coreBlock) blocks.push(coreBlock);
  }

  if (["strength", "hypertrophy", "beach", "athlete", "split"].includes(category) && targetMinutes >= 40) {
    // Cooldown that mirrors the day trained — pecs after Push, quads/hips
    // after Legs, lats after Pull. Chronic focus (couch stretch for hip
    // flexors) stays as an anchor since it applies every day.
    const cooldownPrescriptions = cooldownFor(modifiers.templateId, category);
    blocks.push({
      id: `cooldown-${Date.now()}`,
      title: "Cooldown",
      scheme: "~5 min",
      prescriptions: cooldownPrescriptions.filter((p) => {
        const ex = EXERCISES.find((e) => e.id === p.exerciseId);
        return ex && ex.equipment.some((eq) => available.has(eq));
      }),
    });
  }

  // Apply time scaling and rehab adjustments
  blocks = timeScaleBlocks(blocks, targetMinutes, CATEGORY_DURATION[category]);
  if (modifiers.rehab) blocks = applyRehabAdjustments(blocks, modifiers.rehab);

  const name = buildWorkoutName(category, template.name, modifiers);

  return {
    id: `${category}-${format(date, "yyyy-MM-dd")}-${template.id}-${seed}`,
    category,
    name,
    date: format(date, "yyyy-MM-dd"),
    estimatedDurationMin: targetMinutes,
    blocks,
    seed,
    philosophy: template.philosophy,
    influences: template.influences,
    // Always store the picked template. So subsequent modifier changes
    // (time / equipment / readiness) preserve the workout instead of re-rolling.
    modifiers: { ...modifiers, templateId: template.id },
    phase: phase ?? undefined,
  };
}

function buildWorkoutName(category: Category, templateName: string, m: WorkoutModifiers): string {
  const tags: string[] = [];
  if (m.timeMinutes) tags.push(`${m.timeMinutes}m`);
  if (m.intensity && m.intensity !== "normal") {
    tags.push(m.intensity.charAt(0).toUpperCase() + m.intensity.slice(1));
  }
  if (m.rehab) tags.push(`Rehab: ${m.rehab.replace("_", " ")}`);
  const base = `${CATEGORY_LABELS[category]} — ${templateName}`;
  return tags.length > 0 ? `${base} (${tags.join(" · ")})` : base;
}

// ============================================================
// SWAP — alternatives for a given exercise
// ============================================================
// Steady-state cardio only — the Z2 approved list per Attia/Nick Bare/Galpin.
// When swapping inside a cardio / recovery / stretching session the
// alternatives MUST be from this set — never burpees, jumping jacks, etc.
const STEADY_CARDIO_IDS = [
  "easy_bike",
  "easy_row",
  "run",
  "ski_erg",
];

export function findSwapAlternatives(
  exerciseId: string,
  available: Set<Equipment>,
  count = 3,
  usedExerciseIds: Set<string> = new Set(),
  category?: Category
): string[] {
  const target = EXERCISES.find((e) => e.id === exerciseId);
  if (!target) return [];

  // Category gate — steady-state days only offer steady-state alternatives.
  const isSteadyDay =
    category === "cardio" || category === "recovery" || category === "stretching";
  if (isSteadyDay) {
    return STEADY_CARDIO_IDS.filter(
      (id) =>
        id !== exerciseId &&
        !usedExerciseIds.has(id) &&
        EXERCISES.find((e) => e.id === id)?.equipment.some((eq) => available.has(eq))
    ).slice(0, count);
  }

  // Smart swap: same pattern + shared primary muscle, NOT a warmup/mobility
  // exercise. Rank by muscle overlap descending — a bench press swap should
  // show incline press before pushup, not the other way around.
  //
  // Muscle-taxonomy bridge: some exercises use compound tags ("posterior_chain")
  // and others use component tags ("hamstrings", "glutes"). expandMuscles()
  // rewrites either form into a superset so the shared-muscle check catches
  // both — otherwise a Romanian DL wouldn't swap to a Deadlift.
  const expandMuscles = (ms: string[]): Set<string> => {
    const out = new Set(ms);
    if (ms.includes("posterior_chain")) {
      out.add("hamstrings");
      out.add("glutes");
      out.add("back");
    }
    if (ms.includes("hamstrings") || ms.includes("glutes")) {
      out.add("posterior_chain");
    }
    return out;
  };
  const targetMuscles = expandMuscles([...target.muscles]);
  const shares = (e: (typeof EXERCISES)[number]) => {
    const em = expandMuscles([...e.muscles]);
    let n = 0;
    for (const m of em) if (targetMuscles.has(m)) n++;
    return n;
  };

  const candidates = EXERCISES.filter(
    (e) =>
      e.id !== exerciseId &&
      !usedExerciseIds.has(e.id) &&
      e.pattern === target.pattern &&
      !e.warmupTarget &&
      shares(e) > 0 &&
      e.equipment.some((eq) => available.has(eq))
  );

  const score = (e: (typeof EXERCISES)[number]) => {
    const weightedBonus = target.weighted && e.weighted ? 0.5 : 0;
    return shares(e) + weightedBonus;
  };

  return candidates
    .sort((a, b) => score(b) - score(a))
    .slice(0, count)
    .map((e) => e.id);
}
