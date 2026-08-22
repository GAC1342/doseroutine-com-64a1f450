/**
 * Step-by-step instructions and common mistakes for each exercise shown in the
 * visual muscle-group picker.
 *
 * Keys are the exercise names used in `muscle-groups.ts` (matched case- and
 * punctuation-insensitively). Coaching follows mainstream strength-training
 * guidance; it is general education, not individual medical advice.
 */

export type ExerciseHowTo = {
  /** Ordered "do this, then this" instructions. */
  steps: string[];
  /** Frequent errors and what to do instead. */
  mistakes: string[];
};

function key(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const HOWTO: Record<string, ExerciseHowTo> = {
  "Bench press": {
    steps: [
      "Lie back with eyes under the bar, feet flat and planted.",
      "Squeeze the shoulder blades back and down into the bench.",
      "Grip just outside shoulder width and unrack to over your chest.",
      "Lower under control to the mid-chest, elbows about 45° from the body.",
      "Press up and slightly back until the arms are straight.",
    ],
    mistakes: [
      "Flaring elbows straight out to the sides — stresses the shoulders.",
      "Bouncing the bar off the chest instead of pausing lightly.",
      "Lifting the hips off the bench to muscle the weight up.",
    ],
  },
  "Incline dumbbell press": {
    steps: [
      "Set the bench to roughly 30°, dumbbells resting on the thighs.",
      "Kick the dumbbells up as you lie back, shoulder blades pinned.",
      "Start with the weights just outside the upper chest.",
      "Press up and slightly inward until the arms are straight.",
      "Lower slowly until you feel a stretch across the upper chest.",
    ],
    mistakes: [
      "Setting the bench too steep, turning it into a shoulder press.",
      "Clanging the dumbbells together at the top.",
      "Dropping the elbows far below the bench and straining the shoulders.",
    ],
  },
  "Push-up": {
    steps: [
      "Hands under the shoulders, body in one line from head to heels.",
      "Brace the abs and squeeze the glutes.",
      "Lower the chest to just above the floor, elbows about 45°.",
      "Press the floor away until the arms are straight.",
    ],
    mistakes: [
      "Hips sagging or piking up instead of holding a straight line.",
      "Only going halfway down.",
      "Letting the head poke forward before the chest.",
    ],
  },
  "Cable fly": {
    steps: [
      "Set the pulleys around chest height and take one handle in each hand.",
      "Stagger your stance and lean slightly forward.",
      "Keep a soft bend in the elbows the whole set.",
      "Sweep the hands together in front of the chest and squeeze.",
      "Open back out slowly until you feel a chest stretch.",
    ],
    mistakes: [
      "Bending and straightening the elbows, turning it into a press.",
      "Using so much weight that the torso swings.",
      "Shrugging the shoulders up toward the ears.",
    ],
  },
  Dip: {
    steps: [
      "Grip the bars and press up to a tall, locked-out start.",
      "Lean the torso slightly forward for chest, stay upright for triceps.",
      "Lower until the upper arms are about parallel to the floor.",
      "Press back up without letting the shoulders shrug.",
    ],
    mistakes: [
      "Dropping too deep and straining the front of the shoulder.",
      "Bouncing at the bottom instead of controlling the descent.",
      "Swinging the legs to create momentum.",
    ],
  },
  "Pull-up": {
    steps: [
      "Grip the bar slightly wider than shoulder width, palms forward.",
      "Start from a full hang with the shoulders pulled down.",
      "Drive the elbows down and back, leading with the chest.",
      "Clear the chin over the bar, then lower all the way under control.",
    ],
    mistakes: [
      "Kipping or swinging the legs when strength runs out.",
      "Stopping short of a full hang between reps.",
      "Shrugging the shoulders up at the bottom.",
    ],
  },
  "Barbell row": {
    steps: [
      "Hinge at the hips until the torso is around 45°, back flat.",
      "Hold the bar just outside the knees, arms straight.",
      "Pull the bar to the lower ribs, elbows tracking back.",
      "Lower under control without letting the back round.",
    ],
    mistakes: [
      "Standing up with each rep to heave the weight.",
      "Rounding the lower back.",
      "Pulling to the chest instead of the lower ribs.",
    ],
  },
  "Lat pulldown": {
    steps: [
      "Set the thigh pad snug and grip just outside shoulder width.",
      "Sit tall with a slight backward lean, chest up.",
      "Pull the bar to the upper chest, driving the elbows down.",
      "Return slowly until the arms are straight and the lats stretch.",
    ],
    mistakes: [
      "Leaning far back and rowing instead of pulling down.",
      "Pulling behind the neck.",
      "Letting the weight stack yank the arms up at the top.",
    ],
  },
  "Seated cable row": {
    steps: [
      "Sit with knees softly bent and feet braced on the platform.",
      "Sit tall, chest up, arms extended with a light lat stretch.",
      "Pull the handle to the belly button, elbows close to the body.",
      "Extend the arms slowly without collapsing the chest.",
    ],
    mistakes: [
      "Rocking the torso back and forth for momentum.",
      "Rounding the back at the stretch.",
      "Shrugging the shoulders at the finish.",
    ],
  },
  Deadlift: {
    steps: [
      "Stand with the bar over mid-foot, feet about hip width.",
      "Hinge and grip just outside the knees, shins near the bar.",
      "Set a flat back, chest tall, lats squeezed and take the slack out.",
      "Push the floor away and stand up, bar dragging close to the legs.",
      "Lock out with the hips under you, then hinge the bar back down.",
    ],
    mistakes: [
      "Rounding the lower back off the floor.",
      "Letting the hips shoot up before the bar moves.",
      "Leaning back and hyperextending at the top.",
    ],
  },
  "Overhead press": {
    steps: [
      "Set the bar on the front delts, hands just outside the shoulders.",
      "Squeeze the glutes and brace the abs so the ribs stay down.",
      "Press up, tucking the chin out of the way.",
      "Finish with the bar over the mid-foot and the head through.",
    ],
    mistakes: [
      "Arching the lower back to press the weight.",
      "Pressing the bar forward around the face instead of straight up.",
      "Bending the knees to sneak in a push press.",
    ],
  },
  "Lateral raise": {
    steps: [
      "Stand tall with light dumbbells at your sides, elbows slightly bent.",
      "Lead with the elbows and raise the arms out to the sides.",
      "Stop around shoulder height, pinkies level with thumbs.",
      "Lower slowly, resisting the whole way down.",
    ],
    mistakes: [
      "Swinging the torso to fling the weights up.",
      "Going far above shoulder height and shrugging.",
      "Using heavy dumbbells and losing all control on the way down.",
    ],
  },
  "Face pull": {
    steps: [
      "Set a rope at upper-chest to face height.",
      "Step back until the cable is taut, arms extended.",
      "Pull the rope toward the face, hands splitting past the ears.",
      "Squeeze the rear delts, then return slowly.",
    ],
    mistakes: [
      "Loading too heavy and turning it into a high row.",
      "Leaning back to drag the weight.",
      "Letting the elbows drop below the wrists.",
    ],
  },
  "Bicep curl": {
    steps: [
      "Stand tall, dumbbells at your sides, palms forward.",
      "Keep the elbows pinned by the ribs.",
      "Curl up until the biceps are fully shortened.",
      "Lower slowly to a full stretch.",
    ],
    mistakes: [
      "Swinging the torso and using the lower back.",
      "Drifting the elbows forward so the front delts take over.",
      "Cutting the bottom half of the rep short.",
    ],
  },
  "Triceps pushdown": {
    steps: [
      "Set the cable high and grip the bar or rope.",
      "Stand close, elbows tucked at your sides, slight forward lean.",
      "Straighten the arms fully, squeezing the triceps.",
      "Let the bar return only until the forearms are parallel.",
    ],
    mistakes: [
      "Letting the elbows flare and travel forward.",
      "Leaning body weight onto the bar.",
      "Not locking out, so the triceps never fully contract.",
    ],
  },
  "Chin-up": {
    steps: [
      "Grip the bar shoulder width with palms facing you.",
      "Hang with the shoulders pulled down and the ribs tucked.",
      "Pull the elbows down toward the ribs until the chin clears the bar.",
      "Lower all the way under control.",
    ],
    mistakes: [
      "Swinging the hips to generate momentum.",
      "Half reps that never reach a full hang.",
      "Letting the shoulders shrug up at the bottom.",
    ],
  },
  "Back squat": {
    steps: [
      "Set the bar on the upper back, hands snug, and stand it out.",
      "Feet about shoulder width, toes slightly out.",
      "Brace the abs, break at the hips and knees together.",
      "Descend until the hip crease passes the knee, knees tracking the toes.",
      "Drive the floor away and stand up with the chest tall.",
    ],
    mistakes: [
      "Knees caving inward on the way up.",
      "Heels lifting or weight shifting onto the toes.",
      "Chest folding forward so it turns into a good morning.",
    ],
  },
  "Romanian deadlift": {
    steps: [
      "Stand tall holding the bar at the hips, knees softly bent.",
      "Push the hips straight back, keeping the bar against the legs.",
      "Lower until you feel a strong hamstring stretch, back flat.",
      "Drive the hips forward to stand, squeezing the glutes.",
    ],
    mistakes: [
      "Squatting the weight down instead of hinging.",
      "Rounding the lower back at the bottom.",
      "Letting the bar drift away from the thighs.",
    ],
  },
  "Leg press": {
    steps: [
      "Sit with the back and hips flat against the pad.",
      "Place the feet shoulder width in the middle of the platform.",
      "Unlock the sled and lower until the knees reach about 90°.",
      "Press through the whole foot without snapping the knees straight.",
    ],
    mistakes: [
      "Letting the lower back round off the pad at the bottom.",
      "Locking the knees hard at the top.",
      "Pushing with the toes and letting the heels lift.",
    ],
  },
  Lunge: {
    steps: [
      "Stand tall, feet hip width, core braced.",
      "Step forward far enough that the front shin stays near vertical.",
      "Lower until the back knee is just above the floor.",
      "Push through the front heel to return to standing.",
    ],
    mistakes: [
      "Short steps that push the front knee far past the toes.",
      "Letting the front knee cave inward.",
      "Leaning the torso forward over the front leg.",
    ],
  },
  "Leg curl": {
    steps: [
      "Set the pad just above the heels and the hips flat on the bench.",
      "Hold the handles and keep the hips down.",
      "Curl the heels toward the glutes and squeeze.",
      "Straighten the legs slowly, keeping tension.",
    ],
    mistakes: [
      "Lifting the hips off the pad to finish the rep.",
      "Dropping the weight fast on the way back.",
      "Using a range so short the hamstrings never fully shorten.",
    ],
  },
  "Leg extension": {
    steps: [
      "Sit back in the seat with the pad on the lower shins.",
      "Hold the handles and keep the hips seated.",
      "Straighten the knees fully and pause briefly.",
      "Lower slowly to about 90°.",
    ],
    mistakes: [
      "Swinging the weight up with a hip thrust.",
      "Slamming the stack down between reps.",
      "Setting the pad on the ankle joint instead of the shin.",
    ],
  },
  "Hip thrust": {
    steps: [
      "Sit with the shoulder blades on a bench, bar across the hips on a pad.",
      "Feet flat, shins vertical at the top, chin tucked.",
      "Drive through the heels and lift the hips to full extension.",
      "Squeeze the glutes hard, then lower under control.",
    ],
    mistakes: [
      "Arching the lower back instead of extending the hips.",
      "Feet placed too far away, turning it into a hamstring exercise.",
      "Letting the chin and ribs flare up at the top.",
    ],
  },
  "Glute bridge": {
    steps: [
      "Lie on your back, knees bent, feet flat and hip width.",
      "Tuck the ribs down and brace the abs.",
      "Push through the heels and lift the hips until the body is in a line.",
      "Squeeze the glutes for a second, then lower slowly.",
    ],
    mistakes: [
      "Overarching the lower back at the top.",
      "Pushing through the toes instead of the heels.",
      "Rushing reps without a glute squeeze.",
    ],
  },
  "Bulgarian split squat": {
    steps: [
      "Place the rear foot on a bench, front foot a long stride ahead.",
      "Keep the torso tall with a slight forward lean.",
      "Lower straight down until the back knee is near the floor.",
      "Drive up through the front heel.",
    ],
    mistakes: [
      "Front foot too close, jamming the knee forward.",
      "Pushing off the back foot instead of loading the front leg.",
      "Letting the hips twist to one side.",
    ],
  },
  "Hanging leg raise": {
    steps: [
      "Hang from the bar with the shoulders pulled down.",
      "Tilt the pelvis back to flatten the lower back.",
      "Lift the legs until the hips curl up, not just the thighs.",
      "Lower slowly without swinging.",
    ],
    mistakes: [
      "Swinging and using momentum between reps.",
      "Only raising the knees without curling the pelvis.",
      "Holding the breath and letting the ribs flare.",
    ],
  },
  Plank: {
    steps: [
      "Set the elbows under the shoulders, forearms flat.",
      "Extend the legs so the body forms one straight line.",
      "Tuck the tailbone slightly and brace the abs.",
      "Breathe steadily and hold for time.",
    ],
    mistakes: [
      "Hips sagging toward the floor.",
      "Hips piked high to make it easier.",
      "Holding the breath instead of breathing shallow and steady.",
    ],
  },
  "Hollow hold": {
    steps: [
      "Lie on your back and press the lower back into the floor.",
      "Lift the shoulder blades and legs a few inches off the floor.",
      "Reach the arms overhead, ribs pulled down.",
      "Hold, keeping the lower back glued down.",
    ],
    mistakes: [
      "Lower back arching off the floor.",
      "Legs so low that the back can't stay flat — raise them instead.",
      "Straining the neck instead of holding it neutral.",
    ],
  },
  "Side plank": {
    steps: [
      "Lie on your side with the elbow under the shoulder.",
      "Stack the feet or stagger them for a wider base.",
      "Lift the hips until the body is a straight line.",
      "Hold, then repeat on the other side.",
    ],
    mistakes: [
      "Hips dropping toward the floor.",
      "Rolling the chest forward or back.",
      "Letting the shoulder collapse into the elbow.",
    ],
  },
  "Dead bug": {
    steps: [
      "Lie on your back, arms up over the shoulders, knees over the hips at 90°.",
      "Press the lower back flat into the floor.",
      "Slowly lower the opposite arm and leg toward the floor.",
      "Return to the start and switch sides.",
    ],
    mistakes: [
      "Lower back arching as the leg lowers.",
      "Moving too fast to keep the brace.",
      "Holding the breath instead of exhaling on the reach.",
    ],
  },
  "Bird dog": {
    steps: [
      "Start on hands and knees, hands under shoulders, knees under hips.",
      "Brace the abs so the spine stays neutral.",
      "Extend the opposite arm and leg to body height.",
      "Pause, return, and switch sides.",
    ],
    mistakes: [
      "Rotating the hips open as the leg lifts.",
      "Lifting the leg above the hip and arching the back.",
      "Rushing instead of pausing at full extension.",
    ],
  },
  "Bicycle crunch": {
    steps: [
      "Lie on your back with hands lightly behind the head.",
      "Lift the shoulder blades and bring the knees over the hips.",
      "Rotate one elbow toward the opposite knee as the other leg extends.",
      "Alternate slowly, keeping the lower back down.",
    ],
    mistakes: [
      "Yanking on the neck with the hands.",
      "Speeding through reps with no rotation.",
      "Letting the lower back arch as the legs extend.",
    ],
  },
  "Russian twist": {
    steps: [
      "Sit with knees bent and lean back to about 45°.",
      "Brace the abs and keep the chest tall.",
      "Rotate the shoulders and arms to one side, then the other.",
      "Move at a controlled pace, heels down or lifted.",
    ],
    mistakes: [
      "Only swinging the arms while the torso stays still.",
      "Rounding the back and collapsing the chest.",
      "Going so fast the movement becomes momentum.",
    ],
  },
  "Reverse crunch": {
    steps: [
      "Lie on your back, arms by your sides, knees bent over the hips.",
      "Press the lower back into the floor.",
      "Curl the hips up off the floor toward the ribs.",
      "Lower the hips slowly without letting the back arch.",
    ],
    mistakes: [
      "Swinging the legs instead of curling the pelvis.",
      "Pushing the hands into the floor to launch the hips.",
      "Letting the feet drop and the back arch on the return.",
    ],
  },
  "Flutter kicks": {
    steps: [
      "Lie on your back with hands under the glutes if needed.",
      "Press the lower back down and lift both legs a few inches.",
      "Alternate small, quick kicks up and down.",
      "Keep breathing and stop when the back starts to arch.",
    ],
    mistakes: [
      "Legs so low the lower back peels off the floor.",
      "Kicking huge ranges instead of small controlled beats.",
      "Tensing the neck and shoulders.",
    ],
  },
  "V-up": {
    steps: [
      "Lie flat with arms overhead and legs straight.",
      "Brace the abs and exhale.",
      "Lift the arms and legs together to meet over the hips.",
      "Lower both sides slowly to just above the floor.",
    ],
    mistakes: [
      "Using a floor bounce to start the rep.",
      "Bending the knees heavily to shorten the lever.",
      "Crashing back down and losing the brace.",
    ],
  },
  "Superman hold": {
    steps: [
      "Lie face down with arms extended overhead.",
      "Squeeze the glutes and lift the chest, arms, and legs.",
      "Keep the neck long and gaze down at the floor.",
      "Hold, then lower with control.",
    ],
    mistakes: [
      "Cranking the neck up to look forward.",
      "Lifting only the arms and forgetting the legs.",
      "Bouncing into the top rather than holding.",
    ],
  },
  "Bear crawl hold": {
    steps: [
      "Start on hands and knees, hands under shoulders.",
      "Tuck the toes and lift the knees about an inch off the floor.",
      "Keep the back flat and the hips level.",
      "Hold and breathe, or crawl slowly if adding movement.",
    ],
    mistakes: [
      "Hips riding up high like a downward dog.",
      "Knees lifting too far off the floor.",
      "Rocking side to side instead of staying level.",
    ],
  },
  "Ab wheel rollout": {
    steps: [
      "Kneel with the wheel under the shoulders, hips over the knees.",
      "Tuck the pelvis and brace the abs hard.",
      "Roll out only as far as the back can stay flat.",
      "Pull the wheel back by driving the ribs toward the hips.",
    ],
    mistakes: [
      "Rolling out too far and sagging the lower back.",
      "Piking the hips to pull yourself back in.",
      "Letting the shoulders drift far behind the hands.",
    ],
  },
  "Pallof press": {
    steps: [
      "Stand side-on to a cable set at chest height.",
      "Hold the handle at the sternum with both hands, feet shoulder width.",
      "Brace and press the handle straight out in front of you.",
      "Resist the pull to rotate, then bring the hands back in.",
    ],
    mistakes: [
      "Letting the torso twist toward the cable.",
      "Standing too close so there's no resistance.",
      "Pressing with the arms while the hips shift sideways.",
    ],
  },
  "Calf raise": {
    steps: [
      "Stand with the balls of the feet on a step or the floor.",
      "Let the heels drop for a full stretch.",
      "Press up onto the toes as high as you can.",
      "Pause at the top, then lower slowly.",
    ],
    mistakes: [
      "Bouncing quick reps with no pause.",
      "Cutting the stretch at the bottom short.",
      "Rolling onto the outside edge of the foot.",
    ],
  },
  "Jump rope": {
    steps: [
      "Hold the handles at hip height, elbows close to the ribs.",
      "Turn the rope with the wrists, not the arms.",
      "Take small hops about an inch off the floor.",
      "Land softly on the balls of the feet and keep a steady rhythm.",
    ],
    mistakes: [
      "Jumping far too high and burning out fast.",
      "Swinging with the whole arm instead of the wrists.",
      "Landing flat-footed with locked knees.",
    ],
  },
  "Sprint interval": {
    steps: [
      "Warm up with 5–10 minutes of easy jogging and drills.",
      "Accelerate to near-max effort for the set work time.",
      "Stay tall with relaxed shoulders and quick ground contacts.",
      "Walk or jog the full recovery before the next rep.",
    ],
    mistakes: [
      "Sprinting hard with no warm-up.",
      "Cutting recovery short so later reps get slow and sloppy.",
      "Tensing the face, fists, and shoulders while running.",
    ],
  },
  "Rowing intervals": {
    steps: [
      "Set the damper around 4–6 and strap the feet in.",
      "Drive with the legs first, then swing the torso, then pull the arms.",
      "Reverse the order on the recovery: arms, torso, legs.",
      "Hold a steady stroke rate through each work interval.",
    ],
    mistakes: [
      "Yanking with the arms before the legs drive.",
      "Rounding the back at the catch.",
      "Rushing the slide back so the rhythm falls apart.",
    ],
  },
  "Assault bike": {
    steps: [
      "Set the seat so the knee is slightly bent at the bottom.",
      "Grip the handles and start with easy pedaling to warm up.",
      "Push and pull the arms while driving with the legs.",
      "Hold the target effort, then spin easy between intervals.",
    ],
    mistakes: [
      "Going all-out in the first 10 seconds and fading.",
      "Sitting too low so the knees jam up.",
      "Letting the arms go passive and doing all the work with the legs.",
    ],
  },
  Burpee: {
    steps: [
      "Start standing, feet shoulder width.",
      "Squat down, place the hands, and jump the feet back to a plank.",
      "Lower the chest to the floor, then press back up.",
      "Jump the feet back in and stand or jump straight up.",
    ],
    mistakes: [
      "Sagging hips in the plank and push-up.",
      "Landing hard with stiff knees on the jump.",
      "Rushing so much the reps lose all form.",
    ],
  },
  "Dumbbell bench press": {
    steps: [
      "Sit on the bench with a dumbbell on each thigh, then kick them back as you lie down.",
      "Pin the shoulder blades down and hold the weights over the mid-chest.",
      "Lower until the elbows are level with the torso, elbows about 45 degrees out.",
      "Press up and slightly together until the arms are straight.",
    ],
    mistakes: [
      "Letting the elbows flare straight out to the sides.",
      "Clanging the dumbbells together and losing chest tension.",
      "Dropping the weights faster than you can control them.",
    ],
  },
  "Machine chest press": {
    steps: [
      "Set the seat so the handles line up with the middle of your chest.",
      "Sit tall with the back and shoulders flat against the pad.",
      "Press the handles forward until the arms are straight but not locked.",
      "Return slowly until you feel a stretch across the chest.",
    ],
    mistakes: [
      "Setting the seat too high, which turns it into a shoulder press.",
      "Letting the shoulders roll forward off the pad.",
      "Slamming the weight stack down between reps.",
    ],
  },
  "Decline push-up": {
    steps: [
      "Place your feet on a bench or box and hands under the shoulders.",
      "Brace the abs and squeeze the glutes so the body is one line.",
      "Lower the chest toward the floor with the elbows about 45 degrees out.",
      "Press the floor away until the arms are straight.",
    ],
    mistakes: [
      "Letting the hips sag toward the floor.",
      "Only lowering halfway before pressing back up.",
      "Poking the head forward instead of leading with the chest.",
    ],
  },
  "Dumbbell floor press": {
    steps: [
      "Lie on the floor with knees bent and a dumbbell in each hand.",
      "Start with the weights over the chest and the elbows tucked.",
      "Lower until the upper arms rest lightly on the floor.",
      "Pause, then press back up until the arms are straight.",
    ],
    mistakes: [
      "Bouncing the elbows off the floor to start the press.",
      "Flaring the elbows wide and stressing the shoulders.",
      "Arching the lower back off the floor.",
    ],
  },
  "Chest-supported row": {
    steps: [
      "Set the bench to a slight incline and lie chest-down on the pad.",
      "Let the arms hang straight with the weights under the shoulders.",
      "Pull the elbows back and down, squeezing the shoulder blades together.",
      "Lower under control until the arms are straight again.",
    ],
    mistakes: [
      "Lifting the chest off the pad to heave the weight.",
      "Shrugging the shoulders up instead of rowing back.",
      "Using so much weight the range of motion shrinks.",
    ],
  },
  "Single-arm dumbbell row": {
    steps: [
      "Place one hand and knee on a bench with the other foot on the floor.",
      "Hold the dumbbell with a straight arm and a flat back.",
      "Row the elbow toward the hip, keeping it close to the body.",
      "Lower slowly until the arm is fully extended.",
    ],
    mistakes: [
      "Twisting the torso to lift heavier weight.",
      "Rounding the lower back instead of holding a flat spine.",
      "Yanking the weight up with the biceps only.",
    ],
  },
  "T-bar row": {
    steps: [
      "Straddle the bar with knees soft and hinge forward from the hips.",
      "Grip the handles and set a flat back with the chest up.",
      "Pull the handles to the lower ribs, driving the elbows back.",
      "Lower under control until the arms are straight.",
    ],
    mistakes: [
      "Standing up out of the hinge as you pull.",
      "Rounding the lower back under load.",
      "Jerking the weight with the hips instead of rowing.",
    ],
  },
  "Straight-arm pulldown": {
    steps: [
      "Stand facing a high cable with a bar or rope at chest height.",
      "Hinge slightly forward with soft elbows and a flat back.",
      "Sweep the bar down to the thighs using the lats, not the arms.",
      "Return slowly until the arms are overhead and stretched.",
    ],
    mistakes: [
      "Bending the elbows and turning it into a triceps pushdown.",
      "Leaning back to add momentum.",
      "Letting the shoulders shrug up at the top of each rep.",
    ],
  },
  "Rack pull": {
    steps: [
      "Set the bar in a rack at about knee height and stand mid-foot.",
      "Grip just outside the legs, chest up, flat back, lats tight.",
      "Drive the floor away and stand tall, finishing with the hips through.",
      "Lower under control back to the pins without bouncing.",
    ],
    mistakes: [
      "Rounding the lower back to start the pull.",
      "Hyperextending and leaning back at the top.",
      "Bouncing the bar off the pins between reps.",
    ],
  },
  "Dumbbell shoulder press": {
    steps: [
      "Sit tall with back support and dumbbells at shoulder height.",
      "Brace the abs so the ribs stay down.",
      "Press the weights overhead until the arms are straight.",
      "Lower slowly until the elbows are level with the shoulders.",
    ],
    mistakes: [
      "Arching the lower back to press heavier weight.",
      "Letting the elbows drift far behind the body.",
      "Bouncing out of the bottom of each rep.",
    ],
  },
  "Arnold press": {
    steps: [
      "Start seated with palms facing you and dumbbells at chest height.",
      "Rotate the palms outward as you begin pressing up.",
      "Finish overhead with the arms straight and palms forward.",
      "Reverse the rotation slowly on the way down.",
    ],
    mistakes: [
      "Rushing the rotation and losing shoulder control.",
      "Flaring the ribs and arching the lower back.",
      "Using weight so heavy the rotation disappears.",
    ],
  },
  "Cable lateral raise": {
    steps: [
      "Stand side-on to a low pulley and hold the handle across the body.",
      "Keep a soft elbow and a tall chest.",
      "Raise the arm out to the side to about shoulder height.",
      "Lower slowly, resisting the cable the whole way.",
    ],
    mistakes: [
      "Swinging the torso to start each rep.",
      "Raising far above shoulder height and shrugging.",
      "Letting the cable snap the arm back down.",
    ],
  },
  "Rear delt fly": {
    steps: [
      "Sit or hinge forward with a light dumbbell in each hand.",
      "Hold soft elbows and let the arms hang under the shoulders.",
      "Open the arms out and back, leading with the elbows.",
      "Lower under control without letting the weights swing.",
    ],
    mistakes: [
      "Using the upper traps to shrug the weight up.",
      "Going too heavy and turning it into a row.",
      "Rounding the upper back through the rep.",
    ],
  },
  "Upright row": {
    steps: [
      "Stand with a bar or dumbbells at the front of the thighs.",
      "Set a tall chest and braced abs.",
      "Pull the weight up toward the lower chest, elbows leading out and up.",
      "Lower slowly to the starting position.",
    ],
    mistakes: [
      "Pulling the bar up under the chin, which pinches the shoulder.",
      "Using a grip so narrow the wrists twist.",
      "Heaving with the lower back instead of the shoulders.",
    ],
  },
  "Barbell shrug": {
    steps: [
      "Stand tall holding the bar at arms' length in front of the thighs.",
      "Brace the abs and set the chin level.",
      "Shrug the shoulders straight up toward the ears and pause.",
      "Lower slowly until the traps are fully stretched.",
    ],
    mistakes: [
      "Rolling the shoulders in circles instead of straight up.",
      "Bending the elbows and rowing the bar.",
      "Bouncing the weight with the knees.",
    ],
  },
  "Hammer curl": {
    steps: [
      "Stand tall with a dumbbell in each hand, palms facing in.",
      "Pin the elbows at your sides and brace the abs.",
      "Curl the weights up without turning the wrists.",
      "Lower slowly until the arms are straight.",
    ],
    mistakes: [
      "Swinging the torso to launch the weight.",
      "Letting the elbows drift forward at the top.",
      "Cutting the lowering phase short.",
    ],
  },
  "Incline dumbbell curl": {
    steps: [
      "Set a bench to about 45 degrees and sit back with arms hanging.",
      "Let the shoulders stay back against the pad.",
      "Curl the weights up while keeping the elbows still.",
      "Lower all the way until the biceps are stretched.",
    ],
    mistakes: [
      "Letting the elbows swing forward to shorten the range.",
      "Shrugging the shoulders off the pad.",
      "Using weight so heavy the bottom stretch is skipped.",
    ],
  },
  "Preacher curl": {
    steps: [
      "Set the pad so the armpits rest on the top edge.",
      "Hold the bar with the arms extended along the pad.",
      "Curl up until the forearms are just past vertical.",
      "Lower slowly until the arms are almost straight.",
    ],
    mistakes: [
      "Letting the arms snap straight at the bottom.",
      "Lifting the elbows off the pad to cheat the weight up.",
      "Standing up out of the seat to finish reps.",
    ],
  },
  "Skull crusher": {
    steps: [
      "Lie on a bench holding the bar over the chest with straight arms.",
      "Keep the upper arms angled slightly back and still.",
      "Bend the elbows to lower the bar toward the forehead.",
      "Extend the elbows to press the bar back up.",
    ],
    mistakes: [
      "Letting the elbows flare wide on the way down.",
      "Moving the upper arms instead of hinging only at the elbows.",
      "Lowering faster than you can control.",
    ],
  },
  "Overhead cable extension": {
    steps: [
      "Set a rope on a low or mid pulley and face away from the stack.",
      "Hold the rope overhead with the elbows bent behind the head.",
      "Keep the upper arms still and extend the elbows straight.",
      "Return slowly to the deep stretch behind the head.",
    ],
    mistakes: [
      "Letting the elbows flare wide and drop.",
      "Leaning so far forward the lower back arches.",
      "Using the shoulders to push the rope forward.",
    ],
  },
  "Close-grip bench press": {
    steps: [
      "Lie on the bench and grip the bar about shoulder width.",
      "Pin the shoulder blades and unrack over the chest.",
      "Lower with the elbows tucked close to the ribs.",
      "Press back up until the arms are straight.",
    ],
    mistakes: [
      "Gripping so narrow the wrists bend painfully.",
      "Flaring the elbows and turning it into a wide bench press.",
      "Bouncing the bar off the chest.",
    ],
  },
  "Reverse curl": {
    steps: [
      "Stand tall holding the bar with palms facing down.",
      "Pin the elbows at your sides and brace the abs.",
      "Curl the bar up without letting the wrists break backward.",
      "Lower slowly until the arms are straight.",
    ],
    mistakes: [
      "Swinging the body to move heavier weight.",
      "Letting the wrists collapse under the bar.",
      "Rushing the lowering phase.",
    ],
  },
};

const BY_KEY: Record<string, ExerciseHowTo> = Object.fromEntries(
  Object.entries(HOWTO).map(([name, value]) => [key(name), value]),
);

/** Steps and common mistakes for an exercise, or null when not documented. */
export function exerciseHowTo(name: string): ExerciseHowTo | null {
  return BY_KEY[key(name)] ?? null;
}

/** All documented exercise names (used by coverage tests). */
export const HOWTO_NAMES = Object.keys(HOWTO);
