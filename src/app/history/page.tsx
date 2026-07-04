"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import Link from "next/link";
import clsx from "clsx";
import { db, deleteSession } from "@/lib/db";
import { getExercise } from "@/lib/data/exercises";
import { CATEGORY_LABELS, DAY_LABELS_SHORT, type Category, type Session } from "@/lib/types";

export default function HistoryPage() {
  // Filter out drafts (previews that were never started)
  const sessions = useLiveQuery(
    async () => {
      const all = await db.sessions.orderBy("date").reverse().toArray();
      return all.filter((s) => s.startedAt || s.finishedAt);
    },
    []
  );

  const onDelete = async (id: number | undefined) => {
    if (id === undefined) return;
    if (!confirm("Delete this session?")) return;
    await deleteSession(id);
  };

  if (!sessions) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-10 text-text-muted text-center">
        Loading…
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="text-3xl font-bold">History</h1>
        <p className="text-text-muted mt-4">
          No sessions yet. Pick a category and start training.
        </p>
        <Link
          href="/workout"
          className="inline-block mt-6 bg-accent text-white font-semibold px-5 py-3 rounded-xl"
        >
          Browse Categories
        </Link>
      </div>
    );
  }

  // Aggregate stats
  const totalWorkouts = sessions.filter((s) => s.finishedAt).length;
  const byCategory = sessions
    .filter((s) => s.finishedAt)
    .reduce((acc, s) => {
      acc[s.category] = (acc[s.category] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="max-w-3xl mx-auto px-5 py-6 space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-text-dim">Your work</p>
        <h1 className="text-3xl font-bold mt-1">History</h1>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <div className="bg-bg-card border border-border rounded-2xl p-4">
          <div className="text-3xl font-bold text-accent">{totalWorkouts}</div>
          <div className="text-xs text-text-dim mt-1 uppercase tracking-widest">
            Workouts done
          </div>
        </div>
        <div className="bg-bg-card border border-border rounded-2xl p-4">
          <div className="text-3xl font-bold">{Object.keys(byCategory).length}</div>
          <div className="text-xs text-text-dim mt-1 uppercase tracking-widest">
            Disciplines
          </div>
        </div>
      </section>

      <ConsistencyCalendar sessions={sessions} />



      {topCategories.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-text-dim font-semibold mb-2">
            Most trained
          </h2>
          <div className="space-y-2">
            {topCategories.map(([cat, count]) => (
              <div
                key={cat}
                className="flex items-center justify-between bg-bg-card border border-border rounded-xl px-4 py-3"
              >
                <span className="font-medium">{CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS]}</span>
                <span className="text-text-muted text-sm tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xs uppercase tracking-widest text-text-dim font-semibold mb-2">
          All sessions
        </h2>
        <div className="space-y-2">
          {sessions.map((s) => {
            return (
              <details
                key={s.id}
                id={s.id?.toString()}
                className="bg-bg-card border border-border rounded-xl overflow-hidden group"
              >
                <summary className="px-4 py-3 flex items-center justify-between cursor-pointer list-none">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-text-dim mt-0.5">
                      {format(parseISO(s.date), "EEE, MMM d, yyyy")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.finishedAt ? (
                      <span className="text-xs text-success">✓ done</span>
                    ) : (
                      <span className="text-xs text-text-dim">in progress</span>
                    )}
                    <svg
                      className="w-4 h-4 text-text-dim transition-transform group-open:rotate-180"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </summary>
                <div className="border-t border-border/50 p-4 space-y-3 text-sm">
                  {s.blocks.length === 0 && (
                    <p className="text-xs text-text-dim italic">
                      Logged retroactively — no session breakdown.
                    </p>
                  )}
                  {s.blocks.map((b, bi) => (
                    <div key={bi}>
                      <div className="text-xs uppercase tracking-widest text-text-dim mb-1">
                        {b.title}
                      </div>
                      <div className="space-y-1">
                        {b.prescriptions.map((p, pi) => {
                          const ex = safeGetExercise(p.exerciseId);
                          return (
                            <div
                              key={pi}
                              className="flex items-baseline justify-between text-text-muted"
                            >
                              <span>{ex}</span>
                              <span className="text-xs tabular-nums text-text-dim">
                                {p.prescribedSets}×{p.prescribedReps}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2">
                    {!s.finishedAt ? (
                      <Link
                        href={`/workout/${s.category}`}
                        className="text-accent text-sm font-medium"
                      >
                        Open →
                      </Link>
                    ) : (
                      <span />
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        onDelete(s.id);
                      }}
                      className="text-xs text-text-dim hover:text-danger px-2 py-1"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// Mono palette: 3 shades of accent yellow rotate per contiguous block instance.
// "2 months of Hypertrophy" reads as one stripe; the next block gets a
// different shade so the transition is visible.
const BLOCK_SHADES = ["bg-accent", "bg-accent/60", "bg-accent/35"] as const;
// Categories the app treats as "light" — recovery/mobility. They still count
// as movement so we show them, but as an outline rather than filled.
const LIGHT_CATS = new Set<Category>(["recovery", "stretching"]);
// Off-plan / free sessions (no block attached) get a neutral white outline.
const NO_BLOCK_CLASS = "bg-white/20";
// Sport is always outlined in white — it's logged outside movement,
// not part of the block. Displayed identically whether a block is active or not.
const SPORT_CLASS = "border border-white bg-transparent";

function ConsistencyCalendar({ sessions }: { sessions: Session[] }) {
  // 12 weeks, ending with current week. Rows = weeks (oldest → newest), cols = Mon–Sun.
  const WEEKS = 12;
  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });

  const byDate = new Map<string, Session>();
  for (const s of sessions) {
    if (!s.finishedAt) continue;
    if (!byDate.has(s.date)) byDate.set(s.date, s);
  }

  // Walk sessions chronologically and assign a shade index to each
  // *block instance* — contiguous runs of sessions sharing the same focusName.
  // Off-plan (no focusName) sessions don't consume a shade slot; they render
  // as a neutral outline. Adjacent block instances get different shades so
  // "Hypertrophy → Cardio base" visibly steps down/across.
  const shadeByDate = new Map<string, string>();
  const chronological = [...byDate.values()].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  let currentBlockName: string | undefined;
  let shadeIdx = -1;
  for (const s of chronological) {
    if (!s.focusName) continue;
    if (s.focusName !== currentBlockName) {
      shadeIdx = (shadeIdx + 1) % BLOCK_SHADES.length;
      currentBlockName = s.focusName;
    }
    shadeByDate.set(s.date, BLOCK_SHADES[shadeIdx]);
  }

  const rows: { weekStart: Date; days: (Session | null)[] }[] = [];
  for (let w = WEEKS - 1; w >= 0; w--) {
    const weekStart = addDays(currentWeekStart, -w * 7);
    const days: (Session | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(weekStart, d);
      const key = format(date, "yyyy-MM-dd");
      days.push(byDate.get(key) ?? null);
    }
    rows.push({ weekStart, days });
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs uppercase tracking-widest text-text-dim font-semibold">
          Last {WEEKS} weeks
        </h2>
        <span className="text-[10px] text-text-dim">
          {sessions.filter((s) => s.finishedAt).length} sessions total
        </span>
      </div>
      <div className="bg-bg-card border border-border rounded-2xl p-3">
        <div className="grid grid-cols-[auto_repeat(7,1fr)] gap-1 items-center">
          <div />
          {DAY_LABELS_SHORT.map((d) => (
            <div key={d} className="text-[8px] uppercase tracking-widest text-text-dim text-center">
              {d[0]}
            </div>
          ))}
          {rows.map((row, ri) => {
            const monthLabel =
              ri === 0 || row.weekStart.getDate() <= 7 ? format(row.weekStart, "MMM") : "";
            return (
              <div key={ri} className="contents">
                <div className="text-[9px] text-text-dim tabular-nums text-right pr-1">
                  {monthLabel}
                </div>
                {row.days.map((session, di) => {
                  const date = addDays(row.weekStart, di);
                  const inFuture = date > today;
                  const dateStr = format(date, "yyyy-MM-dd");
                  const cat = session?.category;
                  const isLight = cat ? LIGHT_CATS.has(cat) : false;
                  const blockShade = shadeByDate.get(dateStr);
                  // Filled if you did something. Shade tells you which block.
                  // No block attached → neutral outline (off-plan/free session).
                  // Light (recovery/stretch) → same block shade but drawn as outline.
                  let cellClass = "bg-bg border border-border";
                  if (session) {
                    if (cat === "sport") {
                      cellClass = SPORT_CLASS;
                    } else if (blockShade) {
                      cellClass = isLight
                        ? `border ${blockShade.replace("bg-", "border-")} bg-transparent`
                        : blockShade;
                    } else {
                      cellClass = isLight
                        ? "border border-white/30 bg-transparent"
                        : NO_BLOCK_CLASS;
                    }
                  }
                  const title = session
                    ? `${session.name}${session.focusName ? ` · ${session.focusName}` : " · off-plan"} · ${format(date, "EEE MMM d")}`
                    : dateStr;
                  return (
                    <Link
                      key={di}
                      href={session?.id ? `/history#${session.id}` : "#"}
                      title={title}
                      className={clsx(
                        "aspect-square rounded transition-opacity",
                        inFuture && "opacity-20",
                        cellClass,
                        !session && "pointer-events-none"
                      )}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3 pt-3 border-t border-border/50">
          <span className="text-[9px] text-text-dim uppercase tracking-widest">Legend</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-accent" />
            <div className="w-3 h-3 rounded bg-accent/60" />
            <div className="w-3 h-3 rounded bg-accent/35" />
            <span className="text-[9px] text-text-dim ml-1">Blocks</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border border-white/30" />
            <span className="text-[9px] text-text-dim">Recovery</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={clsx("w-3 h-3 rounded", NO_BLOCK_CLASS)} />
            <span className="text-[9px] text-text-dim">Off-plan</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={clsx("w-3 h-3 rounded", SPORT_CLASS)} />
            <span className="text-[9px] text-text-dim">Sport</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function safeGetExercise(id: string): string {
  try {
    return getExercise(id).name;
  } catch {
    return id;
  }
}
