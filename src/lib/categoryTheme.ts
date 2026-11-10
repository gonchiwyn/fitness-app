// Category → visual hue. Keeps every surface (Home chips, Today card, Profile
// bars, Week strip dots, Workout header) speaking the same color language:
// strength is always oxblood, cardio is always teal, etc. Returns the CSS
// custom-property value (not a Tailwind class) so inline style works on both
// backgrounds, borders, and gradients without a round-trip through Tailwind.
import type { Category } from "./types";

const PALETTE: Record<string, { solid: string; soft: string }> = {
  strength: { solid: "var(--c-strength)", soft: "var(--c-strength-soft)" },
  hypertrophy: { solid: "var(--c-strength)", soft: "var(--c-strength-soft)" },
  split: { solid: "var(--c-strength)", soft: "var(--c-strength-soft)" },
  beach: { solid: "var(--c-strength)", soft: "var(--c-strength-soft)" },

  cardio: { solid: "var(--c-cardio)", soft: "var(--c-cardio-soft)" },

  hyrox: { solid: "var(--c-hyrox)", soft: "var(--c-hyrox-soft)" },
  crossfit: { solid: "var(--c-hyrox)", soft: "var(--c-hyrox-soft)" },
  athlete: { solid: "var(--c-hyrox)", soft: "var(--c-hyrox-soft)" },
  burn: { solid: "var(--c-hyrox)", soft: "var(--c-hyrox-soft)" },

  sport: { solid: "var(--c-sport)", soft: "var(--c-sport-soft)" },
  surf: { solid: "var(--c-sport)", soft: "var(--c-sport-soft)" },

  stretching: { solid: "var(--c-mobility)", soft: "var(--c-mobility-soft)" },
  core: { solid: "var(--c-mobility)", soft: "var(--c-mobility-soft)" },

  recovery: { solid: "var(--c-recovery)", soft: "var(--c-recovery-soft)" },

  test: { solid: "var(--accent)", soft: "color-mix(in oklab, var(--accent) 18%, transparent)" },
};

export function categoryColor(cat: Category | string | undefined): { solid: string; soft: string } {
  if (!cat) return { solid: "var(--accent)", soft: "color-mix(in oklab, var(--accent) 18%, transparent)" };
  return PALETTE[cat] ?? { solid: "var(--accent)", soft: "color-mix(in oklab, var(--accent) 18%, transparent)" };
}
