"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { addDays, differenceInCalendarDays, format, startOfWeek } from "date-fns";
import DayPreviewModal from "@/components/DayPreviewModal";
import {
  db,
  getProfile,
  getWeeklyPlan,
  pauseFocusBlock,
  resumeFocusBlock,
  saveProfile,
  saveWeeklyPlan,
  saveWeekOverride,
} from "@/lib/db";
import { templatesFor } from "@/lib/data/templates";
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
  type WeeklyPlan,
} from "@/lib/types";

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
  const [previewingDay, setPreviewingDay] = useState<number | null>(null);
  // ?pick=1 → auto-expand the preset picker (used from end-of-onboarding CTA).
  const [showPresets, setShowPresets] = useState(searchParams.get("pick") === "1");
  // Preset tapped once → show preview (expand); tapped again → apply.
  const [previewingPreset, setPreviewingPreset] = useState<string | null>(null);
  // Frequency selected inside the preview panel. Null until the user taps a chip
  // (or the preview panel is opened — we default to the preset's recommendation).
  const [selectedFrequency, setSelectedFrequency] = useState<number | null>(null);
  const todayIdx = dateToPlanIndex(new Date());
  // Monday of this week — used to compute a real date for each plan day
  // so DayPreviewModal can show the next upcoming occurrence of e.g. "Mon".
  const thisMonday = startOfWeek(new Date(), { weekStartsOn: 1 });

  const [viewMode, setViewMode] = useState<"this-week" | "base">("this-week");
  const [hasOverride, setHasOverride] = useState(false);

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

  // Presets ordered by focus type. "durationWeeks" powers the Home indicator's
  // "Week X of N" counter — pick something meaningful for that block.
  //
  // `name`: short, goal-driven (2-4 words). No jargon, no parens.
  // `tagline`: one sentence, what you'll actually do each week.
  // `days`: ordered priority — index 0 is the most important session, used
  //   when the user picks fewer training days than the full pattern has.
  // `defaultFrequency`: suggested days/week when applying. Also what the
  //   chip picker pre-selects.
  const presets: {
    name: string;
    tagline: string;
    focusName: string;
    durationWeeks: number;
    defaultFrequency: number;
    days: PlannedDay[];
  }[] = [
    // Durations per Galpin (real hypertrophy adaptation takes 5–6 weeks
    // minimum, strength peaks want 6–8 with a real deload). Every preset
    // holds 2× Zone 2 minimum — Attia/Patrick's non-negotiable for aerobic
    // maintenance and mortality prevention regardless of block focus.
    {
      name: "Beginner",
      tagline: "Build the habit. Full-body sessions + easy cardio.",
      focusName: "Beginner",
      durationWeeks: 4,
      defaultFrequency: 3,
      // Priority order: 3 strength (hits every muscle each session) → cardio → mobility
      days: [
        { category: "split", templateId: "split_full_body" },
        { category: "split", templateId: "split_full_body" },
        { category: "split", templateId: "split_full_body" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "stretching" },
        { category: "cardio", templateId: "attia_zone2_45" },
      ],
    },
    {
      name: "Build muscle",
      tagline: "Push / Pull / Legs twice a week + Z2 cardio.",
      focusName: "Hypertrophy",
      durationWeeks: 6,
      defaultFrequency: 5,
      days: [
        { category: "split", templateId: "split_push" },
        { category: "split", templateId: "split_pull" },
        { category: "split", templateId: "split_legs" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "hypertrophy" },
        { category: "cardio", templateId: "attia_zone2_45" },
      ],
    },
    {
      name: "Build muscle — autoregulated",
      tagline: "ABAB hypertrophy. Load adapts rep-by-rep (Menno/Galpin).",
      focusName: "Menno Hypertrophy",
      durationWeeks: 8,
      defaultFrequency: 4,
      days: [
        { category: "hypertrophy", templateId: "menno_hyp_a" },
        { category: "hypertrophy", templateId: "menno_hyp_b" },
        { category: "hypertrophy", templateId: "menno_hyp_a" },
        { category: "hypertrophy", templateId: "menno_hyp_b" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "cardio", templateId: "attia_zone2_45" },
      ],
    },
    {
      name: "Get stronger",
      tagline: "Heavy bench, squat, deadlift. 8-week peak.",
      focusName: "Strength peak",
      durationWeeks: 8,
      defaultFrequency: 4,
      days: [
        { category: "strength", templateId: "strength_lower_a" },
        { category: "strength", templateId: "strength_upper_a" },
        { category: "strength", templateId: "strength_deadlift_day" },
        { category: "split", templateId: "split_arms" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "cardio", templateId: "attia_zone2_45" },
      ],
    },
    {
      name: "Cardio base",
      tagline: "Mostly Z2 running / biking + 2× strength maintenance.",
      focusName: "Cardio base",
      durationWeeks: 8,
      defaultFrequency: 5,
      days: [
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "cardio", templateId: "attia_4x4_vo2" },
        { category: "strength" },
        { category: "strength" },
        { category: "cardio", templateId: "attia_zone2_45" },
      ],
    },
    {
      name: "Athletic power",
      tagline: "Jumps, sprints, Hyrox stations, heavy legs.",
      focusName: "Athletic",
      durationWeeks: 6,
      defaultFrequency: 5,
      days: [
        { category: "athlete" },
        { category: "hyrox" },
        { category: "split", templateId: "split_legs" },
        { category: "hyrox" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "cardio", templateId: "attia_zone2_45" },
      ],
    },
    {
      name: "Longevity",
      tagline: "3 strength · 2 Z2 · 1 VO2 · 1 stretch. The Attia week.",
      focusName: "Longevity",
      durationWeeks: 8,
      defaultFrequency: 6,
      days: [
        { category: "strength" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "hypertrophy" },
        { category: "cardio", templateId: "attia_4x4_vo2" },
        { category: "strength" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "stretching" },
      ],
    },
    {
      name: "Push / Pull / Legs",
      tagline: "Classic PPL — Push & Pull twice, Legs once.",
      focusName: "PPL",
      durationWeeks: 6,
      defaultFrequency: 6,
      days: [
        { category: "split", templateId: "split_push" },
        { category: "split", templateId: "split_pull" },
        { category: "split", templateId: "split_legs" },
        { category: "split", templateId: "split_push" },
        { category: "split", templateId: "split_pull" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "cardio", templateId: "attia_zone2_45" },
      ],
    },
    {
      name: "Recovery week",
      tagline: "Mobility, easy Z2, no barbell. Reset the system.",
      focusName: "Recovery",
      durationWeeks: 1,
      defaultFrequency: 5,
      days: [
        { category: "stretching" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "stretching" },
        { category: "recovery" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "recovery" },
      ],
    },
    {
      // Fixed layout — frequency chip is cosmetic here, structure is designed
      // around sailing week 3 and auto-override; see applyPreset.
      name: "Surf trip prep",
      tagline: "Paddle, pop-up, back-safe. Built for a 6-week countdown.",
      focusName: "Surf prep",
      durationWeeks: 6,
      defaultFrequency: 6,
      days: [
        { category: "athlete", templateId: "surf_paddle_push" },
        { category: "athlete", templateId: "surf_paddle_pull" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "athlete", templateId: "surf_legs" },
        { category: "athlete", templateId: "surf_pop_up_core" },
        { category: "cardio", templateId: "attia_zone2_45" },
      ],
    },
    {
      // Fixed layout — phase-based template progression W1-2 vs W3-5 vs W6.
      name: "Hyrox prep",
      tagline: "First-time Hyrox: learn → build → peak. Back-aware.",
      focusName: "Hyrox prep",
      durationWeeks: 6,
      defaultFrequency: 5,
      days: [
        { category: "hyrox", templateId: "hyrox_strength_pull" },
        { category: "hyrox", templateId: "hyrox_sim_race" },
        { category: "hyrox", templateId: "hyrox_strength_push" },
        { category: "cardio", templateId: "attia_4x4_vo2" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "cardio", templateId: "attia_zone2_45" },
      ],
    },
  ];

  const applyPreset = async (preset: (typeof presets)[number], frequency: number) => {
    if (!confirm(`Start "${preset.name}" (${frequency} days/week)? Replaces your current weekly plan.`)) return;
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

    // Surf prep has a fixed sailing week 3 — auto-populate that week as
    // swim/sport log-only so the user can log against it. Keeps the base
    // pattern (gym) untouched for weeks 1-2 and 4-6.
    if (preset.focusName === "Surf prep") {
      const startDate = new Date(today + "T00:00:00");
      const week3Monday = new Date(startDate);
      const daysUntilMonday = (1 - startDate.getDay() + 7) % 7;
      week3Monday.setDate(
        startDate.getDate() + daysUntilMonday + 14
      );
      const week3Start = format(week3Monday, "yyyy-MM-dd");
      const sailingDays: PlannedDay[] = Array.from({ length: 7 }, (_, i) =>
        i === 6 ? null : { category: "sport" as const }
      );
      await saveWeekOverride(week3Start, sailingDays);
    }

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
        { category: "hyrox", templateId: "hyrox_sim_intro" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "hyrox", templateId: "hyrox_strength_push" },
        { category: "hyrox", templateId: "hyrox_engine_easy" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "recovery" },
      ];
      const deloadWeek: PlannedDay[] = [
        { category: "stretching" },
        { category: "hyrox", templateId: "hyrox_sim_light" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "stretching" },
        { category: "hyrox", templateId: "hyrox_engine_easy" },
        { category: "recovery" },
        { category: "recovery" },
      ];

      // W1 is the current week (starting from today's Monday or past-Monday
      // if today is mid-week); W6 is 5 weeks later.
      await saveWeekOverride(weekMonday(0), learnWeek);
      await saveWeekOverride(weekMonday(1), learnWeek);
      await saveWeekOverride(weekMonday(5), deloadWeek);
    }

    setShowPresets(false);
  };

  const endBlock = async () => {
    if (!confirm("End the current focus block? Your weekly plan stays as-is.")) return;
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

  const patternIntro =
    blockState === "active"
      ? "Your weekly pattern for this block. Tap a day to override just that day."
      : blockState === "completed"
      ? "Last block's pattern. Pick your next focus to reshape the week."
      : "Tap a day to override. Or pick a focus block below to reshape the whole week.";

  return (
    <div className="max-w-3xl mx-auto px-5 py-6 space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-text-dim">Your program</p>
        <h1 className="text-3xl font-bold mt-1">Plan</h1>
      </header>

      {blockState === "active" && focus && (
        <section
          className={clsx(
            "border rounded-2xl p-5 space-y-3",
            isPaused ? "bg-bg-card border-text-dim/40" : "bg-bg-card border-accent/40"
          )}
        >
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div
                className={clsx(
                  "text-[10px] uppercase tracking-widest font-semibold flex items-center gap-2",
                  isPaused ? "text-text-dim" : "text-accent"
                )}
              >
                {isPaused && (
                  <span className="bg-text-dim/15 text-text-muted px-1.5 py-0.5 rounded">
                    PAUSED
                  </span>
                )}
                Current focus block
              </div>
              <div className="text-2xl font-bold mt-1">{focus.name}</div>
            </div>
            <div className="text-xs text-text-dim shrink-0">
              Week {weekNum} of {focus.durationWeeks}
            </div>
          </div>
          <div className="h-1 bg-border rounded-full overflow-hidden">
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
            <p className="text-xs text-text-muted bg-bg-elevated border border-border rounded-lg p-3">
              Paused since {format(new Date(focus.pausedAt + "T00:00:00"), "MMM d")}.
              The week counter and phase will resume where they left off.
            </p>
          )}
          <button
            onClick={togglePause}
            className={clsx(
              "w-full h-10 rounded-lg text-sm font-semibold border",
              isPaused
                ? "bg-accent text-black border-accent"
                : "bg-bg-elevated text-text-muted border-border hover:border-accent/40"
            )}
          >
            {isPaused ? "Resume block" : "Pause block"}
          </button>
          <div className="flex items-center justify-between text-xs text-text-dim">
            <span>Started {format(new Date(focus.startedAt), "MMM d")}</span>
            <button
              onClick={endBlock}
              className="text-[10px] text-text-dim hover:text-text-muted opacity-60"
            >
              End block
            </button>
          </div>
        </section>
      )}

      {blockState === "completed" && focus && (
        <section className="bg-bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="text-[10px] uppercase tracking-widest text-text-dim font-semibold">
            Block complete
          </div>
          <div className="text-lg font-semibold">
            {focus.name} — {focus.durationWeeks} weeks done.
          </div>
          <p className="text-sm text-text-muted">
            Pick your next focus below, or end the block to stay on this pattern without a target.
          </p>
          <button
            onClick={endBlock}
            className="text-xs text-text-dim underline"
          >
            End block
          </button>
        </section>
      )}

      {blockState === "none" && (
        <section className="bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30 rounded-2xl p-5">
          <div className="text-[10px] uppercase tracking-widest text-accent font-semibold">
            Pick a focus block
          </div>
          <p className="text-sm text-text-muted mt-2 leading-snug">
            A block is 1–8 weeks with a clear intent — Hypertrophy, Cardio base,
            Athletic, Recovery. The whole app adapts to it. You can end early or
            switch anytime.
          </p>
          <button
            onClick={() => {
              setShowPresets(true);
              // Presets are already rendered below in the "none" state — scroll
              // them into view so the tap feels responsive. setTimeout(0) lets
              // React commit any state change before we measure the layout.
              setTimeout(() => {
                const el = document.getElementById("focus-presets");
                if (!el) return;
                const y = el.getBoundingClientRect().top + window.scrollY - 12;
                window.scrollTo(0, y);
              }, 0);
            }}
            className="mt-3 text-sm text-accent font-semibold"
          >
            Choose a block →
          </button>
        </section>
      )}

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs uppercase tracking-widest text-text-dim font-semibold">
            {blockState === "active" ? "This block's week" : "Weekly pattern"}
          </h2>
          {blockState === "active" && (
            <button
              onClick={() => {
                const next = !showPresets;
                setShowPresets(next);
                if (next) {
                  // Scroll to presets after React commits — same pattern as the
                  // "Choose a block" button.
                  setTimeout(() => {
                    const el = document.getElementById("focus-presets");
                    if (!el) return;
                    const y = el.getBoundingClientRect().top + window.scrollY - 12;
                    window.scrollTo(0, y);
                  }, 0);
                }
              }}
              className="text-xs text-accent"
            >
              {showPresets ? "Hide" : "Change block"}
            </button>
          )}
        </div>
        <p className="text-xs text-text-dim">{patternIntro}</p>

        <div className="space-y-2 pt-1">
          {plan.days.map((day, i) => {
            const isToday = i === todayIdx;
            const lockedTemplate = day?.templateId
              ? templatesFor(day.category).find((t) => t.id === day.templateId)
              : null;
            return (
              <div
                key={i}
                className={clsx(
                  "w-full rounded-2xl border transition-colors",
                  isToday
                    ? "bg-accent/10 border-accent/40"
                    : "bg-bg-card border-border"
                )}
              >
                <button
                  onClick={() => setPreviewingDay(i)}
                  className="w-full text-left flex items-center gap-4 p-4"
                >
                  <div className={clsx("w-14 text-center", isToday ? "text-accent" : "text-text-dim")}>
                    <div className="text-[10px] uppercase tracking-widest font-bold">
                      {DAY_LABELS_LONG[i].slice(0, 3)}
                    </div>
                    {isToday && (
                      <div className="text-[10px] mt-0.5 font-semibold uppercase tracking-widest">
                        Today
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {day ? (
                      <>
                        <div className="font-semibold">
                          {lockedTemplate
                            ? `${CATEGORY_LABELS[day.category]} — ${lockedTemplate.name}`
                            : CATEGORY_LABELS[day.category]}
                        </div>
                        <div className="text-xs text-text-dim mt-0.5">
                          {lockedTemplate ? lockedTemplate.description : CATEGORY_BLURBS[day.category]}
                        </div>
                      </>
                    ) : (
                      <div className="text-text-dim italic">Rest day</div>
                    )}
                  </div>
                  <span className="text-xs text-text-dim">View ›</span>
                </button>
                <div className="border-t border-border/50 px-4 py-2 flex justify-end">
                  <button
                    onClick={() => setEditingDay(i)}
                    className="text-[11px] text-text-dim hover:text-accent uppercase tracking-wider"
                  >
                    Edit day
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {(blockState !== "active" || showPresets) && (
        <section id="focus-presets" className="space-y-3 pt-2 scroll-mt-4">
          <h2 className="text-xs uppercase tracking-widest text-text-dim font-semibold">
            {blockState === "completed" ? "Pick your next block" : "Focus blocks"}
          </h2>
          <p className="text-xs text-text-dim">
            Tap a block to preview it. Pick days/week, then start.
          </p>
          <div className="space-y-2">
            {presets.map((p, i) => {
              const isPreview = previewingPreset === p.focusName;
              const freq = selectedFrequency ?? p.defaultFrequency;
              return (
                <div
                  key={i}
                  className={clsx(
                    "rounded-xl border transition-colors",
                    isPreview ? "bg-bg-card border-accent/40" : "bg-bg-card border-border"
                  )}
                >
                  <button
                    onClick={() => {
                      if (isPreview) {
                        setPreviewingPreset(null);
                        setSelectedFrequency(null);
                      } else {
                        setPreviewingPreset(p.focusName);
                        setSelectedFrequency(p.defaultFrequency);
                      }
                    }}
                    className="w-full text-left px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-xs text-text-dim mt-0.5">{p.tagline}</div>
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-text-dim shrink-0">
                        {p.durationWeeks}w
                      </div>
                    </div>
                  </button>
                  {isPreview && (
                    <PresetPreview
                      preset={p}
                      frequency={freq}
                      onFrequencyChange={setSelectedFrequency}
                      onStart={() => {
                        applyPreset(p, freq);
                        setPreviewingPreset(null);
                        setSelectedFrequency(null);
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <button
        onClick={reset}
        className="w-full h-12 rounded-xl border border-border text-text-muted font-medium"
      >
        Reset to default plan
      </button>

      {editingDay !== null && (
        <DayPicker
          day={editingDay}
          current={plan.days[editingDay]}
          onPick={(d, scope) => setDay(editingDay, d, scope)}
          onClose={() => setEditingDay(null)}
        />
      )}

      {previewingDay !== null && profile && (() => {
        // Compute the next occurrence of this weekday for preview context.
        // Index 0 is Monday — the thisMonday date lands at index 0.
        const previewDateObj = addDays(thisMonday, previewingDay);
        return (
          <DayPreviewModal
            date={format(previewDateObj, "yyyy-MM-dd")}
            day={plan.days[previewingDay]}
            profile={profile}
            onClose={() => setPreviewingDay(null)}
          />
        );
      })()}
    </div>
  );
}

// Block preview — shown when a preset is tapped once (before applying).
// Lists the weekly pattern derived from the chosen frequency + a frequency
// picker + a Start button. Frequency is required: picking it is what shapes
// the actual week the user commits to.
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
    <div className="border-t border-border/50 px-4 py-3 space-y-3">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-text-dim mb-2">
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
                  "h-10 rounded-lg border text-sm font-semibold transition-colors",
                  active
                    ? "bg-accent text-black border-accent"
                    : "bg-bg-elevated border-border text-text-muted"
                )}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-widest text-text-dim mb-2">
          Your week
        </div>
        <div className="space-y-1">
          {week.map((d, i) => {
            const tmpl = d?.templateId
              ? templatesFor(d.category).find((t) => t.id === d.templateId)
              : null;
            const label = !d
              ? "Rest"
              : tmpl
                ? `${CATEGORY_LABELS[d.category]} — ${tmpl.name}`
                : CATEGORY_LABELS[d.category];
            return (
              <div key={i} className="flex items-baseline gap-2 text-xs">
                <span className="w-10 shrink-0 text-text-dim uppercase tracking-widest text-[10px]">
                  {DAY_LABELS_LONG[i].slice(0, 3)}
                </span>
                <span className={clsx(!d && "text-text-dim")}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-[10px] text-text-dim">
        {preset.durationWeeks} weeks · progresses easy → harder → peak → deload. You can edit any day later.
      </div>

      <button
        onClick={onStart}
        className="w-full h-11 rounded-lg bg-accent text-black font-semibold text-sm"
      >
        Start this block →
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
  // Compute the phase label for every week using the same rules as
  // getBlockPhase — a small compact strip so the whole block is legible.
  const phases: { label: string; short: string; desc: string }[] = [];
  for (let w = 1; w <= durationWeeks; w++) {
    const weeksLeft = durationWeeks - w;
    let label = "Accumulation";
    let short = "Acc";
    let desc = "Build volume tolerance — moderate loads, more sets.";
    if (durationWeeks <= 1 || weeksLeft === 0) {
      label = "Deload";
      short = "Del";
      desc = "Recovery week — cut intensity ~15%, drop a set. CNS reset.";
    } else if (weeksLeft === 1 && durationWeeks >= 3) {
      label = "Realization";
      short = "Real";
      desc = "Peak week — heaviest loads, main lift +1 set, accessories back off. Chase PRs.";
    } else if (w > Math.ceil(durationWeeks / 3)) {
      label = "Intensification";
      short = "Int";
      desc = "Load creeps up ~5%, reps drop slightly. Push harder, moderate volume.";
    }
    phases.push({ label, short, desc });
  }
  const currentIdx = Math.min(currentWeek - 1, phases.length - 1);
  const [selectedIdx, setSelectedIdx] = useState(currentIdx);
  const selectedPhase = phases[selectedIdx];
  const isCurrent = selectedIdx === currentIdx;

  return (
    <div className="pt-2 space-y-2">
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${durationWeeks}, minmax(0, 1fr))` }}>
        {phases.map((p, i) => (
          <button
            key={i}
            onClick={() => setSelectedIdx(i)}
            className={clsx(
              "text-center py-1 rounded text-[10px] font-semibold tabular-nums transition-colors",
              i === selectedIdx
                ? "ring-1 ring-accent"
                : "",
              i === currentIdx
                ? "bg-accent text-black"
                : i < currentIdx
                ? "bg-accent/25 text-text-muted hover:bg-accent/40"
                : "bg-bg text-text-dim hover:bg-bg-elevated"
            )}
          >
            {i + 1}
            <div className="text-[8px] font-normal opacity-80">{p.short}</div>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-text-muted leading-snug">
        <span className="text-accent font-semibold">
          Week {selectedIdx + 1} · {selectedPhase.label}
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
        className="bg-bg-elevated border border-border rounded-2xl p-5 max-w-md w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">
            {DAY_LABELS_LONG[day]}
            {stage === "template" && pickedCategory && (
              <span className="text-text-dim text-sm font-normal ml-2">
                → {CATEGORY_LABELS[pickedCategory]}
              </span>
            )}
          </h3>
          <button onClick={onClose} className="text-text-dim text-2xl leading-none">
            ×
          </button>
        </div>

        {/* Scope toggle — "just this week" is safe default, "every week"
            changes the recurring pattern. Prevents small edits from
            accidentally rewriting the whole itinerary. */}
        <div className="mb-1 text-[10px] uppercase tracking-wider text-text-dim">
          Apply change to
        </div>
        <div className="mb-4 grid grid-cols-2 gap-1.5 p-1 bg-bg-card border border-border rounded-xl">
          <button
            onClick={() => setScope("this-week")}
            className={clsx(
              "py-2 rounded-lg text-xs font-semibold transition-colors",
              scope === "this-week"
                ? "bg-accent text-black"
                : "text-text-muted"
            )}
          >
            Just this week
          </button>
          <button
            onClick={() => setScope("every-week")}
            className={clsx(
              "py-2 rounded-lg text-xs font-semibold transition-colors",
              scope === "every-week"
                ? "bg-accent text-black"
                : "text-text-muted"
            )}
          >
            Every week (recurring)
          </button>
        </div>

        {stage === "category" && (
          <div className="space-y-1.5">
            <button
              onClick={() => onPick(null, scope)}
              className={clsx(
                "w-full text-left p-3 rounded-xl border transition-colors",
                current === null
                  ? "bg-accent/10 border-accent/40"
                  : "bg-bg-card border-border"
              )}
            >
              <div className="font-medium">Rest day</div>
              <div className="text-xs text-text-dim mt-0.5">Active recovery encouraged</div>
            </button>

            {CATEGORIES.filter((c) => c !== "sport").map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setPickedCategory(cat);
                  setStage("template");
                }}
                className={clsx(
                  "w-full text-left p-3 rounded-xl border transition-colors flex items-center justify-between gap-2",
                  current?.category === cat
                    ? "bg-accent/10 border-accent/40"
                    : "bg-bg-card border-border"
                )}
              >
                <div>
                  <div className="font-medium">{CATEGORY_LABELS[cat]}</div>
                  <div className="text-xs text-text-dim mt-0.5">{CATEGORY_BLURBS[cat]}</div>
                </div>
                <span className="text-text-dim text-sm">›</span>
              </button>
            ))}
          </div>
        )}

        {stage === "template" && pickedCategory && (
          <>
            <button
              onClick={() => setStage("category")}
              className="text-xs text-text-dim mb-3"
            >
              ← Change category
            </button>

            <div className="space-y-1.5">
              <button
                onClick={() => onPick({ category: pickedCategory }, scope)}
                className={clsx(
                  "w-full text-left p-3 rounded-xl border transition-colors",
                  current?.category === pickedCategory && !current?.templateId
                    ? "bg-accent/10 border-accent/40"
                    : "bg-bg-card border-border"
                )}
              >
                <div className="font-medium">↻ Rotate (any template)</div>
                <div className="text-xs text-text-dim mt-0.5">
                  Different session each time — variety guaranteed
                </div>
              </button>

              {templates.length > 0 && (
                <div className="text-[10px] uppercase tracking-widest text-text-dim font-semibold pt-3 pb-1 px-1">
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
                      "w-full text-left p-3 rounded-xl border transition-colors",
                      isLocked
                        ? "bg-accent/10 border-accent/40"
                        : "bg-bg-card border-border"
                    )}
                  >
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-text-dim mt-0.5">{t.description}</div>
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
