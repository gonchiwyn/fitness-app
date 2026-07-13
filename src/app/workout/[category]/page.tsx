"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import clsx from "clsx";
import { db, getProfile, saveProfile } from "@/lib/db";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { findSwapAlternatives, generateWorkout } from "@/lib/generator";
import { EXERCISES, getExercise } from "@/lib/data/exercises";
import {
  BENCHMARK_META,
  CATEGORIES,
  CATEGORY_LABELS,
  CORE_FOCUS_LABELS,
  EQUIPMENT_PRESET_INCLUDES,
  getBlockPhase,
  EXERCISE_TO_BENCHMARK,
  INTENSITY_LABELS,
  type Category,
  type CoachInfluence,
  type CoreFocus,
  type EquipmentPreset,
  type Intensity,
  type LoggedBlock,
  type LoggedPrescription,
  type LoggedSet,
  type Profile,
  type Session,
  type SessionRating,
  type Workout,
  type WorkoutModifiers,
} from "@/lib/types";
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

// Rebuild the block scheme header from the actual prescriptions so it can't
// drift from the individual set×rep rows. Keeps the "SUPERSET"/"CIRCUIT"
// qualifier if the template had one.
function computeSchemeHeader(block: LoggedBlock): string {
  const staticScheme = (block as { scheme?: string }).scheme ?? "";
  const qualifiers = [
    { key: "superset", label: "Superset" },
    { key: "circuit", label: "Circuit" },
    { key: "amrap", label: "AMRAP" },
    { key: "emom", label: "EMOM" },
    { key: "for time", label: "For Time" },
  ];
  const q = qualifiers.find((x) => staticScheme.toLowerCase().includes(x.key));
  const prefix = q ? `${q.label} · ` : "";

  const rest = block.prescriptions[0]?.rest;
  const restSuffix = rest ? ` — rest ${rest}` : "";

  if (block.prescriptions.length === 0) return staticScheme;
  // If all prescriptions share the same sets and reps, use a single summary.
  const first = block.prescriptions[0];
  const allSame = block.prescriptions.every(
    (p) => p.prescribedSets === first.prescribedSets && p.prescribedReps === first.prescribedReps
  );
  if (allSame) {
    return `${prefix}${first.prescribedSets} × ${first.prescribedReps}${restSuffix}`;
  }
  // Otherwise return the range across the block.
  const reps = block.prescriptions.map((p) => String(p.prescribedReps));
  const sets = block.prescriptions.map((p) => p.prescribedSets);
  const setsSummary = sets.every((s) => s === sets[0]) ? `${sets[0]}` : `${Math.min(...sets)}-${Math.max(...sets)}`;
  return `${prefix}${setsSummary} × ${[...new Set(reps)].join("/")}${restSuffix}`;
}

export default function WorkoutForCategory({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const lockedTemplateId = searchParams.get("template") ?? undefined;
  // Optional ?date=YYYY-MM-DD — when navigating from a preview / past day,
  // we build (or open) the session for THAT date, not today's.
  const dateParam = searchParams.get("date") ?? undefined;

  const cat = category as Category;
  const validCat = (CATEGORIES as readonly string[]).includes(cat);

  // Sport is a log-only category — nothing to generate. Bounce to the picker
  // (which opens the SportLogModal on the /workout index).
  useEffect(() => {
    if (cat === "sport") router.replace("/workout");
  }, [cat, router]);

  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [corePickerOpen, setCorePickerOpen] = useState(false);
  // When true, all collapsible blocks force expand — used for Print/PDF export
  const [printExpandAll, setPrintExpandAll] = useState(false);

  useEffect(() => {
    if (!validCat) return;
    (async () => {
      // Target date defaults to today; overridden by ?date= when navigating
      // from a preview / past-day tap so the same session appears each time.
      const targetDateStr = dateParam ?? format(new Date(), "yyyy-MM-dd");
      const targetDate = new Date(targetDateStr + "T00:00:00");
      const p = await getProfile();
      setProfile(p);

      const existing = await db.sessions
        .where("date")
        .equals(targetDateStr)
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
      // Pass targetDate as the seed so the workout for that day is stable
      // (won't regenerate to something different next time it's opened).
      const workout = await generateWorkout(cat, p, targetDate, initialModifiers);
      const fresh = workoutToSession(workout);
      const id = await db.sessions.add(fresh);
      setSession({ ...fresh, id });
      setLoading(false);
    })();
  }, [cat, validCat, lockedTemplateId, dateParam]);

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
      const next = mutator(prev);
      if (next.id !== undefined) db.sessions.put(next);
      return next;
    });
  };

  const discard = async () => {
    if (!session.id) return;
    if (!confirm("Discard this preview? It won't show in your history.")) return;
    await db.sessions.delete(session.id);
    router.push("/");
  };

  const finish = async () => {
    if (!session.id) return;
    const now = Date.now();
    // Stamp block name at finish time so the history calendar can group
    // consecutive days inside the same block into one continuous stripe.
    const next = {
      ...session,
      startedAt: session.startedAt ?? now,
      finishedAt: now,
      focusName: session.focusName ?? profile.currentFocus?.name,
    };
    setSession(next);
    await db.sessions.put(next);
    // Stay on the page — the rating prompt shows in place of the button
  };

  const rateAndGoHome = async (rating: SessionRating) => {
    if (!session.id) return;
    const next = { ...session, rating };
    setSession(next);
    await db.sessions.put(next);
    router.push("/");
  };

  const regenerateWithModifiers = async (modifiers: WorkoutModifiers) => {
    if (!session.id) return;
    if (session.finishedAt) {
      if (!confirm("Regenerate this workout? The completion mark will be lost.")) {
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

  // "Not today" — drop this specific exercise from THIS session only. The
  // template stays intact for future days; we just don't do it now (tender
  // joint, tired, whatever the reason).
  const skipExercise = (blockIdx: number, prescIdx: number) => {
    update((s) => {
      const blocks = [...s.blocks];
      const block = { ...blocks[blockIdx] };
      block.prescriptions = block.prescriptions.filter((_, i) => i !== prescIdx);
      // Drop blocks that end up empty so the UI doesn't render a stub.
      blocks[blockIdx] = block;
      return { ...s, blocks: blocks.filter((b) => b.prescriptions.length > 0) };
    });
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
          <Link href="/" className="text-text-dim text-sm">← Home</Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPrintExpandAll(true);
                // Give React one frame to render all blocks expanded before printing
                setTimeout(() => {
                  window.print();
                  setPrintExpandAll(false);
                }, 100);
              }}
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
            {session.finishedAt && (
              <span className="text-success font-normal normal-case tracking-normal text-xs">
                · ✓ Done
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

        {/* READINESS CHECK-IN — front and center. 3 modes, gut choice. */}
        <div className="bg-bg-card border border-border rounded-2xl p-3">
          <div className="text-[10px] uppercase tracking-widest text-text-dim font-semibold mb-2 px-1">
            How do you feel today?
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["easy", "normal", "push"] as Intensity[]).map((i) => (
              <ReadinessChip
                key={i}
                active={currentIntensity === i}
                onClick={() => setIntensity(i)}
                label={INTENSITY_LABELS[i].label}
                sublabel={INTENSITY_LABELS[i].sub}
              />
            ))}
          </div>
        </div>

        {/* Mode banner — category-aware description of what actually changed */}
        {currentIntensity !== "normal" && (
          <div className={clsx(
            "rounded-xl px-3 py-2 border text-xs",
            currentIntensity === "push"
              ? "bg-accent/10 border-accent/40 text-accent"
              : "bg-bg-card border-border text-text-muted"
          )}>
            <span className="font-bold uppercase tracking-widest">
              {INTENSITY_LABELS[currentIntensity].label} mode
            </span>
            {" — "}
            {intensityBannerText(cat, currentIntensity)}
          </div>
        )}

      </header>

      {/* PHILOSOPHY */}
      {(() => {
        // Prefer the LIVE focus block phase over the phase stamped on the
        // session (which may be stale — e.g. block duration was later
        // upgraded from 4 → 6 weeks).
        const focus = profile.currentFocus;
        const livePhase =
          focus?.startedAt && focus.durationWeeks
            ? getBlockPhase(focus.startedAt, focus.durationWeeks, new Date())
            : session.phase;
        const totalWeeks = focus?.durationWeeks ?? 4;
        return livePhase ? (
          <div className="bg-bg-card border-l-2 border-accent rounded-r-xl px-4 py-3 no-print">
            <div className="text-[10px] uppercase tracking-widest text-accent font-semibold mb-1">
              Cycle · Week {livePhase.weekInCycle} of {totalWeeks} · {livePhase.label}
            </div>
            <p className="text-sm text-text-muted leading-relaxed">{livePhase.description}</p>
          </div>
        ) : null;
      })()}

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
        {(() => {
          // Every exercise already in the workout — swap alternatives filter against this
          const usedInSession = new Set<string>();
          for (const b of session.blocks) {
            for (const p of b.prescriptions) usedInSession.add(p.exerciseId);
          }
          return session.blocks.map((block, bi) => (
            <BlockCard
              key={bi}
              block={block}
              units={profile.units}
              category={cat}
              availableEquipment={resolveEquipmentForUI(session.modifiers, profile.defaultEquipment)}
              usedInSession={usedInSession}
              forceExpanded={printExpandAll}
              onChangeCoreFocus={() => setCorePickerOpen(true)}
              onUpdate={(updated) =>
                update((s) => {
                  const blocks = [...s.blocks];
                  blocks[bi] = updated;
                  return { ...s, blocks };
                })
              }
              onSwap={(pi, newId) => swapExercise(bi, pi, newId)}
              onSkip={(pi) => skipExercise(bi, pi)}
            />
          ));
        })()}
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
          switchCategoryHref="/plan"
        />
      )}

      {corePickerOpen && (
        <CoreFocusPicker
          current={profile.coreFocus ?? "protection"}
          onPick={async (focus) => {
            setCorePickerOpen(false);
            // Session-only override — regenerate with the new core focus but
            // do NOT save to profile. Next session picks up the default again.
            regenerateWithModifiers({
              ...(session.modifiers ?? {}),
              coreFocus: focus,
            });
          }}
          onClose={() => setCorePickerOpen(false)}
        />
      )}

      {/* PRIMARY CTA — one button. Done, then rate, or discard. */}
      <div className="pt-4 no-print space-y-3">
        {session.finishedAt && !session.rating ? (
          <>
            <div className="w-full bg-success/10 border border-success/30 text-success text-center font-bold py-3 rounded-2xl">
              ✓ Marked done
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-text-dim font-semibold text-center mb-2">
                How did it feel?
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(["easy", "normal", "hard"] as SessionRating[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => rateAndGoHome(r)}
                    className="py-4 rounded-xl border border-border bg-bg-card hover:border-accent/60 hover:bg-accent/10 transition-colors text-center"
                  >
                    <div className="text-base font-bold capitalize">{r}</div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-text-dim text-center mt-2">
                Feeds next week&apos;s intensity — one tap, done.
              </p>
            </div>
          </>
        ) : session.finishedAt ? (
          <>
            <div className="w-full bg-success/10 border border-success/30 text-success text-center font-bold py-4 rounded-2xl text-lg">
              ✓ Done · rated {session.rating}
            </div>
            <button
              onClick={() => router.push("/")}
              className="w-full text-text-dim text-sm py-2"
            >
              Back to home
            </button>
          </>
        ) : (
          <>
            <button
              onClick={finish}
              className="w-full bg-accent text-black font-bold py-4 rounded-2xl text-lg hover:bg-accent-dim transition-colors"
            >
              I did this ✓
            </button>
            <button
              onClick={discard}
              className="w-full text-text-dim text-sm py-2"
            >
              Discard — I didn't do it
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ReadinessChip({
  active,
  onClick,
  label,
  sublabel,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sublabel: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "px-1.5 py-3 rounded-xl border transition-all text-center",
        active
          ? "bg-accent text-black border-accent"
          : "bg-bg border-border text-text-muted hover:border-border/60"
      )}
    >
      <div className="text-sm font-bold">{label}</div>
      <div className={clsx("text-[9px] mt-1 leading-tight uppercase tracking-wider", active ? "opacity-70" : "text-text-dim")}>
        {sublabel}
      </div>
    </button>
  );
}

// Describe what actually changes in a category when intensity shifts.
// Purely informational text — the real math is in the generator.
function intensityBannerText(category: Category, intensity: Intensity): string {
  const CARDIO_LIKE: Category[] = ["cardio", "recovery", "stretching"];
  const push = intensity === "push";
  if (CARDIO_LIKE.includes(category)) {
    return push
      ? "durations extended +20%, chase upper end of the zone"
      : "durations shortened -25%, easier pace";
  }
  if (category === "hyrox" || category === "crossfit" || category === "burn" || category === "athlete") {
    return push
      ? "loads +8%, intervals extended, +1 set on main lifts"
      : "loads -12%, intervals shortened, fewer sets";
  }
  if (category === "test") {
    return push
      ? "aim for a PR — full send with adequate rest"
      : "back off — retest another day if not feeling it";
  }
  // Strength / Hypertrophy / Split / Beach / Core
  return push
    ? "loads +8%, +1 set on main lifts"
    : "loads -12%, -1 set on accessories";
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
  category,
  availableEquipment,
  usedInSession,
  forceExpanded,
  onChangeCoreFocus,
  onUpdate,
  onSwap,
  onSkip,
}: {
  block: LoggedBlock;
  units: "kg" | "lb";
  category: Category;
  availableEquipment: Set<string>;
  usedInSession: Set<string>;
  forceExpanded: boolean;
  onChangeCoreFocus: () => void;
  onUpdate: (b: LoggedBlock) => void;
  onSwap: (prescIdx: number, newExerciseId: string) => void;
  onSkip: (prescIdx: number) => void;
}) {
  const isWarmup = block.title === "Warmup";
  const isCooldown = block.title === "Cooldown";
  const isCore = block.title === "Core";

  // Collapse warmup/cooldown by default; main + core open. Print force-expands all.
  const [collapsed, setCollapsed] = useState(isWarmup || isCooldown);
  const effectivelyCollapsed = collapsed && !forceExpanded;

  // Block scheme detection (only used for visible grouping label)
  // Compute the scheme header from the actual prescriptions instead of the
  // static template string — block bias / week rotation / phase change the
  // sets and reps and the old "3×12-15" summary drifts out of sync.
  const scheme = computeSchemeHeader(block);
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
            <div className="text-xs uppercase tracking-[0.18em] text-text-dim font-bold flex items-center gap-2">
              <span>{block.title}</span>
              {isCore && (
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onChangeCoreFocus();
                  }}
                  className="text-[10px] normal-case tracking-normal text-accent hover:underline no-print"
                >
                  Change
                </span>
              )}
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
          className={clsx("w-5 h-5 text-text-dim transition-transform shrink-0 ml-2 no-print", !effectivelyCollapsed && "rotate-180")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!effectivelyCollapsed && (
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
                blockMode={mode}
                position={pi}
                totalInGroup={block.prescriptions.length}
                isWarmup={isWarmup}
                isCooldown={isCooldown}
                isCore={isCore}
                category={category}
                availableEquipment={availableEquipment}
                usedInSession={usedInSession}
                onSwap={(newId) => onSwap(pi, newId)}
                onSkip={() => onSkip(pi)}
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
  blockMode,
  position,
  totalInGroup,
  isWarmup,
  isCooldown,
  category,
  availableEquipment,
  usedInSession,
  onSwap,
  onSkip,
}: {
  prescription: LoggedPrescription;
  blockMode: BlockMode;
  position: number;
  totalInGroup: number;
  isWarmup: boolean;
  isCooldown: boolean;
  isCore: boolean;
  category: Category;
  availableEquipment: Set<string>;
  usedInSession: Set<string>;
  onSwap: (newExerciseId: string) => void;
  onSkip: () => void;
}) {
  const [showSwaps, setShowSwaps] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [showBenchmarkLog, setShowBenchmarkLog] = useState(false);
  const [benchmarkValue, setBenchmarkValue] = useState("");
  const [benchmarkSaved, setBenchmarkSaved] = useState(false);

  const exercise = getExercise(prescription.exerciseId);
  // Test-category exercises may map to a benchmark for inline logging
  const benchmarkType =
    category === "test" ? EXERCISE_TO_BENCHMARK[prescription.exerciseId] : undefined;

  const saveBenchmark = async () => {
    if (!benchmarkType) return;
    const num = parseFloat(benchmarkValue);
    if (!Number.isFinite(num) || num <= 0) return;
    const today = format(new Date(), "yyyy-MM-dd");
    await db.benchmarks.add({ date: today, type: benchmarkType, value: num });
    setBenchmarkSaved(true);
    setShowBenchmarkLog(false);
    setBenchmarkValue("");
    setTimeout(() => setBenchmarkSaved(false), 3000);
  };

  const swapIds = findSwapAlternatives(
    prescription.exerciseId,
    availableEquipment as Set<never>,
    4,
    usedInSession
  );

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
        {!isWarmup && !isCooldown && (
          <div className="flex items-center gap-1 shrink-0 no-print">
            {swapIds.length > 0 && (
              <button
                onClick={() => setShowSwaps((s) => !s)}
                className="text-[10px] text-text-dim hover:text-accent px-2 py-1 rounded border border-border"
                aria-label="Swap exercise"
                title="Swap exercise"
              >
                ⇄
              </button>
            )}
            <button
              onClick={() => {
                if (confirm(`Skip ${getExercise(prescription.exerciseId).name} today?`)) {
                  onSkip();
                }
              }}
              className="text-[10px] text-text-dim hover:text-accent px-2 py-1 rounded border border-border"
              aria-label="Not today — skip this exercise"
              title="Not today"
            >
              Not today
            </button>
          </div>
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

      {/* How-to expandable for complex movements */}
      {exercise.howTo && (
        <div className="mt-2">
          <button
            onClick={() => setShowHowTo((s) => !s)}
            className="text-[11px] text-accent hover:underline"
          >
            {showHowTo ? "Hide" : "How to →"}
          </button>
          {showHowTo && (
            <p className="text-xs text-text-muted leading-relaxed mt-2 bg-bg rounded-lg border border-border p-3">
              {exercise.howTo}
            </p>
          )}
        </div>
      )}

      {/* Inline benchmark log — only for Test-category exercises with a mapping */}
      {benchmarkType && (
        <div className="mt-3 no-print">
          {benchmarkSaved ? (
            <div className="text-xs text-success bg-success/10 border border-success/30 rounded-lg px-3 py-2">
              ✓ Saved to Benchmarks
            </div>
          ) : !showBenchmarkLog ? (
            <button
              onClick={() => setShowBenchmarkLog(true)}
              className="text-[11px] text-accent border border-accent/40 rounded-lg px-3 py-1.5 hover:bg-accent/10"
            >
              Log result →
            </button>
          ) : (
            <div className="p-3 bg-bg rounded-lg border border-border space-y-2">
              <div className="text-[10px] uppercase tracking-widest text-text-dim font-semibold">
                Log to Benchmarks · {BENCHMARK_META[benchmarkType].label}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  autoFocus
                  value={benchmarkValue}
                  onChange={(e) => setBenchmarkValue(e.target.value)}
                  placeholder="Value"
                  className="flex-1 h-10 px-3 bg-bg-card border border-border rounded-lg text-center tabular-nums focus:outline-none focus:border-accent"
                />
                <span className="text-sm text-text-muted">
                  {BENCHMARK_META[benchmarkType].unit}
                </span>
                <button
                  onClick={saveBenchmark}
                  disabled={!benchmarkValue}
                  className="h-10 px-4 rounded-lg bg-accent text-black font-semibold text-sm disabled:bg-bg-card disabled:text-text-dim"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowBenchmarkLog(false);
                    setBenchmarkValue("");
                  }}
                  className="h-10 px-3 rounded-lg text-text-dim text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
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

function CoreFocusPicker({
  current,
  onPick,
  onClose,
}: {
  current: CoreFocus;
  onPick: (focus: CoreFocus) => void;
  onClose: () => void;
}) {
  useBodyScrollLock(true);
  const options: CoreFocus[] = ["off", "protection", "aesthetic", "both"];
  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg-elevated border border-border rounded-2xl p-5 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Core focus</h3>
          <button onClick={onClose} className="text-text-dim text-2xl leading-none">×</button>
        </div>
        <p className="text-sm text-text-muted mb-4">
          Auto-injects a Core block at the end of every workout (Stretching / Recovery / Cardio excluded).
        </p>
        <div className="space-y-1.5">
          {options.map((c) => (
            <button
              key={c}
              onClick={() => onPick(c)}
              className={clsx(
                "w-full text-left p-3 rounded-xl border transition-colors",
                c === current
                  ? "bg-accent/10 border-accent/40"
                  : "bg-bg-card border-border hover:border-accent/40"
              )}
            >
              <div className="font-medium">{CORE_FOCUS_LABELS[c]}</div>
            </button>
          ))}
        </div>
      </div>
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
    philosophy: w.philosophy,
    influences: w.influences,
    modifiers: w.modifiers,
    phase: w.phase,
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
