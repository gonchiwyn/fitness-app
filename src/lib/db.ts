import Dexie, { type Table } from "dexie";
import type { PlannedDay, Profile, Session, WeeklyPlan } from "./types";
import { dateToPlanIndex, normalizePlannedDay } from "./types";

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
  const defaults: Profile = {
    id: "me",
    name: "Athlete",
    units: "kg",
    focusAreas: ["lower_back", "hip", "shoulder"],
  };
  await db.profile.put(defaults);
  return defaults;
}

export async function saveProfile(p: Partial<Profile>): Promise<void> {
  const current = await getProfile();
  await db.profile.put({ ...current, ...p, id: "me" });
}

export async function recentSessions(limit = 30): Promise<Session[]> {
  return db.sessions.orderBy("date").reverse().limit(limit).toArray();
}

export async function getWeeklyPlan(): Promise<WeeklyPlan> {
  const existing = await db.weeklyPlan.get("me");
  if (existing) {
    // Backward-compat: old data may have bare Category strings
    return { ...existing, days: existing.days.map(normalizePlannedDay) };
  }
  const empty: WeeklyPlan = { id: "me", days: [null, null, null, null, null, null, null] };
  await db.weeklyPlan.put(empty);
  return empty;
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
