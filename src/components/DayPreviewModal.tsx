"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { generateWorkout } from "@/lib/generator";
import { db } from "@/lib/db";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import {
  CATEGORY_LABELS,
  type PlannedDay,
  type Profile,
  type Session,
  type Workout,
} from "@/lib/types";

export default function DayPreviewModal({
  date,
  day,
  profile,
  onClose,
}: {
  date: string; // yyyy-MM-dd
  day: PlannedDay;
  profile: Profile;
  onClose: () => void;
}) {
  useBodyScrollLock(true);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const dateObj = parseISO(date + "T00:00:00");
  const dayLabel = format(dateObj, "EEEE, MMM d");

  useEffect(() => {
    if (!day) {
      setLoading(false);
      return;
    }
    // Sport is log-only — no template, no generator. Preview shows a card
    // with sport suggestions and hands off to SportLogModal for logging.
    if (day.category === "sport") {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      // Prefer the actual saved session for this date — if the user opened
      // the workout builder and made changes (swap, "Not today", template
      // switch), those changes should show up in the preview next time.
      // Match by date + category only; a template switch changes the
      // workoutId so filtering by templateId would miss modified sessions.
      const candidates = await db.sessions
        .where("date")
        .equals(date)
        .filter((s) => s.category === day.category)
        .toArray();
      // Prefer the most-recently-modified session (highest id).
      const saved = candidates.sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0];

      if (saved) {
        if (!cancelled) {
          setWorkout(sessionToWorkoutShape(saved));
          setLoading(false);
        }
        return;
      }

      const modifiers = day.templateId ? { templateId: day.templateId } : {};
      const w = await generateWorkout(day.category, profile, dateObj, modifiers);
      if (!cancelled) {
        setWorkout(w);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, day?.category, day?.templateId]);

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
            <div className="text-[10px] uppercase tracking-[0.22em] text-accent font-medium">
              Preview
            </div>
            <h3 className="font-display text-xl font-semibold tracking-tight text-text mt-1">
              {dayLabel}
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

        {!day ? (
          <p className="text-sm text-text-muted">Rest day — no session planned.</p>
        ) : day.category === "sport" ? (
          <SportDayPreview />
        ) : loading ? (
          <p className="text-sm text-text-muted">Building preview…</p>
        ) : workout ? (
          <>
            <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim font-medium">
              {CATEGORY_LABELS[day.category]}
            </div>
            <div className="text-sm text-text mt-1 mb-5 font-medium">{workout.name}</div>

            <div className="space-y-3">
              {workout.blocks
                .filter((b) => !/warmup/i.test(b.title))
                .map((block) => (
                  <div
                    key={block.id}
                    className="border border-border-strong/40 bg-bg-card rounded-xl p-3.5"
                  >
                    <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim font-medium">
                      {block.title}
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {block.prescriptions.map((p, i) => (
                        <div key={i} className="text-sm flex items-baseline justify-between gap-2">
                          <span className="text-text">{exerciseName(p.exerciseId)}</span>
                          <span className="text-xs text-text-dim tabular-nums shrink-0">
                            {p.sets}×{p.reps}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>

            <p className="text-[11px] text-text-dim mt-5 leading-relaxed">
              Projected session for {dayLabel}. Accessories rotate week-to-week — this is
              a snapshot, not a fixed script.
            </p>
          </>
        ) : (
          <p className="text-sm text-text-muted">Couldn&apos;t build a preview.</p>
        )}

        {day && day.category === "sport" ? (
          <Link
            href="/workout"
            className="block text-center mt-5 pt-4 border-t border-border-strong/30 text-[11px] uppercase tracking-[0.18em] text-accent font-medium"
            onClick={onClose}
          >
            Log a sport
          </Link>
        ) : day && (
          <Link
            href={
              day.templateId
                ? `/workout/${day.category}?template=${day.templateId}&date=${date}`
                : `/workout/${day.category}?date=${date}`
            }
            className="block text-center mt-5 pt-4 border-t border-border-strong/30 text-[11px] uppercase tracking-[0.18em] text-accent font-medium"
            onClick={onClose}
          >
            Open workout builder
          </Link>
        )}
      </div>
    </div>
  );
}

// Sport days have no template — show a plain card with sport suggestions.
function SportDayPreview() {
  return (
    <div className="space-y-3">
      <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim font-medium">
        Sport day
      </div>
      <p className="text-sm text-text-muted leading-relaxed">
        No structured workout — just move. Log what you did after (or before, for planning).
      </p>
      <div className="border border-border-strong/40 bg-bg-card rounded-xl p-3.5 text-sm text-text-muted">
        Ideas: swim, surf, tennis, hike, bike ride, climb, ski, football…
      </div>
    </div>
  );
}

// The preview renders `Workout` shape (blocks[].prescriptions[].sets/reps/etc).
// A saved Session's prescriptions are richer (per-set logging), so we compress
// them back into a preview-friendly Workout so any user edits (swaps, skips)
// are reflected here.
function sessionToWorkoutShape(s: Session): Workout {
  return {
    id: s.workoutId,
    category: s.category,
    name: s.name,
    date: s.date,
    estimatedDurationMin: 60,
    seed: 0,
    philosophy: s.philosophy,
    influences: s.influences,
    modifiers: s.modifiers,
    phase: s.phase,
    blocks: s.blocks.map((b, i) => ({
      id: `preview-${i}`,
      title: b.title,
      scheme: b.scheme,
      note: b.note,
      prescriptions: b.prescriptions.map((p) => ({
        exerciseId: p.exerciseId,
        sets: p.prescribedSets,
        reps: p.prescribedReps,
        rpe: p.rpe,
        rest: p.rest,
        notes: p.notes,
        loadHint: p.loadHint,
      })),
    })),
  };
}

// Turn an exercise id like "incline_db_press" into "Incline DB Press".
function exerciseName(id: string): string {
  return id
    .split("_")
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}
