"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { getWeeklyPlan, saveWeeklyPlan } from "@/lib/db";
import { templatesFor } from "@/lib/data/templates";
import {
  CATEGORIES,
  CATEGORY_BLURBS,
  CATEGORY_LABELS,
  DAY_LABELS_LONG,
  dateToPlanIndex,
  type Category,
  type PlannedDay,
  type WeeklyPlan,
} from "@/lib/types";

export default function PlanPage() {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const todayIdx = dateToPlanIndex(new Date());

  useEffect(() => {
    getWeeklyPlan().then(setPlan);
  }, []);

  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-10 text-text-muted text-center">
        Loading…
      </div>
    );
  }

  const setDay = async (dayIdx: number, day: PlannedDay) => {
    const next: WeeklyPlan = { ...plan, days: [...plan.days] };
    next.days[dayIdx] = day;
    setPlan(next);
    await saveWeeklyPlan(next);
    setEditingDay(null);
  };

  const reset = async () => {
    if (!confirm("Clear the entire weekly plan?")) return;
    const next: WeeklyPlan = { id: "me", days: [null, null, null, null, null, null, null] };
    setPlan(next);
    await saveWeeklyPlan(next);
  };

  const presets: { label: string; days: PlannedDay[] }[] = [
    {
      label: "Hyrox-focused (M-F Hyrox, Sat Cardio, Sun rest)",
      days: [
        { category: "hyrox" },
        { category: "hyrox" },
        { category: "hyrox" },
        { category: "hyrox" },
        { category: "hyrox" },
        { category: "cardio" },
        null,
      ],
    },
    {
      label: "Push / Pull / Legs (M-W rotation, repeat Th-Sat, Sun rest)",
      days: [
        { category: "split", templateId: "split_push" },
        { category: "split", templateId: "split_pull" },
        { category: "split", templateId: "split_legs" },
        { category: "split", templateId: "split_push" },
        { category: "split", templateId: "split_pull" },
        { category: "split", templateId: "split_legs" },
        null,
      ],
    },
    {
      label: "Bro Split (chest/back/sh/arms/legs + 2 rest)",
      days: [
        { category: "split", templateId: "split_chest" },
        { category: "split", templateId: "split_back" },
        { category: "split", templateId: "split_shoulders" },
        { category: "split", templateId: "split_arms" },
        { category: "split", templateId: "split_legs" },
        null,
        null,
      ],
    },
    {
      label: "Galpin Power (S/A intercalado + recovery)",
      days: [
        { category: "strength" },
        { category: "athlete" },
        null,
        { category: "strength" },
        { category: "athlete" },
        { category: "recovery" },
        null,
      ],
    },
    {
      label: "Longevity (3 strength, 2 Z2, 1 VO2, 1 stretch)",
      days: [
        { category: "strength" },
        { category: "cardio" },
        { category: "hypertrophy" },
        { category: "cardio" },
        { category: "strength" },
        { category: "cardio" },
        { category: "stretching" },
      ],
    },
  ];

  const applyPreset = async (days: PlannedDay[]) => {
    if (!confirm("Replace your current weekly plan with this preset?")) return;
    const next: WeeklyPlan = { id: "me", days };
    setPlan(next);
    await saveWeeklyPlan(next);
  };

  return (
    <div className="max-w-3xl mx-auto px-5 py-6 space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-text-dim">Your week</p>
        <h1 className="text-3xl font-bold mt-1">Plan</h1>
        <p className="text-text-muted text-sm mt-2">
          Set what you train each day. Plan repeats every week. Lock a specific template (e.g. Push, Pull, Legs) or leave on rotation.
        </p>
      </header>

      <div className="space-y-2">
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

      <section className="space-y-3 pt-2">
        <h2 className="text-xs uppercase tracking-widest text-text-dim font-semibold">
          Quick presets
        </h2>
        <div className="space-y-2">
          {presets.map((p, i) => (
            <button
              key={i}
              onClick={() => applyPreset(p.days)}
              className="w-full text-left bg-bg-card border border-border rounded-xl px-4 py-3 hover:border-accent/40 transition-colors"
            >
              <div className="text-sm">{p.label}</div>
            </button>
          ))}
        </div>
      </section>

      <button
        onClick={reset}
        className="w-full h-12 rounded-xl border border-border text-text-muted font-medium"
      >
        Clear plan
      </button>

      <p className="text-xs text-text-dim text-center pt-2">
        On a planned day, the Home screen shows you exactly what to do.
        You can always override by tapping a different category from Train.
      </p>

      {editingDay !== null && (
        <DayPicker
          day={editingDay}
          current={plan.days[editingDay]}
          onPick={(d) => setDay(editingDay, d)}
          onClose={() => setEditingDay(null)}
        />
      )}
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
  onPick: (d: PlannedDay) => void;
  onClose: () => void;
}) {
  // Step 1: category pick. Step 2 (if templates exist): optional template lock.
  const [stage, setStage] = useState<"category" | "template">(
    current ? "template" : "category"
  );
  const [pickedCategory, setPickedCategory] = useState<Category | null>(
    current?.category ?? null
  );

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
        <div className="flex items-center justify-between mb-4">
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

        {stage === "category" && (
          <div className="space-y-1.5">
            <button
              onClick={() => onPick(null)}
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

            {CATEGORIES.map((cat) => (
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
                onClick={() => onPick({ category: pickedCategory })}
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
                    onClick={() => onPick({ category: pickedCategory, templateId: t.id })}
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
