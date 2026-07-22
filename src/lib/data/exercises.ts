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
  { id: "cossack_squat", name: "Cossack Squat", pattern: "mobility", muscles: ["adductors", "hip"], equipment: ["bodyweight"], weighted: false, warmupTarget: "hip", howTo: "Wide stance, feet slightly turned out. Shift weight fully to one side and squat down onto that leg while keeping the other leg straight (toes pointing up). Chest tall, back neutral. Push back to center and shift to the other side. Deep hip and adductor mobility." },

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
  { id: "ab_wheel_rollout", name: "Ab Wheel Rollout", pattern: "core", muscles: ["core"], equipment: ["bodyweight"], weighted: false, coreFunction: "anti_extension", cues: ["Squeeze glutes", "Tuck pelvis", "No lumbar extension"], howTo: "Kneel with the wheel under shoulders, spine long, glutes squeezed, pelvis tucked (posterior tilt). Roll the wheel forward keeping the tuck — do NOT let the lower back arch. Return by pulling with the abs, not the arms. Range of motion is only as far as you can hold the position." },

  // Anti-rotation — resist twist (the most underrated core work)
  { id: "pallof_press", name: "Pallof Press", pattern: "core", muscles: ["core", "obliques"], equipment: ["band"], weighted: false, coreFunction: "anti_rotation", cues: ["Resist the pull", "Slow extension"], howTo: "Kneel or stand perpendicular to a cable/band anchor at chest height. Hold the handle at your sternum with both hands. Slowly press it straight out and resist the pull that wants to rotate you. Hold 2 seconds, return. It's an anti-rotation isometric — the whole point is NOT twisting." },
  { id: "suitcase_carry", name: "Suitcase Carry (1 arm)", pattern: "carry", muscles: ["core", "obliques", "grip"], equipment: ["dumbbell", "kettlebell"], weighted: true, coreFunction: "anti_rotation", cues: ["Don't lean", "Stay tall"] },
  { id: "single_arm_farmer_carry", name: "Single-Arm Farmer Carry", pattern: "carry", muscles: ["core", "obliques", "grip"], equipment: ["dumbbell", "kettlebell"], weighted: true, coreFunction: "anti_rotation" },

  // Anti-lateral-flexion — resist sideways flex
  { id: "side_plank", name: "Side Plank", pattern: "core", muscles: ["obliques"], equipment: ["mat"], weighted: false, coreFunction: "anti_lateral_flexion" },
  { id: "side_plank_reach", name: "Side Plank with Reach-Through", pattern: "core", muscles: ["obliques"], equipment: ["mat"], weighted: false, coreFunction: "anti_lateral_flexion" },

  // Rotation — produce twist (athletic power)
  { id: "russian_twist", name: "Russian Twist", pattern: "rotation", muscles: ["obliques"], equipment: ["dumbbell"], weighted: true, coreFunction: "rotation" },
  { id: "cable_woodchop", name: "Cable Woodchop", pattern: "rotation", muscles: ["obliques", "core"], equipment: ["machine", "band"], weighted: true, coreFunction: "rotation", cues: ["Drive from the hip", "Long arms"], howTo: "Set cable at high anchor (for chop) or low (for lift). Grab handle, pivot away, and drive it diagonally across your body with straight arms — power from the hips, not the shoulders. Slow return. It's a rotational power move, not a shoulder move." },

  // Isolation — aesthetic-focused
  { id: "hanging_knee_raise", name: "Hanging Knee Raise", pattern: "core", muscles: ["abs"], equipment: ["pullup_bar"], weighted: false, coreFunction: "isolation" },
  { id: "hanging_leg_raise", name: "Hanging Leg Raise", pattern: "core", muscles: ["abs"], equipment: ["pullup_bar"], weighted: false, coreFunction: "isolation", cues: ["Strict, no swing", "Pause at top"] },
  { id: "toes_to_bar", name: "Toes-to-Bar", pattern: "core", muscles: ["abs"], equipment: ["pullup_bar"], weighted: false, coreFunction: "isolation" },
  { id: "cable_crunch", name: "Cable Crunch (Kneeling)", pattern: "core", muscles: ["abs"], equipment: ["machine"], weighted: true, coreFunction: "isolation", cues: ["Curl spine", "Elbows to hips, not knees"] },
  { id: "reverse_crunch", name: "Reverse Crunch", pattern: "core", muscles: ["abs"], equipment: ["mat"], weighted: false, coreFunction: "isolation" },
  { id: "decline_situp", name: "Decline Sit-Up", pattern: "core", muscles: ["abs"], equipment: ["box"], weighted: false, coreFunction: "isolation" },
  { id: "bicycle_crunch", name: "Bicycle Crunch", pattern: "core", muscles: ["abs", "obliques"], equipment: ["mat"], weighted: false, coreFunction: "isolation" },

  // ---------- POWER / OLY-ISH ----------
  { id: "power_clean", name: "Power Clean", pattern: "hinge", muscles: ["posterior_chain"], equipment: ["barbell"], weighted: true, cues: ["Bar close", "Vertical jump shape", "Fast elbows"], howTo: "Start from the floor: bar over mid-foot, shoulders slightly ahead of bar, back flat, arms straight. Push the floor away (deadlift start), keep bar close, then explode at the hips — jump-shrug-pull. Catch in a partial squat with elbows fast forward, bar on front delts." },
  { id: "clean_and_jerk", name: "Clean & Jerk", pattern: "hinge", muscles: ["full_body"], equipment: ["barbell"], weighted: true, howTo: "Perform a full clean to the front rack. Reset breath, brace hard. Dip straight down 15cm bending only at knees, then drive up violently, punching the bar overhead while dropping under it in a split stance. Recover to standing with the bar locked out overhead." },
  { id: "snatch", name: "Snatch", pattern: "hinge", muscles: ["full_body"], equipment: ["barbell"], weighted: true, howTo: "One motion: bar off the floor, up past hips, and overhead — wide grip. Same triple extension as clean, but pull the bar all the way up while dropping into an overhead squat. Bar ends locked out, arms straight, in the bottom of a squat. Advanced — practice with an empty bar first." },
  { id: "kb_swing", name: "Kettlebell Swing", pattern: "hinge", muscles: ["posterior_chain"], equipment: ["kettlebell"], weighted: true, cues: ["Hinge, don't squat", "Snap hips"] },
  { id: "kb_snatch", name: "KB Snatch", pattern: "hinge", muscles: ["full_body"], equipment: ["kettlebell"], weighted: true, howTo: "One-arm swing pattern that finishes with the KB overhead. As the KB reaches shoulder height on the up-swing, punch your hand through so the KB rotates around the wrist (doesn't crash on it) and lands soft in the racked overhead position. Full lockout." },
  { id: "box_jump", name: "Box Jump", pattern: "plyometric", muscles: ["legs"], equipment: ["box"], weighted: false, howTo: "Stand a comfortable distance from the box. Swing arms back and down, then jump up onto the box, landing in a partial squat with feet flat. Stand fully upright on top. Step DOWN one leg at a time — don't jump back down (bad for tendons)." },
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
  { id: "pop_up", name: "Pop-Up Drill", pattern: "plyometric", muscles: ["full_body"], equipment: ["mat"], weighted: false, cues: ["Explosive, one motion"], howTo: "Simulate popping up on a surfboard from prone. Explode from lying down: hands under shoulders, push up, sweep front foot forward while back foot stays put, land in surf stance. One fluid motion, no knee-plant." },
  { id: "paddle_sim", name: "Paddle Simulator (Band)", pattern: "pull", muscles: ["back", "shoulder"], equipment: ["band"], weighted: false },
  { id: "single_leg_rdl", name: "Single-Leg RDL", pattern: "hinge", muscles: ["hamstrings", "glutes"], equipment: ["dumbbell"], weighted: true, howTo: "Balance on one leg with a slight bend in the knee. Hinge at the hip — chest drops toward the floor, back leg extends straight behind you as a counterweight. Keep hips square (don't rotate open). Return by driving the standing hip forward. Hamstring + glute + balance all at once." },
  { id: "turkish_getup", name: "Turkish Get-Up", pattern: "core", muscles: ["full_body"], equipment: ["kettlebell"], weighted: true, howTo: "Lie on your back holding a kettlebell straight up in one hand. Slowly stand up through this sequence: prop on opposite elbow → hand → hip up → sweep leg back → lunge → stand. Reverse to get down. Keep eyes on the bell throughout. 3-5 reps per side, moderate weight." },
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
  { id: "hang_clean", name: "Hang Clean", pattern: "hinge", muscles: ["posterior_chain", "full_body"], equipment: ["barbell"], weighted: true, cues: ["Keep above the knee", "Fast elbows under bar", "Vertical jump shape"], howTo: "Start with the bar just above the knees, back neutral, chest tall. Explosively extend hips + knees + ankles (triple extension) — the bar is pulled up by momentum, not arms. As it rises, drop into a quarter squat and 'catch' with elbows fast forward, bar racked on front delts. Stand up." },
  { id: "hang_clean_below_knee", name: "Hang Clean Below Knee", pattern: "hinge", muscles: ["posterior_chain"], equipment: ["barbell"], weighted: true, cues: ["Lats packed", "Drive through floor"], howTo: "Same as hang clean but starting position is bar just below the knees. Slightly longer pull, more posterior chain load. Keep shoulders over the bar, sweep it back into the hip pocket, then explode." },
  { id: "snatch_balance", name: "Snatch Balance", pattern: "push", muscles: ["shoulder", "legs"], equipment: ["barbell"], weighted: true, cues: ["Press the body down, not the bar up"], howTo: "Bar behind the neck (snatch grip). Dip and drive, but instead of jumping the bar up, punch yourself DOWN into an overhead squat. It's a speed/mobility drill for hitting the overhead squat bottom." },
  { id: "bhn_push_press", name: "Behind-the-Neck Push Press + OHS", pattern: "push", muscles: ["shoulder", "core"], equipment: ["barbell"], weighted: true, cues: ["2 push press + 1 paused OHS", "Bar over mid-foot"], howTo: "Bar behind the neck. Dip and drive up violently, using leg power to push the bar overhead. Do 2 push presses, then hold overhead and drop into an overhead squat with a 3-second pause. Complete the set." },
  { id: "overhead_squat", name: "Overhead Squat", pattern: "squat", muscles: ["full_body", "shoulder"], equipment: ["barbell"], weighted: true, cues: ["Active shoulder press", "Sit between heels", "Chest tall"], howTo: "Bar overhead in a snatch-width grip, arms locked, shoulders active. Descend into a full squat keeping the bar aligned over your mid-foot. Chest tall, knees track over toes. Stand up. Requires strong shoulder mobility and t-spine extension." },
  { id: "closegrip_bench", name: "Close-Grip Bench Press", pattern: "push", muscles: ["tris", "chest"], equipment: ["barbell"], weighted: true, cues: ["Shoulder-width grip", "Elbows tucked"] },
  { id: "landmine_rotational_punch", name: "Landmine Rotational Punch (Iso)", pattern: "rotation", muscles: ["core", "shoulder"], equipment: ["barbell"], weighted: true, cues: ["Drive from the hip", "Pause at end range"], howTo: "One end of a barbell in a landmine (or corner). Hold the free end at chest height with one hand. Rotate through the hips and punch the bar forward — power from the ground up. Pause 2 seconds at extension. Slow return. It's a rotational power builder." },
  { id: "ws_trx", name: "Ws (TRX)", pattern: "pull", muscles: ["rear_delt", "rotator_cuff"], equipment: ["rings"], weighted: false, warmupTarget: "shoulder", cues: ["Externally rotate", "Pinkies up"] },
  { id: "upright_row_kettlebell", name: "Upright Row (Kettlebell)", pattern: "pull", muscles: ["traps", "side_delt"], equipment: ["kettlebell"], weighted: true, cues: ["Slow eccentric"] },
  { id: "med_ball_perp_rotational_throw", name: "Med Ball Perpendicular Rotational Throw", pattern: "rotation", muscles: ["core", "obliques"], equipment: ["bodyweight"], weighted: true, cues: ["Hips lead", "Throw with intent"] },

  // ---------- GALPIN PLYOMETRICS ----------
  { id: "depth_jump_24", name: 'Depth Jump (24")', pattern: "plyometric", muscles: ["legs"], equipment: ["box"], weighted: false, cues: ["Step off, do not jump down", "Minimal ground contact"], howTo: "Step (don't jump) off a 24-inch box. As soon as both feet touch, spring straight up as fast and high as possible. The goal is minimal ground contact time — under 0.25s. Not a warm-up move; do it fresh." },
  { id: "depth_jump_30", name: 'Depth Jump (30") + Jump Repeat', pattern: "plyometric", muscles: ["legs"], equipment: ["box"], weighted: false, cues: ["1 depth jump + 3 repeat jumps", "Stay tall, stiff ankles"], howTo: "Step off a 30-inch box, absorb the landing with stiff ankles, then explode into 3 continuous jumps as tall as possible. First jump is the depth response; the next three train reactive strength. Full rest between reps." },
  { id: "seated_box_jump", name: "Seated Box Jump", pattern: "plyometric", muscles: ["legs"], equipment: ["box"], weighted: false, cues: ["No countermovement", "Pure concentric power"], howTo: "Sit on a low box with feet planted. From a dead stop (no rock or countermovement), explode up onto a taller box in front of you. Trains pure concentric power — great for RFD without the eccentric stress of a countermovement jump." },
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
  { id: "nordic_leg_curl", name: "Nordic Leg Curl", pattern: "hinge", muscles: ["hamstrings"], equipment: ["bodyweight"], weighted: false, cues: ["Slow eccentric", "Push back up with hands if needed"], howTo: "Kneel with feet anchored under a padded bar or partner. Keeping your body a straight line from knees to head, slowly lower your torso forward as if hinging at the knees. Use your hands to catch the fall and push back to start. Elite hamstring builder." },
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

  // ============================================================
  // LIBRARY EXPANSION — accessory variety across muscle groups.
  // Filling thin spots so pools rotate meaningfully.
  // ============================================================

  // CHEST — was only 4 exercises
  { id: "cable_fly", name: "Cable Fly", pattern: "push", muscles: ["chest"], equipment: ["machine"], weighted: true, cues: ["Slight elbow bend", "Squeeze at the middle"] },
  { id: "pec_deck", name: "Pec Deck", pattern: "push", muscles: ["chest"], equipment: ["machine"], weighted: true },
  { id: "incline_cable_fly", name: "Incline Cable Fly", pattern: "push", muscles: ["upper_chest", "chest"], equipment: ["machine"], weighted: true, cues: ["Angle cables from low to high"] },
  { id: "decline_db_press", name: "Decline Dumbbell Press", pattern: "push", muscles: ["chest"], equipment: ["dumbbell"], weighted: true },
  { id: "pushup", name: "Push-Up", pattern: "push", muscles: ["chest", "tris", "core"], equipment: ["bodyweight"], weighted: false },
  { id: "diamond_pushup", name: "Diamond Push-Up", pattern: "push", muscles: ["chest", "tris"], equipment: ["bodyweight"], weighted: false, cues: ["Hands close, thumbs touch", "Elbows tuck back"] },
  { id: "svend_press", name: "Svend Press", pattern: "push", muscles: ["chest"], equipment: ["dumbbell"], weighted: true, cues: ["Squeeze the plate", "Press straight out"] },

  // SHOULDERS — side/front/rear delt variations
  { id: "cable_lateral_raise", name: "Cable Lateral Raise", pattern: "push", muscles: ["side_delt"], equipment: ["machine"], weighted: true, cues: ["Lead with the elbow"] },
  { id: "machine_lateral_raise", name: "Machine Lateral Raise", pattern: "push", muscles: ["side_delt"], equipment: ["machine"], weighted: true },
  { id: "arnold_press", name: "Arnold Press", pattern: "push", muscles: ["shoulder", "chest"], equipment: ["dumbbell"], weighted: true, cues: ["Rotate palms outward as you press"] },
  { id: "landmine_press", name: "Landmine Press", pattern: "push", muscles: ["shoulder", "chest"], equipment: ["barbell"], weighted: true },
  { id: "front_raise", name: "Front Raise", pattern: "push", muscles: ["shoulder"], equipment: ["dumbbell"], weighted: true },
  { id: "upright_row", name: "Upright Row", pattern: "pull", muscles: ["side_delt", "traps"], equipment: ["barbell", "dumbbell"], weighted: true, cues: ["Elbows lead", "Stop at chest height"] },

  // REAR DELT — rear-delt work belongs on Pull/Shoulders days
  { id: "reverse_pec_deck", name: "Reverse Pec Deck", pattern: "pull", muscles: ["rear_delt"], equipment: ["machine"], weighted: true },
  { id: "bent_over_lateral_raise", name: "Bent-Over Lateral Raise", pattern: "pull", muscles: ["rear_delt"], equipment: ["dumbbell"], weighted: true, cues: ["Hinge at hip", "Squeeze at top"] },
  { id: "cable_rear_delt_fly", name: "Cable Rear Delt Fly", pattern: "pull", muscles: ["rear_delt"], equipment: ["machine"], weighted: true },

  // LATS — was only 4
  { id: "straight_arm_pulldown", name: "Straight-Arm Pulldown", pattern: "pull", muscles: ["lats"], equipment: ["machine"], weighted: true, cues: ["Arms locked", "Pull down with the lats, not the biceps"] },
  { id: "db_pullover", name: "Dumbbell Pullover", pattern: "pull", muscles: ["lats", "chest"], equipment: ["dumbbell"], weighted: true },
  { id: "neutral_grip_pulldown", name: "Neutral-Grip Pulldown", pattern: "pull", muscles: ["lats", "back"], equipment: ["machine"], weighted: true },
  { id: "chest_supported_row", name: "Chest-Supported Row", pattern: "pull", muscles: ["back", "lats", "rear_delt"], equipment: ["dumbbell"], weighted: true },
  { id: "meadows_row", name: "Meadows Row", pattern: "pull", muscles: ["back", "lats"], equipment: ["barbell"], weighted: true },

  // BICEPS — was only 5
  { id: "barbell_curl", name: "Barbell Curl", pattern: "pull", muscles: ["biceps"], equipment: ["barbell"], weighted: true },
  { id: "ez_bar_curl", name: "EZ-Bar Curl", pattern: "pull", muscles: ["biceps"], equipment: ["barbell"], weighted: true },
  { id: "preacher_curl", name: "Preacher Curl", pattern: "pull", muscles: ["biceps"], equipment: ["dumbbell", "machine"], weighted: true, cues: ["Chest against pad", "Full stretch at bottom"] },
  { id: "incline_db_curl", name: "Incline Dumbbell Curl", pattern: "pull", muscles: ["biceps"], equipment: ["dumbbell"], weighted: true, cues: ["Let the arms hang back — biceps in full stretch"] },
  { id: "concentration_curl", name: "Concentration Curl", pattern: "pull", muscles: ["biceps"], equipment: ["dumbbell"], weighted: true },
  { id: "cable_curl", name: "Cable Curl", pattern: "pull", muscles: ["biceps"], equipment: ["machine"], weighted: true },

  // TRICEPS — was 7
  { id: "overhead_tricep_extension", name: "Overhead Tricep Extension", pattern: "push", muscles: ["tris"], equipment: ["dumbbell"], weighted: true, cues: ["Elbows tucked", "Full stretch at bottom"] },
  { id: "rope_pushdown", name: "Rope Pushdown", pattern: "push", muscles: ["tris"], equipment: ["machine"], weighted: true, cues: ["Flare rope at the bottom"] },
  { id: "close_grip_bench", name: "Close-Grip Bench Press", pattern: "push", muscles: ["tris", "chest"], equipment: ["barbell"], weighted: true },
  { id: "tricep_kickback", name: "Tricep Kickback", pattern: "push", muscles: ["tris"], equipment: ["dumbbell"], weighted: true },
  { id: "jm_press", name: "JM Press", pattern: "push", muscles: ["tris"], equipment: ["barbell"], weighted: true, cues: ["Hybrid press/skullcrusher — elbows out and back"] },

  // GLUTES / POSTERIOR-CHAIN BUILDERS — beginner-friendly stepping-stones
  // toward the harder movements (hip thrust, nordic curl) without loading
  // the lower back. Use these when the back needs to be respected.
  { id: "single_leg_glute_bridge", name: "Single-Leg Glute Bridge", pattern: "hinge", muscles: ["glutes", "hamstrings"], equipment: ["mat"], weighted: false, cues: ["Squeeze the working glute at the top", "Keep pelvis level"] },
  { id: "banded_glute_bridge", name: "Banded Glute Bridge", pattern: "hinge", muscles: ["glutes"], equipment: ["band", "mat"], weighted: false, cues: ["Push knees out against the band throughout"] },
  { id: "cable_kickback", name: "Cable Kickback", pattern: "hinge", muscles: ["glutes"], equipment: ["machine"], weighted: true, cues: ["Squeeze glute at top, don't hyperextend the lower back"] },
  { id: "lateral_band_walk", name: "Lateral Band Walk", pattern: "hinge", muscles: ["glutes", "hip"], equipment: ["band"], weighted: false, cues: ["Stay low in a mini squat", "Small steady steps"] },
  { id: "monster_walk", name: "Monster Walk", pattern: "hinge", muscles: ["glutes", "hip"], equipment: ["band"], weighted: false, cues: ["Wide slow steps forward and back", "Knees out"] },
  { id: "single_leg_rdl_bw", name: "Single-Leg RDL (BW)", pattern: "hinge", muscles: ["glutes", "hamstrings"], equipment: ["bodyweight"], weighted: false, cues: ["Hinge until torso parallel", "Hips square to floor"], howTo: "Balance on one leg. Hinge at the hip, letting the other leg extend behind you and torso lower toward parallel with the floor. Keep the standing knee soft, hips square. Return to standing by squeezing the glute. Bodyweight version before adding load." },
  { id: "reverse_hyper", name: "Reverse Hyperextension", pattern: "hinge", muscles: ["glutes", "posterior_chain", "lower_back"], equipment: ["machine"], weighted: false, cues: ["Slow and controlled — this is a rehab-friendly loader"] },
  { id: "back_extension_45", name: "45° Back Extension", pattern: "hinge", muscles: ["posterior_chain", "glutes"], equipment: ["machine"], weighted: false, cues: ["Round then extend the spine — hip drive at the top"] },
  { id: "good_morning_light", name: "Good Morning (Light)", pattern: "hinge", muscles: ["hamstrings", "glutes"], equipment: ["barbell"], weighted: true, cues: ["Empty bar or ~30% BW", "Hips push back, knees soft"] },
  { id: "step_up_bw", name: "Step-Up (Bodyweight)", pattern: "squat", muscles: ["glutes", "quads"], equipment: ["box"], weighted: false, cues: ["Drive through the whole foot", "Don't push off the trail leg"] },
  { id: "curtsy_lunge", name: "Curtsy Lunge", pattern: "squat", muscles: ["glutes", "quads"], equipment: ["bodyweight"], weighted: false, cues: ["Step diagonally behind, drop the back knee"] },

  // TISSUE TOLERANCE (Galpin) — low-level Achilles / ankle loading. Used in
  // running-day warmups to build joint tolerance before adding volume.
  { id: "pogo_hop", name: "Pogo Hops", pattern: "conditioning", muscles: ["calves"], equipment: ["bodyweight"], weighted: false, warmupTarget: "general", cues: ["Stiff ankles, minimal knee bend, quick ground contacts", "20-30 reps or 20-30 seconds"] },
  { id: "double_leg_pogo", name: "Rudimentary Pogo (Double Leg)", pattern: "conditioning", muscles: ["calves"], equipment: ["bodyweight"], weighted: false, warmupTarget: "general", cues: ["Very small hops", "Stay tall and springy — this is tissue tolerance work, not conditioning"] },

  // TRAPS / UPPER BACK
  { id: "barbell_shrug", name: "Barbell Shrug", pattern: "pull", muscles: ["traps"], equipment: ["barbell"], weighted: true, cues: ["Straight up, not forward"] },
  { id: "db_shrug", name: "Dumbbell Shrug", pattern: "pull", muscles: ["traps"], equipment: ["dumbbell"], weighted: true },
  { id: "rack_pull", name: "Rack Pull", pattern: "hinge", muscles: ["back", "traps", "posterior_chain"], equipment: ["barbell"], weighted: true, cues: ["Shortened deadlift ROM — heavier loading"] },
];

export const EXERCISES_BY_ID: Record<string, Exercise> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e])
);

export function getExercise(id: string): Exercise {
  const ex = EXERCISES_BY_ID[id];
  if (!ex) throw new Error(`Unknown exercise: ${id}`);
  return ex;
}
