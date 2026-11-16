"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
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
        className="bg-bg-elevated border border-border-strong/50 rounded-2xl p-5 max-w-md w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim font-medium">
              Log a sport
            </div>
            <h3 className="font-display text-xl font-semibold tracking-tight text-text mt-1">
              {format(parseISO(logDate), "EEEE, MMM d")}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-text-dim text-2xl leading-none hover:text-text"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="text-sm text-text-muted mb-5 leading-relaxed">
          Not part of your program — just marks that you moved. Counts on your calendar and streak.
        </p>

        <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim font-medium mb-2.5">
          Common
        </div>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {COMMON_SPORTS.map((s) => (
            <button
              key={s}
              disabled={saving}
              onClick={() => save(s)}
              className="text-xs px-3 h-9 rounded-full bg-transparent border border-border-strong/40 text-text-muted hover:border-text-dim hover:text-text transition-colors disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim mb-2.5 font-medium">
          Or type your own
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            placeholder="e.g. Kayak, Boxing…"
            className="flex-1 bg-transparent border border-border-strong/40 rounded-full px-4 h-11 text-sm outline-none focus:border-accent/60 placeholder:text-text-dim"
            onKeyDown={(e) => {
              if (e.key === "Enter") save(sport);
            }}
          />
          <button
            disabled={!sport.trim() || saving}
            onClick={() => save(sport)}
            className="px-5 h-11 rounded-full bg-accent text-bg font-semibold text-sm hover:bg-accent-dim transition-colors disabled:opacity-40 disabled:bg-transparent disabled:border disabled:border-border-strong/40 disabled:text-text-dim"
          >
            Log
          </button>
        </div>
      </div>
    </div>
  );
}
