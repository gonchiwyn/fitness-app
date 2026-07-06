import { format, getISOWeek } from "date-fns";
import { EXERCISES } from "./data/exercises";
import { isTemplateAtLevel, templatesFor, type Template } from "./data/templates";
import { lastSessionForExercise } from "./db";
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
function buildWarmup(
  profile: Profile,
  category: Category,
  modifiers: WorkoutModifiers,
  rng: () => number,
  available: Set<Equipment>
): Block {
  const targets = profile.focusAreas.length
    ? [...profile.focusAreas]
    : (["lower_back", "hip", "shoulder"] as const);

  // If a rehab zone is set, push it to the front to ensure coverage
  if (modifiers.rehab && !targets.includes(modifiers.rehab as never)) {
    (targets as unknown[]).unshift(modifiers.rehab);
  }

  const prescriptions: Prescription[] = [];

  const heartRaiserCandidates = ["easy_row", "easy_bike", "jumping_jacks", "jump_rope_continuous"]
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

  // Personalized: ALWAYS include scapular activation + glute activation
  // (psoas dominance + L-scap weakness — daily priming non-negotiable)
  if (time >= 30) {
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

      // Apply periodization wave: adjust sets on tracked lifts (main compounds)
      if (phase && LIFT_ID_SET.has(p.exerciseId) && phase.setAdjustment !== 0) {
        p = { ...p, sets: Math.max(1, p.sets + phase.setAdjustment) };
      }

      // Intensity mode also adjusts volume — makes readiness feel real, not cosmetic.
      // Push: +1 set on main lifts. Easy: -1 set on accessories (never below 2).
      if (intensity === "push" && LIFT_ID_SET.has(p.exerciseId)) {
        p = { ...p, sets: p.sets + 1 };
      } else if (intensity === "easy" && !LIFT_ID_SET.has(p.exerciseId) && p.sets > 2) {
        p = { ...p, sets: p.sets - 1 };
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
  const coreFocus = profile.coreFocus ?? "protection";
  const templateAlreadyHasCore = blocks.some((b) => b.title === "Core");
  if (targetMinutes >= 30 && !templateAlreadyHasCore) {
    const coreBlock = buildCoreBlock(coreFocus, category, available, rng, date);
    if (coreBlock) blocks.push(coreBlock);
  }

  if (["strength", "hypertrophy", "beach", "athlete"].includes(category) && targetMinutes >= 40) {
    blocks.push({
      id: `cooldown-${Date.now()}`,
      title: "Cooldown",
      scheme: "~5 min",
      prescriptions: [
        { exerciseId: "child_pose", sets: 1, reps: "60s" },
        { exerciseId: "couch_stretch", sets: 1, reps: "45s/side" },
        { exerciseId: "thread_needle", sets: 1, reps: "30s/side" },
      ].filter((p) => {
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
export function findSwapAlternatives(
  exerciseId: string,
  available: Set<Equipment>,
  count = 3,
  usedExerciseIds: Set<string> = new Set()
): string[] {
  const target = EXERCISES.find((e) => e.id === exerciseId);
  if (!target) return [];
  return EXERCISES.filter(
    (e) =>
      e.id !== exerciseId &&
      !usedExerciseIds.has(e.id) &&
      e.pattern === target.pattern &&
      e.equipment.some((eq) => available.has(eq))
  )
    .slice(0, count)
    .map((e) => e.id);
}
