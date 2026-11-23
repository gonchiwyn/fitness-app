"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { addDays, differenceInCalendarDays, differenceInCalendarWeeks, format, startOfWeek } from "date-fns";
import DayPreviewModal from "@/components/DayPreviewModal";
import QuickLogModal from "@/components/QuickLogModal";
import {
  archiveCurrentFocus,
  db,
  getProfile,
  getWeekDaysFor,
  getWeeklyPlan,
  pauseFocusBlock,
  resumeFocusBlock,
  saveProfile,
  saveWeeklyPlan,
  saveWeekOverride,
} from "@/lib/db";
import { templatesFor } from "@/lib/data/templates";
import { BLOCK_PRESETS, PRESET_GROUPS, visiblePresets, type BlockPreset } from "@/lib/data/presets";
import { categoryColor } from "@/lib/categoryTheme";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import {
  CATEGORIES,
  CATEGORY_BLURBS,
  CATEGORY_LABELS,
  DAY_LABELS_LONG,
  dateToPlanIndex,
  effectiveFocusToday,
  type Category,
  type PlannedDay,
  type Profile,
  type Session,
  type WeeklyPlan,
} from "@/lib/types";

// Parse a yyyy-MM-dd as the user's local midnight (not UTC). Keeps weekday
// math honest regardless of timezone offset.
function parseLocalDate(s: string): Date {
  return new Date(s + "T00:00:00");
}

// Days a user can actually train. Used to render the frequency chips and
// to map a chosen frequency to a weekday distribution (Mon=0 ... Sun=6).
const FREQUENCY_OPTIONS = [3, 4, 5, 6] as const;

// Weekday slots per frequency. First training session lands on Mon; others
// spread so training days aren't bunched back-to-back when possible.
const WEEKDAY_SLOTS: Record<number, number[]> = {
  3: [0, 2, 4],              // M W F
  4: [0, 1, 3, 4],           // M T Th F
  5: [0, 1, 2, 3, 4],        // M T W Th F
  6: [0, 1, 2, 3, 4, 5],     // M T W Th F Sa
};

// Transform a preset's priority-ordered day list (e.g. [Push, Pull, Legs, Cardio, Hyp, Cardio])
// into a 7-slot weekly plan (Mon-Sun) using only the top `frequency` sessions.
// Priority = position in the preset.days array (index 0 is most important).
function patternForFrequency(presetDays: PlannedDay[], frequency: number): PlannedDay[] {
  const sessions = presetDays.filter((d): d is NonNullable<PlannedDay> => d !== null);
  const take = Math.min(frequency, sessions.length);
  const chosen = sessions.slice(0, take);
  const slots = WEEKDAY_SLOTS[frequency] ?? WEEKDAY_SLOTS[5];
  const week: PlannedDay[] = [null, null, null, null, null, null, null];
  slots.slice(0, chosen.length).forEach((weekdayIdx, i) => {
    week[weekdayIdx] = chosen[i];
  });
  return week;
}

// Default export wraps the real page in a Suspense boundary because
// PlanPageInner reads `?pick=1` via useSearchParams. Next 16 prerenders
// this route to static HTML; useSearchParams needs a Suspense parent so
// only the part depending on the URL is CSR-rendered.
export default function PlanPage() {
  return (
    <Suspense>
      <PlanPageInner />
    </Suspense>
  );
}

function PlanPageInner() {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const searchParams = useSearchParams();
  const [editingDay, setEditingDay] = useState<number | null>(null);
  // ?pick=1 → auto-open the block picker modal (end-of-onboarding CTA).
  // ?target=<focusName> → also pre-expand that preset so the user lands on
  // the one they tapped (from /plans/[slug] "Make this my block" or from a
  // block-complete recommendation card).
  const targetFocus = searchParams.get("target");
  const [showPresets, setShowPresets] = useState(
    searchParams.get("pick") === "1" || !!targetFocus
  );
  // Preset tapped once → show preview (expand); tapped again → apply.
  const [previewingPreset, setPreviewingPreset] = useState<string | null>(targetFocus);
  // Frequency selected inside the preview panel. Null until the user taps a chip
  // (or the preview panel is opened — we default to the preset's recommendation).
  // If we're deep-linking to a target preset, pre-fill with its default frequency
  // so the user lands with everything ready to tap "Start".
  const initialTargetFreq = targetFocus
    ? BLOCK_PRESETS.find((p) => p.focusName === targetFocus)?.defaultFrequency ?? null
    : null;
  const [selectedFrequency, setSelectedFrequency] = useState<number | null>(initialTargetFreq);
  const todayIdx = dateToPlanIndex(new Date());
  // Monday of this week — used to compute a real date for each plan day
  // so DayPreviewModal can show the next upcoming occurrence of e.g. "Mon".
  const thisMonday = startOfWeek(new Date(), { weekStartsOn: 1 });

  // Weekly completion signal — shown at the top of "This week" so the user
  // knows where they stand without flipping back to Home.
  const weekStartStr = format(thisMonday, "yyyy-MM-dd");
  const weekEndStr = format(addDays(thisMonday, 7), "yyyy-MM-dd");
  const doneThisWeek = useLiveQuery(async () => {
    const all = await db.sessions.where("date").between(weekStartStr, weekEndStr, true, false).toArray();
    return all.filter((s) => s.finishedAt).length;
  }, [weekStartStr, weekEndStr], 0);

  const router = useRouter();
  const [viewMode, setViewMode] = useState<"this-week" | "base">("this-week");
  const [hasOverride, setHasOverride] = useState(false);
  // Week offset relative to today's week: 0 = this week, +N = future, -N = past.
  // Bounds are computed from the current focus block (if any) — can't scan
  // past the block's start date or past its end date. Without a block, we
  // allow a generous ±8 for free-form planning.
  const [viewedWeekOffset, setViewedWeekOffset] = useState(0);
  const [previewDate, setPreviewDate] = useState<string | null>(null);
  const [logDate, setLogDate] = useState<string | null>(null);
  const viewedMonday = addDays(thisMonday, viewedWeekOffset * 7);
  const viewedWeekStart = format(viewedMonday, "yyyy-MM-dd");
  const viewedWeekEnd = format(addDays(viewedMonday, 7), "yyyy-MM-dd");
  const viewedDays = useLiveQuery(
    async () => (viewedWeekOffset === 0 ? null : await getWeekDaysFor(viewedWeekStart)),
    [viewedWeekStart, viewedWeekOffset],
    null
  );
  // Sessions logged in the viewed week — used to route a past-day tap to its
  // recap page instead of the (useless-in-the-past) day-picker.
  const viewedSessions = useLiveQuery(
    async () => {
      const all = await db.sessions.where("date").between(viewedWeekStart, viewedWeekEnd, true, false).toArray();
      return all.filter((s) => s.startedAt || s.finishedAt);
    },
    [viewedWeekStart, viewedWeekEnd],
    [] as Session[]
  );
  const sessionByDayIdx = useMemo(() => {
    const m = new Map<number, Session>();
    for (const s of viewedSessions) {
      const d = parseLocalDate(s.date);
      const dayIdx = (d.getDay() + 6) % 7; // Mon = 0 ... Sun = 6
      // Prefer finished sessions over drafts.
      const existing = m.get(dayIdx);
      if (!existing || (s.finishedAt && !existing.finishedAt)) m.set(dayIdx, s);
    }
    return m;
  }, [viewedSessions]);

  const loadPlan = async () => {
    const base = await getWeeklyPlan();
    const weekStart = format(
      startOfWeek(new Date(), { weekStartsOn: 1 }),
      "yyyy-MM-dd"
    );
    const override = await db.weekOverrides
      .where("weekStartDate")
      .equals(weekStart)
      .first();
    setHasOverride(!!override);
    if (viewMode === "this-week" && override) {
      setPlan({ ...base, days: override.days });
    } else {
      setPlan(base);
    }
  };

  useEffect(() => {
    loadPlan();
    getProfile().then(setProfile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-10 text-text-muted text-center">
        Loading…
      </div>
    );
  }

  const setDay = async (
    dayIdx: number,
    day: PlannedDay,
    scope: "this-week" | "every-week"
  ) => {
    const nextDays = [...plan.days];
    nextDays[dayIdx] = day;
    if (scope === "every-week") {
      const next: WeeklyPlan = { ...plan, days: nextDays };
      setPlan(next);
      await saveWeeklyPlan(next);
    } else {
      // "Just this week" — save as an override for the current week only.
      const weekStart = format(
        startOfWeek(new Date(), { weekStartsOn: 1 }),
        "yyyy-MM-dd"
      );
      await saveWeekOverride(weekStart, nextDays);
      // Reflect the override immediately in the current view.
      setPlan({ ...plan, days: nextDays });
      setViewMode("this-week");
      setHasOverride(true);
    }
    setEditingDay(null);
  };

  const reset = async () => {
    if (!confirm("Reset the weekly plan to defaults?")) return;
    // Delete the record so getWeeklyPlan() re-seeds from the personal default
    await db.weeklyPlan.clear();
    const fresh = await getWeeklyPlan();
    setPlan(fresh);
  };

  // Presets are defined in src/lib/data/presets.ts so the Plans library at
  // /plans and this picker share the same source of truth. Owner-authored
  // "personal" blocks are hidden by default; pass ?personal=1 on the URL to
  // reveal them in the picker (same contract as /plans?personal=1).
  const includePersonal = searchParams.get("personal") === "1";
  const presets: BlockPreset[] = visiblePresets({ includePersonal });

  const applyPreset = async (preset: (typeof presets)[number], frequency: number) => {
    if (!confirm(`Start "${preset.name}" (${frequency} days/week)? Replaces your current weekly plan.`)) return;
    // Archive the outgoing block (if any) so it badges on the Profile page
    // before we overwrite with the new one.
    await archiveCurrentFocus();
    const next: WeeklyPlan = { id: "me", days: patternForFrequency(preset.days, frequency) };
    setPlan(next);
    await saveWeeklyPlan(next);
    const today = format(new Date(), "yyyy-MM-dd");
    const focus = {
      name: preset.focusName,
      startedAt: today,
      durationWeeks: preset.durationWeeks,
    };
    await saveProfile({ currentFocus: focus });
    setProfile((p) => (p ? { ...p, currentFocus: focus } : p));

    // Hyrox prep: template content shifts by phase (not just phase.setAdjustment).
    // W1-2 (Learn): intro sim + easy engine + RDL instead of deadlift
    // W3-5: base pattern as defined above (full race sim)
    // W6 (Deload): light skill sim + easier engine
    if (preset.focusName === "Hyrox prep") {
      const startDate = new Date(today + "T00:00:00");
      // Current week's Monday (may be in the past if today isn't Monday).
      // The current partial week counts as Week 1 — otherwise applying mid-week
      // would show the base W3-5 pattern on day 1, which defeats the point.
      const thisMonday = (() => {
        const d = new Date(startDate);
        const dayOfWeek = d.getDay(); // 0=Sun ... 1=Mon
        const daysBackToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        d.setDate(d.getDate() - daysBackToMonday);
        return d;
      })();
      const weekMonday = (weekIndex: number) => {
        const d = new Date(thisMonday);
        d.setDate(d.getDate() + weekIndex * 7);
        return format(d, "yyyy-MM-dd");
      };

      const learnWeek: PlannedDay[] = [
        { category: "hyrox", templateId: "hyrox_strength_pull" },
        { category: "hyrox", templateId: "hyrox_sim_pairs_intro" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "hyrox", templateId: "hyrox_strength_push" },
        { category: "hyrox", templateId: "hyrox_engine_easy" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "recovery" },
      ];
      const deloadWeek: PlannedDay[] = [
        { category: "stretching" },
        { category: "hyrox", templateId: "hyrox_sim_pairs_light" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "stretching" },
        { category: "hyrox", templateId: "hyrox_engine_easy" },
        { category: "recovery" },
        { category: "recovery" },
      ];
      // Realization week — swap Tuesday for a timed mini-race benchmark.
      // Everything else stays at Build-phase shape; this is the one real test.
      const realizationWeek: PlannedDay[] = [
        { category: "hyrox", templateId: "hyrox_strength_pull" },
        { category: "hyrox", templateId: "hyrox_sim_test" },
        { category: "hyrox", templateId: "hyrox_strength_push" },
        { category: "hyrox", templateId: "hyrox_sim_short" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "cardio", templateId: "nick_bare_long_run" },
        { category: "recovery" },
      ];

      // W1 is the current week (starting from today's Monday or past-Monday
      // if today is mid-week); W6 is 5 weeks later.
      await saveWeekOverride(weekMonday(0), learnWeek);
      await saveWeekOverride(weekMonday(1), learnWeek);
      await saveWeekOverride(weekMonday(4), realizationWeek);
      await saveWeekOverride(weekMonday(5), deloadWeek);
    }

    setShowPresets(false);
  };

  const endBlock = async () => {
    if (!confirm("End the current focus block? Your weekly plan stays as-is.")) return;
    // Archive first so the block earns its badge on the Profile page, then
    // clear currentFocus. Safe even if archival fails — profile change still goes through.
    await archiveCurrentFocus();
    await saveProfile({ currentFocus: undefined });
    setProfile((p) => (p ? { ...p, currentFocus: undefined } : p));
  };

  const togglePause = async () => {
    if (!profile?.currentFocus) return;
    const paused = !!profile.currentFocus.pausedAt;
    if (paused) {
      if (!confirm("Resume the block? Your start date shifts forward so you pick up at the same week + phase.")) return;
      await resumeFocusBlock();
    } else {
      if (!confirm("Pause the block? Week counter and phase freeze until you resume. Workouts you log while paused still save.")) return;
      await pauseFocusBlock();
    }
    const fresh = await getProfile();
    setProfile(fresh);
  };

  // Compute block state — drives whether we render the "current block" hero
  // or the "pick a block" hero at the top of the page.
  // While paused, "today" is frozen at pausedAt so week counter stops advancing.
  const focus = profile?.currentFocus;
  const isPaused = !!focus?.pausedAt;
  let blockState: "active" | "completed" | "none" = "none";
  let weekNum = 0;
  let progressPct = 0;
  if (focus) {
    const effToday = effectiveFocusToday(focus);
    const daysIn = Math.max(
      0,
      differenceInCalendarDays(effToday, new Date(focus.startedAt))
    );
    weekNum = Math.floor(daysIn / 7) + 1;
    const totalDays = focus.durationWeeks * 7;
    progressPct = Math.min(100, Math.round((daysIn / totalDays) * 100));
    blockState = weekNum > focus.durationWeeks ? "completed" : "active";
  }

  // Weekly target = non-rest days in the plan. Feeds the "N of M done"
  // progress glance at the top of This Week.
  const weekTarget = plan?.days.filter((d) => d !== null).length ?? 0;

  // Week-nav bounds. With a focus block we cap at the block's start and end
  // Mondays so the ‹ › arrows stop at "beginning of this block" and "last
  // week of this block" — no scrolling into dead air past the block. Without
  // a block, allow ±8 weeks for free-form planning (history still covers the
  // deeper past via its calendar).
  const blockStartMonday = focus
    ? startOfWeek(parseLocalDate(focus.startedAt), { weekStartsOn: 1 })
    : null;
  const blockEndMonday = blockStartMonday && focus
    ? addDays(blockStartMonday, (focus.durationWeeks - 1) * 7)
    : null;
  const minOffset = blockStartMonday
    ? Math.min(0, differenceInCalendarWeeks(blockStartMonday, thisMonday, { weekStartsOn: 1 }))
    : -8;
  const maxOffset = blockEndMonday
    ? Math.max(0, differenceInCalendarWeeks(blockEndMonday, thisMonday, { weekStartsOn: 1 }))
    : 5;

  const patternIntro =
    blockState === "active"
      ? "Tap a day to swap the workout — just this week, or every week."
      : blockState === "completed"
      ? "Last block's pattern. Pick your next focus to reshape the week."
      : "Tap a day to shape it. Or pick a block to shape the whole week at once.";

  return (
    <div className="max-w-3xl mx-auto px-5 py-6 space-y-6">
      <header>
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-text-dim font-medium">Your program</p>
            <h1 className="text-[2.125rem] font-medium tracking-[-0.03em] leading-[1] mt-1.5 text-text">Plan</h1>
          </div>
          <Link
            href="/plans"
            className="text-[11px] uppercase tracking-[0.18em] text-accent font-medium hover:text-accent-dim shrink-0"
          >
            Browse all →
          </Link>
        </div>
      </header>

      {blockState === "active" && focus && (
        <section
          className={clsx(
            "border rounded-2xl p-5 space-y-4",
            isPaused
              ? "border-border-strong/40"
              : "border-accent/40 bg-text/[0.04]"
          )}
        >
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <div
                className={clsx(
                  "text-[10px] uppercase tracking-[0.22em] font-medium flex items-center gap-2",
                  isPaused ? "text-text-dim" : "text-accent"
                )}
              >
                {isPaused && (
                  <span className="bg-text-dim/15 text-text-muted px-1.5 py-0.5 rounded tracking-[0.2em]">
                    Paused
                  </span>
                )}
                Current focus block
              </div>
              <div className="text-[1.75rem] font-medium tracking-[-0.03em] mt-2 text-text leading-[1]">
                {focus.name}
              </div>
            </div>
            <div className="text-[11px] text-text-dim shrink-0 tracking-wide tabular-nums font-medium">
              Wk {weekNum} / {focus.durationWeeks}
            </div>
          </div>
          <div className="h-[3px] bg-border-strong/30 rounded-full overflow-hidden">
            <div
              className={clsx("h-full", isPaused ? "bg-text-dim/60" : "bg-accent")}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <PhaseOutline
            durationWeeks={focus.durationWeeks}
            startedAt={focus.startedAt}
            currentWeek={weekNum}
          />
          {isPaused && focus.pausedAt && (
            <p className="text-xs text-text-muted leading-relaxed">
              Paused since {format(new Date(focus.pausedAt + "T00:00:00"), "MMM d")}. The week counter and phase resume where they left off.
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setShowPresets(true)}
              className="flex-1 h-11 rounded-full bg-accent text-bg text-sm font-semibold hover:bg-accent-dim transition-colors"
            >
              Change block
            </button>
            <button
              onClick={togglePause}
              className="h-11 px-4 rounded-full border border-border-strong/40 text-text-muted text-xs uppercase tracking-[0.18em] font-medium hover:border-text-dim hover:text-text transition-colors"
            >
              {isPaused ? "Resume" : "Pause"}
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-text-dim tracking-[0.18em] uppercase font-medium pt-1">
            <span>Started {format(new Date(focus.startedAt), "MMM d")}</span>
            <button
              onClick={endBlock}
              className="hover:text-danger"
            >
              End block
            </button>
          </div>
        </section>
      )}

      {blockState === "completed" && focus && (
        <section className="border border-accent/40 bg-text/[0.04] rounded-2xl p-5 space-y-4">
          <div className="text-[10px] uppercase tracking-[0.22em] text-accent font-medium">
            Block complete
          </div>
          <div className="text-[1.75rem] font-medium tracking-[-0.03em] text-text leading-[1]">
            {focus.name}
          </div>
          <p className="text-sm text-text-muted leading-relaxed">
            {focus.durationWeeks} weeks done. Pick your next focus to reshape the week.
          </p>
          <button
            onClick={() => setShowPresets(true)}
            className="w-full h-11 rounded-full bg-accent text-bg text-sm font-semibold hover:bg-accent-dim transition-colors"
          >
            Pick next block
          </button>
        </section>
      )}

      {blockState === "none" && (
        <section className="border border-accent/40 bg-text/[0.04] rounded-2xl p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-accent font-medium">
            No block yet
          </div>
          <div className="text-[1.75rem] font-medium tracking-[-0.03em] mt-2 text-text leading-[1]">
            Shape your week.
          </div>
          <p className="text-sm text-text-muted mt-2 leading-relaxed">
            A block is 1–8 weeks with a clear intent — Hypertrophy, Cardio base,
            Athletic, Recovery. The whole app adapts to it. Switch anytime.
          </p>
          <button
            onClick={() => setShowPresets(true)}
            className="mt-5 inline-flex items-center justify-center gap-2 bg-accent text-bg rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-accent-dim transition-colors"
          >
            Pick a block
            <span aria-hidden>→</span>
          </button>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewedWeekOffset((n) => Math.max(minOffset, n - 1))}
              disabled={viewedWeekOffset <= minOffset}
              aria-label="Previous week"
              className="w-7 h-7 rounded-full border border-border-strong/50 text-text-muted flex items-center justify-center hover:border-text-dim disabled:opacity-25"
            >
              ‹
            </button>
            <h2 className="text-[11px] uppercase tracking-[0.22em] text-text-dim font-medium min-w-[110px] text-center">
              {viewedWeekOffset === 0
                ? "This week"
                : viewedWeekOffset === 1
                  ? "Next week"
                  : viewedWeekOffset === -1
                    ? "Last week"
                    : `${format(viewedMonday, "MMM d")} week`}
            </h2>
            <button
              onClick={() => setViewedWeekOffset((n) => Math.min(maxOffset, n + 1))}
              disabled={viewedWeekOffset >= maxOffset}
              aria-label="Next week"
              className="w-7 h-7 rounded-full border border-border-strong/50 text-text-muted flex items-center justify-center hover:border-text-dim disabled:opacity-25"
            >
              ›
            </button>
          </div>
          {viewedWeekOffset === 0 && weekTarget > 0 && (
            <span className="text-[10px] uppercase tracking-[0.18em] text-text-dim font-medium tabular-nums">
              <span className={clsx(doneThisWeek >= weekTarget ? "text-success" : "text-text")}>
                {doneThisWeek}
              </span>{" "}
              of {weekTarget} done
            </span>
          )}
        </div>
        {viewedWeekOffset === 0 && weekTarget > 0 && (
          <div className="h-[3px] bg-border-strong/30 rounded-full overflow-hidden">
            <div
              className={clsx(
                "h-full transition-all",
                doneThisWeek >= weekTarget ? "bg-success" : "bg-accent"
              )}
              style={{ width: `${Math.min(100, (doneThisWeek / weekTarget) * 100)}%` }}
            />
          </div>
        )}
        <p className="text-xs text-text-dim leading-relaxed">
          {viewedWeekOffset === 0
            ? patternIntro
            : viewedWeekOffset < 0
              ? "Tap a day — recap if you logged, log it if you didn't."
              : "Tap a day to preview the planned workout."}
        </p>

        <div className="space-y-2 pt-1">
          {(viewedWeekOffset === 0 ? plan.days : viewedDays ?? plan.days).map((day, i) => {
            const isToday = viewedWeekOffset === 0 && i === todayIdx;
            const rowDate = addDays(viewedMonday, i);
            const rowDateStr = format(rowDate, "yyyy-MM-dd");
            const session = sessionByDayIdx.get(i);
            // Past = strictly before today's date, regardless of which week is
            // being viewed. A past day in THIS week needs the same treatment
            // as a past day in a prior week — don't route a logged Monday to
            // the day-picker just because we're still looking at this week.
            const isPastDate =
              differenceInCalendarDays(rowDate, parseLocalDate(format(new Date(), "yyyy-MM-dd"))) < 0;
            // Four distinct tap roles:
            //   recap     — there's a logged session on this date
            //   log-retro — past date, no session; opens QuickLogModal so the
            //               user can retroactively log what they actually did
            //   edit      — today / future day in the current week; opens
            //               DayPicker to shape or change the plan
            //   preview   — future week; opens DayPreviewModal to peek
            const role: "recap" | "log-retro" | "edit" | "preview" =
              session && session.id !== undefined
                ? "recap"
                : isPastDate
                  ? "log-retro"
                  : viewedWeekOffset > 0
                    ? "preview"
                    : "edit";
            const lockedTemplate = day?.templateId
              ? templatesFor(day.category).find((t) => t.id === day.templateId)
              : null;
            const color = day ? categoryColor(day.category) : null;
            const content = (
              <>
                <div className={clsx("w-12 text-center shrink-0", isToday ? "text-accent" : "text-text-dim")}>
                  <div className="text-[10px] uppercase tracking-[0.22em] font-medium">
                    {DAY_LABELS_LONG[i].slice(0, 3)}
                  </div>
                  {isToday && (
                    <div className="text-[9px] mt-1 font-medium uppercase tracking-[0.18em] text-accent">
                      Today
                    </div>
                  )}
                  {role === "recap" && !isToday && (
                    <div className="text-[9px] mt-1 font-medium uppercase tracking-[0.18em] text-success">
                      Done
                    </div>
                  )}
                  {role === "log-retro" && !isToday && (
                    <div className="text-[9px] mt-1 font-medium uppercase tracking-[0.18em] text-text-dim">
                      Log?
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {day ? (
                    <>
                      <div className="flex items-center gap-2 text-text font-medium">
                        {color && (
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: color.solid }}
                            aria-hidden
                          />
                        )}
                        <span className="truncate">
                          {lockedTemplate
                            ? `${CATEGORY_LABELS[day.category]} — ${lockedTemplate.name}`
                            : CATEGORY_LABELS[day.category]}
                        </span>
                      </div>
                      <div className="text-xs text-text-dim mt-0.5 leading-relaxed pl-3.5 truncate">
                        {lockedTemplate ? lockedTemplate.description : CATEGORY_BLURBS[day.category]}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-text-dim">Rest day</div>
                  )}
                </div>
                <span className="text-text-dim text-sm shrink-0">›</span>
              </>
            );
            const baseClasses = clsx(
              "w-full text-left flex items-center gap-4 rounded-2xl border p-4 transition-colors",
              isToday
                ? "border-accent/50 bg-text/[0.03]"
                : role === "recap"
                  ? "border-success/30 hover:border-success/50"
                  : "border-border-strong/40 hover:border-text-dim"
            );
            return (
              <button
                key={i}
                onClick={() => {
                  if (role === "recap" && session?.id !== undefined) {
                    router.push(`/history/${session.id}`);
                  } else if (role === "log-retro") {
                    setLogDate(rowDateStr);
                  } else if (role === "edit") {
                    setEditingDay(i);
                  } else if (role === "preview") {
                    setPreviewDate(rowDateStr);
                  }
                }}
                className={baseClasses}
              >
                {content}
              </button>
            );
          })}
        </div>
      </section>

      {/* Reset is the only destructive escape hatch left on the page, and
          it's intentionally quiet — a tiny text link, not a button. Users
          rarely need this; it's here so the muscle memory still lands. */}
      <div className="pt-4 text-center">
        <button
          onClick={reset}
          className="text-[10px] uppercase tracking-[0.18em] text-text-dim hover:text-text-muted font-medium"
        >
          Reset plan to default
        </button>
      </div>

      {editingDay !== null && (
        <DayPicker
          day={editingDay}
          current={plan.days[editingDay]}
          onPick={(d, scope) => setDay(editingDay, d, scope)}
          onClose={() => setEditingDay(null)}
        />
      )}

      {previewDate && profile && (
        <DayPreviewModal
          date={previewDate}
          day={
            (viewedDays ?? plan.days)[
              (parseLocalDate(previewDate).getDay() + 6) % 7
            ]
          }
          profile={profile}
          onClose={() => setPreviewDate(null)}
        />
      )}

      {logDate && (
        <QuickLogModal
          date={logDate}
          onClose={() => setLogDate(null)}
          onLogged={() => setLogDate(null)}
        />
      )}

      {showPresets && (
        <BlockPickerModal
          presets={presets}
          previewing={previewingPreset}
          selectedFrequency={selectedFrequency}
          onPreview={(name) => {
            setPreviewingPreset(name);
            const p = presets.find((x) => x.focusName === name);
            setSelectedFrequency(p?.defaultFrequency ?? null);
          }}
          onFrequencyChange={setSelectedFrequency}
          onStart={(p, freq) => {
            applyPreset(p, freq);
            setPreviewingPreset(null);
            setSelectedFrequency(null);
            setShowPresets(false);
          }}
          onClose={() => {
            setShowPresets(false);
            setPreviewingPreset(null);
            setSelectedFrequency(null);
          }}
        />
      )}
    </div>
  );
}

// Block preview — shown when a preset is tapped once (before applying).
// Lists the weekly pattern derived from the chosen frequency + a frequency
// picker + a Start button. Frequency is required: picking it is what shapes
// the actual week the user commits to.
// Grouping for the block picker. Peloton / Nike group programs by intent so
// the user doesn't scan 11 unlabeled cards. "intent" here is the user's goal,
// not an exercise taxonomy — people pick a block by WHY, not by anatomy.
// If a preset's focusName isn't listed here, it lands in "Specialty".
// PRESET_GROUPS + BlockPreset live in @/lib/data/presets, imported at the top.
// The local alias below keeps the rest of this file readable without a rename.
type PresetT = BlockPreset;

// Full-screen block picker modal. Replaces the inline accordion that forced
// the user to scroll past 11 cards to find one. Groups presets by intent
// (Peloton / Nike pattern), expands a selected preset inline into a
// frequency picker + weekly-shape preview + Start CTA.
function BlockPickerModal({
  presets,
  previewing,
  selectedFrequency,
  onPreview,
  onFrequencyChange,
  onStart,
  onClose,
}: {
  presets: PresetT[];
  previewing: string | null;
  selectedFrequency: number | null;
  onPreview: (focusName: string) => void;
  onFrequencyChange: (f: number) => void;
  onStart: (preset: PresetT, frequency: number) => void;
  onClose: () => void;
}) {
  useBodyScrollLock(true);
  const byFocusName = new Map(presets.map((p) => [p.focusName, p]));
  const unlisted = presets.filter(
    (p) => !PRESET_GROUPS.some((g) => g.items.includes(p.focusName))
  );

  const renderCard = (p: PresetT) => {
    const isPreview = previewing === p.focusName;
    const freq = selectedFrequency ?? p.defaultFrequency;
    return (
      <div
        key={p.focusName}
        className={clsx(
          "rounded-xl border transition-colors",
          isPreview ? "border-accent/60 bg-text/[0.03]" : "border-border-strong/40"
        )}
      >
        <button
          onClick={() => onPreview(isPreview ? "" : p.focusName)}
          className="w-full text-left px-4 py-3.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-base font-medium tracking-tight text-text">{p.name}</div>
              <div className="text-xs text-text-dim mt-1 leading-relaxed">{p.tagline}</div>
            </div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim shrink-0 tabular-nums font-medium">
              {p.durationWeeks}w
            </div>
          </div>
        </button>
        {isPreview && (
          <PresetPreview
            preset={p}
            frequency={freq}
            onFrequencyChange={onFrequencyChange}
            onStart={() => onStart(p, freq)}
          />
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg-elevated border border-border-strong/50 rounded-2xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim font-medium">
              Choose a focus
            </div>
            <h3 className="text-xl font-medium tracking-[-0.02em] text-text mt-1">
              Blocks
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-text-dim text-2xl leading-none hover:text-text"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="text-sm text-text-muted mb-5 leading-relaxed">
          Pick a block, then your frequency. Switching replaces the current weekly pattern — you can change it again anytime.
        </p>

        <div className="space-y-6">
          {PRESET_GROUPS.map((g) => {
            const items = g.items
              .map((name) => byFocusName.get(name))
              .filter((p): p is PresetT => !!p);
            if (items.length === 0) return null;
            return (
              <div key={g.id} className="space-y-2">
                <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim font-medium">
                  {g.label}
                </div>
                {items.map(renderCard)}
              </div>
            );
          })}
          {unlisted.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim font-medium">
                More
              </div>
              {unlisted.map(renderCard)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PresetPreview({
  preset,
  frequency,
  onFrequencyChange,
  onStart,
}: {
  preset: {
    name: string;
    tagline: string;
    focusName: string;
    durationWeeks: number;
    defaultFrequency: number;
    days: PlannedDay[];
  };
  frequency: number;
  onFrequencyChange: (f: number) => void;
  onStart: () => void;
}) {
  const week = patternForFrequency(preset.days, frequency);
  return (
    <div className="border-t border-border-strong/30 px-4 py-4 space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim mb-2.5 font-medium">
          How many days per week?
        </div>
        <div className="grid grid-cols-4 gap-2">
          {FREQUENCY_OPTIONS.map((f) => {
            const active = f === frequency;
            return (
              <button
                key={f}
                onClick={() => onFrequencyChange(f)}
                className={clsx(
                  "h-10 rounded-full border text-sm font-medium transition-colors tabular-nums",
                  active
                    ? "bg-text/5 border-accent/60 text-text"
                    : "bg-transparent border-border-strong/40 text-text-muted hover:border-text-dim"
                )}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim mb-2.5 font-medium">
          Your week
        </div>
        <div className="space-y-1.5">
          {week.map((d, i) => {
            const tmpl = d?.templateId
              ? templatesFor(d.category).find((t) => t.id === d.templateId)
              : null;
            const label = !d
              ? "Rest"
              : tmpl
                ? `${CATEGORY_LABELS[d.category]} — ${tmpl.name}`
                : CATEGORY_LABELS[d.category];
            const color = d ? categoryColor(d.category) : null;
            return (
              <div key={i} className="flex items-baseline gap-3 text-xs">
                <span className="w-10 shrink-0 text-text-dim uppercase tracking-[0.2em] text-[10px] font-medium">
                  {DAY_LABELS_LONG[i].slice(0, 3)}
                </span>
                <div className="flex items-baseline gap-2 min-w-0">
                  {color && (
                    <span
                      className="w-1 h-1 rounded-full shrink-0 translate-y-[-1px]"
                      style={{ background: color.solid }}
                      aria-hidden
                    />
                  )}
                  <span className={clsx(!d ? "text-text-dim" : "text-text-muted")}>{label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-[10px] text-text-dim leading-relaxed">
        {preset.durationWeeks} weeks · progresses easy → harder → peak → deload. You can edit any day later.
      </div>

      <button
        onClick={onStart}
        className="w-full h-11 rounded-full border border-accent/60 bg-text/5 text-text text-[11px] uppercase tracking-[0.18em] font-medium hover:bg-text/10"
      >
        Start this block
      </button>
    </div>
  );
}

function PhaseOutline({
  durationWeeks,
  startedAt,
  currentWeek,
}: {
  durationWeeks: number;
  startedAt: string;
  currentWeek: number;
}) {
  void startedAt;
  // Same phase rules as getBlockPhase. Readable here as a horizontal strip
  // of pill-labels with full names — not 3-letter codes. The user taps a
  // week to read its one-line description.
  const phases: { label: string; desc: string }[] = [];
  for (let w = 1; w <= durationWeeks; w++) {
    const weeksLeft = durationWeeks - w;
    let label = "Accumulation";
    let desc = "Build volume tolerance — moderate loads, more sets.";
    if (durationWeeks <= 1 || weeksLeft === 0) {
      label = "Deload";
      desc = "Recovery — cut intensity ~15%, drop a set. CNS reset.";
    } else if (weeksLeft === 1 && durationWeeks >= 3) {
      label = "Realization";
      desc = "Peak — heaviest loads, accessories back off. Chase PRs.";
    } else if (w > Math.ceil(durationWeeks / 3)) {
      label = "Intensification";
      desc = "Load creeps up ~5%, reps drop slightly. Push harder.";
    }
    phases.push({ label, desc });
  }
  const currentIdx = Math.min(currentWeek - 1, phases.length - 1);
  const [selectedIdx, setSelectedIdx] = useState(currentIdx);
  const selectedPhase = phases[selectedIdx];
  const isCurrent = selectedIdx === currentIdx;

  return (
    <div className="pt-1 space-y-2.5">
      <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1" style={{ scrollbarWidth: "none" }}>
        {phases.map((p, i) => {
          const isDone = i < currentIdx;
          const isNow = i === currentIdx;
          const isSel = i === selectedIdx;
          return (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              className={clsx(
                "shrink-0 px-2.5 h-7 rounded-full border text-[10px] uppercase tracking-[0.18em] font-medium tabular-nums transition-colors",
                isNow
                  ? "border-accent bg-accent text-bg"
                  : isSel
                    ? "border-accent/60 bg-text/5 text-text"
                    : isDone
                      ? "border-border-strong/40 text-text-muted"
                      : "border-border-strong/40 text-text-dim hover:border-text-dim"
              )}
            >
              W{i + 1} · {p.label.slice(0, 3).toUpperCase()}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-text-muted leading-relaxed">
        <span className="text-text font-medium">
          Wk {selectedIdx + 1} — {selectedPhase.label}
          {isCurrent && " (now)"}:
        </span>{" "}
        {selectedPhase.desc}
      </p>
    </div>
  );
}

function DayPicker({
  day,
  current,
  onPick,
  onClose,
}: {
  day: number;
  current: PlannedDay;
  onPick: (d: PlannedDay, scope: "this-week" | "every-week") => void;
  onClose: () => void;
}) {
  useBodyScrollLock(true);
  // Step 1: category pick. Step 2 (if templates exist): optional template lock.
  const [stage, setStage] = useState<"category" | "template">(
    current ? "template" : "category"
  );
  const [pickedCategory, setPickedCategory] = useState<Category | null>(
    current?.category ?? null
  );
  // "this-week" is the safer default — permanent changes deserve intent.
  const [scope, setScope] = useState<"this-week" | "every-week">("this-week");

  const templates = pickedCategory ? templatesFor(pickedCategory) : [];

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg-elevated border border-border-strong/50 rounded-2xl p-5 max-w-md w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim font-medium">
              Edit day
            </div>
            <h3 className="text-xl font-medium tracking-[-0.02em] tracking-tight text-text mt-1">
              {DAY_LABELS_LONG[day]}
              {stage === "template" && pickedCategory && (
                <span className="text-text-muted font-normal text-base ml-2">
                  → {CATEGORY_LABELS[pickedCategory]}
                </span>
              )}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-text-dim text-2xl leading-none hover:text-text"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-text-dim font-medium">
          Apply change to
        </div>
        <div className="mb-5 grid grid-cols-2 gap-2">
          <button
            onClick={() => setScope("this-week")}
            className={clsx(
              "py-2 rounded-full border text-xs font-medium transition-colors",
              scope === "this-week"
                ? "bg-text/5 border-accent/60 text-text"
                : "bg-transparent border-border-strong/40 text-text-muted hover:border-text-dim"
            )}
          >
            Just this week
          </button>
          <button
            onClick={() => setScope("every-week")}
            className={clsx(
              "py-2 rounded-full border text-xs font-medium transition-colors",
              scope === "every-week"
                ? "bg-text/5 border-accent/60 text-text"
                : "bg-transparent border-border-strong/40 text-text-muted hover:border-text-dim"
            )}
          >
            Every week
          </button>
        </div>

        {stage === "category" && (
          <div className="space-y-2">
            <button
              onClick={() => onPick(null, scope)}
              className={clsx(
                "w-full text-left p-3.5 rounded-xl border transition-colors",
                current === null
                  ? "bg-bg-card border-accent/50"
                  : "bg-transparent border-border-strong/40 hover:border-text-dim"
              )}
            >
              <div className="font-medium text-text">Rest day</div>
              <div className="text-xs text-text-dim mt-0.5">Active recovery encouraged</div>
            </button>

            {CATEGORIES.filter((c) => c !== "sport").map((cat) => {
              const color = categoryColor(cat);
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setPickedCategory(cat);
                    setStage("template");
                  }}
                  className={clsx(
                    "w-full text-left p-3.5 rounded-xl border transition-colors flex items-center justify-between gap-2",
                    current?.category === cat
                      ? "bg-bg-card border-accent/50"
                      : "bg-transparent border-border-strong/40 hover:border-text-dim"
                  )}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                      style={{ background: color.solid }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="font-medium text-text">{CATEGORY_LABELS[cat]}</div>
                      <div className="text-xs text-text-dim mt-0.5">{CATEGORY_BLURBS[cat]}</div>
                    </div>
                  </div>
                  <span className="text-text-dim text-sm shrink-0">›</span>
                </button>
              );
            })}
          </div>
        )}

        {stage === "template" && pickedCategory && (
          <>
            <button
              onClick={() => setStage("category")}
              className="text-[11px] text-text-dim mb-3 uppercase tracking-[0.18em] font-medium hover:text-text-muted"
            >
              ← Change category
            </button>

            <div className="space-y-2">
              <button
                onClick={() => onPick({ category: pickedCategory }, scope)}
                className={clsx(
                  "w-full text-left p-3.5 rounded-xl border transition-colors",
                  current?.category === pickedCategory && !current?.templateId
                    ? "bg-bg-card border-accent/50"
                    : "bg-transparent border-border-strong/40 hover:border-text-dim"
                )}
              >
                <div className="font-medium text-text">Rotate (any template)</div>
                <div className="text-xs text-text-dim mt-0.5">
                  Different session each time — variety guaranteed
                </div>
              </button>

              {templates.length > 0 && (
                <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim font-medium pt-3 pb-1 px-1">
                  Lock a specific template
                </div>
              )}

              {templates.map((t) => {
                const isLocked = current?.category === pickedCategory && current?.templateId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => onPick({ category: pickedCategory, templateId: t.id }, scope)}
                    className={clsx(
                      "w-full text-left p-3.5 rounded-xl border transition-colors",
                      isLocked
                        ? "bg-bg-card border-accent/50"
                        : "bg-transparent border-border-strong/40 hover:border-text-dim"
                    )}
                  >
                    <div className="font-medium text-text">{t.name}</div>
                    <div className="text-xs text-text-dim mt-1 leading-relaxed">{t.description}</div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
