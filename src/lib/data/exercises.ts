import type { Exercise } from "../types";

export const EXERCISES: Exercise[] = [
  // ---------- WARMUP: LOWER BACK ----------
  { id: "cat_cow", name: "Cat-Cow", pattern: "mobility", muscles: ["spine"], equipment: ["mat"], weighted: false, warmupTarget: "lower_back", cues: ["Breathe with each phase", "Articulate one vertebra at a time"] },
  { id: "dead_bug", name: "Dead Bug", pattern: "core", muscles: ["core"], equipment: ["mat"], weighted: false, warmupTarget: "lower_back", cues: ["Low back pressed into floor", "Exhale as limbs extend"] },
  { id: "bird_dog", name: "Bird Dog", pattern: "core", muscles: ["core", "glutes"], equipment: ["mat"], weighted: false, warmupTarget: "lower_back", cues: ["Long spine", "Square the hips"] },
  { id: "glute_bridge", name: "Glute Bridge", pattern: "hinge", muscles: ["glutes", "hamstrings"], equipment: ["mat"], weighted: false, warmupTarget: "lower_back", cues: ["Squeeze glutes at top", "Posterior pelvic tilt"] },
  { id: "mckenzie_press_up", name: "McKenzie Press-Up", pattern: "mobility", muscles: ["spine"], equipment: ["mat"], weighted: false, warmupTarget: "lower_back", cues: ["Hips stay down", "Decompress spine"] },
  { id: "supine_knee_hug", name: "Supine Knee Hug", pattern: "mobility", muscles: ["lower_back", "glutes"], equipment: ["mat"], weighted: false, warmupTarget: "lower_back" },

  // ---------- WARMUP: HIP ----------
  { id: "world_greatest_stretch", name: "World's Greatest Stretch", pattern: "mobility", muscles: ["hip", "thoracic"], equipment: ["bodyweight"], weighted: false, warmupTarget: "hip" },
  { id: "hip_cars", name: "Hip CARs", pattern: "mobility", muscles: ["hip"], equipment: ["bodyweight"], weighted: false, warmupTarget: "hip", cues: ["Slow controlled circles", "Full range both directions"] },
  { id: "ninety_ninety", name: "90/90 Hip Switch", pattern: "mobility", muscles: ["hip"], equipment: ["mat"], weighted: false, warmupTarget: "hip" },
  { id: "pigeon", name: "Pigeon Pose", pattern: "mobility", muscles: ["glutes", "hip"], equipment: ["mat"], weighted: false, warmupTarget: "hip" },
  { id: "couch_stretch", name: "Couch Stretch", pattern: "mobility", muscles: ["hip_flexor", "quads"], equipment: ["mat"], weighted: false, warmupTarget: "hip" },
  { id: "cossack_squat", name: "Cossack Squat", pattern: "mobility", muscles: ["adductors", "hip"], equipment: ["bodyweight"], weighted: false, warmupTarget: "hip" },

  // ---------- WARMUP: SHOULDER ----------
  { id: "shoulder_cars", name: "Shoulder CARs", pattern: "mobility", muscles: ["shoulder"], equipment: ["bodyweight"], weighted: false, warmupTarget: "shoulder" },
  { id: "band_pull_apart", name: "Band Pull-Apart", pattern: "pull", muscles: ["rear_delt", "rhomboid"], equipment: ["band"], weighted: false, warmupTarget: "shoulder" },
  { id: "scap_pushup", name: "Scap Push-Up", pattern: "push", muscles: ["serratus"], equipment: ["bodyweight"], weighted: false, warmupTarget: "shoulder" },
  { id: "wall_slide", name: "Wall Slide", pattern: "mobility", muscles: ["shoulder", "thoracic"], equipment: ["bodyweight"], weighted: false, warmupTarget: "shoulder" },
  { id: "prone_ytw", name: "Prone Y-T-W", pattern: "mobility", muscles: ["rear_delt", "rotator_cuff"], equipment: ["mat"], weighted: false, warmupTarget: "shoulder" },
  { id: "thoracic_opener", name: "Thoracic Opener (Open Book)", pattern: "mobility", muscles: ["thoracic"], equipment: ["mat"], weighted: false, warmupTarget: "shoulder" },

  // ---------- WARMUP: GENERAL ----------
  { id: "jumping_jacks", name: "Jumping Jacks", pattern: "conditioning", muscles: ["full_body"], equipment: ["bodyweight"], weighted: false, warmupTarget: "general" },
  { id: "easy_row", name: "Easy Row", pattern: "conditioning", muscles: ["full_body"], equipment: ["rower"], weighted: false, warmupTarget: "general" },
  { id: "easy_bike", name: "Easy Bike", pattern: "conditioning", muscles: ["legs"], equipment: ["bike"], weighted: false, warmupTarget: "general" },
  { id: "air_squat", name: "Air Squat", pattern: "squat", muscles: ["quads", "glutes"], equipment: ["bodyweight"], weighted: false, warmupTarget: "general" },
  { id: "inchworm", name: "Inchworm", pattern: "mobility", muscles: ["hamstrings", "shoulder"], equipment: ["bodyweight"], weighted: false, warmupTarget: "general" },

  // ---------- STRENGTH / HYPERTROPHY: COMPOUNDS ----------
  { id: "back_squat", name: "Back Squat", pattern: "squat", muscles: ["quads", "glutes", "back"], equipment: ["barbell"], weighted: true, cues: ["Brace 360", "Knees track over toes", "Hips and chest rise together"] },
  { id: "front_squat", name: "Front Squat", pattern: "squat", muscles: ["quads", "core"], equipment: ["barbell"], weighted: true, cues: ["Elbows high", "Stay tall"] },
  { id: "deadlift", name: "Deadlift", pattern: "hinge", muscles: ["posterior_chain"], equipment: ["barbell"], weighted: true, cues: ["Lats engaged", "Push the floor away", "Hips and shoulders rise together"] },
  { id: "romanian_deadlift", name: "Romanian Deadlift", pattern: "hinge", muscles: ["hamstrings", "glutes"], equipment: ["barbell"], weighted: true, cues: ["Soft knees", "Push hips back", "Bar close to legs"] },
  { id: "bench_press", name: "Bench Press", pattern: "push", muscles: ["chest", "tris", "front_delt"], equipment: ["barbell"], weighted: true, cues: ["Feet planted", "Slight arch", "Bar to lower chest"] },
  { id: "overhead_press", name: "Overhead Press", pattern: "push", muscles: ["shoulder", "tris"], equipment: ["barbell"], weighted: true, cues: ["Glutes tight", "Press through the bar"] },
  { id: "weighted_pullup", name: "Weighted Pull-Up", pattern: "pull", muscles: ["lats", "biceps"], equipment: ["pullup_bar"], weighted: true },
  { id: "pullup", name: "Pull-Up", pattern: "pull", muscles: ["lats", "biceps"], equipment: ["pullup_bar"], weighted: false },
  { id: "chinup", name: "Chin-Up", pattern: "pull", muscles: ["lats", "biceps"], equipment: ["pullup_bar"], weighted: false },
  { id: "barbell_row", name: "Barbell Row", pattern: "pull", muscles: ["back", "rear_delt"], equipment: ["barbell"], weighted: true },
  { id: "weighted_dip", name: "Weighted Dip", pattern: "push", muscles: ["chest", "tris"], equipment: ["bodyweight"], weighted: true },

  // ---------- ACCESSORY ----------
  { id: "db_bench", name: "Dumbbell Bench Press", pattern: "push", muscles: ["chest", "tris"], equipment: ["dumbbell"], weighted: true },
  { id: "db_row", name: "Dumbbell Row", pattern: "pull", muscles: ["back"], equipment: ["dumbbell"], weighted: true },
  { id: "incline_db_press", name: "Incline DB Press", pattern: "push", muscles: ["upper_chest"], equipment: ["dumbbell"], weighted: true },
  { id: "lat_pulldown", name: "Lat Pulldown", pattern: "pull", muscles: ["lats"], equipment: ["machine"], weighted: true },
  { id: "seated_row", name: "Seated Cable Row", pattern: "pull", muscles: ["back"], equipment: ["machine"], weighted: true },
  { id: "leg_press", name: "Leg Press", pattern: "squat", muscles: ["quads", "glutes"], equipment: ["machine"], weighted: true },
  { id: "leg_curl", name: "Leg Curl", pattern: "hinge", muscles: ["hamstrings"], equipment: ["machine"], weighted: true },
  { id: "leg_extension", name: "Leg Extension", pattern: "squat", muscles: ["quads"], equipment: ["machine"], weighted: true },
  { id: "walking_lunge", name: "Walking Lunge", pattern: "lunge", muscles: ["quads", "glutes"], equipment: ["dumbbell"], weighted: true },
  { id: "bulgarian_split_squat", name: "Bulgarian Split Squat", pattern: "lunge", muscles: ["quads", "glutes"], equipment: ["dumbbell"], weighted: true },
  { id: "step_up", name: "Step-Up", pattern: "lunge", muscles: ["quads", "glutes"], equipment: ["dumbbell", "box"], weighted: true },
  { id: "hip_thrust", name: "Hip Thrust", pattern: "hinge", muscles: ["glutes"], equipment: ["barbell"], weighted: true },
  { id: "db_curl", name: "Dumbbell Curl", pattern: "pull", muscles: ["biceps"], equipment: ["dumbbell"], weighted: true },
  { id: "hammer_curl", name: "Hammer Curl", pattern: "pull", muscles: ["biceps", "forearms"], equipment: ["dumbbell"], weighted: true },
  { id: "tricep_pushdown", name: "Tricep Pushdown", pattern: "push", muscles: ["tris"], equipment: ["machine"], weighted: true },
  { id: "skullcrusher", name: "Skullcrusher", pattern: "push", muscles: ["tris"], equipment: ["dumbbell"], weighted: true },
  { id: "lateral_raise", name: "Lateral Raise", pattern: "push", muscles: ["side_delt"], equipment: ["dumbbell"], weighted: true },
  { id: "face_pull", name: "Face Pull", pattern: "pull", muscles: ["rear_delt"], equipment: ["band", "machine"], weighted: true },
  { id: "calf_raise", name: "Calf Raise", pattern: "push", muscles: ["calves"], equipment: ["machine", "dumbbell"], weighted: true },

  // ---------- CORE — tagged by function (Galpin 3-part + isolation) ----------
  // Anti-extension — resist spine arching back (protects lumbar under load)
  { id: "plank", name: "Plank", pattern: "core", muscles: ["core"], equipment: ["mat"], weighted: false, coreFunction: "anti_extension", cues: ["Glutes squeezed", "Long neutral spine"] },
  { id: "hollow_hold", name: "Hollow Hold", pattern: "core", muscles: ["core"], equipment: ["mat"], weighted: false, coreFunction: "anti_extension", cues: ["Low back pressed into floor"] },
  { id: "ab_wheel_rollout", name: "Ab Wheel Rollout", pattern: "core", muscles: ["core"], equipment: ["bodyweight"], weighted: false, coreFunction: "anti_extension", cues: ["Squeeze glutes", "Tuck pelvis", "No lumbar extension"] },

  // Anti-rotation — resist twist (the most underrated core work)
  { id: "pallof_press", name: "Pallof Press", pattern: "core", muscles: ["core", "obliques"], equipment: ["band"], weighted: false, coreFunction: "anti_rotation", cues: ["Resist the pull", "Slow extension"] },
  { id: "suitcase_carry", name: "Suitcase Carry (1 arm)", pattern: "carry", muscles: ["core", "obliques", "grip"], equipment: ["dumbbell", "kettlebell"], weighted: true, coreFunction: "anti_rotation", cues: ["Don't lean", "Stay tall"] },
  { id: "single_arm_farmer_carry", name: "Single-Arm Farmer Carry", pattern: "carry", muscles: ["core", "obliques", "grip"], equipment: ["dumbbell", "kettlebell"], weighted: true, coreFunction: "anti_rotation" },

  // Anti-lateral-flexion — resist sideways flex
  { id: "side_plank", name: "Side Plank", pattern: "core", muscles: ["obliques"], equipment: ["mat"], weighted: false, coreFunction: "anti_lateral_flexion" },
  { id: "side_plank_reach", name: "Side Plank with Reach-Through", pattern: "core", muscles: ["obliques"], equipment: ["mat"], weighted: false, coreFunction: "anti_lateral_flexion" },

  // Rotation — produce twist (athletic power)
  { id: "russian_twist", name: "Russian Twist", pattern: "rotation", muscles: ["obliques"], equipment: ["dumbbell"], weighted: true, coreFunction: "rotation" },
  { id: "cable_woodchop", name: "Cable Woodchop", pattern: "rotation", muscles: ["obliques", "core"], equipment: ["machine", "band"], weighted: true, coreFunction: "rotation", cues: ["Drive from the hip", "Long arms"] },

  // Isolation — aesthetic-focused
  { id: "hanging_knee_raise", name: "Hanging Knee Raise", pattern: "core", muscles: ["abs"], equipment: ["pullup_bar"], weighted: false, coreFunction: "isolation" },
  { id: "hanging_leg_raise", name: "Hanging Leg Raise", pattern: "core", muscles: ["abs"], equipment: ["pullup_bar"], weighted: false, coreFunction: "isolation", cues: ["Strict, no swing", "Pause at top"] },
  { id: "toes_to_bar", name: "Toes-to-Bar", pattern: "core", muscles: ["abs"], equipment: ["pullup_bar"], weighted: false, coreFunction: "isolation" },
  { id: "cable_crunch", name: "Cable Crunch (Kneeling)", pattern: "core", muscles: ["abs"], equipment: ["machine"], weighted: true, coreFunction: "isolation", cues: ["Curl spine", "Elbows to hips, not knees"] },
  { id: "reverse_crunch", name: "Reverse Crunch", pattern: "core", muscles: ["abs"], equipment: ["mat"], weighted: false, coreFunction: "isolation" },
  { id: "decline_situp", name: "Decline Sit-Up", pattern: "core", muscles: ["abs"], equipment: ["box"], weighted: false, coreFunction: "isolation" },
  { id: "bicycle_crunch", name: "Bicycle Crunch", pattern: "core", muscles: ["abs", "obliques"], equipment: ["mat"], weighted: false, coreFunction: "isolation" },

  // ---------- POWER / OLY-ISH ----------
  { id: "power_clean", name: "Power Clean", pattern: "hinge", muscles: ["posterior_chain"], equipment: ["barbell"], weighted: true, cues: ["Bar close", "Vertical jump shape", "Fast elbows"] },
  { id: "clean_and_jerk", name: "Clean & Jerk", pattern: "hinge", muscles: ["full_body"], equipment: ["barbell"], weighted: true },
  { id: "snatch", name: "Snatch", pattern: "hinge", muscles: ["full_body"], equipment: ["barbell"], weighted: true },
  { id: "kb_swing", name: "Kettlebell Swing", pattern: "hinge", muscles: ["posterior_chain"], equipment: ["kettlebell"], weighted: true, cues: ["Hinge, don't squat", "Snap hips"] },
  { id: "kb_snatch", name: "KB Snatch", pattern: "hinge", muscles: ["full_body"], equipment: ["kettlebell"], weighted: true },
  { id: "box_jump", name: "Box Jump", pattern: "plyometric", muscles: ["legs"], equipment: ["box"], weighted: false },
  { id: "broad_jump", name: "Broad Jump", pattern: "plyometric", muscles: ["legs"], equipment: ["bodyweight"], weighted: false },
  { id: "wallball", name: "Wall Ball", pattern: "squat", muscles: ["full_body"], equipment: ["bodyweight"], weighted: true },
  { id: "thruster", name: "Thruster", pattern: "squat", muscles: ["full_body"], equipment: ["barbell"], weighted: true },
  { id: "burpee", name: "Burpee", pattern: "conditioning", muscles: ["full_body"], equipment: ["bodyweight"], weighted: false },
  { id: "double_under", name: "Double-Under", pattern: "plyometric", muscles: ["calves"], equipment: ["bodyweight"], weighted: false },

  // ---------- CONDITIONING / CARDIO ----------
  { id: "row_500", name: "Row", pattern: "conditioning", muscles: ["full_body"], equipment: ["rower"], weighted: false },
  { id: "bike_erg", name: "Bike Erg", pattern: "conditioning", muscles: ["full_body"], equipment: ["bike"], weighted: false },
  { id: "ski_erg", name: "Ski Erg", pattern: "conditioning", muscles: ["full_body"], equipment: ["ski_erg"], weighted: false },
  { id: "run", name: "Run", pattern: "conditioning", muscles: ["legs"], equipment: ["bodyweight"], weighted: false },
  { id: "sled_push", name: "Sled Push", pattern: "carry", muscles: ["legs", "core"], equipment: ["sled"], weighted: true },
  { id: "sled_pull", name: "Sled Pull", pattern: "pull", muscles: ["back", "legs"], equipment: ["sled"], weighted: true },
  { id: "farmer_carry", name: "Farmer Carry", pattern: "carry", muscles: ["grip", "core"], equipment: ["dumbbell", "kettlebell"], weighted: true },
  { id: "sandbag_lunge", name: "Sandbag Lunge", pattern: "lunge", muscles: ["legs", "core"], equipment: ["bodyweight"], weighted: true },
  { id: "wallball_hyrox", name: "Wall Ball (Hyrox)", pattern: "squat", muscles: ["full_body"], equipment: ["bodyweight"], weighted: true },
  { id: "burpee_broad", name: "Burpee Broad Jump", pattern: "plyometric", muscles: ["full_body"], equipment: ["bodyweight"], weighted: false },

  // ---------- SURF SPECIFIC ----------
  { id: "pop_up", name: "Pop-Up Drill", pattern: "plyometric", muscles: ["full_body"], equipment: ["mat"], weighted: false, cues: ["Explosive, one motion"] },
  { id: "paddle_sim", name: "Paddle Simulator (Band)", pattern: "pull", muscles: ["back", "shoulder"], equipment: ["band"], weighted: false },
  { id: "single_leg_rdl", name: "Single-Leg RDL", pattern: "hinge", muscles: ["hamstrings", "glutes"], equipment: ["dumbbell"], weighted: true },
  { id: "turkish_getup", name: "Turkish Get-Up", pattern: "core", muscles: ["full_body"], equipment: ["kettlebell"], weighted: true },
  { id: "med_ball_slam", name: "Med Ball Slam", pattern: "rotation", muscles: ["core"], equipment: ["bodyweight"], weighted: true },
  { id: "med_ball_rotational_throw", name: "Rotational Med Ball Throw", pattern: "rotation", muscles: ["core", "obliques"], equipment: ["bodyweight"], weighted: true },

  // ---------- STRETCH ----------
  { id: "downward_dog", name: "Downward Dog", pattern: "mobility", muscles: ["full_body"], equipment: ["mat"], weighted: false },
  { id: "child_pose", name: "Child's Pose", pattern: "mobility", muscles: ["back"], equipment: ["mat"], weighted: false },
  { id: "lizard_pose", name: "Lizard Pose", pattern: "mobility", muscles: ["hip"], equipment: ["mat"], weighted: false },
  { id: "thread_needle", name: "Thread the Needle", pattern: "mobility", muscles: ["thoracic"], equipment: ["mat"], weighted: false },
  { id: "seated_forward_fold", name: "Seated Forward Fold", pattern: "mobility", muscles: ["hamstrings"], equipment: ["mat"], weighted: false },
  { id: "happy_baby", name: "Happy Baby", pattern: "mobility", muscles: ["hip"], equipment: ["mat"], weighted: false },
  { id: "saddle_pose", name: "Saddle Pose", pattern: "mobility", muscles: ["quads"], equipment: ["mat"], weighted: false },
  { id: "supine_twist", name: "Supine Spinal Twist", pattern: "mobility", muscles: ["spine"], equipment: ["mat"], weighted: false },
  { id: "foam_roll_back", name: "Foam Roll T-Spine", pattern: "mobility", muscles: ["thoracic"], equipment: ["foam_roller"], weighted: false },
  { id: "foam_roll_quads", name: "Foam Roll Quads", pattern: "mobility", muscles: ["quads"], equipment: ["foam_roller"], weighted: false },

  // ---------- GALPIN POWER & SPRINTING ----------
  { id: "hang_clean", name: "Hang Clean", pattern: "hinge", muscles: ["posterior_chain", "full_body"], equipment: ["barbell"], weighted: true, cues: ["Keep above the knee", "Fast elbows under bar", "Vertical jump shape"] },
  { id: "hang_clean_below_knee", name: "Hang Clean Below Knee", pattern: "hinge", muscles: ["posterior_chain"], equipment: ["barbell"], weighted: true, cues: ["Lats packed", "Drive through floor"] },
  { id: "snatch_balance", name: "Snatch Balance", pattern: "push", muscles: ["shoulder", "legs"], equipment: ["barbell"], weighted: true, cues: ["Press the body down, not the bar up"] },
  { id: "bhn_push_press", name: "Behind-the-Neck Push Press + OHS", pattern: "push", muscles: ["shoulder", "core"], equipment: ["barbell"], weighted: true, cues: ["2 push press + 1 paused OHS", "Bar over mid-foot"] },
  { id: "overhead_squat", name: "Overhead Squat", pattern: "squat", muscles: ["full_body", "shoulder"], equipment: ["barbell"], weighted: true, cues: ["Active shoulder press", "Sit between heels", "Chest tall"] },
  { id: "closegrip_bench", name: "Close-Grip Bench Press", pattern: "push", muscles: ["tris", "chest"], equipment: ["barbell"], weighted: true, cues: ["Shoulder-width grip", "Elbows tucked"] },
  { id: "landmine_rotational_punch", name: "Landmine Rotational Punch (Iso)", pattern: "rotation", muscles: ["core", "shoulder"], equipment: ["barbell"], weighted: true, cues: ["Drive from the hip", "Pause at end range"] },
  { id: "ws_trx", name: "Ws (TRX)", pattern: "pull", muscles: ["rear_delt", "rotator_cuff"], equipment: ["rings"], weighted: false, warmupTarget: "shoulder", cues: ["Externally rotate", "Pinkies up"] },
  { id: "upright_row_kettlebell", name: "Upright Row (Kettlebell)", pattern: "pull", muscles: ["traps", "side_delt"], equipment: ["kettlebell"], weighted: true, cues: ["Slow eccentric"] },
  { id: "med_ball_perp_rotational_throw", name: "Med Ball Perpendicular Rotational Throw", pattern: "rotation", muscles: ["core", "obliques"], equipment: ["bodyweight"], weighted: true, cues: ["Hips lead", "Throw with intent"] },

  // ---------- GALPIN PLYOMETRICS ----------
  { id: "depth_jump_24", name: 'Depth Jump (24")', pattern: "plyometric", muscles: ["legs"], equipment: ["box"], weighted: false, cues: ["Step off, do not jump down", "Minimal ground contact"] },
  { id: "depth_jump_30", name: 'Depth Jump (30") + Jump Repeat', pattern: "plyometric", muscles: ["legs"], equipment: ["box"], weighted: false, cues: ["1 depth jump + 3 repeat jumps", "Stay tall, stiff ankles"] },
  { id: "seated_box_jump", name: "Seated Box Jump", pattern: "plyometric", muscles: ["legs"], equipment: ["box"], weighted: false, cues: ["No countermovement", "Pure concentric power"] },
  { id: "linear_bound_stabilize", name: "Linear Bound — Countermovement to Stabilize", pattern: "plyometric", muscles: ["legs"], equipment: ["bodyweight"], weighted: false, cues: ["Stick each landing", "Quiet feet"] },
  { id: "linear_bound_continuous", name: "Linear Bound — Continuous", pattern: "plyometric", muscles: ["legs"], equipment: ["bodyweight"], weighted: false, cues: ["Distance + short ground contact"] },
  { id: "ankle_bound", name: "Ankle Bound", pattern: "plyometric", muscles: ["calves"], equipment: ["bodyweight"], weighted: false, cues: ["Stiff ankles", "Continuous hops"] },
  { id: "pillar_skip_linear", name: "Pillar Skip — Linear", pattern: "plyometric", muscles: ["legs"], equipment: ["bodyweight"], weighted: false, warmupTarget: "general", cues: ["Tall posture", "Drive knee"] },
  { id: "power_skip_vertical", name: "Power Skip — Vertical", pattern: "plyometric", muscles: ["legs"], equipment: ["bodyweight"], weighted: false, warmupTarget: "general" },
  { id: "medial_hop_hurdle", name: "Medial Hop-Hop Bound (Over Hurdle)", pattern: "plyometric", muscles: ["legs"], equipment: ["bodyweight"], weighted: false },
  { id: "sl_tuck_jumps_lateral", name: "Single-Leg Side-to-Side Tuck Jumps", pattern: "plyometric", muscles: ["legs"], equipment: ["bodyweight"], weighted: false },
  { id: "sl_quick_feet_lateral", name: "Single-Leg Quick Feet Lateral Hops", pattern: "plyometric", muscles: ["calves", "legs"], equipment: ["bodyweight"], weighted: false },

  // ---------- GALPIN SPRINTING / SPEED ----------
  { id: "sprint", name: "Sprint", pattern: "conditioning", muscles: ["legs"], equipment: ["bodyweight"], weighted: false, cues: ["Drive arms", "Long stride at top speed"] },
  { id: "get_ups_deceleration", name: "Get Up — Down Position to Deceleration", pattern: "conditioning", muscles: ["full_body"], equipment: ["bodyweight"], weighted: false, cues: ["Sprint 10y, decelerate by 15y"] },
  { id: "back_pedal_acceleration", name: "Back Pedal to 8yd Acceleration", pattern: "conditioning", muscles: ["legs"], equipment: ["bodyweight"], weighted: false, cues: ["4y backpedal + 8y sprint"] },
  { id: "half_kneeling_acceleration", name: "Half-Kneeling Acceleration Sprint", pattern: "conditioning", muscles: ["legs"], equipment: ["bodyweight"], weighted: false },
  { id: "mirror_drill", name: "Mirror Drill", pattern: "conditioning", muscles: ["legs"], equipment: ["bodyweight"], weighted: false, cues: ["Mirror partner cuts for 10s"] },
  { id: "three_hurdle_acceleration", name: "3 Hurdle Drill to 8yd Acceleration", pattern: "plyometric", muscles: ["legs"], equipment: ["bodyweight"], weighted: false },
  { id: "jump_rope_continuous", name: "Jump Rope — Continuous", pattern: "conditioning", muscles: ["calves", "full_body"], equipment: ["bodyweight"], weighted: false, warmupTarget: "general", cues: ["15s bilateral / R / L / bilateral"] },

  // ---------- GALPIN UNILATERAL / KNEE HEALTH ----------
  { id: "nordic_leg_curl", name: "Nordic Leg Curl", pattern: "hinge", muscles: ["hamstrings"], equipment: ["bodyweight"], weighted: false, cues: ["Slow eccentric", "Push back up with hands if needed"] },
  { id: "single_leg_squat_counter", name: "Single-Leg Squat — Counterbalance", pattern: "squat", muscles: ["quads", "glutes"], equipment: ["dumbbell"], weighted: true, cues: ["Counterweight in front", "Heel stays down"] },
  { id: "single_leg_squat_goblet", name: "Single-Leg Squat — Goblet", pattern: "squat", muscles: ["quads", "glutes"], equipment: ["dumbbell", "kettlebell"], weighted: true },
  { id: "rdl_deficit_band", name: "RDL from Deficit with Bands", pattern: "hinge", muscles: ["hamstrings", "glutes"], equipment: ["barbell", "band"], weighted: true, cues: ["Stand on plate for ROM", "Band accommodates resistance"] },
  { id: "two_inch_lift_half_kneeling", name: "2-Inch Lift Half Kneeling (Front Heel Hover)", pattern: "core", muscles: ["calves", "hip_flexor"], equipment: ["bodyweight"], weighted: false, cues: ["Ball of foot on plate", "25s isometric per side"] },
  { id: "ankle_strengthening_series", name: "Ankle Strengthening Series", pattern: "mobility", muscles: ["ankle", "calves"], equipment: ["bodyweight"], weighted: false, warmupTarget: "general" },
  { id: "banded_hip_flexion", name: "Banded Hip Flexion for Sprinting", pattern: "mobility", muscles: ["hip_flexor"], equipment: ["band"], weighted: false, warmupTarget: "hip" },
  { id: "unilateral_standing_hip_abduction", name: "Unilateral Standing Hip Abduction", pattern: "mobility", muscles: ["glutes", "hip"], equipment: ["bodyweight"], weighted: false, warmupTarget: "hip" },
  { id: "standing_unilateral_hip_extension", name: "Standing Unilateral Hip Extension", pattern: "mobility", muscles: ["glutes"], equipment: ["bodyweight"], weighted: false, warmupTarget: "hip" },

  // ---------- GALPIN MOBILITY / WARMUP ----------
  { id: "prone_arm_arc", name: "Prone Arm Arc", pattern: "mobility", muscles: ["shoulder"], equipment: ["mat"], weighted: false, warmupTarget: "shoulder", cues: ["Forehead on floor", "Slow controlled arc"] },
  { id: "walking_lunge_warmup", name: "Walking Lunge (Warmup)", pattern: "lunge", muscles: ["legs", "hip"], equipment: ["bodyweight"], weighted: false, warmupTarget: "hip" },
  { id: "side_lunge_warmup", name: "Side Lunge Warmup", pattern: "mobility", muscles: ["adductors", "hip"], equipment: ["bodyweight"], weighted: false, warmupTarget: "hip" },
  { id: "forward_lunge_elbow_instep", name: "Forward Lunge, Elbow-to-Instep", pattern: "mobility", muscles: ["hip", "thoracic"], equipment: ["bodyweight"], weighted: false, warmupTarget: "hip" },
  { id: "hip_mobilization_quadruped", name: "Hip Mobilization (Quadruped Tubing)", pattern: "mobility", muscles: ["hip"], equipment: ["band"], weighted: false, warmupTarget: "hip" },
  { id: "hip_mobilization_half_kneeling", name: "Hip Mobilization (Half-Kneeling Elbow-to-Instep)", pattern: "mobility", muscles: ["hip"], equipment: ["bodyweight"], weighted: false, warmupTarget: "hip" },
  { id: "mq_hip_ir", name: "MQ — Hip Internal Rotation", pattern: "mobility", muscles: ["hip"], equipment: ["bodyweight"], weighted: false, warmupTarget: "hip" },
  { id: "world_best_hip_ir", name: "World's Best Hip IR Stretch", pattern: "mobility", muscles: ["hip"], equipment: ["bodyweight"], weighted: false, warmupTarget: "hip" },
  { id: "stride_stretch_9090", name: "Stride Stretch — 90/90", pattern: "mobility", muscles: ["hip"], equipment: ["mat"], weighted: false, warmupTarget: "hip" },
  { id: "ninety_ninety_lift_offs", name: "90/90 Lift-Offs", pattern: "mobility", muscles: ["hip"], equipment: ["mat"], weighted: false, warmupTarget: "hip", cues: ["Hold IR ~10s/rep"] },
  { id: "glute_clam_side_plank", name: "Side-Plank Clam Shells", pattern: "core", muscles: ["glutes", "obliques"], equipment: ["mat"], weighted: false, warmupTarget: "hip" },
  { id: "knee_hug_lunge_rotation", name: "Knee Hug to Lunge with Rotation", pattern: "mobility", muscles: ["hip", "thoracic"], equipment: ["bodyweight"], weighted: false, warmupTarget: "hip" },
  { id: "heel_to_glute_inverted_hamstring", name: "Heel to Glute → Inverted Hamstring", pattern: "mobility", muscles: ["hamstrings", "glutes"], equipment: ["bodyweight"], weighted: false, warmupTarget: "hip" },
  { id: "leg_cradle", name: "Leg Cradle (Moving)", pattern: "mobility", muscles: ["hip"], equipment: ["bodyweight"], weighted: false, warmupTarget: "hip" },
  { id: "knee_hug_to_lunge", name: "Knee Hug to Lunge", pattern: "mobility", muscles: ["hip"], equipment: ["bodyweight"], weighted: false, warmupTarget: "hip" },
  { id: "toe_touch_squat_reach", name: "Toe Touch → Squat → Reach (Box)", pattern: "mobility", muscles: ["full_body"], equipment: ["box"], weighted: false, warmupTarget: "general" },
  { id: "thoracic_extension_squat", name: "Thoracic Extension in Squat", pattern: "mobility", muscles: ["thoracic"], equipment: ["bodyweight"], weighted: false, warmupTarget: "shoulder" },
  { id: "goblet_squat_hold", name: "Goblet Squat Hold", pattern: "squat", muscles: ["quads", "core"], equipment: ["dumbbell"], weighted: true, warmupTarget: "general", cues: ["Maintain neutral spine", "30s hold"] },
];

export const EXERCISES_BY_ID: Record<string, Exercise> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e])
);

export function getExercise(id: string): Exercise {
  const ex = EXERCISES_BY_ID[id];
  if (!ex) throw new Error(`Unknown exercise: ${id}`);
  return ex;
}
