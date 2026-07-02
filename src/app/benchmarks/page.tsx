"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { format, parseISO } from "date-fns";
import clsx from "clsx";
import { db } from "@/lib/db";
import {
  BENCHMARK_META,
  BENCHMARK_TYPES,
  type Benchmark,
  type BenchmarkType,
} from "@/lib/types";

export default function BenchmarksPage() {
  const [logType, setLogType] = useState<BenchmarkType | null>(null);

  const all = useLiveQuery(async () => {
    return db.benchmarks.orderBy("date").reverse().toArray();
  }, []);

  // Compute best + latest per type
  const byType = new Map<BenchmarkType, { best: Benchmark; latest: Benchmark; count: number; history: Benchmark[] }>();
  for (const b of all ?? []) {
    const meta = BENCHMARK_META[b.type];
    if (!meta) continue;
    const existing = byType.get(b.type);
    if (!existing) {
      byType.set(b.type, { best: b, latest: b, count: 1, history: [b] });
    } else {
      existing.count += 1;
      existing.history.push(b);
      const isBetter = meta.higherIsBetter ? b.value > existing.best.value : b.value < existing.best.value;
      if (isBetter) existing.best = b;
      if (b.date > existing.latest.date) existing.latest = b;
    }
  }

  const groups: { name: string; types: BenchmarkType[] }[] = [
    { name: "Strength", types: BENCHMARK_TYPES.filter((t) => BENCHMARK_META[t].group === "strength") },
    { name: "Power", types: BENCHMARK_TYPES.filter((t) => BENCHMARK_META[t].group === "power") },
    { name: "Endurance", types: BENCHMARK_TYPES.filter((t) => BENCHMARK_META[t].group === "endurance") },
  ];

  return (
    <div className="max-w-3xl mx-auto px-5 py-6 space-y-6">
      <header>
        <div className="flex items-center gap-3 text-sm text-text-dim mb-2">
          <Link href="/settings" className="hover:text-text-muted">← Profile</Link>
        </div>
        <p className="text-xs uppercase tracking-widest text-text-dim">Retest to know</p>
        <h1 className="text-3xl font-bold mt-1">Benchmarks</h1>
        <p className="text-text-muted text-sm mt-2 leading-relaxed">
          Track the tests that matter over time. Retest every 6-8 weeks. Without measurement, you&apos;re guessing.
        </p>
      </header>

      {groups.map((g) => (
        <section key={g.name} className="space-y-2">
          <h2 className="text-xs uppercase tracking-widest text-text-dim font-semibold">
            {g.name}
          </h2>
          <div className="space-y-2">
            {g.types.map((t) => {
              const meta = BENCHMARK_META[t];
              const info = byType.get(t);
              return (
                <button
                  key={t}
                  onClick={() => setLogType(t)}
                  className="w-full text-left bg-bg-card border border-border rounded-2xl p-4 hover:border-accent/40 transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{meta.label}</div>
                      <div className="text-xs text-text-dim mt-0.5 leading-snug">
                        {meta.description}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {info ? (
                        <>
                          <div className="text-xl font-bold text-accent tabular-nums">
                            {info.best.value}
                            <span className="text-xs text-text-dim ml-1 font-normal">{meta.unit}</span>
                          </div>
                          <div className="text-[10px] text-text-dim mt-0.5">
                            best · {format(parseISO(info.best.date), "MMM d")}
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-text-dim">not tested</span>
                      )}
                    </div>
                  </div>
                  {info && info.count > 1 && (
                    <div className="text-[10px] text-text-dim mt-2 pt-2 border-t border-border/50">
                      Latest: {info.latest.value}{meta.unit} on {format(parseISO(info.latest.date), "MMM d")}
                      {info.count > 2 && ` · ${info.count} tests logged`}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {logType && (
        <LogModal
          type={logType}
          onClose={() => setLogType(null)}
          onLogged={() => setLogType(null)}
        />
      )}
    </div>
  );
}

function LogModal({
  type,
  onClose,
  onLogged,
}: {
  type: BenchmarkType;
  onClose: () => void;
  onLogged: () => void;
}) {
  const meta = BENCHMARK_META[type];
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const num = parseFloat(value);
    if (Number.isNaN(num) || num <= 0) return;
    setSaving(true);
    const today = format(new Date(), "yyyy-MM-dd");
    await db.benchmarks.add({
      date: today,
      type,
      value: num,
      notes: notes.trim() || undefined,
    });
    setSaving(false);
    onLogged();
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg-elevated border border-border rounded-2xl p-5 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold">Log {meta.label}</h3>
          <button onClick={onClose} className="text-text-dim text-2xl leading-none">×</button>
        </div>
        <p className="text-sm text-text-muted mb-4">{meta.description}</p>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Value"
              autoFocus
              className="flex-1 h-12 px-4 bg-bg-card border border-border rounded-xl text-center text-lg tabular-nums focus:outline-none focus:border-accent"
            />
            <span className="text-text-muted text-sm">{meta.unit}</span>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional) — how it felt, conditions, etc."
            rows={2}
            className="w-full p-3 bg-bg-card border border-border rounded-xl text-sm"
          />

          <button
            onClick={save}
            disabled={!value || saving}
            className={clsx(
              "w-full h-12 rounded-xl font-bold transition-colors",
              value && !saving
                ? "bg-accent text-black hover:bg-accent-dim"
                : "bg-bg-card text-text-dim"
            )}
          >
            Save benchmark
          </button>
        </div>
      </div>
    </div>
  );
}
