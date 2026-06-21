import Dexie, { type Table } from "dexie";
import type { PlannedDay, Profile, Session, WeeklyPlan } from "./types";
import { dateToPlanIndex, normalizePlannedDay } from "./types";
import { PERSONAL_PROFILE, PERSONAL_WEEKLY_PLAN } from "./data/personalProfile";

export class FitnessDB extends Dexie {
  sessions!: Table<Session, number>;
  profile!: Table<Profile, "me">;
  weeklyPlan!: Table<WeeklyPlan, "me">;

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
  }
}

export const db = new FitnessDB();

export async function getProfile(): Promise<Profile> {
  const existing = await db.profile.get("me");
  if (existing) return existing;
  // Personalized default — see lib/data/personalProfile.ts
  await db.profile.put(PERSONAL_PROFILE);
  return PERSONAL_PROFILE;
}

export async function saveProfile(p: Partial<Profile>): Promise<void> {
  const current = await getProfile();
  await db.profile.put({ ...current, ...p, id: "me" });
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

export async function getWeeklyPlan(): Promise<WeeklyPlan> {
  const existing = await db.weeklyPlan.get("me");
  if (existing) {
    // Backward-compat: old data may have bare Category strings
    return { ...existing, days: existing.days.map(normalizePlannedDay) };
  }
  // Personalized default — see lib/data/personalProfile.ts
  await db.weeklyPlan.put(PERSONAL_WEEKLY_PLAN);
  return PERSONAL_WEEKLY_PLAN;
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
