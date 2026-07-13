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
        className="bg-bg-elevated border border-border rounded-2xl p-5 max-w-md w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-accent font-semibold">
              Preview
            </div>
            <h3 className="text-xl font-bold mt-1">{dayLabel}</h3>
          </div>
          <button onClick={onClose} className="text-text-dim text-2xl leading-none">
            ×
          </button>
        </div>

        {!day ? (
          <p className="text-sm text-text-muted">Rest day — no session planned.</p>
        ) : loading ? (
          <p className="text-sm text-text-muted">Building preview…</p>
        ) : workout ? (
          <>
            <div className="text-xs uppercase tracking-widest text-text-dim mb-1">
              {CATEGORY_LABELS[day.category]}
            </div>
            <div className="text-sm text-text-muted mb-4">{workout.name}</div>

            <div className="space-y-3">
              {workout.blocks
                // Warmup is boilerplate — hide from previews to save room.
                .filter((b) => !/warmup/i.test(b.title))
                .map((block) => (
                  <div
                    key={block.id}
                    className="bg-bg-card border border-border rounded-xl p-3"
                  >
                    <div className="text-[10px] uppercase tracking-widest text-text-dim font-semibold">
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

            <p className="text-[10px] text-text-dim mt-4 leading-relaxed">
              This is a projected session for {dayLabel}. Accessories rotate week-to-week
              via the exercise pool — Monday next month won&apos;t be identical to Monday today.
            </p>
          </>
        ) : (
          <p className="text-sm text-text-muted">Couldn&apos;t build a preview.</p>
        )}

        {day && (
          <Link
            href={
              day.templateId
                ? `/workout/${day.category}?template=${day.templateId}&date=${date}`
                : `/workout/${day.category}?date=${date}`
            }
            className="block text-center mt-4 text-accent font-semibold text-sm"
            onClick={onClose}
          >
            Open workout builder →
          </Link>
        )}
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
