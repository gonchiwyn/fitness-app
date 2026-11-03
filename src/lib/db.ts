import Dexie, { type Table } from "dexie";
import type { Benchmark, PlannedDay, Profile, Session, WeeklyPlan, WeeklyReview, WeekOverride } from "./types";
import { dateToPlanIndex, normalizePlannedDay } from "./types";
import {
  GENERIC_PROFILE,
  GENERIC_WEEKLY_PLAN,
  PERSONAL_PROFILE,
  PERSONAL_WEEKLY_PLAN,
} from "./data/personalProfile";

export class FitnessDB extends Dexie {
  sessions!: Table<Session, number>;
  profile!: Table<Profile, "me">;
  weeklyPlan!: Table<WeeklyPlan, "me">;
  benchmarks!: Table<Benchmark, number>;
  weeklyReviews!: Table<WeeklyReview, number>;
  weekOverrides!: Table<WeekOverride, number>;

  constructor() {
    super("fitness-app");
    this.version(1).stores({
      sessions: "++id, date, category, workoutId",
      profile: "id",
    });
    this.version(2).stores({
      sessions: "++id, date, category, workoutId",
      profile: "id",
      weeklyPlan: "id",
    });
    this.version(3).stores({
      sessions: "++id, date, category, workoutId",
      profile: "id",
      weeklyPlan: "id",
      benchmarks: "++id, date, type",
    });
    this.version(4).stores({
      sessions: "++id, date, category, workoutId",
      profile: "id",
      weeklyPlan: "id",
      benchmarks: "++id, date, type",
      weeklyReviews: "++id, weekEndDate",
    });
    this.version(5).stores({
      sessions: "++id, date, category, workoutId",
      profile: "id",
      weeklyPlan: "id",
      benchmarks: "++id, date, type",
      weeklyReviews: "++id, weekEndDate",
      weekOverrides: "++id, &weekStartDate",
    });
  }
}

export const db = new FitnessDB();

// If a saved focus block name matches a preset whose duration has since been
// updated (e.g. PPL used to be 4 weeks, now defined as 6), bump the saved
// duration silently so the Home indicator + phase model reflect the intent.
// Only bumps upward — never shortens an in-flight block.
const PRESET_DURATION: Record<string, number> = {
  Beginner: 4,
  Hypertrophy: 6,
  "Menno Hypertrophy": 8,
  "Strength peak": 8,
  "Cardio base": 8,
  Athletic: 6,
  Recovery: 1,
  PPL: 6,
  Longevity: 8,
  "Surf prep": 6,
  "Hyrox prep": 6,
};

// Map of deprecated template IDs → their replacements. getProfile() runs this
// against the weekly plan + overrides so users mid-block don't have to
// manually re-apply when a template is swapped under them.
const TEMPLATE_MIGRATIONS: Record<string, string> = {
  // Hyrox: full-circuit sim variants replaced by station-block ("Pairs") ones
  // that use the same equipment but hold one station at a time — gym-mate
  // can't break your workout by grabbing the sled mid-flow. Original IDs
  // still exist for anyone with a Hyrox-equipped box they can commandeer.
  hyrox_sim_race: "hyrox_sim_pairs",
  hyrox_sim_intro: "hyrox_sim_pairs_intro",
  hyrox_sim_light: "hyrox_sim_pairs_light",
  // Users briefly migrated to the DB-only commercial variants in the previous
  // iteration (pre-pairs). Shift them forward to the Pairs variants.
  hyrox_sim_commercial: "hyrox_sim_pairs",
  hyrox_sim_commercial_intro: "hyrox_sim_pairs_intro",
  hyrox_sim_commercial_light: "hyrox_sim_pairs_light",
};

// One-shot structural upgrade for an active Hyrox block that was applied
// before the Nov-02 review (added short mid-week sim + long run + W5 realization
// test). Idempotent: each check guards itself so it's safe to call every load.
async function upgradeActiveHyroxBlock(): Promise<void> {
  const profile = await db.profile.get("me");
  const focus = profile?.currentFocus;
  if (!focus || focus.name !== "Hyrox prep") return;

  // 1) Rewrite base plan Thursday + Saturday if they still carry the pre-review
  //    defaults. Only touches slots that match the old content exactly, so a
  //    user who manually customized either day is left alone.
  const plan = await db.weeklyPlan.get("me");
  if (plan) {
    const next = [...plan.days];
    let changed = false;
    const thu = next[3];
    if (thu?.category === "cardio" && thu.templateId === "attia_4x4_vo2") {
      next[3] = { category: "hyrox", templateId: "hyrox_sim_short" };
      changed = true;
    }
    const sat = next[5];
    if (sat?.category === "cardio" && sat.templateId === "attia_zone2_45") {
      next[5] = { category: "cardio", templateId: "nick_bare_long_run" };
      changed = true;
    }
    if (changed) await db.weeklyPlan.put({ ...plan, days: next });
  }

  // 2) Add W5 Realization override (timed mini-race benchmark on Tuesday).
  //    W5 Monday = Monday of the week containing startedAt, +4 weeks.
  const startedAt = new Date(focus.startedAt + "T00:00:00");
  const w1Monday = new Date(startedAt);
  const dow = w1Monday.getDay();
  const daysBack = dow === 0 ? 6 : dow - 1;
  w1Monday.setDate(w1Monday.getDate() - daysBack);
  const w5Monday = new Date(w1Monday);
  w5Monday.setDate(w5Monday.getDate() + 28);
  const w5MondayStr = w5Monday.toISOString().slice(0, 10);

  const existing = await db.weekOverrides
    .where("weekStartDate")
    .equals(w5MondayStr)
    .first();
  if (!existing) {
    const realizationDays: PlannedDay[] = [
      { category: "hyrox", templateId: "hyrox_strength_pull" },
      { category: "hyrox", templateId: "hyrox_sim_test" },
      { category: "hyrox", templateId: "hyrox_strength_push" },
      { category: "hyrox", templateId: "hyrox_sim_short" },
      { category: "cardio", templateId: "attia_zone2_45" },
      { category: "cardio", templateId: "nick_bare_long_run" },
      { category: "recovery" },
    ];
    await db.weekOverrides.put({
      weekStartDate: w5MondayStr,
      days: realizationDays,
      updatedAt: Date.now(),
    });
  }
}

async function migrateDeprecatedTemplates(): Promise<void> {
  const plan = await db.weeklyPlan.get("me");
  if (plan) {
    let changed = false;
    const next = plan.days.map((d) => {
      if (d?.templateId && TEMPLATE_MIGRATIONS[d.templateId]) {
        changed = true;
        return { ...d, templateId: TEMPLATE_MIGRATIONS[d.templateId] };
      }
      return d;
    });
    if (changed) await db.weeklyPlan.put({ ...plan, days: next });
  }
  const overrides = await db.weekOverrides.toArray();
  for (const o of overrides) {
    let changed = false;
    const nextDays = o.days.map((d) => {
      if (d?.templateId && TEMPLATE_MIGRATIONS[d.templateId]) {
        changed = true;
        return { ...d, templateId: TEMPLATE_MIGRATIONS[d.templateId] };
      }
      return d;
    });
    if (changed) await db.weekOverrides.put({ ...o, days: nextDays, updatedAt: Date.now() });
  }
}

export async function getProfile(): Promise<Profile> {
  const existing = await db.profile.get("me");
  if (existing) {
    const focus = existing.currentFocus;
    if (focus?.name) {
      const target = PRESET_DURATION[focus.name];
      if (target && target > focus.durationWeeks) {
        const upgraded: Profile = {
          ...existing,
          currentFocus: { ...focus, durationWeeks: target },
        };
        await db.profile.put(upgraded);
      }
    }
    // Fire-and-forget migrations. Each is idempotent so calling on every
    // profile read is safe. We don't await: profile reads shouldn't wait.
    migrateDeprecatedTemplates();
    upgradeActiveHyroxBlock();
    return (await db.profile.get("me")) ?? existing;
  }
  // Personalized default — see lib/data/personalProfile.ts
  await db.profile.put(GENERIC_PROFILE);
  return GENERIC_PROFILE;
}

/** Overwrite everything and seed as Gonzalo. Dev-only convenience. */
export async function loadPersonalSeed(): Promise<void> {
  await db.profile.put(PERSONAL_PROFILE);
  await db.weeklyPlan.put(PERSONAL_WEEKLY_PLAN);
}

/** Wipe local data back to cold-start. Next getProfile() reseeds GENERIC. */
export async function resetToBlank(): Promise<void> {
  await db.profile.clear();
  await db.weeklyPlan.clear();
  await db.sessions.clear();
  await db.benchmarks.clear();
  await db.weeklyReviews.clear();
  await db.weekOverrides.clear();
}

export async function saveProfile(p: Partial<Profile>): Promise<void> {
  const current = await getProfile();
  await db.profile.put({ ...current, ...p, id: "me" });
}

/** Pause the current focus block. Freezes week counter + phase at today. */
export async function pauseFocusBlock(): Promise<void> {
  const current = await getProfile();
  if (!current.currentFocus || current.currentFocus.pausedAt) return;
  const today = new Date().toISOString().slice(0, 10);
  await db.profile.put({
    ...current,
    currentFocus: { ...current.currentFocus, pausedAt: today },
  });
}

/** Resume a paused block. Shifts startedAt forward by the pause duration so
 *  the block picks up exactly where it was (same week, same phase). */
export async function resumeFocusBlock(): Promise<void> {
  const current = await getProfile();
  const focus = current.currentFocus;
  if (!focus || !focus.pausedAt) return;
  const pausedDate = new Date(focus.pausedAt + "T00:00:00");
  const today = new Date();
  const pauseDays = Math.max(
    0,
    Math.floor((today.getTime() - pausedDate.getTime()) / 86400000)
  );
  const start = new Date(focus.startedAt + "T00:00:00");
  start.setDate(start.getDate() + pauseDays);
  const newStartedAt = start.toISOString().slice(0, 10);
  await db.profile.put({
    ...current,
    currentFocus: {
      ...focus,
      startedAt: newStartedAt,
      pausedAt: undefined,
    },
  });
}

export async function recentSessions(limit = 30): Promise<Session[]> {
  return db.sessions.orderBy("date").reverse().limit(limit).toArray();
}

/**
 * Delete draft sessions older than 24h. Drafts = generated previews
 * the user never actually started (no startedAt, no logged sets).
 */
export async function cleanupStaleDrafts(): Promise<number> {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const all = await db.sessions.toArray();
  const stale = all.filter(
    (s) =>
      !s.startedAt &&
      !s.finishedAt &&
      (s.createdAt ?? 0) < cutoff
  );
  for (const s of stale) {
    if (s.id !== undefined) await db.sessions.delete(s.id);
  }
  return stale.length;
}

export async function deleteSession(id: number): Promise<void> {
  await db.sessions.delete(id);
}

/**
 * Log a workout that happened outside the app.
 * Creates a minimal finished session — no blocks, no set data —
 * just the fact that a category+template happened on a date.
 */
export async function logRetroactiveSession(
  date: string,
  category: Session["category"],
  name: string,
  templateId?: string
): Promise<number> {
  const now = Date.now();
  const profile = await getProfile();
  const session: Session = {
    workoutId: `retro-${category}-${date}-${templateId ?? "any"}-${now}`,
    category,
    name,
    date,
    createdAt: now,
    startedAt: now,
    finishedAt: now,
    modifiers: templateId ? { templateId } : undefined,
    focusName: profile?.currentFocus?.name,
    blocks: [], // no exercise-level data — user logged after the fact
  };
  const id = await db.sessions.add(session);
  return id;
}

export async function getWeeklyPlan(): Promise<WeeklyPlan> {
  const existing = await db.weeklyPlan.get("me");
  if (existing) {
    // Backward-compat: old data may have bare Category strings
    return { ...existing, days: existing.days.map(normalizePlannedDay) };
  }
  // Personalized default — see lib/data/personalProfile.ts
  await db.weeklyPlan.put(GENERIC_WEEKLY_PLAN);
  return GENERIC_WEEKLY_PLAN;
}

export async function saveWeeklyPlan(plan: WeeklyPlan): Promise<void> {
  await db.weeklyPlan.put({ ...plan, id: "me" });
}

export async function setDayInPlan(dayIdx: number, day: PlannedDay): Promise<WeeklyPlan> {
  const plan = await getWeeklyPlan();
  const days = [...plan.days];
  days[dayIdx] = day;
  const next: WeeklyPlan = { id: "me", days };
  await db.weeklyPlan.put(next);
  return next;
}

export async function todaysPlannedDay(d: Date = new Date()): Promise<PlannedDay> {
  const plan = await getWeeklyPlan();
  return plan.days[dateToPlanIndex(d)] ?? null;
}

/**
 * Last rating given for a category — used by the generator to nudge volume
 * up or down. "Hard" last time → ease off this time; "Easy" → push a bit.
 * Only looks at recent finished sessions to stay relevant.
 */
/**
 * Return the days for a specific week — override if present, else base.
 * The base repeats every week; overrides let a single week deviate without
 * dragging the change into future weeks.
 */
export async function getWeekDaysFor(weekStartDate: string): Promise<PlannedDay[]> {
  const override = await db.weekOverrides
    .where("weekStartDate")
    .equals(weekStartDate)
    .first();
  if (override) return override.days;
  const base = await getWeeklyPlan();
  return base.days;
}

/** Save (or clear) an override for a specific week. */
export async function saveWeekOverride(
  weekStartDate: string,
  days: PlannedDay[]
): Promise<void> {
  const existing = await db.weekOverrides
    .where("weekStartDate")
    .equals(weekStartDate)
    .first();
  const record: WeekOverride = {
    ...(existing?.id ? { id: existing.id } : {}),
    weekStartDate,
    days,
    updatedAt: Date.now(),
  };
  await db.weekOverrides.put(record);
}

export async function clearWeekOverride(weekStartDate: string): Promise<void> {
  await db.weekOverrides.where("weekStartDate").equals(weekStartDate).delete();
}

export async function saveWeeklyReview(r: WeeklyReview): Promise<number> {
  return db.weeklyReviews.add(r);
}

export async function lastWeeklyReview(): Promise<WeeklyReview | undefined> {
  const all = await db.weeklyReviews.orderBy("weekEndDate").reverse().limit(1).toArray();
  return all[0];
}

export async function weeklyReviewFor(weekEndDate: string): Promise<WeeklyReview | undefined> {
  return db.weeklyReviews.where("weekEndDate").equals(weekEndDate).first();
}

/** Wipes reset also purges weekly reviews. */
export async function lastRatingForCategory(
  category: Session["category"]
): Promise<Session["rating"] | undefined> {
  const recent = await db.sessions
    .orderBy("date")
    .reverse()
    .limit(50)
    .toArray();
  const match = recent.find(
    (s) => s.category === category && s.finishedAt && s.rating
  );
  return match?.rating;
}

export async function lastSessionForExercise(exerciseId: string): Promise<{
  session: Session;
  sets: { weight?: number; reps?: number }[];
} | null> {
  const sessions = await db.sessions.orderBy("date").reverse().limit(200).toArray();
  for (const s of sessions) {
    for (const b of s.blocks) {
      for (const p of b.prescriptions) {
        if (p.exerciseId === exerciseId) {
          const completed = p.sets.filter((set) => set.completed);
          if (completed.length > 0) {
            return { session: s, sets: completed };
          }
        }
      }
    }
  }
  return null;
}
