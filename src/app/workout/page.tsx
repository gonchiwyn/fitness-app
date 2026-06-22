"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CATEGORY_BLURBS,
  CATEGORY_DURATION,
  CATEGORY_LABELS,
  type Category,
} from "@/lib/types";
import TemplatePicker from "@/components/TemplatePicker";

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
  const router = useRouter();
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
          onPickRandom={() => router.push(`/workout/${pickerCat}`)}
          onPickTemplate={(id) => router.push(`/workout/${pickerCat}?template=${id}`)}
          onClose={() => setPickerCat(null)}
        />
      )}
    </div>
  );
}
