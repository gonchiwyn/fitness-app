"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { getProfile, saveProfile } from "@/lib/db";
import {
  EQUIPMENT_PRESET_LABELS,
  EQUIPMENT_PRESETS,
  GOAL_LABELS,
  GOALS,
  TRACKED_LIFTS,
  type EquipmentPreset,
  type Experience,
  type Goal,
  type LiftId,
  type LiftMax,
  type Profile,
  type Sex,
  type WarmupTarget,
} from "@/lib/types";

const STEPS = [
  { id: "welcome", title: "Welcome" },
  { id: "basics", title: "About You" },
  { id: "history", title: "History & Injuries" },
  { id: "goals", title: "Goals" },
  { id: "equipment", title: "Equipment" },
  { id: "warmup", title: "Warmup Focus" },
  { id: "strength", title: "Strength Maxes" },
  { id: "running", title: "Running" },
  { id: "done", title: "Done" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    getProfile().then(setProfile);
  }, []);

  if (!profile) {
    return <div className="p-10 text-text-muted text-center">Loading…</div>;
  }

  const update = async (changes: Partial<Profile>) => {
    const next = { ...profile, ...changes };
    setProfile(next);
    await saveProfile(changes);
  };

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const finish = async () => {
    await update({ onboarded: true });
    router.push("/");
  };

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 min-h-screen flex flex-col">
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-text-dim mb-2">
          <span>Step {step + 1} / {STEPS.length}</span>
          <button
            onClick={finish}
            className="text-text-dim hover:text-text-muted"
          >
            Skip for now
          </button>
        </div>
        <div className="h-1 bg-bg-card rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1">
        {step === 0 && <WelcomeStep />}
        {step === 1 && <BasicsStep profile={profile} update={update} />}
        {step === 2 && <HistoryStep profile={profile} update={update} />}
        {step === 3 && <GoalsStep profile={profile} update={update} />}
        {step === 4 && <EquipmentStep profile={profile} update={update} />}
        {step === 5 && <WarmupStep profile={profile} update={update} />}
        {step === 6 && <StrengthStep profile={profile} update={update} />}
        {step === 7 && <RunningStep profile={profile} update={update} />}
        {step === 8 && <DoneStep />}
      </div>

      <div className="mt-8 flex gap-3 pb-8">
        {step > 0 && (
          <button
            onClick={back}
            className="flex-1 h-12 rounded-xl border border-border text-text-muted font-medium hover:border-border/60"
          >
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            onClick={next}
            className="flex-1 h-12 rounded-xl bg-accent text-white font-semibold"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={finish}
            className="flex-1 h-12 rounded-xl bg-accent text-white font-semibold"
          >
            Start Training
          </button>
        )}
      </div>
    </div>
  );
}

function WelcomeStep() {
  return (
    <div className="space-y-4">
      <div className="text-xs uppercase tracking-widest text-accent font-semibold">
        Welcome to Forge
      </div>
      <h1 className="text-3xl font-bold">Built on the work of coaches and scientists who actually know.</h1>
      <p className="text-text-muted leading-relaxed">
        We&apos;ll ask a few questions to tailor your workouts. Every answer is optional and editable later.
      </p>
      <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-3 mt-4">
        <p className="text-sm font-semibold">Recommendations are shaped by:</p>
        <ul className="text-sm text-text-muted space-y-2">
          <li>· <span className="text-text">Andy Galpin</span> — strength &amp; conditioning framework (3-5 method, velocity-based training, periodization)</li>
          <li>· <span className="text-text">Peter Attia</span> — Centenarian Decathlon, Zone 2 &amp; VO2 max protocols</li>
          <li>· <span className="text-text">Andrew Huberman</span> — weekly structure, sleep &amp; recovery integration</li>
          <li>· <span className="text-text">Rhonda Patrick</span> — endurance, HIIT &amp; resistance balance</li>
          <li>· <span className="text-text">Chris Hemsworth</span> — functional + aesthetic training</li>
        </ul>
      </div>
    </div>
  );
}

function BasicsStep({ profile, update }: { profile: Profile; update: (c: Partial<Profile>) => void }) {
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">About you</h2>
      <p className="text-text-muted text-sm">So we can tailor volume, recovery, and load.</p>

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
          <NumberField
            value={profile.age}
            onChange={(v) => update({ age: v })}
            placeholder="34"
          />
        </Field>
        <Field label={`Height (cm)`}>
          <NumberField
            value={profile.heightCm}
            onChange={(v) => update({ heightCm: v })}
            placeholder="178"
          />
        </Field>
        <Field label={`Weight (${profile.units})`}>
          <NumberField
            value={profile.weightKg}
            onChange={(v) => update({ weightKg: v })}
            placeholder="80"
          />
        </Field>
      </div>

      <Field label="Units">
        <div className="grid grid-cols-2 gap-2">
          {(["kg", "lb"] as const).map((u) => (
            <Pill
              key={u}
              active={profile.units === u}
              onClick={() => update({ units: u })}
            >
              {u.toUpperCase()}
            </Pill>
          ))}
        </div>
      </Field>

      <Field label="Sex">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { v: "male" as Sex, l: "Male" },
              { v: "female" as Sex, l: "Female" },
              { v: "other" as Sex, l: "Other" },
              { v: "prefer_not_to_say" as Sex, l: "Prefer not to say" },
            ]
          ).map((o) => (
            <Pill key={o.v} active={profile.sex === o.v} onClick={() => update({ sex: o.v })}>
              {o.l}
            </Pill>
          ))}
        </div>
      </Field>

      <Field label="Training experience">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { v: "beginner" as Experience, l: "Beginner", desc: "< 1 yr" },
              { v: "intermediate" as Experience, l: "Intermediate", desc: "1-3 yrs" },
              { v: "advanced" as Experience, l: "Advanced", desc: "3+ yrs" },
            ]
          ).map((o) => (
            <button
              key={o.v}
              onClick={() => update({ experience: o.v })}
              className={clsx(
                "rounded-xl p-3 text-sm border transition-colors",
                profile.experience === o.v
                  ? "bg-accent text-white border-accent"
                  : "bg-bg-card border-border text-text-muted"
              )}
            >
              <div className="font-semibold">{o.l}</div>
              <div className="text-[10px] mt-0.5 opacity-80">{o.desc}</div>
            </button>
          ))}
        </div>
      </Field>
    </div>
  );
}

function HistoryStep({ profile, update }: { profile: Profile; update: (c: Partial<Profile>) => void }) {
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">History & injuries</h2>
      <p className="text-text-muted text-sm">
        Free-text — write it however you want. We&apos;ll look for keywords to adjust loads, swap risky lifts, and adapt the warmup.
      </p>

      <Field label="Workout history">
        <textarea
          value={profile.workoutHistory ?? ""}
          onChange={(e) => update({ workoutHistory: e.target.value })}
          rows={5}
          placeholder="e.g. 10 yrs of recreational lifting, did a powerlifting cycle 2 years ago, recently moved to CrossFit. Surf 3x/week, run 1x/week."
          className="w-full p-4 bg-bg-card border border-border rounded-xl text-sm leading-relaxed"
        />
      </Field>

      <Field label="Injury history">
        <textarea
          value={profile.injuryHistory ?? ""}
          onChange={(e) => update({ injuryHistory: e.target.value })}
          rows={5}
          placeholder="e.g. tweaked lower back deadlifting in 2022 — fine now but cautious. Bad right shoulder under heavy overhead. Old ACL on left knee."
          className="w-full p-4 bg-bg-card border border-border rounded-xl text-sm leading-relaxed"
        />
        <p className="text-xs text-text-dim mt-2">
          Mentions of <code>knee, shoulder, lower back, elbow, hip, neck</code> will swap risky lifts for safer alternatives.
        </p>
      </Field>
    </div>
  );
}

function GoalsStep({ profile, update }: { profile: Profile; update: (c: Partial<Profile>) => void }) {
  const selected = new Set(profile.goals ?? []);
  const toggle = (g: Goal) => {
    if (selected.has(g)) selected.delete(g);
    else selected.add(g);
    update({ goals: Array.from(selected) });
  };

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">What are you training for?</h2>
      <p className="text-text-muted text-sm">Pick any that apply — we&apos;ll bias your daily picks accordingly.</p>

      <div className="space-y-2">
        {GOALS.map((g) => (
          <button
            key={g}
            onClick={() => toggle(g)}
            className={clsx(
              "w-full text-left p-4 rounded-xl border transition-colors flex items-center justify-between",
              selected.has(g) ? "bg-accent/10 border-accent/40" : "bg-bg-card border-border"
            )}
          >
            <span className="font-medium">{GOAL_LABELS[g]}</span>
            <div
              className={clsx(
                "w-5 h-5 rounded border-2 flex items-center justify-center",
                selected.has(g) ? "bg-accent border-accent" : "border-border"
              )}
            >
              {selected.has(g) && (
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-3 h-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function EquipmentStep({ profile, update }: { profile: Profile; update: (c: Partial<Profile>) => void }) {
  const presets: { id: EquipmentPreset; desc: string }[] = [
    { id: "full_gym", desc: "Racks, barbells, machines, rower, bike — the works" },
    { id: "home_gym", desc: "Dumbbells, kettlebells, band, pull-up bar, mat" },
    { id: "hotel", desc: "Dumbbells, band, mat — adapt for travel" },
    { id: "beach", desc: "Band + mat outdoors" },
    { id: "bodyweight_only", desc: "Just you and gravity" },
  ];

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">Default equipment</h2>
      <p className="text-text-muted text-sm">
        What do you usually train with? You can override this on any workout (e.g. on the road).
      </p>

      <div className="space-y-2">
        {presets.map((p) => {
          const active = (profile.defaultEquipment ?? "full_gym") === p.id;
          return (
            <button
              key={p.id}
              onClick={() => update({ defaultEquipment: p.id })}
              className={clsx(
                "w-full text-left p-4 rounded-xl border transition-colors",
                active ? "bg-accent/10 border-accent/40" : "bg-bg-card border-border"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{EQUIPMENT_PRESET_LABELS[p.id]}</div>
                  <div className="text-xs text-text-dim mt-0.5">{p.desc}</div>
                </div>
                <div
                  className={clsx(
                    "w-5 h-5 rounded-full border-2",
                    active ? "bg-accent border-accent" : "border-border"
                  )}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WarmupStep({ profile, update }: { profile: Profile; update: (c: Partial<Profile>) => void }) {
  const targets: { id: WarmupTarget; label: string; desc: string }[] = [
    { id: "lower_back", label: "Lower back", desc: "Bracing, hinging, anti-extension" },
    { id: "hip", label: "Hips", desc: "Mobility, internal/external rotation" },
    { id: "shoulder", label: "Shoulders", desc: "Scap stability, rotator cuff" },
  ];
  const selected = new Set(profile.focusAreas ?? []);
  const toggle = (t: WarmupTarget) => {
    if (selected.has(t)) selected.delete(t);
    else selected.add(t);
    update({ focusAreas: Array.from(selected) });
  };

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">Warmup focus</h2>
      <p className="text-text-muted text-sm">
        Every workout opens with mobility for these areas. Default is all three — uncheck what doesn&apos;t apply.
      </p>

      <div className="space-y-2">
        {targets.map((t) => {
          const active = selected.has(t.id);
          return (
            <button
              key={t.id}
              onClick={() => toggle(t.id)}
              className={clsx(
                "w-full text-left p-4 rounded-xl border transition-colors",
                active ? "bg-accent/10 border-accent/40" : "bg-bg-card border-border"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{t.label}</div>
                  <div className="text-xs text-text-dim mt-0.5">{t.desc}</div>
                </div>
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
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StrengthStep({ profile, update }: { profile: Profile; update: (c: Partial<Profile>) => void }) {
  const maxes = profile.maxes ?? {};
  const setMax = (id: LiftId, m: LiftMax | undefined) => {
    const next = { ...maxes };
    if (m === undefined || (!m.weight && !m.reps)) {
      delete next[id];
    } else {
      next[id] = m;
    }
    update({ maxes: next });
  };

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">Your strength numbers</h2>
      <p className="text-text-muted text-sm">
        Enter weight × reps for each lift. We&apos;ll estimate your 1RM (Epley) and prescribe weights as % of that.
        Don&apos;t know one? Leave it blank — we&apos;ll fall back to history.
      </p>

      <div className="space-y-3">
        {TRACKED_LIFTS.map(({ id, label }) => {
          const cur = maxes[id];
          return (
            <div key={id} className="bg-bg-card border border-border rounded-xl p-4">
              <div className="text-sm font-medium mb-2">{label}</div>
              <div className="flex items-center gap-2">
                <NumberField
                  value={cur?.weight}
                  onChange={(v) =>
                    setMax(id, { weight: v ?? 0, reps: cur?.reps ?? 1 })
                  }
                  placeholder={profile.units}
                  step={2.5}
                />
                <span className="text-text-dim">×</span>
                <NumberField
                  value={cur?.reps}
                  onChange={(v) =>
                    setMax(id, { weight: cur?.weight ?? 0, reps: v ?? 1 })
                  }
                  placeholder="reps"
                  step={1}
                />
                {cur?.weight && cur?.reps && (
                  <span className="ml-auto text-xs text-accent font-mono">
                    1RM ≈ {Math.round(cur.weight * (1 + cur.reps / 30) * 10) / 10}
                    {profile.units}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RunningStep({ profile, update }: { profile: Profile; update: (c: Partial<Profile>) => void }) {
  const rb = profile.runBenchmark;
  const setRb = (changes: Partial<NonNullable<Profile["runBenchmark"]>>) => {
    const next = {
      distanceKm: rb?.distanceKm ?? 0,
      timeMinutes: rb?.timeMinutes ?? 0,
      ...changes,
    };
    if (!next.distanceKm && !next.timeMinutes) {
      update({ runBenchmark: undefined });
    } else {
      update({ runBenchmark: next });
    }
  };

  const paceMinPerKm = rb && rb.distanceKm && rb.timeMinutes ? rb.timeMinutes / rb.distanceKm : null;
  const paceFmt = paceMinPerKm
    ? `${Math.floor(paceMinPerKm)}:${Math.round((paceMinPerKm - Math.floor(paceMinPerKm)) * 60).toString().padStart(2, "0")}/km`
    : null;

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">Running capacity</h2>
      <p className="text-text-muted text-sm">
        A recent solid effort — not your race PR, not your easy jog. We&apos;ll use this to set Zone 2 and VO2 max paces.
      </p>

      <Field label="Distance">
        <div className="grid grid-cols-4 gap-2">
          {[3, 5, 10, 21].map((d) => (
            <Pill key={d} active={rb?.distanceKm === d} onClick={() => setRb({ distanceKm: d })}>
              {d}k
            </Pill>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Distance (km)">
          <NumberField
            value={rb?.distanceKm}
            onChange={(v) => setRb({ distanceKm: v ?? 0 })}
            placeholder="10"
            step={0.5}
          />
        </Field>
        <Field label="Time (minutes)">
          <NumberField
            value={rb?.timeMinutes}
            onChange={(v) => setRb({ timeMinutes: v ?? 0 })}
            placeholder="50"
            step={0.5}
          />
        </Field>
      </div>

      {paceFmt && (
        <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 text-sm">
          <div className="text-accent font-semibold">Your tempo pace: {paceFmt}</div>
          <div className="text-text-muted text-xs mt-1">
            We&apos;ll use this to suggest Zone 2 and high-intensity paces in your cardio sessions.
          </div>
        </div>
      )}
    </div>
  );
}

function DoneStep() {
  return (
    <div className="space-y-5">
      <div className="text-xs uppercase tracking-widest text-accent font-semibold">
        You&apos;re set
      </div>
      <h2 className="text-3xl font-bold">Let&apos;s train.</h2>
      <p className="text-text-muted leading-relaxed">
        You can edit any of this any time from <span className="text-accent">Profile</span>.
        Pick a category and we&apos;ll build today&apos;s session.
      </p>
      <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-2">
        <p className="text-sm font-semibold">What you&apos;ll see:</p>
        <ul className="text-sm text-text-muted space-y-1.5">
          <li>· Warmup tuned to your focus areas (always first)</li>
          <li>· Core block at the end (Galpin 3-part rotation by default — change in Profile)</li>
          <li>· Load suggestions as % of your estimated 1RM</li>
          <li>· Risky lifts auto-swapped if they conflict with an injury you mentioned</li>
          <li>· Cardio paces from your running benchmark</li>
          <li>· The philosophy behind each session (Galpin, Attia, Huberman…)</li>
        </ul>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs uppercase tracking-widest text-text-dim font-semibold">
        {label}
      </label>
      {children}
    </div>
  );
}

function NumberField({
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
      className="w-full h-12 px-3 bg-bg-card border border-border rounded-xl text-center tabular-nums focus:outline-none focus:border-accent"
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
