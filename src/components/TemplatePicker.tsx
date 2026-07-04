"use client";

import { useEffect, useState } from "react";
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
}: {
  category: Category;
  currentTemplateId?: string;
  onPickRandom: () => void;
  onPickTemplate: (templateId: string) => void;
  onClose: () => void;
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
        className="bg-bg-elevated border border-border rounded-2xl p-5 max-w-md w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">
            {CATEGORY_LABELS[category]}
            <span className="text-text-dim text-sm font-normal ml-2">
              · pick a session
            </span>
          </h3>
          <button onClick={onClose} className="text-text-dim text-2xl leading-none">
            ×
          </button>
        </div>

        {/* Level chips — filters + saves preference per category */}
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-widest text-text-dim font-semibold mb-2">
            Your level for {CATEGORY_LABELS[category]}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {(["starter", "comfortable", "pro"] as Level[]).map((lv) => (
              <button
                key={lv}
                onClick={() => changeLevel(lv)}
                className={clsx(
                  "h-10 rounded-lg border text-xs font-medium transition-colors",
                  level === lv
                    ? "bg-accent text-black border-accent"
                    : "bg-bg-card border-border text-text-muted hover:border-border/60"
                )}
              >
                {LEVEL_LABELS[lv]}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onPickRandom}
          className={
            !currentTemplateId
              ? "w-full text-left p-3 rounded-xl border bg-accent/10 border-accent/40 mb-2"
              : "w-full text-left p-3 rounded-xl border bg-bg-card border-border hover:border-accent/40 mb-2"
          }
        >
          <div className="font-medium">↻ Surprise me</div>
          <div className="text-xs text-text-dim mt-0.5">
            Random pick from sessions at your level
          </div>
        </button>

        {filtered.length > 0 && (
          <div className="text-[10px] uppercase tracking-widest text-text-dim font-semibold pt-3 pb-1 px-1">
            Or pick a specific session
          </div>
        )}

        <div className="space-y-1.5">
          {filtered.map((t) => {
            const isCurrent = t.id === currentTemplateId;
            return (
              <button
                key={t.id}
                onClick={() => onPickTemplate(t.id)}
                className={
                  isCurrent
                    ? "w-full text-left p-3 rounded-xl border bg-accent/10 border-accent/40"
                    : "w-full text-left p-3 rounded-xl border bg-bg-card border-border hover:border-accent/40 transition-colors"
                }
              >
                <div className="font-medium flex items-center gap-2">
                  <span>{t.name}</span>
                  {t.complexity && t.complexity !== "comfortable" && (
                    <span className="text-[9px] uppercase tracking-widest text-text-dim">
                      {t.complexity}
                    </span>
                  )}
                </div>
                <div className="text-xs text-text-dim mt-0.5">{t.description}</div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-sm text-text-dim italic text-center p-4">
              No sessions at this level. Try a different level chip above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
