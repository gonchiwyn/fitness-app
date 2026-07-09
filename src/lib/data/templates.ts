import type { Category, Block, CoachInfluence, Level } from "../types";

export type Template = {
  id: string;
  category: Category;
  name: string;
  description: string;
  philosophy?: string;
  influences?: CoachInfluence[];
  // complexity: which level of user this session suits.
  // starter templates are shown to starter+comfortable users
  // comfortable templates are shown to everyone
  // pro templates are shown only to comfortable+pro users
  complexity?: Level;
  blocks: Omit<Block, "id">[];
};

export function isTemplateAtLevel(t: Template, userLevel: Level): boolean {
  const c = t.complexity ?? "comfortable";
  if (userLevel === "starter") return c !== "pro";
  if (userLevel === "pro") return c !== "starter";
  return true; // comfortable sees all
}

export const TEMPLATES: Template[] = [
  // ============ STRENGTH ============
  {
    id: "strength_upper_a",
    category: "strength",
    name: "Upper — Press Focus",
    description: "Heavy bench, vertical pull, accessory work.",
    blocks: [
      {
        title: "Main Lift",
        scheme: "5x5 — rest 2-3 min",
        prescriptions: [{ exerciseId: "bench_press", sets: 5, reps: "5", rpe: 8, rest: "2-3 min" }],
      },
      {
        title: "Strength",
        scheme: "4x6",
        prescriptions: [
          { exerciseId: "weighted_pullup", sets: 4, reps: "6", rpe: 8, rest: "2 min" },
          { exerciseId: "overhead_press", sets: 4, reps: "6", rpe: 8, rest: "2 min" },
        ],
      },
      {
        title: "Accessory",
        scheme: "3 rounds",
        prescriptions: [
          { exerciseId: "db_row", sets: 3, reps: "10/side", rest: "60s" },
          { exerciseId: "skullcrusher", sets: 3, reps: "12", rest: "60s" },
          { exerciseId: "face_pull", sets: 3, reps: "15", rest: "60s" },
        ],
      },
    ],
  },
  {
    id: "strength_lower_a",
    category: "strength",
    name: "Lower — Squat Focus",
    description: "Back squat, posterior chain, single leg.",
    blocks: [
      {
        title: "Main Lift",
        scheme: "5x5 — rest 3 min",
        prescriptions: [{ exerciseId: "back_squat", sets: 5, reps: "5", rpe: 8, rest: "3 min" }],
      },
      {
        title: "Strength",
        scheme: "4x6",
        prescriptions: [
          { exerciseId: "romanian_deadlift", sets: 4, reps: "6", rpe: 7, rest: "2 min" },
          { exerciseId: "bulgarian_split_squat", sets: 3, reps: "8/side", rest: "90s" },
        ],
      },
      {
        title: "Accessory",
        scheme: "3 rounds",
        prescriptions: [
          { exerciseId: "hip_thrust", sets: 3, reps: "10", rest: "75s" },
          { exerciseId: "calf_raise", sets: 4, reps: "12", rest: "45s" },
        ],
      },
    ],
  },
  {
    id: "strength_deadlift_day",
    category: "strength",
    name: "Pull Day — Deadlift",
    description: "Heavy deadlift + rows + grip.",
    blocks: [
      {
        title: "Main Lift",
        scheme: "Work to top set of 3 + 2 back-off",
        prescriptions: [{ exerciseId: "deadlift", sets: 5, reps: "3", rpe: 8, rest: "3 min" }],
      },
      {
        title: "Strength",
        scheme: "4x8",
        prescriptions: [
          { exerciseId: "barbell_row", sets: 4, reps: "8", rpe: 7, rest: "2 min" },
          { exerciseId: "pullup", sets: 4, reps: "AMRAP", rest: "90s" },
        ],
      },
      {
        title: "Carry",
        scheme: "3 sets",
        prescriptions: [{ exerciseId: "farmer_carry", sets: 3, reps: "40m heavy", rest: "90s" }],
      },
    ],
  },

  // ============ HYPERTROPHY ============
  {
    id: "hyp_push",
    category: "hypertrophy",
    name: "Push Day",
    description: "Chest, shoulders, triceps — high volume.",
    blocks: [
      {
        title: "Primary",
        scheme: "4x8-10",
        prescriptions: [
          { exerciseId: "incline_db_press", sets: 4, reps: "8-10", rpe: 8, rest: "90s" },
          { exerciseId: "overhead_press", sets: 4, reps: "8-10", rpe: 8, rest: "90s" },
        ],
      },
      {
        title: "Volume",
        scheme: "3x12 — rotates",
        prescriptions: [
          {
            exerciseId: "db_bench",
            pool: ["db_bench", "weighted_dip", "incline_db_press", "decline_db_press", "cable_fly", "pec_deck"],
            sets: 3,
            reps: "12",
            rest: "75s",
          },
          {
            exerciseId: "lateral_raise",
            // Push-day isolation — push family only.
            pool: ["lateral_raise", "cable_lateral_raise", "front_raise", "cable_fly", "pec_deck"],
            sets: 4,
            reps: "15",
            rest: "45s",
          },
          {
            exerciseId: "tricep_pushdown",
            pool: ["tricep_pushdown", "skullcrusher", "overhead_tricep_extension", "rope_pushdown"],
            sets: 4,
            reps: "12",
            rest: "45s",
          },
        ],
      },
      {
        title: "Burnout",
        scheme: "1 rest-pause",
        prescriptions: [
          {
            exerciseId: "skullcrusher",
            pool: ["skullcrusher", "tricep_pushdown", "lateral_raise"],
            sets: 1,
            reps: "AMRAP rest-pause",
            notes: "Drop reps 50% on each rest",
          },
        ],
      },
    ],
  },
  {
    id: "hyp_pull",
    category: "hypertrophy",
    name: "Pull Day",
    description: "Back & biceps — width and thickness.",
    blocks: [
      {
        title: "Primary",
        scheme: "4x8-10",
        prescriptions: [
          { exerciseId: "pullup", sets: 4, reps: "AMRAP", rpe: 9, rest: "2 min" },
          { exerciseId: "barbell_row", sets: 4, reps: "8-10", rpe: 8, rest: "90s" },
        ],
      },
      {
        title: "Volume",
        scheme: "3x12",
        prescriptions: [
          { exerciseId: "lat_pulldown", sets: 3, reps: "12", rest: "75s" },
          { exerciseId: "seated_row", sets: 3, reps: "12", rest: "60s" },
          { exerciseId: "db_curl", sets: 3, reps: "12", rest: "45s" },
          { exerciseId: "hammer_curl", sets: 3, reps: "12", rest: "45s" },
        ],
      },
    ],
  },
  {
    id: "hyp_legs",
    category: "hypertrophy",
    name: "Leg Day",
    description: "Quads, hamstrings, glutes — full volume.",
    blocks: [
      {
        title: "Primary",
        scheme: "4x8",
        prescriptions: [
          { exerciseId: "back_squat", sets: 4, reps: "8", rpe: 8, rest: "2 min" },
          { exerciseId: "romanian_deadlift", sets: 4, reps: "8", rpe: 8, rest: "2 min" },
        ],
      },
      {
        title: "Volume",
        scheme: "3 rounds",
        prescriptions: [
          { exerciseId: "leg_press", sets: 3, reps: "12", rest: "75s" },
          { exerciseId: "leg_curl", sets: 3, reps: "12", rest: "60s" },
          { exerciseId: "walking_lunge", sets: 3, reps: "20 steps", rest: "60s" },
        ],
      },
      {
        title: "Pump",
        scheme: "Drop set",
        prescriptions: [{ exerciseId: "leg_extension", sets: 1, reps: "Triple drop, 10-10-10" }],
      },
    ],
  },

  // ============ CROSSFIT ============
  {
    id: "cf_amrap",
    category: "crossfit",
    name: "20-Min AMRAP",
    description: "Classic engine builder.",
    blocks: [
      {
        title: "Strength",
        scheme: "EMOM 8 min",
        prescriptions: [{ exerciseId: "power_clean", sets: 8, reps: "3 @ 70%", rest: "rest of the min" }],
      },
      {
        title: "Metcon",
        scheme: "AMRAP 20",
        note: "Score = total rounds + reps",
        prescriptions: [
          { exerciseId: "wallball", sets: 1, reps: "15" },
          { exerciseId: "pullup", sets: 1, reps: "10" },
          { exerciseId: "burpee", sets: 1, reps: "5" },
        ],
      },
    ],
  },
  {
    id: "cf_for_time",
    category: "crossfit",
    name: "For Time Triplet",
    description: "Fast classic — push the pace.",
    blocks: [
      {
        title: "Strength",
        scheme: "Build to heavy single",
        prescriptions: [{ exerciseId: "deadlift", sets: 5, reps: "1", notes: "Build to a heavy single" }],
      },
      {
        title: "Metcon",
        scheme: "21-15-9 For Time",
        note: "Score = time. Cap 12 min.",
        prescriptions: [
          { exerciseId: "thruster", sets: 1, reps: "21-15-9" },
          { exerciseId: "pullup", sets: 1, reps: "21-15-9" },
        ],
      },
    ],
  },
  {
    id: "cf_emom",
    category: "crossfit",
    name: "EMOM 30",
    description: "Cycle 3 stations every minute.",
    complexity: "pro",
    blocks: [
      {
        title: "Metcon",
        scheme: "EMOM 30 min, rotate",
        note: "Min 1 / 2 / 3 repeating",
        prescriptions: [
          { exerciseId: "row_500", sets: 10, reps: "15 cal" },
          { exerciseId: "kb_swing", sets: 10, reps: "15 reps" },
          { exerciseId: "burpee", sets: 10, reps: "10 reps" },
        ],
      },
    ],
  },

  // ============ HYROX ============
  {
    id: "hyrox_stations",
    category: "hyrox",
    name: "8-Station Sim",
    description: "Run + functional, race pace.",
    complexity: "pro",
    blocks: [
      {
        title: "Race Sim",
        scheme: "8 rounds: 400m run + station",
        note: "Treat each transition like a race",
        prescriptions: [
          { exerciseId: "run", sets: 8, reps: "400m" },
          { exerciseId: "ski_erg", sets: 1, reps: "500m" },
          { exerciseId: "sled_push", sets: 1, reps: "25m heavy" },
          { exerciseId: "sled_pull", sets: 1, reps: "25m" },
          { exerciseId: "burpee_broad", sets: 1, reps: "40m" },
          { exerciseId: "row_500", sets: 1, reps: "1000m" },
          { exerciseId: "farmer_carry", sets: 1, reps: "200m" },
          { exerciseId: "sandbag_lunge", sets: 1, reps: "100m" },
          { exerciseId: "wallball_hyrox", sets: 1, reps: "75 reps" },
        ],
      },
    ],
  },
  {
    id: "hyrox_engine",
    category: "hyrox",
    name: "Engine Day",
    description: "Aerobic capacity intervals.",
    blocks: [
      {
        title: "Intervals",
        scheme: "5 rounds — rest 2 min",
        prescriptions: [
          { exerciseId: "run", sets: 5, reps: "1000m @ race pace +10s/km" },
        ],
      },
      {
        title: "Erg Burner",
        scheme: "4 rounds",
        prescriptions: [
          { exerciseId: "ski_erg", sets: 4, reps: "250m" },
          { exerciseId: "row_500", sets: 4, reps: "250m" },
          { exerciseId: "bike_erg", sets: 4, reps: "250m" },
        ],
      },
    ],
  },
  {
    id: "hyrox_strength",
    category: "hyrox",
    name: "Hyrox Strength",
    description: "Build the engine that pushes the sled.",
    blocks: [
      {
        title: "Strength",
        scheme: "5x5",
        prescriptions: [
          { exerciseId: "back_squat", sets: 5, reps: "5", rpe: 7 },
          { exerciseId: "romanian_deadlift", sets: 4, reps: "8", rpe: 7 },
        ],
      },
      {
        title: "Carry & Push",
        scheme: "4 rounds",
        prescriptions: [
          { exerciseId: "sled_push", sets: 4, reps: "20m heavy" },
          { exerciseId: "farmer_carry", sets: 4, reps: "40m" },
        ],
      },
    ],
  },

  // ============ SURF ============
  {
    id: "surf_paddle",
    category: "surf",
    name: "Paddle Power",
    description: "Back, shoulders, rotational core.",
    blocks: [
      {
        title: "Pulling",
        scheme: "4 rounds",
        prescriptions: [
          { exerciseId: "pullup", sets: 4, reps: "AMRAP", rest: "90s" },
          { exerciseId: "db_row", sets: 4, reps: "12/side", rest: "60s" },
          { exerciseId: "paddle_sim", sets: 3, reps: "45s on / 15s off", rest: "60s" },
        ],
      },
      {
        title: "Pop-Up & Core",
        scheme: "3 rounds",
        prescriptions: [
          { exerciseId: "pop_up", sets: 3, reps: "10 reps explosive" },
          { exerciseId: "med_ball_rotational_throw", sets: 3, reps: "8/side" },
          { exerciseId: "side_plank", sets: 3, reps: "45s/side" },
        ],
      },
    ],
  },
  {
    id: "surf_balance",
    category: "surf",
    name: "Balance & Rotation",
    description: "Single-leg stability and core rotation.",
    blocks: [
      {
        title: "Stability",
        scheme: "3 rounds",
        prescriptions: [
          { exerciseId: "single_leg_rdl", sets: 3, reps: "10/side", rest: "60s" },
          { exerciseId: "turkish_getup", sets: 3, reps: "3/side", rest: "90s" },
        ],
      },
      {
        title: "Rotation",
        scheme: "3 rounds",
        prescriptions: [
          { exerciseId: "med_ball_slam", sets: 3, reps: "12" },
          { exerciseId: "russian_twist", sets: 3, reps: "20" },
          { exerciseId: "pallof_press", sets: 3, reps: "10/side" },
        ],
      },
    ],
  },

  // ============ STRETCHING ============
  {
    id: "stretch_full",
    category: "stretching",
    name: "Full-Body Flow",
    description: "Hold 45-60s each. Breathe.",
    complexity: "starter",
    blocks: [
      {
        title: "Flow",
        scheme: "Hold 45-60s each — 2 rounds",
        prescriptions: [
          { exerciseId: "downward_dog", sets: 2, reps: "45s" },
          { exerciseId: "world_greatest_stretch", sets: 2, reps: "5/side" },
          { exerciseId: "lizard_pose", sets: 2, reps: "45s/side" },
          { exerciseId: "pigeon", sets: 2, reps: "60s/side" },
          { exerciseId: "saddle_pose", sets: 2, reps: "45s" },
          { exerciseId: "child_pose", sets: 2, reps: "60s" },
          { exerciseId: "thread_needle", sets: 2, reps: "45s/side" },
          { exerciseId: "supine_twist", sets: 2, reps: "45s/side" },
          { exerciseId: "happy_baby", sets: 1, reps: "60s" },
        ],
      },
    ],
  },
  {
    id: "stretch_hip_focus",
    category: "stretching",
    name: "Hip Mobility",
    description: "Open up hips, hamstrings, lower back.",
    complexity: "starter",
    blocks: [
      {
        title: "Hip Flow",
        scheme: "Hold 60s — 2 rounds",
        prescriptions: [
          { exerciseId: "couch_stretch", sets: 2, reps: "60s/side" },
          { exerciseId: "pigeon", sets: 2, reps: "60s/side" },
          { exerciseId: "lizard_pose", sets: 2, reps: "60s/side" },
          { exerciseId: "ninety_ninety", sets: 2, reps: "60s/side" },
          { exerciseId: "seated_forward_fold", sets: 2, reps: "60s" },
          { exerciseId: "happy_baby", sets: 2, reps: "60s" },
        ],
      },
    ],
  },

  // ============ ATHLETE ============
  {
    id: "athlete_power",
    category: "athlete",
    name: "Power & Speed",
    description: "Jumps, throws, sprints.",
    complexity: "pro",
    blocks: [
      {
        title: "Power",
        scheme: "5x3 — full rest",
        prescriptions: [
          { exerciseId: "box_jump", sets: 5, reps: "3", rest: "90s" },
          { exerciseId: "broad_jump", sets: 5, reps: "3", rest: "90s" },
        ],
      },
      {
        title: "Strength",
        scheme: "4x4",
        prescriptions: [
          { exerciseId: "power_clean", sets: 4, reps: "4", rpe: 7, rest: "2 min" },
          { exerciseId: "front_squat", sets: 4, reps: "4", rpe: 7, rest: "2 min" },
        ],
      },
      {
        title: "Sprints",
        scheme: "6 rounds",
        prescriptions: [{ exerciseId: "run", sets: 6, reps: "60m sprint", rest: "60s walk" }],
      },
    ],
  },
  {
    id: "athlete_multi",
    category: "athlete",
    name: "Multi-Plane",
    description: "Lateral, rotational, anti-rotation.",
    blocks: [
      {
        title: "Strength",
        scheme: "4 rounds",
        prescriptions: [
          { exerciseId: "cossack_squat", sets: 4, reps: "6/side", rest: "75s" },
          { exerciseId: "single_leg_rdl", sets: 4, reps: "8/side", rest: "60s" },
        ],
      },
      {
        title: "Rotation",
        scheme: "3 rounds",
        prescriptions: [
          { exerciseId: "med_ball_rotational_throw", sets: 3, reps: "8/side" },
          { exerciseId: "pallof_press", sets: 3, reps: "10/side" },
          { exerciseId: "turkish_getup", sets: 3, reps: "3/side" },
        ],
      },
    ],
  },

  // ============ BURN ============
  {
    id: "burn_intervals",
    category: "burn",
    name: "30-Min Burn",
    description: "Short, brutal, get sweaty.",
    blocks: [
      {
        title: "Burner",
        scheme: "5 rounds for time",
        note: "Cap 25 min",
        prescriptions: [
          { exerciseId: "row_500", sets: 5, reps: "500m" },
          { exerciseId: "kb_swing", sets: 5, reps: "20" },
          { exerciseId: "burpee", sets: 5, reps: "15" },
        ],
      },
    ],
  },
  {
    id: "burn_tabata",
    category: "burn",
    name: "Tabata Stack",
    description: "20s on / 10s off × 8 — repeat 4 stations.",
    blocks: [
      {
        title: "Tabata",
        scheme: "4 stations × 4 min each",
        prescriptions: [
          { exerciseId: "air_squat", sets: 8, reps: "20s on / 10s off" },
          { exerciseId: "burpee", sets: 8, reps: "20s on / 10s off" },
          { exerciseId: "kb_swing", sets: 8, reps: "20s on / 10s off" },
          { exerciseId: "double_under", sets: 8, reps: "20s on / 10s off" },
        ],
      },
    ],
  },

  // ============ RECOVERY ============
  {
    id: "recovery_zone2",
    category: "recovery",
    name: "Zone 2 + Mobility",
    description: "Easy aerobic, then open up.",
    complexity: "starter",
    blocks: [
      {
        title: "Aerobic",
        scheme: "Steady",
        prescriptions: [{ exerciseId: "easy_bike", sets: 1, reps: "20 min Z2", notes: "Conversational pace" }],
      },
      {
        title: "Mobility",
        scheme: "Hold 60s each",
        prescriptions: [
          { exerciseId: "foam_roll_back", sets: 1, reps: "2 min" },
          { exerciseId: "foam_roll_quads", sets: 1, reps: "2 min" },
          { exerciseId: "pigeon", sets: 1, reps: "60s/side" },
          { exerciseId: "thread_needle", sets: 1, reps: "45s/side" },
        ],
      },
    ],
  },

  // ============ BEACH (aesthetic) ============
  {
    id: "beach_arms_chest",
    category: "beach",
    name: "Arms + Chest",
    description: "Look the part. Pump days are not a sin.",
    blocks: [
      {
        title: "Chest",
        scheme: "Superset 4x10",
        prescriptions: [
          { exerciseId: "incline_db_press", sets: 4, reps: "10", rest: "60s" },
          { exerciseId: "db_bench", sets: 4, reps: "10", rest: "60s" },
        ],
      },
      {
        title: "Arms — DB superset",
        scheme: "Superset 4×12 (grab a pair of dumbbells)",
        prescriptions: [
          { exerciseId: "db_curl", sets: 4, reps: "12", rest: "45s" },
          { exerciseId: "hammer_curl", sets: 4, reps: "12", rest: "45s" },
          { exerciseId: "skullcrusher", sets: 4, reps: "12", rest: "45s" },
        ],
      },
      {
        title: "Triceps finisher",
        scheme: "4×12 straight",
        prescriptions: [
          { exerciseId: "tricep_pushdown", sets: 4, reps: "12", rest: "45s" },
        ],
      },
      {
        title: "Core",
        scheme: "3 rounds",
        prescriptions: [
          { exerciseId: "hanging_knee_raise", sets: 3, reps: "12" },
          { exerciseId: "russian_twist", sets: 3, reps: "20" },
          { exerciseId: "plank", sets: 3, reps: "60s" },
        ],
      },
    ],
  },
  {
    id: "beach_back_shoulders",
    category: "beach",
    name: "Back + Shoulders",
    description: "V-taper, wider, leaner.",
    blocks: [
      {
        title: "Back",
        scheme: "4x10",
        prescriptions: [
          { exerciseId: "pullup", sets: 4, reps: "AMRAP", rest: "90s" },
          { exerciseId: "seated_row", sets: 4, reps: "12", rest: "60s" },
          { exerciseId: "lat_pulldown", sets: 4, reps: "12", rest: "60s" },
        ],
      },
      {
        title: "Shoulders",
        scheme: "4 straight sets each",
        note: "Different equipment for each — no need to camp on a station.",
        prescriptions: [
          { exerciseId: "overhead_press", sets: 4, reps: "8", rest: "60s" },
          { exerciseId: "lateral_raise", sets: 4, reps: "15", rest: "45s" },
          { exerciseId: "face_pull", sets: 4, reps: "15", rest: "45s" },
        ],
      },
    ],
  },

  // ============ CARDIO ============
  {
    id: "cardio_z2",
    category: "cardio",
    name: "Zone 2",
    description: "Aerobic base. Nose breathing.",
    complexity: "starter",
    blocks: [
      {
        title: "Steady State",
        scheme: "Continuous",
        prescriptions: [{ exerciseId: "easy_bike", sets: 1, reps: "40 min", notes: "HR 130-150 — should be able to talk" }],
      },
    ],
  },
  // ============ CORE (dedicated category) ============
  {
    id: "core_galpin_pillar",
    category: "core",
    name: "Galpin 3-Pillar",
    description: "Anti-extension + anti-rotation + anti-lateral-flexion. The lumbar protection circuit.",
    philosophy:
      "Galpin frames the core as three protective functions, not 'abs'. Anti-extension (plank/dead bug), anti-rotation (Pallof/suitcase carry), and anti-lateral-flexion (side plank). Train all three and your lower back stops being the bottleneck.",
    influences: ["galpin"],
    blocks: [
      {
        title: "Anti-Extension",
        scheme: "3 rounds",
        prescriptions: [
          { exerciseId: "dead_bug", sets: 3, reps: "8/side", rest: "45s" },
          { exerciseId: "plank", sets: 3, reps: "45s", rest: "45s" },
        ],
      },
      {
        title: "Anti-Rotation",
        scheme: "3 rounds",
        prescriptions: [
          { exerciseId: "pallof_press", sets: 3, reps: "10/side", rest: "45s" },
          { exerciseId: "suitcase_carry", sets: 3, reps: "30m/side heavy", rest: "60s" },
        ],
      },
      {
        title: "Anti-Lateral-Flexion",
        scheme: "3 rounds",
        prescriptions: [
          { exerciseId: "side_plank", sets: 3, reps: "45s/side", rest: "30s" },
        ],
      },
    ],
  },
  {
    id: "core_aesthetic_pump",
    category: "core",
    name: "Aesthetic Pump",
    description: "Visual abs — leg raises, crunches, obliques. For when you want the look.",
    philosophy:
      "Pure aesthetic work. Done after the protection work is taken care of elsewhere — don't skip your anti-extension/anti-rotation days because of this.",
    influences: ["hemsworth"],
    blocks: [
      {
        title: "Upper Abs",
        scheme: "3 rounds",
        prescriptions: [
          { exerciseId: "cable_crunch", sets: 3, reps: "12", rest: "45s" },
          { exerciseId: "decline_situp", sets: 3, reps: "15", rest: "45s" },
        ],
      },
      {
        title: "Lower Abs",
        scheme: "3 rounds",
        prescriptions: [
          { exerciseId: "hanging_leg_raise", sets: 3, reps: "10", rest: "60s" },
          { exerciseId: "reverse_crunch", sets: 3, reps: "15", rest: "45s" },
        ],
      },
      {
        title: "Obliques",
        scheme: "3 rounds",
        prescriptions: [
          { exerciseId: "bicycle_crunch", sets: 3, reps: "20", rest: "30s" },
          { exerciseId: "russian_twist", sets: 3, reps: "20", rest: "30s" },
        ],
      },
    ],
  },
  {
    id: "core_quick_10",
    category: "core",
    name: "Quick 10-Min",
    description: "Compact circuit — every function in 10 minutes.",
    complexity: "starter",
    philosophy:
      "When you have 10 minutes. Hits all 3 protective functions plus one isolation move. Better than skipping.",
    influences: ["galpin"],
    blocks: [
      {
        title: "Circuit — 3 rounds, minimal rest",
        scheme: "3 rounds × 30s rest between rounds",
        prescriptions: [
          { exerciseId: "hollow_hold", sets: 3, reps: "30s" },
          { exerciseId: "pallof_press", sets: 3, reps: "8/side" },
          { exerciseId: "side_plank", sets: 3, reps: "30s/side" },
          { exerciseId: "hanging_knee_raise", sets: 3, reps: "10" },
        ],
      },
    ],
  },
  {
    id: "cardio_intervals",
    category: "cardio",
    name: "VO2 Max Intervals",
    description: "4x4 protocol. Hard.",
    complexity: "pro",
    blocks: [
      {
        title: "Warmup",
        scheme: "10 min easy",
        prescriptions: [{ exerciseId: "easy_bike", sets: 1, reps: "10 min progressive" }],
      },
      {
        title: "Intervals",
        scheme: "4x4 min @ 90-95% HRmax, 3 min easy between",
        prescriptions: [{ exerciseId: "run", sets: 4, reps: "4 min hard / 3 min easy" }],
      },
      {
        title: "Cooldown",
        scheme: "5 min easy",
        prescriptions: [{ exerciseId: "easy_bike", sets: 1, reps: "5 min" }],
      },
    ],
  },
];

// ============================================================
// PROTOCOL TEMPLATES — built from named coach frameworks
// ============================================================
TEMPLATES.push(
  // -------- GALPIN 3-5 STRENGTH (general framework) --------
  {
    id: "galpin_3_5_upper",
    category: "strength",
    name: "Galpin 3-5 — Upper Push/Pull",
    description: "3-5 reps, 3-5 sets, 3-5 min rest, 3-5 exercises. Pure strength.",
    complexity: "pro",
    philosophy:
      "Andy Galpin's 3-5 framework: 3-5 reps per set × 3-5 sets × 3-5 min rest × 3-5 exercises × 3-5 days/wk. Heavy load, long rest, near maximal intent.",
    influences: ["galpin", "huberman"],
    blocks: [
      {
        title: "Main — High-Velocity Force",
        scheme: "5×3 @ 80-85% 1RM — rest 3 min",
        prescriptions: [
          { exerciseId: "bench_press", sets: 5, reps: "3", rpe: 8, rest: "3 min", loadHint: "@ 80-85% 1RM — fast bar speed" },
        ],
      },
      {
        title: "Vertical Pull",
        scheme: "5×3 @ 9 RPE — rest 3 min",
        prescriptions: [
          { exerciseId: "weighted_pullup", sets: 5, reps: "3", rpe: 9, rest: "3 min", loadHint: "@ ~85% 1RM" },
        ],
      },
      {
        title: "Posture-Supporting Strength",
        scheme: "3×5",
        prescriptions: [
          { exerciseId: "overhead_press", sets: 3, reps: "5", rpe: 8, rest: "2 min" },
        ],
      },
      {
        title: "Hypertrophy for Symmetry",
        scheme: "3-4 sets",
        prescriptions: [
          { exerciseId: "barbell_row", sets: 4, reps: "6", rpe: 8, rest: "90s" },
          { exerciseId: "skullcrusher", sets: 3, reps: "10", rest: "60s" },
        ],
      },
    ],
  },
  {
    id: "galpin_3_5_lower",
    category: "strength",
    name: "Galpin 3-5 — Lower Power",
    description: "Heavy squat + plyo + posterior chain, Galpin's RFD focus.",
    complexity: "pro",
    philosophy:
      "Power & strength on the same day — heavy compound, then plyometric for rate-of-force-development, then knee-health/posterior-chain accessories. From Andy Galpin's athletic performance template.",
    influences: ["galpin"],
    blocks: [
      {
        title: "Power Development",
        scheme: "4×3 — full rest",
        prescriptions: [
          { exerciseId: "hang_clean", sets: 4, reps: "3", rpe: 7, rest: "2-3 min", loadHint: "@ ~80% 1RM, focus on bar speed" },
          { exerciseId: "seated_box_jump", sets: 4, reps: "5", rest: "as needed" },
        ],
      },
      {
        title: "Strength for High-Velocity Force",
        scheme: "5×3 @ 80% 1RM",
        prescriptions: [
          { exerciseId: "back_squat", sets: 5, reps: "3", rpe: 8, rest: "3 min", loadHint: "@ 80-85% 1RM" },
        ],
      },
      {
        title: "Knee Health for Speed",
        scheme: "3 rounds",
        prescriptions: [
          { exerciseId: "nordic_leg_curl", sets: 3, reps: "8", rpe: 9, rest: "90s" },
          { exerciseId: "single_leg_squat_counter", sets: 3, reps: "6/side", rest: "60s" },
        ],
      },
      {
        title: "Posture-Supporting Strength",
        scheme: "3×5",
        prescriptions: [
          { exerciseId: "overhead_squat", sets: 3, reps: "5", rpe: 8, rest: "2 min" },
        ],
      },
    ],
  },

  // -------- GALPIN ATHLETIC SPEED DAY --------
  {
    id: "galpin_athletic_speed",
    category: "athlete",
    name: "Galpin Speed Day",
    description: "Sprints, plyos, power cleans. Practice the thing.",
    complexity: "pro",
    philosophy:
      'Galpin: "To get really good at something you need to do that thing." Sprint every workout. Power before strength, strength before hypertrophy.',
    influences: ["galpin"],
    blocks: [
      {
        title: "Sprint Prep",
        scheme: "3 progressive sprints",
        prescriptions: [
          { exerciseId: "sprint", sets: 3, reps: "20m @ RPE 8-10", rest: "2 min" },
        ],
      },
      {
        title: "Plyometric Power",
        scheme: "4×4 — full rest",
        prescriptions: [
          { exerciseId: "depth_jump_24", sets: 4, reps: "3", rest: "90s" },
          { exerciseId: "linear_bound_stabilize", sets: 4, reps: "4 stabilizations/side", rest: "60s" },
        ],
      },
      {
        title: "Power Development",
        scheme: "4×3",
        prescriptions: [
          { exerciseId: "hang_clean", sets: 4, reps: "3", rpe: 7, rest: "2 min", loadHint: "@ 80% 1RM, fast" },
        ],
      },
      {
        title: "Knee Health",
        scheme: "3 rounds",
        prescriptions: [
          { exerciseId: "single_leg_squat_counter", sets: 3, reps: "6/side", rest: "60s" },
          { exerciseId: "nordic_leg_curl", sets: 3, reps: "8", rpe: 9, rest: "60s" },
          { exerciseId: "ankle_strengthening_series", sets: 3, reps: "8/side" },
        ],
      },
    ],
  },

  // -------- ATTIA ZONE 2 (cardio) --------
  {
    id: "attia_zone2_45",
    category: "cardio",
    name: "Attia Zone 2 — 45 min",
    description: "Aerobic base. Conversational pace, lactate < 2 mmol/L.",
    complexity: "starter",
    philosophy:
      "Peter Attia's Zone 2: highest output you can sustain while keeping blood lactate < 2 mmol/L — you should be able to speak in full sentences. Builds mitochondrial density. Aim for 180+ min/week.",
    influences: ["attia", "huberman"],
    blocks: [
      {
        title: "Steady State",
        scheme: "Continuous, nose breathing if possible",
        prescriptions: [
          { exerciseId: "easy_bike", sets: 1, reps: "45 min Z2", notes: "If you stop being able to talk, slow down." },
        ],
      },
    ],
  },

  // -------- ATTIA 4×4 VO2 MAX --------
  {
    id: "attia_4x4_vo2",
    category: "cardio",
    name: "Attia 4×4 VO2 Max",
    description: "Norwegian 4×4 — 4 min hard / 3 min easy × 4.",
    complexity: "pro",
    philosophy:
      "VO2 max is one of the strongest predictors of all-cause mortality — moving from 'low' to 'below average' drops mortality risk ~50% (Attia). 4×4 done weekly drives this metric harder than steady state.",
    influences: ["attia", "patrick"],
    blocks: [
      {
        title: "Warmup",
        scheme: "10 min progressive",
        prescriptions: [{ exerciseId: "easy_bike", sets: 1, reps: "10 min ramp" }],
      },
      {
        title: "Intervals",
        scheme: "4 × (4 min @ 90-95% HRmax / 3 min easy)",
        prescriptions: [
          { exerciseId: "run", sets: 4, reps: "4 min hard / 3 min easy", notes: "Should feel hard by min 3" },
        ],
      },
      {
        title: "Cooldown",
        scheme: "5 min",
        prescriptions: [{ exerciseId: "easy_bike", sets: 1, reps: "5 min easy" }],
      },
    ],
  },

  // -------- HUBERMAN HYPERTROPHY (30 min) --------
  {
    id: "huberman_hypertrophy",
    category: "hypertrophy",
    name: "Huberman Hypertrophy — 30 min",
    description: "Compact pull/push superset to failure.",
    philosophy:
      "Hypertrophy lives in 8-30 reps with proximity to failure (Huberman/Galpin). Less rest than strength work — 60-90s is enough. Progressive overload over weeks.",
    influences: ["huberman", "galpin"],
    blocks: [
      {
        title: "Compound Superset",
        scheme: "Superset 4 rounds",
        prescriptions: [
          { exerciseId: "incline_db_press", sets: 4, reps: "10-12", rpe: 8, rest: "60s" },
          { exerciseId: "pullup", sets: 4, reps: "AMRAP", rpe: 9, rest: "60s" },
        ],
      },
      {
        title: "Single-Joint",
        scheme: "Superset 3 rounds",
        prescriptions: [
          { exerciseId: "db_curl", sets: 3, reps: "12", rest: "45s" },
          { exerciseId: "skullcrusher", sets: 3, reps: "12", rest: "45s" },
          { exerciseId: "lateral_raise", sets: 3, reps: "15", rest: "30s" },
        ],
      },
    ],
  },

  // -------- HEMSWORTH-STYLE FUNCTIONAL --------
  {
    id: "hemsworth_functional",
    category: "athlete",
    name: "Functional Aesthetic Circuit",
    description: "Hemsworth/Centr-style — strength, power, density.",
    philosophy:
      "Functional + aesthetic — pull-ups, push, hinge, carry. Train like an athlete, look like one too. Inspired by Chris Hemsworth's Centr programming.",
    influences: ["hemsworth"],
    blocks: [
      {
        title: "Strength Triplet",
        scheme: "4 rounds — pullup bar + DBs",
        note: "Set up one pullup station + DBs. Do RDL with DBs (single-leg or Romanian).",
        prescriptions: [
          { exerciseId: "weighted_pullup", sets: 4, reps: "5", rpe: 8, rest: "60s" },
          { exerciseId: "incline_db_press", sets: 4, reps: "8", rpe: 8, rest: "60s" },
          { exerciseId: "single_leg_rdl", sets: 4, reps: "8/side", rpe: 8, rest: "60s" },
        ],
      },
      {
        title: "Density Finisher",
        scheme: "AMRAP 8 min",
        prescriptions: [
          { exerciseId: "kb_swing", sets: 1, reps: "15" },
          { exerciseId: "burpee", sets: 1, reps: "10" },
          { exerciseId: "pullup", sets: 1, reps: "5" },
        ],
      },
    ],
  },

  // -------- PATRICK 4-MODALITY (catch-all weekly check) --------
  // ============ TEST DAY ============
  {
    id: "test_strength_1rm",
    category: "test",
    name: "Strength Test Day",
    description: "Retest your 1RM. Bench, squat, deadlift.",
    philosophy:
      "Every 6-8 weeks: retest to know. Without measurement, you're guessing whether the work is working. Rest full — you want max effort per lift, not fatigue accumulation.",
    influences: ["galpin"],
    blocks: [
      {
        title: "Warmup up to working weight",
        scheme: "5 → 3 → 1 progressive",
        note: "Long warmup — you're hunting 1RM. Rest 3+ min between working sets.",
        prescriptions: [
          { exerciseId: "bench_press", sets: 1, reps: "1RM attempt", rest: "5 min" },
          { exerciseId: "back_squat", sets: 1, reps: "1RM attempt", rest: "5 min" },
          { exerciseId: "deadlift", sets: 1, reps: "1RM attempt", rest: "5 min" },
        ],
      },
      {
        title: "Log to Benchmarks",
        scheme: "After the workout",
        note: "Head to Profile → Benchmarks and record your numbers.",
        prescriptions: [],
      },
    ],
  },
  {
    id: "test_athletic",
    category: "test",
    name: "Athletic Test Day",
    description: "Jumps, hang, farmer carry, pull-ups.",
    philosophy:
      "Attia's Centenarian Decathlon in action: dead hang, farmer carry, jump height, pull-up max. These predict function into your 80s better than any powerlifting number.",
    influences: ["attia", "galpin"],
    blocks: [
      {
        title: "Warmup",
        scheme: "10 min general",
        prescriptions: [
          { exerciseId: "jumping_jacks", sets: 1, reps: "2 min" },
          { exerciseId: "world_greatest_stretch", sets: 1, reps: "5/side" },
          { exerciseId: "shoulder_cars", sets: 1, reps: "5/side" },
        ],
      },
      {
        title: "Power tests",
        scheme: "3 attempts each — full rest",
        prescriptions: [
          { exerciseId: "broad_jump", sets: 3, reps: "1 max attempt", rest: "2 min" },
          { exerciseId: "seated_box_jump", sets: 3, reps: "1 max attempt", rest: "2 min" },
        ],
      },
      {
        title: "Strength endurance",
        scheme: "Max effort",
        prescriptions: [
          { exerciseId: "pullup", sets: 1, reps: "Max unbroken", rest: "as needed" },
          { exerciseId: "farmer_carry", sets: 1, reps: "Bodyweight × 2 → longest hold" },
        ],
      },
    ],
  },
  {
    id: "test_endurance",
    category: "test",
    name: "Endurance Test Day",
    description: "Cooper 12-min run.",
    philosophy:
      "12 minutes at max sustainable pace = tight VO2 max proxy. Attia's litmus test for aerobic capacity — the single strongest predictor of all-cause mortality.",
    influences: ["attia", "patrick"],
    blocks: [
      {
        title: "Warmup",
        scheme: "10 min progressive",
        prescriptions: [
          { exerciseId: "easy_bike", sets: 1, reps: "5 min easy" },
          { exerciseId: "run", sets: 1, reps: "5 min easy → tempo" },
        ],
      },
      {
        title: "12-Min Cooper Run",
        scheme: "12 min sustained max pace",
        note: "Cover as much ground as you can in exactly 12 minutes. Log distance to Benchmarks.",
        prescriptions: [
          { exerciseId: "run", sets: 1, reps: "12 min max sustained" },
        ],
      },
      {
        title: "Cooldown",
        scheme: "5 min walk",
        prescriptions: [
          { exerciseId: "run", sets: 1, reps: "5 min walk-jog" },
        ],
      },
    ],
  },
  {
    id: "patrick_hiit_squat_jumps",
    category: "burn",
    name: "Patrick HIIT — Squat Jumps",
    description: "Mitochondrial biogenesis. Hard but short.",
    philosophy:
      "Dr. Rhonda Patrick's HIIT day — drives mitochondrial biogenesis, the source of cellular energy and a marker that declines with age. Short, hard, frequent.",
    influences: ["patrick"],
    blocks: [
      {
        title: "Squat Jump Intervals",
        scheme: "6 rounds — 30s on / 90s off",
        prescriptions: [
          { exerciseId: "broad_jump", sets: 6, reps: "30s max effort", rest: "90s" },
        ],
      },
      {
        title: "Spin Finisher",
        scheme: "10 × (1 min hard / 1 min easy)",
        prescriptions: [
          { exerciseId: "bike_erg", sets: 10, reps: "1 min hard / 1 min easy" },
        ],
      },
    ],
  },
);

// ============================================================
// SPLIT — bro / bodybuilding split templates
// Pick your day: push/pull/legs OR chest/back/shoulders/arms/full-body
// ============================================================
TEMPLATES.push(
  {
    id: "split_push",
    category: "split",
    name: "Push",
    description: "Chest, shoulders, triceps. Compound + accessories.",
    influences: ["hemsworth", "general"],
    blocks: [
      {
        title: "Main Compound",
        scheme: "4×6-8 — rest 2 min",
        prescriptions: [
          { exerciseId: "bench_press", sets: 4, reps: "6-8", rpe: 8, rest: "2 min" },
        ],
      },
      {
        title: "Secondary Press",
        scheme: "4×8-10 — rotates",
        prescriptions: [
          {
            exerciseId: "incline_db_press",
            pool: ["incline_db_press", "db_bench", "weighted_dip"],
            sets: 4,
            reps: "8-10",
            rpe: 8,
            rest: "90s",
          },
          {
            exerciseId: "overhead_press",
            pool: ["overhead_press", "lateral_raise", "incline_db_press"],
            sets: 3,
            reps: "8",
            rpe: 8,
            rest: "90s",
          },
        ],
      },
      {
        title: "Isolation",
        scheme: "3×12-15 — rotates weekly",
        note: "Accessories pick from a pool — variety without changing the pattern.",
        prescriptions: [
          {
            exerciseId: "lateral_raise",
            // Push-day isolation — push family only.
            pool: ["lateral_raise", "cable_lateral_raise", "front_raise", "cable_fly", "pec_deck"],
            sets: 3,
            reps: "15",
            rest: "45s",
          },
          {
            exerciseId: "tricep_pushdown",
            pool: ["tricep_pushdown", "skullcrusher", "overhead_tricep_extension", "rope_pushdown", "tricep_kickback"],
            sets: 3,
            reps: "12",
            rest: "45s",
          },
        ],
      },
    ],
  },
  {
    id: "split_pull",
    category: "split",
    name: "Pull",
    description: "Back, biceps, rear delts. Width + thickness.",
    influences: ["hemsworth", "general"],
    blocks: [
      {
        title: "Main Compound",
        scheme: "4×6-8 — rest 2 min",
        prescriptions: [
          { exerciseId: "pullup", sets: 4, reps: "AMRAP", rpe: 9, rest: "2 min" },
        ],
      },
      {
        title: "Rows",
        scheme: "4×8-10 — rotates",
        prescriptions: [
          {
            exerciseId: "barbell_row",
            pool: ["barbell_row", "db_row", "seated_row"],
            sets: 4,
            reps: "8-10",
            rpe: 8,
            rest: "90s",
          },
          {
            exerciseId: "seated_row",
            pool: ["seated_row", "lat_pulldown"],
            sets: 3,
            reps: "10",
            rpe: 8,
            rest: "75s",
          },
        ],
      },
      {
        title: "Isolation",
        scheme: "3×12-15 — rotates weekly",
        prescriptions: [
          {
            exerciseId: "lat_pulldown",
            // Pull isolation — lats + rear delts.
            pool: ["lat_pulldown", "straight_arm_pulldown", "db_pullover", "face_pull", "reverse_pec_deck", "bent_over_lateral_raise"],
            sets: 3,
            reps: "12",
            rest: "60s",
          },
          {
            exerciseId: "db_curl",
            pool: ["db_curl", "hammer_curl", "barbell_curl", "ez_bar_curl", "incline_db_curl", "cable_curl", "preacher_curl"],
            sets: 3,
            reps: "12",
            rest: "45s",
          },
        ],
      },
    ],
  },
  {
    id: "split_legs",
    category: "split",
    name: "Legs",
    description: "Quads, hamstrings, glutes, calves. Full lower.",
    influences: ["hemsworth", "general"],
    blocks: [
      {
        title: "Main Compound",
        scheme: "4×6-8 — rest 2-3 min",
        prescriptions: [
          { exerciseId: "back_squat", sets: 4, reps: "6-8", rpe: 8, rest: "2-3 min" },
        ],
      },
      {
        title: "Posterior Chain",
        scheme: "4×8 — rotates",
        prescriptions: [
          {
            exerciseId: "romanian_deadlift",
            pool: ["romanian_deadlift", "single_leg_rdl", "hip_thrust"],
            sets: 4,
            reps: "8",
            rpe: 8,
            rest: "2 min",
          },
          {
            exerciseId: "leg_curl",
            pool: ["leg_curl", "nordic_leg_curl", "glute_bridge"],
            sets: 3,
            reps: "12",
            rest: "75s",
          },
        ],
      },
      {
        title: "Quad + Accessory",
        scheme: "3 rounds — rotates weekly",
        prescriptions: [
          {
            exerciseId: "leg_press",
            pool: ["leg_press", "bulgarian_split_squat", "step_up"],
            sets: 3,
            reps: "12",
            rest: "75s",
          },
          {
            exerciseId: "walking_lunge",
            pool: ["walking_lunge", "cossack_squat", "leg_extension"],
            sets: 3,
            reps: "20 steps",
            rest: "60s",
          },
          { exerciseId: "calf_raise", sets: 4, reps: "15", rest: "45s" },
        ],
      },
    ],
  },
  {
    id: "split_chest",
    category: "split",
    name: "Chest Day",
    description: "Chest-focused bro day. High volume on pecs.",
    influences: ["hemsworth"],
    blocks: [
      {
        title: "Main",
        scheme: "4×8",
        prescriptions: [
          { exerciseId: "bench_press", sets: 4, reps: "8", rpe: 8, rest: "2 min" },
          { exerciseId: "incline_db_press", sets: 4, reps: "10", rpe: 8, rest: "90s" },
        ],
      },
      {
        title: "Volume",
        scheme: "3×12",
        prescriptions: [
          { exerciseId: "db_bench", sets: 3, reps: "12", rest: "75s" },
        ],
      },
      {
        title: "Finisher",
        scheme: "Drop set",
        prescriptions: [
          { exerciseId: "weighted_dip", sets: 3, reps: "AMRAP", rest: "60s" },
        ],
      },
    ],
  },
  {
    id: "split_back",
    category: "split",
    name: "Back Day",
    description: "Back-focused. Width above, thickness below.",
    influences: ["hemsworth"],
    blocks: [
      {
        title: "Width",
        scheme: "4×8-10",
        prescriptions: [
          { exerciseId: "pullup", sets: 4, reps: "AMRAP", rpe: 9, rest: "2 min" },
          { exerciseId: "lat_pulldown", sets: 4, reps: "10-12", rpe: 8, rest: "75s" },
        ],
      },
      {
        title: "Thickness",
        scheme: "4×8",
        prescriptions: [
          { exerciseId: "barbell_row", sets: 4, reps: "8", rpe: 8, rest: "90s" },
          { exerciseId: "seated_row", sets: 3, reps: "12", rest: "75s" },
          { exerciseId: "db_row", sets: 3, reps: "10/side", rest: "60s" },
        ],
      },
      {
        title: "Finisher",
        scheme: "2 sets",
        prescriptions: [
          { exerciseId: "face_pull", sets: 2, reps: "20", rest: "45s" },
        ],
      },
    ],
  },
  {
    id: "split_shoulders",
    category: "split",
    name: "Shoulders Day",
    description: "Front, side, rear delts. 3D shoulders.",
    influences: ["hemsworth"],
    blocks: [
      {
        title: "Main",
        scheme: "5×5",
        prescriptions: [
          { exerciseId: "overhead_press", sets: 5, reps: "5", rpe: 8, rest: "2 min" },
        ],
      },
      {
        title: "Volume",
        scheme: "4×10-12",
        prescriptions: [
          { exerciseId: "lateral_raise", sets: 4, reps: "12", rest: "60s" },
          { exerciseId: "incline_db_press", sets: 3, reps: "10", rest: "75s" },
        ],
      },
      {
        title: "Rear Delts",
        scheme: "3×15",
        prescriptions: [
          { exerciseId: "face_pull", sets: 3, reps: "15", rest: "45s" },
          { exerciseId: "band_pull_apart", sets: 3, reps: "20", rest: "30s" },
        ],
      },
    ],
  },
  {
    id: "split_arms",
    category: "split",
    name: "Arms Day",
    description: "Biceps + triceps. Pump city.",
    influences: ["hemsworth"],
    blocks: [
      {
        title: "Compound Arms",
        scheme: "Superset 4×8",
        prescriptions: [
          { exerciseId: "chinup", sets: 4, reps: "AMRAP", rpe: 9, rest: "90s" },
          { exerciseId: "weighted_dip", sets: 4, reps: "8", rpe: 8, rest: "90s" },
        ],
      },
      {
        title: "Biceps",
        scheme: "Superset 3×10-12",
        prescriptions: [
          {
            exerciseId: "db_curl",
            pool: ["db_curl", "barbell_curl", "ez_bar_curl", "incline_db_curl", "preacher_curl"],
            sets: 3,
            reps: "12",
            rest: "45s",
          },
          {
            exerciseId: "hammer_curl",
            pool: ["hammer_curl", "cable_curl", "concentration_curl"],
            sets: 3,
            reps: "12",
            rest: "45s",
          },
        ],
      },
      {
        title: "Triceps",
        scheme: "3×10-12 straight sets",
        note: "Pushdown uses the cable, skullcrusher uses DBs — do one, then the other.",
        prescriptions: [
          {
            exerciseId: "tricep_pushdown",
            pool: ["tricep_pushdown", "rope_pushdown", "close_grip_bench"],
            sets: 3,
            reps: "12",
            rest: "45s",
          },
          {
            exerciseId: "skullcrusher",
            pool: ["skullcrusher", "overhead_tricep_extension", "tricep_kickback", "jm_press"],
            sets: 3,
            reps: "12",
            rest: "45s",
          },
        ],
      },
    ],
  },
  {
    id: "split_full_body",
    category: "split",
    name: "Full Body",
    description: "One compound per pattern. Efficient.",
    influences: ["general", "galpin"],
    blocks: [
      {
        title: "Squat",
        scheme: "4×6",
        prescriptions: [
          { exerciseId: "back_squat", sets: 4, reps: "6", rpe: 8, rest: "2 min" },
        ],
      },
      {
        title: "Hinge",
        scheme: "3×6",
        prescriptions: [
          { exerciseId: "deadlift", sets: 3, reps: "6", rpe: 8, rest: "2 min" },
        ],
      },
      {
        title: "Push + Pull",
        scheme: "Superset 4×8",
        prescriptions: [
          { exerciseId: "bench_press", sets: 4, reps: "8", rpe: 8, rest: "90s" },
          { exerciseId: "pullup", sets: 4, reps: "AMRAP", rpe: 9, rest: "90s" },
        ],
      },
    ],
  },
);

export function templatesFor(category: Category): Template[] {
  return TEMPLATES.filter((t) => t.category === category);
}

export function findTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
