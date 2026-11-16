"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { format, parseISO } from "date-fns";
import clsx from "clsx";
import { db } from "@/lib/db";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
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
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-text-dim mb-3 font-medium">
          <Link href="/settings" className="hover:text-text">← Profile</Link>
        </div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-text-dim font-medium">
          Retest to know
        </p>
        <h1 className="font-display text-[2.25rem] font-semibold tracking-tight leading-[1.05] mt-1.5 text-text">
          Benchmarks
        </h1>
        <p className="text-text-muted text-sm mt-3 leading-relaxed">
          Track the tests that matter over time. Retest every 6-8 weeks. Without measurement, you&apos;re guessing.
        </p>
      </header>

      {groups.map((g) => (
        <section key={g.name} className="space-y-3">
          <h2 className="text-[10px] uppercase tracking-[0.22em] text-text-dim font-medium">
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
                  className="w-full text-left bg-bg-elevated border border-border-strong/40 rounded-2xl p-4 hover:border-text-dim transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text">{meta.label}</div>
                      <div className="text-xs text-text-dim mt-1 leading-relaxed">
                        {meta.description}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {info ? (
                        <>
                          <div className="font-display text-2xl font-semibold text-text tabular-nums leading-none">
                            {info.best.value}
                            <span className="text-[10px] uppercase tracking-[0.18em] text-text-dim ml-1.5 font-medium">
                              {meta.unit}
                            </span>
                          </div>
                          <div className="text-[10px] uppercase tracking-[0.18em] text-text-dim mt-1.5 font-medium">
                            best · {format(parseISO(info.best.date), "MMM d")}
                          </div>
                        </>
                      ) : (
                        <span className="text-[10px] uppercase tracking-[0.18em] text-text-dim font-medium">
                          not tested
                        </span>
                      )}
                    </div>
                  </div>
                  {info && info.count > 1 && (
                    <div className="text-[10px] text-text-dim mt-3 pt-3 border-t border-border-strong/30 leading-relaxed">
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
  useBodyScrollLock(true);
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
        className="bg-bg-elevated border border-border-strong/50 rounded-2xl p-5 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim font-medium">
              New benchmark
            </div>
            <h3 className="font-display text-xl font-semibold tracking-tight text-text mt-1">
              {meta.label}
            </h3>
          </div>
          <button onClick={onClose} className="text-text-dim text-2xl leading-none hover:text-text" aria-label="Close">×</button>
        </div>
        <p className="text-sm text-text-muted mb-5 leading-relaxed">{meta.description}</p>

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
              className="flex-1 h-12 px-4 bg-transparent border border-border-strong/40 rounded-full text-center text-base tabular-nums focus:outline-none focus:border-accent/60 placeholder:text-text-dim"
            />
            <span className="text-[11px] uppercase tracking-[0.18em] text-text-dim font-medium">
              {meta.unit}
            </span>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional) — how it felt, conditions, etc."
            rows={2}
            className="w-full p-3.5 bg-transparent border border-border-strong/40 rounded-xl text-sm leading-relaxed focus:outline-none focus:border-accent/60 placeholder:text-text-dim"
          />

          <button
            onClick={save}
            disabled={!value || saving}
            className={clsx(
              "w-full h-12 rounded-full font-semibold text-sm transition-colors",
              value && !saving
                ? "bg-accent text-bg hover:bg-accent-dim"
                : "bg-transparent border border-border-strong/40 text-text-dim"
            )}
          >
            Save benchmark
          </button>
        </div>
      </div>
    </div>
  );
}
