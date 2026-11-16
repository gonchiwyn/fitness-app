"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { format, startOfWeek, addDays, differenceInCalendarDays } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import clsx from "clsx";
import { archiveCurrentFocus, cleanupStaleDrafts, db, getProfile, getWeeklyPlan, saveProfile } from "@/lib/db";
import QuickLogModal from "@/components/QuickLogModal";
import DayPreviewModal from "@/components/DayPreviewModal";
import { templatesFor } from "@/lib/data/templates";
import { categoryColor } from "@/lib/categoryTheme";
import { recommendForToday, type Recommendation } from "@/lib/recommend";
import {
  CATEGORY_BLURBS,
  CATEGORY_LABELS,
  DAY_LABELS_SHORT,
  chipShortLabel,
  dateToPlanIndex,
  effectiveFocusToday,
  getBlockPhase,
  normalizePlannedDay,
  type PlannedDay,
  type Profile,
  type Session,
} from "@/lib/types";

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [logDate, setLogDate] = useState<string | null>(null);
  const [previewDate, setPreviewDate] = useState<string | null>(null);
  // Offset in weeks from the current week (0 = this week, +1 = next, -1 = last).
  // Lets the user scan the block outlook without leaving Home.
  const [weekOffset, setWeekOffset] = useState(0);
  const today = format(new Date(), "yyyy-MM-dd");
  const todayIdx = dateToPlanIndex(new Date());

  useEffect(() => {
    getProfile().then(setProfile);
    // Seed personal weekly plan on first load (idempotent — only creates if missing)
    getWeeklyPlan();
    // Clean up old draft previews that the user never started
    cleanupStaleDrafts();
  }, []);

  const todaysSessions = useLiveQuery(
    // Return ALL of today's real sessions, not just the first — a day can
    // carry a planned workout + an extra run or sport session. Drafts are
    // excluded.
    async () => {
      const all = await db.sessions.where("date").equals(today).toArray();
      return all.filter((s) => s.startedAt || s.finishedAt);
    },
    [today],
    [] as Session[]
  );
  const todaysSession = todaysSessions?.[0];

  const recent = useLiveQuery(
    // Exclude drafts entirely from history-style listings. Query the full
    // set then filter — a wide `.limit()` before filtering lets draft
    // previews (which can pile up) push real sessions out of view and
    // reset the day streak. We only want finished/started work here.
    async () => {
      const all = await db.sessions.orderBy("date").reverse().toArray();
      return all.filter((s) => s.startedAt || s.finishedAt).slice(0, 30);
    },
    []
  );

  const plan = useLiveQuery(async () => {
    const p = await db.weeklyPlan.get("me");
    if (!p) return null;
    return { ...p, days: p.days.map(normalizePlannedDay) };
  }, []);

  // Days for the currently-displayed week: override wins over the base plan.
  // Recomputes when weekOffset changes or overrides are updated.
  const displayedWeekStart = useMemo(() => {
    const d = startOfWeek(new Date(), { weekStartsOn: 1 });
    d.setDate(d.getDate() + weekOffset * 7);
    return format(d, "yyyy-MM-dd");
  }, [weekOffset]);
  const displayedWeekDays = useLiveQuery(async () => {
    const override = await db.weekOverrides
      .where("weekStartDate")
      .equals(displayedWeekStart)
      .first();
    if (override) return override.days.map(normalizePlannedDay);
    const p = await db.weeklyPlan.get("me");
    return p ? p.days.map(normalizePlannedDay) : null;
  }, [displayedWeekStart]);
  const displayedIsOverride = useLiveQuery(async () => {
    const o = await db.weekOverrides
      .where("weekStartDate")
      .equals(displayedWeekStart)
      .first();
    return !!o;
  }, [displayedWeekStart]);

  // Read the same source as the week strip — if the current week has a
  // week override (e.g. W1/W2 learn-week, W5 realization, deload), the base
  // plan's slot for today may say stretching/hyrox/etc. but the override
  // says something else. The two must agree, or the chip and the card
  // disagree and the user doesn't know which is real.
  const plannedToday: PlannedDay =
    (weekOffset === 0 ? displayedWeekDays?.[todayIdx] : null) ??
    plan?.days[todayIdx] ?? null;
  // Always compute — used as primary CTA if no plan, or as secondary hint if plan disagrees
  const recommendation: Recommendation | null = recent
    ? recommendForToday(recent, new Date())
    : null;

  // Recommendation disagrees with the plan if the categories differ,
  // or the plan is a specific template the user already did this week.
  // We also suppress the disagreement banner entirely when a focus block is
  // active — the block IS the plan, second-guessing it is coach whiplash.
  const planDisagreesWithRec =
    !profile?.currentFocus &&
    Boolean(
      plannedToday &&
        recommendation &&
        (recommendation.category !== plannedToday.category ||
          (recommendation.templateId &&
            plannedToday.templateId &&
            recommendation.templateId !== plannedToday.templateId))
    );
  const streak = computeStreak(recent ?? []);
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStart = addDays(currentWeekStart, weekOffset * 7);
  // "Today" pill only lights up when the strip is viewing the current week.
  const displayedTodayIdx = weekOffset === 0 ? todayIdx : -1;
  // Map date → most recent finished session for that date
  const sessionsByDate = new Map<string, Session>();
  for (const s of recent ?? []) {
    if (!s.finishedAt) continue;
    if (!sessionsByDate.has(s.date)) sessionsByDate.set(s.date, s);
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-6 space-y-7">
      <header className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.22em] text-text-dim font-medium">
            {format(new Date(), "EEEE, MMM d")}
          </p>
          <h1 className="font-display text-[2.75rem] leading-[0.95] font-normal mt-1 tracking-tight text-text">
            {greet()}{profile?.name && profile.name !== "Athlete" ? `, ${profile.name}` : ""}.
          </h1>
        </div>
        {streak > 0 && (
          <div className="text-right shrink-0 pb-1">
            <span className="text-sm text-text-muted tabular-nums">
              <span className="font-display text-xl text-accent align-baseline">{streak}</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-text-dim ml-1.5 font-medium">day streak</span>
            </span>
          </div>
        )}
      </header>

      {profile && !profile.onboarded && (
        <Link
          href="/onboarding"
          className="block border border-border-strong/40 bg-bg-elevated rounded-2xl p-4"
        >
          <div className="text-[11px] uppercase tracking-[0.22em] text-accent font-medium">
            Personalize your training
          </div>
          <div className="text-sm text-text-muted mt-2 leading-relaxed">
            Set your goals, injuries, strength maxes, and running pace.
            Workouts get tailored loads and safer swaps. 2 min.
          </div>
        </Link>
      )}

      {profile?.currentFocus && (
        (() => {
          const focus = profile.currentFocus;
          const daysIn = Math.max(
            0,
            differenceInCalendarDays(new Date(), new Date(focus.startedAt))
          );
          const weekNum = Math.floor(daysIn / 7) + 1;
          const isDone = weekNum > focus.durationWeeks;
          return isDone ? (
            <BlockCompleteCard focus={focus} sessions={recent ?? []} />
          ) : (
            <>
              <FocusIndicator focus={focus} />
              {focus.name === "Surf prep" && (
                <BreathingCard weekInBlock={weekNum} />
              )}
            </>
          );
        })()
      )}

      {/* TODAY's primary CTA.
          When the block is paused we hide the planned session — the user is
          off-plan on purpose. They can still open categories manually. */}
      {profile?.currentFocus?.pausedAt ? (
        <PausedTodayCard />
      ) : todaysSession ? (
        <TodaysSessionsStack sessions={todaysSessions ?? [todaysSession]} />
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

      {/* Fast path for "I did something different" or "I did an extra thing":
          one-tap category chips that log a retroactive session for today.
          Visible in every Today state — if you planned Z2 but ran strength,
          or did your planned workout plus an afternoon sport session, you
          don't need to dig into the Plan page. */}
      {!profile?.currentFocus?.pausedAt && (
        <QuickLogRow
          hasSessionToday={!!todaysSession}
          onPickCategory={async (cat, label) => {
            const { logRetroactiveSession } = await import("@/lib/db");
            await logRetroactiveSession(today, cat, label);
          }}
          onOpenPicker={() => setLogDate(today)}
        />
      )}

      {/* Week strip — navigable across weeks so the block outlook is visible */}
      <WeekStrip
        days={displayedWeekDays ?? plan?.days ?? [null, null, null, null, null, null, null]}
        weekStart={weekStart}
        todayIdx={displayedTodayIdx}
        weekOffset={weekOffset}
        onPrevWeek={() => setWeekOffset((w) => w - 1)}
        onNextWeek={() => setWeekOffset((w) => w + 1)}
        onReturnToToday={() => setWeekOffset(0)}
        sessionsByDate={sessionsByDate}
        onLogPast={(date) => setLogDate(date)}
        onPreviewFuture={(date) => setPreviewDate(date)}
        isOverride={displayedIsOverride ?? false}
      />

      {logDate && (
        <QuickLogModal
          date={logDate}
          onClose={() => setLogDate(null)}
          onLogged={() => setLogDate(null)}
        />
      )}

      {previewDate && plan && profile && (
        <DayPreviewModal
          date={previewDate}
          // Read from displayedWeekDays (override-aware) so sailing-week Sport
          // days show the sport preview, not the base plan's Paddle Push.
          day={
            (displayedWeekDays ?? plan.days)[
              dateToPlanIndex(new Date(previewDate + "T00:00:00"))
            ]
          }
          profile={profile}
          onClose={() => setPreviewDate(null)}
        />
      )}

    </div>
  );
}

// Breathing card — Surf-Prep-only companion. Not tied to the workout block;
// meant to be done at a separate time of day. Rotates the practice by
// week-in-block so W1 is a gentle CNS baseline and W5 is real CO2/O2 work.
function BreathingCard({ weekInBlock }: { weekInBlock: number }) {
  const [expanded, setExpanded] = useState(false);
  const w = Math.max(1, Math.min(6, weekInBlock));
  const protocol = (() => {
    if (w <= 2)
      return {
        name: "Box breathing",
        summary: "4s in · 4s hold · 4s out · 4s hold · × 5 min",
        why: "CNS baseline — trains calm under load.",
        how: "Sit or lie down. Breathe in through the nose for 4 seconds, hold for 4, exhale through the mouth for 4, hold empty for 4. That's one round. Do it for 5 minutes. Any time of day works; especially good pre-sleep.",
      };
    if (w === 3)
      return {
        name: "CO2 tolerance table",
        summary: "Hold with shrinking rest — 2:00 → 1:45 → 1:30 … → 0:15",
        why: "Sailing week — build wipeout tolerance while you're in the water anyway.",
        how: "Pick a comfortable breath-hold (say 45s). Rest 2:00, then hold. Rest 1:45, hold same time. Rest 1:30, hold. Keep dropping rest by 15s down to 0:15 rest. Hold length stays constant — the CO2 buildup does the work.",
      };
    if (w === 4)
      return {
        name: "O2 max-hold table",
        summary: "Fixed 2:00 rest · holds climb 1:00 → 1:15 → 1:30 → 1:45 → 2:00",
        why: "Build absolute breath-hold capacity.",
        how: "Rest 2:00, hold 1:00. Rest 2:00, hold 1:15. Keep climbing the hold length. If you can't hit the next step, hold the last one again. 2× per week.",
      };
    if (w === 5)
      return {
        name: "Alternate CO2 & O2 tables",
        summary: "Peak week — one table per day",
        why: "Peak the breath-hold system without over-doing it. Alternate the stressor.",
        how: "Odd days: CO2 table (from week 3). Even days: O2 table (from week 4). Skip a day if it feels stressful — this is a nervous-system practice, not a grind.",
      };
    return {
      name: "4-7-8 breathing",
      summary: "4s in · 7s hold · 8s out · × 10 rounds",
      why: "Taper week — parasympathetic reset. Do it nightly before you fly.",
      how: "Inhale through the nose for 4. Hold for 7. Exhale slowly through the mouth for 8, making a soft whoosh. That's one round. 10 rounds pre-sleep. Land in El Salvador rested.",
    };
  })();

  return (
    <button
      onClick={() => setExpanded((v) => !v)}
      className="w-full text-left bg-bg-elevated border border-border rounded-2xl p-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-text-dim">
            Breathing — Week {w}
          </div>
          <div className="font-semibold mt-0.5">{protocol.name}</div>
          <div className="text-xs text-text-muted mt-0.5">
            {protocol.summary}
          </div>
        </div>
        <div className="text-text-dim text-lg">{expanded ? "−" : "+"}</div>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          <div className="text-xs text-text-muted italic">{protocol.why}</div>
          <div className="text-sm">{protocol.how}</div>
          <div className="text-[10px] uppercase tracking-widest text-text-dim pt-1">
            Do it separately from your workout — anywhere in the day.
          </div>
        </div>
      )}
    </button>
  );
}

function FocusIndicator({
  focus,
}: {
  focus: NonNullable<Profile["currentFocus"]>;
}) {
  // While paused, time stops: week counter + phase freeze at pausedAt.
  const isPaused = !!focus.pausedAt;
  const effToday = effectiveFocusToday(focus);
  const daysIn = Math.max(0, differenceInCalendarDays(effToday, new Date(focus.startedAt)));
  const weekNum = Math.floor(daysIn / 7) + 1;
  const done = weekNum > focus.durationWeeks;
  const totalDays = focus.durationWeeks * 7;
  const pct = Math.min(100, Math.round((daysIn / totalDays) * 100));
  // Same wave the generator uses — surfacing it here so the user sees why
  // this week feels different (Realization = peak, Deload = ease off).
  const phase = done
    ? null
    : getBlockPhase(focus.startedAt, focus.durationWeeks, effToday);

  return (
    <Link
      href="/plan"
      className={clsx(
        "block border rounded-2xl px-4 py-3 transition-colors",
        isPaused
          ? "bg-bg-card border-text-dim/40"
          : "bg-bg-card border-border hover:border-accent/40"
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div
            className={clsx(
              "text-[10px] uppercase tracking-widest font-semibold flex items-center gap-2",
              isPaused ? "text-text-dim" : "text-text-dim"
            )}
          >
            {isPaused && (
              <span className="bg-text-dim/15 text-text-muted px-1.5 py-0.5 rounded">
                PAUSED
              </span>
            )}
            Focus block
          </div>
          <div className="text-sm font-medium mt-0.5">{focus.name}</div>
        </div>
        <div className="text-xs text-text-dim shrink-0 text-right">
          {done ? (
            "block complete →"
          ) : (
            <>
              Week {weekNum} of {focus.durationWeeks}
              {phase && (
                <span className={clsx("block text-[10px] mt-0.5", isPaused ? "text-text-dim" : "text-accent")}>
                  {phase.label}
                </span>
              )}
            </>
          )}
        </div>
      </div>
      <div className="mt-2 h-1 bg-border rounded-full overflow-hidden">
        <div
          className={clsx("h-full", isPaused ? "bg-text-dim/60" : "bg-accent")}
          style={{ width: `${done ? 100 : pct}%` }}
        />
      </div>
    </Link>
  );
}

function BlockCompleteCard({
  focus,
  sessions,
}: {
  focus: NonNullable<Profile["currentFocus"]>;
  sessions: Session[];
}) {
  // Count finished sessions during the block's window.
  const start = focus.startedAt;
  const totalWeeks = focus.durationWeeks;
  const done = sessions.filter(
    (s) => s.finishedAt && s.date >= start
  ).length;
  const targetSessionsPerWeek = 5;
  const targetTotal = totalWeeks * targetSessionsPerWeek;

  const clear = async () => {
    if (!confirm(`Close out the ${focus.name} block? You'll pick a new focus.`)) return;
    await archiveCurrentFocus();
    await saveProfile({ currentFocus: undefined });
    // Home rerenders on live query; nothing else needed.
    location.reload();
  };

  return (
    <section className="border border-accent/50 bg-text/5 rounded-2xl p-5 space-y-3">
      <div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-accent font-medium">
          Block complete
        </div>
        <div className="font-display text-3xl font-normal tracking-tight mt-1.5 text-text">
          {focus.name} done.
        </div>
      </div>
      <p className="text-sm text-text-muted leading-relaxed">
        {totalWeeks} weeks · {done} of ~{targetTotal} planned sessions logged.
        Nice work. Pick your next focus to keep the coach thinking in blocks.
      </p>
      <div className="flex gap-2 pt-1">
        <Link
          href="/plan"
          className="flex-1 text-center bg-accent text-bg font-semibold rounded-full px-4 h-11 text-sm hover:bg-accent-dim transition-colors flex items-center justify-center"
        >
          Pick next block →
        </Link>
        <button
          onClick={clear}
          className="px-5 h-11 rounded-full border border-border-strong/40 text-text-muted text-sm font-medium hover:border-text-dim hover:text-text transition-colors"
        >
          Later
        </button>
      </div>
    </section>
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

  const color = categoryColor(day.category);
  return (
    <Link
      href={href}
      className="block border border-accent/25 bg-bg-elevated rounded-2xl p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] font-semibold text-accent">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: color.solid }}
              aria-hidden
            />
            Today's session
          </div>
          <div className="font-display text-4xl font-normal tracking-tight mt-2 leading-[1.05] text-text">
            {title}
          </div>
          <div className="text-sm text-text-muted mt-1.5 leading-relaxed">{subtitle}</div>
        </div>
        <button
          onClick={markDone}
          className="shrink-0 w-11 h-11 rounded-full border border-accent/40 bg-transparent text-accent flex items-center justify-center text-base hover:bg-accent hover:text-bg transition-colors"
          aria-label="Mark today done — I already did this"
          title="I already did this"
        >
          ✓
        </button>
      </div>
      <div className="mt-4 text-sm font-medium text-accent">
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
      className="block border border-accent/50 bg-text/5 rounded-2xl p-5 hover:border-accent transition-colors"
    >
      <div className="text-[10px] uppercase tracking-[0.22em] text-accent font-medium">
        Based on your week — try today
      </div>
      <div className="font-display text-3xl font-normal tracking-tight mt-1.5 text-text">
        {CATEGORY_LABELS[rec.category]}{template ? ` — ${title}` : ""}
      </div>
      <p className="text-sm text-text-muted mt-2.5 leading-relaxed">
        {rec.reasoning}
      </p>
      <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-accent font-medium">
        Start workout →
      </div>
    </Link>
  );
}

function PausedTodayCard() {
  return (
    <Link
      href="/plan"
      className="block bg-bg-card border border-text-dim/30 rounded-2xl p-5"
    >
      <div className="text-[10px] uppercase tracking-widest text-text-dim font-semibold">
        Block paused
      </div>
      <div className="text-lg font-semibold mt-1">You&apos;re off-plan today.</div>
      <p className="text-sm text-text-muted mt-2 leading-relaxed">
        Nothing scheduled while the block is paused. Train what fits — tap a category from the catalog, or resume from Plan.
      </p>
      <div className="text-xs text-accent mt-3">Open Plan →</div>
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

function TodaysSessionsStack({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 1) {
    return <TodaysSessionCard session={sessions[0]} />;
  }
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-widest text-accent font-semibold">
        Today — {sessions.length} sessions
      </div>
      {sessions.map((s, i) => (
        <TodaysSessionCard key={s.id ?? i} session={s} compact />
      ))}
    </div>
  );
}

function TodaysSessionCard({ session, compact }: { session: Session; compact?: boolean }) {
  const done = Boolean(session.finishedAt);
  const tid = session.modifiers?.templateId;
  const href = tid
    ? `/workout/${session.category}?template=${tid}`
    : `/workout/${session.category}`;
  const color = categoryColor(session.category);
  const remove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Remove "${session.name}" from today? Undoes the Done mark.`)) return;
    if (session.id !== undefined) await db.sessions.delete(session.id);
  };
  return (
    <Link
      href={href}
      className={clsx(
        "block border border-border-strong/40 bg-bg-elevated rounded-2xl relative",
        compact ? "p-4" : "p-5"
      )}
    >
      <button
        onClick={remove}
        aria-label="Remove session"
        title="Remove"
        className="absolute top-3 right-3 w-7 h-7 rounded-full text-text-dim hover:text-danger hover:bg-danger/10 flex items-center justify-center text-base leading-none"
      >
        ×
      </button>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] font-semibold text-text-muted pr-8">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: color.solid }}
          aria-hidden
        />
        <span>{compact ? CATEGORY_LABELS[session.category] : "Today's session"}</span>
        {done && <span className="text-text-dim">· Done</span>}
      </div>
      <div
        className={clsx(
          "font-display font-normal tracking-tight mt-2 leading-[1.05] text-text",
          compact ? "text-xl" : "text-3xl"
        )}
      >
        {session.name}
      </div>
      {!compact && (
        <div className="mt-4 text-sm font-medium text-accent">
          {done ? "Review →" : "Open workout →"}
        </div>
      )}
    </Link>
  );
}

// One-tap retroactive logging row. Keeps the top-5 most-useful categories
// as pills; tapping saves a bare retroactive session (no template picker).
// "More" opens the full modal for anything else. Shown on Home in every
// Today state so the user never has to go hunt for a change path.
function QuickLogRow({
  hasSessionToday,
  onPickCategory,
  onOpenPicker,
}: {
  hasSessionToday: boolean;
  onPickCategory: (cat: import("@/lib/types").Category, label: string) => Promise<void>;
  onOpenPicker: () => void;
}) {
  const QUICK_CATS: { id: import("@/lib/types").Category; label: string }[] = [
    { id: "strength", label: "Strength" },
    { id: "cardio",   label: "Cardio" },
    { id: "hyrox",    label: "Hyrox" },
    { id: "sport",    label: "Sport" },
    { id: "stretching", label: "Mobility" },
  ];
  const [pending, setPending] = useState<string | null>(null);
  return (
    <section className="space-y-2">
      <div className="text-[11px] uppercase tracking-widest text-text-dim font-semibold">
        {hasSessionToday ? "Did something else too?" : "I did something different →"}
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK_CATS.map((c) => {
          const color = categoryColor(c.id);
          const active = pending === c.id;
          return (
            <button
              key={c.id}
              disabled={pending !== null}
              onClick={async () => {
                setPending(c.id);
                await onPickCategory(c.id, c.label);
                setPending(null);
              }}
              className={clsx(
                "h-9 px-3.5 rounded-full border text-[13px] font-medium transition-colors flex items-center gap-2",
                active
                  ? "bg-text text-bg border-text"
                  : "bg-transparent border-border-strong/60 text-text-muted hover:text-text hover:border-text-muted"
              )}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: color.solid, opacity: active ? 0.3 : 1 }}
                aria-hidden
              />
              {c.label}
            </button>
          );
        })}
        <button
          onClick={onOpenPicker}
          className="h-9 px-3.5 rounded-full border border-border-strong/60 bg-transparent text-[13px] font-medium text-text-dim hover:text-text-muted"
        >
          More
        </button>
      </div>
    </section>
  );
}

function WeekStrip({
  days,
  weekStart,
  todayIdx,
  weekOffset,
  onPrevWeek,
  onNextWeek,
  onReturnToToday,
  sessionsByDate,
  onLogPast,
  onPreviewFuture,
  isOverride,
}: {
  days: PlannedDay[];
  weekStart: Date;
  todayIdx: number;
  weekOffset: number;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onReturnToToday: () => void;
  sessionsByDate: Map<string, Session>;
  onLogPast: (date: string) => void;
  onPreviewFuture: (date: string) => void;
  isOverride: boolean;
}) {
  // Home starts collapsed — just a row of 7 dots. Tap "See all" to expand
  // into the full strip with labels, dates, and prev/next-week controls.
  // Product rationale: Home should surface one verb (today's workout).
  // The weekly outlook is context, not a decision — belongs behind a tap.
  // Auto-expand when the user navigates off the current week (weekOffset!=0)
  // so the Previous/Next-week controls are reachable.
  const [expanded, setExpanded] = useState(false);
  const isExpanded = expanded || weekOffset !== 0;

  const weekEnd = addDays(weekStart, 6);
  const dateRange =
    format(weekStart, "MMM") === format(weekEnd, "MMM")
      ? `${format(weekStart, "MMM d")}–${format(weekEnd, "d")}`
      : `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d")}`;
  const heading =
    weekOffset === 0
      ? "This week"
      : weekOffset === 1
      ? "Next week"
      : weekOffset === -1
      ? "Last week"
      : weekOffset > 0
      ? `In ${weekOffset} weeks`
      : `${Math.abs(weekOffset)} weeks ago`;
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Collapsed view — one tight row, dot-per-day, no labels, no dates.
  if (!isExpanded) {
    return (
      <section>
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center justify-between pb-2.5 group"
        >
          <span className="text-[11px] uppercase tracking-[0.22em] text-text-dim font-medium">
            This week
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-text-dim group-hover:text-text transition-colors font-medium">
            See all ›
          </span>
        </button>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            const date = addDays(weekStart, i);
            const dateStr = format(date, "yyyy-MM-dd");
            const session = sessionsByDate.get(dateStr);
            const displayCategory = session?.category ?? day?.category;
            const color = displayCategory ? categoryColor(displayCategory) : null;
            const isToday = i === todayIdx;
            const isPast = dateStr < todayStr;
            const handler = () => {
              if (isPast || session) onLogPast(dateStr);
              else if (day) onPreviewFuture(dateStr);
            };

            return (
              <button
                key={i}
                onClick={handler}
                className={clsx(
                  "flex flex-col items-center py-2.5 rounded-xl border transition-colors",
                  isToday
                    ? "border-accent/60 bg-text/5"
                    : "border-transparent hover:border-border-strong/40"
                )}
              >
                <span
                  className={clsx(
                    "text-[10px] uppercase tracking-[0.18em] font-medium",
                    isToday ? "text-accent" : "text-text-dim"
                  )}
                >
                  {DAY_LABELS_SHORT[i][0]}
                </span>
                <span
                  className={clsx(
                    "w-1.5 h-1.5 rounded-full mt-2",
                    !displayCategory && "bg-text-dim/25",
                    session ? "" : "opacity-50"
                  )}
                  style={displayCategory ? { background: color?.solid } : undefined}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  // Expanded view (user tapped "See all" or is on a different week).
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setExpanded(false);
              if (weekOffset !== 0) onReturnToToday();
            }}
            className="flex items-center gap-2"
          >
            <span className="text-[11px] uppercase tracking-[0.22em] text-text-dim font-medium hover:text-text transition-colors">
              {heading}
            </span>
            <span className="text-text-dim text-xs">▾</span>
          </button>
          <span className="text-[10px] text-text-dim tabular-nums">
            {dateRange}
          </span>
          {isOverride && (
            <span
              className="text-[9px] uppercase tracking-[0.18em] text-accent border border-accent/40 px-1.5 py-0.5 rounded font-medium"
              title="This week deviates from your base plan — only affects this week."
            >
              Edited
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onPrevWeek}
            aria-label="Previous week"
            className="w-7 h-7 rounded-full border border-border-strong/40 text-text-muted flex items-center justify-center hover:border-text-dim"
          >
            ‹
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={onReturnToToday}
              className="px-2.5 h-7 rounded-full border border-border-strong/40 text-[10px] uppercase tracking-[0.18em] text-text-muted hover:border-text-dim font-medium"
            >
              Today
            </button>
          )}
          <button
            onClick={onNextWeek}
            aria-label="Next week"
            className="w-7 h-7 rounded-full border border-border-strong/40 text-text-muted flex items-center justify-center hover:border-text-dim"
          >
            ›
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, i) => {
          const date = addDays(weekStart, i);
          const dateStr = format(date, "yyyy-MM-dd");
          const isToday = i === todayIdx;
          const todayStr = format(new Date(), "yyyy-MM-dd");
          const isPast = dateStr < todayStr;
          const isFuture = dateStr > todayStr;
          const session = sessionsByDate.get(dateStr);

          // Prefer real session data over planned data when available.
          // Use the short label — the strip is narrow; full names belong in
          // the Today card and preview modal. Locked templates get their own
          // short (Push/Pull/Legs/Z2/DL/…) so a PPL week is legible.
          const displayCategory = session?.category ?? day?.category;
          const displayTemplateId =
            session?.modifiers?.templateId ?? day?.templateId;
          const label = displayCategory
            ? chipShortLabel(displayCategory, displayTemplateId)
            : null;

          const color = displayCategory ? categoryColor(displayCategory) : null;
          const chipClasses = clsx(
            "rounded-xl px-1.5 py-2 text-center border transition-colors block min-h-[82px] flex flex-col bg-transparent",
            isToday
              ? "border-accent/60"
              : "border-border-strong/40 hover:border-text-dim"
          );

          const inner = (
            <>
              <div className={clsx(
                "text-[10px] uppercase tracking-[0.2em] font-semibold",
                isToday ? "text-accent" : "text-text-dim"
              )}>
                {DAY_LABELS_SHORT[i]}
              </div>
              <div className="text-[9px] tabular-nums text-text-dim/70 mt-0.5">
                {format(date, "M/d")}
              </div>
              <div className="mt-2 flex-1 flex flex-col items-center justify-center w-full min-w-0">
                {session ? (
                  <>
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: color?.solid ?? "var(--text-muted)" }}
                      aria-hidden
                    />
                    {label && (
                      <span className="text-[10px] font-medium text-text-muted leading-tight mt-1.5 w-full px-0.5 truncate">
                        {label}
                      </span>
                    )}
                  </>
                ) : label ? (
                  <>
                    <span
                      className="w-1.5 h-1.5 rounded-full opacity-50"
                      style={{ background: color?.solid ?? "var(--text-dim)" }}
                      aria-hidden
                    />
                    <span className="text-[10px] text-text-dim leading-tight w-full px-0.5 truncate mt-1.5">
                      {label}
                    </span>
                  </>
                ) : isPast ? (
                  <span className="text-[10px] text-accent/70 leading-tight tracking-wide">+ Log</span>
                ) : (
                  <span className="text-text-dim/60 text-xs tracking-wide">Rest</span>
                )}
              </div>
            </>
          );

          // Past day → always open the day modal (same surface whether there's
          // a session or not). Modal lists existing sessions with × delete AND
          // offers Add-another, so it doubles as a day editor.
          if (isPast) {
            return (
              <button key={i} className={chipClasses} onClick={() => onLogPast(dateStr)}>
                {inner}
              </button>
            );
          }

          // Future planned day → tap opens preview modal (shows generated exercises for that date)
          if (isFuture && day) {
            return (
              <button key={i} className={chipClasses} onClick={() => onPreviewFuture(dateStr)}>
                {inner}
              </button>
            );
          }

          // Today or future rest day → navigate to workout or plan
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
      <p className="text-[10px] text-text-dim mt-3 leading-relaxed tracking-wide">
        Tap a future day to preview. Tap a past day to add, edit, or remove.
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
