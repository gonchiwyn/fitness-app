"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  EQUIPMENT_PRESET_LABELS,
  EQUIPMENT_PRESETS,
  REHAB_ZONE_LABELS,
  type EquipmentPreset,
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
    <section className="bg-bg-elevated border border-border-strong/40 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden />
          <span className="text-sm font-medium text-text">Adjust</span>
          <span className="text-[11px] text-text-dim truncate">{summary}</span>
        </div>
        <svg
          className={clsx("w-4 h-4 text-text-dim transition-transform shrink-0", open && "rotate-180")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-border-strong/30 p-4 space-y-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim font-medium mb-2.5">
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
            <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim font-medium mb-2.5">
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
            <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim font-medium mb-2.5">
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
              className="flex-1 h-11 rounded-full border border-border-strong/40 text-text-muted font-medium text-sm hover:border-text-dim hover:text-text transition-colors"
            >
              Reset
            </button>
            <button
              onClick={() => {
                onApply(draft);
                setOpen(false);
              }}
              className="flex-1 h-11 rounded-full bg-accent text-bg font-semibold text-sm hover:bg-accent-dim transition-colors"
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
        "h-10 px-3.5 rounded-full border text-xs font-medium transition-colors",
        fullWidth ? "w-full" : "",
        active
          ? "bg-text/5 border-accent/60 text-text"
          : "bg-transparent border-border-strong/40 text-text-muted hover:border-text-dim"
      )}
    >
      {children}
    </button>
  );
}
