"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { format, differenceInCalendarDays } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import {
  CATEGORY_LABELS,
  type Category,
} from "@/lib/types";
import {
  computeArchetype,
  computeMilestones,
  computeMuscleCoverage,
  computeStats,
  PERIOD_LABELS,
  type Period,
} from "@/lib/stats";

const PERIODS: Period[] = ["week", "month", "year", "all"];

export default function ProfilePage() {
  const [period, setPeriod] = useState<Period>("month");

  const sessions = useLiveQuery(() => db.sessions.toArray(), [], []);
  const completedBlocks = useLiveQuery(() => db.completedBlocks.toArray(), [], []);
  const profile = useLiveQuery(() => db.profile.get("me"), [], null);

  const stats = useMemo(
    () => computeStats(sessions ?? [], period),
    [sessions, period]
  );
  const archetype = useMemo(
    () => computeArchetype(sessions ?? [], period),
    [sessions, period]
  );
  const muscles = useMemo(
    () => computeMuscleCoverage(sessions ?? [], period),
    [sessions, period]
  );
  const milestones = useMemo(
    () => computeMilestones(sessions ?? [], completedBlocks ?? []),
    [sessions, completedBlocks]
  );

  const name = profile?.name && profile.name !== "Athlete" ? profile.name : "Athlete";

  return (
    <div className="max-w-3xl mx-auto px-5 py-6 space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-text-dim">You</p>
          <h1 className="text-3xl font-bold mt-1">{name}</h1>
        </div>
        <Link
          href="/settings"
          className="text-xs uppercase tracking-widest text-text-dim hover:text-accent pt-2"
        >
          Settings ›
        </Link>
      </header>

      {/* Period picker — drives every tile below */}
      <div className="grid grid-cols-4 gap-1.5 bg-bg-card border border-border rounded-xl p-1">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={clsx(
              "py-2 rounded-lg text-xs font-semibold transition-colors",
              period === p ? "bg-accent text-black" : "text-text-muted"
            )}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Athlete archetype — the 30k-foot read on how you've been training.
          Updates as your category mix shifts. */}
      <section className="bg-gradient-to-br from-accent/20 via-accent/5 to-bg-card border border-accent/40 rounded-2xl p-5">
        <div className="text-[10px] uppercase tracking-widest text-accent font-semibold">
          You train like a
        </div>
        <div className="flex items-baseline gap-3 mt-1">
          <span className="text-4xl">{archetype.icon}</span>
          <h2 className="text-3xl font-bold">{archetype.name}</h2>
        </div>
        <p className="text-sm text-text-muted mt-2 leading-relaxed">
          {archetype.tagline}
        </p>
      </section>

      {/* Hero KPI tiles — the ones you'd actually scream about.
          Workout subcopy stays period-friendly for all time ranges
          (so "in 9800d" doesn't creep in on All time). */}
      <section className="grid grid-cols-2 gap-3">
        <KpiTile
          big={stats.workouts.toString()}
          unit="workouts"
          sub={
            stats.workouts === 0
              ? "none yet"
              : period === "week" ? "this week"
              : period === "month" ? "this month"
              : period === "year" ? "this year"
              : "all time"
          }
          accent
        />
        <KpiTile big={stats.km > 0 ? stats.km.toString() : "0"} unit="km" sub={stats.km > 0 ? "on your feet" : "log a run"} />
        <KpiTile big={stats.minutes.toString()} unit="min" sub="moved" />
        <KpiTile big={stats.streakDays.toString()} unit={stats.streakDays === 1 ? "day" : "days"} sub={stats.streakDays > 0 ? "current streak" : "start today"} />
      </section>

      {/* Category breakdown — proportion of training in the period */}
      {stats.byCategory.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-text-dim font-semibold">
            Category mix
          </h2>
          <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-2">
            {stats.byCategory.slice(0, 6).map((c) => {
              const pct = Math.round((c.count / stats.workouts) * 100);
              return (
                <div key={c.category} className="space-y-1">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-text">{CATEGORY_LABELS[c.category as Category] ?? c.category}</span>
                    <span className="text-text-dim text-xs tabular-nums">
                      {c.count} · {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Muscle coverage — bar chart with top 3 highlighted + neglected called out.
          Diagnostic view; where's the training going, where are the gaps. */}
      {muscles.some((m) => m.sets > 0) && (() => {
        const trained = muscles.filter((m) => m.sets > 0);
        const neglected = muscles.filter((m) => m.sets === 0).map((m) => m.label);
        const max = Math.max(...trained.map((m) => m.sets), 1);
        return (
          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-text-dim font-semibold">
              Muscle coverage
            </h2>
            <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-2.5">
              {trained.map((m, i) => {
                const pct = Math.round((m.sets / max) * 100);
                const isTop = i < 3;
                return (
                  <div key={m.group} className="space-y-1">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className={clsx("font-medium", isTop ? "text-text" : "text-text-muted")}>
                        {m.label}
                      </span>
                      <span className="text-text-dim text-xs tabular-nums">{m.sets} sets</span>
                    </div>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className={clsx("h-full transition-all", isTop ? "bg-accent" : "bg-text-dim/40")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {neglected.length > 0 && (
                <div className="pt-2 border-t border-border/50 text-xs text-text-dim">
                  <span className="uppercase tracking-widest text-[10px] font-semibold">Neglected · </span>
                  <span>{neglected.join(" · ")}</span>
                </div>
              )}
            </div>
          </section>
        );
      })()}

      {/* Completed block badges — the gold-ring wall */}
      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-widest text-text-dim font-semibold">
          Completed blocks
        </h2>
        {completedBlocks && completedBlocks.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {completedBlocks
              .slice()
              .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))
              .map((b) => {
                const start = new Date(b.startedAt + "T00:00:00");
                const end = new Date(b.finishedAt + "T00:00:00");
                const weeks = Math.max(1, Math.round(differenceInCalendarDays(end, start) / 7));
                return (
                  <div
                    key={b.id}
                    className={clsx(
                      "border rounded-2xl p-4 space-y-1",
                      b.endedEarly
                        ? "bg-bg-card border-border"
                        : "bg-gradient-to-br from-accent/20 to-accent/5 border-accent/40"
                    )}
                  >
                    <div className="text-2xl">{b.endedEarly ? "🏁" : "🏆"}</div>
                    <div className="text-sm font-semibold">{b.name}</div>
                    <div className="text-[10px] uppercase tracking-widest text-text-dim">
                      {b.endedEarly ? `ended · ${weeks}w` : `complete · ${weeks}w`}
                    </div>
                    <div className="text-xs text-text-muted">
                      {b.sessionsLogged} sessions · {format(end, "MMM yyyy")}
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <p className="text-sm text-text-muted bg-bg-card border border-border rounded-2xl p-4">
            Finish a focus block to earn your first badge.
          </p>
        )}
      </section>

      {/* Milestones — locked/unlocked with progress bars */}
      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-widest text-text-dim font-semibold">
          Milestones
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {milestones.map((m) => {
            const unlocked = m.current >= m.target;
            const pct = Math.min(100, Math.round((m.current / m.target) * 100));
            return (
              <div
                key={m.id}
                className={clsx(
                  "border rounded-2xl p-3 space-y-1.5",
                  unlocked
                    ? "bg-gradient-to-br from-accent/20 to-accent/5 border-accent/40"
                    : "bg-bg-card border-border"
                )}
              >
                <div className="flex items-baseline gap-2">
                  <span className={clsx("text-xl", !unlocked && "opacity-40")}>{m.icon}</span>
                  <span className="text-sm font-semibold">{m.label}</span>
                </div>
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className={clsx("h-full transition-all", unlocked ? "bg-accent" : "bg-text-dim/40")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-[10px] uppercase tracking-widest text-text-dim tabular-nums">
                  {unlocked ? "unlocked" : `${m.current} / ${m.target} ${m.unit}`}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Share card — a clean summary you can screenshot and send */}
      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-widest text-text-dim font-semibold">
          Share
        </h2>
        <div className="bg-gradient-to-br from-accent/30 via-accent/10 to-bg-card border border-accent/40 rounded-2xl p-6 space-y-4 aspect-[4/5] flex flex-col">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-accent font-semibold">
              Outwork · {PERIOD_LABELS[period]}
            </div>
            <div className="text-2xl font-bold mt-1">{name}</div>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4 content-center">
            <ShareStat big={stats.workouts.toString()} label="workouts" />
            <ShareStat big={`${stats.km}`} label="km" />
            <ShareStat big={`${stats.minutes}`} label="min" />
            <ShareStat big={`${stats.streakDays}`} label="day streak" />
          </div>
          <div className="text-[10px] uppercase tracking-widest text-text-dim">
            {stats.byCategory.slice(0, 3).map((c) => CATEGORY_LABELS[c.category as Category] ?? c.category).join(" · ") || "no training logged"}
          </div>
        </div>
        <p className="text-[10px] text-text-dim">Screenshot the card above to share.</p>
      </section>
    </div>
  );
}

function KpiTile({
  big,
  unit,
  sub,
  accent,
}: {
  big: string;
  unit: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className={clsx(
      "border rounded-2xl p-4",
      accent ? "bg-accent/10 border-accent/40" : "bg-bg-card border-border"
    )}>
      <div className="flex items-baseline gap-1.5">
        <span className={clsx("text-4xl font-bold tabular-nums", accent && "text-accent")}>{big}</span>
        <span className="text-sm text-text-muted">{unit}</span>
      </div>
      <div className="text-[10px] uppercase tracking-widest text-text-dim mt-1.5">{sub}</div>
    </div>
  );
}

function ShareStat({ big, label }: { big: string; label: string }) {
  return (
    <div>
      <div className="text-3xl font-bold tabular-nums">{big}</div>
      <div className="text-[10px] uppercase tracking-widest text-text-muted mt-0.5">{label}</div>
    </div>
  );
}
