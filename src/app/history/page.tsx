"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { db, deleteSession } from "@/lib/db";
import { getExercise } from "@/lib/data/exercises";
import { CATEGORY_LABELS } from "@/lib/types";

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
            Sessions logged
          </div>
        </div>
        <div className="bg-bg-card border border-border rounded-2xl p-4">
          <div className="text-3xl font-bold">{Object.keys(byCategory).length}</div>
          <div className="text-xs text-text-dim mt-1 uppercase tracking-widest">
            Disciplines
          </div>
        </div>
      </section>

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
            const completed = s.blocks
              .flatMap((b) => b.prescriptions)
              .reduce((acc, p) => acc + p.sets.filter((set) => set.completed).length, 0);
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
                      {format(parseISO(s.date), "EEE, MMM d, yyyy")} · {completed} sets
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
                  {s.blocks.map((b, bi) => (
                    <div key={bi}>
                      <div className="text-xs uppercase tracking-widest text-text-dim mb-1">
                        {b.title}
                      </div>
                      <div className="space-y-1">
                        {b.prescriptions.map((p, pi) => {
                          const ex = safeGetExercise(p.exerciseId);
                          const done = p.sets.filter((s) => s.completed);
                          return (
                            <div
                              key={pi}
                              className="flex items-baseline justify-between text-text-muted"
                            >
                              <span>{ex}</span>
                              <span className="text-xs tabular-nums">
                                {done.length > 0
                                  ? done
                                      .map((set) =>
                                        set.weight
                                          ? `${set.weight}×${set.reps ?? "-"}`
                                          : `${set.reps ?? "-"}`
                                      )
                                      .join(" · ")
                                  : "—"}
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
                        Resume →
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

function safeGetExercise(id: string): string {
  try {
    return getExercise(id).name;
  } catch {
    return id;
  }
}
