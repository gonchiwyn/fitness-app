"use client";

import { useState } from "react";
import { format } from "date-fns";
import { db, getProfile } from "@/lib/db";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import type { Session } from "@/lib/types";

const COMMON_SPORTS = [
  "Tennis",
  "Padel",
  "Football",
  "Basketball",
  "Swim",
  "Ski",
  "Snowboard",
  "Surf",
  "Bike ride",
  "Run outside",
  "Hike",
  "Climbing",
];

export default function SportLogModal({
  date,
  onClose,
  onLogged,
}: {
  date?: string; // yyyy-MM-dd — defaults to today
  onClose: () => void;
  onLogged: () => void;
}) {
  useBodyScrollLock(true);
  const [sport, setSport] = useState("");
  const [saving, setSaving] = useState(false);
  const logDate = date ?? format(new Date(), "yyyy-MM-dd");

  const save = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    const profile = await getProfile();
    const now = Date.now();
    const session: Session = {
      workoutId: `sport-${logDate}-${trimmed.toLowerCase().replace(/\s+/g, "_")}-${now}`,
      category: "sport",
      name: trimmed,
      sportName: trimmed,
      date: logDate,
      createdAt: now,
      startedAt: now,
      finishedAt: now,
      focusName: profile?.currentFocus?.name,
      blocks: [],
    };
    await db.sessions.add(session);
    onLogged();
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg-elevated border border-border rounded-2xl p-5 max-w-md w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold">Log a sport</h3>
          <button onClick={onClose} className="text-text-dim text-2xl leading-none">
            ×
          </button>
        </div>
        <p className="text-xs text-text-dim mb-4">
          Not part of your program — just marks that you moved. Counts on your calendar and streak.
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {COMMON_SPORTS.map((s) => (
            <button
              key={s}
              disabled={saving}
              onClick={() => save(s)}
              className="text-sm px-3 py-1.5 rounded-full bg-bg-card border border-border hover:border-accent/40 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="text-[10px] uppercase tracking-widest text-text-dim mb-1 font-semibold">
          Or type your own
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            placeholder="e.g. Kayak, Boxing…"
            className="flex-1 bg-bg-card border border-border rounded-xl px-3 h-11 text-sm outline-none focus:border-accent/60"
            onKeyDown={(e) => {
              if (e.key === "Enter") save(sport);
            }}
          />
          <button
            disabled={!sport.trim() || saving}
            onClick={() => save(sport)}
            className="px-4 h-11 rounded-xl bg-accent text-black font-semibold disabled:opacity-40"
          >
            Log
          </button>
        </div>
      </div>
    </div>
  );
}
