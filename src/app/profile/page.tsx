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
  computeAttiaPillars,
  computeMilestones,
  computeMuscleCoverage,
  computeMuscleDeltas,
  computePrBoard,
  computeStats,
  PERIOD_LABELS,
  type Period,
} from "@/lib/stats";

const PERIODS: Period[] = ["week", "month", "year", "all"];
type ProfileTab = "now" | "journey";

export default function ProfilePage() {
  const [period, setPeriod] = useState<Period>("month");
  const [tab, setTab] = useState<ProfileTab>("now");

  const sessions = useLiveQuery(() => db.sessions.toArray(), [], []);
  const completedBlocks = useLiveQuery(() => db.completedBlocks.toArray(), [], []);
  const benchmarks = useLiveQuery(() => db.benchmarks.toArray(), [], []);
  const profile = useLiveQuery(() => db.profile.get("me"), [], null);

  const stats = useMemo(
    () => computeStats(sessions ?? [], period, new Date(), profile),
    [sessions, period, profile]
  );
  const archetype = useMemo(
    () => computeArchetype(sessions ?? [], period),
    [sessions, period]
  );
  const muscles = useMemo(
    () => computeMuscleCoverage(sessions ?? [], period),
    [sessions, period]
  );
  const muscleDeltas = useMemo(
    () => computeMuscleDeltas(sessions ?? [], period),
    [sessions, period]
  );
  const pillars = useMemo(
    () => computeAttiaPillars(sessions ?? [], period, profile),
    [sessions, period, profile]
  );
  const prRows = useMemo(
    () => computePrBoard(benchmarks ?? []),
    [benchmarks]
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
          <p className="text-[11px] uppercase tracking-[0.22em] text-text-dim font-medium">You</p>
          <h1 className="font-display text-[2.25rem] font-semibold tracking-tight mt-1.5 leading-[1.05] text-text">
            {name}
          </h1>
        </div>
        <Link
          href="/settings"
          className="text-[11px] uppercase tracking-[0.22em] text-text-dim hover:text-accent pt-2 font-medium"
        >
          Settings
        </Link>
      </header>

      {/* Now / Journey tabs — short-horizon metrics vs long-horizon record */}
      <div className="flex gap-6 border-b border-border-strong/40">
        {(["now", "journey"] as ProfileTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "pb-3 text-sm font-medium transition-colors relative",
              tab === t ? "text-text" : "text-text-dim hover:text-text-muted"
            )}
          >
            {t === "now" ? "Now" : "Journey"}
            {tab === t && (
              <span className="absolute left-0 right-0 bottom-0 h-px bg-accent" aria-hidden />
            )}
          </button>
        ))}
      </div>

      {/* Period picker — Now view only. Journey view shows all-time record. */}
      {tab === "now" && (
        <div className="flex gap-4 text-xs">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={clsx(
                "uppercase tracking-[0.18em] font-medium transition-colors",
                period === p ? "text-accent" : "text-text-dim hover:text-text-muted"
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      )}

      {tab === "now" && <>
      {/* Athlete archetype — the 30k-foot read on how you've been training.
          Updates as your category mix shifts. */}
      <section className="border border-border-strong/40 bg-bg-elevated rounded-2xl p-5">
        <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim font-medium">
          You train like a
        </div>
        <div className="flex items-baseline gap-3 mt-2">
          <span className="text-3xl opacity-80">{archetype.icon}</span>
          <h2 className="font-display text-[1.75rem] font-semibold tracking-tight leading-[1.05]">
            {archetype.name}
          </h2>
        </div>
        <p className="text-sm text-text-muted mt-3 leading-relaxed">
          {archetype.tagline}
        </p>
      </section>

      {/* Muscle coverage — bar chart with top 3 highlighted. Delta next to
          each is sets this period vs the equivalent previous period
          (week-vs-week, month-vs-month, etc.). */}
      {muscles.some((m) => m.sets > 0) && (() => {
        const trained = muscles.filter((m) => m.sets > 0);
        const neglected = muscles.filter((m) => m.sets === 0).map((m) => m.label);
        const max = Math.max(...trained.map((m) => m.sets), 1);
        const prevLabel =
          period === "week" ? "last wk"
          : period === "month" ? "last mo"
          : period === "year" ? "last yr"
          : "prior";
        return (
          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-text-dim font-semibold">
              Muscle coverage <span className="text-[10px] normal-case tracking-normal text-text-dim">· Δ vs {prevLabel}</span>
            </h2>
            <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-2.5">
              {trained.map((m, i) => {
                const pct = Math.round((m.sets / max) * 100);
                const isTop = i < 3;
                const delta = muscleDeltas[m.group] ?? 0;
                return (
                  <div key={m.group} className="space-y-1">
                    <div className="flex items-baseline justify-between text-sm gap-2">
                      <span className={clsx("font-medium", isTop ? "text-text" : "text-text-muted")}>
                        {m.label}
                      </span>
                      <div className="flex items-baseline gap-2 text-xs tabular-nums shrink-0">
                        {delta !== 0 && (
                          <span
                            className={clsx(
                              "font-semibold text-[10px]",
                              delta > 0 ? "text-accent" : "text-danger"
                            )}
                          >
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        )}
                        <span className="text-text-dim">{m.sets} sets</span>
                      </div>
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
        <KpiTile
          big={(stats.minutes / 60).toFixed(1)}
          unit="hrs"
          sub="trained"
        />
        <KpiTile big={stats.streakDays.toString()} unit={stats.streakDays === 1 ? "day" : "days"} sub={stats.streakDays > 0 ? "current streak" : "start today"} />
      </section>

      {/* Km split by intensity — easy / moderate / hard. Nick Bare's "no
          junk miles" lens. Only renders when there's km in the period. */}
      {stats.km > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-text-dim font-semibold">
            Km by intensity
          </h2>
          <div className="bg-bg-card border border-border rounded-2xl p-4">
            <div className="flex h-3 rounded-full overflow-hidden mb-3">
              {(["easy", "moderate", "hard"] as const).map((k) => {
                const pct = stats.km > 0 ? (stats.kmByIntensity[k] / stats.km) * 100 : 0;
                const color =
                  k === "easy" ? "bg-success/70" :
                  k === "moderate" ? "bg-accent" :
                  "bg-danger/80";
                return (
                  <div key={k} className={clsx("h-full", color)} style={{ width: `${pct}%` }} />
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <IntensityCell label="Easy (Z2)" km={stats.kmByIntensity.easy} dot="bg-success/70" />
              <IntensityCell label="Moderate" km={stats.kmByIntensity.moderate} dot="bg-accent" />
              <IntensityCell label="Hard (VO2)" km={stats.kmByIntensity.hard} dot="bg-danger/80" />
            </div>
          </div>
        </section>
      )}

      {/* Attia 4 pillars — weekly non-negotiables for longevity. Each ring
          shows current progress against the target. Target scales with period
          length so Year view asks for 52× weekly targets, etc. */}
      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-widest text-text-dim font-semibold">
          Longevity pillars · Attia
        </h2>
        <div className="grid grid-cols-4 gap-2 bg-bg-card border border-border rounded-2xl p-3">
          {pillars.map((p) => (
            <PillarRing key={p.id} pillar={p} />
          ))}
        </div>
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

      </>}

      {tab === "journey" && <>
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

      {/* Strength PRs — latest value per tracked lift + delta from the prior
          entry. Populates from the Benchmarks table (Test-day logs feed it). */}
      {prRows.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-text-dim font-semibold">
            Personal records
          </h2>
          <div className="bg-bg-card border border-border rounded-2xl divide-y divide-border">
            {prRows.map((pr) => {
              const improved =
                pr.deltaFromPrevious !== null &&
                ((pr.higherIsBetter && pr.deltaFromPrevious > 0) ||
                 (!pr.higherIsBetter && pr.deltaFromPrevious < 0));
              const regressed =
                pr.deltaFromPrevious !== null &&
                ((pr.higherIsBetter && pr.deltaFromPrevious < 0) ||
                 (!pr.higherIsBetter && pr.deltaFromPrevious > 0));
              return (
                <div key={pr.type} className="flex items-baseline justify-between px-4 py-3 gap-3">
                  <div>
                    <div className="text-sm font-medium">{pr.label}</div>
                    <div className="text-[10px] uppercase tracking-widest text-text-dim mt-0.5">
                      {format(new Date(pr.lastDate + "T00:00:00"), "MMM d, yyyy")}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 shrink-0">
                    {pr.deltaFromPrevious !== null && pr.deltaFromPrevious !== 0 && (
                      <span
                        className={clsx(
                          "text-[10px] font-semibold tabular-nums",
                          improved ? "text-accent" : regressed ? "text-danger" : "text-text-dim"
                        )}
                      >
                        {pr.deltaFromPrevious > 0 ? `+${pr.deltaFromPrevious}` : pr.deltaFromPrevious}
                      </span>
                    )}
                    <span className="text-lg font-bold tabular-nums">{pr.current}</span>
                    <span className="text-xs text-text-dim">{pr.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

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

      {/* Share card — designed for a screenshot you'd actually send.
          Hero = archetype + name. Stats laid out in bold display type.
          "Most trained" flex line at the bottom. Brand mark corner-bottom. */}
      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-widest text-text-dim font-semibold">
          Share
        </h2>
        <ShareCard
          name={name}
          period={period}
          archetype={archetype}
          stats={stats}
          topMuscle={muscles.find((m) => m.sets > 0)}
        />
        <p className="text-[10px] text-text-dim">Screenshot the card above to share.</p>
      </section>
      </>}
    </div>
  );
}

function ShareCard({
  name,
  period,
  archetype,
  stats,
  topMuscle,
}: {
  name: string;
  period: Period;
  archetype: { name: string; tagline: string; icon: string };
  stats: ReturnType<typeof import("@/lib/stats").computeStats>;
  topMuscle?: { label: string; sets: number };
}) {
  const periodWord =
    period === "week" ? "This Week"
    : period === "month" ? "This Month"
    : period === "year" ? "This Year"
    : "All Time";
  return (
    <div
      className="relative rounded-3xl overflow-hidden aspect-[4/5] p-6 text-text flex flex-col"
      style={{
        background: "radial-gradient(circle at 20% 10%, rgba(250,204,21,0.35), transparent 55%), radial-gradient(circle at 80% 90%, rgba(250,204,21,0.18), transparent 55%), linear-gradient(135deg, #1a1a1a 0%, #0b0b0b 100%)",
      }}
    >
      {/* Top corners: brand + period */}
      <div className="flex items-start justify-between text-[10px] uppercase tracking-[0.25em] font-bold">
        <span className="text-accent">Outwork</span>
        <span className="text-text-dim">{periodWord}</span>
      </div>

      {/* Hero: archetype */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="text-7xl mb-2 leading-none">{archetype.icon}</div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-text-dim font-semibold">
          {name} trains like a
        </div>
        <div className="text-4xl font-black mt-1 leading-tight">
          {archetype.name.toUpperCase()}
        </div>
      </div>

      {/* Stats row — bold display type, 4 up */}
      <div className="border-t border-text-dim/20 pt-4 mt-2 grid grid-cols-4 gap-2 text-center">
        <ShareNum big={stats.workouts.toString()} label="workouts" />
        <ShareNum big={stats.km > 0 ? Math.round(stats.km).toString() : "—"} label="km" />
        <ShareNum big={(stats.minutes / 60).toFixed(1)} label="hours" />
        <ShareNum big={stats.streakDays.toString()} label="streak" />
      </div>

      {/* Flex line — most trained muscle in the period */}
      {topMuscle && (
        <div className="mt-3 text-[11px] text-center text-text-dim uppercase tracking-widest">
          Most trained · <span className="text-text font-semibold">{topMuscle.label}</span> · {topMuscle.sets} sets
        </div>
      )}
    </div>
  );
}

function ShareNum({ big, label }: { big: string; label: string }) {
  return (
    <div>
      <div className="text-2xl font-black tabular-nums leading-none">{big}</div>
      <div className="text-[9px] uppercase tracking-widest text-text-dim mt-1">{label}</div>
    </div>
  );
}

function IntensityCell({ label, km, dot }: { label: string; km: number; dot: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span className={clsx("w-2 h-2 rounded-full", dot)} aria-hidden />
        <span className="text-[10px] uppercase tracking-widest text-text-dim">{label}</span>
      </div>
      <div className="text-lg font-bold tabular-nums mt-0.5">{km} <span className="text-xs text-text-muted font-normal">km</span></div>
    </div>
  );
}

// Circular progress ring for the Attia 4-pillar card. Pure SVG stroke-dash
// — no deps, no animation library. Yellow when at/above target, muted when
// under.
function PillarRing({ pillar }: { pillar: { id: string; label: string; current: number; target: number; unit: string } }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(1, pillar.target > 0 ? pillar.current / pillar.target : 0);
  const hit = pct >= 1;
  const dashOffset = circumference * (1 - pct);
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative">
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            className="stroke-border"
            strokeWidth="5"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            className={clsx(hit ? "stroke-accent" : "stroke-text-muted/60")}
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 32 32)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={clsx("text-xs font-bold tabular-nums", hit && "text-accent")}>
            {Math.round(pct * 100)}%
          </span>
        </div>
      </div>
      <div className="text-[10px] uppercase tracking-widest text-text-dim mt-1 font-semibold">
        {pillar.label}
      </div>
      <div className="text-[10px] text-text-muted tabular-nums">
        {pillar.current}/{pillar.target} {pillar.unit}
      </div>
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
    <div className="border border-border-strong/40 bg-bg-elevated rounded-2xl p-4">
      <div className="flex items-baseline gap-1.5">
        <span
          className={clsx(
            "font-display font-semibold tabular-nums leading-none tracking-tight",
            accent ? "text-accent" : "text-text",
            big.length >= 4 ? "text-[2.5rem]" : "text-[3rem]"
          )}
        >
          {big}
        </span>
        <span className="text-xs text-text-dim font-medium uppercase tracking-[0.15em]">{unit}</span>
      </div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim mt-3 font-medium">{sub}</div>
    </div>
  );
}

