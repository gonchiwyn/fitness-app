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
import SportLogModal from "@/components/SportLogModal";
import { categoryColor } from "@/lib/categoryTheme";

// Personalized order: performance / functional first.
// Beach is hidden ("less beach vibes, more strong-guy").
// Sport at the bottom — it's a log, not a workout to program.
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
  "test",
  "sport",
];

export default function WorkoutIndex() {
  const router = useRouter();
  const [pickerCat, setPickerCat] = useState<Category | null>(null);
  const [sportOpen, setSportOpen] = useState(false);

  return (
    <div className="max-w-3xl mx-auto px-5 py-6 space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.22em] text-text-dim font-medium">
          Choose your discipline
        </p>
        <h1 className="font-display text-[2.5rem] font-normal tracking-tight leading-[0.95] mt-1.5 text-text">
          Train
        </h1>
        <p className="text-sm text-text-muted mt-3 leading-relaxed">
          Tap a category to pick today&apos;s session — or hit &quot;Surprise me&quot;.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {VISIBLE_CATEGORIES.map((cat) => {
          const color = categoryColor(cat);
          return (
            <button
              key={cat}
              onClick={() => {
                if (cat === "sport") setSportOpen(true);
                else setPickerCat(cat);
              }}
              className="block rounded-2xl p-4 border border-border-strong/40 hover:border-text-dim transition-colors text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: color.solid }}
                      aria-hidden
                    />
                    <div className="font-medium text-text">{CATEGORY_LABELS[cat]}</div>
                  </div>
                  <div className="text-xs text-text-dim mt-1 leading-relaxed">{CATEGORY_BLURBS[cat]}</div>
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-text-dim tabular-nums shrink-0 font-medium">
                  ~{CATEGORY_DURATION[cat]}m
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {pickerCat && (
        <TemplatePicker
          category={pickerCat}
          onPickRandom={() => router.push(`/workout/${pickerCat}`)}
          onPickTemplate={(id) => router.push(`/workout/${pickerCat}?template=${id}`)}
          onClose={() => setPickerCat(null)}
        />
      )}

      {sportOpen && (
        <SportLogModal
          onClose={() => setSportOpen(false)}
          onLogged={() => {
            setSportOpen(false);
            router.push("/");
          }}
        />
      )}
    </div>
  );
}
