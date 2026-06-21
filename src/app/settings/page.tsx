"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { db, getProfile, saveProfile } from "@/lib/db";
import {
  CORE_FOCUS_DESCRIPTIONS,
  CORE_FOCUS_LABELS,
  EQUIPMENT_PRESET_LABELS,
  EQUIPMENT_PRESETS,
  GOAL_LABELS,
  GOALS,
  TRACKED_LIFTS,
  type CoreFocus,
  type EquipmentPreset,
  type Experience,
  type Goal,
  type LiftId,
  type Profile,
  type Sex,
  type WarmupTarget,
} from "@/lib/types";

const FOCUS_AREAS: { id: WarmupTarget; label: string; desc: string }[] = [
  { id: "lower_back", label: "Lower back", desc: "Bracing, hinging, anti-extension" },
  { id: "hip", label: "Hips", desc: "Mobility, internal/external rotation" },
  { id: "shoulder", label: "Shoulders", desc: "Scap stability, rotator cuff" },
];

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfile().then(setProfile);
  }, []);

  const update = async (changes: Partial<Profile>) => {
    if (!profile) return;
    setSaving(true);
    const next = { ...profile, ...changes };
    setProfile(next);
    await saveProfile(changes);
    setSaving(false);
  };

  const toggleFocus = (target: WarmupTarget) => {
    if (!profile) return;
    const cur = new Set(profile.focusAreas);
    if (cur.has(target)) cur.delete(target);
    else cur.add(target);
    update({ focusAreas: Array.from(cur) });
  };

  const toggleGoal = (g: Goal) => {
    if (!profile) return;
    const cur = new Set(profile.goals ?? []);
    if (cur.has(g)) cur.delete(g);
    else cur.add(g);
    update({ goals: Array.from(cur) });
  };

  const setMax = (id: LiftId, weight: number | undefined, reps: number | undefined) => {
    if (!profile) return;
    const next = { ...(profile.maxes ?? {}) };
    if (!weight && !reps) {
      delete next[id];
    } else {
      next[id] = { weight: weight ?? 0, reps: reps ?? 1 };
    }
    update({ maxes: next });
  };

  const setRunBenchmark = (changes: { distanceKm?: number; timeMinutes?: number }) => {
    if (!profile) return;
    const next = {
      distanceKm: profile.runBenchmark?.distanceKm ?? 0,
      timeMinutes: profile.runBenchmark?.timeMinutes ?? 0,
      ...changes,
    };
    if (!next.distanceKm && !next.timeMinutes) update({ runBenchmark: undefined });
    else update({ runBenchmark: next });
  };

  const wipeData = async () => {
    if (!confirm("Delete ALL workout history? This cannot be undone.")) return;
    await db.sessions.clear();
    alert("Wiped.");
  };

  const wipeProfile = async () => {
    if (!confirm("Reset your profile to defaults? Workout history will be kept.")) return;
    await db.profile.clear();
    location.reload();
  };

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-10 text-text-muted text-center">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-6 space-y-8">
      <header>
        <p className="text-xs uppercase tracking-widest text-text-dim">You</p>
        <h1 className="text-3xl font-bold mt-1">Profile</h1>
      </header>

      {!profile.onboarded && (
        <Link
          href="/onboarding"
          className="block bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30 rounded-2xl p-4"
        >
          <div className="text-xs uppercase tracking-widest text-accent font-semibold">
            Complete onboarding
          </div>
          <div className="text-sm text-text-muted mt-1">
            Get personalized load suggestions and injury-aware swaps →
          </div>
        </Link>
      )}

      <Section title="Basics">
        <Field label="Name">
          <input
            type="text"
            value={profile.name === "Athlete" ? "" : profile.name}
            onChange={(e) => update({ name: e.target.value || "Athlete" })}
            placeholder="What should we call you?"
            className="w-full h-12 px-4 bg-bg-card border border-border rounded-xl"
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Age">
            <NumField value={profile.age} onChange={(v) => update({ age: v })} placeholder="34" />
          </Field>
          <Field label="Height (cm)">
            <NumField value={profile.heightCm} onChange={(v) => update({ heightCm: v })} placeholder="178" />
          </Field>
          <Field label={`Weight (${profile.units})`}>
            <NumField value={profile.weightKg} onChange={(v) => update({ weightKg: v })} placeholder="80" />
          </Field>
        </div>

        <Field label="Units">
          <div className="grid grid-cols-2 gap-2">
            {(["kg", "lb"] as const).map((u) => (
              <Pill key={u} active={profile.units === u} onClick={() => update({ units: u })}>
                {u.toUpperCase()}
              </Pill>
            ))}
          </div>
        </Field>

        <Field label="Sex">
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: "male" as Sex, l: "Male" },
              { v: "female" as Sex, l: "Female" },
              { v: "other" as Sex, l: "Other" },
              { v: "prefer_not_to_say" as Sex, l: "Prefer not to say" },
            ].map((o) => (
              <Pill key={o.v} active={profile.sex === o.v} onClick={() => update({ sex: o.v })}>
                {o.l}
              </Pill>
            ))}
          </div>
        </Field>

        <Field label="Training experience">
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: "beginner" as Experience, l: "Beginner" },
              { v: "intermediate" as Experience, l: "Intermediate" },
              { v: "advanced" as Experience, l: "Advanced" },
            ].map((o) => (
              <Pill key={o.v} active={profile.experience === o.v} onClick={() => update({ experience: o.v })}>
                {o.l}
              </Pill>
            ))}
          </div>
        </Field>
      </Section>

      <Section title="Default equipment">
        <p className="text-sm text-text-muted -mt-2">
          Your usual setup. Workouts adapt to this; you can override per-session.
        </p>
        <div className="space-y-2">
          {EQUIPMENT_PRESETS.filter((p) => p !== "custom").map((p) => {
            const active = (profile.defaultEquipment ?? "full_gym") === p;
            return (
              <button
                key={p}
                onClick={() => update({ defaultEquipment: p as EquipmentPreset })}
                className={clsx(
                  "w-full text-left p-4 rounded-xl border transition-colors flex items-center justify-between",
                  active ? "bg-accent/10 border-accent/40" : "bg-bg-card border-border"
                )}
              >
                <span className="font-medium">{EQUIPMENT_PRESET_LABELS[p]}</span>
                <Check active={active} />
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Core focus">
        <p className="text-sm text-text-muted -mt-2">
          Auto-injects a Core block at the end of every workout (except Stretching/Recovery/Cardio).
        </p>
        <div className="space-y-2">
          {(["off", "protection", "aesthetic", "both"] as CoreFocus[]).map((c) => {
            const active = (profile.coreFocus ?? "protection") === c;
            return (
              <button
                key={c}
                onClick={() => update({ coreFocus: c })}
                className={clsx(
                  "w-full text-left p-4 rounded-xl border transition-colors",
                  active ? "bg-accent/10 border-accent/40" : "bg-bg-card border-border"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{CORE_FOCUS_LABELS[c]}</div>
                    <div className="text-xs text-text-dim mt-0.5">{CORE_FOCUS_DESCRIPTIONS[c]}</div>
                  </div>
                  <Check active={active} />
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Warmup focus">
        <p className="text-sm text-text-muted -mt-2">Always included at the start of every workout.</p>
        <div className="space-y-2">
          {FOCUS_AREAS.map((f) => {
            const active = profile.focusAreas.includes(f.id);
            return (
              <button
                key={f.id}
                onClick={() => toggleFocus(f.id)}
                className={clsx(
                  "w-full text-left p-4 rounded-xl border transition-colors",
                  active ? "bg-accent/10 border-accent/40" : "bg-bg-card border-border"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{f.label}</div>
                    <div className="text-xs text-text-dim mt-0.5">{f.desc}</div>
                  </div>
                  <Check active={active} />
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Goals">
        <p className="text-sm text-text-muted -mt-2">Biases which template variant gets picked per category.</p>
        <div className="space-y-2">
          {GOALS.map((g) => {
            const active = (profile.goals ?? []).includes(g);
            return (
              <button
                key={g}
                onClick={() => toggleGoal(g)}
                className={clsx(
                  "w-full text-left p-4 rounded-xl border flex items-center justify-between",
                  active ? "bg-accent/10 border-accent/40" : "bg-bg-card border-border"
                )}
              >
                <span className="font-medium">{GOAL_LABELS[g]}</span>
                <Check active={active} />
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Context & goals">
        <p className="text-sm text-text-muted -mt-2">
          What else is going on? Surfaces quietly on Home and (soon) feeds into smarter recommendations.
        </p>
        <Field label="Current goal / upcoming event">
          <input
            type="text"
            value={profile.currentGoal ?? ""}
            onChange={(e) => update({ currentGoal: e.target.value })}
            placeholder="e.g. Hyrox Madrid – Apr 15, or Marathon Oct 12"
            className="w-full h-12 px-4 bg-bg-card border border-border rounded-xl"
          />
        </Field>
        <Field label="Other regular commitments">
          <textarea
            value={profile.otherCommitments ?? ""}
            onChange={(e) => update({ otherCommitments: e.target.value })}
            rows={3}
            placeholder="e.g. Football Sundays, practice Tue/Thu evenings, surf 3x/week"
            className="w-full p-4 bg-bg-card border border-border rounded-xl text-sm"
          />
        </Field>
      </Section>

      <Section title="History & injuries">
        <Field label="Workout history">
          <textarea
            value={profile.workoutHistory ?? ""}
            onChange={(e) => update({ workoutHistory: e.target.value })}
            rows={4}
            placeholder="Years of training, recent focus, sports, etc."
            className="w-full p-4 bg-bg-card border border-border rounded-xl text-sm"
          />
        </Field>
        <Field label="Injury history">
          <textarea
            value={profile.injuryHistory ?? ""}
            onChange={(e) => update({ injuryHistory: e.target.value })}
            rows={4}
            placeholder="Mention knee, shoulder, lower back, etc. — we'll swap risky lifts."
            className="w-full p-4 bg-bg-card border border-border rounded-xl text-sm"
          />
        </Field>
      </Section>

      <Section title="Strength maxes">
        <p className="text-sm text-text-muted -mt-2">
          Weight × reps. We estimate 1RM (Epley) and prescribe loads as a % of that.
        </p>
        <div className="space-y-2">
          {TRACKED_LIFTS.map(({ id, label }) => {
            const cur = profile.maxes?.[id];
            const oneRm = cur?.weight && cur?.reps
              ? Math.round(cur.weight * (1 + cur.reps / 30) * 10) / 10
              : null;
            return (
              <div key={id} className="bg-bg-card border border-border rounded-xl p-4">
                <div className="text-sm font-medium mb-2 flex items-center justify-between">
                  <span>{label}</span>
                  {oneRm !== null && (
                    <span className="text-xs text-accent font-mono">
                      1RM ≈ {oneRm}{profile.units}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <NumField
                    value={cur?.weight}
                    onChange={(v) => setMax(id, v, cur?.reps)}
                    placeholder={profile.units}
                    step={2.5}
                  />
                  <span className="text-text-dim">×</span>
                  <NumField
                    value={cur?.reps}
                    onChange={(v) => setMax(id, cur?.weight, v)}
                    placeholder="reps"
                    step={1}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Running benchmark">
        <p className="text-sm text-text-muted -mt-2">
          A recent solid effort. Used to set Zone 2 and VO2 max paces.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Distance (km)">
            <NumField
              value={profile.runBenchmark?.distanceKm}
              onChange={(v) => setRunBenchmark({ distanceKm: v ?? 0 })}
              placeholder="10"
              step={0.5}
            />
          </Field>
          <Field label="Time (minutes)">
            <NumField
              value={profile.runBenchmark?.timeMinutes}
              onChange={(v) => setRunBenchmark({ timeMinutes: v ?? 0 })}
              placeholder="50"
              step={0.5}
            />
          </Field>
        </div>
      </Section>

      <Section title="Data">
        <p className="text-sm text-text-muted -mt-2">
          Everything lives on this device. No accounts, no cloud, no tracking.
        </p>
        <button
          onClick={wipeProfile}
          className="w-full h-12 rounded-xl border border-border text-text-muted font-medium"
        >
          Reset profile
        </button>
        <button
          onClick={wipeData}
          className="w-full h-12 rounded-xl border border-danger/40 text-danger font-semibold hover:bg-danger/10"
        >
          Erase all workout history
        </button>
      </Section>

      <div className="text-xs text-text-dim text-center pt-4">
        {saving ? "Saving…" : "Saved"} · v0.2
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs uppercase tracking-widest text-text-dim font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] uppercase tracking-widest text-text-dim font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

function NumField({
  value,
  onChange,
  placeholder,
  step = 0.5,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder: string;
  step?: number;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
      step={step}
      placeholder={placeholder}
      className="w-full h-12 px-3 bg-bg border border-border rounded-xl text-center tabular-nums focus:outline-none focus:border-accent"
    />
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "h-12 rounded-xl border text-sm font-medium transition-colors",
        active
          ? "bg-accent text-white border-accent"
          : "bg-bg-card border-border text-text-muted"
      )}
    >
      {children}
    </button>
  );
}

function Check({ active }: { active: boolean }) {
  return (
    <div
      className={clsx(
        "w-5 h-5 rounded border-2 flex items-center justify-center",
        active ? "bg-accent border-accent" : "border-border"
      )}
    >
      {active && (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-3 h-3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  );
}
