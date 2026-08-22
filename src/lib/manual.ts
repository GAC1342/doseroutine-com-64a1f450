/**
 * The DoseRoutine instruction manual.
 *
 * One plain-English handbook covering the whole app, grouped into chapters.
 * Every section is written so a first-time, non-technical user can follow it
 * top to bottom. Routes are literal strings so typed <Link to={...}> works.
 */

export type ManualSection = {
  id: string;
  title: string;
  what: string;
  steps: string[];
  tips?: string[];
  route?:
    | "/today"
    | "/stack"
    | "/timeline"
    | "/reminders"
    | "/notifications"
    | "/scan"
    | "/food"
    | "/fitness"
    | "/booty-workout"
    | "/chat"
    | "/plan"
    | "/labs"
    | "/cycles"
    | "/costs"
    | "/side-effects"
    | "/injection-sites"
    | "/progress-photos"
    | "/checkins"
    | "/adherence"
    | "/insights"
    | "/doctor-report"
    | "/export"
    | "/safety"
    | "/templates"
    | "/library"
    | "/calculators"
    | "/interaction-checker"
    | "/upgrade"
    | "/more"
    | "/account"
    | "/timer"
    | "/pill-id"
    | "/help";
  routeLabel?: string;
};

export type ManualChapter = {
  id: string;
  number: number;
  title: string;
  intro: string;
  sections: ManualSection[];
};

export const MANUAL: ManualChapter[] = [
  {
    id: "start",
    number: 1,
    title: "Getting started",
    intro:
      "Five minutes of setup and the app runs itself. Do these three things first and everything else in the manual becomes optional.",
    sections: [
      {
        id: "first-15-minutes",
        title: "Your first 15 minutes",
        what: "The shortest path from empty app to a working daily routine.",
        steps: [
          "Add what you take: open Stack → Add, search the compound, pick a schedule template like 'Once daily'.",
          "Check your timezone: open More → Reminders and confirm the timezone card at the top matches where you live.",
          "Turn on reminders so your phone nudges you at dose time.",
          "Open Today and tap a dose circle to mark your first one taken.",
        ],
        tips: [
          "You don't need to add everything at once. Start with the 3–4 things you actually take daily.",
          "Nothing you enter is shared. Your stack, doses and notes are visible only to your account.",
        ],
        route: "/stack",
        routeLabel: "Open your Stack",
      },
      {
        id: "getting-around",
        title: "Finding your way around",
        what: "How the navigation is laid out on phone and desktop.",
        steps: [
          "The bottom bar (phone) or side bar (desktop) holds the screens you use daily: Today, Stack, Fitness, Food and More.",
          "More is the drawer for everything else — tools, reports, settings, billing and this manual.",
          "The bell icon opens your notification history.",
          "Every feature screen has a small 'How to use' button that opens a short guide for just that screen.",
        ],
        route: "/more",
        routeLabel: "Open More",
      },
    ],
  },
  {
    id: "daily",
    number: 2,
    title: "Your daily routine",
    intro: "The three screens you'll touch every day: Today, Stack and Timeline.",
    sections: [
      {
        id: "today",
        title: "Today — what to take right now",
        what: "A time-ordered list of every dose due today.",
        steps: [
          "Open the Today tab.",
          "Doses are listed in time order, earliest first.",
          "Tap the circle next to a dose to mark it taken.",
          "Tap Skip if you deliberately missed one — it keeps your records honest.",
          "Tap a dose name to see the amount, notes and the compound's reference page.",
        ],
        tips: [
          "Green = taken, grey = still waiting, red = missed.",
          "Marking doses is what feeds your adherence score, insights and doctor report.",
        ],
        route: "/today",
        routeLabel: "Open Today",
      },
      {
        id: "stack",
        title: "Stack — everything you take",
        what: "Your master list of supplements, peptides, hormones and medications.",
        steps: [
          "Open Stack and tap Add.",
          "Search for the compound by name (450+ are built in) or add a custom one.",
          "Pick a Quick Template: Once daily, AM + PM, Weekly, Every other day, and so on.",
          "Set the dose amount, unit and time.",
          "Tap Save — it appears on Today from the next scheduled time.",
        ],
        tips: [
          "Use '+ Add another time' rather than adding the same item twice.",
          "To remove something, open the item and use Delete, then confirm — Today and Timeline update straight away.",
          "Pause instead of deleting if you're only stopping for a while; your history stays intact.",
        ],
        route: "/stack",
        routeLabel: "Open Stack",
      },
      {
        id: "timeline",
        title: "Timeline — past and upcoming days",
        what: "Scroll backwards and forwards through your schedule.",
        steps: [
          "Open Timeline from More or the nav.",
          "Pick any date to see what was due and what you logged.",
          "Back-fill a dose you forgot to check off by tapping it on a past day.",
        ],
        route: "/timeline",
        routeLabel: "Open Timeline",
      },
      {
        id: "scanner",
        title: "Scan a bottle",
        what: "Point your camera at a label or barcode and let the app fill in the details.",
        steps: [
          "Open More → Scan (or the camera button on Stack).",
          "Photograph the front label or scan the barcode.",
          "Check the name, dose and directions it reads back.",
          "Fix anything wrong, then Save to add it to your stack.",
        ],
        tips: ["Good light and a flat label give the best reads. You can always edit afterwards."],
        route: "/scan",
        routeLabel: "Open Scanner",
      },
    ],
  },
  {
    id: "reminders",
    number: 3,
    title: "Reminders and notifications",
    intro: "Getting nudged at the right time, in the right timezone, without being woken up.",
    sections: [
      {
        id: "reminders-setup",
        title: "Setting up reminders",
        what: "Email, push and calendar alarms for every dose.",
        steps: [
          "Open More → Reminders.",
          "Confirm the Reminder timezone card at the top — tap 'Use device' if it's wrong.",
          "Turn on push notifications and allow them when your phone asks.",
          "Set quiet hours so nothing pings you overnight.",
          "Set a lead time per compound if you want the nudge 0–60 minutes early.",
        ],
        tips: [
          "Want alarms that ring even with the app closed? Use 'Add to phone calendar'.",
          "Travelling? Change the timezone here and the whole schedule shifts with you.",
        ],
        route: "/reminders",
        routeLabel: "Open Reminders",
      },
      {
        id: "notification-inbox",
        title: "The notification bell",
        what: "A history of every nudge the app has sent you.",
        steps: [
          "Tap the bell icon in the header.",
          "Unread items are highlighted; tap one to jump to what it's about.",
          "Use 'Mark all read' to clear the badge.",
        ],
        route: "/notifications",
        routeLabel: "Open Notifications",
      },
      {
        id: "vacation",
        title: "Vacation mode and standing rules",
        what: "Pause everything for a trip, or set rules that apply across your whole stack.",
        steps: [
          "Open More and find the Vacation mode card.",
          "Set the dates you're away — reminders pause and resume automatically.",
          "Use Standing rules for blanket instructions like 'never remind before 8am'.",
        ],
        route: "/more",
        routeLabel: "Open More",
      },
    ],
  },
  {
    id: "fitness",
    number: 4,
    title: "Fitness and body",
    intro:
      "Training, the exercise library, and body measurements — all on one screen with two tabs.",
    sections: [
      {
        id: "workouts",
        title: "Logging a workout",
        what: "A calendar of sessions with sets, reps, distance and streaks.",
        steps: [
          "Open Fitness & Body and stay on the Workouts tab.",
          "Tap a day on the calendar.",
          "Tap 'Log workout' for today, or 'Plan workout' for a future day.",
          "Pick a type — Strength, Cardio, Mind & body or Sport.",
          "Add exercises with sets/reps/weight, or distance/time for cardio.",
          "Tap Save — the day fills in and your streak updates.",
        ],
        tips: [
          "Save a session you repeat as a template, then reload it in one tap next time.",
          "Planned sessions with a time can send you a reminder, plus a nudge if you miss one.",
        ],
        route: "/fitness",
        routeLabel: "Open Fitness & Body",
      },
      {
        id: "repeat-workouts",
        title: "Repeating a workout every week",
        what: "Pick the days, how often it repeats, and when it should stop.",
        steps: [
          "Open the workout sheet for the session you want to repeat.",
          "Turn on Repeat.",
          "Tap the days of the week it should land on — you can pick more than one.",
          "Choose how often: every week, every 2 weeks, or every 4 weeks.",
          "Set 'Repeat until' if it should stop on a date, or leave it as no end.",
          "Check the preview list of upcoming dates, then Save.",
        ],
        tips: [
          "Editing a repeating session asks whether you mean just that day or the whole series.",
          "Clearing the 'Repeat until' date turns it back into an open-ended routine.",
          "Use 'Duplicate week' on the calendar to copy a whole week of training forward.",
        ],
        route: "/fitness",
        routeLabel: "Open Fitness & Body",
      },
      {
        id: "calendar-day",
        title: "The calendar day view",
        what: "Tap any day to see what is scheduled, with exercise illustrations.",
        steps: [
          "Open Fitness & Body, or the Calendar, and tap a day.",
          "Colored dots on the grid show which days already have something scheduled.",
          "The day panel lists each planned workout with its exercises and illustrations.",
          "Switch tabs to see doses, workouts or meals for that day.",
          "Use the meals toggle to hide the food row when you only want training.",
        ],
        route: "/fitness",
        routeLabel: "Open Fitness & Body",
      },
      {
        id: "share-routine",
        title: "Sharing a workout routine",
        what: "A private link (and an image card) for a routine — training only, nothing personal.",
        steps: [
          "Open the routine you want to share in the workout sheet.",
          "Tap Share routine to create a link.",
          "Send the link, or save the image card to post it.",
          "Anyone with the link sees the exercises, sets and reps — never your doses, stack, measurements, photos or notes.",
          "Turn the link off again from the same Share panel whenever you want.",
        ],
        tips: [
          "People who open your link can save the routine straight into their own DoseRoutine.",
        ],
        route: "/fitness",
        routeLabel: "Open Fitness & Body",
      },
      {
        id: "workout-timer",
        title: "Workout timer",
        what: "Interval and Tabata timing for rest periods and circuits.",
        steps: [
          "Open More → Workout timer.",
          "Choose work and rest lengths and the number of rounds.",
          "Start it and leave it running while you train.",
        ],
        route: "/timer",
        routeLabel: "Open the timer",
      },
      {
        id: "exercise-library",
        title: "The exercise library",
        what: "Every move with an anatomy illustration, steps, form cues and common mistakes.",
        steps: [
          "In the workout sheet, tap the exercise box to open the picker.",
          "Search by name, or filter by body part using the chips (or 'All').",
          "Tap a move to see its illustration, numbered how-to steps, form cues and common mistakes.",
          "Tap Add to drop it into your session.",
        ],
        tips: ["Search also matches muscle names, so 'glute' finds every glute move."],
        route: "/fitness",
        routeLabel: "Open Fitness & Body",
      },
      {
        id: "body-tab",
        title: "Body measurements",
        what: "Weight, body fat and tape measurements over time.",
        steps: [
          "Open Fitness & Body and switch to the Body tab.",
          "Tap Add entry and fill in whatever you have — nothing is required.",
          "Charts build automatically as entries accumulate.",
        ],
        route: "/fitness",
        routeLabel: "Open Fitness & Body",
      },
      {
        id: "photos",
        title: "Progress photos",
        what: "Private before/after photos stored against your account.",
        steps: [
          "Open More → Progress Photos.",
          "Take or upload a photo and tag the date.",
          "Use the compare view to put two dates side by side.",
        ],
        route: "/progress-photos",
        routeLabel: "Open Progress Photos",
      },
    ],
  },
  {
    id: "food",
    number: 5,
    title: "Food and macros",
    intro: "Photograph a meal, check the numbers, save it. Your daily totals build themselves.",
    sections: [
      {
        id: "log-meal",
        title: "Logging a meal",
        what: "AI reads the plate or the barcode and returns calories, protein, carbs and fat.",
        steps: [
          "Open Food and tap the big camera button (Add my meal).",
          "Photograph the meal, or scan the packet's barcode.",
          "Wait a few seconds — the app names the food and estimates the macros.",
          "Check the review sheet: adjust servings eaten, edit any number, or fix the item list.",
          "Tap Save.",
        ],
        tips: [
          "Changing 'servings eaten' recalculates every number automatically.",
          "Tap 'How this was calculated' to see exactly how per-serving values became totals.",
          "If a number looks wrong, the app warns you and offers Auto-fix; Undo reverses it in one tap.",
        ],
        route: "/food",
        routeLabel: "Open Food",
      },
      {
        id: "meal-photo-tools",
        title: "Fixing a photo",
        what: "Retake, crop, rotate or remove the picture before saving.",
        steps: [
          "In the review sheet, use Retake photo to shoot again.",
          "Use Crop & rotate to straighten or trim it.",
          "Use Remove photo to keep the meal but drop the picture.",
          "Use Rescan to run the scan again — choose barcode or photo mode.",
        ],
        route: "/food",
        routeLabel: "Open Food",
      },
      {
        id: "food-shortcuts",
        title: "Recents and favorites",
        what: "Re-log the meals you eat all the time in one tap.",
        steps: [
          "On Food, tap Add meal.",
          "Use the Recent row for anything you logged in the last few days.",
          "Tap the star on a meal to keep it in Favorites.",
          "Pick one and adjust the portion — the macros scale for you.",
        ],
        tips: [
          "The food diary groups everything by day and meal with a macro summary per day.",
          "Scanned foods are cached, so repeat scans still work with a poor connection.",
        ],
        route: "/food",
        routeLabel: "Open Food",
      },
      {
        id: "goals",
        title: "Macro goals and the day view",
        what: "Daily targets, plus one timeline showing food and workouts together.",
        steps: [
          "On Food, open the Goals card and set calories, protein, carbs and fat.",
          "Tap Save — progress rings fill as you log meals.",
          "Scroll to the day timeline to see meals and workouts in one list.",
          "Tap any row to quick-edit its macros inline, or use bulk edit for several at once.",
        ],
        route: "/food",
        routeLabel: "Open Food",
      },
      {
        id: "photo-storage",
        title: "Meal photo storage",
        what: "Control how long photos are kept.",
        steps: [
          "Open the meal photo settings from the Food page.",
          "Pick a retention window: 7, 30 or 90 days.",
          "Review the storage breakdown chart and the history log of deletions and exports.",
        ],
        route: "/food",
        routeLabel: "Open Food",
      },
    ],
  },
  {
    id: "safety",
    number: 6,
    title: "Safety and reference tools",
    intro:
      "Reference information to discuss with a clinician — never a clearance to combine anything.",
    sections: [
      {
        id: "interactions",
        title: "Interaction checker",
        what: "Flags documented interactions between the things in your stack.",
        steps: [
          "Open More → Interaction Checker.",
          "It loads your current stack automatically; add extra items to test a 'what if'.",
          "Read each flag — severity, the reason, and the source it came from.",
          "Tap a source link to read the original reference.",
        ],
        tips: [
          "A flag is a conversation starter for your doctor or pharmacist, not a verdict.",
          "No flag does not mean 'safe' — absence of evidence isn't evidence of absence.",
        ],
        route: "/interaction-checker",
        routeLabel: "Open Interaction Checker",
      },
      {
        id: "calculators",
        title: "Dose calculators",
        what: "Reconstitution, peptide dosing and TRT arithmetic.",
        steps: [
          "Open More → Dose Calculators.",
          "Pick the calculator you need.",
          "Enter vial strength, the volume of water you're adding, and your target dose.",
          "Read off the units on the syringe.",
        ],
        tips: ["The calculator does the math you type in. It doesn't decide your dose."],
        route: "/calculators",
        routeLabel: "Open Calculators",
      },
      {
        id: "library",
        title: "Compound library",
        what: "Reference pages for 450+ compounds with sourced information.",
        steps: [
          "Open More → Compound Library.",
          "Search or browse by goal or category.",
          "Each page covers what it is, typical timing, half-life, and cited sources.",
        ],
        route: "/library",
        routeLabel: "Open Library",
      },
      {
        id: "side-effects",
        title: "Side effects and safety notes",
        what: "Log how you feel and spot patterns over time.",
        steps: [
          "Open More → Side Effects.",
          "Log the effect, severity and date.",
          "Review the Safety page for notes tied to what's in your stack.",
        ],
        route: "/side-effects",
        routeLabel: "Open Side Effects",
      },
      {
        id: "injection-sites",
        title: "Injection site rotation",
        what: "A body map that tracks where you last injected.",
        steps: [
          "Open More → Injection Sites.",
          "Tap the site you used after a dose.",
          "The map shades recently used sites so you rotate properly.",
        ],
        route: "/injection-sites",
        routeLabel: "Open Injection Sites",
      },
      {
        id: "pill-identifier",
        title: "Pill identifier",
        what: "Work out what a loose tablet or capsule is from its look and markings.",
        steps: [
          "Open More → Pill identifier.",
          "Enter the imprint, color and shape, or photograph the pill.",
          "Check the suggested matches against the packaging before you take anything.",
        ],
        tips: ["Matches are informational — confirm with your pharmacist if there's any doubt."],
        route: "/pill-id",
        routeLabel: "Open Pill identifier",
      },
    ],
  },
  {
    id: "tracking",
    number: 7,
    title: "Tracking and progress",
    intro: "Everything that turns your logs into something you can read.",
    sections: [
      {
        id: "checkins",
        title: "Check-ins",
        what: "Quick ratings for energy, sleep, mood and anything else you follow.",
        steps: [
          "Open More → Check-ins.",
          "Rate the day on the sliders and add a note.",
          "Ratings appear on Insights alongside your doses and workouts.",
        ],
        route: "/checkins",
        routeLabel: "Open Check-ins",
      },
      {
        id: "labs",
        title: "Blood work",
        what: "Store lab results and watch markers move.",
        steps: [
          "Open More → Blood Work.",
          "Add a panel with the date and each marker's value.",
          "Charts show the trend and flag out-of-range values.",
        ],
        route: "/labs",
        routeLabel: "Open Blood Work",
      },
      {
        id: "cycles",
        title: "Cycles",
        what: "Run a compound for a set number of weeks with an on/off pattern.",
        steps: [
          "Open More → Cycles.",
          "Create a cycle, choose the compound, length and any off-weeks.",
          "Today follows the cycle automatically — no manual pausing.",
        ],
        route: "/cycles",
        routeLabel: "Open Cycles",
      },
      {
        id: "costs",
        title: "Costs",
        what: "What your routine actually costs each month.",
        steps: [
          "Open More → Costs.",
          "Enter what you paid and how long a container lasts.",
          "The page works out cost per dose, per week and per month.",
        ],
        route: "/costs",
        routeLabel: "Open Costs",
      },
      {
        id: "insights",
        title: "Insights and adherence",
        what: "Charts tying doses, workouts, food and how you feel together.",
        steps: [
          "Open More → Insights for the charts.",
          "Open Adherence for your consistency score by compound.",
          "Use the date range control to zoom in on a period.",
        ],
        route: "/insights",
        routeLabel: "Open Insights",
      },
    ],
  },
  {
    id: "ai",
    number: 8,
    title: "AI coach and plans",
    intro: "Ask questions in plain language, or have a starting routine drafted for you.",
    sections: [
      {
        id: "coach",
        title: "AI Coach",
        what: "A chat that can see your stack and answer questions about it.",
        steps: [
          "Open More → AI Coach.",
          "Type a question — 'why am I taking this?', 'should these be split?'",
          "Answers stream back with reasoning; ask follow-ups in the same thread.",
        ],
        tips: ["It's informational. Anything clinical goes to your doctor first."],
        route: "/chat",
        routeLabel: "Open AI Coach",
      },
      {
        id: "plan",
        title: "AI Plan",
        what: "A drafted routine based on your goals.",
        steps: [
          "Open More → AI Plan.",
          "Pick your goals and what you already take.",
          "Review the draft, remove anything you don't want, then add the rest to your stack.",
        ],
        route: "/plan",
        routeLabel: "Open AI Plan",
      },
      {
        id: "templates",
        title: "Stack templates",
        what: "Pre-built routines you can adopt in one tap.",
        steps: [
          "Open More → Templates.",
          "Browse by goal, open one to see what's inside.",
          "Tap Add to stack, then edit doses and times to suit you.",
        ],
        route: "/templates",
        routeLabel: "Open Templates",
      },
    ],
  },
  {
    id: "sharing",
    number: 9,
    title: "Reports, exports and sharing",
    intro: "Getting your data out — for your doctor, your records, or another app.",
    sections: [
      {
        id: "doctor-report",
        title: "Doctor report",
        what: "A one-page summary of your routine to hand to a clinician.",
        steps: [
          "Open More → Doctor Report.",
          "Choose the date range to cover.",
          "Generate, then print or save as PDF.",
        ],
        route: "/doctor-report",
        routeLabel: "Open Doctor Report",
      },
      {
        id: "export",
        title: "Export your data",
        what: "A full copy of everything you've entered.",
        steps: [
          "Open More → Export.",
          "Pick what to include and the format.",
          "Download the file — it's yours to keep.",
        ],
        route: "/export",
        routeLabel: "Open Export",
      },
    ],
  },
  {
    id: "account",
    number: 10,
    title: "Account, billing and privacy",
    intro:
      "Sign-in methods, plans, devices, language, appearance, and how to leave with your data.",
    sections: [
      {
        id: "sign-in-methods",
        title: "Google, Apple and email on one account",
        what: "Connect more than one login so you never end up with two separate accounts.",
        steps: [
          "Open More → Sign-in methods.",
          "You'll see every login already connected to this account.",
          "Tap Connect Google or Connect Apple to add the other one.",
          "Approve it with the provider — you come straight back, still signed in.",
          "From then on either button signs you into this same stack and history.",
        ],
        tips: [
          "Signing up with Google and later with Apple creates two accounts, because the providers hand us different email addresses. Connecting them here is the fix.",
          "You can disconnect a method any time, as long as one is left.",
          "Already have two accounts with data in both? Email support@doseroutine.com and we'll merge them.",
        ],
        route: "/account",
        routeLabel: "Open Sign-in methods",
      },
      {
        id: "plans",
        title: "Free vs Pro",
        what: "What you get without paying, and what upgrading adds.",
        steps: [
          "Dose reminders, your schedule and the interaction checker are free.",
          "Pro unlocks the AI coach and plans, advanced insights and unlimited history.",
          "Open More → Upgrade to see current pricing.",
          "On iPhone or Android, use 'Restore purchases' in More if a subscription doesn't show up.",
        ],
        route: "/upgrade",
        routeLabel: "See plans",
      },
      {
        id: "appearance",
        title: "Language and appearance",
        what: "Switch language, or change theme and text size.",
        steps: [
          "Open More.",
          "Use the Language card to change language.",
          "Use the Appearance section for light/dark theme and text size.",
        ],
        route: "/more",
        routeLabel: "Open More",
      },
      {
        id: "privacy",
        title: "Privacy and deleting your account",
        what: "Who can see your data, and how to remove it permanently.",
        steps: [
          "Your stack, doses, labs and notes are readable only by your account.",
          "Nothing is sold or shared with advertisers.",
          "To leave: export your data first, then use Delete account at the bottom of More.",
          "Deletion is permanent and removes your records from the connected services too.",
        ],
        route: "/more",
        routeLabel: "Open More",
      },
    ],
  },
  {
    id: "troubleshooting",
    number: 11,
    title: "Troubleshooting",
    intro: "The handful of things that go wrong most often, and the fix for each.",
    sections: [
      {
        id: "no-reminders",
        title: "Reminders aren't arriving",
        what: "Almost always notification permission, quiet hours, or timezone.",
        steps: [
          "Check your phone's system settings allow notifications for DoseRoutine.",
          "Open More → Reminders and confirm push is on.",
          "Check quiet hours aren't covering the dose time.",
          "Confirm the reminder timezone matches where you are.",
          "Still nothing? Use 'Add to phone calendar' for alarms that don't depend on the app.",
        ],
        route: "/reminders",
        routeLabel: "Open Reminders",
      },
      {
        id: "wrong-times",
        title: "Doses show at the wrong time",
        what: "Your reminder timezone is out of sync with where you are.",
        steps: [
          "Open More → Reminders.",
          "Tap 'Use device' on the timezone card.",
          "Reopen Today — times shift to the corrected zone.",
        ],
        route: "/reminders",
        routeLabel: "Open Reminders",
      },
      {
        id: "cant-delete",
        title: "Something won't delete",
        what: "Deletes need the confirm step to go through.",
        steps: [
          "Open the item in Stack and tap Delete.",
          "Confirm in the dialog that appears — closing it cancels the delete.",
          "If it's still listed, pull to refresh; Today and Timeline update with it.",
        ],
        route: "/stack",
        routeLabel: "Open Stack",
      },
      {
        id: "scan-failed",
        title: "A scan failed or read the wrong thing",
        what: "Lighting, glare and curved labels are the usual causes.",
        steps: [
          "Read the plain-English reason shown under the error.",
          "Tap Retry, or Retake photo with better light and the label flat.",
          "For packaged food, try barcode mode instead of photo mode.",
          "You can always enter the numbers by hand and save.",
        ],
        route: "/scan",
        routeLabel: "Open Scanner",
      },
      {
        id: "subscription-missing",
        title: "I paid but Pro isn't active",
        what: "The purchase needs to be linked to this device.",
        steps: [
          "Open More and tap 'Restore purchases'.",
          "Wait a minute and try once more if nothing changes.",
          "Still stuck? Email support@doseroutine.com with the store receipt.",
        ],
        route: "/more",
        routeLabel: "Open More",
      },
    ],
  },
];

export function manualSearch(query: string): ManualChapter[] {
  const q = query.trim().toLowerCase();
  if (!q) return MANUAL;
  const hit = (s: ManualSection) =>
    [s.title, s.what, ...s.steps, ...(s.tips ?? [])].join(" ").toLowerCase().includes(q);
  return MANUAL.map((c) =>
    c.title.toLowerCase().includes(q) ? c : { ...c, sections: c.sections.filter(hit) },
  ).filter((c) => c.sections.length > 0);
}
