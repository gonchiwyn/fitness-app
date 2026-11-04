// Stats engine for the Profile page. Deliberately pure functions so they're
// easy to test: in → sessions + period, out → tiles the UI renders. If a new
// KPI is asked for, add a computeX() here, not inside the page.
import { EXERCISES_BY_ID } from "./data/exercises";
import type {
  Benchmark,
  BenchmarkType,
  Category,
  CompletedBlock,
  Profile,
  Session,
} from "./types";
import { BENCHMARK_META } from "./types";

export type Period = "week" | "month" | "year" | "all";

export const PERIOD_LABELS: Record<Period, string> = {
  week: "Week",
  month: "Month",
  year: "Year",
  all: "All time",
};

/** yyyy-MM-dd bounds (inclusive) of the given period relative to `today`. */
export function periodRange(period: Period, today: Date = new Date()): { from: string; to: string } {
  const to = today.toISOString().slice(0, 10);
  const from = new Date(today);
  if (period === "week") from.setDate(from.getDate() - 6);
  else if (period === "month") from.setDate(from.getDate() - 29);
  else if (period === "year") from.setDate(from.getDate() - 364);
  else from.setFullYear(2000); // all-time
  return { from: from.toISOString().slice(0, 10), to };
}

// Km parser for cardio rep strings like "400m", "1000m", "5 km", "10km", "21.1 km".
// Returns 0 when nothing matches.
export function parseKmFromReps(reps: string | undefined): number {
  if (!reps) return 0;
  const km = reps.match(/(\d+(?:\.\d+)?)\s*km/i);
  if (km) return parseFloat(km[1]);
  const m = reps.match(/(\d+(?:\.\d+)?)\s*m\b/i);
  if (m) return parseFloat(m[1]) / 1000;
  return 0;
}

// Minutes parser for cardio/duration rep strings like "45 min Z2", "3 min easy",
// "90s" (treated as minutes only when it says min/mins/minutes).
export function parseMinutesFromReps(reps: string | undefined): number {
  if (!reps) return 0;
  const mins = reps.match(/(\d+(?:\.\d+)?)\s*min/i);
  if (mins) return parseFloat(mins[1]);
  return 0;
}

export type Stats = {
  workouts: number;
  byCategory: { category: Category; count: number }[];
  km: number;
  kmByIntensity: { easy: number; moderate: number; hard: number };
  minutes: number;
  streakDays: number;
  periodDays: number;
};

// --- Cardio modality + pace estimation ------------------------------------
// When a cardio session doesn't have actualKm set, we estimate km from
// (modality × minutes × user's running pace). The pace multiplier for each
// modality is anchored to the user's running Z2 pace; bike and row are
// faster in km/hr terms by roughly stable ratios. These ratios are rough
// Z2-pace norms for a general-fitness adult; good enough for estimation.
type CardioModality = "run" | "bike" | "row" | "mixed";

const CARDIO_SPEED_RATIO: Record<CardioModality, number> = {
  run: 1,       // baseline = user's running Z2 pace
  bike: 2,      // Z2 biking is roughly 2× running speed (km/hr)
  row: 1.3,     // Z2 rowing is roughly 1.3× running speed
  mixed: 1,     // default to running pace if we can't tell
};

/** Classify a session's cardio modality from its exercises. */
export function cardioModalityForSession(session: Session): CardioModality {
  let run = 0, bike = 0, row = 0;
  for (const b of session.blocks ?? []) {
    for (const p of b.prescriptions ?? []) {
      const id = p.exerciseId;
      if (id === "run" || id === "sprint") run++;
      else if (id === "easy_bike" || id === "bike_erg") bike++;
      else if (id === "easy_row" || id === "row_500" || id === "ski_erg") row++;
    }
  }
  if (run > bike && run > row) return "run";
  if (bike > run && bike > row) return "bike";
  if (row > run && row > bike) return "row";
  if (run === 0 && bike === 0 && row === 0) return "mixed";
  return "mixed";
}

/** User's running Z2 pace in minutes/km. Fallback: 5:40/km (hybrid-athlete baseline). */
export function runPaceMinPerKm(profile: Profile | null | undefined): number {
  // runBenchmark is a "solid effort" (tempo-ish). Z2 pace is ~85% of that speed
  // → ~18% slower pace (per typical polarized-training math).
  const rb = profile?.runBenchmark;
  if (rb && rb.distanceKm > 0 && rb.timeMinutes > 0) {
    const tempoMinPerKm = rb.timeMinutes / rb.distanceKm;
    return tempoMinPerKm * 1.18;
  }
  return 5.67; // 5:40/km default — matches the user's stated Z2 pace
}

/** Estimate km covered in a cardio session when `actualKm` wasn't logged.
 *  Uses the modality + minutes-in-prescriptions + the user's running pace. */
export function estimateKmForCardioSession(session: Session, profile: Profile | null | undefined): number {
  let minutes = 0;
  for (const b of session.blocks ?? []) {
    for (const p of b.prescriptions ?? []) {
      // Count km that are explicitly in the reps string first — don't double
      // count a "5km run" as both km AND time.
      const explicitKm = parseKmFromReps(p.prescribedReps);
      if (explicitKm > 0) return explicitKm * (p.prescribedSets ?? 1);
      minutes += parseMinutesFromReps(p.prescribedReps) * (p.prescribedSets ?? 1);
    }
  }
  if (minutes === 0) return 0;
  const modality = cardioModalityForSession(session);
  const runPace = runPaceMinPerKm(profile);          // min/km
  const modalityPaceMinPerKm = runPace / CARDIO_SPEED_RATIO[modality];
  return minutes / modalityPaceMinPerKm;
}

// Intensity bucket inferred from the session's reps/template. Simple keyword
// classifier — "Z2" / "easy" / "long" → easy, "tempo" / "moderate" / "race pace"
// → moderate, "VO2" / "4x4" / "intervals" / "hard" / "sprint" → hard.
export function cardioIntensityForSession(session: Session): "easy" | "moderate" | "hard" {
  const tid = session.modifiers?.templateId ?? "";
  const repsBlob = (session.blocks ?? [])
    .flatMap((b) => b.prescriptions ?? [])
    .map((p) => p.prescribedReps ?? "")
    .join(" ")
    .toLowerCase();
  const hayStack = (tid + " " + repsBlob).toLowerCase();
  if (/vo2|4x4|intervals|sprint|\bhard\b/.test(hayStack)) return "hard";
  if (/tempo|moderate|race pace|threshold/.test(hayStack)) return "moderate";
  return "easy"; // Z2 / long / easy / unlabeled default to easy
}

/** Current day-streak: consecutive training days. One day of grace: if today
 *  has no session yet we start counting from yesterday, so an active streak
 *  doesn't read "0" just because it's 9am and you haven't trained yet. */
export function computeStreakDays(sessions: Session[], today: Date = new Date()): number {
  const finished = sessions.filter((s) => s.finishedAt);
  if (finished.length === 0) return 0;
  const dates = new Set(finished.map((s) => s.date));
  const todayStr = today.toISOString().slice(0, 10);
  const cursor = new Date(today);
  // If no session today, step back one day — we grant until end-of-day today.
  if (!dates.has(todayStr)) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Rough duration in minutes for a single session. Priority:
 *  1) real elapsed (finishedAt - startedAt) if plausibly in session range,
 *  2) sum of cardio prescription minutes (for cardio only),
 *  3) category default. */
function sessionDurationMinutes(s: Session): number {
  if (s.finishedAt && s.startedAt) {
    const elapsedMin = (s.finishedAt - s.startedAt) / 60000;
    if (elapsedMin >= 10 && elapsedMin <= 180) return elapsedMin;
  }
  if (s.category === "cardio") {
    let m = 0;
    for (const b of s.blocks ?? []) {
      for (const p of b.prescriptions ?? []) {
        m += parseMinutesFromReps(p.prescribedReps) * (p.prescribedSets ?? 1);
      }
    }
    if (m > 0) return m;
  }
  // Category defaults — rough but useful for Spotify-Wrapped stats.
  if (s.category === "stretching" || s.category === "recovery" || s.category === "core") return 20;
  if (s.category === "burn") return 30;
  if (s.category === "sport") return 60;
  return 45; // strength/hypertrophy/split/hyrox/athlete/surf default
}

export function computeStats(
  sessions: Session[],
  period: Period,
  today: Date = new Date(),
  profile: Profile | null | undefined = null
): Stats {
  const { from, to } = periodRange(period, today);
  const inPeriod = sessions.filter(
    (s) => s.finishedAt && s.date >= from && s.date <= to
  );

  const categoryCounts = new Map<Category, number>();
  let km = 0;
  const kmByIntensity = { easy: 0, moderate: 0, hard: 0 };
  let minutes = 0;
  for (const s of inPeriod) {
    categoryCounts.set(s.category, (categoryCounts.get(s.category) ?? 0) + 1);
    // Count minutes for ALL sessions, not just cardio — the "total time trained"
    // KPI should include strength + stretching + sport too.
    minutes += sessionDurationMinutes(s);
    if (s.category === "cardio") {
      // Km priority: 1) user-entered actualKm, 2) modality-aware estimation
      // (run pace, bike/row speed ratios), 3) parsed km from reps.
      const sessionKm =
        typeof s.actualKm === "number" && s.actualKm > 0
          ? s.actualKm
          : estimateKmForCardioSession(s, profile);
      km += sessionKm;
      const intensity = cardioIntensityForSession(s);
      kmByIntensity[intensity] += sessionKm;
    }
  }

  const byCategory = [...categoryCounts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // Period length for context ("3 workouts in 7 days").
  const periodDays =
    period === "week" ? 7 :
    period === "month" ? 30 :
    period === "year" ? 365 :
    Math.max(1, Math.ceil((Date.now() - new Date("2000-01-01").getTime()) / 86400000));

  return {
    workouts: inPeriod.length,
    byCategory,
    km: Math.round(km * 10) / 10,
    kmByIntensity: {
      easy: Math.round(kmByIntensity.easy * 10) / 10,
      moderate: Math.round(kmByIntensity.moderate * 10) / 10,
      hard: Math.round(kmByIntensity.hard * 10) / 10,
    },
    minutes: Math.round(minutes),
    streakDays: computeStreakDays(sessions, today),
    periodDays,
  };
}

// --- Milestone badges ------------------------------------------------------
// A badge has a target value and a current value. UI shows locked (progress
// bar) until current >= target. Each milestone is cheap to compute from the
// stats bundle + completedBlocks so we don't re-scan sessions per badge.
export type Milestone = {
  id: string;
  label: string;
  icon: string;          // single emoji, chosen for legibility at 32px
  target: number;
  current: number;
  unit: string;          // "workouts", "km", "days"...
};

export function computeMilestones(allSessions: Session[], blocks: CompletedBlock[]): Milestone[] {
  const finished = allSessions.filter((s) => s.finishedAt);
  const allTimeStats = computeStats(allSessions, "all");
  const longestSession = finished.reduce((max, s) => {
    const sessionMinutes = (s.blocks ?? []).reduce((acc, b) => acc + (b.prescriptions ?? []).reduce((a, p) => a + parseMinutesFromReps(p.prescribedReps) * (p.prescribedSets ?? 1), 0), 0);
    return Math.max(max, sessionMinutes);
  }, 0);

  // Hard-earned stuff only — the kind you train toward, not "did you open
  // the app". Beginner achievements (first block, 10 workouts, 7-day streak)
  // live in the completed-blocks wall and the baseline streak counter instead.
  const streak = computeStreakDays(allSessions);
  return [
    { id: "wk_100",      label: "100 workouts",     icon: "💯", target: 100, current: allTimeStats.workouts,        unit: "workouts" },
    { id: "wk_250",      label: "250 workouts",     icon: "⚔️", target: 250, current: allTimeStats.workouts,        unit: "workouts" },
    { id: "wk_500",      label: "500 workouts",     icon: "🗿", target: 500, current: allTimeStats.workouts,        unit: "workouts" },
    { id: "km_250",      label: "250 km logged",    icon: "🚀", target: 250, current: Math.round(allTimeStats.km),  unit: "km" },
    { id: "km_1000",     label: "1000 km logged",   icon: "🌍", target: 1000,current: Math.round(allTimeStats.km),  unit: "km" },
    { id: "long_90",     label: "90+ min session",  icon: "🫁", target: 90,  current: Math.round(longestSession),   unit: "min" },
    { id: "streak_30",   label: "30-day streak",    icon: "🔥", target: 30,  current: streak,                       unit: "days" },
    { id: "streak_100",  label: "100-day streak",   icon: "🌋", target: 100, current: streak,                       unit: "days" },
    { id: "blocks_3",    label: "3 blocks finished",icon: "🏆", target: 3,   current: blocks.length,                unit: "blocks" },
    { id: "blocks_10",   label: "10 blocks finished",icon: "👑",target: 10,  current: blocks.length,                unit: "blocks" },
  ];
}

// --- Athlete archetype -----------------------------------------------------
// A 30k-foot read on how you've been training. Rules-based (no ML), driven
// by the share of each training "modality" over the period. Updates as your
// mix shifts — do a hypertrophy block and you'll drift toward "Pure Lifter",
// start running and you'll become a "Hybrid Athlete".
export type Archetype = {
  name: string;
  tagline: string;
  icon: string;
  dominantModality: string;
};

const CATEGORY_MODALITY: Record<string, string> = {
  strength: "strength",
  hypertrophy: "strength",
  split: "strength",
  hyrox: "functional",
  burn: "functional",
  athlete: "functional",
  cardio: "cardio",
  surf: "sport",
  beach: "sport",
  sport: "sport",
  core: "recovery",
  stretching: "recovery",
  recovery: "recovery",
  test: "test",
};

export function computeArchetype(sessions: Session[], period: Period = "all", today: Date = new Date()): Archetype {
  const { from, to } = periodRange(period, today);
  const inPeriod = sessions.filter(
    (s) => s.finishedAt && s.date >= from && s.date <= to
  );

  if (inPeriod.length < 5) {
    return {
      name: "New Athlete",
      tagline: "Log more sessions to unlock your archetype.",
      icon: "🌱",
      dominantModality: "none",
    };
  }

  const modalityCounts = new Map<string, number>();
  for (const s of inPeriod) {
    const m = CATEGORY_MODALITY[s.category] ?? "other";
    modalityCounts.set(m, (modalityCounts.get(m) ?? 0) + 1);
  }
  const total = inPeriod.length;
  const share = (m: string) => (modalityCounts.get(m) ?? 0) / total;

  const strength = share("strength");
  const cardio = share("cardio");
  const functional = share("functional");
  const sport = share("sport");
  const recovery = share("recovery");

  if (sport >= 0.4) {
    return { name: "Sport Specialist", tagline: "Training around a sport, not around the gym.", icon: "🏄", dominantModality: "sport" };
  }
  if (functional >= 0.4) {
    return { name: "Functional Athlete", tagline: "Hyrox-, CrossFit-style — mixed modal, race-adjacent.", icon: "⚡", dominantModality: "functional" };
  }
  if (recovery >= 0.5) {
    return { name: "In Recovery", tagline: "Mobility and easy work dominate — on purpose or forced.", icon: "🧘", dominantModality: "recovery" };
  }
  if (strength >= 0.6) {
    return { name: "Pure Lifter", tagline: "Barbell-forward. Cardio takes a back seat.", icon: "🏋️", dominantModality: "strength" };
  }
  if (cardio >= 0.6) {
    return { name: "Endurance Athlete", tagline: "Engine-first. Time on feet is the currency.", icon: "🏃", dominantModality: "cardio" };
  }
  if (strength >= 0.3 && cardio >= 0.3) {
    return { name: "Hybrid Athlete", tagline: "Lifting heavy and running long. Hard to kill.", icon: "💪", dominantModality: "hybrid" };
  }
  return { name: "Generalist", tagline: "Spread across modalities — broadly capable, specialized in nothing.", icon: "🎯", dominantModality: "generalist" };
}

// --- Muscle coverage -------------------------------------------------------
// Aggregates set count per muscle group over the period. Specific muscles
// are collapsed into high-level groups so the chart doesn't become 20 bars
// of "front_delt / side_delt / rear_delt".
export type MuscleBucket = { group: string; label: string; sets: number };

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  chest: "Chest",
  back: "Back",
  shoulder: "Shoulders",
  arms: "Arms",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  core: "Core",
  traps: "Traps",
};
const MUSCLE_TO_GROUP: Record<string, string> = {
  chest: "chest", upper_chest: "chest",
  back: "back", lats: "back", posterior_chain: "back",
  shoulder: "shoulder", front_delt: "shoulder", side_delt: "shoulder", rear_delt: "shoulder", rotator_cuff: "shoulder",
  biceps: "arms", tris: "arms", triceps: "arms", forearms: "arms", grip: "arms",
  quads: "quads",
  hamstrings: "hamstrings",
  glutes: "glutes", hip: "glutes",
  calves: "calves", ankle: "calves",
  core: "core", abs: "core", obliques: "core", lower_back: "core",
  traps: "traps",
};

export function computeMuscleCoverage(sessions: Session[], period: Period, today: Date = new Date()): MuscleBucket[] {
  const { from, to } = periodRange(period, today);
  const inPeriod = sessions.filter((s) => s.finishedAt && s.date >= from && s.date <= to);

  const setsByGroup = new Map<string, number>();
  for (const s of inPeriod) {
    for (const b of s.blocks ?? []) {
      // Skip warmup/cooldown — they're prep, not training volume.
      if (b.title === "Warmup" || b.title === "Cooldown") continue;
      for (const p of b.prescriptions ?? []) {
        const ex = EXERCISES_BY_ID[p.exerciseId];
        if (!ex) continue;
        const sets = p.prescribedSets ?? 1;
        // Weight each muscle equally — if deadlift hits "posterior_chain",
        // that's 1 set credited to the Back group.
        const groups = new Set<string>();
        for (const m of ex.muscles ?? []) {
          const g = MUSCLE_TO_GROUP[m];
          if (g) groups.add(g);
        }
        for (const g of groups) {
          setsByGroup.set(g, (setsByGroup.get(g) ?? 0) + sets);
        }
      }
    }
  }

  return Object.keys(MUSCLE_GROUP_LABELS)
    .map((g) => ({ group: g, label: MUSCLE_GROUP_LABELS[g], sets: setsByGroup.get(g) ?? 0 }))
    .sort((a, b) => b.sets - a.sets);
}

// Delta vs the equivalent previous period. Used to show "Chest +4" / "Back −6"
// next to each muscle bar so the user sees trajectory, not just level.
export function computeMuscleDeltas(
  sessions: Session[],
  period: Period,
  today: Date = new Date()
): Record<string, number> {
  // Compute the "previous" window of equivalent length ending the day before
  // the current window starts.
  const { from } = periodRange(period, today);
  const prevEnd = new Date(from + "T00:00:00");
  prevEnd.setDate(prevEnd.getDate() - 1);
  const previous = computeMuscleCoverage(sessions, period, prevEnd);
  const current = computeMuscleCoverage(sessions, period, today);
  const deltas: Record<string, number> = {};
  for (const c of current) {
    const p = previous.find((x) => x.group === c.group);
    deltas[c.group] = c.sets - (p?.sets ?? 0);
  }
  return deltas;
}

// --- Attia 4 pillars -------------------------------------------------------
// Peter Attia's weekly non-negotiables for longevity. Targets are fixed per
// week; when period ≠ "week" we normalize (target × periodDays/7) so the
// ring reads correctly on monthly/yearly views.
export type Pillar = {
  id: "z2" | "vo2" | "strength" | "stability";
  label: string;
  current: number;
  target: number;
  unit: string;
};

const STRENGTH_CATEGORIES = new Set<Category>(["strength", "hypertrophy", "split", "hyrox", "athlete"]);
const STABILITY_CATEGORIES = new Set<Category>(["core", "stretching", "recovery"]);

export function computeAttiaPillars(
  sessions: Session[],
  period: Period,
  profile: Profile | null | undefined = null,
  today: Date = new Date()
): Pillar[] {
  const { from, to } = periodRange(period, today);
  const inPeriod = sessions.filter(
    (s) => s.finishedAt && s.date >= from && s.date <= to
  );
  const weeksInPeriod =
    period === "week" ? 1 :
    period === "month" ? 4 :
    period === "year" ? 52 :
    Math.max(1, Math.round((today.getTime() - new Date("2000-01-01").getTime()) / (7 * 86400000)));

  let z2Minutes = 0;
  let vo2Count = 0;
  let strengthCount = 0;
  let stabilityCount = 0;

  for (const s of inPeriod) {
    const intensity = s.category === "cardio" ? cardioIntensityForSession(s) : null;
    if (s.category === "cardio" && (intensity === "easy" || intensity === "moderate")) {
      // Z2 time: minutes from reps on easy/moderate cardio sessions.
      for (const b of s.blocks ?? []) {
        for (const p of b.prescriptions ?? []) {
          z2Minutes += parseMinutesFromReps(p.prescribedReps) * (p.prescribedSets ?? 1);
        }
      }
    }
    if (s.category === "cardio" && intensity === "hard") vo2Count++;
    if (STRENGTH_CATEGORIES.has(s.category)) strengthCount++;
    if (STABILITY_CATEGORIES.has(s.category)) stabilityCount++;
  }
  // Also unused `profile` reference prevented by the void expression.
  void profile;

  return [
    { id: "z2",        label: "Zone 2",    current: Math.round(z2Minutes),  target: 180 * weeksInPeriod, unit: "min" },
    { id: "vo2",       label: "VO2 max",   current: vo2Count,               target: 1 * weeksInPeriod,   unit: "sessions" },
    { id: "strength",  label: "Strength",  current: strengthCount,          target: 2 * weeksInPeriod,   unit: "sessions" },
    { id: "stability", label: "Stability", current: stabilityCount,         target: 2 * weeksInPeriod,   unit: "sessions" },
  ];
}

// --- Strength PRs ----------------------------------------------------------
// Pulls the latest benchmark value per tracked lift and (when there's a prior
// entry) the delta from the previous entry. Fuels the "PR board" on the
// Profile page.
export type PrRow = {
  type: BenchmarkType;
  label: string;
  unit: string;
  current: number;
  deltaFromPrevious: number | null; // null if only 1 entry
  lastDate: string;
  higherIsBetter: boolean;
};

const PR_PRIORITY: BenchmarkType[] = [
  "bench_1rm",
  "squat_1rm",
  "deadlift_1rm",
  "pullup_max",
  "ohp_1rm",
  "5k_time_sec",
];

export function computePrBoard(benchmarks: Benchmark[]): PrRow[] {
  const byType = new Map<BenchmarkType, Benchmark[]>();
  for (const b of benchmarks) {
    const arr = byType.get(b.type) ?? [];
    arr.push(b);
    byType.set(b.type, arr);
  }
  const rows: PrRow[] = [];
  for (const type of PR_PRIORITY) {
    const entries = byType.get(type);
    if (!entries || entries.length === 0) continue;
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted[sorted.length - 1];
    const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;
    const meta = BENCHMARK_META[type];
    rows.push({
      type,
      label: meta.label,
      unit: meta.unit,
      current: latest.value,
      deltaFromPrevious: previous ? latest.value - previous.value : null,
      lastDate: latest.date,
      higherIsBetter: meta.higherIsBetter,
    });
  }
  return rows;
}

