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

export type Session = {
  id?: number;
  workoutId: string;
  category: Category;
  name: string;
  date: string;
  startedAt: number;
  finishedAt?: number;
  philosophy?: string;
  influences?: CoachInfluence[];
  modifiers?: WorkoutModifiers;
  blocks: LoggedBlock[];
};

export type Sex = "male" | "female" | "other" | "prefer_not_to_say";
export type Experience = "beginner" | "intermediate" | "advanced";

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
export type Intensity = "recovery" | "normal" | "push";

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
  onboarded?: boolean;
};

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
