import { differenceInDays, parseISO } from "date-fns";
import type { Category, Session } from "./types";

export type Recommendation = {
  category: Category;
  templateId?: string;
  reasoning: string;
};

/**
 * Suggest what to train today based on the last 7 days of finished sessions.
 * Rule-based: spots gaps in movement patterns, penalizes back-to-back same-day
 * loading, biases toward recovery after high-intensity streaks.
 */
export function recommendForToday(
  sessions: Session[],
  today: Date = new Date()
): Recommendation | null {
  const finished = sessions
    .filter((s) => s.finishedAt)
    .map((s) => ({ ...s, parsedDate: parseISO(s.date) }))
    .filter((s) => differenceInDays(today, s.parsedDate) <= 7)
    .sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime());

  if (finished.length < 2) return null; // Not enough signal yet

  // Categorize sessions by what body zone or intent they hit
  const byCategory = new Map<Category, Date>();
  for (const s of finished) {
    const existing = byCategory.get(s.category);
    if (!existing || s.parsedDate > existing) byCategory.set(s.category, s.parsedDate);
  }

  const daysSince = (cat: Category): number => {
    const last = byCategory.get(cat);
    if (!last) return 99;
    return differenceInDays(today, last);
  };

  // Higher-intensity categories that shouldn't stack day after day
  const highIntensityLastTwoDays = finished
    .filter((s) => differenceInDays(today, s.parsedDate) <= 1)
    .some((s) =>
      (["hyrox", "crossfit", "burn", "athlete"] as Category[]).includes(s.category)
    );

  // What did we do yesterday?
  const yesterdayCat = finished
    .filter((s) => differenceInDays(today, s.parsedDate) === 1)
    .map((s) => s.category)[0];

  // Pattern rotation — for split templates
  const lastSplitTemplates = finished
    .filter((s) => s.category === "split" && s.workoutId)
    .map((s) => extractTemplateId(s.workoutId))
    .filter(Boolean) as string[];

  // If lots of intensity yesterday, recommend recovery / stretching / z2
  if (highIntensityLastTwoDays) {
    return {
      category: "cardio",
      templateId: "attia_zone2_45",
      reasoning:
        "You've hit high intensity in the last day. A Zone 2 aerobic session builds base without adding stress — Attia's recipe.",
    };
  }

  // If they've done push/pull/legs partially this week, complete the rotation
  const doneSplits = new Set(lastSplitTemplates);
  if (doneSplits.size >= 1 && doneSplits.size < 3) {
    const pplOrder = ["split_push", "split_pull", "split_legs"];
    const missing = pplOrder.find((id) => !doneSplits.has(id));
    if (missing) {
      const label = missing.replace("split_", "");
      return {
        category: "split",
        templateId: missing,
        reasoning: `You've done ${Array.from(doneSplits).map((id) => id.replace("split_", "")).join(" + ")} this week. Complete the PPL rotation with ${label}.`,
      };
    }
  }

  // No pull in 3+ days? Suggest pull
  if (daysSince("split") > 2 && !doneSplits.has("split_pull")) {
    return {
      category: "split",
      templateId: "split_pull",
      reasoning: `No back/pulling work in ${daysSince("split")}+ days. Pull day balances your press-heavy week.`,
    };
  }

  // No legs in 4+ days?
  if (daysSince("split") > 3 && !doneSplits.has("split_legs") && yesterdayCat !== "hyrox") {
    return {
      category: "split",
      templateId: "split_legs",
      reasoning: `Legs haven't been trained in ${daysSince("split")}+ days. Time for a lower-body session.`,
    };
  }

  // No cardio in 3+ days? (Attia says 180+ min Z2 per week)
  if (daysSince("cardio") > 2) {
    return {
      category: "cardio",
      reasoning: `No cardio in ${daysSince("cardio")}+ days. Weekly Zone 2 minutes matter more than any single workout for longevity.`,
    };
  }

  // No core in 5+ days?
  if (daysSince("core") > 4) {
    return {
      category: "core",
      templateId: "core_galpin_pillar",
      reasoning: `Anti-extension work is your priority — hasn't been hit as a standalone session recently. Galpin 3-pillar circuit.`,
    };
  }

  // No hyrox / functional in 5+ days but they want to train it
  if (daysSince("hyrox") > 4 && daysSince("athlete") > 4) {
    return {
      category: "hyrox",
      reasoning: `No functional/Hyrox work in 5+ days — worth touching since it's a stated goal.`,
    };
  }

  // Fallback: mobility day
  return {
    category: "stretching",
    reasoning: `Solid week. Stretching gives the nervous system a chance to reset.`,
  };
}

// workoutId format: `${category}-${date}-${templateId}-${seed}`
function extractTemplateId(workoutId: string): string | null {
  const parts = workoutId.split("-");
  // "split-2026-06-25-split_push-12345" or "split-2026-06-25-split_push-timestamp"
  if (parts.length < 5) return null;
  // Reassemble middle parts (some template ids have underscores/dashes)
  // Strategy: try to find one that starts with a known category prefix
  for (const p of parts) {
    if (p.startsWith("split_") || p.startsWith("hyrox_") || p.startsWith("cf_") ||
        p.startsWith("hyp_") || p.startsWith("strength_") || p.startsWith("core_") ||
        p.startsWith("cardio_") || p.startsWith("attia_") || p.startsWith("galpin_") ||
        p.startsWith("huberman_") || p.startsWith("hemsworth_") || p.startsWith("patrick_") ||
        p.startsWith("burn_") || p.startsWith("beach_") || p.startsWith("stretch_") ||
        p.startsWith("surf_") || p.startsWith("recovery_") || p.startsWith("athlete_")) {
      return p;
    }
  }
  return null;
}
