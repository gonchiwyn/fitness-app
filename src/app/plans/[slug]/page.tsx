"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOCK_PRESETS, presetBySlug, presetSlug, type BlockPreset } from "@/lib/data/presets";
import { templatesFor } from "@/lib/data/templates";
import { categoryColor } from "@/lib/categoryTheme";
import {
  CATEGORY_LABELS,
  DAY_LABELS_LONG,
  type PlannedDay,
} from "@/lib/types";

// Detail view for one training block. Shows the weekly shape (Mon-Sun),
// what's actually in each day's template, and a CTA that launches the Plan
// tab's block picker pre-targeted at this preset. The URL is slug-based so
// the page is shareable — a user can text a friend the link to Hyrox Prep.
export default function PlanDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const preset = presetBySlug(slug);
  if (!preset) {
    notFound();
  }
  return <PlanDetail preset={preset} />;
}

function PlanDetail({ preset }: { preset: BlockPreset }) {
  // Show the default frequency, not the count of non-null days — presets
  // often hold an extra priority-ordered slot (e.g. a 6th hypertrophy day)
  // that only lands in the week if the user picks a higher frequency. The
  // detail header should match what the user gets at defaults.
  const sessionsPerWeek = preset.defaultFrequency;
  // Order the preset's priority-ordered days into a Mon-Sun week. Takes the
  // first N training sessions at the standard weekday slots used by the rest
  // of the app, pads with rest. Matches what the Plan tab would render when
  // applying this preset at its default frequency.
  const week = buildWeekPreview(preset);
  // "Siblings" so a friend browsing can jump sideways. 3 nearest presets.
  const siblings = BLOCK_PRESETS.filter((p) => p.focusName !== preset.focusName).slice(0, 3);

  return (
    <div className="max-w-3xl mx-auto px-5 py-6 space-y-6">
      <header>
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-text-dim mb-3 font-medium">
          <Link href="/plans" className="hover:text-text">← Plans</Link>
        </div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-accent font-medium">
          Training block
        </p>
        <h1 className="text-[2.125rem] font-medium tracking-[-0.03em] leading-[1.05] mt-1.5 text-text">
          {preset.name}
        </h1>
        <p className="text-text-muted text-sm mt-3 leading-relaxed">{preset.tagline}</p>
        <div className="flex items-center gap-4 mt-5 text-[11px] uppercase tracking-[0.18em] text-text-dim font-medium tabular-nums">
          <span>{preset.durationWeeks}-week block</span>
          <span className="text-border-strong">·</span>
          <span>{sessionsPerWeek} sessions/wk</span>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-[10px] uppercase tracking-[0.22em] text-text-dim font-medium">
          Weekly shape
        </h2>
        <div className="space-y-2">
          {week.map((day, i) => {
            const template = day?.templateId
              ? templatesFor(day.category).find((t) => t.id === day.templateId)
              : null;
            const color = day ? categoryColor(day.category) : null;
            return (
              <div
                key={i}
                className="flex items-center gap-4 rounded-2xl border border-border-strong/40 p-4 bg-bg-elevated"
              >
                <div className="w-12 text-center shrink-0 text-text-dim">
                  <div className="text-[10px] uppercase tracking-[0.22em] font-medium">
                    {DAY_LABELS_LONG[i].slice(0, 3)}
                  </div>
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
                          {template
                            ? template.name.toLowerCase().startsWith(CATEGORY_LABELS[day.category].toLowerCase() + " —")
                              ? template.name
                              : `${CATEGORY_LABELS[day.category]} — ${template.name}`
                            : CATEGORY_LABELS[day.category]}
                        </span>
                      </div>
                      {template?.description && (
                        <div className="text-xs text-text-dim mt-1 leading-relaxed pl-3.5 truncate">
                          {template.description}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-text-dim">Rest</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Link
        href={`/plan?pick=1&target=${encodeURIComponent(preset.focusName)}`}
        className="block w-full text-center bg-accent text-bg rounded-full py-3.5 text-sm font-semibold hover:bg-accent-dim transition-colors"
      >
        Make this my block
      </Link>

      {siblings.length > 0 && (
        <section className="space-y-3 pt-4">
          <h2 className="text-[10px] uppercase tracking-[0.22em] text-text-dim font-medium">
            Other blocks
          </h2>
          <div className="grid gap-2">
            {siblings.map((p) => (
              <Link
                key={p.focusName}
                href={`/plans/${presetSlug(p)}`}
                className="flex items-center justify-between gap-3 border border-border-strong/40 rounded-2xl px-4 py-3 hover:border-text-dim transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-text text-sm font-medium truncate">{p.name}</div>
                  <div className="text-[11px] text-text-dim mt-0.5 leading-relaxed truncate">
                    {p.tagline}
                  </div>
                </div>
                <span className="text-text-dim text-sm shrink-0" aria-hidden>›</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// Same Mon-Sun placement rules the Plan tab uses when applying a preset. Keeps
// the preview honest — what you see here is what the block would actually look
// like at its default frequency once applied.
const WEEKDAY_SLOTS: Record<number, number[]> = {
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 5],
};

function buildWeekPreview(preset: BlockPreset): PlannedDay[] {
  const sessions = preset.days.filter((d): d is NonNullable<PlannedDay> => d !== null);
  const freq = Math.min(preset.defaultFrequency, sessions.length);
  const slots = WEEKDAY_SLOTS[freq] ?? WEEKDAY_SLOTS[5];
  const week: PlannedDay[] = [null, null, null, null, null, null, null];
  slots.slice(0, freq).forEach((weekdayIdx, i) => {
    week[weekdayIdx] = sessions[i];
  });
  return week;
}
