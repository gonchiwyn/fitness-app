"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { differenceInCalendarDays, format, startOfWeek } from "date-fns";
import {
  db,
  getProfile,
  getWeeklyPlan,
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
  type Category,
  type PlannedDay,
  type Profile,
  type WeeklyPlan,
} from "@/lib/types";

export default function PlanPage() {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const todayIdx = dateToPlanIndex(new Date());

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
  const presets: {
    label: string;
    focusName: string;
    durationWeeks: number;
    days: PlannedDay[];
  }[] = [
    // Durations per Galpin (real hypertrophy adaptation takes 5–6 weeks
    // minimum, strength peaks want 6–8 with a real deload). Every preset
    // holds 2× Zone 2 minimum — Attia/Patrick's non-negotiable for aerobic
    // maintenance and mortality prevention regardless of block focus.
    {
      label: "Hypertrophy month (PPL + Z2 maintenance)",
      focusName: "Hypertrophy",
      durationWeeks: 6,
      days: [
        { category: "split", templateId: "split_push" },
        { category: "split", templateId: "split_pull" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "split", templateId: "split_legs" },
        { category: "hypertrophy" },
        { category: "cardio", templateId: "attia_zone2_45" },
        null,
      ],
    },
    {
      // Galpin's lab-validated Menno Henselmans autoregulated hypertrophy
      // program. ABAB weekly split — same day twice per week. Autoregulation:
      // reps 2+ above range → +2.5% load; 2+ below → -10%. 8-week protocol.
      label: "Menno autoregulated hypertrophy (Galpin lab)",
      focusName: "Menno Hypertrophy",
      durationWeeks: 8,
      days: [
        { category: "hypertrophy", templateId: "menno_hyp_a" },
        { category: "hypertrophy", templateId: "menno_hyp_b" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "hypertrophy", templateId: "menno_hyp_a" },
        { category: "hypertrophy", templateId: "menno_hyp_b" },
        { category: "cardio", templateId: "attia_zone2_45" },
        null,
      ],
    },
    {
      label: "Strength peak (heavy compounds + Z2)",
      focusName: "Strength peak",
      durationWeeks: 8,
      days: [
        { category: "strength", templateId: "strength_lower_a" },
        { category: "strength", templateId: "strength_upper_a" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "strength", templateId: "strength_deadlift_day" },
        { category: "split", templateId: "split_arms" },
        { category: "cardio", templateId: "attia_zone2_45" },
        null,
      ],
    },
    {
      label: "Cardio base (mostly Z2 + strength maintenance)",
      focusName: "Cardio base",
      durationWeeks: 8,
      days: [
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "strength" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "cardio", templateId: "attia_4x4_vo2" },
        { category: "strength" },
        { category: "cardio", templateId: "attia_zone2_45" },
        null,
      ],
    },
    {
      label: "Athletic month (Hyrox + power + Z2)",
      focusName: "Athletic",
      durationWeeks: 6,
      days: [
        { category: "athlete" },
        { category: "hyrox" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "split", templateId: "split_legs" },
        { category: "hyrox" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "recovery" },
      ],
    },
    {
      label: "Recovery week (mobility + easy Z2)",
      focusName: "Recovery",
      durationWeeks: 1,
      days: [
        { category: "stretching" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "stretching" },
        { category: "recovery" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "recovery" },
        null,
      ],
    },
    {
      label: "PPL classic (Push/Pull balanced + Z2)",
      focusName: "PPL",
      durationWeeks: 6,
      // Push and Pull symmetric (2× each). Legs at 1× because it recovers
      // slower and benefits more from a single hard session than two
      // moderate ones. Under-pulling → shoulder / posture issues; that
      // rules out the old "2 Push / 1 Pull / 2 Legs" pattern.
      days: [
        { category: "split", templateId: "split_push" },
        { category: "split", templateId: "split_pull" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "split", templateId: "split_legs" },
        { category: "split", templateId: "split_push" },
        { category: "split", templateId: "split_pull" },
        { category: "cardio", templateId: "attia_zone2_45" },
      ],
    },
    {
      label: "Bro split (5 lifts + 2× Z2)",
      focusName: "Bro split",
      durationWeeks: 6,
      days: [
        { category: "split", templateId: "split_chest" },
        { category: "split", templateId: "split_back" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "split", templateId: "split_shoulders" },
        { category: "split", templateId: "split_arms" },
        { category: "split", templateId: "split_legs" },
        { category: "cardio", templateId: "attia_zone2_45" },
      ],
    },
    {
      label: "Longevity (3 strength · 2 Z2 · 1 VO2 · 1 stretch)",
      focusName: "Longevity",
      durationWeeks: 8,
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
      // Surf-trip prep. Foot-injury safe. Every session hits shoulders / triceps
      // / neck / lateral hips — the fatigue points that limit surf sessions.
      // Coaches: Cris Mills, XPT, Kalyn Kolbe, Galpin. See surf_* templates.
      // Week 3 auto-populates as sailing/swim log-only (see applyPreset).
      label: "Surf Prep — El Salvador (foot-safe, week 3 swim)",
      focusName: "Surf prep",
      durationWeeks: 6,
      days: [
        { category: "athlete", templateId: "surf_paddle_push" },
        { category: "athlete", templateId: "surf_paddle_pull" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "athlete", templateId: "surf_legs" },
        { category: "athlete", templateId: "surf_pop_up_core" },
        { category: "cardio", templateId: "attia_zone2_45" },
        { category: "recovery" },
      ],
    },
  ];

  const applyPreset = async (preset: (typeof presets)[number]) => {
    if (!confirm(`Start "${preset.focusName}" focus? Replaces your current weekly plan.`)) return;
    const next: WeeklyPlan = { id: "me", days: preset.days };
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

    setShowPresets(false);
  };

  const endBlock = async () => {
    if (!confirm("End the current focus block? Your weekly plan stays as-is.")) return;
    await saveProfile({ currentFocus: undefined });
    setProfile((p) => (p ? { ...p, currentFocus: undefined } : p));
  };

  // Compute block state — drives whether we render the "current block" hero
  // or the "pick a block" hero at the top of the page.
  const focus = profile?.currentFocus;
  let blockState: "active" | "completed" | "none" = "none";
  let weekNum = 0;
  let progressPct = 0;
  if (focus) {
    const daysIn = Math.max(
      0,
      differenceInCalendarDays(new Date(), new Date(focus.startedAt))
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
        <section className="bg-bg-card border border-accent/40 rounded-2xl p-5 space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-accent font-semibold">
                Current focus block
              </div>
              <div className="text-2xl font-bold mt-1">{focus.name}</div>
            </div>
            <div className="text-xs text-text-dim shrink-0">
              Week {weekNum} of {focus.durationWeeks}
            </div>
          </div>
          <div className="h-1 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-accent" style={{ width: `${progressPct}%` }} />
          </div>
          <PhaseOutline
            durationWeeks={focus.durationWeeks}
            startedAt={focus.startedAt}
            currentWeek={weekNum}
          />
          <div className="flex items-center justify-between text-xs text-text-dim">
            <span>Started {format(new Date(focus.startedAt), "MMM d")}</span>
            <button onClick={endBlock} className="text-text-muted underline">
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
              <button
                key={i}
                onClick={() => setEditingDay(i)}
                className={clsx(
                  "w-full text-left rounded-2xl border p-4 transition-colors flex items-center gap-4",
                  isToday
                    ? "bg-accent/10 border-accent/40"
                    : "bg-bg-card border-border"
                )}
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
                <span className="text-xs text-text-dim">Edit ›</span>
              </button>
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
            Each block sets the weekly pattern + tags Home with "Week X of N".
          </p>
          <div className="space-y-2">
            {presets.map((p, i) => (
              <button
                key={i}
                onClick={() => applyPreset(p)}
                className="w-full text-left bg-bg-card border border-border rounded-xl px-4 py-3 hover:border-accent/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm">{p.label}</div>
                  <div className="text-[10px] uppercase tracking-widest text-text-dim shrink-0">
                    {p.durationWeeks}w
                  </div>
                </div>
              </button>
            ))}
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
