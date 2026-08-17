// Help Center registry — one entry per feature, written in clear, plain language.
// Every feature route imports HELP[key] and shows a "How do I use this?" button.

export type HelpArticle = {
  slug: string;
  title: string;
  icon?: string;
  route?: string; // where the feature lives
  summary: string; // one line, plain english
  steps: string[]; // short numbered steps
  tips?: string[];
  keywords: string[]; // for search
};

export const HELP: Record<string, HelpArticle> = {
  today: {
    slug: "today",
    title: "Today screen",
    route: "/today",
    summary: "See what to take right now. Tap a dose to mark it taken.",
    steps: [
      "Open the Today tab.",
      "You'll see each dose in order by time.",
      "Tap the circle to mark it taken.",
      "Tap 'Skip' if you missed one on purpose.",
    ],
    tips: ["Green means taken. Gray means waiting. Red means missed."],
    keywords: ["today", "dose", "take", "mark", "check off"],
  },
  stack: {
    slug: "stack",
    title: "Your Stack",
    route: "/stack",
    summary: "Add supplements or medications you take. Set the time and how often.",
    steps: [
      "Tap the Stack tab.",
      "Tap 'Add' to search for a compound.",
      "Pick a Quick Template (like 'Once daily' or 'AM + PM').",
      "Change the dose amount and time if you need to.",
      "Tap Save.",
    ],
    tips: [
      "You can add the same item twice if you take it more than once a day, or use '+ Add another time'.",
      "Weekly reminders use your phone's time zone.",
    ],
    keywords: ["stack", "add", "compound", "supplement", "schedule", "time"],
  },
  reminders: {
    slug: "reminders",
    title: "Reminders, timezone & quiet hours",
    route: "/reminders",
    summary:
      "Choose how you're nudged (email, push, phone alarms), set your timezone, and mute overnight.",
    steps: [
      "Open More → Reminders.",
      "Check the Reminder timezone card at the top — tap 'Change' or 'Use device' if it's wrong.",
      "Turn on push notifications so nudges land on your phone.",
      "Set quiet hours start/end so nothing pings you overnight.",
      "Set a lead time per compound (0–60 minutes before the dose).",
      "Or tap 'Add to phone calendar' to get real alarms that ring even if the app is closed.",
    ],
    tips: [
      "Lead times, quiet hours, and workout nudges are all calculated in the timezone shown on that card — not your device's.",
      "Everything we send also lands in the in-app Notifications bell, so you can catch up later.",
    ],
    keywords: [
      "alarm",
      "notification",
      "push",
      "calendar",
      "ics",
      "alert",
      "timezone",
      "time zone",
      "quiet hours",
      "lead time",
    ],
  },
  notifications: {
    slug: "notifications",
    title: "Notification center",
    route: "/notifications",
    summary: "One place to review every reminder we sent, mark it read, and jump to it.",
    steps: [
      "Tap the bell icon in the top corner (a dot shows how many are unread).",
      "Tap a notification to open the dose or workout it's about.",
      "Tap 'Read'/'Unread' to change its state, or the trash icon to delete it.",
      "Use 'Mark all read' or 'Clear read' to tidy up the list.",
    ],
    tips: [
      "Workout notifications open the Fitness calendar on the right day with the workout sheet already open.",
      "Dose notifications drop you on Today with that dose ready to check off.",
      "Nothing is sent during your quiet hours, so the list stays quiet overnight too.",
    ],
    keywords: ["notification", "bell", "inbox", "unread", "alerts", "history", "center"],
  },
  fitness: {
    slug: "fitness",
    title: "Fitness & Body",
    route: "/fitness",
    summary:
      "One page for training and body data. The Workouts tab holds your calendar and streaks; the Body tab holds weight, body fat and measurements.",
    steps: [
      "Open Fitness & Body (bottom nav, or More → Fitness & Body).",
      "Use the two tabs at the top to switch between Workouts and Body.",
      "On Workouts, tap a day on the calendar.",
      "Tap 'Log workout' (or 'Plan workout' for a future day).",
      "Pick a type — types are grouped into Strength, Cardio (run, cycling, swim, row, hike…), Mind & body (yoga, pilates, mobility, breathwork) and Sport (boxing, climbing, racquet, team sports).",
      "Add exercises with sets, reps and weight, or distance and time for cardio — the exercise box suggests moves for the type you picked.",
      "Tap Save — the day fills in and your streak updates.",
    ],
    tips: [
      "The app remembers which tab you were last on, and you can link straight to the Body tab with /fitness?view=body.",
      "Body Metrics used to be its own page — that link now opens this page on the Body tab.",
      "Planned workouts can have a scheduled time, which is what workout reminders use.",
      "Missing a planned session sends a 'missed workout' nudge so you can log, move, or skip it.",
    ],
    keywords: [
      "fitness",
      "body",
      "tabs",
      "workout",
      "gym",
      "cardio",
      "exercise",
      "sets",
      "reps",
      "streak",
      "log",
      "weight",
      "measurements",
    ],
  },
  workoutTemplates: {
    slug: "workout-templates",
    title: "Workout templates",
    route: "/fitness",
    summary: "Save a session you repeat, then reload it in one tap with sets, reps and pacing.",
    steps: [
      "Open Fitness & Body → the Workouts tab.",
      "Log or plan a workout and fill in the exercises.",
      "Tap 'Save as template' at the bottom of the sheet and give it a name.",
      "Next time, open the sheet and pick the template from the picker at the top.",
      "Use the search box to find a template by name once you have a few.",
      "Tap the pencil to rename a template, or the trash icon (then confirm) to delete it.",
    ],
    tips: [
      "Templates store rest, tempo and target pace (min:sec) as well as sets, reps and weight.",
      "Editing a loaded template shows 'Update template' so you can keep it current.",
    ],
    keywords: ["template", "workout", "reuse", "routine", "program", "rename", "delete", "search"],
  },
  workoutReminders: {
    slug: "workout-reminders",
    title: "Workout reminders",
    route: "/reminders",
    summary: "Get nudged before a planned session, and again if you miss one.",
    steps: [
      "Plan a workout on the Fitness & Body → Workouts calendar and give it a time.",
      "Open More → Reminders and scroll to Workout reminders.",
      "Turn on the reminder and choose how many minutes ahead to be nudged.",
      "Turn on 'Missed workout' nudges if you want a follow-up when a session goes unlogged.",
    ],
    tips: [
      "Nudges arrive by email and push, and always land in the notification bell.",
      "They respect your timezone and quiet hours from the same page.",
    ],
    keywords: ["workout", "reminder", "nudge", "missed", "planned", "push", "email", "fitness"],
  },

  bodyMetrics: {
    slug: "body-metrics",
    title: "Body Metrics (Body tab)",
    route: "/fitness?view=body",
    summary:
      "Track weight, body fat, measurements, and your best lifts over time — now the Body tab on the Fitness & Body page.",
    steps: [
      "Open Fitness & Body, then tap the 'Body' tab at the top (the Body Metrics button on Today goes straight there).",
      "Tap 'Log measurement'.",
      "Fill in what you have — you can skip any field.",
      "Tap Save. You'll see a chart of your progress.",
      "Tap 'Workouts' any time to jump back to your training calendar.",
    ],
    tips: [
      "Body Metrics no longer has its own page — the old link redirects to Fitness & Body on the Body tab.",
      "Log once a week for the best trend line.",
      "You can switch between lbs and kg in the form.",
    ],
    keywords: [
      "weight",
      "body fat",
      "waist",
      "measurement",
      "lift",
      "pr",
      "strength",
      "progress",
      "body tab",
      "fitness",
    ],
  },
  refills: {
    slug: "refills",
    title: "Refill alerts",
    route: "/today",
    summary: "The app watches your vial and pill counts and warns you before you run out.",
    steps: [
      "Add a vial or pill count in Stack → tap your compound → 'Inventory'.",
      "Enter how many doses you have.",
      "The app subtracts a dose each time you mark one taken.",
      "You'll see a 'Reorder soon' card on Today when you're low.",
    ],
    keywords: ["refill", "reorder", "inventory", "vial", "pills", "out of stock"],
  },
  sharing: {
    slug: "sharing",
    title: "Share your stack",
    route: "/stack",
    summary: "Make a link to show your stack to a friend or your doctor. No login needed.",
    steps: [
      "Open Stack.",
      "Tap 'Share'.",
      "Copy the link and send it.",
      "The link shows a read-only view. You can turn it off any time.",
    ],
    tips: ["Your name and email are never in the link."],
    keywords: ["share", "link", "protocol", "public", "friend", "doctor"],
  },
  aiCoach: {
    slug: "ai-coach",
    title: "AI Coach",
    route: "/chat",
    summary: "Ask questions about your stack in plain English.",
    steps: [
      "Open the Chat tab.",
      "Type a question like 'Can I take fish oil with my TRT?'",
      "The coach uses your stack and our safety database to answer.",
    ],
    tips: [
      "It's not medical advice — always check with your doctor.",
      "The more you add to your Stack, the better the answers.",
    ],
    keywords: ["ai", "chat", "coach", "question", "help", "advice"],
  },
  scanner: {
    slug: "scanner",
    title: "Barcode Scanner",
    route: "/stack",
    summary: "Scan a supplement bottle to add it fast.",
    steps: [
      "Open Stack.",
      "Tap the barcode icon.",
      "Point your camera at the barcode.",
      "We'll try to match it. Confirm the dose and tap Save.",
    ],
    tips: ["If we can't find it, you can still type the name in."],
    keywords: ["barcode", "scan", "camera", "bottle", "label"],
  },
  languages: {
    slug: "languages",
    title: "Change language",
    route: "/more",
    summary: "The app works in 12 languages. Change it any time.",
    steps: ["Open More.", "Tap the language name.", "Pick your language."],
    keywords: ["language", "translate", "spanish", "french", "english"],
  },
  interactions: {
    slug: "interactions",
    title: "Interaction Checker",
    route: "/interaction-checker",
    summary: "Check if two compounds are safe to take together.",
    steps: [
      "Open Interaction Checker.",
      "Add two or more compounds.",
      "Read the color-coded result. Red means don't mix.",
    ],
    keywords: ["interaction", "safe", "mix", "combine", "danger"],
  },
  reconstitution: {
    slug: "reconstitution",
    title: "Reconstitution Calculator",
    route: "/reconstitution-calculator",
    summary: "Figure out how much water to add to a peptide vial and how much to draw.",
    steps: [
      "Open Reconstitution Calculator.",
      "Pick your peptide or type in the mg.",
      "Pick a preset (like BAC water 2 mL) or enter your own.",
      "Read the units to draw on your syringe.",
    ],
    keywords: ["peptide", "vial", "reconstitute", "bac water", "syringe", "units"],
  },
  labs: {
    slug: "labs",
    title: "Blood Work Tracker",
    route: "/labs",
    summary: "Log your lab results and see them turn green, yellow, or red vs. normal range.",
    steps: [
      "Open More → Blood Work.",
      "Tap 'Add panel' and enter the date.",
      "Type each marker's value.",
      "You'll see trends over time.",
    ],
    keywords: ["lab", "blood", "test", "panel", "marker", "results"],
  },
  templates: {
    slug: "templates",
    title: "Stack Templates",
    route: "/templates",
    summary: "Start from a done-for-you protocol like 'TRT starter' or 'Longevity basics'.",
    steps: [
      "Open More → Stack Templates.",
      "Read the safety notes.",
      "Tap 'Use this template' to add it to your Stack.",
      "Change the doses to match what your doctor said.",
    ],
    keywords: ["template", "protocol", "starter", "preset", "trt", "longevity"],
  },
  injectionSites: {
    slug: "injection-sites",
    title: "Injection Sites",
    route: "/injection-sites",
    summary: "Rotate where you inject so you don't get lumps or scar tissue.",
    steps: [
      "Open More → Injection Sites.",
      "After you inject, tap the spot you used.",
      "The app tells you the next best spot to use.",
    ],
    keywords: ["injection", "site", "rotate", "inject", "spot"],
  },
  cycles: {
    slug: "cycles",
    title: "Cycle Tracker",
    route: "/cycles",
    summary: "For protocols like '5 days on, 2 days off' — the app skips your OFF days.",
    steps: [
      "Open More → Cycles.",
      "Pick a compound and set 'days on' and 'days off'.",
      "Reminders skip off days automatically.",
    ],
    keywords: ["cycle", "pulse", "on off", "skip", "pause"],
  },
  costs: {
    slug: "costs",
    title: "Cost Tracker",
    route: "/costs",
    summary: "See what your stack costs each month and per year.",
    steps: [
      "Open More → Cost Tracker.",
      "Enter the price you paid for each item.",
      "See your monthly burn and yearly total.",
    ],
    keywords: ["cost", "price", "money", "budget", "spend"],
  },
  sideEffects: {
    slug: "side-effects",
    title: "Side Effect Journal",
    route: "/side-effects",
    summary: "Write down how you feel so you can spot patterns.",
    steps: [
      "Open More → Side Effect Journal.",
      "Tap 'Log'.",
      "Pick a symptom, rate it, and link it to a compound if you know which one.",
    ],
    keywords: ["side effect", "symptom", "journal", "feel", "reaction"],
  },
  doctorReport: {
    slug: "doctor-report",
    title: "My Report",
    route: "/doctor-report",
    summary: "A one-page printable summary of your routine and adherence.",
    steps: [
      "Open More → My Report.",
      "Tap Export PDF.",
      "Save it or share it with whoever you choose.",
    ],
    keywords: ["my report", "report", "pdf", "print", "summary"],
  },
  progressPhotos: {
    slug: "progress-photos",
    title: "Progress Photos",
    route: "/progress-photos",
    summary: "Save private photos to see your body change over months.",
    steps: [
      "Open More → Progress Photos.",
      "Tap the camera button.",
      "Take a front, side, and back photo. Only you can see them.",
    ],
    tips: ["Same time of day and same lighting works best."],
    keywords: ["photo", "picture", "progress", "before", "after"],
  },
  export: {
    slug: "export",
    title: "Export your data",
    route: "/export",
    summary: "Download everything you've saved as a file.",
    steps: ["Open More → Export.", "Pick JSON or CSV.", "Save the file to your phone."],
    keywords: ["export", "download", "backup", "data", "csv", "json"],
  },
  shareStack: {
    slug: "share-stack",
    title: "Create a share link",
    route: "/stack",
    summary: "Make a read-only link so friends, coaches, or your doctor can see what you take.",
    steps: [
      "Go to the Stack tab.",
      "Tap the 'Share' button at the top.",
      "Give the link a name (like 'My TRT plan').",
      "Tap 'Create share link & copy'. The link is copied for you.",
      "Paste it into a text or email.",
    ],
    tips: [
      "The link is a snapshot. Changing your stack later does not update it.",
      "Anyone with the link can view. Tap 'Revoke' to turn a link off.",
      "Your name and email are never shown on the shared page.",
    ],
    keywords: ["share", "link", "send", "friend", "coach", "doctor", "public"],
  },
  scan: {
    slug: "scan",
    title: "Scan a bottle",
    route: "/scan",
    summary: "Use your camera to scan a supplement or med bottle, then add it to your stack.",
    steps: [
      "Open More → Scan a bottle.",
      "Tap 'Start scan' and point the camera at the barcode.",
      "When it beeps in, type the ingredient name from the label in the search box.",
      "Tap the matching compound, then 'Add to my stack'.",
      "Open Stack to fine-tune the dose and time.",
    ],
    tips: [
      "Bottle UPC codes are different for every brand. We use the barcode to help you spot the right product, but we match by ingredient name.",
      "You need to allow camera access the first time.",
    ],
    keywords: ["scan", "barcode", "camera", "bottle", "upc", "add"],
  },
};

export const HELP_LIST: HelpArticle[] = Object.values(HELP);

export function searchHelp(query: string): HelpArticle[] {
  const q = query.trim().toLowerCase();
  if (!q) return HELP_LIST;
  return HELP_LIST.filter((a) => {
    const hay = [a.title, a.summary, ...a.keywords, ...a.steps].join(" ").toLowerCase();
    return hay.includes(q);
  });
}
