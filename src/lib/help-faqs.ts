// Per-guide FAQs for the Help Center.
//
// Two jobs:
//  1. Answer the questions people actually ask after reading the steps.
//  2. Give each /help/<slug> page enough unique, self-contained text to be a
//     real answer target (the step lists alone left every guide under ~250
//     words, which reads as thin content to both crawlers and answer engines).
//
// Keyed by HelpArticle.slug. Keep answers plain-English and specific to
// DoseRoutine behaviour — no generic filler.

export type HelpFaq = { q: string; a: string };

export const HELP_FAQS: Record<string, HelpFaq[]> = {
  today: [
    {
      q: "Why is a dose still showing as due after its time has passed?",
      a: "Every dose gets a 60-minute grace window. Between the scheduled time and the end of that window the dose stays 'due' so you can log it late without it counting against your adherence. Once the window closes it flips to 'missed', and you can still tap 'Log late' to record that you took it.",
    },
    {
      q: "Can I undo a dose I marked taken by mistake?",
      a: "Yes. Tap the dose again and choose 'Reset'. If the scheduled time has already passed by more than the grace window, resetting returns the dose to 'missed' rather than 'due' — that is intentional so your adherence history stays honest.",
    },
    {
      q: "What does the Today screen show if I have nothing scheduled?",
      a: "You get an empty-state card with a shortcut to add your first compound. If you expected doses and see nothing, check that the item is active in your Stack, that today is not an OFF day in a cycle, and that vacation mode is not switched on.",
    },
  ],
  stack: [
    {
      q: "How do I take the same compound twice a day?",
      a: "Open the item and tap '+ Add another time' instead of creating a second entry. That keeps one compound with two scheduled times, so your adherence, refill countdown, and cost tracking all stay on a single record.",
    },
    {
      q: "Can I pause an item without deleting it?",
      a: "Yes. Set the item to inactive from its detail screen. It stops appearing on Today and stops generating reminders, but your history, notes, and cost data are kept so you can switch it back on later.",
    },
    {
      q: "What happens to my stack if I change my timezone?",
      a: "Schedules are stored as a local clock time, not a fixed UTC instant, so an 8:00 AM dose stays at 8:00 AM in whichever reminder timezone you have set. Change that timezone under More → Reminders if you move or travel long-term.",
    },
  ],
  reminders: [
    {
      q: "Why did I not get a push notification?",
      a: "The three usual causes are: push permission was never granted on the device, the dose falls inside your quiet hours, or the reminder timezone on the Reminders screen does not match where you actually are. Check all three in that order.",
    },
    {
      q: "Do reminders still fire if the app is closed?",
      a: "Yes on iOS and Android once notifications are allowed — reminders are scheduled with the operating system, so they ring without the app running. On the web, add the doses to your phone calendar instead for alarms that work offline.",
    },
    {
      q: "What is a lead time?",
      a: "A lead time nudges you 0–60 minutes before a dose is due, per compound. It is useful for anything that needs preparation, like a peptide that has to be drawn up or a supplement that must be taken with food.",
    },
  ],
  notifications: [
    {
      q: "Is the notification center the same as push notifications?",
      a: "No. Push notifications land on your device; the notification center is the in-app log of everything we sent. If you dismiss a push by accident, the message is still waiting in the bell icon.",
    },
    {
      q: "How long are notifications kept?",
      a: "Recent alerts stay in the list so you can scroll back through the last several weeks of reminders, refill warnings, and buzz alerts. Marking one read removes the unread badge but keeps the entry.",
    },
    {
      q: "Why do I only get a few alerts a day?",
      a: "Buzz-style alerts are capped at three per user per day so the app never turns into noise. Dose reminders themselves are not capped — they follow your schedule.",
    },
  ],
  fitness: [
    {
      q: "Do workouts affect my adherence score?",
      a: "No. Adherence measures doses only. Workouts, cardio sessions, and body metrics are tracked separately so a missed gym day never makes your medication history look worse than it is.",
    },
    {
      q: "Can I log cardio as well as lifting?",
      a: "Yes. Each session can be recorded as strength work with sets and reps, or as cardio with duration and intensity. Both show up on the same calendar so you can see your weekly training load at a glance.",
    },
    {
      q: "Can I schedule recurring sessions?",
      a: "Yes. Save a routine and set the days it repeats. The app creates the upcoming sessions for you and can nudge you beforehand if workout reminders are switched on.",
    },
  ],
  "workout-templates": [
    {
      q: "What gets saved in a workout template?",
      a: "The exercise list plus the sets, reps, and any pacing or rest notes you entered. Loading the template pre-fills a new session with all of it, so you only change the weights you actually used.",
    },
    {
      q: "Can I edit a template after saving it?",
      a: "Yes, and editing a template does not rewrite sessions you already logged from it. Past sessions keep the numbers you recorded on the day.",
    },
    {
      q: "How many templates can I keep?",
      a: "Enough for a full training split — most people run three to six (push, pull, legs, conditioning). There is no practical limit for normal use.",
    },
  ],
  "workout-reminders": [
    {
      q: "How is a workout reminder different from a dose reminder?",
      a: "It fires against your planned training session rather than a scheduled compound, and it obeys the same quiet hours and reminder timezone as your dose reminders so the two never conflict overnight.",
    },
    {
      q: "Will it nag me if I skip a session?",
      a: "You get one follow-up nudge after a missed session, not a stream of them. Turn the follow-up off on the Reminders screen if you prefer a single reminder only.",
    },
    {
      q: "Can I get reminded the night before?",
      a: "Yes — set the lead time far enough ahead and the nudge lands the evening before, which works well for early-morning sessions.",
    },
  ],
  "body-metrics": [
    {
      q: "Which measurements can I track?",
      a: "Weight, body-fat percentage, and tape measurements such as waist, chest, arms, and thighs. Each entry is timestamped so the trend line reflects when you actually measured.",
    },
    {
      q: "Does the app use kg or lb?",
      a: "Whichever you set in units. Existing entries are converted for display, so switching units does not corrupt older measurements.",
    },
    {
      q: "How often should I log?",
      a: "Weekly at the same time of day gives the cleanest trend. Daily weigh-ins are fine too — the chart smooths short-term water-weight noise so the direction stays readable.",
    },
  ],
  refills: [
    {
      q: "How does the app know when I'm running low?",
      a: "You enter how many pills, capsules, or millilitres a container holds. Every logged dose decrements the count, so the remaining supply is based on what you actually took, not on the calendar.",
    },
    {
      q: "When does the refill warning appear?",
      a: "Once the remaining supply drops below your chosen threshold — typically seven days out, which is enough lead time to reorder before you run dry.",
    },
    {
      q: "What if I open a new bottle?",
      a: "Tap 'Refill' on the item and enter the new quantity. The countdown restarts from that amount and your previous usage history is preserved.",
    },
  ],
  sharing: [
    {
      q: "Does the person I share with need an account?",
      a: "No. A share link opens a read-only page in any browser with no login, which is what makes it practical to hand to a doctor at an appointment.",
    },
    {
      q: "Is my personal information on the shared page?",
      a: "No. The page shows the compounds, doses, and timing only. Your name, email, and account details are never included.",
    },
    {
      q: "Can I turn a link off later?",
      a: "Yes. Revoke it from the share screen and the URL stops working immediately, even for someone who already had it.",
    },
  ],
  "ai-coach": [
    {
      q: "Does the AI Coach see my actual stack?",
      a: "Yes — it reads the compounds, doses, and timing on your account, so you can ask things like 'is anything in my stack competing for absorption?' and get an answer about your routine rather than a generic one.",
    },
    {
      q: "Can it give me medical advice?",
      a: "No. It explains mechanisms, timing, and what the published literature reports, and it will tell you to speak with a clinician for anything diagnostic or prescriptive. Treat it as a research assistant, not a doctor.",
    },
    {
      q: "Why did I get an error instead of an answer?",
      a: "Almost always a dropped connection mid-request. Send the question again; if it repeats, sign out and back in so a fresh session token is attached to the request.",
    },
  ],
  scanner: [
    {
      q: "Why did the scanner not recognise my bottle?",
      a: "Barcodes are per brand and per SKU, so an unusual product may not resolve to a known item. The scan still helps you confirm the right bottle — type the ingredient name from the label and match it to a compound in the library.",
    },
    {
      q: "Does scanning add the product automatically?",
      a: "No. It brings you to a confirmation step where you pick the compound and set the dose, which prevents a mis-scan from silently adding the wrong thing to your stack.",
    },
    {
      q: "Do I need to allow camera access?",
      a: "Yes, once. If you declined the first time, re-enable camera permission for DoseRoutine in your device settings and reopen the scan screen.",
    },
  ],
  languages: [
    {
      q: "Which languages are supported?",
      a: "Twelve, covering the interface, reminders, and help content. Compound names stay in their standard scientific form in every language so they remain searchable and unambiguous.",
    },
    {
      q: "Does changing language change my data?",
      a: "No. Only the interface text changes. Your stack, history, notes, and schedules are untouched.",
    },
    {
      q: "Will reminders arrive in my chosen language?",
      a: "Yes. Push and email reminders follow the language set on your account, not the language of your device.",
    },
  ],
  interactions: [
    {
      q: "What do the severity levels mean?",
      a: "Major means avoid or get clinical supervision, moderate means the combination needs monitoring or separated timing, and minor means a small effect that most people can manage. Note badges are contextual advice rather than a warning.",
    },
    {
      q: "Where does the interaction data come from?",
      a: "Published pharmacology and clinical literature, with PMID or DOI references attached to the entries so you can open the underlying source rather than take our word for it.",
    },
    {
      q: "Does it check my whole stack at once?",
      a: "Yes. The checker runs every pair in your stack and surfaces the flagged combinations, and you can filter the results by severity so the major items stay at the top.",
    },
  ],
  reconstitution: [
    {
      q: "How do I work out units on an insulin syringe?",
      a: "Enter the vial strength in milligrams, the volume of bacteriostatic water you added, and the dose you want. The calculator returns the mark to draw to on a U-100 syringe, which is the number people usually get wrong by a factor of ten.",
    },
    {
      q: "How much bacteriostatic water should I add?",
      a: "There is no single right answer — more water makes the draw easier to measure accurately, less water keeps the injection volume small. The calculator shows the resulting concentration for whatever you enter so you can pick a volume that lands on an easy syringe mark.",
    },
    {
      q: "Does it save my vial so I don't re-enter it?",
      a: "Yes. Save the vial and the app tracks remaining volume as you log doses, and warns you before it runs out.",
    },
  ],
  labs: [
    {
      q: "Which lab markers can I log?",
      a: "The common panels — hormones, lipids, metabolic markers, liver and kidney function, and blood count — each with your value, the unit, and the reference range from your report.",
    },
    {
      q: "What do the colours mean?",
      a: "Green is inside the reference range, yellow is borderline, and red is outside it. The comparison uses the range printed on your own lab report, because reference ranges differ between labs.",
    },
    {
      q: "Can I see change over time?",
      a: "Yes. Log the same marker across multiple draws and the tracker charts the trend, which matters far more than any single reading.",
    },
  ],
  templates: [
    {
      q: "What is in a stack template?",
      a: "A ready-made protocol — the compounds, typical doses, and timing — that you can load in one tap instead of building the routine item by item.",
    },
    {
      q: "Can I change a template after loading it?",
      a: "Yes, and you should. A template is a starting point; adjust every dose and time to what you and your clinician have actually decided on.",
    },
    {
      q: "Does loading a template replace my current stack?",
      a: "No. Template items are added alongside what you already take, so nothing is overwritten. Remove anything you do not want afterwards.",
    },
  ],
  "injection-sites": [
    {
      q: "Why does rotation matter?",
      a: "Repeatedly injecting the same spot causes lumps, scar tissue, and inconsistent absorption. Rotating spreads the load so each site has time to recover.",
    },
    {
      q: "How does the app pick the next site?",
      a: "It tracks which sites you have used and how recently, then highlights the one that has rested longest. You can always override the suggestion.",
    },
    {
      q: "Does it work for both subcutaneous and intramuscular?",
      a: "Yes. The site map covers both, and each logged injection records which site and route you used so the rotation history stays accurate.",
    },
  ],
  cycles: [
    {
      q: "How do I set up a 5-on, 2-off protocol?",
      a: "Turn on cycling for the item and enter five days on and two days off. The app builds the pattern forward, so OFF days simply produce no dose on Today.",
    },
    {
      q: "Do OFF days hurt my adherence score?",
      a: "No. An OFF day generates no scheduled dose, so there is nothing to miss and your score is unaffected.",
    },
    {
      q: "Can different compounds run different cycles?",
      a: "Yes. Cycles are per item, so one compound can run weekdays only while another runs eight weeks on and four weeks off.",
    },
  ],
  costs: [
    {
      q: "How is my monthly cost calculated?",
      a: "From what you paid for a container, how much it holds, and how much you actually take per day. That gives a real cost per dose rather than a guess based on list price.",
    },
    {
      q: "Can I see which item is the most expensive?",
      a: "Yes. Costs are broken down per compound and ranked, which usually makes it obvious where the budget is going.",
    },
    {
      q: "Does it handle different currencies?",
      a: "Yes — set your currency once and every figure, including the annual projection, is shown in it.",
    },
  ],
  "side-effects": [
    {
      q: "What should I write in the journal?",
      a: "Anything you noticed and when — nausea, sleep quality, mood, injection-site soreness, energy. Short entries logged consistently are far more useful than long ones logged rarely.",
    },
    {
      q: "How do I spot a pattern?",
      a: "Entries are timestamped against your dose history, so you can see whether a symptom clusters around a dose change, a new compound, or a particular time of day.",
    },
    {
      q: "Can I show this to my doctor?",
      a: "Yes. Side-effect entries are included in My Report, which is designed to be printed or handed over at an appointment.",
    },
  ],
  "doctor-report": [
    {
      q: "What is on the report?",
      a: "One page: your current compounds and doses, your adherence over the period, logged side effects, and recent lab values if you have entered any.",
    },
    {
      q: "Can I print it or save a PDF?",
      a: "Yes. Use your browser or device print dialog and choose 'Save as PDF' to keep a copy or email it ahead of an appointment.",
    },
    {
      q: "Can I choose the date range?",
      a: "Yes. Pick the window you want covered so the report matches the period since your last visit.",
    },
  ],
  "progress-photos": [
    {
      q: "Where are my photos stored?",
      a: "In your private account storage. They are never part of a share link, never shown on a public page, and never used for anything other than showing them back to you.",
    },
    {
      q: "How do I take comparable photos?",
      a: "Same spot, same lighting, same time of day, same pose. Consistency matters more than camera quality — inconsistent lighting is what makes most progress photos useless.",
    },
    {
      q: "Can I delete a photo?",
      a: "Yes, at any time, and deletion removes it from storage rather than just hiding it.",
    },
  ],
  export: [
    {
      q: "What is included in an export?",
      a: "Your stack, dose history, notes, side-effect entries, lab values, and tracked metrics — the data you put in, in a format you can open elsewhere.",
    },
    {
      q: "What format do I get?",
      a: "A structured data file you can open in a spreadsheet or import into another tool, so nothing is locked inside DoseRoutine.",
    },
    {
      q: "Does exporting delete anything?",
      a: "No. Export is a copy. If you want your account removed, use the account deletion option instead.",
    },
  ],
  "share-stack": [
    {
      q: "Is a share link a live view of my stack?",
      a: "No — it is a snapshot taken when you created it. Editing your stack afterwards does not change what the link shows, so create a fresh link when you want to share an update.",
    },
    {
      q: "Can I have more than one link?",
      a: "Yes. People often keep one for a clinician and one for a coach, named separately, and revoke them independently.",
    },
    {
      q: "Can anyone with the link edit my stack?",
      a: "No. Shared pages are read-only and cannot change anything on your account.",
    },
  ],
  scan: [
    {
      q: "What exactly does scanning a bottle do?",
      a: "It reads the barcode to help you confirm you are holding the right product, then takes you to a search step where you match the ingredient on the label to a compound in the library before adding it.",
    },
    {
      q: "Why is the match by ingredient rather than by barcode?",
      a: "Barcodes are unique per brand and package size, so the same ingredient has thousands of different codes. Matching on the ingredient means your dose tracking and interaction checks work regardless of which brand you bought.",
    },
    {
      q: "Can I add the product without scanning?",
      a: "Yes. Search the library directly from the Stack tab — scanning is a shortcut, never a requirement.",
    },
  ],
};

export function getHelpFaqs(slug: string): HelpFaq[] {
  return HELP_FAQS[slug] ?? [];
}
