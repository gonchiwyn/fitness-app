"use client";

import { useState } from "react";
import clsx from "clsx";
import { format, parseISO } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { db, logRetroactiveSession } from "@/lib/db";
import { templatesFor, findTemplate } from "@/lib/data/templates";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import {
  CATEGORIES,
  CATEGORY_BLURBS,
  CATEGORY_LABELS,
  type Category,
} from "@/lib/types";

export default function QuickLogModal({
  date,
  onClose,
  onLogged,
}: {
  date: string; // yyyy-MM-dd
  onClose: () => void;
  onLogged: () => void;
}) {
  useBodyScrollLock(true);
  const [stage, setStage] = useState<"category" | "template">("category");
  const [pickedCategory, setPickedCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);

  const templates = pickedCategory ? templatesFor(pickedCategory) : [];
  const dayLabel = format(parseISO(date), "EEEE, MMM d");

  // Last 60 days of finished sessions, deduped by (category + templateId),
  // top 5 most-used. One-tap re-log of what you actually do.
  const recent = useLiveQuery(async () => {
    const all = await db.sessions.toArray();
    const cutoffMs = Date.now() - 60 * 86400000;
    const finished = all.filter((s) => s.finishedAt && s.finishedAt >= cutoffMs);
    const counts = new Map<string, { category: Category; templateId?: string; name: string; count: number }>();
    for (const s of finished) {
      const key = `${s.category}|${s.modifiers?.templateId ?? ""}`;
      const prev = counts.get(key);
      if (prev) prev.count++;
      else counts.set(key, {
        category: s.category,
        templateId: s.modifiers?.templateId,
        name: s.name,
        count: 1,
      });
    }
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [], []);

  const save = async (category: Category, templateId?: string) => {
    setSaving(true);
    const template = templateId
      ? templatesFor(category).find((t) => t.id === templateId)
      : undefined;
    const name = template
      ? `${CATEGORY_LABELS[category]} — ${template.name}`
      : CATEGORY_LABELS[category];
    await logRetroactiveSession(date, category, name, templateId);
    setSaving(false);
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
          <h3 className="text-lg font-bold">
            What did you train?
          </h3>
          <button onClick={onClose} className="text-text-dim text-2xl leading-none">
            ×
          </button>
        </div>
        <p className="text-sm text-text-muted mb-4">
          Log what you did on {dayLabel}. Just picks category — no set-by-set data.
        </p>

        {stage === "category" && recent && recent.length > 0 && (
          <div className="mb-4 space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest text-text-dim font-semibold">
              Recent
            </div>
            {recent.map((r, i) => (
              <button
                key={i}
                onClick={() => save(r.category, r.templateId)}
                disabled={saving}
                className="w-full text-left p-2.5 rounded-xl border bg-accent/10 border-accent/30 hover:border-accent/50 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{r.name}</div>
                  <div className="text-[11px] text-text-dim">
                    {CATEGORY_LABELS[r.category]}{r.templateId ? (findTemplate(r.templateId) ? ` · ${findTemplate(r.templateId)!.name}` : "") : ""}
                  </div>
                </div>
                <span className="text-accent text-sm font-semibold shrink-0">Log</span>
              </button>
            ))}
          </div>
        )}

        {stage === "category" && (
          <div className="space-y-1.5">
            {CATEGORIES.filter((c) => c !== "beach").map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setPickedCategory(cat);
                  const tpl = templatesFor(cat);
                  if (tpl.length > 1) {
                    setStage("template");
                  } else {
                    save(cat);
                  }
                }}
                disabled={saving}
                className={clsx(
                  "w-full text-left p-3 rounded-xl border transition-colors flex items-center justify-between",
                  "bg-bg-card border-border hover:border-accent/40"
                )}
              >
                <div>
                  <div className="font-medium">{CATEGORY_LABELS[cat]}</div>
                  <div className="text-xs text-text-dim mt-0.5">{CATEGORY_BLURBS[cat]}</div>
                </div>
                <span className="text-text-dim text-sm">›</span>
              </button>
            ))}
          </div>
        )}

        {stage === "template" && pickedCategory && (
          <>
            <button
              onClick={() => setStage("category")}
              className="text-xs text-text-dim mb-3"
            >
              ← Change category
            </button>

            <div className="space-y-1.5">
              <button
                onClick={() => save(pickedCategory)}
                disabled={saving}
                className="w-full text-left p-3 rounded-xl border bg-accent/10 border-accent/40"
              >
                <div className="font-medium">↻ Just the category — no specific session</div>
                <div className="text-xs text-text-dim mt-0.5">
                  Log as {CATEGORY_LABELS[pickedCategory]}, don&apos;t care which template
                </div>
              </button>

              {templates.length > 0 && (
                <div className="text-[10px] uppercase tracking-widest text-text-dim font-semibold pt-3 pb-1 px-1">
                  Or pick the specific session
                </div>
              )}

              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => save(pickedCategory, t.id)}
                  disabled={saving}
                  className="w-full text-left p-3 rounded-xl border bg-bg-card border-border hover:border-accent/40 transition-colors"
                >
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-text-dim mt-0.5">{t.description}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
