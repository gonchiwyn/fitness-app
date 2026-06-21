"use client";

import Link from "next/link";
import { CATEGORIES, CATEGORY_BLURBS, CATEGORY_DURATION, CATEGORY_LABELS } from "@/lib/types";

// Mono palette — every card is the same surface. Cleaner, less rainbow.
const CATEGORY_ACCENTS: Record<string, string> = {
  crossfit: "from-white/5 to-white/[0.02] border-white/10",
  hyrox: "from-white/5 to-white/[0.02] border-white/10",
  surf: "from-white/5 to-white/[0.02] border-white/10",
  stretching: "from-white/5 to-white/[0.02] border-white/10",
  athlete: "from-white/5 to-white/[0.02] border-white/10",
  strength: "from-white/5 to-white/[0.02] border-white/10",
  hypertrophy: "from-white/5 to-white/[0.02] border-white/10",
  burn: "from-white/5 to-white/[0.02] border-white/10",
  recovery: "from-white/5 to-white/[0.02] border-white/10",
  beach: "from-white/5 to-white/[0.02] border-white/10",
  cardio: "from-white/5 to-white/[0.02] border-white/10",
  core: "from-white/5 to-white/[0.02] border-white/10",
  split: "from-white/5 to-white/[0.02] border-white/10",
};

export default function WorkoutIndex() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-6 space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-text-dim">Choose your discipline</p>
        <h1 className="text-3xl font-bold mt-1">Train</h1>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={`/workout/${cat}`}
            className={`block rounded-2xl p-5 bg-gradient-to-br border ${CATEGORY_ACCENTS[cat]} hover:scale-[1.02] transition-transform active:scale-100`}
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
          </Link>
        ))}
      </div>
    </div>
  );
}
