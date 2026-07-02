"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import clsx from "clsx";
import { cleanupStaleDrafts, db, getProfile, getWeeklyPlan } from "@/lib/db";
import QuickLogModal from "@/components/QuickLogModal";
import { templatesFor } from "@/lib/data/templates";
import { recommendForToday, type Recommendation } from "@/lib/recommend";
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
  const [logDate, setLogDate] = useState<string | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");
  const todayIdx = dateToPlanIndex(new Date());

  useEffect(() => {
    getProfile().then(setProfile);
    // Seed personal weekly plan on first load (idempotent — only creates if missing)
    getWeeklyPlan();
    // Clean up old draft previews that the user never started
    cleanupStaleDrafts();
  }, []);

  const todaysSession = useLiveQuery(
    // Only show today's session if it's been actually started (not a draft preview)
    async () => {
      const all = await db.sessions.where("date").equals(today).toArray();
      return all.find((s) => s.startedAt || s.finishedAt);
    },
    [today]
  );

  const recent = useLiveQuery(
    // Exclude drafts entirely from history-style listings
    async () => {
      const all = await db.sessions.orderBy("date").reverse().limit(60).toArray();
      return all.filter((s) => s.startedAt || s.finishedAt).slice(0, 30);
    },
    []
  );

  const plan = useLiveQuery(async () => {
    const p = await db.weeklyPlan.get("me");
    if (!p) return null;
    return { ...p, days: p.days.map(normalizePlannedDay) };
  }, []);

  const plannedToday: PlannedDay = plan?.days[todayIdx] ?? null;
  // Always compute — used as primary CTA if no plan, or as secondary hint if plan disagrees
  const recommendation: Recommendation | null = recent
    ? recommendForToday(recent, new Date())
    : null;

  // Recommendation disagrees with the plan if the categories differ,
  // or the plan is a specific template the user already did this week.
  const planDisagreesWithRec = Boolean(
    plannedToday &&
      recommendation &&
      (recommendation.category !== plannedToday.category ||
        (recommendation.templateId &&
          plannedToday.templateId &&
          recommendation.templateId !== plannedToday.templateId))
  );
  const streak = computeStreak(recent ?? []);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  // Map date → most recent finished session for that date
  const sessionsByDate = new Map<string, Session>();
  for (const s of recent ?? []) {
    if (!s.finishedAt) continue;
    if (!sessionsByDate.has(s.date)) sessionsByDate.set(s.date, s);
  }

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
        <>
          <PlannedTodayCard day={plannedToday} />
          {planDisagreesWithRec && recommendation && (
            <RecommendationHint rec={recommendation} planned={plannedToday} />
          )}
        </>
      ) : recommendation ? (
        <RecommendationCard rec={recommendation} />
      ) : plan && plan.days.some((d) => d !== null) ? (
        <RestDayCard />
      ) : (
        <NoPlanCard />
      )}

      {/* Week strip */}
      <WeekStrip
        days={plan?.days ?? [null, null, null, null, null, null, null]}
        weekStart={weekStart}
        todayIdx={todayIdx}
        sessionsByDate={sessionsByDate}
        onLogPast={(date) => setLogDate(date)}
      />

      {logDate && (
        <QuickLogModal
          date={logDate}
          onClose={() => setLogDate(null)}
          onLogged={() => setLogDate(null)}
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

  const markDone = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Mark today done — ${title}?`)) return;
    const name = lockedTemplate
      ? `${CATEGORY_LABELS[day.category]} — ${lockedTemplate.name}`
      : CATEGORY_LABELS[day.category];
    const today = format(new Date(), "yyyy-MM-dd");
    const { logRetroactiveSession } = await import("@/lib/db");
    await logRetroactiveSession(today, day.category, name, day.templateId);
  };

  return (
    <Link
      href={href}
      className="block bg-gradient-to-br from-accent/25 to-accent/5 border border-accent/40 rounded-2xl p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-widest text-accent font-semibold">
            Today's session
          </div>
          <div className="text-2xl font-bold mt-2">{title}</div>
          <div className="text-sm text-text-muted mt-1">{subtitle}</div>
        </div>
        <button
          onClick={markDone}
          className="shrink-0 w-11 h-11 rounded-xl bg-accent/20 border border-accent/50 text-accent flex items-center justify-center text-xl font-bold hover:bg-accent hover:text-black transition-colors"
          aria-label="Mark today done — I already did this"
          title="I already did this"
        >
          ✓
        </button>
      </div>
      <div className="mt-4 text-sm text-accent font-medium">
        Open workout →
      </div>
    </Link>
  );
}

function RecommendationHint({
  rec,
  planned,
}: {
  rec: Recommendation;
  planned: NonNullable<PlannedDay>;
}) {
  const href = rec.templateId
    ? `/workout/${rec.category}?template=${rec.templateId}`
    : `/workout/${rec.category}`;
  const recTemplate = rec.templateId
    ? templatesFor(rec.category).find((t) => t.id === rec.templateId)
    : null;
  const plannedTemplate = planned.templateId
    ? templatesFor(planned.category).find((t) => t.id === planned.templateId)
    : null;
  const recLabel = recTemplate
    ? `${CATEGORY_LABELS[rec.category]} — ${recTemplate.name}`
    : CATEGORY_LABELS[rec.category];
  const plannedLabel = plannedTemplate
    ? `${CATEGORY_LABELS[planned.category]} — ${plannedTemplate.name}`
    : CATEGORY_LABELS[planned.category];

  return (
    <div className="border-l-2 border-accent/50 pl-4 -mt-1">
      <div className="text-[10px] uppercase tracking-widest text-accent font-semibold">
        Heads up — based on your week
      </div>
      <p className="text-sm text-text-muted mt-1 leading-relaxed">
        Plan says {plannedLabel} today, but {rec.reasoning.charAt(0).toLowerCase()}{rec.reasoning.slice(1)}
      </p>
      <Link
        href={href}
        className="inline-block mt-2 text-sm text-accent font-medium"
      >
        Switch to {recLabel} today →
      </Link>
    </div>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const href = rec.templateId
    ? `/workout/${rec.category}?template=${rec.templateId}`
    : `/workout/${rec.category}`;
  const template = rec.templateId
    ? templatesFor(rec.category).find((t) => t.id === rec.templateId)
    : null;
  const title = template ? template.name : CATEGORY_LABELS[rec.category];

  return (
    <Link
      href={href}
      className="block bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/40 rounded-2xl p-5"
    >
      <div className="text-[10px] uppercase tracking-widest text-accent font-semibold">
        Based on your week — try today
      </div>
      <div className="text-2xl font-bold mt-2">
        {CATEGORY_LABELS[rec.category]}{template ? ` — ${title}` : ""}
      </div>
      <p className="text-sm text-text-muted mt-2 leading-relaxed">
        {rec.reasoning}
      </p>
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
  const done = Boolean(session.finishedAt);
  return (
    <Link
      href={`/workout/${session.category}`}
      className="block bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30 rounded-2xl p-5"
    >
      <div className="text-xs uppercase tracking-widest text-accent font-semibold">
        Today's session {done ? "· ✓ Done" : ""}
      </div>
      <div className="text-xl font-bold mt-2">{session.name}</div>
      <div className="mt-4 text-sm text-accent font-medium">
        {done ? "Review →" : "Open workout →"}
      </div>
    </Link>
  );
}

function WeekStrip({
  days,
  weekStart,
  todayIdx,
  sessionsByDate,
  onLogPast,
}: {
  days: PlannedDay[];
  weekStart: Date;
  todayIdx: number;
  sessionsByDate: Map<string, Session>;
  onLogPast: (date: string) => void;
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
          const isToday = i === todayIdx;
          const isPast = i < todayIdx;
          const session = sessionsByDate.get(dateStr);

          // Prefer real session data over planned data when available
          const displayCategory = session?.category ?? day?.category;
          const templateId = session?.modifiers?.templateId ?? day?.templateId;
          const tpl = templateId && displayCategory
            ? templatesFor(displayCategory).find((t) => t.id === templateId)
            : null;
          const label = tpl?.name ?? (displayCategory ? CATEGORY_LABELS[displayCategory] : null);

          const chipClasses = clsx(
            "rounded-xl p-2 text-center border transition-colors block",
            isToday ? "border-accent/40 bg-accent/10" : "border-border bg-bg-card",
            isPast && !session && "hover:border-accent/30"
          );

          const inner = (
            <>
              <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold">
                {DAY_LABELS_SHORT[i]}
              </div>
              <div className="text-[9px] tabular-nums text-text-dim mt-0.5">
                {format(date, "M/d")}
              </div>
              <div className="mt-1.5 h-6 flex flex-col items-center justify-center">
                {session ? (
                  <>
                    <span className="text-success text-sm leading-none">✓</span>
                    {label && (
                      <span className="text-[8px] text-text-muted leading-tight mt-0.5">
                        {label.slice(0, 6)}
                      </span>
                    )}
                  </>
                ) : label ? (
                  <span className="text-[9px] text-text-muted leading-tight">
                    {label.slice(0, 5)}
                  </span>
                ) : isPast ? (
                  <span className="text-[8px] text-accent leading-tight">+ Log</span>
                ) : (
                  <span className="text-text-dim text-xs">—</span>
                )}
              </div>
            </>
          );

          // Past + no session → open quick log modal
          if (isPast && !session) {
            return (
              <button key={i} className={chipClasses} onClick={() => onLogPast(dateStr)}>
                {inner}
              </button>
            );
          }

          // Past + session logged → view in history
          if (isPast && session) {
            return (
              <Link key={i} className={chipClasses} href={`/history#${session.id ?? ""}`}>
                {inner}
              </Link>
            );
          }

          // Today or future → navigate to workout or plan
          const href = day
            ? day.templateId
              ? `/workout/${day.category}?template=${day.templateId}`
              : `/workout/${day.category}`
            : "/plan";
          return (
            <Link key={i} className={chipClasses} href={href}>
              {inner}
            </Link>
          );
        })}
      </div>
      <p className="text-[10px] text-text-dim mt-2 leading-relaxed">
        Tap a past day to log what you actually did — the recommendation engine uses it.
      </p>
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
