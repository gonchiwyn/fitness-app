"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { getProfile, saveProfile } from "@/lib/db";
import {
  EQUIPMENT_PRESET_LABELS,
  EQUIPMENT_PRESETS,
  GOAL_BLURBS,
  GOAL_LABELS,
  GOALS,
  TRACKED_LIFTS,
  type EquipmentPreset,
  type Experience,
  type Goal,
  type LiftId,
  type LiftMax,
  type Profile,
  type RehabZone,
} from "@/lib/types";

// Every step must produce input that measurably changes what the generator
// returns. If you can't name the specific generator rule it feeds, remove it.
const STEPS = [
  { id: "welcome", title: "Welcome" },
  { id: "experience", title: "Experience" },     // → hides advanced lifts, picks template complexity
  { id: "goals", title: "Goals" },               // → pickTemplate() scoring bias
  { id: "equipment", title: "Equipment" },       // → filters exercises
  { id: "history", title: "Injuries" },          // → activeConcerns + chronicLumbarCare → injury swaps + lumbar caps
  { id: "strength", title: "Strength Maxes" },   // → load hints as % of 1RM
  { id: "running", title: "Running" },           // → cardio paces
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
    // End of wizard: steer the user to pick their first block right away
    // instead of landing on Home with a half-informed Quick Start.
    router.push("/plan?pick=1");
  };

  // Skip for now: go straight home, don't open the block picker.
  const skip = async () => {
    await update({ onboarded: true });
    router.push("/");
  };

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 min-h-screen flex flex-col">
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-text-dim mb-2">
          <span>Step {step + 1} / {STEPS.length}</span>
          <button
            onClick={skip}
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
        {step === 1 && <ExperienceStep profile={profile} update={update} />}
        {step === 2 && <GoalsStep profile={profile} update={update} />}
        {step === 3 && <EquipmentStep profile={profile} update={update} />}
        {step === 4 && <HistoryStep profile={profile} update={update} />}
        {step === 5 && <StrengthStep profile={profile} update={update} />}
        {step === 6 && <RunningStep profile={profile} update={update} />}
        {step === 7 && <DoneStep />}
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
            Pick my first block →
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
        Welcome to Outwork
      </div>
      <h1 className="text-3xl font-bold">Workouts that adapt to you.</h1>
      <p className="text-text-muted leading-relaxed">
        Tell us a few things about your body, goals, and gym — we&apos;ll build a weekly program around that. Every answer is optional and editable later.
      </p>
      <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-2">
        <p className="text-sm font-semibold">You&apos;ll get:</p>
        <ul className="text-sm text-text-muted space-y-1.5">
          <li>· A multi-week training <span className="text-text">block</span> with a clear goal</li>
          <li>· Warmups + loads tuned to your injuries and strength</li>
          <li>· Safer swaps when something isn&apos;t right for you</li>
          <li>· A reading of each session&apos;s intent, not just a list of exercises</li>
        </ul>
      </div>
      <p className="text-[11px] text-text-dim leading-relaxed pt-1">
        Built on the work of Galpin, Attia, Huberman, Rhonda Patrick and Chris Hemsworth&apos;s team.
      </p>
    </div>
  );
}

function ExperienceStep({ profile, update }: { profile: Profile; update: (c: Partial<Profile>) => void }) {
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">How much have you trained?</h2>
      <p className="text-text-muted text-sm">
        Beginners get simpler lifts and lighter starting loads. Advanced gets the full exercise library.
      </p>

      <div className="space-y-2">
        {([
          { v: "beginner" as Experience, l: "Beginner", desc: "New to the gym or less than 1 year of consistent training." },
          { v: "intermediate" as Experience, l: "Intermediate", desc: "1-3 years. Comfortable with the main lifts." },
          { v: "advanced" as Experience, l: "Advanced", desc: "3+ years. You know what RPE 8 feels like." },
        ]).map((o) => {
          const active = profile.experience === o.v;
          return (
            <button
              key={o.v}
              onClick={() => update({ experience: o.v })}
              className={clsx(
                "w-full text-left p-4 rounded-xl border transition-colors",
                active ? "bg-accent/10 border-accent/40" : "bg-bg-card border-border"
              )}
            >
              <div className="font-semibold">{o.l}</div>
              <div className="text-xs text-text-dim mt-0.5">{o.desc}</div>
            </button>
          );
        })}
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
    </div>
  );
}

function HistoryStep({ profile, update }: { profile: Profile; update: (c: Partial<Profile>) => void }) {
  const zones: { id: RehabZone; label: string }[] = [
    { id: "lower_back", label: "Lower back" },
    { id: "shoulder", label: "Shoulder" },
    { id: "knee", label: "Knee" },
    { id: "hip", label: "Hip" },
    { id: "elbow", label: "Elbow" },
    { id: "neck", label: "Neck" },
  ];
  const active = new Set(profile.activeConcerns ?? []);
  const toggle = (z: RehabZone) => {
    if (active.has(z)) active.delete(z);
    else active.add(z);
    update({ activeConcerns: Array.from(active) });
  };

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">Anything bothering you?</h2>
      <p className="text-text-muted text-sm">
        Tap any area that&apos;s currently nagging — we&apos;ll swap risky lifts for safer alternatives. Leave empty if you&apos;re all good.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {zones.map((z) => {
          const on = active.has(z.id);
          return (
            <button
              key={z.id}
              onClick={() => toggle(z.id)}
              className={clsx(
                "p-4 rounded-xl border text-left transition-colors",
                on ? "bg-accent/10 border-accent/40" : "bg-bg-card border-border"
              )}
            >
              <div className="font-medium">{z.label}</div>
            </button>
          );
        })}
      </div>

      <Field label="Lower-back history">
        <button
          onClick={() => update({ chronicLumbarCare: !profile.chronicLumbarCare })}
          className={clsx(
            "w-full text-left p-4 rounded-xl border transition-colors flex items-center justify-between",
            profile.chronicLumbarCare ? "bg-accent/10 border-accent/40" : "bg-bg-card border-border"
          )}
        >
          <div>
            <div className="font-medium">I have a history of lower-back issues</div>
            <div className="text-xs text-text-dim mt-0.5">Caps intensity on risky patterns, always primes glutes + core in warmup.</div>
          </div>
          <div
            className={clsx(
              "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0",
              profile.chronicLumbarCare ? "bg-accent border-accent" : "border-border"
            )}
          >
            {profile.chronicLumbarCare && (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </button>
      </Field>

      <Field label="Extra context (optional)">
        <textarea
          value={profile.injuryHistory ?? ""}
          onChange={(e) => update({ injuryHistory: e.target.value })}
          rows={3}
          placeholder="e.g. tweaked lower back deadlifting in 2022, old ACL on left knee…"
          className="w-full p-4 bg-bg-card border border-border rounded-xl text-sm leading-relaxed"
        />
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
              "w-full text-left p-4 rounded-xl border transition-colors flex items-start justify-between gap-3",
              selected.has(g) ? "bg-accent/10 border-accent/40" : "bg-bg-card border-border"
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium">{GOAL_LABELS[g]}</div>
              <div className="text-xs text-text-dim mt-0.5">{GOAL_BLURBS[g]}</div>
            </div>
            <div
              className={clsx(
                "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5",
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

function StrengthStep({ profile, update }: { profile: Profile; update: (c: Partial<Profile>) => void }) {
  const maxes = profile.maxes ?? {};
  const isBeginner = profile.experience === "beginner";
  // Hide loaded body-weight lifts for beginners — most can't do a weighted
  // pull-up or dip at all, so the field is just a dead end.
  const BEGINNER_HIDDEN = new Set<LiftId>(["weighted_pullup", "weighted_dip"]);
  const visibleLifts = TRACKED_LIFTS.filter(({ id }) => !isBeginner || !BEGINNER_HIDDEN.has(id));

  const setMax = (id: LiftId, m: LiftMax | undefined) => {
    const next = { ...maxes };
    if (m === undefined || (!m.weight && !m.reps)) {
      delete next[id];
    } else {
      next[id] = m;
    }
    update({ maxes: next });
  };

  const skipAll = () => {
    update({ maxes: {} });
  };
  const hasAnyMax = Object.keys(maxes).length > 0;

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">Your strength numbers</h2>
      <p className="text-text-muted text-sm">
        For each lift, enter a weight you&apos;ve lifted recently and how many reps you did. We&apos;ll use it to pick safe starting loads.
        {" "}Any lift you don&apos;t know, leave blank.
      </p>

      <button
        onClick={skipAll}
        className={clsx(
          "w-full p-3 rounded-xl border text-sm transition-colors",
          !hasAnyMax ? "bg-accent/10 border-accent/40 text-text" : "bg-bg-card border-border text-text-muted"
        )}
      >
        I&apos;m new to lifting — use conservative starting loads
      </button>

      <div className="space-y-3">
        {visibleLifts.map(({ id, label }) => {
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
        A recent solid effort — fastest pace you could hold without stopping. We&apos;ll use it to set your easy-cardio and interval paces.
      </p>

      <button
        onClick={() => update({ runBenchmark: undefined })}
        className={clsx(
          "w-full p-3 rounded-xl border text-sm transition-colors",
          !rb ? "bg-accent/10 border-accent/40 text-text" : "bg-bg-card border-border text-text-muted"
        )}
      >
        I don&apos;t run — skip this
      </button>

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
            We&apos;ll use this to suggest easy and hard paces in your cardio sessions.
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
      <h2 className="text-3xl font-bold">Last thing: pick your first block.</h2>
      <p className="text-text-muted leading-relaxed">
        A <span className="text-text font-semibold">block</span> is your training program for the next few weeks — the whole app adapts to it.
      </p>

      <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-accent font-semibold">Block</div>
          <div className="text-sm mt-1">
            Your <span className="font-semibold">program</span> for 4-8 weeks. Weekly pattern + progression (easy → harder → peak → deload). <span className="text-text-dim">Pick one in Plan.</span>
          </div>
        </div>
        <div className="h-px bg-border" />
        <div>
          <div className="text-xs uppercase tracking-widest text-text-dim font-semibold">Category</div>
          <div className="text-sm mt-1 text-text-muted">
            A single <span className="font-semibold text-text">workout type</span> you can grab anytime (Strength, Cardio, Split…). Use it when you want to do something off-plan today.
          </div>
        </div>
      </div>

      <p className="text-xs text-text-dim leading-relaxed">
        Tapping the big button below takes you to Plan where you can preview and pick a block. You can also edit any onboarding answer any time from Profile.
      </p>
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
