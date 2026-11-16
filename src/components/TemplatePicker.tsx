"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { isTemplateAtLevel, templatesFor } from "@/lib/data/templates";
import { getProfile, saveProfile } from "@/lib/db";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import {
  CATEGORY_LABELS,
  LEVEL_LABELS,
  type Category,
  type Level,
} from "@/lib/types";

export default function TemplatePicker({
  category,
  currentTemplateId,
  onPickRandom,
  onPickTemplate,
  onClose,
  switchCategoryHref,
}: {
  category: Category;
  currentTemplateId?: string;
  onPickRandom: () => void;
  onPickTemplate: (templateId: string) => void;
  onClose: () => void;
  // If provided, shows a "change day type" link at the bottom of the picker
  // that navigates elsewhere (usually /plan). Used from the workout page so
  // the user can flip category (Legs → Cardio) without leaving the flow.
  switchCategoryHref?: string;
}) {
  useBodyScrollLock(true);
  const templates = templatesFor(category);
  const [level, setLevel] = useState<Level>("comfortable");

  useEffect(() => {
    // Load user's saved level for this category
    getProfile().then((p) => {
      const lv = p.levels?.[category] ?? "comfortable";
      setLevel(lv);
    });
  }, [category]);

  const changeLevel = async (lv: Level) => {
    setLevel(lv);
    const p = await getProfile();
    const nextLevels = { ...(p.levels ?? {}), [category]: lv };
    await saveProfile({ levels: nextLevels });
  };

  const filtered = templates.filter((t) => isTemplateAtLevel(t, level));

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
              Pick a session
            </div>
            <h3 className="font-display text-2xl font-normal tracking-tight text-text mt-1">
              {CATEGORY_LABELS[category]}
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

        {/* Level chips — filters + saves preference per category */}
        <div className="mb-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim font-medium mb-2.5">
            Your level
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["starter", "comfortable", "pro"] as Level[]).map((lv) => (
              <button
                key={lv}
                onClick={() => changeLevel(lv)}
                className={clsx(
                  "h-10 rounded-full border text-xs font-medium transition-colors",
                  level === lv
                    ? "bg-text/5 border-accent/60 text-text"
                    : "bg-transparent border-border-strong/40 text-text-muted hover:border-text-dim"
                )}
              >
                {LEVEL_LABELS[lv]}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onPickRandom}
          className={clsx(
            "w-full text-left p-3.5 rounded-xl border mb-2 transition-colors",
            !currentTemplateId
              ? "bg-bg-card border-accent/50"
              : "bg-transparent border-border-strong/40 hover:border-text-dim"
          )}
        >
          <div className="font-medium text-text">Surprise me</div>
          <div className="text-xs text-text-dim mt-0.5">
            Random pick from sessions at your level
          </div>
        </button>

        {filtered.length > 0 && (
          <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim font-medium pt-4 pb-2 px-1">
            Or pick a specific session
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((t) => {
            const isCurrent = t.id === currentTemplateId;
            return (
              <button
                key={t.id}
                onClick={() => onPickTemplate(t.id)}
                className={clsx(
                  "w-full text-left p-3.5 rounded-xl border transition-colors",
                  isCurrent
                    ? "bg-bg-card border-accent/50"
                    : "bg-transparent border-border-strong/40 hover:border-text-dim"
                )}
              >
                <div className="font-medium flex items-center gap-2 text-text">
                  <span>{t.name}</span>
                  {t.complexity && t.complexity !== "comfortable" && (
                    <span className="text-[9px] uppercase tracking-[0.2em] text-text-dim">
                      {t.complexity}
                    </span>
                  )}
                </div>
                <div className="text-xs text-text-dim mt-1 leading-relaxed">{t.description}</div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-sm text-text-dim italic text-center p-4">
              No sessions at this level. Try a different level chip above.
            </div>
          )}
        </div>

        {switchCategoryHref && (
          <Link
            href={switchCategoryHref}
            onClick={onClose}
            className="block text-center text-[11px] text-accent mt-5 pt-4 border-t border-border-strong/30 uppercase tracking-[0.18em] font-medium"
          >
            Change day type
          </Link>
        )}
      </div>
    </div>
  );
}
