"use client";

import { useEffect, useMemo, useState } from "react";
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

type Step = "energy" | "sleep" | "hard" | "easy" | "lifts" | "body";

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
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [sleep, setSleep] = useState<"poor" | "ok" | "good" | null>(null);
  const [hardIds, setHardIds] = useState<string[]>([]);
  const [easyIds, setEasyIds] = useState<string[]>([]);
  const [liftResults, setLiftResults] = useState<
    Record<LiftId, "beat" | "hit" | "missed" | undefined>
  >({} as Record<LiftId, "beat" | "hit" | "missed" | undefined>);
  const [bodyFlags, setBodyFlags] = useState<RehabZone[]>([]);
  const [saving, setSaving] = useState(false);
  const [thisWeekExercises, setThisWeekExercises] = useState<string[] | null>(null);
  const [thisWeekLifts, setThisWeekLifts] = useState<LiftId[] | null>(null);
  const [stepIdx, setStepIdx] = useState(0);

  // Pull the exercises actually used this week (from finished sessions).
  useEffect(() => {
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
      // Only look at MAIN work blocks — a hollow hold in the warmup or a
      // child pose in cooldown shouldn't show up in "was this too hard?"
      const isSkipBlock = (title: string) =>
        /warmup|cooldown|cool.?down|core/i.test(title);
      for (const s of done) {
        for (const b of s.blocks) {
          if (isSkipBlock(b.title)) continue;
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

  // Steps only include the ones that have data to answer against.
  const steps: Step[] = useMemo(() => {
    const s: Step[] = ["energy", "sleep"];
    if (thisWeekExercises && thisWeekExercises.length > 0) {
      s.push("hard", "easy");
    }
    if (thisWeekLifts && thisWeekLifts.length > 0) {
      s.push("lifts");
    }
    s.push("body");
    return s;
  }, [thisWeekExercises, thisWeekLifts]);

  const step = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;

  const goNext = () => {
    if (isLast) save();
    else setStepIdx((i) => i + 1);
  };
  const goBack = () => setStepIdx((i) => Math.max(0, i - 1));

  // Auto-advance on single-select after a tiny beat so the user sees the highlight.
  const advanceSoon = () => {
    setTimeout(() => setStepIdx((i) => Math.min(steps.length - 1, i + 1)), 250);
  };

  const toggle = (list: string[], setter: (v: string[]) => void, id: string) => {
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
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
      energy: energy ?? 3,
      sleep: sleep ?? "ok",
      hardExerciseIds: hardIds,
      easyExerciseIds: easyIds,
      liftProgression: progressionArr,
      bodyFlags,
      createdAt: Date.now(),
    };
    await saveWeeklyReview(review);

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
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg-elevated border border-border rounded-3xl w-full max-w-md max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-accent font-bold">
              Weekly review
            </div>
            <div className="text-xs text-text-dim mt-0.5">
              Week ending {format(new Date(weekEndDate), "EEEE, MMM d")}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-dim text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-card"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* PROGRESS DOTS */}
        <div className="px-6 flex items-center gap-1.5 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={clsx(
                "h-1 flex-1 rounded-full transition-colors",
                i < stepIdx
                  ? "bg-accent/40"
                  : i === stepIdx
                  ? "bg-accent"
                  : "bg-border"
              )}
            />
          ))}
        </div>

        {/* BODY — one question per screen */}
        <div className="px-6 flex-1 overflow-y-auto pb-4">
          {step === "energy" && (
            <QuestionShell
              question="How did the week feel overall?"
              hint="Coach uses this to tune next week's volume."
            >
              <div className="grid grid-cols-1 gap-2">
                {([
                  { v: 1, l: "Drained", d: "Wrecked. Skipped or dragged through." },
                  { v: 2, l: "Low", d: "Under-recovered. Not fun." },
                  { v: 3, l: "OK", d: "Neither drained nor charged." },
                  { v: 4, l: "Good", d: "Sessions felt clean." },
                  { v: 5, l: "Charged", d: "Every session felt strong." },
                ] as const).map((o) => (
                  <BigChoice
                    key={o.v}
                    label={o.l}
                    hint={o.d}
                    active={energy === o.v}
                    onClick={() => {
                      setEnergy(o.v);
                      advanceSoon();
                    }}
                  />
                ))}
              </div>
            </QuestionShell>
          )}

          {step === "sleep" && (
            <QuestionShell
              question="How was your sleep this week?"
              hint="Poor sleep drops accessory volume next week."
            >
              <div className="grid grid-cols-1 gap-2">
                {([
                  { v: "poor", l: "Poor", d: "Under 7h, restless, or interrupted." },
                  { v: "ok", l: "OK", d: "Decent nights, one or two off." },
                  { v: "good", l: "Good", d: "7+ hours, consistent." },
                ] as const).map((o) => (
                  <BigChoice
                    key={o.v}
                    label={o.l}
                    hint={o.d}
                    active={sleep === o.v}
                    onClick={() => {
                      setSleep(o.v);
                      advanceSoon();
                    }}
                  />
                ))}
              </div>
            </QuestionShell>
          )}

          {step === "hard" && thisWeekExercises && (
            <QuestionShell
              question="Anything felt too hard?"
              hint="Coach drops a set on each next time. Skip if nothing stood out."
            >
              <div className="flex flex-wrap gap-2">
                {thisWeekExercises.map((id) => (
                  <PillChoice
                    key={id}
                    label={safeName(id)}
                    active={hardIds.includes(id)}
                    onClick={() => toggle(hardIds, setHardIds, id)}
                  />
                ))}
              </div>
            </QuestionShell>
          )}

          {step === "easy" && thisWeekExercises && (
            <QuestionShell
              question="Anything felt too easy?"
              hint="Coach adds a set on each next time."
            >
              <div className="flex flex-wrap gap-2">
                {thisWeekExercises.map((id) => (
                  <PillChoice
                    key={id}
                    label={safeName(id)}
                    active={easyIds.includes(id)}
                    onClick={() => toggle(easyIds, setEasyIds, id)}
                  />
                ))}
              </div>
            </QuestionShell>
          )}

          {step === "lifts" && thisWeekLifts && (
            <QuestionShell
              question="Main lifts — how'd you do?"
              hint="Beat = chase heavier next week. Missed = hold steady, no drop."
            >
              <div className="space-y-3">
                {thisWeekLifts.map((liftId) => {
                  const label =
                    TRACKED_LIFTS.find((l) => l.id === liftId)?.label ?? liftId;
                  const cur = liftResults[liftId];
                  return (
                    <div
                      key={liftId}
                      className="bg-bg-card border border-border rounded-2xl p-4"
                    >
                      <div className="text-base font-semibold mb-3">{label}</div>
                      <div className="grid grid-cols-3 gap-2">
                        {(["beat", "hit", "missed"] as const).map((v) => (
                          <button
                            key={v}
                            onClick={() =>
                              setLiftResults((prev) => ({ ...prev, [liftId]: v }))
                            }
                            className={clsx(
                              "text-center py-2.5 rounded-xl border font-semibold capitalize text-sm transition-colors",
                              cur === v
                                ? "bg-accent text-black border-accent"
                                : "bg-bg border-border text-text-muted"
                            )}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </QuestionShell>
          )}

          {step === "body" && (
            <QuestionShell
              question="Anything nagging?"
              hint="Ticked areas auto-enable safer swaps until you untick them in Settings."
            >
              <div className="flex flex-wrap gap-2">
                {REHAB_ZONE_OPTIONS.map((o) => (
                  <PillChoice
                    key={o.id}
                    label={o.label}
                    active={bodyFlags.includes(o.id)}
                    onClick={() =>
                      setBodyFlags((cur) =>
                        cur.includes(o.id)
                          ? cur.filter((x) => x !== o.id)
                          : [...cur, o.id]
                      )
                    }
                  />
                ))}
              </div>
            </QuestionShell>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 pb-6 pt-3 border-t border-border/50 flex items-center gap-2">
          {stepIdx > 0 ? (
            <button
              onClick={goBack}
              className="text-sm text-text-muted px-4 h-12 rounded-xl"
            >
              Back
            </button>
          ) : (
            <button
              onClick={onClose}
              className="text-sm text-text-dim px-4 h-12 rounded-xl"
            >
              Later
            </button>
          )}
          <button
            onClick={goNext}
            disabled={saving}
            className="flex-1 bg-accent text-black font-bold h-12 rounded-xl disabled:opacity-40 transition-opacity"
          >
            {isLast
              ? saving
                ? "Saving…"
                : "Save — tune next week"
              : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionShell({
  question,
  hint,
  children,
}: {
  question: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-2xl font-bold leading-tight">{question}</h3>
        {hint && <p className="text-xs text-text-dim mt-2">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function BigChoice({
  label,
  hint,
  active,
  onClick,
}: {
  label: string;
  hint?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full text-left px-4 py-3 rounded-2xl border transition-colors",
        active
          ? "bg-accent text-black border-accent"
          : "bg-bg-card border-border hover:border-accent/40"
      )}
    >
      <div className="font-bold text-base">{label}</div>
      {hint && (
        <div
          className={clsx(
            "text-xs mt-0.5",
            active ? "text-black/70" : "text-text-dim"
          )}
        >
          {hint}
        </div>
      )}
    </button>
  );
}

function PillChoice({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "text-sm px-3.5 py-2 rounded-full border font-medium transition-colors",
        active
          ? "bg-accent text-black border-accent"
          : "bg-bg-card border-border text-text-muted hover:border-accent/40"
      )}
    >
      {label}
    </button>
  );
}

function safeName(id: string): string {
  try {
    return getExercise(id).name;
  } catch {
    return id;
  }
}
