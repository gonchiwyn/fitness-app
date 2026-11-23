"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import clsx from "clsx";
import { cleanupStaleDrafts, db, getProfile, getWeeklyPlan } from "@/lib/db";
import QuickLogModal from "@/components/QuickLogModal";
import DayPreviewModal from "@/components/DayPreviewModal";
import { templatesFor } from "@/lib/data/templates";
import { nextBlockSuggestions, presetByFocusName } from "@/lib/data/presets";
import { categoryColor } from "@/lib/categoryTheme";
import { recommendForToday, type Recommendation } from "@/lib/recommend";
import {
  CATEGORY_BLURBS,
  CATEGORY_LABELS,
  dateToPlanIndex,
  blockWeekNumber,
  effectiveFocusToday,
  getBlockPhase,
  normalizePlannedDay,
  type PlannedDay,
  type Profile,
  type Session,
} from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [logDate, setLogDate] = useState<string | null>(null);
  const [previewDate, setPreviewDate] = useState<string | null>(null);
  // Offset in weeks from the current week (0 = this week, +1 = next, -1 = last).
  // Lets the user scan the block outlook without leaving Home.
  const [weekOffset] = useState(0);
  const today = format(new Date(), "yyyy-MM-dd");
  const todayIdx = dateToPlanIndex(new Date());

  useEffect(() => {
    getProfile().then((p) => {
      setProfile(p);
      // Brand-new user: route them straight into onboarding instead of
      // dumping them on an empty Home with a tiny "Finish setup" pill they
      // can easily miss. Honors onboardingDismissed so a user who chose
      // "Skip for now" doesn't get bounced back every open.
      if (p && !p.onboarded && !p.onboardingDismissed) {
        router.replace("/onboarding");
      }
    });
    // Seed personal weekly plan on first load (idempotent — only creates if missing)
    getWeeklyPlan();
    // Clean up old draft previews that the user never started
    cleanupStaleDrafts();
  }, [router]);

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

  // Next week's days — fetched separately so Next Up can resolve the actual
  // slot for tomorrow when "tomorrow" crosses a week boundary. Previously
  // Next Up always read from THIS week's day array and drew this-week's
  // Monday pattern on next-week's Monday date — even when next week had an
  // override (e.g. the deload override saved at Hyrox-prep start).
  const nextWeekStartStr = useMemo(
    () => format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 7), "yyyy-MM-dd"),
    []
  );
  const nextWeekDays = useLiveQuery(async () => {
    const override = await db.weekOverrides
      .where("weekStartDate")
      .equals(nextWeekStartStr)
      .first();
    if (override) return override.days.map(normalizePlannedDay);
    const p = await db.weeklyPlan.get("me");
    return p ? p.days.map(normalizePlannedDay) : null;
  }, [nextWeekStartStr]);

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
  // Weekly session glance — Strava / Apple Fitness pattern. The implicit
  // target is the number of non-rest days in the user's base plan; "done"
  // is sessions finished Mon–Sun of this calendar week.
  const weekStartStr = format(currentWeekStart, "yyyy-MM-dd");
  const weekEndStr = format(addDays(currentWeekStart, 7), "yyyy-MM-dd");
  const doneThisWeek = (recent ?? []).filter(
    (s) => s.finishedAt && s.date >= weekStartStr && s.date < weekEndStr
  ).length;
  const weekTarget = (plan?.days ?? []).filter((d) => d !== null).length || 5;
  // A user who skipped onboarding still gets a seeded default weekly plan
  // (getWeeklyPlan auto-seeds). Surfacing it as "0 of 6 this week" and
  // "Next up — Mon · Strength" presents a program they never chose as if
  // they had. Suppress those until they've either finished onboarding,
  // picked a block, or logged something of their own.
  const showsGhostPlan =
    !!profile &&
    !profile.onboarded &&
    !profile.currentFocus &&
    (recent ?? []).length === 0;
  // Resume path — Hevy / Caliber / Peloton all pin a "Resume" banner when a
  // workout is mid-flight so the user doesn't have to re-navigate to it.
  const draftSession = (recent ?? []).find(
    (s) => s.startedAt && !s.finishedAt && s.date === today
  );
  // Map date → most recent finished session for that date
  const sessionsByDate = new Map<string, Session>();
  for (const s of recent ?? []) {
    if (!s.finishedAt) continue;
    if (!sessionsByDate.has(s.date)) sessionsByDate.set(s.date, s);
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-6 space-y-7">
      {/* Tight header. Date + name + streak share a baseline — no stacked
          columns, no big accent number. Oura / Apple Fitness pattern: the
          user is here for the verb below, not to admire their streak. */}
      <header>
        <div className="flex items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <span className="text-[13px] font-medium tracking-[-0.02em] text-text">Outwork</span>
            <span className="text-[12px] tracking-normal text-text-dim font-medium">
              {format(new Date(), "EEE, MMM d")}
            </span>
          </div>
          {streak > 0 && (
            <span className="text-[12px] tracking-normal text-text-dim font-medium tabular-nums shrink-0">
              <span className="text-accent">{streak}</span> day streak
            </span>
          )}
        </div>
        <h1 className="text-[2rem] leading-[1] font-medium mt-3 tracking-[-0.03em] text-text">
          {greet()}{profile?.name && profile.name !== "Athlete" ? `, ${profile.name}` : ""}.
        </h1>
      </header>

      {/* Context card: block + week progress together. Oura/Whoop pattern —
          a single glance surface that answers "where am I in training" + "how's
          this week going". Replaces the old two-strip (focus indicator + week
          progress bar) which read as two disconnected afterthoughts.
          Hidden for a user who skipped onboarding and has no block: the week
          meter would be counting against a default plan they never chose
          ("0 of 6 this week"), which reads as a goal they signed up for. */}
      {!profile?.currentFocus?.pausedAt && !showsGhostPlan && (
        <ContextCard
          focus={profile?.currentFocus}
          done={doneThisWeek}
          target={weekTarget}
        />
      )}

      {draftSession && (
        <Link
          href={`/workout/${draftSession.category}`}
          className="flex items-center justify-between gap-3 border border-accent/50 bg-text/5 rounded-2xl px-4 py-3"
        >
          <div className="min-w-0">
            <div className="text-[11px] tracking-normal text-accent font-medium">
              In progress
            </div>
            <div className="text-sm text-text font-medium truncate mt-0.5">
              {draftSession.name}
            </div>
          </div>
          <span className="shrink-0 bg-accent text-bg rounded-full px-4 py-1.5 text-xs font-semibold">
            Resume →
          </span>
        </Link>
      )}

      {profile && !profile.onboarded && !profile.setupPillDismissed && (
        <div className="flex items-stretch gap-2">
          <Link
            href="/onboarding"
            className="flex-1 flex items-center justify-between gap-3 border border-accent/40 rounded-full px-4 py-2.5 text-[12px] tracking-normal font-medium text-accent"
          >
            <span>Finish setup — 2 min</span>
            <span>›</span>
          </Link>
          <button
            onClick={async () => {
              const { saveProfile } = await import("@/lib/db");
              await saveProfile({ setupPillDismissed: true });
              setProfile((p) => (p ? { ...p, setupPillDismissed: true } : p));
            }}
            aria-label="Dismiss setup reminder"
            title="Dismiss — still available in Profile → Settings"
            className="w-9 h-9 rounded-full border border-border-strong/40 text-text-dim text-sm hover:text-text hover:border-text-dim transition-colors flex items-center justify-center shrink-0"
          >
            ×
          </button>
        </div>
      )}

      {profile?.currentFocus && (
        (() => {
          const focus = profile.currentFocus;
          // Must use effectiveFocusToday, not raw today — while a block is
          // PAUSED the week counter freezes at pausedAt. Reading real today
          // here made the block-complete card and last-week banner keep
          // advancing while the context card right above them stayed frozen.
          const weekNum = blockWeekNumber(focus.startedAt, effectiveFocusToday(focus));
          const isDone = weekNum > focus.durationWeeks;
          const isLastWeek = !isDone && weekNum === focus.durationWeeks;
          return (
            <>
              {isDone && <BlockCompleteCard focus={focus} sessions={recent ?? []} />}
              {isLastWeek && <LastWeekBanner focus={focus} />}
              {!isDone &&
                presetByFocusName(focus.name)?.companion === "breathing" && (
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
      ) : showsGhostPlan ? (
        // Skipped onboarding, no block, nothing logged — don't present the
        // seeded default as "today's workout". Ask them to choose first.
        <NoPlanCard />
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

      {/* "Next up" teaser — Peloton pattern. One slim card telling the user
          what's on the horizon so there's continuity after they finish today.
          Plus a tiny "See full week" link to Plan for the tactical view. */}
      {!profile?.currentFocus?.pausedAt && !showsGhostPlan && (
        <NextUpCard
          thisWeekDays={displayedWeekDays ?? plan?.days ?? [null, null, null, null, null, null, null]}
          nextWeekDays={nextWeekDays ?? plan?.days ?? [null, null, null, null, null, null, null]}
          todayIdx={todayIdx}
          onPreview={(date) => setPreviewDate(date)}
        />
      )}

      {/* "I did something different" lives as a quiet text link now, not a
          row of chips. Home's job is one verb; the escape hatch is a one-
          tap link to the day's log modal, same surface as a past-day tap. */}
      {!profile?.currentFocus?.pausedAt && (
        <button
          onClick={() => setLogDate(today)}
          className="w-full text-[12px] tracking-normal text-text-dim hover:text-text font-medium transition-colors text-left"
        >
          Log something else ›
        </button>
      )}

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
          // Read from the week that the previewed date actually falls in —
          // Sunday-tapping-Monday lands in NEXT week, which may have its own
          // override (deload / learn / sailing / etc.). Falls back to the
          // base plan for weeks further out.
          day={(() => {
            const d = new Date(previewDate + "T00:00:00");
            const dMondayStr = format(
              startOfWeek(d, { weekStartsOn: 1 }),
              "yyyy-MM-dd"
            );
            const thisMondayStr = format(currentWeekStart, "yyyy-MM-dd");
            const source =
              dMondayStr === thisMondayStr
                ? displayedWeekDays ?? plan.days
                : dMondayStr === nextWeekStartStr
                  ? nextWeekDays ?? plan.days
                  : plan.days;
            return source[dateToPlanIndex(d)];
          })()}
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
        why: "Build wipeout tolerance — holding calm while CO2 climbs.",
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
      why: "Taper week — parasympathetic reset. Do it nightly.",
      how: "Inhale through the nose for 4. Hold for 7. Exhale slowly through the mouth for 8, making a soft whoosh. That's one round. 10 rounds pre-sleep. Arrive rested.",
    };
  })();

  return (
    <button
      onClick={() => setExpanded((v) => !v)}
      className="w-full text-left bg-bg-elevated border border-border rounded-2xl p-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] tracking-normal text-text-dim">
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
          <div className="text-[10px] tracking-normal text-text-dim pt-1">
            Do it separately from your workout — anywhere in the day.
          </div>
        </div>
      )}
    </button>
  );
}

// Unified Home glance — combines block progress + week progress in one card.
// Replaces the old FocusIndicator (quiet one-line passthrough) + WeekProgress
// (bar with floating caption) that visually read as two afterthoughts. The
// card surfaces: block name + week number + phase + visual week-sessions bar.
// With no block set, offers a tight "Pick a block →" CTA so Home never looks
// empty at the top.
function ContextCard({
  focus,
  done,
  target,
}: {
  focus: Profile["currentFocus"];
  done: number;
  target: number;
}) {
  if (!focus) {
    // No block — show week meter alone + quiet CTA to pick one. Friends see
    // "no plan" state as intentional, not broken.
    return (
      <section className="border border-border-strong/40 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] tracking-normal text-text-dim font-medium">
            No block yet
          </div>
          <Link
            href="/plan"
            className="text-[11px] tracking-normal text-accent font-medium hover:text-accent-dim"
          >
            Pick one →
          </Link>
        </div>
        <TrainingDaysMeter done={done} target={target} />
      </section>
    );
  }
  const effToday = effectiveFocusToday(focus);
  const weekNum = blockWeekNumber(focus.startedAt, effToday);
  const complete = weekNum > focus.durationWeeks;
  const phase = complete
    ? null
    : getBlockPhase(focus.startedAt, focus.durationWeeks, effToday);
  return (
    <Link
      href="/plan"
      className="block border border-border-strong/40 rounded-2xl p-4 space-y-3 hover:border-text-dim transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] tracking-normal text-accent font-medium">
            {focus.name}
          </div>
          <div className="text-[11px] text-text-dim mt-1 tabular-nums tracking-wide">
            Week {complete ? focus.durationWeeks : weekNum} of {focus.durationWeeks}
            {phase && ` · ${phase.label}`}
          </div>
        </div>
        <span className="text-text-dim text-sm shrink-0" aria-hidden>›</span>
      </div>
      <TrainingDaysMeter done={done} target={target} />
    </Link>
  );
}

// Discrete training-day meter — each planned session is a block. Filled
// blocks = done sessions. Hairline blocks = still to come. Replaces a single
// 3px progress bar that read as zero-value noise on week 1 (no fill visible).
// Apple Fitness rings in Nordic clothing.
function TrainingDaysMeter({ done, target }: { done: number; target: number }) {
  const t = Math.max(1, target);
  const cappedDone = Math.min(done, t);
  const slots = Array.from({ length: t }, (_, i) => i < cappedDone);
  const complete = cappedDone >= t;
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {slots.map((filled, i) => (
          <div
            key={i}
            className={clsx(
              "flex-1 h-2 rounded-full transition-colors",
              filled
                ? complete
                  ? "bg-success"
                  : "bg-accent"
                : "bg-text/10 border border-border-strong/60"
            )}
          />
        ))}
      </div>
      <div className="flex items-baseline justify-between text-[11px] tracking-normal font-medium">
        {/* Three cases: short of target, exactly on target, past target. The
            past-target state used to read "8 of 7 this week" — mathematically
            true but visually "wrong" — now shows the goal met + bonus count. */}
        {done < target && (
          <span className="text-text">
            {done} of {target} this week
          </span>
        )}
        {done === target && (
          <span className="text-success">
            {done} of {target} this week
          </span>
        )}
        {done > target && (
          <span className="text-success">
            {target} of {target} · +{done - target} bonus
          </span>
        )}
        {done < target && (
          <span className="text-text-dim tabular-nums">{target - done} to go</span>
        )}
        {done >= target && <span className="text-success">✓ done</span>}
      </div>
    </div>
  );
}

// Benchmark glance — surfaces the user's most recent tested metric. Signals
// "this app actually tracks the stuff Attia / Galpin / Huberman say matters"
// so a friend scanning Home sees measurement, not just workout logging.
// Silent when no benchmark exists yet (new user) so onboarding doesn't look
// littered.
// Proactive heads-up during the block's final week — nudges the user to
// think about what's next before they land on Monday with nothing scheduled.
// Tappable → routes into the Change Block picker with the current block as
// the "where you're coming from" context (used by the recommender).
function LastWeekBanner({ focus }: { focus: NonNullable<Profile["currentFocus"]> }) {
  return (
    <Link
      href={`/plan?pick=1&after=${encodeURIComponent(focus.name)}`}
      className="flex items-center justify-between gap-3 border border-accent/40 rounded-full px-4 py-2.5"
    >
      <div className="min-w-0">
        <div className="text-[11px] tracking-normal text-accent font-medium">
          Last week of {focus.name}
        </div>
        <div className="text-[11px] text-text-dim mt-0.5 truncate">
          Pick what comes next
        </div>
      </div>
      <span className="text-accent text-sm shrink-0" aria-hidden>›</span>
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
  // Count finished sessions during the block's window + total minutes trained.
  const start = focus.startedAt;
  const totalWeeks = focus.durationWeeks;
  const inBlock = sessions.filter((s) => s.finishedAt && s.date >= start);
  const done = inBlock.length;
  const totalMinutes = inBlock.reduce((acc, s) => {
    if (!s.startedAt || !s.finishedAt) return acc;
    return acc + Math.max(0, Math.round((s.finishedAt - s.startedAt) / 60000));
  }, 0);
  const suggestions = nextBlockSuggestions(focus.name);

  return (
    <section className="bg-text/[0.06] rounded-2xl p-5 space-y-4">
      <div>
        <div className="text-[11px] tracking-normal text-success font-medium">
          ✓ Block complete
        </div>
        <div className="text-[1.75rem] font-medium tracking-[-0.03em] mt-1.5 text-text leading-[1]">
          {focus.name} done.
        </div>
      </div>
      <div className="flex gap-4 text-[12px] tracking-normal text-text-dim font-medium tabular-nums">
        <span><span className="text-text">{totalWeeks}</span> wk</span>
        <span className="text-border-strong">·</span>
        <span><span className="text-text">{done}</span> sessions</span>
        {totalMinutes > 0 && (
          <>
            <span className="text-border-strong">·</span>
            <span><span className="text-text">{totalMinutes}</span> min</span>
          </>
        )}
      </div>

      <div className="space-y-2 pt-2">
        <div className="text-[11px] tracking-normal text-text-dim font-medium">
          What&apos;s next
        </div>
        <div className="space-y-2">
          {suggestions.map((p, i) => (
            <Link
              key={p.focusName}
              href={`/plan?pick=1&target=${encodeURIComponent(p.focusName)}`}
              className={clsx(
                "flex items-center justify-between gap-3 border rounded-xl px-3.5 py-2.5 transition-colors",
                i === 0
                  ? "border-accent/60 bg-accent/10 hover:bg-accent/15"
                  : "border-border-strong/40 hover:border-text-dim"
              )}
            >
              <div className="min-w-0">
                <div className="text-sm text-text font-medium truncate">{p.name}</div>
                <div className="text-[11px] text-text-dim mt-0.5 truncate leading-relaxed">
                  {p.tagline}
                </div>
              </div>
              <span className="shrink-0 text-[11px] tracking-normal text-text-dim font-medium tabular-nums">
                {p.durationWeeks}wk
              </span>
            </Link>
          ))}
        </div>
        <Link
          href="/plans"
          className="block text-[11px] tracking-normal text-text-dim hover:text-text font-medium pt-1"
        >
          Or browse all 12 →
        </Link>
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
    // Hero pattern from Hevy / Peloton / Caliber: the Today card is the
    // loudest thing on screen. Tinted background (not just hairline),
    // oversize headline, filled pill CTA inside the card. The whole card
    // remains tappable; the pill is the unmissable visual verb.
    <Link
      href={href}
      className="block bg-text/[0.055] rounded-2xl p-5 relative"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] tracking-normal font-medium text-accent">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: color.solid }}
            aria-hidden
          />
          Today
        </div>
        <button
          onClick={markDone}
          className="shrink-0 w-9 h-9 -mt-1 -mr-1 rounded-full border border-border-strong/40 bg-transparent text-text-dim flex items-center justify-center text-sm hover:border-accent/60 hover:text-accent transition-colors"
          aria-label="Mark today done — I already did this"
          title="I already did this"
        >
          ✓
        </button>
      </div>
      <div className="text-[2rem] font-medium tracking-[-0.03em] mt-3 leading-[1] text-text">
        {title}
      </div>
      <div className="text-sm text-text-muted mt-2 leading-relaxed">{subtitle}</div>
      <div className="mt-5 w-full flex items-center justify-center gap-2 bg-accent text-bg rounded-full px-5 py-3.5 text-base font-semibold hover:bg-accent-dim transition-colors">
        Start workout
        <span aria-hidden>→</span>
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
      <div className="text-[10px] tracking-normal text-accent font-semibold">
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
  const title = template ? `${CATEGORY_LABELS[rec.category]} — ${template.name}` : CATEGORY_LABELS[rec.category];
  const color = categoryColor(rec.category);

  return (
    <Link
      href={href}
      className="block bg-text/[0.055] rounded-2xl p-5"
    >
      <div className="flex items-center gap-2 text-[11px] tracking-normal text-accent font-medium">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color.solid }} aria-hidden />
        Suggested for today
      </div>
      <div className="text-[2rem] font-medium tracking-[-0.03em] mt-3 leading-[1] text-text">
        {title}
      </div>
      <p className="text-sm text-text-muted mt-2 leading-relaxed">
        {rec.reasoning}
      </p>
      <div className="mt-5 w-full flex items-center justify-center gap-2 bg-accent text-bg rounded-full px-5 py-3.5 text-base font-semibold hover:bg-accent-dim transition-colors">
        Start workout
        <span aria-hidden>→</span>
      </div>
    </Link>
  );
}

function PausedTodayCard() {
  return (
    <Link
      href="/plan"
      className="block bg-bg-elevated rounded-2xl p-5"
    >
      <div className="text-[11px] tracking-normal text-text-dim font-medium">
        Block paused
      </div>
      <div className="text-[2rem] font-medium tracking-[-0.03em] mt-3 leading-[1] text-text">
        Off-plan today.
      </div>
      <p className="text-sm text-text-muted mt-2 leading-relaxed">
        Nothing scheduled while the block is paused. Train what fits — tap a category below, or resume your plan.
      </p>
      <div className="mt-5 inline-flex items-center justify-center gap-2 border border-border-strong/40 text-text rounded-full px-5 py-2.5 text-sm font-medium hover:border-text-dim transition-colors">
        Resume plan
        <span aria-hidden>→</span>
      </div>
    </Link>
  );
}

function RestDayCard() {
  return (
    <div className="bg-bg-elevated rounded-2xl p-5">
      <div className="text-[11px] tracking-normal text-text-dim font-medium">
        Rest day
      </div>
      <div className="text-[2rem] font-medium tracking-[-0.03em] mt-3 leading-[1] text-text">
        Nothing scheduled.
      </div>
      <div className="text-sm text-text-muted mt-2 leading-relaxed">
        Active recovery counts. Stretch, walk, sleep well — or tap a category below if you feel like moving.
      </div>
    </div>
  );
}

function NoPlanCard() {
  return (
    <Link
      href="/plan"
      className="block bg-text/[0.055] rounded-2xl p-5"
    >
      <div className="text-[11px] tracking-normal text-accent font-medium">
        Set up your week
      </div>
      <div className="text-[2rem] font-medium tracking-[-0.03em] mt-3 leading-[1] text-text">
        No plan yet.
      </div>
      <div className="text-sm text-text-muted mt-2 leading-relaxed">
        Pick a weekly pattern — what you train each day. Takes under a minute.
      </div>
      <div className="mt-5 w-full flex items-center justify-center gap-2 bg-accent text-bg rounded-full px-5 py-3.5 text-base font-semibold hover:bg-accent-dim transition-colors">
        Set my plan
        <span aria-hidden>→</span>
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
      <div className="text-xs tracking-normal text-accent font-semibold">
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
  // Done sessions open the Recap page (clean "what I did" view meant for
  // sharing with a friend). Drafts + not-done sessions open the live workout
  // page so the user can finish logging.
  const href = done && session.id !== undefined
    ? `/history/${session.id}`
    : tid
      ? `/workout/${session.category}?template=${tid}`
      : `/workout/${session.category}`;
  const color = categoryColor(session.category);
  // Single toggle. On a NOT-done session, the corner button discards the draft
  // so the user can start fresh. On a DONE session, the SAME corner button
  // undoes the Done mark; for a retroactive session (no logged work) we also
  // delete the empty shell since there's nothing to preserve. Either way:
  // one affordance, one tap, matches the done-state toggle on the workout page.
  const toggleOrDiscard = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (session.id === undefined) return;
    if (done) {
      const isEmpty = session.blocks.length === 0;
      const msg = isEmpty
        ? "Undo today's Done mark? The session has no logged work, so it'll be removed."
        : "Undo today's Done mark? Your logged sets stay.";
      if (!confirm(msg)) return;
      if (isEmpty) {
        await db.sessions.delete(session.id);
      } else {
        await db.sessions.put({ ...session, finishedAt: undefined, rating: undefined });
      }
    } else {
      if (!confirm(`Discard "${session.name}" draft? Any logged sets are lost.`)) return;
      await db.sessions.delete(session.id);
    }
  };
  // Done state: calm & complete — hairline border, no hero tint, "Review"
  // secondary link. In-progress draft: full hero with filled Resume pill.
  const isHero = !done && !compact;
  return (
    <Link
      href={href}
      className={clsx(
        "block rounded-2xl relative",
        isHero
          ? "bg-text/[0.055] p-5"
          : clsx("bg-bg-elevated", compact ? "p-4" : "p-5")
      )}
    >
      <button
        onClick={toggleOrDiscard}
        aria-label={done ? "Undo Done mark" : "Discard draft"}
        title={done ? "Undo Done" : "Discard"}
        className={clsx(
          "absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-sm leading-none transition-colors",
          done
            ? "bg-success/15 border border-success/40 text-success hover:bg-success/25"
            : "text-text-dim hover:text-danger hover:bg-danger/10"
        )}
      >
        {done ? "✓" : "×"}
      </button>
      <div
        className={clsx(
          "flex items-center gap-2 text-[11px] tracking-normal font-medium pr-8",
          done ? "text-success" : "text-accent"
        )}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: color.solid }}
          aria-hidden
        />
        <span>
          {compact
            ? CATEGORY_LABELS[session.category]
            : done
              ? "Today — done"
              : "In progress"}
        </span>
      </div>
      <div
        className={clsx(
          "font-medium tracking-[-0.03em] mt-3 leading-[1] text-text",
          compact ? "text-xl" : done ? "text-2xl" : "text-[2rem]"
        )}
      >
        {session.name}
      </div>
      {!compact && !done && (
        <div className="mt-5 w-full flex items-center justify-center gap-2 bg-accent text-bg rounded-full px-5 py-3.5 text-base font-semibold hover:bg-accent-dim transition-colors">
          Resume
          <span aria-hidden>→</span>
        </div>
      )}
      {!compact && done && (
        <div className="mt-4 text-[12px] tracking-normal text-text-dim font-medium hover:text-text transition-colors">
          Review →
        </div>
      )}
    </Link>
  );
}



// "Next up" teaser — shows the next planned session on the horizon (tomorrow
// if it's a training day, otherwise the next non-rest day), plus a tiny
// "See full week" link to Plan. Peloton / NTC / Caliber all pin one bit of
// forward-look on their home screens because it gives the user continuity
// without asking them to parse a grid. Hidden when nothing's scheduled.
function NextUpCard({
  thisWeekDays,
  nextWeekDays,
  todayIdx,
  onPreview,
}: {
  thisWeekDays: PlannedDay[];
  nextWeekDays: PlannedDay[];
  todayIdx: number;
  onPreview: (date: string) => void;
}) {
  // Walk forward from tomorrow, wrapping to next week, finding the next
  // training day. When the wrap crosses into next week, read next week's
  // slot (respects deload / learn-week overrides saved for that week).
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  let nextIdx: number | null = null;
  let nextOffset = 0;
  let foundInNextWeek = false;
  for (let offset = 1; offset <= 7; offset++) {
    const idx = (todayIdx + offset) % 7;
    const inNextWeek = offset > 6 - todayIdx;
    const source = inNextWeek ? nextWeekDays : thisWeekDays;
    const day = source[idx];
    if (day !== null && day !== undefined) {
      nextIdx = idx;
      nextOffset = offset;
      foundInNextWeek = inNextWeek;
      break;
    }
  }
  if (nextIdx === null) return null;
  const sourceDays = foundInNextWeek ? nextWeekDays : thisWeekDays;
  const day = sourceDays[nextIdx]!;
  const date = addDays(start, nextIdx + (foundInNextWeek ? 7 : 0));
  const dateStr = format(date, "yyyy-MM-dd");
  const template = day.templateId
    ? templatesFor(day.category).find((t) => t.id === day.templateId)
    : null;
  // If the template's own name leads with the category (e.g. "Hyrox —
   // Time Trial"), don't repeat the category prefix — we already show the
   // category as a dot + label on this card.
  const title = template
    ? template.name.toLowerCase().startsWith(CATEGORY_LABELS[day.category].toLowerCase() + " —")
      ? template.name
      : `${CATEGORY_LABELS[day.category]} — ${template.name}`
    : CATEGORY_LABELS[day.category];
  const color = categoryColor(day.category);
  const whenLabel =
    nextOffset === 1
      ? `Tomorrow · ${format(date, "EEE")}`
      : format(date, "EEEE, MMM d");

  return (
    <div className="space-y-2">
      <button
        onClick={() => onPreview(dateStr)}
        className="w-full flex items-center justify-between gap-3 bg-bg-elevated rounded-2xl px-4 py-3 hover:bg-bg-card transition-colors text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="text-[11px] tracking-normal text-text-dim font-medium">
            Next up — {whenLabel}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: color.solid }}
              aria-hidden
            />
            <span className="text-sm text-text font-medium truncate">
              {title}
            </span>
          </div>
        </div>
        <span className="text-text-dim text-sm shrink-0" aria-hidden>›</span>
      </button>
      <Link
        href="/plan"
        className="block text-right text-[11px] tracking-normal text-text-dim hover:text-text font-medium transition-colors"
      >
        See full week →
      </Link>
    </div>
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
