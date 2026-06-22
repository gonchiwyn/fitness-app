"use client";

import { templatesFor } from "@/lib/data/templates";
import { CATEGORY_LABELS, type Category } from "@/lib/types";

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
  const templates = templatesFor(category);

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
            Random pick — variety guaranteed
          </div>
        </button>

        {templates.length > 0 && (
          <div className="text-[10px] uppercase tracking-widest text-text-dim font-semibold pt-3 pb-1 px-1">
            Or pick a specific session
          </div>
        )}

        <div className="space-y-1.5">
          {templates.map((t) => {
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
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-text-dim mt-0.5">{t.description}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
