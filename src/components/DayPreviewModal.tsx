"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { generateWorkout } from "@/lib/generator";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import {
  CATEGORY_LABELS,
  type PlannedDay,
  type Profile,
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

// Turn an exercise id like "incline_db_press" into "Incline DB Press".
function exerciseName(id: string): string {
  return id
    .split("_")
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}
