"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { db, logRetroactiveSession } from "@/lib/db";
import { templatesFor, findTemplate } from "@/lib/data/templates";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { categoryColor } from "@/lib/categoryTheme";
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

  // Sessions already logged on this date — shown at the top so the user
  // can delete or view them. Makes the modal a mini day editor, not just
  // an "add a log" form.
  const existingForDate = useLiveQuery(
    async () => {
      const all = await db.sessions.where("date").equals(date).toArray();
      return all.filter((s) => s.startedAt || s.finishedAt);
    },
    [date],
    []
  );

  const removeSession = async (id: number) => {
    if (!confirm("Remove this logged session?")) return;
    await db.sessions.delete(id);
  };

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
        className="bg-bg-elevated border border-border-strong/50 rounded-2xl p-5 max-w-md w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-[11px] tracking-normal text-text-dim font-medium">
              {existingForDate && existingForDate.length > 0 ? "Edit the day" : "Log a session"}
            </div>
            <h3 className="text-xl font-medium tracking-[-0.02em] tracking-tight text-text mt-1">
              {dayLabel}
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
          {existingForDate && existingForDate.length > 0
            ? "Add another session, or remove one."
            : "Log what you did — just picks category, no set-by-set data."}
        </p>

        {stage === "category" && existingForDate && existingForDate.length > 0 && (
          <div className="mb-5 space-y-2">
            <div className="text-[11px] tracking-normal text-text-dim font-medium">
              Already logged
            </div>
            {existingForDate.map((s) => {
              const color = categoryColor(s.category);
              return (
                <div
                  key={s.id}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-strong/40 bg-bg-elevated flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: color.solid }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate text-text">{s.name}</div>
                      <div className="text-[11px] text-text-dim mt-0.5">
                        {CATEGORY_LABELS[s.category]}
                        {s.finishedAt && (
                          <span className="tracking-normal ml-1.5">· Done</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => s.id !== undefined && removeSession(s.id)}
                    className="w-8 h-8 rounded-full text-text-dim hover:text-danger hover:bg-danger/10 flex items-center justify-center text-base shrink-0"
                    aria-label="Remove session"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {stage === "category" && recent && recent.length > 0 && (
          <div className="mb-5 space-y-2">
            <div className="text-[11px] tracking-normal text-text-dim font-medium">
              Recent
            </div>
            {recent.map((r, i) => {
              const color = categoryColor(r.category);
              return (
                <button
                  key={i}
                  onClick={() => save(r.category, r.templateId)}
                  disabled={saving}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl border border-border-strong/40 hover:border-text-dim flex items-center justify-between gap-2 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: color.solid }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate text-text">{r.name}</div>
                      <div className="text-[11px] text-text-dim mt-0.5">
                        {CATEGORY_LABELS[r.category]}
                        {r.templateId && findTemplate(r.templateId) ? ` · ${findTemplate(r.templateId)!.name}` : ""}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] tracking-normal text-accent font-medium shrink-0">
                    Log
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {stage === "category" && (
          <>
            <div className="text-[11px] tracking-normal text-text-dim font-medium mb-2.5">
              Or pick a category
            </div>
            <div className="space-y-2">
              {CATEGORIES.filter((c) => c !== "beach").map((cat) => {
                const color = categoryColor(cat);
                return (
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
                    className="w-full text-left p-3.5 rounded-xl border border-border-strong/40 hover:border-text-dim transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: color.solid }}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-text">{CATEGORY_LABELS[cat]}</div>
                        <div className="text-xs text-text-dim mt-0.5">{CATEGORY_BLURBS[cat]}</div>
                      </div>
                    </div>
                    <span className="text-text-dim text-sm shrink-0">›</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {stage === "template" && pickedCategory && (
          <>
            <button
              onClick={() => setStage("category")}
              className="text-[12px] tracking-normal text-text-dim mb-3 hover:text-text font-medium"
            >
              ← Change category
            </button>

            <div className="space-y-2">
              <button
                onClick={() => save(pickedCategory)}
                disabled={saving}
                className="w-full text-left p-3.5 rounded-xl border bg-text/5 border-accent/60 transition-colors"
              >
                <div className="font-medium text-text">Just the category</div>
                <div className="text-xs text-text-dim mt-0.5">
                  Log as {CATEGORY_LABELS[pickedCategory]} — no specific template
                </div>
              </button>

              {templates.length > 0 && (
                <div className="text-[11px] tracking-normal text-text-dim font-medium pt-3 pb-1 px-1">
                  Or pick the specific session
                </div>
              )}

              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => save(pickedCategory, t.id)}
                  disabled={saving}
                  className="w-full text-left p-3.5 rounded-xl border border-border-strong/40 hover:border-text-dim transition-colors"
                >
                  <div className="font-medium text-text">{t.name}</div>
                  <div className="text-xs text-text-dim mt-0.5 leading-relaxed">{t.description}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
