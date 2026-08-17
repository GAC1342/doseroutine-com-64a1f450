/**
 * Anatomical illustration for each exercise in the muscle-group picker.
 *
 * Each image is a gym-chart style anatomy drawing of the movement with the
 * worked muscle shaded, so the user sees the real body position instead of a
 * schematic figure. Keyed by the exercise name in `muscle-groups.ts`.
 */

import { MUSCLE_LABELS } from "@/components/muscle-map";
import { MUSCLE_GROUPS } from "@/lib/muscle-groups";

import assaultBikeArt from "@/assets/exercises/assault-bike.jpg.asset.json";
import backSquatArt from "@/assets/exercises/back-squat.jpg.asset.json";
import boxingArt from "@/assets/exercises/boxing.jpg.asset.json";
import crossfitArt from "@/assets/exercises/crossfit.jpg.asset.json";
import kettlebellSwingArt from "@/assets/exercises/kettlebell.jpg.asset.json";
import pilatesArt from "@/assets/exercises/pilates.jpg.asset.json";
import stretchingArt from "@/assets/exercises/stretching.jpg.asset.json";
import yogaArt from "@/assets/exercises/yoga.jpg.asset.json";
import barbellRowArt from "@/assets/exercises/barbell-row.jpg.asset.json";
import benchPressArt from "@/assets/exercises/bench-press.jpg.asset.json";
import bicepCurlArt from "@/assets/exercises/bicep-curl.jpg.asset.json";
import bulgarianSplitSquatArt from "@/assets/exercises/bulgarian-split-squat.jpg.asset.json";
import burpeeArt from "@/assets/exercises/burpee.jpg.asset.json";
import cableFlyArt from "@/assets/exercises/cable-fly.jpg.asset.json";
import calfRaiseArt from "@/assets/exercises/calf-raise.jpg.asset.json";
import chinUpArt from "@/assets/exercises/chin-up.jpg.asset.json";
import deadliftArt from "@/assets/exercises/deadlift.jpg.asset.json";
import dipArt from "@/assets/exercises/dip.jpg.asset.json";
import facePullArt from "@/assets/exercises/face-pull.jpg.asset.json";
import gluteBridgeArt from "@/assets/exercises/glute-bridge.jpg.asset.json";
import hangingLegRaiseArt from "@/assets/exercises/hanging-leg-raise.jpg.asset.json";
import hipThrustArt from "@/assets/exercises/hip-thrust.jpg.asset.json";
import hollowHoldArt from "@/assets/exercises/hollow-hold.jpg.asset.json";
import inclineDumbbellPressArt from "@/assets/exercises/incline-dumbbell-press.jpg.asset.json";
import jumpRopeArt from "@/assets/exercises/jump-rope.jpg.asset.json";
import latPulldownArt from "@/assets/exercises/lat-pulldown.jpg.asset.json";
import lateralRaiseArt from "@/assets/exercises/lateral-raise.jpg.asset.json";
import legCurlArt from "@/assets/exercises/leg-curl.jpg.asset.json";
import legExtensionArt from "@/assets/exercises/leg-extension.jpg.asset.json";
import legPressArt from "@/assets/exercises/leg-press.jpg.asset.json";
import lungeArt from "@/assets/exercises/lunge.jpg.asset.json";
import overheadPressArt from "@/assets/exercises/overhead-press.jpg.asset.json";
import plankArt from "@/assets/exercises/plank.jpg.asset.json";
import pullUpArt from "@/assets/exercises/pull-up.jpg.asset.json";
import pushUpArt from "@/assets/exercises/push-up.jpg.asset.json";
import romanianDeadliftArt from "@/assets/exercises/romanian-deadlift.jpg.asset.json";
import rowingIntervalsArt from "@/assets/exercises/rowing-intervals.jpg.asset.json";
import seatedCableRowArt from "@/assets/exercises/seated-cable-row.jpg.asset.json";
import sidePlankArt from "@/assets/exercises/side-plank.jpg.asset.json";
import sprintIntervalArt from "@/assets/exercises/sprint-interval.jpg.asset.json";
import tricepsPushdownArt from "@/assets/exercises/triceps-pushdown.jpg.asset.json";
import bodyweightSquatArt from "@/assets/exercises/bodyweight-squat.jpg.asset.json";
import donkeyKickArt from "@/assets/exercises/donkey-kick.jpg.asset.json";
import fireHydrantArt from "@/assets/exercises/fire-hydrant.jpg.asset.json";
import sumoSquatArt from "@/assets/exercises/sumo-squat.jpg.asset.json";
import standingKickbackArt from "@/assets/exercises/standing-kickback.jpg.asset.json";

// Core & flexibility illustrations.
import deadBugArt from "@/assets/exercises/dead-bug.jpg.asset.json";
import birdDogArt from "@/assets/exercises/bird-dog.jpg.asset.json";
import bicycleCrunchArt from "@/assets/exercises/bicycle-crunch.jpg.asset.json";
import russianTwistArt from "@/assets/exercises/russian-twist.jpg.asset.json";
import reverseCrunchArt from "@/assets/exercises/reverse-crunch.jpg.asset.json";
import flutterKicksArt from "@/assets/exercises/flutter-kicks.jpg.asset.json";
import pallofPressArt from "@/assets/exercises/pallof-press.jpg.asset.json";
import abWheelRolloutArt from "@/assets/exercises/ab-wheel-rollout.jpg.asset.json";
import supermanHoldArt from "@/assets/exercises/superman-hold.jpg.asset.json";
import vUpArt from "@/assets/exercises/v-up.jpg.asset.json";
import bearCrawlArt from "@/assets/exercises/bear-crawl.jpg.asset.json";
import figureFourStretchArt from "@/assets/exercises/figure-four-stretch.jpg.asset.json";
import ninetyNinetyArt from "@/assets/exercises/ninety-ninety-stretch.jpg.asset.json";
import lyingSpinalTwistArt from "@/assets/exercises/lying-spinal-twist.jpg.asset.json";
import calfStretchArt from "@/assets/exercises/calf-stretch.jpg.asset.json";
import worldsGreatestStretchArt from "@/assets/exercises/worlds-greatest-stretch.jpg.asset.json";

// Mind-body, boxing and swim illustrations (direct image imports).
import downwardDogArt from "@/assets/exercises/downward-dog.jpg";
import warriorTwoArt from "@/assets/exercises/warrior-two.jpg";
import treePoseArt from "@/assets/exercises/tree-pose.jpg";
import childsPoseArt from "@/assets/exercises/childs-pose.jpg";
import cobraPoseArt from "@/assets/exercises/cobra-pose.jpg";
import chairPoseArt from "@/assets/exercises/chair-pose.jpg";
import pigeonPoseArt from "@/assets/exercises/pigeon-pose.jpg";
import catCowArt from "@/assets/exercises/cat-cow.jpg";
import pilatesHundredArt from "@/assets/exercises/pilates-hundred.jpg";
import pilatesRollUpArt from "@/assets/exercises/pilates-roll-up.jpg";
import singleLegStretchArt from "@/assets/exercises/single-leg-stretch.jpg";
import pilatesTeaserArt from "@/assets/exercises/pilates-teaser.jpg";
import pilatesSwanArt from "@/assets/exercises/pilates-swan.jpg";
import legCirclesArt from "@/assets/exercises/leg-circles.jpg";
import sideKickSeriesArt from "@/assets/exercises/side-kick-series.jpg";
import reformerArt from "@/assets/exercises/reformer.jpg";
import jabArt from "@/assets/exercises/jab.jpg";
import crossPunchArt from "@/assets/exercises/cross-punch.jpg";
import uppercutArt from "@/assets/exercises/uppercut.jpg";
import heavyBagArt from "@/assets/exercises/heavy-bag.jpg";
import shadowBoxingArt from "@/assets/exercises/shadow-boxing.jpg";
import footworkDrillsArt from "@/assets/exercises/footwork-drills.jpg";
import freestyleSwimArt from "@/assets/exercises/freestyle-swim.jpg";
import backstrokeArt from "@/assets/exercises/backstroke.jpg";
import breaststrokeArt from "@/assets/exercises/breaststroke.jpg";
import butterflySwimArt from "@/assets/exercises/butterfly-swim.jpg";
import kickSetArt from "@/assets/exercises/kick-set.jpg";
import pullSetArt from "@/assets/exercises/pull-set.jpg";
import hamstringStretchArt from "@/assets/exercises/hamstring-stretch.jpg";
import hipFlexorStretchArt from "@/assets/exercises/hip-flexor-stretch.jpg";
import quadStretchArt from "@/assets/exercises/quad-stretch.jpg";
import chestOpenerArt from "@/assets/exercises/chest-opener.jpg";
import seatedForwardFoldArt from "@/assets/exercises/seated-forward-fold.jpg";
import hipMobilityArt from "@/assets/exercises/hip-mobility.jpg";
import shoulderMobilityArt from "@/assets/exercises/shoulder-mobility.jpg";
import thoracicRotationArt from "@/assets/exercises/thoracic-rotation.jpg";
import ankleMobilityArt from "@/assets/exercises/ankle-mobility.jpg";
import foamRollingArt from "@/assets/exercises/foam-rolling.jpg";

// Expanded yoga pose library.
import mountainPoseArt from "@/assets/exercises/mountain-pose.jpg";
import standingForwardFoldArt from "@/assets/exercises/standing-forward-fold.jpg";
import lowLungeArt from "@/assets/exercises/low-lunge.jpg";
import bridgePoseArt from "@/assets/exercises/bridge-pose.jpg";
import sphinxPoseArt from "@/assets/exercises/sphinx-pose.jpg";
import butterflyPoseArt from "@/assets/exercises/butterfly-pose.jpg";
import warriorOneArt from "@/assets/exercises/warrior-one.jpg";
import warriorThreeArt from "@/assets/exercises/warrior-three.jpg";
import trianglePoseArt from "@/assets/exercises/triangle-pose.jpg";
import extendedSideAngleArt from "@/assets/exercises/extended-side-angle.jpg";
import chaturangaArt from "@/assets/exercises/chaturanga.jpg";
import upwardDogArt from "@/assets/exercises/upward-dog.jpg";
import boatPoseArt from "@/assets/exercises/boat-pose.jpg";
import seatedTwistArt from "@/assets/exercises/seated-twist.jpg";
import camelPoseArt from "@/assets/exercises/camel-pose.jpg";
import halfMoonPoseArt from "@/assets/exercises/half-moon-pose.jpg";
import dancerPoseArt from "@/assets/exercises/dancer-pose.jpg";
import eaglePoseArt from "@/assets/exercises/eagle-pose.jpg";
import crowPoseArt from "@/assets/exercises/crow-pose.jpg";
import wheelPoseArt from "@/assets/exercises/wheel-pose.jpg";
import headstandArt from "@/assets/exercises/headstand.jpg";
import corpsePoseArt from "@/assets/exercises/corpse-pose.jpg";
import legsUpTheWallArt from "@/assets/exercises/legs-up-the-wall.jpg";

// Cardio activities.
import runningArt from "@/assets/exercises/running.jpg";
import walkingArt from "@/assets/exercises/walking.jpg";
import hikingArt from "@/assets/exercises/hiking.jpg";
import cyclingArt from "@/assets/exercises/cycling.jpg";
import ellipticalArt from "@/assets/exercises/elliptical.jpg";
import stairClimbArt from "@/assets/exercises/stair-climb.jpg";
import skiErgArt from "@/assets/exercises/ski-erg.jpg";

// Strength, bodyweight and CrossFit movements.
import pistolSquatArt from "@/assets/exercises/pistol-squat.jpg";
import mountainClimberArt from "@/assets/exercises/mountain-climber.jpg";
import invertedRowArt from "@/assets/exercises/inverted-row.jpg";
import nordicCurlArt from "@/assets/exercises/nordic-curl.jpg";
import handstandHoldArt from "@/assets/exercises/handstand-hold.jpg";
import frontSquatArt from "@/assets/exercises/front-squat.jpg";
import gobletSquatArt from "@/assets/exercises/goblet-squat.jpg";
import turkishGetUpArt from "@/assets/exercises/turkish-get-up.jpg";
import farmerCarryArt from "@/assets/exercises/farmer-carry.jpg";
import cleanAndJerkArt from "@/assets/exercises/clean-and-jerk.jpg";
import snatchArt from "@/assets/exercises/snatch.jpg";
import wallBallArt from "@/assets/exercises/wall-ball.jpg";
import boxJumpArt from "@/assets/exercises/box-jump.jpg";
import battleRopesArt from "@/assets/exercises/battle-ropes.jpg";
import jumpSquatArt from "@/assets/exercises/jump-squat.jpg";
import toesToBarArt from "@/assets/exercises/toes-to-bar.jpg";
import thrusterArt from "@/assets/exercises/thruster.jpg";

// Sport: martial arts, climbing, dance, racquet.
import bjjRollingArt from "@/assets/exercises/bjj-rolling.jpg";
import golfSwingArt from "@/assets/exercises/golf-swing.jpg";
import soccerArt from "@/assets/exercises/soccer.jpg";
import basketballArt from "@/assets/exercises/basketball.jpg";
import volleyballArt from "@/assets/exercises/volleyball.jpg";
import skiingArt from "@/assets/exercises/skiing.jpg";
import surfingArt from "@/assets/exercises/surfing.jpg";
import paddleboardArt from "@/assets/exercises/paddleboard.jpg";
import kayakArt from "@/assets/exercises/kayak.jpg";
import breathworkArt from "@/assets/exercises/breathwork.jpg";
import windmillArt from "@/assets/exercises/windmill.jpg";
import haloArt from "@/assets/exercises/halo.jpg";
import skatingArt from "@/assets/exercises/skating.jpg";
import muayThaiKickArt from "@/assets/exercises/muay-thai-kick.jpg";
import boulderingArt from "@/assets/exercises/bouldering.jpg";
import hangboardArt from "@/assets/exercises/hangboard.jpg";
import danceArt from "@/assets/exercises/dance.jpg";
import tennisArt from "@/assets/exercises/tennis.jpg";




export const EXERCISE_ART: Record<string, string> = {
  "Assault bike": assaultBikeArt.url,
  "Back squat": backSquatArt.url,
  "Barbell row": barbellRowArt.url,
  "Bench press": benchPressArt.url,
  "Bicep curl": bicepCurlArt.url,
  Boxing: boxingArt.url,
  "Bulgarian split squat": bulgarianSplitSquatArt.url,
  Burpee: burpeeArt.url,
  "Cable fly": cableFlyArt.url,
  "Calf raise": calfRaiseArt.url,
  "Chin-up": chinUpArt.url,
  "CrossFit / WOD": crossfitArt.url,
  Deadlift: deadliftArt.url,
  Dip: dipArt.url,
  "Face pull": facePullArt.url,
  "Glute bridge": gluteBridgeArt.url,
  "Hanging leg raise": hangingLegRaiseArt.url,
  "Hip thrust": hipThrustArt.url,
  "Hollow hold": hollowHoldArt.url,
  "Incline dumbbell press": inclineDumbbellPressArt.url,
  "Jump rope": jumpRopeArt.url,
  "Kettlebell swing": kettlebellSwingArt.url,
  "Lat pulldown": latPulldownArt.url,
  "Lateral raise": lateralRaiseArt.url,
  "Leg curl": legCurlArt.url,
  "Leg extension": legExtensionArt.url,
  "Leg press": legPressArt.url,
  Lunge: lungeArt.url,
  "Overhead press": overheadPressArt.url,
  Pilates: pilatesArt.url,
  Plank: plankArt.url,
  "Pull-up": pullUpArt.url,
  "Push-up": pushUpArt.url,
  "Romanian deadlift": romanianDeadliftArt.url,
  "Rowing intervals": rowingIntervalsArt.url,
  "Seated cable row": seatedCableRowArt.url,
  "Side plank": sidePlankArt.url,
  "Sprint interval": sprintIntervalArt.url,
  Stretching: stretchingArt.url,
  "Triceps pushdown": tricepsPushdownArt.url,
  Yoga: yogaArt.url,
  "Bodyweight squat": bodyweightSquatArt.url,
  "Donkey kick": donkeyKickArt.url,
  "Fire hydrant": fireHydrantArt.url,
  "Sumo squat": sumoSquatArt.url,
  "Standing kickback": standingKickbackArt.url,

  // Core & flexibility
  "Dead bug": deadBugArt.url,
  "Bird dog": birdDogArt.url,
  "Bicycle crunch": bicycleCrunchArt.url,
  "Russian twist": russianTwistArt.url,
  "Reverse crunch": reverseCrunchArt.url,
  "Flutter kicks": flutterKicksArt.url,
  "Pallof press": pallofPressArt.url,
  "Ab wheel rollout": abWheelRolloutArt.url,
  "Superman hold": supermanHoldArt.url,
  "V-up": vUpArt.url,
  "Bear crawl hold": bearCrawlArt.url,
  "Figure-four stretch": figureFourStretchArt.url,
  "90/90 hip stretch": ninetyNinetyArt.url,
  "Lying spinal twist": lyingSpinalTwistArt.url,
  "Calf stretch": calfStretchArt.url,
  "World's greatest stretch": worldsGreatestStretchArt.url,

  // Yoga
  "Downward dog": downwardDogArt,
  "Warrior II": warriorTwoArt,
  "Tree pose": treePoseArt,
  "Child's pose": childsPoseArt,
  "Cobra pose": cobraPoseArt,
  "Chair pose": chairPoseArt,
  "Pigeon pose": pigeonPoseArt,
  "Cat-cow": catCowArt,

  // Pilates
  Hundred: pilatesHundredArt,
  "Roll-up": pilatesRollUpArt,
  "Single leg stretch": singleLegStretchArt,
  Teaser: pilatesTeaserArt,
  Swan: pilatesSwanArt,
  "Leg circles": legCirclesArt,
  "Side kick series": sideKickSeriesArt,
  Reformer: reformerArt,

  // Boxing
  Jab: jabArt,
  Cross: crossPunchArt,
  Hook: crossPunchArt,
  Uppercut: uppercutArt,
  "Heavy bag": heavyBagArt,
  "Shadow boxing": shadowBoxingArt,
  "Pad work": shadowBoxingArt,
  "Footwork drills": footworkDrillsArt,

  // Swimming
  "Freestyle laps": freestyleSwimArt,
  Backstroke: backstrokeArt,
  Breaststroke: breaststrokeArt,
  Butterfly: butterflySwimArt,
  "Kick set": kickSetArt,
  "Pull set": pullSetArt,

  // Stretching & mobility
  "Hamstring stretch": hamstringStretchArt,
  "Hip flexor stretch": hipFlexorStretchArt,
  "Quad stretch": quadStretchArt,
  "Chest opener": chestOpenerArt,
  "Seated forward fold": seatedForwardFoldArt,
  "Hip mobility": hipMobilityArt,
  "Shoulder mobility": shoulderMobilityArt,
  "Thoracic rotations": thoracicRotationArt,
  "Ankle mobility": ankleMobilityArt,
  "Foam rolling": foamRollingArt,

  // Yoga — foundations
  "Mountain pose": mountainPoseArt,
  "Standing forward fold": standingForwardFoldArt,
  "Low lunge": lowLungeArt,
  "Bridge pose": bridgePoseArt,
  "Sphinx pose": sphinxPoseArt,
  "Butterfly pose": butterflyPoseArt,
  "Corpse pose": corpsePoseArt,
  "Legs up the wall": legsUpTheWallArt,

  // Yoga — intermediate
  "Warrior I": warriorOneArt,
  "Warrior III": warriorThreeArt,
  "Triangle pose": trianglePoseArt,
  "Extended side angle": extendedSideAngleArt,
  Chaturanga: chaturangaArt,
  "Upward dog": upwardDogArt,
  "Boat pose": boatPoseArt,
  "Seated twist": seatedTwistArt,
  "Camel pose": camelPoseArt,

  // Yoga — advanced
  "Half moon pose": halfMoonPoseArt,
  "Dancer pose": dancerPoseArt,
  "Eagle pose": eaglePoseArt,
  "Crow pose": crowPoseArt,
  "Wheel pose": wheelPoseArt,
  Headstand: headstandArt,

  // Cardio
  Running: runningArt,
  Walking: walkingArt,
  Hiking: hikingArt,
  Cycling: cyclingArt,
  Elliptical: ellipticalArt,
  "Stair climb": stairClimbArt,
  "Ski erg": skiErgArt,

  // Bodyweight & strength
  "Pistol squat": pistolSquatArt,
  "Mountain climber": mountainClimberArt,
  "Inverted row": invertedRowArt,
  "Nordic curl": nordicCurlArt,
  "Handstand hold": handstandHoldArt,
  "Front squat": frontSquatArt,
  "Goblet squat": gobletSquatArt,
  "Turkish get-up": turkishGetUpArt,
  "Farmer carry": farmerCarryArt,

  // CrossFit / conditioning
  "Clean & jerk": cleanAndJerkArt,
  Snatch: snatchArt,
  "Wall ball": wallBallArt,
  "Box jump": boxJumpArt,
  "Battle ropes": battleRopesArt,
  "Jump squat": jumpSquatArt,
  "Toes to bar": toesToBarArt,
  Thruster: thrusterArt,

  // Sport
  "BJJ rolling": bjjRollingArt,
  "Muay Thai pads": muayThaiKickArt,
  Bouldering: boulderingArt,
  Hangboard: hangboardArt,
  Dance: danceArt,
  "Tennis match": tennisArt,
  "18 holes": golfSwingArt,
  Soccer: soccerArt,
  Basketball: basketballArt,
  Volleyball: volleyballArt,
  Skiing: skiingArt,
  "Surf session": surfingArt,
  Paddleboard: paddleboardArt,
  Kayak: kayakArt,
  "Diaphragmatic breathing": breathworkArt,
  Windmill: windmillArt,
  Halo: haloArt,
  Skating: skatingArt,
};


/** "Barbell Bench Press!" -> "barbell bench press" */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Common ways users type the same movement. */
const ALIASES: Record<string, string> = {
  "barbell bench press": "Bench press",
  "flat bench press": "Bench press",
  "db bench press": "Bench press",
  "dumbbell bench press": "Bench press",
  "chest press": "Bench press",
  "incline bench press": "Incline dumbbell press",
  "incline press": "Incline dumbbell press",
  pushup: "Push-up",
  pushups: "Push-up",
  "press up": "Push-up",
  pullup: "Pull-up",
  pullups: "Pull-up",
  chinup: "Chin-up",
  "bent over row": "Barbell row",
  "bent over barbell row": "Barbell row",
  "pull down": "Lat pulldown",
  pulldown: "Lat pulldown",
  "cable row": "Seated cable row",
  "shoulder press": "Overhead press",
  "military press": "Overhead press",
  ohp: "Overhead press",
  "side raise": "Lateral raise",
  "lateral raises": "Lateral raise",
  "dumbbell curl": "Bicep curl",
  "barbell curl": "Bicep curl",
  "biceps curl": "Bicep curl",
  curl: "Bicep curl",
  "tricep pushdown": "Triceps pushdown",
  "rope pushdown": "Triceps pushdown",
  squat: "Back squat",
  "barbell squat": "Back squat",
  "back squats": "Back squat",
  rdl: "Romanian deadlift",
  "stiff leg deadlift": "Romanian deadlift",
  "conventional deadlift": "Deadlift",
  "walking lunge": "Lunge",
  lunges: "Lunge",
  "split squat": "Bulgarian split squat",
  "hamstring curl": "Leg curl",
  "quad extension": "Leg extension",
  "barbell hip thrust": "Hip thrust",
  "calf raises": "Calf raise",
  "standing calf raise": "Calf raise",
  "skipping rope": "Jump rope",
  skipping: "Jump rope",
  sprints: "Sprint interval",
  "sprint intervals": "Sprint interval",
  rowing: "Rowing intervals",
  "row erg": "Rowing intervals",
  "air bike": "Assault bike",
  burpees: "Burpee",
  planks: "Plank",
  dips: "Dip",
  flyes: "Cable fly",
  "chest fly": "Cable fly",
  // Workout-type illustrations
  "yoga flow": "Yoga",
  vinyasa: "Yoga",
  "hot yoga": "Yoga",
  "mat pilates": "Pilates",
  "reformer pilates": "Pilates",
  stretch: "Stretching",
  stretching: "Stretching",
  mobility: "Stretching",
  "mobility work": "Stretching",
  flexibility: "Stretching",
  kettlebell: "Kettlebell swing",
  kettlebells: "Kettlebell swing",
  "kb swing": "Kettlebell swing",
  "russian swing": "Kettlebell swing",
  crossfit: "CrossFit / WOD",
  "cross fit": "CrossFit / WOD",
  wod: "CrossFit / WOD",
  "metcon": "CrossFit / WOD",
  thruster: "CrossFit / WOD",
  boxing: "Boxing",
  "heavy bag": "Boxing",
  "bag work": "Boxing",
  kickboxing: "Boxing",
  "shadow boxing": "Boxing",
  "jump rope skipping": "Jump rope",
  // Bodyweight glute work
  "air squat": "Bodyweight squat",
  "bodyweight squats": "Bodyweight squat",
  "body weight squat": "Bodyweight squat",
  "donkey kicks": "Donkey kick",
  "donkey kick right": "Donkey kick",
  "donkey kick left": "Donkey kick",
  "fire hydrants": "Fire hydrant",
  "fire hydrant right": "Fire hydrant",
  "fire hydrant left": "Fire hydrant",
  "sumo squats": "Sumo squat",
  "wide stance squat": "Sumo squat",
  "standing kickbacks": "Standing kickback",
  "glute kickback": "Standing kickback",
  "glute kickbacks": "Standing kickback",
  "glute bridges": "Glute bridge",
  // Yoga poses
  "downward facing dog": "Downward dog",
  "down dog": "Downward dog",
  "adho mukha svanasana": "Downward dog",
  "warrior 2": "Warrior II",
  "warrior two": "Warrior II",
  "warrior ii pose": "Warrior II",
  "vrksasana": "Tree pose",
  "balasana": "Child's pose",
  "childs pose": "Child's pose",
  "bhujangasana": "Cobra pose",
  cobra: "Cobra pose",
  "utkatasana": "Chair pose",
  "cat cow": "Cat-cow",
  "cat camel": "Cat-cow",
  "sun salutations": "Yoga",
  "sun salutation": "Yoga",
  "vinyasa flow": "Yoga",
  hatha: "Yoga",
  yin: "Yoga",
  "power yoga": "Yoga",
  restorative: "Yoga",
  "hip openers": "Pigeon pose",
  // Pilates
  "the hundred": "Hundred",
  "hundreds": "Hundred",
  "roll up": "Roll-up",
  "core series": "Hundred",
  "single leg stretch": "Single leg stretch",
  "double leg stretch": "Single leg stretch",
  "the teaser": "Teaser",
  "swan dive": "Swan",
  "single leg circles": "Leg circles",
  "side kicks": "Side kick series",
  "reformer pilates class": "Reformer",
  // Boxing
  jabs: "Jab",
  "jab cross": "Cross",
  "straight right": "Cross",
  "lead hook": "Hook",
  hooks: "Hook",
  uppercuts: "Uppercut",
  "bag rounds": "Heavy bag",
  "mitt work": "Pad work",
  "pads": "Pad work",
  "speed bag": "Heavy bag",
  footwork: "Footwork drills",
  // Swimming
  freestyle: "Freestyle laps",
  "front crawl": "Freestyle laps",
  "freestyle swim": "Freestyle laps",
  "back stroke": "Backstroke",
  "breast stroke": "Breaststroke",
  "butterfly stroke": "Butterfly",
  "kick board set": "Kick set",
  "flutter kick": "Kick set",
  "pull buoy set": "Pull set",
  // Stretching & mobility
  "hamstring stretches": "Hamstring stretch",
  "standing hamstring stretch": "Hamstring stretch",
  "couch stretch": "Hip flexor stretch",
  "quadriceps stretch": "Quad stretch",
  "doorway stretch": "Chest opener",
  "forward fold": "Seated forward fold",
  "90 90 hip": "Hip mobility",
  "hip openers mobility": "Hip mobility",
  "shoulder dislocates": "Shoulder mobility",
  "pass throughs": "Shoulder mobility",
  "thoracic rotation": "Thoracic rotations",
  "open book": "Thoracic rotations",
  "t spine rotation": "Thoracic rotations",
  "knee to wall": "Ankle mobility",
  "foam roll": "Foam rolling",
  "foam roller": "Foam rolling",
  // Yoga poses (English + Sanskrit)
  tadasana: "Mountain pose",
  "mountain pose yoga": "Mountain pose",
  uttanasana: "Standing forward fold",
  "standing fold": "Standing forward fold",
  "forward fold standing": "Standing forward fold",
  anjaneyasana: "Low lunge",
  "crescent lunge": "Low lunge",
  "runners lunge": "Low lunge",
  "setu bandha": "Bridge pose",
  "supported bridge": "Bridge pose",
  "salamba bhujangasana": "Sphinx pose",
  sphinx: "Sphinx pose",
  "bound angle": "Butterfly pose",
  baddhakonasana: "Butterfly pose",
  "baddha konasana": "Butterfly pose",
  "cobblers pose": "Butterfly pose",
  savasana: "Corpse pose",
  shavasana: "Corpse pose",
  "final relaxation": "Corpse pose",
  viparita: "Legs up the wall",
  "viparita karani": "Legs up the wall",
  "legs up wall": "Legs up the wall",
  "warrior 1": "Warrior I",
  "warrior one": "Warrior I",
  virabhadrasana: "Warrior I",
  "warrior 3": "Warrior III",
  "warrior three": "Warrior III",
  trikonasana: "Triangle pose",
  triangle: "Triangle pose",
  "extended triangle": "Triangle pose",
  "side angle": "Extended side angle",
  "utthita parsvakonasana": "Extended side angle",
  "chaturanga dandasana": "Chaturanga",
  "low plank": "Chaturanga",
  "upward facing dog": "Upward dog",
  "up dog": "Upward dog",
  urdhva: "Upward dog",
  navasana: "Boat pose",
  boat: "Boat pose",
  "seated spinal twist": "Seated twist",
  "half lord of the fishes": "Seated twist",
  ardha: "Seated twist",
  ustrasana: "Camel pose",
  camel: "Camel pose",
  "half moon": "Half moon pose",
  "ardha chandrasana": "Half moon pose",
  natarajasana: "Dancer pose",
  dancer: "Dancer pose",
  garudasana: "Eagle pose",
  eagle: "Eagle pose",
  bakasana: "Crow pose",
  "crow crane": "Crow pose",
  crane: "Crow pose",
  "urdhva dhanurasana": "Wheel pose",
  "upward bow": "Wheel pose",
  "wheel": "Wheel pose",
  sirsasana: "Headstand",
  "head stand": "Headstand",
  // Cardio
  "easy run": "Running",
  "tempo run": "Running",
  "long run": "Running",
  "recovery jog": "Running",
  "hill repeats": "Running",
  fartlek: "Running",
  "interval repeats": "Running",
  jog: "Running",
  jogging: "Running",
  "trail easy run": "Running",
  "long trail run": "Running",
  "trail run": "Running",
  "warm up jog": "Running",
  "400m repeats": "Running",
  "easy walk": "Walking",
  "brisk walk": "Walking",
  "incline treadmill walk": "Walking",
  walk: "Walking",
  rucking: "Hiking",
  "weighted hike": "Hiking",
  "trail hike": "Hiking",
  "summit hike": "Hiking",
  hike: "Hiking",
  "endurance ride": "Cycling",
  "tempo ride": "Cycling",
  "interval ride": "Cycling",
  "hill climb": "Cycling",
  "recovery spin": "Cycling",
  "spin class": "Cycling",
  cycling: "Cycling",
  bike: "Cycling",
  "bike ride": "Cycling",
  "steady state": "Elliptical",
  "hill program": "Elliptical",
  "steady climb": "Stair climb",
  "interval climb": "Stair climb",
  "stair sprints": "Stair climb",
  stairmaster: "Stair climb",
  "steady ski": "Ski erg",
  skierg: "Ski erg",
  // Bodyweight & strength
  "pistol squats": "Pistol squat",
  "single leg squat": "Pistol squat",
  "mountain climbers": "Mountain climber",
  "body row": "Inverted row",
  "ring row": "Inverted row",
  "nordic hamstring curl": "Nordic curl",
  handstand: "Handstand hold",
  "wall handstand": "Handstand hold",
  "front squats": "Front squat",
  "goblet squats": "Goblet squat",
  "turkish getup": "Turkish get-up",
  tgu: "Turkish get-up",
  "farmers carry": "Farmer carry",
  "farmers walk": "Farmer carry",
  "front rack carry": "Farmer carry",
  // CrossFit / conditioning
  "clean and jerk": "Clean & jerk",
  "clean jerk": "Clean & jerk",
  "clean press": "Clean & jerk",
  "clean & press": "Clean & jerk",
  "power snatch": "Snatch",
  "wall balls": "Wall ball",
  "box jumps": "Box jump",
  "battle rope": "Battle ropes",
  ropes: "Battle ropes",
  "jump squats": "Jump squat",
  "toes to bars": "Toes to bar",
  ttb: "Toes to bar",
  thrusters: "Thruster",
  "devil press": "Burpee",
  // Sport
  bjj: "BJJ rolling",
  "brazilian jiu jitsu": "BJJ rolling",
  "jiu jitsu": "BJJ rolling",
  rolling: "BJJ rolling",
  grappling: "BJJ rolling",
  "judo drills": "BJJ rolling",
  "muay thai": "Muay Thai pads",
  "muay thai kick": "Muay Thai pads",
  "karate kata": "Muay Thai pads",
  "technique drills": "Muay Thai pads",
  sparring: "Muay Thai pads",
  boulder: "Bouldering",
  "top rope": "Bouldering",
  "lead climbing": "Bouldering",
  traversing: "Bouldering",
  climbing: "Bouldering",
  "campus board": "Hangboard",
  "finger board": "Hangboard",
  "hip hop": "Dance",
  "ballet barre": "Dance",
  salsa: "Dance",
  zumba: "Dance",
  contemporary: "Dance",
  freestyle_dance: "Dance",
  tennis: "Tennis match",
  "tennis drills": "Tennis match",
  pickleball: "Tennis match",
  padel: "Tennis match",
  squash: "Tennis match",
  badminton: "Tennis match",
  golf: "18 holes",
  "9 holes": "18 holes",
  "driving range": "18 holes",
  "short game practice": "18 holes",
  putting: "18 holes",
  football: "Soccer",
  rugby: "Soccer",
  hockey: "Basketball",
  softball: "Basketball",
  snowboarding: "Skiing",
  skiing: "Skiing",
  surfing: "Surf session",
  surf: "Surf session",
  sup: "Paddleboard",
  outrigger: "Kayak",
  kayaking: "Kayak",
  skating: "Skating",
  "ice skating": "Skating",
  "roller skating": "Skating",
  "box breathing": "Diaphragmatic breathing",
  "wim hof rounds": "Diaphragmatic breathing",
  "nasal breathing": "Diaphragmatic breathing",
  breathwork: "Diaphragmatic breathing",
  "kettlebell windmill": "Windmill",
  "kettlebell halo": "Halo",
  // Cardio machine variants
  "steady row": "Rowing intervals",
  "500m repeats": "Rowing intervals",
  "2k test": "Rowing intervals",
  "pyramid intervals": "Rowing intervals",
  "rowing sprint": "Rowing intervals",
  "threshold intervals": "Cycling",
  commute: "Cycling",
  "technical descent": "Hiking",
  "single unders": "Jump rope",
  "double unders": "Jump rope",
  "double under": "Jump rope",
  "criss cross": "Jump rope",
  "interval rounds": "Jump rope",
  "full body stretch": "Stretching",
  // Core & flexibility
  "dead bugs": "Dead bug",
  "deadbug": "Dead bug",
  "bird dogs": "Bird dog",
  "birddog": "Bird dog",
  "bicycle crunches": "Bicycle crunch",
  "bicycles": "Bicycle crunch",
  "russian twists": "Russian twist",
  "reverse crunches": "Reverse crunch",
  "scissor kicks": "Flutter kicks",
  "pallof": "Pallof press",
  "anti rotation press": "Pallof press",
  "ab rollout": "Ab wheel rollout",
  "ab wheel": "Ab wheel rollout",
  "wheel rollout": "Ab wheel rollout",
  "superman": "Superman hold",
  "supermans": "Superman hold",
  "back extension hold": "Superman hold",
  "v ups": "V-up",
  "v up": "V-up",
  "jackknife": "V-up",
  "bear crawl": "Bear crawl hold",
  "bear crawls": "Bear crawl hold",
  "figure 4 stretch": "Figure-four stretch",
  "figure four stretch": "Figure-four stretch",
  "piriformis stretch": "Figure-four stretch",
  "glute stretch": "Figure-four stretch",
  "90 90 stretch": "90/90 hip stretch",
  "9090 hip stretch": "90/90 hip stretch",
  "hip opener": "90/90 hip stretch",
  "supine twist": "Lying spinal twist",
  "spinal twist": "Lying spinal twist",
  "lying twist": "Lying spinal twist",
  "calf stretches": "Calf stretch",
  "standing calf stretch": "Calf stretch",
  "worlds greatest stretch": "World's greatest stretch",
  "greatest stretch": "World's greatest stretch",
  "core finisher circuit": "Dead bug",

};

/**
 * Intrinsic pixel size of every exercise illustration. All artwork is
 * generated as a square 816x816 JPEG, verified across the whole set, so the
 * renderer can declare width/height (and a 1:1 aspect ratio) up front and
 * reserve the exact box before the bitmap arrives — no layout shift when the
 * modal paints.
 */
export const EXERCISE_ART_SIZE = 816;

const NORMALIZED_ART: Record<string, string> = Object.fromEntries(
  Object.entries(EXERCISE_ART).map(([name, url]) => [normalize(name), url]),
);

/**
 * Illustration URL for an exercise, or undefined when none is drawn yet.
 * Matching ignores case, punctuation and common naming variants so a typed
 * "barbell bench press" still shows the bench press drawing.
 */
export function exerciseArt(name: string | null | undefined): string | undefined {
  if (!name) return undefined;
  const key = normalize(name);
  if (!key) return undefined;
  const direct = NORMALIZED_ART[key];
  if (direct) return direct;
  const alias = ALIASES[key];
  if (alias) return EXERCISE_ART[alias];
  // Last resort: a known exercise name contained in what the user typed.
  const hit = Object.keys(NORMALIZED_ART).find(
    (k) => k.length > 3 && (key.includes(k) || k.includes(key)),
  );
  return hit ? NORMALIZED_ART[hit] : undefined;
}

/** Canonical illustration name behind whatever the user typed. */
export function exerciseArtName(name: string | null | undefined): string | undefined {
  const url = exerciseArt(name);
  if (!url) return undefined;
  return Object.keys(EXERCISE_ART).find((k) => EXERCISE_ART[k] === url);
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * Descriptive alt text for an exercise illustration: what the drawing shows
 * and which muscles are shaded, so screen-reader users get the same reference
 * information sighted users get from the picture.
 */
export function exerciseArtAlt(name: string | null | undefined): string {
  const canonical = exerciseArtName(name);
  const label = canonical ?? (name ?? "Exercise").trim();
  if (!canonical) return `${label} illustration`;

  const entry = MUSCLE_GROUPS.flatMap((g) => g.exercises).find((e) => e.name === canonical);
  if (!entry) return `Anatomy illustration of the ${label.toLowerCase()} movement`;

  const primary = joinList(entry.primary.map((r) => MUSCLE_LABELS[r].toLowerCase()));
  const secondary = entry.secondary?.length
    ? joinList(entry.secondary.map((r) => MUSCLE_LABELS[r].toLowerCase()))
    : "";
  const setup = entry.setup ?? entry.cues[0];

  return [
    `Anatomy illustration of ${label.toLowerCase()}`,
    setup ? `: ${setup.toLowerCase()}` : "",
    `. Working muscles shaded: ${primary}`,
    secondary ? `, with ${secondary} assisting` : "",
    ".",
  ].join("");
}
