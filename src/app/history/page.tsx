"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import Link from "next/link";
import clsx from "clsx";
import { db, deleteSession } from "@/lib/db";
import { getExercise } from "@/lib/data/exercises";
import { CATEGORY_LABELS, DAY_LABELS_SHORT, type Category, type Session, type WeeklyReview } from "@/lib/types";

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

      <WeeklyReviewsSection />

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

// Category-family coloring so the calendar tells a story at a glance:
// yellow = you lifted, blue = cardio, violet = mobility/recovery,
// white outline = sport (outside movement), pale = benchmark day.
// Kept to 4 hues so it stays quiet next to the mono palette.
const CATEGORY_COLOR: Partial<Record<Category, string>> = {
  split: "bg-accent",
  hypertrophy: "bg-accent",
  strength: "bg-accent",
  athlete: "bg-accent",
  hyrox: "bg-accent",
  crossfit: "bg-accent",
  burn: "bg-accent",
  core: "bg-accent/70",
  cardio: "bg-sky-400",
  recovery: "bg-violet-400/70",
  stretching: "bg-violet-400/70",
  test: "bg-white/60",
  sport: "bg-white",
  beach: "bg-accent",
  surf: "bg-sky-400",
};

function WeeklyReviewsSection() {
  const reviews = useLiveQuery(async () => {
    return db.weeklyReviews.orderBy("weekEndDate").reverse().limit(6).toArray();
  }, []);

  if (!reviews || reviews.length === 0) return null;

  const energyLabel = (n: number) =>
    ["Drained", "Low", "OK", "Good", "Charged"][n - 1] ?? String(n);

  return (
    <section>
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-xs uppercase tracking-widest text-text-dim font-semibold">
          Weekly reviews
        </h2>
        <span className="text-[10px] text-text-dim">{reviews.length} logged</span>
      </div>
      <div className="space-y-2">
        {reviews.map((r: WeeklyReview) => {
          const week = format(parseISO(r.weekEndDate), "MMM d");
          const summary = [
            `Energy: ${energyLabel(r.energy)}`,
            `Sleep: ${r.sleep}`,
            r.hardExerciseIds.length > 0 && `${r.hardExerciseIds.length} hard`,
            r.easyExerciseIds.length > 0 && `${r.easyExerciseIds.length} easy`,
            r.bodyFlags.length > 0 && `flags: ${r.bodyFlags.join(", ")}`,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <div
              key={r.id}
              className="bg-bg-card border border-border rounded-xl px-4 py-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-sm font-medium">
                  Week ending {week}
                  {r.focusName && (
                    <span className="text-text-dim font-normal ml-2 text-xs">
                      · {r.focusName}
                      {r.weekInBlock ? ` wk ${r.weekInBlock}` : ""}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-xs text-text-dim mt-1 leading-relaxed">
                {summary}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ConsistencyCalendar({ sessions }: { sessions: Session[] }) {
  // Single-month grid with prev/next nav. Current month by default.
  const today = new Date();
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(today));

  const byDate = new Map<string, Session>();
  for (const s of sessions) {
    if (!s.finishedAt) continue;
    if (!byDate.has(s.date)) byDate.set(s.date, s);
  }

  // Build the grid: start on the Monday of the week containing day 1,
  // continue through the Sunday of the week containing the last day.
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const rows: Date[][] = [];
  let cursor = gridStart;
  while (cursor <= monthEnd || rows.length < 5) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(addDays(cursor, d));
    }
    rows.push(week);
    cursor = addDays(cursor, 7);
    // Safety cap — a month never spans more than 6 weeks in the grid.
    if (rows.length >= 6) break;
  }

  const monthSessions = sessions.filter(
    (s) => s.finishedAt && isSameMonth(parseISO(s.date), viewMonth)
  );

  const canGoPrev = true;
  const canGoNext = viewMonth < startOfMonth(today);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs uppercase tracking-widest text-text-dim font-semibold">
          {monthSessions.length} session{monthSessions.length === 1 ? "" : "s"} this month
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMonth((m) => addMonths(m, -1))}
            disabled={!canGoPrev}
            aria-label="Previous month"
            className="w-7 h-7 rounded-lg border border-border text-text-muted flex items-center justify-center hover:border-accent/40 disabled:opacity-30"
          >
            ‹
          </button>
          <div className="text-sm font-semibold tabular-nums min-w-[110px] text-center">
            {format(viewMonth, "MMMM yyyy")}
          </div>
          <button
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            disabled={!canGoNext}
            aria-label="Next month"
            className="w-7 h-7 rounded-lg border border-border text-text-muted flex items-center justify-center hover:border-accent/40 disabled:opacity-30"
          >
            ›
          </button>
        </div>
      </div>
      <div className="bg-bg-card border border-border rounded-2xl p-3">
        <div className="grid grid-cols-7 gap-1">
          {DAY_LABELS_SHORT.map((d) => (
            <div
              key={d}
              className="text-[9px] uppercase tracking-widest text-text-dim text-center pb-1"
            >
              {d[0]}
            </div>
          ))}
          {rows.flatMap((week, ri) =>
            week.map((date, di) => {
              const inMonth = isSameMonth(date, viewMonth);
              const isToday =
                format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
              const inFuture = date > today;
              const dateStr = format(date, "yyyy-MM-dd");
              const dayNum = date.getDate();
              const session = byDate.get(dateStr);
              const cat = session?.category;
              const filled = !!(session && cat);
              const cellClass = filled
                ? CATEGORY_COLOR[cat] ?? "bg-accent"
                : "bg-bg border border-border";
              const title = session
                ? `${session.name}${session.focusName ? ` · ${session.focusName}` : ""} · ${format(date, "EEE MMM d")}`
                : format(date, "EEE, MMM d");
              return (
                <Link
                  key={`${ri}-${di}`}
                  href={session?.id ? `/history#${session.id}` : "#"}
                  title={title}
                  className={clsx(
                    "aspect-square rounded-lg flex items-center justify-center text-xs tabular-nums font-medium transition-opacity",
                    !inMonth && "opacity-25",
                    inFuture && !isToday && "opacity-20",
                    cellClass,
                    filled ? "text-black" : "text-text-dim",
                    isToday && "ring-1 ring-accent",
                    !session && "pointer-events-none"
                  )}
                >
                  {dayNum}
                </Link>
              );
            })
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3 pt-3 border-t border-border/50">
          <span className="text-[9px] text-text-dim uppercase tracking-widest">Legend</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-accent" />
            <span className="text-[9px] text-text-dim">Lift</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-sky-400" />
            <span className="text-[9px] text-text-dim">Cardio</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-violet-400/70" />
            <span className="text-[9px] text-text-dim">Mobility</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-white" />
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
