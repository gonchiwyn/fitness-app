import { format } from "date-fns";
import { EXERCISES } from "./data/exercises";
import { templatesFor, type Template } from "./data/templates";
import { lastSessionForExercise } from "./db";
import {
  CATEGORY_DURATION,
  CATEGORY_LABELS,
  EQUIPMENT_PRESET_INCLUDES,
  TRACKED_LIFTS,
  type Block,
  type Category,
  type CoreFocus,
  type CoreFunction,
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
  } else if (category === "hyrox") {
    base = 60;
  } else if (rpe && rpe >= 8) {
    base = 70;
  }

  if (base === null) return null;
  if (intensity === "recovery") base -= 15;
  else if (intensity === "push") base += 5;
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

function parseInjuries(text?: string): Set<InjuryFlag> {
  const flags = new Set<InjuryFlag>();
  if (!text) return flags;
  const t = text.toLowerCase();
  if (/(knee|patellar|meniscus|acl|mcl|rodilla)/.test(t)) flags.add("knee");
  if (/(shoulder|rotator|cuff|labr|impinge|ac joint|hombro|manguito)/.test(t)) flags.add("shoulder");
  if (/(lower back|low back|lumbar|disc|sciatic|herni|spine|espalda|lumbar)/.test(t)) flags.add("lower_back");
  if (/(elbow|tennis elbow|golfer|codo)/.test(t)) flags.add("elbow");
  if (/(\bhip\b|labrum|fai|cadera)/.test(t)) flags.add("hip");
  if (/(neck|cervical|cuello)/.test(t)) flags.add("neck");
  return flags;
}

const INJURY_SWAPS: Record<InjuryFlag, Record<string, string>> = {
  knee: {
    back_squat: "leg_press",
    front_squat: "leg_press",
    box_jump: "kb_swing",
    broad_jump: "kb_swing",
    depth_jump_24: "kb_swing",
    depth_jump_30: "kb_swing",
    sprint: "easy_bike",
    walking_lunge: "leg_press",
    bulgarian_split_squat: "leg_press",
  },
  shoulder: {
    overhead_press: "incline_db_press",
    snatch_balance: "front_squat",
    bhn_push_press: "front_squat",
    overhead_squat: "front_squat",
    weighted_pullup: "lat_pulldown",
    pullup: "lat_pulldown",
    weighted_dip: "db_bench",
    bench_press: "incline_db_press",
  },
  lower_back: {
    deadlift: "romanian_deadlift",
    barbell_row: "seated_row",
    power_clean: "kb_swing",
    hang_clean: "kb_swing",
    hang_clean_below_knee: "kb_swing",
    clean_and_jerk: "kb_swing",
    back_squat: "leg_press",
  },
  elbow: {
    pullup: "lat_pulldown",
    weighted_pullup: "lat_pulldown",
    chinup: "lat_pulldown",
    db_curl: "hammer_curl",
  },
  hip: {
    back_squat: "leg_press",
    deadlift: "romanian_deadlift",
  },
  neck: {
    bhn_push_press: "overhead_press",
    snatch_balance: "front_squat",
  },
};

function applyInjurySwaps(p: Prescription, flags: Set<InjuryFlag>, availableEquipment: Set<Equipment>): Prescription {
  for (const flag of flags) {
    const swap = INJURY_SWAPS[flag]?.[p.exerciseId];
    if (!swap) continue;
    const swapEx = EXERCISES.find((e) => e.id === swap);
    if (!swapEx) continue;
    if (!swapEx.equipment.some((eq) => availableEquipment.has(eq))) continue;
    return {
      ...p,
      exerciseId: swap,
      notes: [p.notes, `Swapped for ${flag.replace("_", " ")} consideration`].filter(Boolean).join(" · "),
    };
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

function findEquipmentAlternative(exerciseId: string, available: Set<Equipment>, rng: () => number): string | null {
  const target = EXERCISES.find((e) => e.id === exerciseId);
  if (!target) return null;
  if (target.equipment.some((eq) => available.has(eq))) return null; // OK as-is

  const candidates = shuffle(
    EXERCISES.filter(
      (e) =>
        e.id !== exerciseId &&
        e.pattern === target.pattern &&
        e.weighted === target.weighted &&
        e.equipment.some((eq) => available.has(eq))
    ),
    rng
  );
  return candidates[0]?.id ?? null;
}

function adaptToEquipment(p: Prescription, available: Set<Equipment>, rng: () => number): Prescription | null {
  const target = EXERCISES.find((e) => e.id === p.exerciseId);
  if (!target) return p;
  if (target.equipment.some((eq) => available.has(eq))) return p;

  const alt = findEquipmentAlternative(p.exerciseId, available, rng);
  if (!alt) return null; // can't adapt; drop
  return {
    ...p,
    exerciseId: alt,
    notes: [p.notes, `Adapted from ${target.name} for available equipment`].filter(Boolean).join(" · "),
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

  // Rotate protection function across days to hit all three weekly
  // Day-of-month seed makes it deterministic and predictable
  const protectionRotation: CoreFunction[] = ["anti_extension", "anti_rotation", "anti_lateral_flexion"];
  const dayIdx = date.getDate() % 3;
  const primary = protectionRotation[dayIdx];
  const secondary = protectionRotation[(dayIdx + 1) % 3];

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

  return {
    id: `warmup-${Date.now()}`,
    title: "Warmup",
    scheme: time < 30 ? "~5 min — focused" : "~8-10 min — lower back, hips, shoulders",
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
  intensity: Intensity
): Promise<string | undefined> {
  const exId = prescription.exerciseId;
  const units = profile.units;

  if (LIFT_ID_SET.has(exId) && profile.maxes) {
    const oneRm = getEstimatedOneRm(profile, exId as LiftId);
    if (oneRm) {
      const pct = targetPercentForCategory(category, prescription.reps, prescription.rpe, intensity);
      if (pct) {
        const target = roundToIncrement((oneRm * pct) / 100, units);
        return `Target ${target}${units} (~${pct}% of est. 1RM ${oneRm}${units})`;
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
  if (
    intensity === "push" &&
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
export async function generateWorkout(
  category: Category,
  profile: Profile,
  seedDate?: Date,
  modifiers: WorkoutModifiers = {}
): Promise<Workout> {
  const date = seedDate ?? new Date();
  const intensity = modifiers.intensity ?? "normal";
  const targetMinutes = modifiers.timeMinutes ?? CATEGORY_DURATION[category];

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

  const templates = templatesFor(category);
  if (templates.length === 0) {
    throw new Error(`No templates for category ${category}`);
  }
  // Locked template (from Plan day) takes precedence over rotation
  const lockedTemplate = modifiers.templateId
    ? templates.find((t) => t.id === modifiers.templateId)
    : undefined;
  const template = lockedTemplate ?? pickTemplate(templates, profile, rng);

  const injuryFlags = parseInjuries(profile.injuryHistory);
  if (modifiers.rehab) injuryFlags.add(modifiers.rehab);

  let blocks: Block[] = [buildWarmup(profile, category, modifiers, rng, available)];

  for (let i = 0; i < template.blocks.length; i++) {
    const b = template.blocks[i];
    const enriched: Prescription[] = [];
    for (const rawP of b.prescriptions) {
      let p: Prescription | null = applyInjurySwaps(rawP, injuryFlags, available);
      p = adaptToEquipment(p, available, rng);
      if (!p) continue; // dropped
      const loadHint = (await buildLoadHint(p, profile, category, intensity)) ?? p.loadHint;
      p = { ...p, loadHint };
      if (category === "cardio") p = tuneCardioPrescription(p, profile);
      enriched.push(p);
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
    modifiers,
  };
}

function buildWorkoutName(category: Category, templateName: string, m: WorkoutModifiers): string {
  const tags: string[] = [];
  if (m.timeMinutes) tags.push(`${m.timeMinutes}m`);
  if (m.intensity && m.intensity !== "normal") tags.push(m.intensity === "recovery" ? "Easy" : "Push");
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
  count = 3
): string[] {
  const target = EXERCISES.find((e) => e.id === exerciseId);
  if (!target) return [];
  return EXERCISES.filter(
    (e) =>
      e.id !== exerciseId &&
      e.pattern === target.pattern &&
      e.equipment.some((eq) => available.has(eq))
  )
    .slice(0, count)
    .map((e) => e.id);
}
