"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import clsx from "clsx";
import { db, getProfile } from "@/lib/db";
import { findSwapAlternatives, generateWorkout } from "@/lib/generator";
import { EXERCISES, getExercise } from "@/lib/data/exercises";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  EQUIPMENT_PRESET_INCLUDES,
  type Category,
  type CoachInfluence,
  type EquipmentPreset,
  type Intensity,
  type LoggedBlock,
  type LoggedPrescription,
  type LoggedSet,
  type Profile,
  type Session,
  type Workout,
  type WorkoutModifiers,
} from "@/lib/types";
import SetLogger from "@/components/SetLogger";
import ModifierPanel from "@/components/ModifierPanel";
import TemplatePicker from "@/components/TemplatePicker";

const INFLUENCE_LABELS: Record<CoachInfluence, string> = {
  galpin: "Galpin",
  attia: "Attia",
  huberman: "Huberman",
  patrick: "Patrick",
  hemsworth: "Hemsworth",
  general: "Foundational",
};

// Block "mode" inferred from scheme string — drives visual grouping
type BlockMode = "superset" | "circuit" | "amrap" | "emom" | "for_time" | "straight";

function detectBlockMode(scheme: string | undefined, prescriptionCount: number): BlockMode {
  const s = (scheme ?? "").toLowerCase();
  if (s.includes("superset")) return "superset";
  if (s.includes("emom")) return "emom";
  if (s.includes("amrap")) return "amrap";
  if (s.includes("for time")) return "for_time";
  if (s.includes("circuit") || s.includes("giant set") || (s.includes("round") && prescriptionCount > 1)) return "circuit";
  return "straight";
}

const MODE_LABELS: Record<BlockMode, string> = {
  superset: "SUPERSET",
  circuit: "CIRCUIT",
  amrap: "AMRAP",
  emom: "EMOM",
  for_time: "FOR TIME",
  straight: "STRAIGHT SETS",
};

export default function WorkoutForCategory({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const lockedTemplateId = searchParams.get("template") ?? undefined;

  const cat = category as Category;
  const validCat = (CATEGORIES as readonly string[]).includes(cat);

  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!validCat) return;
    (async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const p = await getProfile();
      setProfile(p);

      const existing = await db.sessions
        .where("date")
        .equals(today)
        .filter((s) => s.category === cat && (!lockedTemplateId || s.workoutId.includes(lockedTemplateId)))
        .first();

      if (existing) {
        setSession(existing);
        setLoading(false);
        return;
      }

      const initialModifiers: WorkoutModifiers = lockedTemplateId
        ? { templateId: lockedTemplateId }
        : {};
      const workout = await generateWorkout(cat, p, undefined, initialModifiers);
      const fresh = workoutToSession(workout);
      const id = await db.sessions.add(fresh);
      setSession({ ...fresh, id });
      setLoading(false);
    })();
  }, [cat, validCat, lockedTemplateId]);

  if (!validCat) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-10 text-center">
        <p className="text-text-muted">Unknown category.</p>
        <Link href="/workout" className="text-accent mt-3 inline-block">← Back</Link>
      </div>
    );
  }

  if (loading || !session || !profile) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-10 text-center text-text-muted">
        Building your session…
      </div>
    );
  }

  const update = async (mutator: (s: Session) => Session) => {
    setSession((prev) => {
      if (!prev) return prev;
      let next = mutator(prev);
      // Logging a set auto-promotes draft → started
      const anySetLogged = next.blocks.some((b) =>
        b.prescriptions.some((p) => p.sets.some((s) => s.completed))
      );
      if (anySetLogged && !next.startedAt) {
        next = { ...next, startedAt: Date.now() };
      }
      if (next.id !== undefined) {
        db.sessions.put(next);
      }
      return next;
    });
  };

  const startWorkout = async () => {
    if (!session.id || session.startedAt) return;
    const startedAt = Date.now();
    const next = { ...session, startedAt };
    setSession(next);
    await db.sessions.put(next);
  };

  const discard = async () => {
    if (!session.id) return;
    if (!confirm("Discard this preview? It won't show in your history.")) return;
    await db.sessions.delete(session.id);
    router.push("/");
  };

  const completedCount = session.blocks
    .flatMap((b) => b.prescriptions)
    .reduce((acc, p) => acc + p.sets.filter((s) => s.completed).length, 0);
  const totalCount = session.blocks
    .flatMap((b) => b.prescriptions)
    .reduce((acc, p) => acc + p.prescribedSets, 0);

  const finish = async () => {
    if (!session.id) return;
    const finishedAt = Date.now();
    await db.sessions.put({ ...session, finishedAt });
    router.push("/");
  };

  const regenerateWithModifiers = async (modifiers: WorkoutModifiers) => {
    if (!session.id) return;
    if (completedCount > 0) {
      if (!confirm("Regenerate this workout? Your current logs will be lost.")) {
        return;
      }
    }
    await db.sessions.delete(session.id);
    setLoading(true);
    const seed = new Date();
    seed.setMilliseconds(seed.getMilliseconds() + Math.floor(Math.random() * 1000));
    const workout = await generateWorkout(cat, profile, seed, modifiers);
    workout.id = `${workout.id}-${Date.now()}`;
    const fresh = workoutToSession(workout);
    const id = await db.sessions.add(fresh);
    setSession({ ...fresh, id });
    setLoading(false);
  };

  const setIntensity = (intensity: Intensity) => {
    regenerateWithModifiers({ ...(session.modifiers ?? {}), intensity });
  };

  const swapExercise = (blockIdx: number, prescIdx: number, newExerciseId: string) => {
    update((s) => {
      const blocks = [...s.blocks];
      const block = { ...blocks[blockIdx] };
      const prescriptions = [...block.prescriptions];
      const old = prescriptions[prescIdx];
      prescriptions[prescIdx] = {
        ...old,
        exerciseId: newExerciseId,
        loadHint: undefined,
        sets: old.sets.map((set) => ({ ...set, completed: false })),
        notes: [old.notes, `Swapped from ${getExercise(old.exerciseId).name}`].filter(Boolean).join(" · "),
      };
      block.prescriptions = prescriptions;
      blocks[blockIdx] = block;
      return { ...s, blocks };
    });
  };

  const currentIntensity: Intensity = session.modifiers?.intensity ?? "normal";

  return (
    <div className="max-w-3xl mx-auto px-5 py-5 space-y-5">
      {/* HEADER */}
      <header className="space-y-4 no-print">
        <div className="flex items-center justify-between">
          <Link href="/workout" className="text-text-dim text-sm">← Categories</Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="text-xs text-text-dim hover:text-text-muted px-3 py-1.5 rounded-lg border border-border"
              aria-label="Print or save as PDF"
              title="Print or save as PDF"
            >
              ⤓ Print
            </button>
            <button
              onClick={() => setPickerOpen(true)}
              className="text-xs text-text-dim hover:text-text-muted px-3 py-1.5 rounded-lg border border-border"
            >
              ⇄ Change
            </button>
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-accent font-semibold flex items-center gap-2">
            <span>{CATEGORY_LABELS[cat]}</span>
            {!session.startedAt && !session.finishedAt && (
              <span className="text-text-dim font-normal normal-case tracking-normal text-xs">
                · Preview
              </span>
            )}
            {session.startedAt && !session.finishedAt && (
              <span className="text-text-dim font-normal normal-case tracking-normal text-xs">
                · In progress
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold mt-1.5 leading-tight">
            {session.name.split(" — ")[1] ?? session.name}
          </h1>
          <div className="text-sm text-text-dim mt-1">
            {format(new Date(session.date), "EEEE, MMM d")}
            {session.modifiers?.timeMinutes ? ` · ${session.modifiers.timeMinutes} min` : ""}
          </div>
        </div>

        {/* READINESS CHECK-IN — front and center */}
        <div className="bg-bg-card border border-border rounded-2xl p-3">
          <div className="text-[10px] uppercase tracking-widest text-text-dim font-semibold mb-2 px-1">
            How do you feel today?
          </div>
          <div className="grid grid-cols-3 gap-2">
            <ReadinessChip
              active={currentIntensity === "recovery"}
              onClick={() => setIntensity("recovery")}
              emoji="🫠"
              label="Tired"
              sublabel="lighter"
            />
            <ReadinessChip
              active={currentIntensity === "normal"}
              onClick={() => setIntensity("normal")}
              emoji="🙂"
              label="Normal"
              sublabel="as planned"
            />
            <ReadinessChip
              active={currentIntensity === "push"}
              onClick={() => setIntensity("push")}
              emoji="🔥"
              label="Strong"
              sublabel="push it"
            />
          </div>
        </div>

        {/* PROGRESS — small, not center stage */}
        {completedCount > 0 && (
          <div>
            <div className="flex items-center justify-between text-[11px] text-text-dim mb-1">
              <span>Logged · {completedCount} / {totalCount} sets</span>
              <span>{totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%</span>
            </div>
            <div className="h-0.5 bg-bg-card rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {/* PHILOSOPHY */}
      {session.philosophy && (
        <div className="bg-bg-card border-l-2 border-accent rounded-r-xl px-4 py-3 no-print">
          <div className="text-[10px] uppercase tracking-widest text-accent font-semibold mb-1">
            {session.influences && session.influences.length > 0
              ? `Influenced by ${session.influences.map((c) => INFLUENCE_LABELS[c]).join(" + ")}`
              : "Today's protocol"}
          </div>
          <p className="text-sm text-text-muted leading-relaxed">{session.philosophy}</p>
        </div>
      )}

      <div className="no-print">
        <ModifierPanel
          initial={session.modifiers ?? {}}
          defaultEquipment={profile.defaultEquipment}
          onApply={regenerateWithModifiers}
        />
      </div>

      {/* BLOCKS */}
      <div className="space-y-4">
        {session.blocks.map((block, bi) => (
          <BlockCard
            key={bi}
            block={block}
            units={profile.units}
            availableEquipment={resolveEquipmentForUI(session.modifiers, profile.defaultEquipment)}
            onUpdate={(updated) =>
              update((s) => {
                const blocks = [...s.blocks];
                blocks[bi] = updated;
                return { ...s, blocks };
              })
            }
            onSwap={(pi, newId) => swapExercise(bi, pi, newId)}
          />
        ))}
      </div>

      {pickerOpen && (
        <TemplatePicker
          category={cat}
          currentTemplateId={session.modifiers?.templateId}
          onPickRandom={() => {
            setPickerOpen(false);
            regenerateWithModifiers({ ...(session.modifiers ?? {}), templateId: undefined });
          }}
          onPickTemplate={(id) => {
            setPickerOpen(false);
            regenerateWithModifiers({ ...(session.modifiers ?? {}), templateId: id });
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {/* PRIMARY CTA — depends on draft / in-progress / finished */}
      <div className="pt-4 no-print space-y-2">
        {!session.startedAt && !session.finishedAt ? (
          <>
            <button
              onClick={startWorkout}
              className="w-full bg-accent text-black font-bold py-4 rounded-2xl text-lg"
            >
              Start Workout
            </button>
            <button
              onClick={discard}
              className="w-full text-text-dim text-sm py-2"
            >
              Discard preview
            </button>
            <p className="text-center text-xs text-text-dim mt-1">
              Just looking? This won&apos;t appear in your history until you Start.
            </p>
          </>
        ) : (
          <>
            <button
              onClick={finish}
              className="w-full bg-accent text-black font-bold py-4 rounded-2xl text-lg transition-colors hover:bg-accent-dim"
            >
              {session.finishedAt ? "✓ Workout Complete" : "Mark Workout Done"}
            </button>
            <p className="text-center text-xs text-text-dim mt-1">
              Logging is optional. Walk away phone-free if you want.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function ReadinessChip({
  active,
  onClick,
  emoji,
  label,
  sublabel,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
  sublabel: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "p-3 rounded-xl border transition-all text-center",
        active
          ? "bg-accent text-black border-accent"
          : "bg-bg border-border text-text-muted hover:border-border/60"
      )}
    >
      <div className="text-xl">{emoji}</div>
      <div className="text-sm font-semibold mt-0.5">{label}</div>
      <div className={clsx("text-[10px] mt-0.5", active ? "opacity-70" : "text-text-dim")}>
        {sublabel}
      </div>
    </button>
  );
}

function resolveEquipmentForUI(
  modifiers: WorkoutModifiers | undefined,
  defaultEq: EquipmentPreset | undefined
): Set<string> {
  if (modifiers?.equipmentAvailable && modifiers.equipmentAvailable.length > 0) {
    return new Set(modifiers.equipmentAvailable);
  }
  const preset = modifiers?.equipmentPreset ?? defaultEq ?? "full_gym";
  return new Set(EQUIPMENT_PRESET_INCLUDES[preset]);
}

function BlockCard({
  block,
  units,
  availableEquipment,
  onUpdate,
  onSwap,
}: {
  block: LoggedBlock;
  units: "kg" | "lb";
  availableEquipment: Set<string>;
  onUpdate: (b: LoggedBlock) => void;
  onSwap: (prescIdx: number, newExerciseId: string) => void;
}) {
  const isWarmup = block.title === "Warmup";
  const isCooldown = block.title === "Cooldown";
  const isCore = block.title === "Core";

  // Collapse warmup/cooldown by default; main + core open
  const [collapsed, setCollapsed] = useState(isWarmup || isCooldown);

  // Block scheme detection (only used for visible grouping label)
  const scheme = (block as { scheme?: string }).scheme ?? "";
  const mode = detectBlockMode(scheme, block.prescriptions.length);
  const isGrouped = mode !== "straight" && block.prescriptions.length > 1;

  return (
    <section className="bg-bg-card border border-border rounded-2xl overflow-hidden print-block">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="text-xs uppercase tracking-[0.18em] text-text-dim font-bold">
              {block.title}
            </div>
            {scheme && (
              <div className={clsx(
                "text-sm font-semibold mt-1",
                isGrouped ? "text-accent" : "text-text"
              )}>
                {isGrouped && (
                  <span className="text-[10px] tracking-widest font-bold mr-2 bg-accent/15 text-accent px-1.5 py-0.5 rounded">
                    {MODE_LABELS[mode]}
                  </span>
                )}
                {scheme}
              </div>
            )}
          </div>
        </div>
        <svg
          className={clsx("w-5 h-5 text-text-dim transition-transform shrink-0 ml-2", !collapsed && "rotate-180")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!collapsed && (
        <div className="border-t border-border/50">
          {block.note && (
            <div className="px-4 pt-3 text-xs italic text-text-dim">{block.note}</div>
          )}

          <div className={clsx(
            "px-4 py-4 space-y-3",
            isGrouped && "relative"
          )}>
            {isGrouped && (
              <div
                className="absolute left-2 top-4 bottom-4 w-0.5 bg-accent/40 rounded"
                aria-hidden
              />
            )}

            {block.prescriptions.map((p, pi) => (
              <ExerciseCard
                key={pi}
                prescription={p}
                units={units}
                blockMode={mode}
                position={pi}
                totalInGroup={block.prescriptions.length}
                isWarmup={isWarmup}
                isCooldown={isCooldown}
                isCore={isCore}
                availableEquipment={availableEquipment}
                onUpdate={(updated) =>
                  onUpdate({
                    ...block,
                    prescriptions: block.prescriptions.map((x, i) => (i === pi ? updated : x)),
                  })
                }
                onSwap={(newId) => onSwap(pi, newId)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ExerciseCard({
  prescription,
  units,
  blockMode,
  position,
  totalInGroup,
  isWarmup,
  isCooldown,
  isCore,
  availableEquipment,
  onUpdate,
  onSwap,
}: {
  prescription: LoggedPrescription;
  units: "kg" | "lb";
  blockMode: BlockMode;
  position: number;
  totalInGroup: number;
  isWarmup: boolean;
  isCooldown: boolean;
  isCore: boolean;
  availableEquipment: Set<string>;
  onUpdate: (p: LoggedPrescription) => void;
  onSwap: (newExerciseId: string) => void;
}) {
  const [showSwaps, setShowSwaps] = useState(false);
  const [showLogger, setShowLogger] = useState(false);

  const exercise = getExercise(prescription.exerciseId);
  const showLoad = exercise.weighted && !isWarmup && !isCooldown;
  const completedSets = prescription.sets.filter((s) => s.completed).length;

  const swapIds = findSwapAlternatives(prescription.exerciseId, availableEquipment as Set<never>, 4);

  // Letter labels for supersets: A1, A2 / B1, B2
  const isGrouped = blockMode !== "straight" && totalInGroup > 1;
  const letter = isGrouped && blockMode === "superset"
    ? `A${position + 1}`
    : isGrouped
    ? `${position + 1}.`
    : null;

  return (
    <div className={clsx(isGrouped && "pl-5")}>
      {/* Top: Name + position label + swap */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-baseline gap-2 flex-1 min-w-0">
          {letter && (
            <span className="text-accent font-bold text-sm tabular-nums shrink-0">{letter}</span>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xl font-bold leading-tight">{exercise.name}</div>
          </div>
        </div>
        {!isWarmup && !isCooldown && swapIds.length > 0 && (
          <button
            onClick={() => setShowSwaps((s) => !s)}
            className="text-[10px] text-text-dim hover:text-accent shrink-0 px-2 py-1 rounded border border-border no-print"
            aria-label="Swap exercise"
          >
            ⇄
          </button>
        )}
      </div>

      {/* Big stat row: SETS × REPS · REST · RPE */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
        <Stat
          big={`${prescription.prescribedSets} × ${prescription.prescribedReps}`}
          label="sets × reps"
        />
        {prescription.rest && (
          <Stat
            big={prescription.rest}
            label="rest"
          />
        )}
        {prescription.rpe !== undefined && (
          <Stat
            big={`RPE ${prescription.rpe}`}
            label=""
            muted
          />
        )}
      </div>

      {/* Load hint */}
      {prescription.loadHint && (
        <div className="text-sm text-accent font-medium mb-1.5">
          {prescription.loadHint}
        </div>
      )}

      {/* Prescription notes */}
      {prescription.prescriptionNotes && (
        <div className="text-xs text-text-muted italic mb-1.5">
          {prescription.prescriptionNotes}
        </div>
      )}

      {/* Form cues */}
      {exercise.cues && exercise.cues.length > 0 && (
        <div className="text-xs text-text-dim leading-snug">
          {exercise.cues.join(" · ")}
        </div>
      )}

      {/* Swap UI */}
      {showSwaps && (
        <div className="mt-3 p-3 bg-bg rounded-lg border border-border space-y-1.5 no-print">
          <div className="text-[10px] uppercase tracking-widest text-text-dim font-semibold">
            Alternatives — same pattern, your equipment
          </div>
          {swapIds.map((id) => {
            const ex = EXERCISES.find((e) => e.id === id);
            if (!ex) return null;
            return (
              <button
                key={id}
                onClick={() => {
                  onSwap(id);
                  setShowSwaps(false);
                }}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-bg-card text-sm flex items-center justify-between"
              >
                <span>{ex.name}</span>
                <span className="text-[10px] text-text-dim">{ex.equipment[0]}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Log button (collapsed by default) */}
      {!isWarmup && !isCooldown && (
        <div className="mt-3 no-print">
          {!showLogger ? (
            <button
              onClick={() => setShowLogger(true)}
              className="text-[11px] text-text-dim hover:text-accent border border-border rounded-lg px-3 py-1.5"
            >
              {completedSets > 0
                ? `✓ ${completedSets} logged · tap to add more`
                : "+ Log set (optional)"}
            </button>
          ) : (
            <div className="space-y-1.5 mt-2">
              {prescription.sets.map((s, i) => (
                <SetLogger
                  key={i}
                  index={i}
                  set={s}
                  units={units}
                  showLoad={showLoad}
                  onChange={(next) =>
                    onUpdate({
                      ...prescription,
                      sets: prescription.sets.map((x, j) => (j === i ? next : x)),
                    })
                  }
                />
              ))}
              <div className="flex items-center justify-between mt-1">
                <button
                  onClick={() =>
                    onUpdate({
                      ...prescription,
                      sets: [...prescription.sets, { completed: false }],
                    })
                  }
                  className="text-[11px] text-text-dim hover:text-accent"
                >
                  + Add set
                </button>
                <button
                  onClick={() => setShowLogger(false)}
                  className="text-[11px] text-text-dim"
                >
                  hide
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ big, label, muted }: { big: string; label: string; muted?: boolean }) {
  return (
    <div className="leading-tight">
      <div className={clsx(
        "tabular-nums font-bold",
        label === "" ? "text-base" : "text-2xl",
        muted ? "text-text-muted" : "text-text"
      )}>
        {big}
      </div>
      {label && (
        <div className="text-[9px] uppercase tracking-widest text-text-dim mt-0.5">{label}</div>
      )}
    </div>
  );
}

function workoutToSession(w: Workout): Session {
  return {
    workoutId: w.id,
    category: w.category,
    name: w.name,
    date: w.date,
    createdAt: Date.now(),
    // startedAt left undefined — this is a DRAFT until user explicitly starts
    philosophy: w.philosophy,
    influences: w.influences,
    modifiers: w.modifiers,
    blocks: w.blocks.map((b) => ({
      title: b.title,
      scheme: b.scheme,
      note: b.note,
      prescriptions: b.prescriptions.map<LoggedPrescription>((p) => ({
        exerciseId: p.exerciseId,
        prescribedSets: p.sets,
        prescribedReps: p.reps,
        rpe: p.rpe,
        rest: p.rest,
        loadHint: p.loadHint,
        prescriptionNotes: p.notes,
        sets: emptySets(p.sets),
      })),
    })),
  };
}

function emptySets(n: number): LoggedSet[] {
  return Array.from({ length: n }, () => ({ completed: false }));
}
