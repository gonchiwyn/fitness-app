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

// Category → chip color for the calendar cells
const CAT_COLORS: Partial<Record<Category, string>> = {
  split: "bg-accent",
  hypertrophy: "bg-accent",
  strength: "bg-accent",
  hyrox: "bg-emerald-500",
  athlete: "bg-emerald-500",
  core: "bg-fuchsia-500",
  cardio: "bg-sky-500",
  crossfit: "bg-orange-500",
  surf: "bg-cyan-500",
  burn: "bg-rose-500",
  stretching: "bg-violet-500",
  recovery: "bg-teal-500",
  beach: "bg-amber-500",
  test: "bg-white",
};

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
                  const bgClass = session && cat ? CAT_COLORS[cat] ?? "bg-accent" : "";
                  return (
                    <Link
                      key={di}
                      href={session?.id ? `/history#${session.id}` : "#"}
                      title={session ? `${session.name} · ${format(date, "EEE MMM d")}` : dateStr}
                      className={clsx(
                        "aspect-square rounded transition-opacity",
                        inFuture && "opacity-20",
                        session ? bgClass : "bg-bg border border-border",
                        !session && "pointer-events-none"
                      )}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50">
          <span className="text-[9px] text-text-dim uppercase tracking-widest">Legend</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-accent" />
            <span className="text-[9px] text-text-dim">Strength</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <span className="text-[9px] text-text-dim">Athletic</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-sky-500" />
            <span className="text-[9px] text-text-dim">Cardio</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-fuchsia-500" />
            <span className="text-[9px] text-text-dim">Core</span>
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
