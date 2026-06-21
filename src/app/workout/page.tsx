"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { templatesFor } from "@/lib/data/templates";
import {
  CATEGORY_BLURBS,
  CATEGORY_DURATION,
  CATEGORY_LABELS,
  type Category,
} from "@/lib/types";

// Personalized order: performance / functional first.
// Beach is hidden ("less beach vibes, more strong-guy").
const VISIBLE_CATEGORIES: Category[] = [
  "split",
  "hypertrophy",
  "strength",
  "hyrox",
  "athlete",
  "core",
  "cardio",
  "crossfit",
  "surf",
  "burn",
  "stretching",
  "recovery",
];

export default function WorkoutIndex() {
  const [pickerCat, setPickerCat] = useState<Category | null>(null);

  return (
    <div className="max-w-3xl mx-auto px-5 py-6 space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-text-dim">Choose your discipline</p>
        <h1 className="text-3xl font-bold mt-1">Train</h1>
        <p className="text-sm text-text-muted mt-2">
          Tap a category to pick today&apos;s session — or hit &quot;Surprise me&quot;.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {VISIBLE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setPickerCat(cat)}
            className="block rounded-2xl p-5 bg-bg-card border border-border hover:border-accent/40 transition-colors text-left"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xl font-bold">{CATEGORY_LABELS[cat]}</div>
                <div className="text-sm text-text-muted mt-1">{CATEGORY_BLURBS[cat]}</div>
              </div>
              <div className="text-xs text-text-dim tabular-nums">
                ~{CATEGORY_DURATION[cat]}m
              </div>
            </div>
          </button>
        ))}
      </div>

      {pickerCat && (
        <TemplatePicker
          category={pickerCat}
          onClose={() => setPickerCat(null)}
        />
      )}
    </div>
  );
}

function TemplatePicker({
  category,
  onClose,
}: {
  category: Category;
  onClose: () => void;
}) {
  const router = useRouter();
  const templates = templatesFor(category);

  const pickRandom = () => {
    router.push(`/workout/${category}`);
  };

  const pickTemplate = (templateId: string) => {
    router.push(`/workout/${category}?template=${templateId}`);
  };

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
            {CATEGORY_LABELS[category]}
            <span className="text-text-dim text-sm font-normal ml-2">
              · pick a session
            </span>
          </h3>
          <button onClick={onClose} className="text-text-dim text-2xl leading-none">
            ×
          </button>
        </div>

        <button
          onClick={pickRandom}
          className={clsx(
            "w-full text-left p-3 rounded-xl border bg-accent/10 border-accent/40 mb-2"
          )}
        >
          <div className="font-medium">↻ Surprise me</div>
          <div className="text-xs text-text-dim mt-0.5">
            Random pick — variety guaranteed
          </div>
        </button>

        {templates.length > 0 && (
          <div className="text-[10px] uppercase tracking-widest text-text-dim font-semibold pt-3 pb-1 px-1">
            Or pick a specific session
          </div>
        )}

        <div className="space-y-1.5">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => pickTemplate(t.id)}
              className="w-full text-left p-3 rounded-xl border bg-bg-card border-border hover:border-accent/40 transition-colors"
            >
              <div className="font-medium">{t.name}</div>
              <div className="text-xs text-text-dim mt-0.5">{t.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
