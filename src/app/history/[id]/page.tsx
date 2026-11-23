"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { format, parseISO } from "date-fns";
import clsx from "clsx";
import { db, deleteSession } from "@/lib/db";
import { getExercise } from "@/lib/data/exercises";
import { categoryColor } from "@/lib/categoryTheme";
import {
  BENCHMARK_META,
  CATEGORY_LABELS,
  EXERCISE_TO_BENCHMARK,
  type LoggedPrescription,
  type Session,
} from "@/lib/types";

// Recap page for one completed session — the "show a friend what I did"
// surface. Entered from Home (done Today card → Review), from the History
// calendar + list, or from a direct /history/[id] link. Reads data the user
// already logged; writes nothing. Sibling arrows let the user walk through
// a week without going back to the list.
export default function SessionRecapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const sessionId = Number.parseInt(id, 10);
  const session = useLiveQuery(
    async () => (Number.isNaN(sessionId) ? null : await db.sessions.get(sessionId)),
    [sessionId],
    null
  );
  // Sibling sessions — finished only, ordered by date then id. Lets the user
  // tap ‹ › to walk through the week without going back to the list.
  const siblings = useLiveQuery(
    async () => {
      const all = await db.sessions
        .orderBy("date")
        .toArray();
      return all.filter((s) => s.finishedAt).sort((a, b) => {
        if (a.date === b.date) return (a.id ?? 0) - (b.id ?? 0);
        return a.date.localeCompare(b.date);
      });
    },
    []
  );

  if (session === undefined || siblings === undefined) {
    return <RecapShell title="Loading…" />;
  }
  if (!session) {
    return (
      <RecapShell title="Not found">
        <p className="text-text-muted text-sm mt-6 leading-relaxed">
          That session doesn&apos;t exist. It may have been deleted.
        </p>
      </RecapShell>
    );
  }
  const idx = siblings.findIndex((s) => s.id === session.id);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;
  return <Recap session={session} prev={prev} next={next} />;
}

function RecapShell({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto px-5 py-6">
      <div className="flex items-center gap-3 text-[12px] tracking-normal text-text-dim mb-3 font-medium">
        <Link href="/history" className="hover:text-text">← History</Link>
      </div>
      <h1 className="text-[1.75rem] font-medium tracking-[-0.03em] text-text leading-[1]">
        {title}
      </h1>
      {children}
    </div>
  );
}

function Recap({ session, prev, next }: { session: Session; prev: Session | null; next: Session | null }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const color = categoryColor(session.category);
  const dateObj = parseISO(session.date + "T00:00:00");
  const durationMin =
    session.startedAt && session.finishedAt
      ? Math.max(1, Math.round((session.finishedAt - session.startedAt) / 60000))
      : null;
  const cleanedName = cleanWorkoutName(session.name, CATEGORY_LABELS[session.category]);

  const onDelete = async () => {
    if (session.id === undefined) return;
    await deleteSession(session.id);
    router.push("/history");
  };

  // Scroll to top whenever we swipe to a sibling. Otherwise the page keeps
  // the previous scroll position which is disorienting across different-
  // length sessions.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [session.id]);

  return (
    <div className="max-w-3xl mx-auto px-5 py-6 space-y-6">
      <div className="flex items-center gap-3 text-[12px] tracking-normal text-text-dim font-medium">
        <Link href="/history" className="hover:text-text">← History</Link>
      </div>

      <header className="space-y-3">
        <div className="flex items-center gap-2 text-[11px] tracking-normal font-medium">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: color.solid }}
            aria-hidden
          />
          <span className="text-text-dim">{CATEGORY_LABELS[session.category]}</span>
          {session.focusName && (
            <>
              <span className="text-border-strong">·</span>
              <span className="text-accent">{session.focusName}</span>
            </>
          )}
        </div>
        <h1 className="text-[2rem] font-medium tracking-[-0.03em] text-text leading-[1]">
          {cleanedName}
        </h1>
        <div className="text-sm text-text-muted">
          {format(dateObj, "EEEE, MMM d, yyyy")}
        </div>
      </header>

      {/* Stats strip — duration · rating · actualKm (cardio only). One row
          of chips, tabular-nums so they sit cleanly. */}
      <section className="flex flex-wrap gap-2">
        {durationMin !== null && (
          <StatChip label="duration" value={`${durationMin} min`} />
        )}
        {session.rating && <StatChip label="felt" value={session.rating} tone={ratingTone(session.rating)} />}
        {session.actualKm !== undefined && session.actualKm > 0 && (
          <StatChip label="distance" value={`${session.actualKm.toFixed(2)} km`} />
        )}
        {session.sportName && <StatChip label="sport" value={session.sportName} />}
      </section>

      {/* Benchmark highlight — if any exercise in this session maps to a tested
          benchmark type AND there's a benchmark logged on the same date, show
          it loud. Turns a session into a milestone. */}
      <BenchmarkHighlight session={session} />

      {session.blocks.length === 0 ? (
        <section className="border border-border-strong/40 bg-bg-elevated rounded-2xl p-5">
          <div className="text-[11px] tracking-normal text-text-dim font-medium">
            Logged retroactively
          </div>
          <p className="text-sm text-text-muted mt-2 leading-relaxed">
            You marked this day done without opening the workout. No per-exercise
            breakdown saved.
          </p>
        </section>
      ) : (
        <section className="space-y-5">
          {session.blocks.map((b, bi) => (
            <div key={bi} className="space-y-2.5">
              <h2 className="text-[11px] tracking-normal text-text-dim font-medium">
                {b.title}
              </h2>
              {b.scheme && (
                <div className="text-[11px] text-text-dim leading-relaxed">
                  {b.scheme}
                </div>
              )}
              <div className="divide-y divide-border-strong/30 border border-border-strong/40 rounded-2xl overflow-hidden bg-bg-elevated">
                {b.prescriptions.map((p, pi) => (
                  <PrescriptionRow key={pi} p={p} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Sibling navigation — ‹ previous · next › so the user can walk a week
          of sessions without going back to History. */}
      <section className="pt-2 grid grid-cols-2 gap-3">
        {prev ? (
          <Link
            href={`/history/${prev.id}`}
            className="flex flex-col items-start gap-1 border border-border-strong/40 rounded-2xl px-4 py-3 hover:border-text-dim transition-colors"
          >
            <span className="text-[11px] tracking-normal text-text-dim font-medium">
              ‹ Previous
            </span>
            <span className="text-sm text-text truncate">
              {format(parseISO(prev.date + "T00:00:00"), "EEE, MMM d")}
            </span>
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link
            href={`/history/${next.id}`}
            className="flex flex-col items-end gap-1 border border-border-strong/40 rounded-2xl px-4 py-3 hover:border-text-dim transition-colors text-right"
          >
            <span className="text-[11px] tracking-normal text-text-dim font-medium">
              Next ›
            </span>
            <span className="text-sm text-text truncate">
              {format(parseISO(next.date + "T00:00:00"), "EEE, MMM d")}
            </span>
          </Link>
        ) : (
          <div />
        )}
      </section>

      {/* Quiet admin footer — delete is the only destructive action here and
          it's deliberately small. Two-step confirm so no accidental loss. */}
      <div className="pt-6 text-center">
        {confirming ? (
          <div className="flex items-center justify-center gap-3 text-[12px] tracking-normal font-medium">
            <span className="text-danger">Delete this session?</span>
            <button
              onClick={() => setConfirming(false)}
              className="text-text-dim hover:text-text"
            >
              Cancel
            </button>
            <button
              onClick={onDelete}
              className="text-danger hover:text-danger/80"
            >
              Yes, delete
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="text-[11px] tracking-normal text-text-dim hover:text-danger font-medium"
          >
            Delete session
          </button>
        )}
      </div>
    </div>
  );
}

function StatChip({ label, value, tone }: { label: string; value: string; tone?: "easy" | "normal" | "hard" }) {
  const toneClass =
    tone === "hard"
      ? "border-danger/40 text-danger"
      : tone === "easy"
        ? "border-success/40 text-success"
        : tone === "normal"
          ? "border-accent/40 text-accent"
          : "border-border-strong/40 text-text";
  return (
    <div
      className={clsx(
        "inline-flex items-baseline gap-2 rounded-full border px-3 py-1.5",
        toneClass
      )}
    >
      <span className="text-[11px] tracking-normal text-text-dim font-medium">
        {label}
      </span>
      <span className="text-sm font-medium tabular-nums capitalize">{value}</span>
    </div>
  );
}

function ratingTone(r: string): "easy" | "normal" | "hard" | undefined {
  if (r === "easy" || r === "normal" || r === "hard") return r;
  return undefined;
}

function PrescriptionRow({ p }: { p: LoggedPrescription }) {
  const name = safeGetExerciseName(p.exerciseId);
  const summary = summarizePrescription(p);
  return (
    <div className="px-4 py-3 flex items-baseline justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm text-text font-medium truncate">{name}</div>
        {p.notes && (
          <div className="text-[11px] text-text-dim mt-0.5 leading-relaxed truncate">
            &ldquo;{p.notes}&rdquo;
          </div>
        )}
      </div>
      <div className="text-[11px] tabular-nums text-text-muted text-right shrink-0">
        {summary}
      </div>
    </div>
  );
}

// One-line summary of an exercise's actual logged work. User asked for
// summary-only (not every set), so: completed-sets count + representative
// load + top reps + duration/distance + RPE when present. Falls back to the
// prescription text if nothing was logged (retroactive, or user skipped).
function summarizePrescription(p: LoggedPrescription): string {
  const sets = p.sets ?? [];
  const done = sets.filter((s) => s.completed);
  const total = sets.length;
  if (total === 0 || done.length === 0) {
    // Nothing logged — show the prescription so the row still reads.
    return `${p.prescribedSets} × ${p.prescribedReps} · prescribed`;
  }
  const parts: string[] = [];
  // Only call out set count when it says something: multi-set exercises, or a
  // partial completion. A completed single set is noise — the data speaks.
  if (total > 1) {
    parts.push(done.length === total ? `${total} sets` : `${done.length}/${total} sets`);
  } else if (done.length < total) {
    parts.push(`${done.length}/${total} sets`);
  }

  const weights = sets.map((s) => s.weight ?? 0).filter((w) => w > 0);
  if (p.actualTopSetWeight) {
    parts.push(`${p.actualTopSetWeight} kg`);
  } else if (weights.length) {
    const top = Math.max(...weights);
    const uniform = weights.every((w) => w === top);
    parts.push(uniform ? `${top} kg` : `top ${top} kg`);
  }

  const repValues = sets.map((s) => s.reps ?? 0).filter((r) => r > 0);
  if (repValues.length) {
    const top = Math.max(...repValues);
    const uniform = repValues.length === sets.length && repValues.every((r) => r === top);
    parts.push(uniform && total > 1 ? `${top} reps` : total === 1 ? `${top} reps` : `top ${top} reps`);
  }

  const durations = sets.map((s) => s.durationSec ?? 0).filter((d) => d > 0);
  if (durations.length) {
    const sum = durations.reduce((a, b) => a + b, 0);
    parts.push(formatDuration(sum));
  }

  const distances = sets.map((s) => s.distanceM ?? 0).filter((d) => d > 0);
  if (distances.length) {
    const sum = distances.reduce((a, b) => a + b, 0);
    parts.push(sum >= 1000 ? `${(sum / 1000).toFixed(1)} km` : `${sum} m`);
  }

  const rpeValues = sets.map((s) => s.rpe ?? 0).filter((r) => r > 0);
  const rpe = p.actualRpe ?? (rpeValues.length ? Math.max(...rpeValues) : 0);
  if (rpe > 0) parts.push(`@ RPE ${rpe}`);

  return parts.join(" · ");
}

function formatDuration(totalSec: number): string {
  const s = Math.round(totalSec);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (r === 0) return `${m} min`;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function safeGetExerciseName(id: string): string {
  try {
    return getExercise(id).name;
  } catch {
    return id;
  }
}

// Template names are often prefixed with the category ("Hyrox — Time Trial").
// We already show the category chip above the title — strip the prefix so
// the h1 reads "Time Trial" not "Hyrox — Time Trial" alongside a Hyrox chip.
function cleanWorkoutName(name: string, categoryLabel: string): string {
  const lower = name.toLowerCase();
  const catLower = categoryLabel.toLowerCase();
  for (const sep of [" — ", " - ", ": "]) {
    const prefix = catLower + sep;
    if (lower.startsWith(prefix)) return name.slice(categoryLabel.length + sep.length);
  }
  return name;
}

// If any exercise in this session maps to a benchmark type AND a benchmark
// of that type was logged on the same date, surface it as a milestone card.
// The highlight includes whether it's a new best (lowest for duration, highest
// for anything else) — "NEW PB" calls out progress without needing a chart.
function BenchmarkHighlight({ session }: { session: Session }) {
  const match = useLiveQuery(async () => {
    // Find the first exercise in the session that could be a benchmark.
    const types = new Set<string>();
    for (const b of session.blocks) {
      for (const p of b.prescriptions) {
        const t = EXERCISE_TO_BENCHMARK[p.exerciseId];
        if (t) types.add(t);
      }
    }
    // Also check hyrox category — the session is a Time Trial if the name says so.
    if (session.category === "hyrox" && /time trial|realization/i.test(session.name)) {
      types.add("hyrox_time_sec");
    }
    if (types.size === 0) return null;
    // Look for a benchmark logged on the same date in any of those types.
    const sameDay = await db.benchmarks
      .where("date")
      .equals(session.date)
      .toArray();
    const b = sameDay.find((x) => types.has(x.type));
    if (!b) return null;
    // Is it a new best? Compare against prior benchmarks of this type.
    const prior = await db.benchmarks
      .where("type")
      .equals(b.type)
      .toArray();
    const meta = BENCHMARK_META[b.type];
    if (!meta) return null;
    const others = prior.filter((x) => x.id !== b.id);
    const isPB =
      others.length === 0 ||
      (meta.higherIsBetter
        ? b.value > Math.max(...others.map((o) => o.value))
        : b.value < Math.min(...others.map((o) => o.value)));
    return { benchmark: b, meta, isPB };
  }, [session.id, session.date]);

  if (!match) return null;
  const valueLabel = match.meta.format === "duration"
    ? formatDurationHMS(match.benchmark.value)
    : `${match.benchmark.value} ${match.meta.unit}`;
  return (
    <Link
      href="/benchmarks"
      className="block border border-accent/40 bg-text/[0.04] rounded-2xl p-4 space-y-1"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] tracking-normal text-accent font-medium">
          ⚡ {match.meta.label}
        </div>
        {match.isPB && (
          <div className="text-[11px] tracking-normal text-success font-medium">
            NEW PB
          </div>
        )}
      </div>
      <div className="text-2xl font-medium tracking-[-0.02em] text-text tabular-nums">
        {valueLabel}
      </div>
      <div className="text-[11px] tracking-normal text-text-dim font-medium">
        Logged to Benchmarks →
      </div>
    </Link>
  );
}

function formatDurationHMS(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(r)}`;
  return `${m}:${pad(r)}`;
}
