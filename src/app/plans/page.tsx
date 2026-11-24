"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  PRESET_GROUPS,
  presetSlug,
  visiblePresets,
  type BlockPreset,
} from "@/lib/data/presets";
import { categoryColor } from "@/lib/categoryTheme";

// Public library of every training block in the app. Tapping a card goes to
// /plans/[slug] which shows the full weekly shape + a Make-this-my-block CTA.
// Reached from Plan → "Browse all blocks" or linked directly — this is the
// surface a friend scrolls through to understand what the app actually does.
// Visit /plans?personal=1 to also show owner-authored "Personal" blocks.

export default function PlansLibraryPage() {
  return (
    <Suspense>
      <PlansLibraryInner />
    </Suspense>
  );
}

function PlansLibraryInner() {
  const searchParams = useSearchParams();
  const includePersonal = searchParams.get("personal") === "1";
  const presets = visiblePresets({ includePersonal });
  const presetByFocus = new Map(presets.map((p) => [p.focusName, p]));
  // Grouping mirrors the Plan tab's picker modal so what you see here matches
  // what you'd find when swapping blocks from inside the app.
  const groups = PRESET_GROUPS.map((g) => ({
    id: g.id,
    label: g.label,
    presets: g.items
      .map((focus) => presetByFocus.get(focus))
      .filter((p): p is BlockPreset => !!p),
  }));
  const groupedFocusNames = new Set(PRESET_GROUPS.flatMap((g) => g.items));
  const ungrouped = presets.filter((p) => !groupedFocusNames.has(p.focusName));
  if (ungrouped.length > 0) {
    groups.push({ id: "other", label: "Other", presets: ungrouped });
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-6 space-y-8">
      <header>
        <p className="text-[12px] tracking-normal text-text-dim font-medium">
          Every block
        </p>
        <h1 className="text-[2.125rem] font-medium tracking-[-0.03em] leading-[1] mt-1.5 text-text">
          Blocks
        </h1>
        <p className="text-text-muted text-sm mt-3 leading-relaxed">
          A block is a 1–8 week focus with a clear intent. Pick one when you&apos;re
          starting, swap when the goal changes. Each is built on the research of
          one or more of Attia, Galpin, Schoenfeld, Huberman, or Hunter McIntyre.
        </p>
      </header>

      {groups.map((g) => (
        g.presets.length === 0 ? null : (
          <section key={g.id} className="space-y-3">
            <h2 className="text-[11px] tracking-normal text-text-dim font-medium">
              {g.label}
            </h2>
            <div className="grid gap-3">
              {g.presets.map((p) => (
                <PresetCard key={p.focusName} preset={p} />
              ))}
            </div>
          </section>
        )
      ))}
    </div>
  );
}

// Preview card — shows name, tagline, duration/frequency, and a one-glance
// weekly shape (7 dots colored by category). Tap → /plans/[slug] for the
// full picture + Make-this-my-block CTA.
function PresetCard({ preset }: { preset: BlockPreset }) {
  const trainingCount = preset.days.filter((d) => d !== null).length;
  return (
    <Link
      href={`/plans/${presetSlug(preset)}`}
      className="block border border-border-strong/40 bg-bg-elevated rounded-2xl p-4 hover:border-text-dim transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-text font-medium">{preset.name}</div>
          <div className="text-xs text-text-muted mt-1 leading-relaxed">
            {preset.tagline}
          </div>
        </div>
        <span className="text-text-dim text-sm shrink-0" aria-hidden>›</span>
      </div>
      <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-border-strong/30">
        <div className="flex gap-1">
          {Array.from({ length: 7 }, (_, i) => {
            // Weekly shape is priority-ordered — take the first N sessions and
            // pad with rests so the dot row reads like a Mon-Sun plan preview.
            const day = preset.days[i] ?? null;
            if (!day) {
              return <span key={i} className="w-1.5 h-1.5 rounded-full border border-border-strong/60" />;
            }
            const color = categoryColor(day.category);
            return (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: color.solid }}
                aria-hidden
              />
            );
          })}
        </div>
        <div className="text-[11px] tracking-normal text-text-dim font-medium tabular-nums">
          {preset.durationWeeks}wk · {trainingCount} days/wk
        </div>
      </div>
    </Link>
  );
}
