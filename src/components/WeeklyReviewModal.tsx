"use client";

import { useState, useMemo } from "react";
import clsx from "clsx";
import { format, differenceInCalendarDays } from "date-fns";
import { db, saveWeeklyReview } from "@/lib/db";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { getExercise } from "@/lib/data/exercises";
import {
  TRACKED_LIFTS,
  type LiftId,
  type Profile,
  type RehabZone,
  type Session,
  type WeeklyReview,
} from "@/lib/types";

const REHAB_ZONE_OPTIONS: { id: RehabZone; label: string }[] = [
  { id: "lower_back", label: "Lower back" },
  { id: "shoulder", label: "Shoulder" },
  { id: "knee", label: "Knee" },
  { id: "hip", label: "Hip" },
  { id: "elbow", label: "Elbow" },
  { id: "neck", label: "Neck" },
];

export default function WeeklyReviewModal({
  weekEndDate,
  profile,
  onClose,
  onSaved,
}: {
  weekEndDate: string;
  profile: Profile;
  onClose: () => void;
  onSaved: () => void;
}) {
  useBodyScrollLock(true);
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [sleep, setSleep] = useState<"poor" | "ok" | "good">("ok");
  const [hardIds, setHardIds] = useState<string[]>([]);
  const [easyIds, setEasyIds] = useState<string[]>([]);
  const [liftResults, setLiftResults] = useState<
    Record<LiftId, "beat" | "hit" | "missed" | undefined>
  >({} as Record<LiftId, "beat" | "hit" | "missed" | undefined>);
  const [bodyFlags, setBodyFlags] = useState<RehabZone[]>([]);
  const [motivation, setMotivation] = useState<"low" | "normal" | "high">("normal");
  const [saving, setSaving] = useState(false);
  const [thisWeekExercises, setThisWeekExercises] = useState<string[] | null>(null);
  const [thisWeekLifts, setThisWeekLifts] = useState<LiftId[] | null>(null);

  // Pull the exercises actually used this week (from finished sessions) so the
  // hard/easy pickers show a relevant shortlist, not the whole library.
  useMemo(() => {
    (async () => {
      const start = format(
        new Date(new Date(weekEndDate).getTime() - 6 * 86400000),
        "yyyy-MM-dd"
      );
      const sessions = await db.sessions
        .where("date")
        .between(start, weekEndDate, true, true)
        .toArray();
      const done = sessions.filter((s: Session) => s.finishedAt);
      const ids = new Set<string>();
      const liftSet = new Set<LiftId>();
      for (const s of done) {
        for (const b of s.blocks) {
          for (const p of b.prescriptions) {
            ids.add(p.exerciseId);
            const tracked = TRACKED_LIFTS.find((l) => l.id === p.exerciseId);
            if (tracked) liftSet.add(tracked.id);
          }
        }
      }
      setThisWeekExercises([...ids]);
      setThisWeekLifts([...liftSet]);
    })();
  }, [weekEndDate]);

  const toggle = (list: string[], setter: (v: string[]) => void, id: string) => {
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const save = async () => {
    setSaving(true);
    // Compute week-in-block if we have a focus
    let weekInBlock: number | undefined;
    if (profile.currentFocus?.startedAt) {
      const daysIn = Math.max(
        0,
        differenceInCalendarDays(
          new Date(weekEndDate),
          new Date(profile.currentFocus.startedAt)
        )
      );
      weekInBlock = Math.floor(daysIn / 7) + 1;
    }

    const progressionArr: WeeklyReview["liftProgression"] = [];
    (Object.entries(liftResults) as [LiftId, "beat" | "hit" | "missed" | undefined][])
      .forEach(([liftId, result]) => {
        if (result) progressionArr.push({ liftId, result });
      });

    const review: WeeklyReview = {
      weekEndDate,
      focusName: profile.currentFocus?.name,
      weekInBlock,
      energy,
      sleep,
      hardExerciseIds: hardIds,
      easyExerciseIds: easyIds,
      liftProgression: progressionArr,
      bodyFlags,
      motivation,
      createdAt: Date.now(),
    };
    await saveWeeklyReview(review);

    // Body flags auto-toggle profile.activeConcerns — this is the ONE thing
    // that persists beyond next week's generator. Feels the most coach-like.
    if (bodyFlags.length > 0) {
      const currentConcerns = new Set(profile.activeConcerns ?? []);
      for (const zone of bodyFlags) currentConcerns.add(zone);
      const { saveProfile } = await import("@/lib/db");
      await saveProfile({ activeConcerns: [...currentConcerns] });
    }
    onSaved();
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg-elevated border border-border rounded-2xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-accent font-semibold">
              Weekly review
            </div>
            <h3 className="text-xl font-bold mt-1">
              Week ending {format(new Date(weekEndDate), "MMM d")}
            </h3>
            <p className="text-xs text-text-dim mt-1">
              Answers tune next week&apos;s workouts. ~2 min.
            </p>
          </div>
          <button onClick={onClose} className="text-text-dim text-2xl leading-none">
            ×
          </button>
        </div>

        {/* 1. Energy */}
        <div className="space-y-2">
          <div className="text-sm font-semibold">Overall energy this week</div>
          <div className="grid grid-cols-5 gap-1">
            {([
              { v: 1, l: "Drained" },
              { v: 2, l: "Low" },
              { v: 3, l: "OK" },
              { v: 4, l: "Good" },
              { v: 5, l: "Charged" },
            ] as const).map((o) => (
              <button
                key={o.v}
                onClick={() => setEnergy(o.v)}
                className={clsx(
                  "text-center py-2 rounded-lg border text-[11px] font-semibold",
                  energy === o.v
                    ? "bg-accent text-black border-accent"
                    : "bg-bg-card border-border text-text-muted"
                )}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Sleep */}
        <div className="space-y-2">
          <div className="text-sm font-semibold">Sleep this week</div>
          <div className="grid grid-cols-3 gap-2">
            {(["poor", "ok", "good"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setSleep(v)}
                className={clsx(
                  "text-center py-2 rounded-lg border text-sm font-semibold capitalize",
                  sleep === v
                    ? "bg-accent text-black border-accent"
                    : "bg-bg-card border-border text-text-muted"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Hard exercises */}
        {thisWeekExercises && thisWeekExercises.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold">Anything felt too hard?</div>
            <div className="text-[11px] text-text-dim">
              Multi-select. Each dropped -1 set on next occurrence.
            </div>
            <div className="flex flex-wrap gap-1.5">
              {thisWeekExercises.map((id) => (
                <button
                  key={id}
                  onClick={() => toggle(hardIds, setHardIds, id)}
                  className={clsx(
                    "text-[11px] px-2 py-1 rounded-full border",
                    hardIds.includes(id)
                      ? "bg-accent/20 border-accent/60 text-accent"
                      : "bg-bg-card border-border text-text-muted"
                  )}
                >
                  {safeName(id)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. Easy exercises */}
        {thisWeekExercises && thisWeekExercises.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold">Anything felt too easy?</div>
            <div className="text-[11px] text-text-dim">
              Multi-select. Each gets +1 set on next occurrence.
            </div>
            <div className="flex flex-wrap gap-1.5">
              {thisWeekExercises.map((id) => (
                <button
                  key={id}
                  onClick={() => toggle(easyIds, setEasyIds, id)}
                  className={clsx(
                    "text-[11px] px-2 py-1 rounded-full border",
                    easyIds.includes(id)
                      ? "bg-accent/20 border-accent/60 text-accent"
                      : "bg-bg-card border-border text-text-muted"
                  )}
                >
                  {safeName(id)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 5. Main-lift progression */}
        {thisWeekLifts && thisWeekLifts.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold">Main lifts — did you hit them?</div>
            <div className="space-y-2">
              {thisWeekLifts.map((liftId) => {
                const label = TRACKED_LIFTS.find((l) => l.id === liftId)?.label ?? liftId;
                const cur = liftResults[liftId];
                return (
                  <div key={liftId} className="bg-bg-card border border-border rounded-xl p-3">
                    <div className="text-sm font-medium mb-2">{label}</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["beat", "hit", "missed"] as const).map((v) => (
                        <button
                          key={v}
                          onClick={() =>
                            setLiftResults((prev) => ({ ...prev, [liftId]: v }))
                          }
                          className={clsx(
                            "text-center py-1.5 rounded-lg border text-[11px] font-semibold capitalize",
                            cur === v
                              ? "bg-accent text-black border-accent"
                              : "bg-bg border-border text-text-muted"
                          )}
                        >
                          {v === "beat" ? "Beat 🎯" : v === "hit" ? "Hit" : "Missed"}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. Body flags */}
        <div className="space-y-2">
          <div className="text-sm font-semibold">Anything nagging?</div>
          <div className="text-[11px] text-text-dim">
            Ticked areas auto-enable injury swaps until you untick them in Settings.
          </div>
          <div className="flex flex-wrap gap-1.5">
            {REHAB_ZONE_OPTIONS.map((o) => (
              <button
                key={o.id}
                onClick={() =>
                  setBodyFlags((cur) =>
                    cur.includes(o.id) ? cur.filter((x) => x !== o.id) : [...cur, o.id]
                  )
                }
                className={clsx(
                  "text-[11px] px-2.5 py-1 rounded-full border font-medium",
                  bodyFlags.includes(o.id)
                    ? "bg-accent/20 border-accent/60 text-accent"
                    : "bg-bg-card border-border text-text-muted"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* 7. Motivation */}
        <div className="space-y-2">
          <div className="text-sm font-semibold">Motivation for next week</div>
          <div className="grid grid-cols-3 gap-2">
            {(["low", "normal", "high"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setMotivation(v)}
                className={clsx(
                  "text-center py-2 rounded-lg border text-sm font-semibold capitalize",
                  motivation === v
                    ? "bg-accent text-black border-accent"
                    : "bg-bg-card border-border text-text-muted"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-accent text-black font-bold py-3 rounded-2xl disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save review — tune next week"}
        </button>
      </div>
    </div>
  );
}

function safeName(id: string): string {
  try {
    return getExercise(id).name;
  } catch {
    return id;
  }
}
