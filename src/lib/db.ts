import Dexie, { type Table } from "dexie";
import type { Benchmark, CompletedBlock, PlannedDay, Profile, Session, WeeklyPlan, WeeklyReview, WeekOverride } from "./types";
import { dateToPlanIndex, normalizePlannedDay, parseDateOnly } from "./types";
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
  completedBlocks!: Table<CompletedBlock, number>;

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
    this.version(6).stores({
      sessions: "++id, date, category, workoutId",
      profile: "id",
      weeklyPlan: "id",
      benchmarks: "++id, date, type",
      weeklyReviews: "++id, weekEndDate",
      weekOverrides: "++id, &weekStartDate",
      completedBlocks: "++id, finishedAt, name",
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
  await db.completedBlocks.clear();
}

export async function saveProfile(p: Partial<Profile>): Promise<void> {
  const current = await getProfile();
  await db.profile.put({ ...current, ...p, id: "me" });
}

/** Archive the current focus block to completedBlocks so it earns a badge
 *  on the Profile page. Counts finished sessions between startedAt and
 *  today whose focusName matches. Idempotent: skipped if a row with the
 *  same name + startedAt already exists. */
export async function archiveCurrentFocus(): Promise<void> {
  const current = await db.profile.get("me");
  const focus = current?.currentFocus;
  if (!focus) return;
  const today = new Date().toISOString().slice(0, 10);
  const duplicate = await db.completedBlocks
    .where("name")
    .equals(focus.name)
    .filter((b) => b.startedAt === focus.startedAt)
    .first();
  if (duplicate) return;

  const sessions = await db.sessions.toArray();
  const sessionsLogged = sessions.filter(
    (s) =>
      s.finishedAt !== undefined &&
      s.date >= focus.startedAt &&
      s.date <= today &&
      (s.focusName === focus.name || !s.focusName)
  ).length;

  // Ended early if archival date is before the planned end (startedAt + N weeks).
  const startMs = new Date(focus.startedAt + "T00:00:00").getTime();
  const plannedEndMs = startMs + focus.durationWeeks * 7 * 86400000;
  const endedEarly = Date.now() < plannedEndMs - 86400000; // 1-day grace

  await db.completedBlocks.add({
    name: focus.name,
    startedAt: focus.startedAt,
    finishedAt: today,
    durationWeeks: focus.durationWeeks,
    endedEarly,
    sessionsLogged,
  });
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

/** Resume a paused block.
 *
 *  Shifts BOTH the block's startedAt AND every not-yet-reached week override
 *  forward by the same number of whole weeks, so the periodization wave and
 *  the planned weeks stay aligned.
 *
 *  Previously only startedAt moved. Week overrides are keyed to fixed
 *  calendar Mondays saved at apply time, so a 1-week pause slid the phase
 *  wave forward while leaving the planned weeks behind — the header would
 *  read "Week 6 · Deload" while the days fell through to the base plan
 *  (e.g. a Hyrox Strength day on what should be a deload Monday).
 *
 *  Shifts are in WHOLE WEEKS (rounded) because overrides must stay keyed to
 *  Mondays. A 2-day pause rounds to 0 — your week just continues. A 6-9 day
 *  pause rounds to 1 week. */
export async function resumeFocusBlock(): Promise<void> {
  const current = await getProfile();
  const focus = current.currentFocus;
  if (!focus || !focus.pausedAt) return;

  const pausedMonday = mondayOf(parseDateOnly(focus.pausedAt));
  const resumeMonday = mondayOf(new Date());
  const weeksSkipped = Math.max(
    0,
    Math.round(calendarDaysBetween(resumeMonday, pausedMonday) / 7)
  );
  const shiftDays = weeksSkipped * 7;

  let newStartedAt = focus.startedAt;
  if (shiftDays > 0) {
    const start = parseDateOnly(focus.startedAt);
    start.setDate(start.getDate() + shiftDays);
    newStartedAt = formatDateOnly(start);

    // Slide every override at or after the pause point. Walk latest-first so
    // a shifted record never collides with one still waiting to move
    // (weekStartDate is a unique index).
    const pausedMondayStr = formatDateOnly(pausedMonday);
    const toShift = (await db.weekOverrides.toArray())
      .filter((o) => o.weekStartDate >= pausedMondayStr)
      .sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));
    for (const o of toShift) {
      const d = parseDateOnly(o.weekStartDate);
      d.setDate(d.getDate() + shiftDays);
      const nextStart = formatDateOnly(d);
      if (o.id !== undefined) await db.weekOverrides.delete(o.id);
      await db.weekOverrides.where("weekStartDate").equals(nextStart).delete();
      await db.weekOverrides.put({
        weekStartDate: nextStart,
        days: o.days,
        updatedAt: Date.now(),
      });
    }
  }

  await db.profile.put({
    ...current,
    currentFocus: {
      ...focus,
      startedAt: newStartedAt,
      pausedAt: undefined,
    },
  });
}

/** Monday of the week containing `d`, at local midnight. */
function mondayOf(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const back = (out.getDay() + 6) % 7;
  out.setDate(out.getDate() - back);
  return out;
}

/** yyyy-MM-dd in LOCAL time — never toISOString(), which shifts the date in
 *  any non-UTC timezone. */
function formatDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function calendarDaysBetween(later: Date, earlier: Date): number {
  const a = new Date(later.getFullYear(), later.getMonth(), later.getDate());
  const b = new Date(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

/**
 * Slide the PLANNED WEEKS (week overrides) forward (+) or back (−) by whole
 * weeks, leaving the block's startedAt — and therefore the periodization
 * phase — exactly where it is.
 *
 * This is the realign tool, not the reschedule tool:
 *   - Going away / losing a week → Pause + Resume. That shifts the phase AND
 *     the planned weeks together, so the whole block slides.
 *   - Phase and planned weeks disagree → this. It moves the week content onto
 *     the dates the phase already thinks you're on.
 *
 * The desync it repairs: blocks paused before resumeFocusBlock learned to
 * move overrides alongside startedAt. Those blocks ended up with the phase
 * reading "Week 6 · Deload" while the deload week itself sat a week behind,
 * so the current week fell through to the base plan.
 *
 * Returns how many week-plans actually moved.
 */
export async function shiftPlanWeeks(weeks: number): Promise<number> {
  if (!Number.isInteger(weeks) || weeks === 0) return 0;
  const shiftDays = weeks * 7;
  const thisMondayStr = formatDateOnly(mondayOf(new Date()));

  // Include an override when its DESTINATION is this week or later. Filtering
  // on the source date instead would miss the case this exists to repair: a
  // plan running a week behind, where the week that should be current is
  // parked on last week's Monday. Shifting back still can't drag the current
  // week into the past, since its destination would fall before this Monday.
  //
  // Move the furthest-out weeks first when shifting forward (and the nearest
  // first when shifting back) so a moved record never lands on one that
  // hasn't moved yet — weekStartDate is a unique index.
  const affected = (await db.weekOverrides.toArray())
    .filter((o) => {
      const dest = parseDateOnly(o.weekStartDate);
      dest.setDate(dest.getDate() + shiftDays);
      return formatDateOnly(dest) >= thisMondayStr;
    })
    .sort((a, b) =>
      weeks > 0
        ? b.weekStartDate.localeCompare(a.weekStartDate)
        : a.weekStartDate.localeCompare(b.weekStartDate)
    );

  for (const o of affected) {
    const d = parseDateOnly(o.weekStartDate);
    d.setDate(d.getDate() + shiftDays);
    const nextStart = formatDateOnly(d);
    if (o.id !== undefined) await db.weekOverrides.delete(o.id);
    await db.weekOverrides.where("weekStartDate").equals(nextStart).delete();
    await db.weekOverrides.put({
      weekStartDate: nextStart,
      days: o.days,
      updatedAt: Date.now(),
    });
  }

  // startedAt is deliberately untouched — moving it would drag the phase
  // along and re-create the very mismatch this repairs.
  return affected.length;
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
