"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import clsx from "clsx";
import { db, getProfile, getWeeklyPlan } from "@/lib/db";
import { templatesFor } from "@/lib/data/templates";
import {
  CATEGORY_BLURBS,
  CATEGORY_LABELS,
  DAY_LABELS_SHORT,
  dateToPlanIndex,
  normalizePlannedDay,
  type PlannedDay,
  type Profile,
  type Session,
} from "@/lib/types";

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");
  const todayIdx = dateToPlanIndex(new Date());

  useEffect(() => {
    getProfile().then(setProfile);
    // Seed personal weekly plan on first load (idempotent — only creates if missing)
    getWeeklyPlan();
  }, []);

  const todaysSession = useLiveQuery(
    async () => db.sessions.where("date").equals(today).first(),
    [today]
  );

  const recent = useLiveQuery(
    async () => db.sessions.orderBy("date").reverse().limit(30).toArray(),
    []
  );

  const plan = useLiveQuery(async () => {
    const p = await db.weeklyPlan.get("me");
    if (!p) return null;
    return { ...p, days: p.days.map(normalizePlannedDay) };
  }, []);

  const plannedToday: PlannedDay = plan?.days[todayIdx] ?? null;
  const streak = computeStreak(recent ?? []);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const recentSet = new Set((recent ?? []).filter((s) => s.finishedAt).map((s) => s.date));

  return (
    <div className="max-w-3xl mx-auto px-5 py-6 space-y-7">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-text-dim">
            {format(new Date(), "EEEE, MMM d")}
          </p>
          <h1 className="text-3xl font-bold mt-1">
            {greet()}{profile?.name && profile.name !== "Athlete" ? `, ${profile.name}` : ""}.
          </h1>
        </div>
        {streak > 0 && (
          <div className="text-right">
            <div className="text-2xl font-bold text-accent">{streak}</div>
            <div className="text-[10px] uppercase tracking-widest text-text-dim">day streak</div>
          </div>
        )}
      </header>

      {/* Context line — only if user filled either field */}
      {profile && (profile.currentGoal || profile.otherCommitments) && (
        <Link
          href="/settings"
          className="block text-xs text-text-dim leading-relaxed hover:text-text-muted -mt-1"
        >
          {profile.currentGoal && (
            <span className="text-accent">🎯 {profile.currentGoal}</span>
          )}
          {profile.currentGoal && profile.otherCommitments && (
            <span className="text-text-dim"> · </span>
          )}
          {profile.otherCommitments && <span>{profile.otherCommitments}</span>}
        </Link>
      )}

      {profile && !profile.onboarded && (
        <Link
          href="/onboarding"
          className="block bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30 rounded-2xl p-4"
        >
          <div className="text-xs uppercase tracking-widest text-accent font-semibold">
            Personalize your training →
          </div>
          <div className="text-sm text-text-muted mt-1.5 leading-snug">
            Set your goals, injuries, strength maxes, and running pace.
            Workouts get tailored loads and safer swaps. 2 min.
          </div>
        </Link>
      )}

      {/* TODAY's primary CTA */}
      {todaysSession ? (
        <TodaysSessionCard session={todaysSession} />
      ) : plannedToday ? (
        <PlannedTodayCard day={plannedToday} />
      ) : plan && plan.days.some((d) => d !== null) ? (
        <RestDayCard />
      ) : (
        <NoPlanCard />
      )}

      {/* Week strip */}
      {plan && plan.days.some((d) => d !== null) && (
        <WeekStrip
          days={plan.days}
          weekStart={weekStart}
          todayIdx={todayIdx}
          completedDates={recentSet}
        />
      )}

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-dim mb-3">
          Quick start
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {(["split", "hypertrophy", "strength", "hyrox", "athlete", "cardio"] as const).map((cat) => (
            <Link
              key={cat}
              href={`/workout/${cat}`}
              className="bg-bg-card border border-border rounded-2xl p-4 hover:border-accent/40 transition-colors"
            >
              <div className="font-semibold">{CATEGORY_LABELS[cat]}</div>
              <div className="text-xs text-text-dim mt-1">Tap to generate</div>
            </Link>
          ))}
        </div>
        <Link
          href="/workout"
          className="block text-center mt-4 text-sm text-accent font-medium"
        >
          See all categories →
        </Link>
      </section>

      {recent && recent.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-dim mb-3">
            Recent
          </h2>
          <div className="space-y-2">
            {recent.slice(0, 5).map((s) => (
              <Link
                key={s.id}
                href={`/history#${s.id}`}
                className="block bg-bg-card border border-border rounded-xl px-4 py-3 hover:border-border/60"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-text-dim mt-0.5">
                      {format(new Date(s.date), "EEE, MMM d")}
                    </div>
                  </div>
                  <div className="text-xs text-text-dim">
                    {s.finishedAt ? "✓" : "in progress"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PlannedTodayCard({ day }: { day: NonNullable<PlannedDay> }) {
  const lockedTemplate = day.templateId
    ? templatesFor(day.category).find((t) => t.id === day.templateId)
    : null;
  const href = day.templateId
    ? `/workout/${day.category}?template=${day.templateId}`
    : `/workout/${day.category}`;
  const title = lockedTemplate ? lockedTemplate.name : CATEGORY_LABELS[day.category];
  const subtitle = lockedTemplate
    ? `${CATEGORY_LABELS[day.category]} · ${lockedTemplate.description}`
    : CATEGORY_BLURBS[day.category];

  return (
    <Link
      href={href}
      className="block bg-gradient-to-br from-accent/25 to-accent/5 border border-accent/40 rounded-2xl p-5"
    >
      <div className="text-xs uppercase tracking-widest text-accent font-semibold">
        Today's session
      </div>
      <div className="text-2xl font-bold mt-2">{title}</div>
      <div className="text-sm text-text-muted mt-1">{subtitle}</div>
      <div className="mt-4 text-sm text-accent font-medium">
        Start workout →
      </div>
    </Link>
  );
}

function RestDayCard() {
  return (
    <div className="bg-bg-card border border-border rounded-2xl p-5">
      <div className="text-xs uppercase tracking-widest text-text-dim font-semibold">
        Rest day
      </div>
      <div className="text-xl font-semibold mt-2">No training scheduled today.</div>
      <div className="text-sm text-text-muted mt-2 leading-relaxed">
        Active recovery counts. Stretch, walk, sleep well. Or tap a category below if you feel like moving.
      </div>
    </div>
  );
}

function NoPlanCard() {
  return (
    <Link
      href="/plan"
      className="block bg-bg-card border border-border rounded-2xl p-5 hover:border-accent/40 transition-colors"
    >
      <div className="text-xs uppercase tracking-widest text-text-dim font-semibold">
        No weekly plan yet
      </div>
      <div className="text-lg font-semibold mt-2">
        Set what you train each day →
      </div>
      <div className="text-sm text-text-muted mt-2">
        Or pick a category below to train freely.
      </div>
    </Link>
  );
}

function TodaysSessionCard({ session }: { session: Session }) {
  const completed = session.blocks
    .flatMap((b) => b.prescriptions)
    .reduce((acc, p) => acc + p.sets.filter((s) => s.completed).length, 0);
  const total = session.blocks
    .flatMap((b) => b.prescriptions)
    .reduce((acc, p) => acc + p.prescribedSets, 0);
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Link
      href={`/workout/${session.category}`}
      className="block bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30 rounded-2xl p-5"
    >
      <div className="text-xs uppercase tracking-widest text-accent font-semibold">
        Today's session — {session.finishedAt ? "Complete" : "In Progress"}
      </div>
      <div className="text-xl font-bold mt-2">{session.name}</div>
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-text-muted mb-1">
          <span>{completed} / {total} sets</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 bg-bg rounded-full overflow-hidden">
          <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="mt-4 text-sm text-accent font-medium">
        {session.finishedAt ? "Review →" : "Resume →"}
      </div>
    </Link>
  );
}

function WeekStrip({
  days,
  weekStart,
  todayIdx,
  completedDates,
}: {
  days: PlannedDay[];
  weekStart: Date;
  todayIdx: number;
  completedDates: Set<string>;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-dim">
          This week
        </h2>
        <Link href="/plan" className="text-xs text-accent">Edit plan →</Link>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, i) => {
          const date = addDays(weekStart, i);
          const dateStr = format(date, "yyyy-MM-dd");
          const done = completedDates.has(dateStr);
          const isToday = i === todayIdx;
          const href = day
            ? day.templateId
              ? `/workout/${day.category}?template=${day.templateId}`
              : `/workout/${day.category}`
            : "/plan";
          const tpl = day?.templateId
            ? templatesFor(day.category).find((t) => t.id === day.templateId)
            : null;
          const dayLabel = tpl ? tpl.name : day ? CATEGORY_LABELS[day.category] : null;
          return (
            <Link
              key={i}
              href={href}
              className={clsx(
                "rounded-xl p-2 text-center border transition-colors",
                isToday ? "border-accent/40 bg-accent/10" : "border-border bg-bg-card"
              )}
            >
              <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold">
                {DAY_LABELS_SHORT[i]}
              </div>
              <div className="text-[9px] tabular-nums text-text-dim mt-0.5">
                {format(date, "M/d")}
              </div>
              <div className="mt-1.5 h-6 flex items-center justify-center">
                {done ? (
                  <span className="text-success text-lg">✓</span>
                ) : dayLabel ? (
                  <span className="text-[9px] text-text-muted leading-tight">
                    {dayLabel.slice(0, 5)}
                  </span>
                ) : (
                  <span className="text-text-dim text-xs">—</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function greet() {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function computeStreak(sessions: Session[]): number {
  if (sessions.length === 0) return 0;
  const dates = new Set(sessions.filter((s) => s.finishedAt).map((s) => s.date));
  let streak = 0;
  const cur = new Date();
  for (let i = 0; i < 60; i++) {
    const key = format(cur, "yyyy-MM-dd");
    if (dates.has(key)) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    } else {
      if (i === 0) {
        cur.setDate(cur.getDate() - 1);
        continue;
      }
      break;
    }
  }
  return streak;
}
