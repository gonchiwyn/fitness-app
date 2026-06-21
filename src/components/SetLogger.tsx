"use client";

import clsx from "clsx";
import type { LoggedSet } from "@/lib/types";

export default function SetLogger({
  index,
  set,
  units,
  showLoad,
  onChange,
}: {
  index: number;
  set: LoggedSet;
  units: "kg" | "lb";
  showLoad: boolean;
  onChange: (set: LoggedSet) => void;
}) {
  const toggle = () => {
    onChange({ ...set, completed: !set.completed });
  };

  return (
    <div
      className={clsx(
        "flex items-center gap-2 rounded-lg px-3 py-2 transition-colors",
        set.completed
          ? "bg-success/10 border border-success/30"
          : "bg-bg border border-border"
      )}
    >
      <div className="w-6 text-xs text-text-dim tabular-nums font-mono">
        {index + 1}
      </div>

      {showLoad && (
        <NumberInput
          value={set.weight}
          placeholder={units}
          onChange={(v) => onChange({ ...set, weight: v })}
          width="w-20"
        />
      )}

      <NumberInput
        value={set.reps}
        placeholder="reps"
        onChange={(v) => onChange({ ...set, reps: v })}
        width="w-16"
      />

      <NumberInput
        value={set.rpe}
        placeholder="rpe"
        step={0.5}
        max={10}
        onChange={(v) => onChange({ ...set, rpe: v })}
        width="w-14"
        muted
      />

      <button
        onClick={toggle}
        aria-label={set.completed ? "Mark incomplete" : "Mark complete"}
        className={clsx(
          "ml-auto w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
          set.completed
            ? "bg-success text-bg"
            : "bg-bg-card text-text-dim hover:text-text"
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </button>
    </div>
  );
}

function NumberInput({
  value,
  placeholder,
  onChange,
  width,
  step = 0.5,
  max,
  muted,
}: {
  value: number | undefined;
  placeholder: string;
  onChange: (v: number | undefined) => void;
  width: string;
  step?: number;
  max?: number;
  muted?: boolean;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value ?? ""}
      step={step}
      max={max}
      placeholder={placeholder}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "" ? undefined : Number(v));
      }}
      className={clsx(
        "h-9 px-2 rounded-md bg-bg-card border border-border text-center text-sm tabular-nums focus:outline-none focus:border-accent",
        width,
        muted && "text-text-muted"
      )}
    />
  );
}
