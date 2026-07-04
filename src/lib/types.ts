export const CATEGORIES = [
  "crossfit",
  "hyrox",
  "surf",
  "stretching",
  "athlete",
  "strength",
  "hypertrophy",
  "burn",
  "recovery",
  "beach",
  "cardio",
  "core",
  "split",
  "test",
  "sport",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  crossfit: "CrossFit",
  hyrox: "Hyrox",
  surf: "Surf",
  stretching: "Stretching",
  athlete: "Athlete",
  strength: "Strength",
  hypertrophy: "Hypertrophy",
  burn: "Burn",
  recovery: "Recovery",
  beach: "Beach",
  cardio: "Cardio",
  core: "Core",
  split: "Split",
  test: "Test",
  sport: "Sport",
};

export const CATEGORY_BLURBS: Record<Category, string> = {
  crossfit: "Mixed modal — strength + metcon",
  hyrox: "Run + functional stations",
  surf: "Paddle power, rotation, balance",
  stretching: "Full-body mobility flow",
  athlete: "Power, agility, multi-plane",
  strength: "Heavy compounds, low rep",
  hypertrophy: "Volume + time under tension",
  burn: "High-intensity fat burn",
  recovery: "Easy aerobic + mobility",
  beach: "Aesthetic — arms, chest, core",
  cardio: "Zone 2 or intervals",
  core: "3-part Galpin protection + abs",
  split: "Bro split — pick your day (push/pull/legs/chest/back/etc.)",
  test: "Benchmark day — 1RMs, hangs, jumps, Cooper run",
  sport: "Log outside movement — tennis, football, swim, ski",
};

export const CATEGORY_DURATION: Record<Category, number> = {
  crossfit: 60,
  hyrox: 60,
  surf: 45,
  stretching: 25,
  athlete: 50,
  strength: 60,
  hypertrophy: 55,
  burn: 35,
  recovery: 30,
  beach: 45,
  cardio: 40,
  core: 25,
  split: 55,
  test: 75,
  sport: 60,
};

export type WarmupTarget = "lower_back" | "hip" | "shoulder" | "general";
export type Equipment =
  | "bodyweight"
  | "barbell"
  | "dumbbell"
  | "kettlebell"
  | "band"
  | "rower"
  | "bike"
  | "ski_erg"
  | "sled"
  | "box"
  | "pullup_bar"
  | "rings"
  | "machine"
  | "foam_roller"
  | "mat";

export type Pattern =
  | "squat"
  | "hinge"
  | "push"
  | "pull"
  | "carry"
  | "lunge"
  | "core"
  | "rotation"
  | "conditioning"
  | "mobility"
  | "plyometric";

// Core function tags (Galpin's 3 + a couple)
// anti_extension: dead bug, plank, ab wheel — resist spine extending
// anti_rotation: Pallof press, suitcase carry — resist twist
// anti_lateral_flexion: side plank, single-arm carry — resist sideways flex
// rotation: med ball throws, woodchop — produce twist
// isolation: crunches, leg raises — aesthetic focus, not protective
export type CoreFunction =
  | "anti_extension"
  | "anti_rotation"
  | "anti_lateral_flexion"
  | "rotation"
  | "isolation";

export type Exercise = {
  id: string;
  name: string;
  pattern: Pattern;
  muscles: string[];
  equipment: Equipment[];
  weighted: boolean;
  cues?: string[];
  // 2-3 sentence how-to for complex or uncommon movements.
  // Not shown by default — user taps "How to →" to expand.
  howTo?: string;
  warmupTarget?: WarmupTarget;
  coreFunction?: CoreFunction;
};

export type Scheme = "straight" | "amrap" | "emom" | "circuit" | "for_time" | "tabata" | "intervals";

export type Prescription = {
  exerciseId: string;
  sets: number;
  reps: string;
  rest?: string;
  rpe?: number;
  loadHint?: string;
  notes?: string;
  // Rotation pool: if set, generator picks ONE exerciseId from this list per session.
  // Same day/seed = same pick, so it's stable within a session but varies day-to-day.
  // Anchor exercises leave this undefined; accessories use pools for variety.
  pool?: string[];
};

export type Block = {
  id: string;
  title: string;
  scheme?: string;
  note?: string;
  prescriptions: Prescription[];
};

export type CoachInfluence = "galpin" | "attia" | "huberman" | "patrick" | "hemsworth" | "general";

export type Workout = {
  id: string;
  category: Category;
  name: string;
  date: string;
  estimatedDurationMin: number;
  blocks: Block[];
  seed: number;
  philosophy?: string;
  influences?: CoachInfluence[];
  modifiers?: WorkoutModifiers;
  phase?: CyclePhase;
};

export type LoggedSet = {
  weight?: number;
  reps?: number;
  durationSec?: number;
  distanceM?: number;
  rpe?: number;
  completed: boolean;
};

export type LoggedPrescription = {
  exerciseId: string;
  prescribedSets: number;
  prescribedReps: string;
  rpe?: number;
  rest?: string;
  loadHint?: string;
  prescriptionNotes?: string;
  sets: LoggedSet[];
  notes?: string;
};

export type LoggedBlock = {
  title: string;
  scheme?: string;
  note?: string;
  prescriptions: LoggedPrescription[];
};

// User's post-workout rating — how did it feel?
// Feeds the auto-regulation logic that adjusts next week's loads.
export type SessionRating = "easy" | "normal" | "hard";

export type Session = {
  id?: number;
  workoutId: string;
  category: Category;
  name: string;
  date: string;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  rating?: SessionRating;      // asked after "I did this ✓"
  philosophy?: string;
  influences?: CoachInfluence[];
  modifiers?: WorkoutModifiers;
  phase?: CyclePhase;
  // Focus block name at the time this session was saved. Used by the history
  // calendar to color consecutive days inside the same block the same shade,
  // so "2 months of Hypertrophy" reads as one continuous stripe.
  focusName?: string;
  // Optional: for the "Sport" category — tennis, football, swim etc.
  // Free-text so users aren't boxed in.
  sportName?: string;
  blocks: LoggedBlock[];
};

export type Sex = "male" | "female" | "other" | "prefer_not_to_say";
export type Experience = "beginner" | "intermediate" | "advanced";

// Per-category proficiency level. You might be Pro at lifting but Starter at Hyrox.
export type Level = "starter" | "comfortable" | "pro";

export const LEVEL_LABELS: Record<Level, string> = {
  starter: "Starter",
  comfortable: "Comfortable",
  pro: "Pro",
};

export const LEVEL_BLURBS: Record<Level, string> = {
  starter: "New to this — simpler, gentler sessions",
  comfortable: "Standard sessions across the range",
  pro: "Advanced sessions, complex movements, higher volume",
};

export const GOALS = [
  "longevity",
  "aesthetic",
  "strength",
  "athletic_performance",
  "endurance",
  "fat_loss",
  "general_fitness",
] as const;
export type Goal = (typeof GOALS)[number];

export const GOAL_LABELS: Record<Goal, string> = {
  longevity: "Longevity & healthspan",
  aesthetic: "Look better",
  strength: "Get stronger",
  athletic_performance: "Athletic performance",
  endurance: "Endurance",
  fat_loss: "Fat loss",
  general_fitness: "General fitness",
};

export type LiftId =
  | "bench_press"
  | "weighted_pullup"
  | "weighted_dip"
  | "back_squat"
  | "deadlift"
  | "overhead_press";

export const TRACKED_LIFTS: { id: LiftId; label: string }[] = [
  { id: "bench_press", label: "Bench press" },
  { id: "back_squat", label: "Back squat" },
  { id: "deadlift", label: "Deadlift" },
  { id: "weighted_pullup", label: "Weighted pull-up" },
  { id: "weighted_dip", label: "Weighted dip" },
  { id: "overhead_press", label: "Overhead press" },
];

export type LiftMax = {
  weight: number;
  reps: number;
};

export type Maxes = Partial<Record<LiftId, LiftMax>>;

export type RunBenchmark = {
  distanceKm: number;
  timeMinutes: number;
};

// ============================================================
// MODIFIERS — apply at generation time to adapt the workout
// ============================================================
// 3 modes — a gut choice, not a slider. Each shifts multiple dials at once.
export type Intensity = "easy" | "normal" | "push";

export const INTENSITY_LABELS: Record<Intensity, { label: string; sub: string }> = {
  easy: { label: "Easy", sub: "lighter, shorter rest" },
  normal: { label: "Normal", sub: "as planned" },
  push: { label: "Push", sub: "heavier, chase RPE 9" },
};

export const EQUIPMENT_PRESETS = [
  "full_gym",
  "home_gym",
  "hotel",
  "beach",
  "bodyweight_only",
  "custom",
] as const;
export type EquipmentPreset = (typeof EQUIPMENT_PRESETS)[number];

export const EQUIPMENT_PRESET_LABELS: Record<EquipmentPreset, string> = {
  full_gym: "Full gym",
  home_gym: "Home gym",
  hotel: "Hotel / travel",
  beach: "Beach / outdoor",
  bodyweight_only: "Bodyweight only",
  custom: "Custom",
};

export const EQUIPMENT_PRESET_INCLUDES: Record<EquipmentPreset, Equipment[]> = {
  full_gym: ["bodyweight", "barbell", "dumbbell", "kettlebell", "band", "rower", "bike", "ski_erg", "sled", "box", "pullup_bar", "rings", "machine", "foam_roller", "mat"],
  home_gym: ["bodyweight", "dumbbell", "kettlebell", "band", "pullup_bar", "mat", "foam_roller", "box"],
  hotel: ["bodyweight", "dumbbell", "band", "mat"],
  beach: ["bodyweight", "band", "mat"],
  bodyweight_only: ["bodyweight", "mat"],
  custom: [],
};

export type RehabZone = "shoulder" | "knee" | "lower_back" | "elbow" | "hip" | "neck";

export const REHAB_ZONE_LABELS: Record<RehabZone, string> = {
  shoulder: "Shoulder",
  knee: "Knee",
  lower_back: "Lower back",
  elbow: "Elbow",
  hip: "Hip",
  neck: "Neck",
};

export type WorkoutModifiers = {
  timeMinutes?: number;
  equipmentPreset?: EquipmentPreset;
  equipmentAvailable?: Equipment[];
  intensity?: Intensity;
  rehab?: RehabZone;
  templateId?: string;
};

// ============================================================
// BENCHMARKS — periodic tests you retest every 6-8 weeks
// ============================================================
export const BENCHMARK_TYPES = [
  "bench_1rm",
  "squat_1rm",
  "deadlift_1rm",
  "ohp_1rm",
  "pullup_max",
  "dead_hang_sec",
  "broad_jump_cm",
  "vertical_jump_cm",
  "farmer_carry_sec",
  "cooper_12min_m",
  "5k_time_sec",
  "plank_sec",
] as const;
export type BenchmarkType = (typeof BENCHMARK_TYPES)[number];

export type BenchmarkMeta = {
  label: string;
  unit: string;
  higherIsBetter: boolean;
  group: "strength" | "power" | "endurance" | "mobility";
  description: string;
};

// Which benchmark does a given exercise map to when used in a Test-category workout?
export const EXERCISE_TO_BENCHMARK: Record<string, BenchmarkType> = {
  bench_press: "bench_1rm",
  back_squat: "squat_1rm",
  deadlift: "deadlift_1rm",
  overhead_press: "ohp_1rm",
  pullup: "pullup_max",
  weighted_pullup: "pullup_max",
  chinup: "pullup_max",
  broad_jump: "broad_jump_cm",
  seated_box_jump: "vertical_jump_cm",
  box_jump: "vertical_jump_cm",
  farmer_carry: "farmer_carry_sec",
  run: "cooper_12min_m",
  plank: "plank_sec",
};

export const BENCHMARK_META: Record<BenchmarkType, BenchmarkMeta> = {
  bench_1rm: { label: "Bench press 1RM", unit: "kg", higherIsBetter: true, group: "strength", description: "Max weight × 1 rep" },
  squat_1rm: { label: "Back squat 1RM", unit: "kg", higherIsBetter: true, group: "strength", description: "Max weight × 1 rep" },
  deadlift_1rm: { label: "Deadlift 1RM", unit: "kg", higherIsBetter: true, group: "strength", description: "Max weight × 1 rep" },
  ohp_1rm: { label: "Overhead press 1RM", unit: "kg", higherIsBetter: true, group: "strength", description: "Strict press, no leg drive" },
  pullup_max: { label: "Max strict pull-ups", unit: "reps", higherIsBetter: true, group: "strength", description: "Dead hang start, chin over bar, unbroken" },
  dead_hang_sec: { label: "Dead hang", unit: "sec", higherIsBetter: true, group: "strength", description: "Passive hang, straight arms, feet off ground" },
  broad_jump_cm: { label: "Broad jump", unit: "cm", higherIsBetter: true, group: "power", description: "Standing, both feet, distance from take-off line" },
  vertical_jump_cm: { label: "Vertical jump", unit: "cm", higherIsBetter: true, group: "power", description: "Reach standing vs reach at jump apex" },
  farmer_carry_sec: { label: "Farmer carry (bodyweight × 2)", unit: "sec", higherIsBetter: true, group: "strength", description: "Hold heaviest DBs/KBs = your bodyweight, walk or stand, longest time" },
  cooper_12min_m: { label: "Cooper 12-min run", unit: "m", higherIsBetter: true, group: "endurance", description: "Distance covered in 12 minutes at max sustainable pace" },
  "5k_time_sec": { label: "5k time", unit: "sec", higherIsBetter: false, group: "endurance", description: "Best 5km run time" },
  plank_sec: { label: "Plank hold", unit: "sec", higherIsBetter: true, group: "strength", description: "Straight line, elbows under shoulders, no sagging" },
};

export type Benchmark = {
  id?: number;
  date: string;      // yyyy-MM-dd
  type: BenchmarkType;
  value: number;
  notes?: string;
};

// 7-element array, index 0 = Monday, 6 = Sunday
// null means "rest day"
// PlannedDay can lock a specific template within the category, or leave it for rotation.
export type PlannedDay = {
  category: Category;
  templateId?: string;
} | null;

export type WeeklyPlan = {
  id: "me";
  // Stored as PlannedDay[]. Old format (Category string) is migrated at read time.
  days: PlannedDay[];
};

// Backward-compat normalizer: old data stored bare Category strings
export function normalizePlannedDay(d: unknown): PlannedDay {
  if (d === null || d === undefined) return null;
  if (typeof d === "string") return { category: d as Category };
  if (typeof d === "object" && d !== null && "category" in d) return d as PlannedDay;
  return null;
}

export const DAY_LABELS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const DAY_LABELS_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

// Convert JS Date.getDay() (0=Sun..6=Sat) to plan index (0=Mon..6=Sun)
export function dateToPlanIndex(d: Date): number {
  const js = d.getDay();
  return (js + 6) % 7;
}

export type Profile = {
  id: "me";
  name: string;
  units: "kg" | "lb";
  focusAreas: WarmupTarget[];
  age?: number;
  heightCm?: number;
  weightKg?: number;
  sex?: Sex;
  experience?: Experience;
  workoutHistory?: string;
  injuryHistory?: string;
  goals?: Goal[];
  maxes?: Maxes;
  runBenchmark?: RunBenchmark;
  defaultEquipment?: EquipmentPreset;
  coreFocus?: CoreFocus;
  otherCommitments?: string;
  currentGoal?: string;
  levels?: Partial<Record<Category, Level>>;
  // Periodization — 4-week wave: base → +3% → +6% → deload
  periodizationEnabled?: boolean;
  programStartDate?: string;
  // Named focus block (e.g. "Hypertrophy month", "Cardio base") — the last preset
  // the user applied. Surfaces on Home as an anchor: "Focus: Hypertrophy · Week 2 of 4"
  currentFocus?: {
    name: string;
    startedAt: string;   // yyyy-MM-dd
    durationWeeks: number;
  };
  // Currently-active issues — drives injury swaps in the generator.
  // Text `injuryHistory` above is just context/description.
  activeConcerns?: RehabZone[];
  // Chronic lumbar care — always-on emphasis without blanket swaps.
  // Caps intensity on hinge/squat, always includes glute activation in warmup.
  // Does NOT swap back squat / OHP wholesale.
  chronicLumbarCare?: boolean;
  onboarded?: boolean;
};

export type CyclePhase = {
  weekInCycle: 1 | 2 | 3 | 4;
  label: string;
  description: string;
  intensityMultiplier: number;
  setAdjustment: number;
};

export function getCurrentCyclePhase(startDate: string, today: Date = new Date()): CyclePhase {
  const start = new Date(startDate + "T00:00:00");
  const daysSince = Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86400000));
  const weeksSince = Math.floor(daysSince / 7);
  const weekInCycle = ((weeksSince % 4) + 1) as 1 | 2 | 3 | 4;
  const PHASES: Record<1 | 2 | 3 | 4, CyclePhase> = {
    1: { weekInCycle: 1, label: "Base", description: "Establish baseline volume + intensity", intensityMultiplier: 1.0, setAdjustment: 0 },
    2: { weekInCycle: 2, label: "Build", description: "+3% intensity — slightly heavier than last week", intensityMultiplier: 1.03, setAdjustment: 0 },
    3: { weekInCycle: 3, label: "Peak", description: "+6% intensity, +1 set on main lifts — biggest week", intensityMultiplier: 1.06, setAdjustment: 1 },
    4: { weekInCycle: 4, label: "Deload", description: "Cut intensity 15%, reduce a set — CNS recovery", intensityMultiplier: 0.85, setAdjustment: -1 },
  };
  return PHASES[weekInCycle];
}

export type CoreFocus = "off" | "protection" | "aesthetic" | "both";

export const CORE_FOCUS_LABELS: Record<CoreFocus, string> = {
  off: "Off",
  protection: "Protection (Galpin 3-part)",
  aesthetic: "Aesthetic abs",
  both: "Both — protection + aesthetic",
};

export const CORE_FOCUS_DESCRIPTIONS: Record<CoreFocus, string> = {
  off: "No core block added.",
  protection: "Galpin-style: rotates anti-extension, anti-rotation, anti-lateral-flexion across days. Protects the lumbar.",
  aesthetic: "Visual abs focus — hanging leg raises, crunches, isolation.",
  both: "Two protection moves + one aesthetic move per session.",
};
