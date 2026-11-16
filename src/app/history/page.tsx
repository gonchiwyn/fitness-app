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
import { categoryColor } from "@/lib/categoryTheme";
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
      <div className="max-w-3xl mx-auto px-5 py-10 space-y-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-text-dim font-medium">
            Your work
          </p>
          <h1 className="font-display text-[2.5rem] font-normal tracking-tight leading-[0.95] mt-1.5 text-text">
            History
          </h1>
        </div>
        <p className="text-text-muted leading-relaxed">
          No sessions yet. Open the Home tab and log what you trained.
        </p>
      </div>
    );
  }

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
        <p className="text-[11px] uppercase tracking-[0.22em] text-text-dim font-medium">
          Your work
        </p>
        <h1 className="font-display text-[2.5rem] font-normal tracking-tight leading-[0.95] mt-1.5 text-text">
          History
        </h1>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <StatTile value={totalWorkouts} label="Workouts done" accent />
        <StatTile value={Object.keys(byCategory).length} label="Categories" />
      </section>

      <ConsistencyCalendar sessions={sessions} />

      {topCategories.length > 0 && (
        <section>
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-text-dim font-medium mb-3">
            Most trained
          </h2>
          <div className="space-y-2">
            {topCategories.map(([cat, count]) => {
              const color = categoryColor(cat as Category);
              return (
                <div
                  key={cat}
                  className="flex items-center justify-between border border-border-strong/40 bg-bg-elevated rounded-xl px-4 py-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: color.solid }}
                      aria-hidden
                    />
                    <span className="text-text font-medium text-sm">
                      {CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS]}
                    </span>
                  </div>
                  <span className="text-text-dim text-xs tabular-nums font-medium">{count}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-[11px] uppercase tracking-[0.22em] text-text-dim font-medium mb-3">
          All sessions
        </h2>
        <div className="space-y-2">
          {sessions.map((s) => {
            const color = categoryColor(s.category);
            return (
              <details
                key={s.id}
                id={s.id?.toString()}
                className="border border-border-strong/40 bg-bg-elevated rounded-xl overflow-hidden group"
              >
                <summary className="px-4 py-3 flex items-center justify-between cursor-pointer list-none">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: color.solid }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="font-medium text-text truncate">{s.name}</div>
                      <div className="text-[11px] text-text-dim mt-0.5 tracking-wide">
                        {format(parseISO(s.date), "EEE, MMM d, yyyy")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.finishedAt ? (
                      <span className="text-[10px] uppercase tracking-[0.18em] text-text-dim font-medium">Done</span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-[0.18em] text-text-dim/60 font-medium">Draft</span>
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
                <div className="border-t border-border-strong/30 p-4 space-y-3 text-sm">
                  {s.blocks.length === 0 && (
                    <p className="text-xs text-text-dim italic">
                      Logged retroactively — no session breakdown.
                    </p>
                  )}
                  {s.blocks.map((b, bi) => (
                    <div key={bi}>
                      <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1.5 font-medium">
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
                      className="text-[11px] text-text-dim hover:text-danger px-2 py-1 uppercase tracking-[0.18em] font-medium"
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

function StatTile({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className="border border-border-strong/40 bg-bg-elevated rounded-2xl p-4">
      <div
        className={clsx(
          "font-display font-normal tabular-nums leading-none tracking-tight text-5xl",
          accent ? "text-accent" : "text-text"
        )}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim mt-3 font-medium">
        {label}
      </div>
    </div>
  );
}

function ConsistencyCalendar({ sessions }: { sessions: Session[] }) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(today));

  const byDate = new Map<string, Session>();
  for (const s of sessions) {
    if (!s.finishedAt) continue;
    if (!byDate.has(s.date)) byDate.set(s.date, s);
  }

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
    if (rows.length >= 6) break;
  }

  const monthSessions = sessions.filter(
    (s) => s.finishedAt && isSameMonth(parseISO(s.date), viewMonth)
  );

  const canGoPrev = true;
  const canGoNext = viewMonth < startOfMonth(today);
  const isCurrentMonth = isSameMonth(viewMonth, today);

  return (
    <section>
      <div className="mb-3 space-y-2">
        <h2 className="text-[11px] uppercase tracking-[0.22em] text-text-dim font-medium">
          {monthSessions.length} session{monthSessions.length === 1 ? "" : "s"} this month
        </h2>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMonth((m) => addMonths(m, -1))}
              disabled={!canGoPrev}
              aria-label="Previous month"
              className="w-7 h-7 rounded-full border border-border-strong/50 text-text-muted flex items-center justify-center hover:border-text-dim disabled:opacity-30"
            >
              ‹
            </button>
            <div className="font-display text-lg font-normal tabular-nums min-w-[120px] text-center text-text">
              {format(viewMonth, "MMMM yyyy")}
            </div>
            <button
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              disabled={!canGoNext}
              aria-label="Next month"
              className="w-7 h-7 rounded-full border border-border-strong/50 text-text-muted flex items-center justify-center hover:border-text-dim disabled:opacity-30"
            >
              ›
            </button>
          </div>
          {!isCurrentMonth && (
            <button
              onClick={() => setViewMonth(startOfMonth(today))}
              className="text-[11px] uppercase tracking-[0.18em] text-accent font-medium hover:underline"
            >
              Today
            </button>
          )}
        </div>
      </div>
      <div className="border border-border-strong/40 bg-bg-elevated rounded-2xl p-3">
        <div className="grid grid-cols-7 gap-1">
          {DAY_LABELS_SHORT.map((d) => (
            <div
              key={d}
              className="text-[9px] uppercase tracking-[0.2em] text-text-dim text-center pb-1.5 font-medium"
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
              const color = session ? categoryColor(session.category) : null;
              const title = session
                ? `${session.name}${session.focusName ? ` · ${session.focusName}` : ""} · ${format(date, "EEE MMM d")}`
                : format(date, "EEE, MMM d");
              return (
                <Link
                  key={`${ri}-${di}`}
                  href={session?.id ? `/history#${session.id}` : "#"}
                  title={title}
                  className={clsx(
                    "aspect-square rounded-lg flex items-center justify-center text-[11px] tabular-nums font-medium transition-opacity border",
                    !inMonth && "opacity-25",
                    inFuture && !isToday && "opacity-20",
                    isToday && "ring-1 ring-accent",
                    !session && "pointer-events-none border-border-strong/30 text-text-dim",
                  )}
                  style={
                    session && color
                      ? {
                          background: color.soft,
                          borderColor: `color-mix(in oklab, ${color.solid} 35%, var(--border-strong))`,
                          color: color.solid,
                        }
                      : undefined
                  }
                >
                  {dayNum}
                </Link>
              );
            })
          )}
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
