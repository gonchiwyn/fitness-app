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
  type BenchmarkMeta,
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
    { name: "Hybrid", types: BENCHMARK_TYPES.filter((t) => BENCHMARK_META[t].group === "hybrid") },
    { name: "Strength", types: BENCHMARK_TYPES.filter((t) => BENCHMARK_META[t].group === "strength") },
    { name: "Power", types: BENCHMARK_TYPES.filter((t) => BENCHMARK_META[t].group === "power") },
    { name: "Endurance", types: BENCHMARK_TYPES.filter((t) => BENCHMARK_META[t].group === "endurance") },
  ].filter((g) => g.types.length > 0);

  return (
    <div className="max-w-3xl mx-auto px-5 py-6 space-y-6">
      <header>
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-text-dim mb-3 font-medium">
          <Link href="/settings" className="hover:text-text">← Profile</Link>
        </div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-text-dim font-medium">
          Retest to know
        </p>
        <h1 className="text-[2.125rem] font-medium tracking-[-0.03em] leading-[1] mt-1.5 text-text">
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
                          <div className="text-2xl font-medium tracking-[-0.02em] text-text tabular-nums leading-none">
                            {formatBenchmarkValue(info.best.value, meta)}
                            {meta.format !== "duration" && (
                              <span className="text-[10px] uppercase tracking-[0.18em] text-text-dim ml-1.5 font-medium">
                                {meta.unit}
                              </span>
                            )}
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
                      Latest: {formatBenchmarkValue(info.latest.value, meta)}{meta.format !== "duration" ? meta.unit : ""} on {format(parseISO(info.latest.date), "MMM d")}
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

  const parsed = parseBenchmarkInput(value, meta);
  const canSave = parsed !== null && parsed > 0 && !saving;

  const save = async () => {
    if (parsed === null || parsed <= 0) return;
    setSaving(true);
    const today = format(new Date(), "yyyy-MM-dd");
    await db.benchmarks.add({
      date: today,
      type,
      value: parsed,
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
            <h3 className="text-xl font-medium tracking-[-0.02em] tracking-tight text-text mt-1">
              {meta.label}
            </h3>
          </div>
          <button onClick={onClose} className="text-text-dim text-2xl leading-none hover:text-text" aria-label="Close">×</button>
        </div>
        <p className="text-sm text-text-muted mb-5 leading-relaxed">{meta.description}</p>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type={meta.format === "duration" ? "text" : "number"}
              inputMode={meta.format === "duration" ? "numeric" : "decimal"}
              step={meta.format === "duration" ? undefined : "0.5"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={meta.format === "duration" ? "mm:ss  or  h:mm:ss" : "Value"}
              autoFocus
              className="flex-1 h-12 px-4 bg-transparent border border-border-strong/40 rounded-full text-center text-base tabular-nums focus:outline-none focus:border-accent/60 placeholder:text-text-dim"
            />
            {meta.format !== "duration" && (
              <span className="text-[11px] uppercase tracking-[0.18em] text-text-dim font-medium">
                {meta.unit}
              </span>
            )}
          </div>
          {meta.format === "duration" && parsed !== null && parsed > 0 && (
            <div className="text-center text-[11px] uppercase tracking-[0.18em] text-text-dim font-medium tabular-nums">
              = {formatDuration(parsed)}
            </div>
          )}

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional) — how it felt, conditions, etc."
            rows={2}
            className="w-full p-3.5 bg-transparent border border-border-strong/40 rounded-xl text-sm leading-relaxed focus:outline-none focus:border-accent/60 placeholder:text-text-dim"
          />

          <button
            onClick={save}
            disabled={!canSave}
            className={clsx(
              "w-full h-12 rounded-full font-semibold text-sm transition-colors",
              canSave
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

// Display a stored benchmark value. Duration types are stored as seconds and
// shown as mm:ss (or h:mm:ss over an hour). Everything else is a plain number.
function formatBenchmarkValue(value: number, meta: BenchmarkMeta): string {
  if (meta.format === "duration") return formatDuration(value);
  return String(value);
}

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${m}:${pad(sec)}`;
}

// Parse input for a benchmark. Duration types accept "mm:ss", "h:mm:ss", or a
// bare integer (interpreted as seconds). Everything else parses as a number.
// Returns null if the input is unparseable or malformed.
function parseBenchmarkInput(raw: string, meta: BenchmarkMeta): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (meta.format === "duration") {
    if (trimmed.includes(":")) {
      const parts = trimmed.split(":").map((p) => p.trim());
      if (parts.length < 2 || parts.length > 3) return null;
      if (!parts.every((p) => /^\d+$/.test(p))) return null;
      const nums = parts.map(Number);
      if (parts.length === 2) {
        const [m, s] = nums;
        if (s >= 60) return null;
        return m * 60 + s;
      }
      const [h, m, s] = nums;
      if (m >= 60 || s >= 60) return null;
      return h * 3600 + m * 60 + s;
    }
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  const n = parseFloat(trimmed);
  return Number.isNaN(n) ? null : n;
}
