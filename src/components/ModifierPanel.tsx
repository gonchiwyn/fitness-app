"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  EQUIPMENT_PRESET_LABELS,
  EQUIPMENT_PRESETS,
  REHAB_ZONE_LABELS,
  type EquipmentPreset,
  type Intensity,
  type RehabZone,
  type WorkoutModifiers,
} from "@/lib/types";

const TIME_OPTIONS = [30, 45, 60, 90];
const REHAB_OPTIONS: (RehabZone | null)[] = [null, "shoulder", "knee", "lower_back", "hip", "elbow", "neck"];

export default function ModifierPanel({
  initial,
  defaultEquipment,
  onApply,
}: {
  initial: WorkoutModifiers;
  defaultEquipment?: EquipmentPreset;
  onApply: (m: WorkoutModifiers) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<WorkoutModifiers>(initial);

  const summary = summarize(initial, defaultEquipment);

  return (
    <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-accent">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L14 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 018 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          <span className="text-sm font-medium">Adjust</span>
          <span className="text-xs text-text-dim">{summary}</span>
        </div>
        <svg
          className={clsx("w-5 h-5 text-text-dim transition-transform", open && "rotate-180")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-border/50 p-4 space-y-5">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-text-dim font-semibold mb-2">
              Time available
            </div>
            <div className="flex gap-2 flex-wrap">
              {TIME_OPTIONS.map((m) => (
                <Chip
                  key={m}
                  active={draft.timeMinutes === m}
                  onClick={() => setDraft({ ...draft, timeMinutes: draft.timeMinutes === m ? undefined : m })}
                >
                  {m}m
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-text-dim font-semibold mb-2">
              Equipment
            </div>
            <div className="grid grid-cols-2 gap-2">
              {EQUIPMENT_PRESETS.filter((p) => p !== "custom").map((p) => (
                <Chip
                  key={p}
                  active={(draft.equipmentPreset ?? defaultEquipment) === p}
                  onClick={() => setDraft({ ...draft, equipmentPreset: p })}
                  fullWidth
                >
                  {EQUIPMENT_PRESET_LABELS[p]}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-text-dim font-semibold mb-2">
              Intensity
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["recovery", "normal", "push"] as Intensity[]).map((i) => (
                <Chip
                  key={i}
                  active={(draft.intensity ?? "normal") === i}
                  onClick={() => setDraft({ ...draft, intensity: i })}
                  fullWidth
                >
                  {i === "recovery" ? "Easy" : i === "push" ? "Push" : "Normal"}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-text-dim font-semibold mb-2">
              Rehab mode (zone is bothering me)
            </div>
            <div className="flex gap-2 flex-wrap">
              {REHAB_OPTIONS.map((r, i) => (
                <Chip
                  key={i}
                  active={(draft.rehab ?? null) === r}
                  onClick={() => setDraft({ ...draft, rehab: r ?? undefined })}
                >
                  {r === null ? "None" : REHAB_ZONE_LABELS[r]}
                </Chip>
              ))}
            </div>
            {draft.rehab && (
              <p className="text-xs text-text-dim mt-2">
                Risky lifts will swap, loads drop ~2 RPE, volume reduces, and warmup adds {REHAB_ZONE_LABELS[draft.rehab].toLowerCase()} work.
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => {
                setDraft({});
                onApply({});
                setOpen(false);
              }}
              className="flex-1 h-11 rounded-xl border border-border text-text-muted font-medium"
            >
              Reset
            </button>
            <button
              onClick={() => {
                onApply(draft);
                setOpen(false);
              }}
              className="flex-1 h-11 rounded-xl bg-accent text-white font-semibold"
            >
              Apply &amp; regenerate
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function summarize(m: WorkoutModifiers, defaultEq?: EquipmentPreset): string {
  const parts: string[] = [];
  if (m.timeMinutes) parts.push(`${m.timeMinutes}m`);
  const eq = m.equipmentPreset ?? defaultEq;
  if (eq && eq !== "full_gym") parts.push(EQUIPMENT_PRESET_LABELS[eq]);
  if (m.intensity && m.intensity !== "normal") parts.push(m.intensity === "recovery" ? "easy" : "push");
  if (m.rehab) parts.push(`rehab: ${m.rehab.replace("_", " ")}`);
  return parts.length === 0 ? "default" : parts.join(" · ");
}

function Chip({
  active,
  onClick,
  fullWidth,
  children,
}: {
  active: boolean;
  onClick: () => void;
  fullWidth?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "h-10 px-3 rounded-lg border text-xs font-medium transition-colors",
        fullWidth ? "w-full" : "",
        active
          ? "bg-accent text-white border-accent"
          : "bg-bg border-border text-text-muted hover:border-border/70"
      )}
    >
      {children}
    </button>
  );
}
