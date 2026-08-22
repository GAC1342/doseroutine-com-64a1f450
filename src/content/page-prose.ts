/**
 * Unique long-form copy for pages that site audits flagged as "low content".
 *
 * Each entry is real, page-specific editorial prose — no boilerplate is shared
 * between keys, so the copy also keeps these pages out of duplicate-content
 * reports. Rendered by <PageProse /> (src/components/page-prose.tsx).
 */

export type ProseSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export const PAGE_PROSE: Record<string, ProseSection[]> = {
  status: [
    {
      heading: "What this status page covers",
      paragraphs: [
        "This page reports the live health of the parts of DoseRoutine that people depend on day to day: the sign-in service, the dose scheduler and reminder queue, the compound library and interaction checker, the photo-based meal scanner, and the sync layer that copies your logs between your phone and the web app. Each check runs against the same production systems you use, so a green marker here means a real request succeeded, not that a server was merely reachable.",
        "Checks refresh whenever this page loads. If a component is degraded we describe what still works — for example, reminders can continue firing on your device while the sync layer catches up, because scheduled notifications are stored locally as well as on the server.",
      ],
    },
    {
      heading: "How we handle incidents",
      paragraphs: [
        "When something breaks we prioritize anything that can cause a missed or duplicated dose, because that is the failure that actually matters in a medication tracker. Reminder delivery and dose logging come first, then interaction data, then secondary features such as analytics, exports and the meal scanner.",
        "Your logged doses are never dropped during an outage. The app writes them locally first and replays them to the server once connectivity returns, so a network failure delays sync rather than losing history. If you open the app offline you will still see today's schedule, your active protocols and your recent logs.",
      ],
    },
    {
      heading: "If the app is not working for you",
      paragraphs: [
        "If every component here reads healthy but the app still misbehaves, the cause is usually local: a stale cached build, a browser extension blocking scripts, or notification permissions that were revoked at the operating-system level. Pulling to refresh, reinstalling the home-screen app, or re-enabling notification permission resolves most of these.",
        "Persistent problems are worth reporting. Tell us the page you were on, what you expected, and roughly when it happened, and we can match it against server logs for that window.",
      ],
    },
  ],

  install: [
    {
      heading: "Why installing beats using a browser tab",
      paragraphs: [
        "DoseRoutine works in any modern browser, but installing it to your home screen changes what the app can do. An installed app can deliver scheduled reminders when the browser is closed, opens instantly from a cold start because its shell is cached on the device, keeps you signed in between sessions, and runs full-screen without the browser toolbar eating vertical space on the dose list.",
        "Installation is not an app-store download. The same web app is saved to your device as a standalone launcher, so there is nothing to update manually — you always get the current version the next time you open it.",
      ],
    },
    {
      heading: "What to expect on each platform",
      paragraphs: [
        "On iPhone and iPad, use Safari and choose Share, then Add to Home Screen. Notifications require the installed version on iOS, so if reminders are the reason you are here, this step is required rather than optional.",
        "On Android, Chrome usually offers an install prompt directly; if it does not appear, the browser menu has an Install app or Add to home screen entry. On desktop, Chrome and Edge show an install icon in the address bar, which is handy if you plan your week on a laptop and log doses on your phone.",
      ],
      bullets: [
        "Reminders keep working when the browser is closed",
        "Offline access to today's schedule, your protocols and your recent logs",
        "Faster cold starts because the app shell is cached locally",
        "Full-screen layout with no browser chrome",
      ],
    },
    {
      heading: "After you install",
      paragraphs: [
        "Grant notification permission when prompted, then set the reminder times that match how you actually take things — morning, with meals, or a specific injection day. Reminders are scheduled on the device, so they still fire if you are traveling without a signal.",
        "Your account syncs across every device you install on. Log a dose on your phone and it appears on the web within seconds, which matters if you plan protocols on a computer but log them on the move.",
      ],
    },
    {
      heading: "If reminders still do not arrive",
      paragraphs: [
        "Nearly every missed-reminder report comes down to one of three things, and they are quick to check in order. First, notification permission: on iPhone this is granted from inside the installed app, and if you dismissed the prompt once you will need to enable DoseRoutine under Settings, Notifications. Second, on iPhone the app must be opened from the home-screen icon rather than a Safari tab — a tab cannot schedule anything once it is closed. Third, on Android, battery optimization frequently suspends background delivery; excluding the app from optimization fixes it.",
        "Once permission is granted, send yourself a test reminder a few minutes out rather than waiting for a real dose. Confirming it works while you are sitting there is the difference between a system you trust and one you quietly stop relying on.",
      ],
      bullets: [
        "iPhone: install from Safari, then allow notifications inside the app",
        "Android: allow notifications, then exclude the app from battery optimization",
        "Desktop: keep the installed window signed in for reminders while you work",
        "All platforms: send a test reminder before you depend on it",
      ],
    },
    {
      heading: "Installed app versus the store apps",
      paragraphs: [
        "The installed web app and the native iPhone and Android builds share the same account and the same data, so choosing one is not a commitment. The web install is the fastest route in — no store review, no download — and it covers reminders, offline access to today's schedule, the calculators and the full compound library. The native builds add tighter operating-system integration for notifications and camera access on the meal scanner.",
        "A common pattern is installing on the phone for logging and reminders and using a desktop browser for the heavier work: building protocols, reading library entries, reviewing lab charts and exporting a report before an appointment. Everything stays in sync, so there is no wrong place to start.",
      ],
    },
  ],

  compare: [
    {
      heading: "How to read these comparisons",
      paragraphs: [
        "Every comparison on DoseRoutine follows the same method so the pages are actually comparable to each other. We describe what each app was built for, what it costs in practice rather than at its advertised entry tier, what data you can get back out of it, and where it stops being useful for the kind of tracking our readers do — supplements, peptides, hormone therapy including TRT, GLP-1 medications and prescriptions in one schedule.",
        "We do not score apps out of ten. A pill reminder built for a single daily prescription is not a worse product than a protocol tracker; it is a different product, and the honest answer is often that the simpler tool is the right one. Where that is the case, the comparison says so.",
      ],
    },
    {
      heading: "What we compare on",
      paragraphs: [
        "The criteria are fixed across every comparison page: how flexible the schedule engine is (daily, every-other-day, weekly injections, cycles with breaks), whether the app understands units beyond a pill count, whether it checks interactions and cites its sources, how reminders behave when you miss or snooze one, what export and deletion options exist, and how the app treats your health data.",
      ],
      bullets: [
        "Schedule flexibility: cycles, weekly injections, titration ramps",
        "Units: mg, mcg, IU, mL and reconstituted concentrations, not just pills",
        "Interaction coverage and whether claims are sourced",
        "Reminder behavior on missed, snoozed and rescheduled doses",
        "Data export, account deletion and privacy posture",
        "Real cost after the free tier ends",
      ],
    },
    {
      heading: "Keeping the pages current",
      paragraphs: [
        "Apps change. Pricing moves, features ship, and a limitation we noted can disappear in a release. Each comparison carries the date it was last reviewed, and we re-check pricing and feature claims on a rolling schedule rather than writing once and leaving the page to rot. If you spot something out of date, telling us is the fastest way to get it fixed.",
      ],
    },
  ],

  "vs-index": [
    {
      heading: "Choosing between DoseRoutine and a standard reminder app",
      paragraphs: [
        "Most medication reminder apps assume one thing: a pill, taken a set number of times a day, forever. That model covers a lot of people well. It falls apart the moment your routine includes a weekly injection, a reconstituted peptide measured in units on a syringe, a titration schedule that steps up every four weeks, or a supplement stack where timing relative to food and to other compounds actually changes the outcome.",
        "These pages exist to give you an honest read on where that line sits. If a simpler app fits your routine, use it — you will get a cleaner experience and probably pay less. If your routine has cycles, mixed units or interaction risk, a generic reminder will keep telling you to take a pill you do not take.",
      ],
    },
    {
      heading: "What tends to decide it",
      paragraphs: [
        "In practice the deciding factors cluster into a few questions. Do you need anything other than daily repeats? Do you measure in something other than tablets? Do you take enough different compounds that timing conflicts are plausible? Do you want the data back out — for a doctor, a spreadsheet or your own review?",
      ],
      bullets: [
        "One or two daily pills, nothing else: a lightweight reminder app is enough",
        "Weekly or every-other-day injections: you need a real schedule engine",
        "Peptides and reconstitution: you need concentration-aware dosing, not pill counts",
        "Five or more compounds: interaction checking stops being optional",
        "Sharing with a clinician: exports and adherence history matter",
      ],
    },
    {
      heading: "How we write these",
      paragraphs: [
        "Each versus page is written against the criteria on our comparison hub and reviewed on a schedule. We name what competitors do well, because a comparison that finds no strengths in the other product is marketing rather than information. Where an app is genuinely stronger than DoseRoutine for a given use case, the page says which use case and why.",
      ],
    },
  ],

  "dose-routine": [
    {
      heading: "Why the name appears two ways",
      paragraphs: [
        "The product is written as one word, DoseRoutine, but people search for it as two — dose routine — and both spellings land here. There is no second app, no alternate company and no separate download. Search engines and voice assistants split the name in different ways, so this page exists to resolve the ambiguity for people and for machines reading the site.",
        "If you were sent a link, saw the app referenced in a forum thread, or heard the name spoken and typed it as two words, you are in the right place. The official site is doseroutine.com and everything described here is the same product you would find under either spelling.",
      ],
    },
    {
      heading: "What people typically use it for",
      paragraphs: [
        "The most common starting point is an interaction question: someone has added a new compound to an existing routine and wants to know whether the combination is a problem, and why. From there people usually build out a schedule — a stack with real doses, timing rules and reminders — and start logging.",
        "The second common entry point is arithmetic. Reconstituting a peptide, converting between mg, mcg and IU, or working out how many units on the syringe a prescribed dose actually is. The calculators handle that without you needing an account.",
      ],
    },
  ],

  "for-index": [
    {
      heading: "Different routines, different problems",
      paragraphs: [
        "A supplement stack, a TRT protocol, a peptide cycle and a GLP-1 titration are all 'taking something on a schedule', but each one fails in a different way. Supplement stacks go wrong through timing and absorption conflicts. TRT goes wrong when injection intervals drift and levels swing. Peptide cycles go wrong through reconstitution arithmetic and cycle breaks that get forgotten. GLP-1 goes wrong when a dose step-up is missed or doubled.",
        "The pages in this section describe how DoseRoutine is set up for each of those routines specifically: which schedule type to use, which units to track in, what the app will warn you about, and what it deliberately will not do.",
      ],
    },
    {
      heading: "What stays the same across all of them",
      paragraphs: [
        "Whatever you track, the core is identical. You build a protocol with real doses and real timing, the interaction checker looks at everything in it together rather than pair by pair in isolation, reminders fire on the device, and your log builds an adherence history you can export.",
        "DoseRoutine is a tracking and reference tool. It does not prescribe, it does not recommend compounds, and it does not tell you a dose is safe for you. It shows you what the published literature reports, cites where each claim comes from, and keeps your own record straight so that a conversation with a clinician starts from data instead of memory.",
      ],
    },
  ],

  "vs-supplement-planner": [
    {
      heading: "Planners versus trackers",
      paragraphs: [
        "A supplement planner is designed around the question 'what should I take?'. It helps you assemble a stack, often suggests products, and produces a plan you then have to execute somewhere else. A tracker is designed around 'did I take it, and what happened?'. The two overlap enough that people expect one tool, then discover the planner has no real schedule engine and the tracker has no opinion about what belongs in a stack.",
        "DoseRoutine sits on the tracker side of that line, with the reference material a planner would give you attached to each compound: mechanism, studied amount ranges, timing and food rules, half-life, contraindications and cited sources. It will not sell you a stack or tell you what to buy.",
      ],
    },
    {
      heading: "Where a planner is the better choice",
      paragraphs: [
        "If you are at the stage of deciding what to take and want product-level guidance — brands, forms, bundles — a planner is genuinely more useful, and DoseRoutine will feel like it is missing the point. Come back when you have a routine to run.",
        "If you already know what you take and the problem is executing it consistently, catching interactions, getting the reconstitution math right and having a record to show a clinician, that is the job this app is built for.",
      ],
      bullets: [
        "Planner strengths: stack ideas, product guidance, starting from zero",
        "Tracker strengths: schedules, reminders, adherence history, exports",
        "DoseRoutine adds: interaction checking with sources, unit-aware dosing",
      ],
    },
    {
      heading: "What a planner cannot do once the stack is running",
      paragraphs: [
        "The moment a stack has more than a handful of items, the interesting problems stop being about selection and start being about execution. Magnesium and zinc compete for the same absorption pathway. Calcium blunts thyroid medication for hours. Some peptides need an empty stomach; some fat-soluble vitamins need the opposite. A planner that produced a good-looking list has no way to know when you actually took each item, so it cannot flag any of that — the collisions only become visible on a timeline.",
        "The same applies to the questions people care about six months in: did the addition do anything, has adherence slipped on the item you were least sure about, and what does the record look like when a clinician asks. Those are all answered from history, which a planner does not keep.",
      ],
    },
    {
      heading: "Migrating a planned stack into a tracker",
      paragraphs: [
        "Bringing an existing plan across takes about ten minutes. Enter each item with its real amount and unit rather than a capsule count, attach the timing rule you were given — with food, on waking, away from minerals — and set the days it actually runs rather than defaulting everything to daily. Include the things you take irregularly; they are the ones most likely to cause an interaction precisely because they are not part of the routine.",
        "Then run the interaction pass once over the whole stack. Most people find at least one timing conflict carried over from the plan, and reshuffling an item by a couple of hours usually resolves it without dropping anything. After that the app runs itself: reminders fire, doses get logged in a tap, and the adherence record builds without further effort.",
      ],
      bullets: [
        "Enter real units — mg, mcg, IU, mL — not capsule counts",
        "Attach food and timing rules so conflicts can be detected",
        "Include occasional items, not just the daily core",
        "Run one interaction pass before you trust the schedule",
      ],
    },
  ],

  cookies: [
    {
      heading: "What we actually store on your device",
      paragraphs: [
        "DoseRoutine keeps the number of browser-stored items deliberately small. The essential ones are your authentication session, which is what stops you having to sign in on every page, and a handful of local preferences such as your theme, measurement units and which view you last had open. Those are stored on your device rather than sent anywhere on each request.",
        "Local storage is also used as an offline buffer. Doses you log without a connection are written locally and replayed to the server when you reconnect, which is why the app can be used on a plane or in a basement gym without losing the record.",
      ],
    },
    {
      heading: "Analytics and what it is not",
      paragraphs: [
        "We use privacy-conscious product analytics to understand which pages and features are used, and to catch errors. That data is aggregate and behavioral — pages visited, features opened, errors encountered. It does not include what compounds you track, your doses, your logs, your photos or your health notes. Those never enter the analytics pipeline.",
        "We do not run advertising cookies, we do not sell data, and we do not operate cross-site tracking pixels for ad networks.",
      ],
    },
    {
      heading: "Controlling it",
      paragraphs: [
        "You can clear site data from your browser settings at any time; the effect is that you are signed out and your local preferences reset. Blocking cookies entirely will prevent sign-in from working, because the session has nowhere to live. Analytics can be blocked with any standard content blocker without breaking the app.",
        "If you want everything gone, use the account deletion flow rather than just clearing your browser — that removes the server-side record as well as the local one.",
      ],
    },
  ],

  privacy: [
    {
      heading: "The short version",
      paragraphs: [
        "You own your health data. We store what you enter so the app can function across your devices, we do not sell it, we do not share it with advertisers, and we do not use it to train third-party models. Access is restricted at the database level so that your rows are readable only by your authenticated account.",
        "The data we hold is what you would expect: your account identity, the compounds and protocols you have set up, your dose logs and notes, any body metrics or meal entries you record, and photos you upload to the meal scanner. Nothing else about you is collected from third-party data brokers or appended to your profile.",
      ],
    },
    {
      heading: "Where processing happens",
      paragraphs: [
        "Some features send data to processors in order to work at all. The meal scanner sends the photo you take to an AI vision provider to identify the food; the AI assistant sends your question and the relevant context needed to answer it. Those requests are made for your session and are not used to build a marketing profile.",
        "Everything else — schedules, reminders, interaction checks, calculators and the compound library — is served from our own systems and requires no third-party processing.",
      ],
    },
    {
      heading: "Your controls",
      paragraphs: [
        "You can export your data at any time, and you can delete your account, which removes your rows rather than flagging them as hidden. Deletion is irreversible, so exporting first is worth the extra minute if you want a record.",
        "If you have a question about a specific piece of data, ask and we will tell you exactly what is stored and why. A privacy policy that cannot answer that question in plain language is not doing its job.",
      ],
    },
  ],

  "data-deletion": [
    {
      heading: "What deletion removes",
      paragraphs: [
        "Deleting your DoseRoutine account removes the account record itself and everything attached to it: your protocols and stacks, every dose you have logged, notes, body metrics, meal entries and uploaded photos, reminder schedules, and any saved preferences or presets. These are deleted rows, not hidden rows — there is no dormant profile left behind waiting to be reactivated.",
        "Because deletion is permanent, export first if you want to keep a copy. Once the deletion runs there is nothing on our side to restore from, and support cannot recover it for you.",
      ],
    },
    {
      heading: "How to do it",
      paragraphs: [
        "The fastest route is in the app: open your account settings and use the delete account control. You will be asked to confirm, and the deletion runs immediately rather than being queued for manual review.",
        "If you cannot sign in — a lost email address, a broken login — email us from the address on the account, or with enough detail to identify it, and we will process the request manually.",
      ],
      bullets: [
        "Protocols, stacks and schedules",
        "Dose logs, adherence history and notes",
        "Body metrics, meal entries and uploaded photos",
        "Reminder configuration, presets and preferences",
        "The account and its authentication record",
      ],
    },
    {
      heading: "What may briefly remain",
      paragraphs: [
        "Encrypted backups roll on a fixed cycle and are overwritten in the ordinary course of operation, so a deleted account can persist in a backup snapshot until that snapshot expires. Those backups are not queryable for ordinary use and are never mined for user data.",
        "Aggregate, non-identifying counts — such as how many people used a feature in a month — are not tied to your identity and remain in analytics after deletion. Nothing in that data can be traced back to your account, your compounds or your logs.",
      ],
    },
  ],

  "medical-disclaimer": [
    {
      heading: "What DoseRoutine is",
      paragraphs: [
        "DoseRoutine is an educational reference and a personal tracking tool. It summarizes what published research reports about compounds, cites the sources those summaries come from, does dosing arithmetic, keeps your schedule, and records what you actually took. That is the entire scope.",
        "It is not a medical device, it is not a diagnostic tool, and no output it produces has been reviewed for your individual situation. A studied amount range on a compound page describes what appears in the literature — it is not a recommendation that you take that amount.",
      ],
    },
    {
      heading: "What the interaction checker does and does not tell you",
      paragraphs: [
        "The interaction checker flags documented mechanisms — absorption competition, shared metabolic pathways, additive effects — between compounds in your stack, and links the evidence behind each flag. It is a prompt for a conversation, not a verdict.",
        "An absence of a flag does not mean a combination is safe. Interaction literature is incomplete, especially for peptides and newer compounds, and no database can account for your dose, your other conditions, your kidney and liver function or your genetics. Treat a clean result as 'nothing documented in our sources', not as clearance.",
      ],
    },
    {
      heading: "When to talk to a clinician",
      paragraphs: [
        "Talk to a qualified healthcare professional before starting, stopping or changing anything — particularly if you are pregnant or breastfeeding, managing a chronic condition, taking prescription medication, or preparing for surgery. Never delay or disregard professional advice because of something you read here.",
        "If you think you are experiencing a medical emergency or an adverse reaction, contact your local emergency service or poison control immediately. Do not use this app to decide whether a symptom is serious.",
      ],
    },
  ],

  "booty-workout": [
    {
      heading: "How the ten-minute session is structured",
      paragraphs: [
        "The routine is built around the three jobs the glutes actually do: hip extension, hip abduction and pelvic stability. Each round moves through those in order, so the larger movements get your freshest effort and the stabiliser work finishes the muscle once it is already fatigued. Ten minutes is short enough that the limiting factor is effort rather than time, which is the point — a session you finish beats a session you plan.",
        "There is no equipment requirement. A mat helps for the floor work, and a light band adds resistance to the abduction movements once bodyweight stops being challenging, but neither is needed to run the workout as written.",
      ],
    },
    {
      heading: "Form cues that matter more than reps",
      paragraphs: [
        "Most people feel glute work in the lower back or the front of the thigh instead of the target muscle, and the cause is almost always the same two things: the pelvis tipping forward, and the movement being driven by momentum. Keep the ribs down and the pelvis tucked slightly under, then drive through the heel and pause for a beat at the top of every rep where the muscle is shortest.",
        "Slow the lowering phase. Taking two to three seconds to return to the start does more for the muscle than adding reps, and it keeps the joint out of the end ranges where form tends to collapse.",
      ],
      bullets: [
        "Ribs down, pelvis slightly tucked — no arching the lower back",
        "Drive through the heel, not the toes",
        "Pause one second at peak contraction on every rep",
        "Lower slowly; the eccentric is where most of the work happens",
        "Stop a rep short rather than finishing it with momentum",
      ],
    },
    {
      heading: "How often, and tracking progress",
      paragraphs: [
        "Three to four sessions a week on non-consecutive days suits most people. Glutes recover quickly compared with larger compound-lift fatigue, but the stabiliser work still needs a day to settle, and soreness that lingers past 48 hours is a sign to add rest rather than push through.",
        "Progress on a short routine comes from quality, not duration. Add a band, slow the lowering phase further, or add a rep per set — do not extend the session to twenty minutes. The app records each completed session so you can see the streak and how your rounds have progressed rather than guessing.",
      ],
    },
  ],

  "blog-index": [
    {
      heading: "What gets written about here",
      paragraphs: [
        "The blog exists to answer the questions people actually type before they change something about a protocol: how much bacteriostatic water a vial needs, what a missed weekly injection means for the next one, whether two things in the same stack cancel each other out, and what a lab trend has to be doing before it is worth acting on. Every post starts from a real question rather than a keyword, which is why the archive is uneven — some subjects get two thousand words because they deserve it, and some get four hundred because that is the whole answer.",
        "Posts are dated and revisited. Dosing conventions, drug availability and trial readouts move, and a post that was right eighteen months ago can quietly become wrong. When something material changes we update the post and move its reviewed date rather than publishing a near-identical replacement, so links you have saved keep working and keep pointing at the current version.",
      ],
    },
    {
      heading: "How to read a post here",
      paragraphs: [
        "Each article separates three things that often get blended elsewhere: what the evidence shows, what is convention rather than evidence, and what is practical handling advice. If a claim comes from a trial, the trial is named and the population it studied is described, because a result in people with type 2 diabetes does not automatically transfer to someone using the same compound for body composition.",
        "Numbers are shown with their working. When a post gives a concentration or a unit count, the formula that produced it is on the page so you can check it against your own vial instead of trusting a table that assumed a different fill volume.",
      ],
      bullets: [
        "Sources named inline, not bundled into an unlabeled list at the end",
        "Conventions flagged as conventions, not dressed up as findings",
        "Every dose figure shown with the arithmetic behind it",
        "Reviewed dates that move when the content actually changes",
      ],
    },
    {
      heading: "Where to go next",
      paragraphs: [
        "If you arrived from a search about a specific compound, the library entry for it will usually be more useful than the blog: it carries the interaction list, the typical routes and timing, and the citations, all in a fixed structure that is quicker to scan. The blog is better for the questions that span compounds — timing, stacking, handling and what to do when something goes wrong.",
        "Reading is the easy part. If a post changes what you are doing, log the change so the next few weeks produce evidence instead of impressions. That is what the tracker is for.",
      ],
    },
  ],

  "articles-index": [
    {
      heading: "What this index is",
      paragraphs: [
        "This page collects long-form research write-ups: pieces that examine one topic in depth rather than answering a single question. They tend to be the articles people cite — trial breakdowns, comparisons between compounds in the same class, and practical guides that walk through a full workflow from first dose to first review.",
        "It is deliberately a small library. An article earns a place here when there is enough substance to justify the length; otherwise the material goes into the blog or into a library entry where it is easier to find.",
      ],
    },
    {
      heading: "How articles are researched and reviewed",
      paragraphs: [
        "Each article is built from primary material where primary material exists — published trials, regulatory documents and manufacturer labeling — and says plainly where it is relying on convention, community practice or extrapolation instead. Where a figure is contested, the range is given rather than a single confident number.",
        "Articles are versioned. Substantive corrections are made in place with the reviewed date updated, and the correction is described rather than quietly absorbed. If you find something wrong, telling us is genuinely useful; the fastest fixes here have come from readers who checked the arithmetic.",
      ],
      bullets: [
        "Primary sources first, community convention labeled as such",
        "Ranges instead of false precision where the evidence disagrees",
        "Corrections made in place, with the reviewed date moved",
        "No sponsored placements and no vendor recommendations",
      ],
    },
    {
      heading: "Turning an article into a protocol",
      paragraphs: [
        "The gap between reading something and benefiting from it is usually the record. Most of the questions these articles answer — is this dose working, did that interaction matter, is the timing change helping — can only be settled by a few weeks of consistent logs, because the effects are too small to notice by memory.",
        "If an article changes your plan, put the change in the app with a start date and a note about why. When you revisit in a month, you will have a before and an after rather than an argument with yourself about when you switched.",
      ],
    },
    {
      heading: "How an article differs from a blog post or a library entry",
      paragraphs: [
        "The three formats on this site answer different questions and it is worth knowing which one you want. A library entry is a reference card for a single compound: what it is, the studied ranges, timing, half-life, interactions. A blog post answers one narrow question quickly — how to store a reconstituted vial, why a weekly dose seems to drift by a day. An article is the long form: it takes a subject that cannot be settled in four hundred words, lays out the evidence, shows where the evidence disagrees with common practice, and follows the reasoning to a practical conclusion you can act on.",
        "That is why this index is short and grows slowly. Publishing a thin article on a subject that deserves depth is worse than not publishing at all, because it occupies the slot a proper treatment would have taken and it teaches readers that the long pieces here are not worth the time.",
      ],
      bullets: [
        "Library entry — one compound, reference facts, read in two minutes",
        "Blog post — one narrow question, answered directly",
        "Article — a full subject with the evidence and the trade-offs laid out",
      ],
    },
    {
      heading: "What we will not publish",
      paragraphs: [
        "No sponsored articles, no affiliate links to sellers, and no vendor rankings. Health content funded by the people selling the product is the reason so much of this subject area is untrustworthy, and there is no version of that arrangement that survives contact with an honest dosing recommendation.",
        "We also avoid the two habits that make health writing feel authoritative while making it less useful: false precision, where a number is stated to two decimal places on the strength of one small study, and confident silence, where a real disagreement in the literature is simply not mentioned. If experts disagree, the article says so and explains what would settle it.",
      ],
    },
  ],

  "help-index": [
    {
      heading: "How the help center is organized",
      paragraphs: [
        "The guides here follow the order people actually meet the app in: getting an account and your first compound in, building a stack with schedules that fit real life, getting reminders to fire reliably on your device, then the later features — cycles, bloodwork, the meal scanner, exports and sharing. Each guide is written to be finished in a couple of minutes and to end with the thing done, not with a list of further reading.",
        "Search covers the full text of every guide, so it is usually faster to describe your problem in your own words than to hunt through categories. If nothing matches, that is a gap worth reporting; the most-searched phrases with no result are what we write next.",
      ],
    },
    {
      heading: "The problems people hit most",
      paragraphs: [
        "By a wide margin the most common issue is reminders that do not arrive, and it is nearly always an operating-system permission rather than the app: notifications denied at install, the app not added to the home screen on iPhone, or battery optimization on Android suspending background delivery. The reminders guide walks through each of those in order and tells you how to confirm the fix worked instead of waiting until you miss a dose.",
        "The second most common is a schedule that does not behave as expected — a weekly dose that seems to shift, or a cycle that ends earlier than intended. Those are almost always a timezone or a start-date question, and the scheduling guide shows exactly how the app resolves both.",
      ],
      bullets: [
        "Reminders not firing — check notification permission first, then battery settings",
        "Weekly doses drifting — usually a timezone or start-date setting",
        "Missing history after switching devices — sign in with the same account, then pull to refresh",
        "Interaction warnings you did not expect — open the pair to see the mechanism and the source",
      ],
    },
    {
      heading: "If a guide does not solve it",
      paragraphs: [
        "Some problems are account-specific and cannot be diagnosed from a guide. When you report one, the three details that make it solvable are the screen you were on, what you expected to happen, and roughly when it happened, so it can be matched against logs for that window.",
        "Anything that could cause a missed or duplicated dose is treated as urgent regardless of how few people it affects. That is the failure mode this app exists to prevent, so it jumps the queue.",
      ],
    },
    {
      heading: "A ten-minute setup that prevents most support questions",
      paragraphs: [
        "If you are starting from an empty account, doing these steps in order removes almost everything people later write in about. Create the account and set your timezone first, because every schedule and reminder is resolved against it and changing it later shifts existing entries. Add one compound and give it a real schedule rather than a placeholder — the dose, the unit, the days it runs and the time of day — so you can see how the scheduler behaves before you commit a full stack to it.",
        "Then turn on notifications and send yourself a test reminder before you rely on one. On iPhone the app has to be added to the home screen before notifications can be granted at all; on Android, battery optimization will silently delay delivery unless the app is excluded. Confirming a test reminder arrives takes thirty seconds and is the difference between a tracker you trust and one you check manually anyway.",
      ],
      bullets: [
        "Set your timezone before you build any schedules",
        "Add one compound with a real dose, unit and time — not a placeholder",
        "Grant notifications, then send a test reminder and wait for it to land",
        "Run the interaction checker once the whole stack is in, not item by item",
        "Export a backup once a month so your history is never tied to one device",
      ],
    },
    {
      heading: "Your data, and how to get it out",
      paragraphs: [
        "Your logs belong to you and are readable back out at any time. Exports cover doses, stacks, cycles, bloodwork entries and food logs in formats that open in a spreadsheet, which is also the format most clinicians prefer when you want to show six months of adherence at an appointment. Nothing about the export is gated behind keeping your account open.",
        "Account deletion removes your rows rather than flagging them hidden. If you are leaving, export first — once deletion runs there is no restore, by design. If you are switching phones instead, you do not need to export anything: sign in with the same account on the new device and pull to refresh, and the history follows.",
      ],
    },
  ],

  "calculators-index": [
    {
      heading: "What these calculators are for",
      paragraphs: [
        "Every calculator here exists because the arithmetic behind it is where people make expensive mistakes. Reconstitution turns a milligram figure on a vial into a mark on a syringe, and a decimal-place error in that conversion is a tenfold dosing error rather than a rounding problem. Unit conversion between milligrams, micrograms and insulin-syringe units is the same hazard in a different form.",
        "The tools are deliberately transparent. Each one shows the formula it used and the intermediate values, not just the answer, so you can check the result against the vial in your hand. A calculator that hides its working is impossible to sanity-check, and sanity-checking is the entire point.",
      ],
    },
    {
      heading: "How to use them without getting caught out",
      paragraphs: [
        "Read the vial, not the protocol you were sent. The two numbers that drive every calculation are the milligrams actually in the vial and the volume of bacteriostatic water you add, and copied protocols routinely assume a different pairing than the one on your bench. Change either number and every unit figure downstream changes with it.",
        "Match the syringe to the draw. A dose that lands at three units on a 100-unit insulin syringe is hard to measure accurately, and the fix is a more dilute mix rather than a steadier hand. The calculators show the draw size so you can spot that before it becomes a habit.",
      ],
      bullets: [
        "Concentration = milligrams in the vial ÷ milliliters of diluent added",
        "Insulin-syringe units are hundredths of a milliliter, not milligrams",
        "Re-run the numbers whenever the vial size or the diluent volume changes",
        "Aim for a draw large enough to read clearly on your syringe markings",
      ],
    },
    {
      heading: "Saving the result instead of rewriting it",
      paragraphs: [
        "A calculation is only useful once; the mix it describes lasts weeks. Saving a result to a vial in the app keeps the concentration attached to the physical vial, tracks how much is left as you log doses, and starts the clock on how long the reconstituted product has been in the fridge.",
        "That also removes the most common source of drift: recalculating from memory halfway through a vial and landing on a slightly different number than last time.",
      ],
    },
  ],

  "closed-testing": [
    {
      heading: "What closed testing involves",
      paragraphs: [
        "Closed testing is a private release track used to validate builds with real users before they reach the public store listing. Testers install the app through an invitation rather than a public link, use it as they normally would, and report anything that breaks. The point is coverage of real devices and real routines — the failures that matter are the ones that only appear on a specific phone, a specific timezone or a specific way of scheduling doses.",
        "Testers are not asked to follow a script. The most valuable reports have come from people simply using the app for their own protocol and noticing when something behaved differently than expected.",
      ],
    },
    {
      heading: "What we ask of testers, and what you get",
      paragraphs: [
        "The ask is modest: install the build, use it for your normal tracking, and report anything wrong with enough detail to reproduce it — device, what you did, what happened, and what you expected. Reminder delivery is the single most useful area to exercise, because it depends on operating-system behavior that cannot be fully simulated.",
        "In return, testers get the features before general release and direct influence over what gets fixed first. Several of the app's scheduling behaviors exist in their current form because a tester pointed out that the original design broke for their routine.",
      ],
      bullets: [
        "Install through the invitation, then use the app for your own protocol",
        "Report device, steps, expected result and actual result",
        "Reminder and notification issues are the highest-value reports",
        "Test data stays in your own account and is never published",
      ],
    },
    {
      heading: "Privacy during testing",
      paragraphs: [
        "Test builds use the same production privacy rules as the public app: your logs belong to your account, they are not shared with other testers, and nothing you enter is used as example content anywhere. Crash reports carry technical context about the failure, not the contents of your health records.",
        "You can leave the program at any time and keep your account and your history; leaving the test track only changes which build you receive.",
      ],
    },
  ],

  "reconstitution-calculator-page": [
    {
      heading: "What reconstitution actually is",
      paragraphs: [
        "A lyophilized peptide arrives as a dry powder with a stated mass in milligrams. Reconstitution is the step where you add a measured volume of bacteriostatic water to that vial, turning a mass into a concentration — milligrams per milliliter — that a syringe can measure. The powder itself contributes almost no volume, which is why the diluent volume you choose is effectively the volume of the finished vial.",
        "One formula covers every case: concentration equals the milligrams in the vial divided by the milliliters of water you add. Everything else — units on an insulin syringe, doses per vial, how long the vial lasts — falls out of that single number.",
      ],
    },
    {
      heading: "Choosing a dilution you can measure",
      paragraphs: [
        "There is no single correct volume. A more concentrated mix means smaller draws and fewer milliliters in the fridge; a more dilute mix means larger, easier-to-read draws at the cost of vial space. The practical rule is to pick the dilution that puts your usual dose somewhere you can read confidently on the syringe you own — for most people on a 100-unit insulin syringe, that means a draw in the ten-to-forty unit range rather than down at three or four units.",
        "Insulin syringe units are a volume measure, not a dose measure. One hundred units is one milliliter, so a unit is a hundredth of a milliliter regardless of what is dissolved in it. This is the conversion that produces most tenfold errors, because a protocol quoted in units only means anything alongside the concentration it assumed.",
      ],
      bullets: [
        "Concentration (mg/mL) = vial milligrams ÷ milliliters of bacteriostatic water",
        "Units to draw = (dose in mg ÷ concentration) × 100",
        "100 units on an insulin syringe = 1 mL, whatever the concentration",
        "Recalculate from scratch whenever the vial size or diluent volume changes",
      ],
    },
    {
      heading: "Handling the vial after mixing",
      paragraphs: [
        "Add the water slowly down the side wall of the vial rather than directly onto the powder, and let it dissolve on its own instead of shaking. Once mixed, the vial belongs in the fridge, and its useful life is measured in weeks rather than months — bacteriostatic water contains a preservative that allows repeated entry, but it does not make the contents indefinitely stable.",
        "Note the date you mixed it. The most common reason a vial gets discarded early is nobody remembering when it was reconstituted, and the most common reason one gets used too long is the same uncertainty in the other direction. Saving the mix against the vial in the app records the concentration and the date together and counts down the remaining doses as you log them.",
      ],
    },
  ],

  "best-dose-tracking-apps": [
    {
      heading: "How this comparison was put together",
      paragraphs: [
        "Every app in this roundup was assessed against the same question: can it describe a real protocol without forcing you to keep half of it somewhere else? That means reconstitution math for anything mixed from powder, an inventory that knows how many doses are left in an open vial, a record of which site was used last, a way to represent compounds that cycle on and off rather than run forever, and some form of interaction checking between the things you actually take together.",
        "Apps that were built for prescription adherence score well on reminders and badly on everything else, and that is not a criticism of them — a pill list is the correct data model for a pill list. The distinction that matters when you are choosing is whether your routine is a fixed list of tablets or a protocol that changes month to month.",
        "Where an app is genuinely better than DoseRoutine at something, that is stated plainly above. Medisafe's caregiver feature and refill tracking have no equivalent here. Cronometer's micronutrient database is deeper than anything a dose tracker needs. Peptide Tracker and OptiPin are smaller and quicker to set up if injectables are all you log.",
      ],
    },
    {
      heading: "The features people underestimate",
      paragraphs: [
        "Vial inventory sounds like a nice-to-have until the first time a vial runs out mid-week. An app that knows the concentration you mixed and counts down as you log doses tells you when to reorder several days before it becomes urgent, and it also catches the quiet error where a dose was logged twice.",
        "Injection-site rotation is the same story. Written down, a rotation pattern is easy; held in your head across two compounds on different frequencies, it drifts, and the sites that get overused are the ones that develop scarring first. A visual site history removes the guesswork in about two seconds per dose.",
        "Interaction checking is the feature most often skipped entirely. Prescription-focused apps check drug against drug and ignore supplements. In practice the routines that need checking most are the mixed ones — a supplement stack layered over a hormone protocol with a couple of prescriptions in the background — because that combination is exactly what no single system was designed to see.",
      ],
    },
    {
      heading: "Switching without losing your history",
      paragraphs: [
        "Nobody wants to re-enter a year of logs. The practical approach is to keep the old app read-only for history, start the new one from today, and export a summary from the old app if it offers one. Doses going forward will be complete, and the historical record stays available where it already lives.",
        "Rebuilding the protocol itself is faster than people expect when the app has a reference library: pick the compound, confirm the dose and schedule, and the units, typical ranges and interaction data come attached rather than being typed in by hand.",
      ],
    },
  ],

  "vs-peptide-tracker": [
    {
      heading: "Two tools with different boundaries",
      paragraphs: [
        "Peptide Tracker draws its boundary around the injection. Inside that boundary it is competent: reconstitution math, vial inventory, and a site rotation history, which is exactly the toolkit a peptide protocol needs. If nothing else in your routine competes for attention, the narrow scope is a feature rather than a limitation.",
        "DoseRoutine draws the boundary around the routine instead. The same injectable tooling is there, but it sits alongside oral supplements, prescriptions, hormone protocols, blood work and food logging, which changes what the app can tell you. A peptide log can confirm you took the dose; a routine log can show that the week you added a second compound is also the week your sleep score moved.",
      ],
    },
    {
      heading: "What the wider scope actually buys you",
      paragraphs: [
        "The clearest example is interaction checking. A peptide-only tracker has no reason to know what else you take, so it cannot flag the supplement that competes for absorption with a prescription you take at the same time. DoseRoutine checks across categories and shows the mechanism and the source behind each flag, so you can judge whether it matters to you rather than dismissing an unexplained warning.",
        "The second is the reference layer. Every compound you log is backed by a library entry covering typical dosing, timing, mechanism, monitoring and known interactions, so the decision about how to run something and the record of having run it live in the same place.",
        "The third is longevity. Protocols rarely stay still — a peptide finishes, a hormone dose changes, a supplement gets dropped after labs come back. An app that models cycles, titration and end dates keeps an accurate history through those changes instead of accumulating stale entries.",
      ],
    },
    {
      heading: "Who should stay with Peptide Tracker",
      paragraphs: [
        "If peptides are the entire routine, you are happy on mobile, and you do not want lab tracking or nutrition anywhere near your dose log, a focused app will feel lighter every single day. The honest test is what is currently in your notes app or spreadsheet alongside the peptide log. If the answer is nothing, stay. If it is a supplement list, a lab PDF and a reminder about which site you used on Tuesday, that is the gap this comparison is about.",
      ],
    },
  ],

  "vs-optipin": [
    {
      heading: "A simple injection log versus a full routine",
      paragraphs: [
        "OptiPin is a focused iOS injection tracker, and simplicity is genuinely the product. Open it, log the shot, pick the site, done. For a single ongoing protocol on an iPhone that is often all anyone needs, and adding features to that workflow would make it worse rather than better.",
        "DoseRoutine covers the same injection basics — reconstitution math, vial inventory, site rotation — and then handles everything a protocol tends to collect around it: the oral supplements taken with it, the prescriptions in the background, the labs used to decide whether it is working, and the interactions between all of them.",
      ],
    },
    {
      heading: "Platform reach matters more than it sounds",
      paragraphs: [
        "An iOS-only app is a hard stop for Android users and an awkward one for anyone who plans on a laptop. Planning a protocol — comparing esters, working out a titration schedule, reading through monitoring guidance — is a keyboard-and-big-screen task, while logging a dose is a phone task. Having both surfaces on the same account means neither activity is squeezed into the wrong device.",
        "It also matters for continuity. Phones get replaced, and an account that syncs to the web keeps the history intact regardless of which handset it is being read from.",
      ],
    },
    {
      heading: "Bringing hormones and labs into the same view",
      paragraphs: [
        "TRT and HRT protocols have a rhythm that a plain injection log cannot represent: an ester with a specific half-life, an injection frequency chosen to match it, cycle start and end dates, and a set of lab markers re-checked on a schedule. Seeing the dose history and the lab results on the same timeline is what turns a log into something you can act on, and it is the single thing most often missing from minimal injection apps.",
        "If your protocol is settled and you only want proof that today's shot happened, that depth is unnecessary. If you are still adjusting, it is the whole point.",
      ],
    },
  ],

  "vs-medisafe": [
    {
      heading: "Two apps built for different problems",
      paragraphs: [
        "Medisafe was designed around prescription adherence: a fixed list of pills, a fixed schedule, and reminders that nudge you until each one is marked taken. It does that job well, and for someone taking three prescriptions at set times every day it is more app than they strictly need.",
        "DoseRoutine starts from a different assumption — that the thing being tracked is a changing protocol rather than a fixed prescription list. Doses get titrated, compounds get cycled on and off, injections rotate between sites, and half the stack is not a prescription at all. Those requirements shape the whole data model, which is why the two apps diverge quickly once your routine stops being a pill list.",
      ],
    },
    {
      heading: "Where the practical differences show up",
      paragraphs: [
        "The clearest gap is anything injectable. Reconstitution math, concentration tracking per vial, remaining doses, fridge life and injection-site rotation are core here and largely absent from a pill-first tracker. If your week includes drawing from a vial, that is the difference that will decide it.",
        "The second gap is interaction coverage across categories. Checking a prescription against another prescription is common; checking a supplement against a hormone, or a mineral against a thyroid medication, is where most trackers stop. That cross-category checking, with the mechanism and the source shown rather than a bare warning icon, is the part people tell us they switched for.",
      ],
      bullets: [
        "Vial and reconstitution tracking, not just tablet counts",
        "Injection-site rotation with a visual history",
        "Interaction checking across supplements, hormones, peptides and prescriptions",
        "Cycles with start and end dates rather than an indefinite daily schedule",
      ],
    },
    {
      heading: "Which one to pick",
      paragraphs: [
        "If your routine is prescriptions in tablet form and what you need is a reliable nudge, either app will serve you and the decision comes down to interface preference. There is no advantage to switching for its own sake.",
        "If your routine involves peptides, TRT, GLP-1s, cycled compounds or a supplement stack you are actively tuning, the pill-list model starts costing you: you end up keeping the real detail in a notes app beside the tracker. That is the point at which moving is worth the setup time.",
      ],
    },
  ],

  "vs-mytherapy": [
    {
      heading: "What MyTherapy does well",
      paragraphs: [
        "MyTherapy combines medication reminders with symptom and measurement logging, and it is genuinely good at the health-journal side: mood, symptoms, weight and blood pressure sit alongside the medication schedule, and the reports it produces are easy to hand to a clinician. For someone managing a chronic condition with a stable prescription list, that combination is well judged.",
        "Its model assumes the regimen is set by someone else and your job is to follow it. That assumption is correct far more often than not, and it keeps the app simple.",
      ],
    },
    {
      heading: "Where DoseRoutine diverges",
      paragraphs: [
        "DoseRoutine assumes the regimen is being adjusted — by you, with a clinician, or both — and builds around the evidence you need to make those adjustments. Doses are versioned rather than overwritten, so a titration leaves a history you can read against your labs and your notes instead of erasing what you were doing last month.",
        "It also covers the compounds a general health app does not model: reconstituted peptides with per-vial concentrations, injection sites with rotation history, and cycled compounds with defined on and off periods. Interaction checking spans supplements, minerals, hormones and prescriptions together, because that is where the overlaps people actually hit tend to live.",
      ],
      bullets: [
        "Dose changes kept as history, not overwritten",
        "Bloodwork trends charted against protocol changes on the same timeline",
        "Peptide, TRT and GLP-1 handling built in rather than approximated",
        "Cross-category interaction checks with the mechanism and source shown",
      ],
    },
    {
      heading: "Running both, or moving across",
      paragraphs: [
        "There is nothing wrong with keeping a symptom journal in one place and a protocol tracker in another, and some people do exactly that for a while. The cost is that the two records drift, and the questions you most want answered — did this change help — need both halves on one timeline.",
        "If you decide to move, start with the current protocol rather than back-filling history. A month of consistent logs is more useful than a year of reconstructed ones.",
      ],
    },
  ],

  "vs-pill-reminder": [
    {
      heading: "Simple reminder apps and their limits",
      paragraphs: [
        "Generic pill-reminder apps solve one problem well: firing an alarm at a set time and letting you mark it done. They are quick to set up, they do not ask for much, and if the only failure you are trying to prevent is forgetting, they are sufficient.",
        "Their limitation is that a reminder is not a record. Marking something taken produces a tick, not data — no dose amount worth analyzing, no concentration, no site, no note about why the dose changed. The moment you want to answer a question about the last three months, a tick history has very little to say.",
      ],
    },
    {
      heading: "What changes when the record is structured",
      paragraphs: [
        "DoseRoutine logs the dose itself, not just the event: amount and unit, route, injection site where relevant, the vial it came from, and any note you attach. Because each entry carries that structure, the app can do arithmetic on your history — remaining doses in a vial, days since a site was last used, average weekly intake through a titration, adherence over a defined cycle.",
        "It also warns before the log rather than after. Interaction checking runs across your whole active stack, so a new addition that competes with something you already take gets flagged when you add it, with the mechanism explained and the source linked, instead of surfacing as an unexplained symptom weeks later.",
      ],
      bullets: [
        "Dose amount, route and site recorded, not just a taken tick",
        "Vial-level tracking with remaining doses and fridge dates",
        "Interaction warnings at the point you add something new",
        "Exportable history you can hand to a clinician",
      ],
    },
    {
      heading: "Is the extra structure worth it",
      paragraphs: [
        "For two daily tablets, honestly, no. A basic reminder is the right tool, and adding structure you will not use just makes logging slower.",
        "It becomes worth it when the protocol has moving parts — anything injected, anything titrated, anything cycled, or a stack large enough that you have lost track of what interacts with what. At that point the tick history stops answering questions and a structured log starts to.",
      ],
    },
  ],

  "vs-round-health": [
    {
      heading: "Round Health's approach",
      paragraphs: [
        "Round Health is built around a clean, calm interface and flexible reminder timing — windows rather than exact minutes, so a dose can be taken across a stretch of the morning without the app treating it as late. That design choice suits people whose days are unpredictable and who found rigid alarms more stressful than useful, and it is the main reason people like it.",
        "The underlying model is still a medication list with a schedule attached. That is the right level of detail for most prescription routines.",
      ],
    },
    {
      heading: "Where the models part company",
      paragraphs: [
        "DoseRoutine keeps flexible timing but adds the layers a mixed protocol needs: what is in the vial and at what concentration, where the last injection went, which cycle week you are in, and what the current stack interacts with. Those are not preferences layered on a medication list; they change what an entry is, which is why they are hard to bolt on afterwards.",
        "The other difference is analysis. Bloodwork, body metrics, nutrition and doses share one timeline here, so a change in a lab value can be read against what you were actually taking that month rather than against memory.",
      ],
      bullets: [
        "Per-vial concentration and remaining-dose tracking",
        "Injection-site rotation with visual history",
        "Cycle weeks with defined on and off periods",
        "Labs, doses and nutrition on a single timeline",
      ],
    },
    {
      heading: "Choosing between them",
      paragraphs: [
        "If flexible reminder windows for a prescription list are the thing you need, Round Health is a good app and this comparison should not talk you out of it.",
        "If you find yourself keeping vial notes, site rotation or titration history somewhere outside the tracker, that external note is the signal. Consolidating it into the same record as your doses is the practical reason to move.",
      ],
    },
  ],

  "vs-cronometer": [
    {
      heading: "Different halves of the same routine",
      paragraphs: [
        "Cronometer is a nutrition tracker, and a rigorous one — its food database is unusually well curated and its micronutrient coverage goes well beyond the calorie-and-macro level most apps stop at. If detailed nutrition analysis is the goal, it is hard to beat.",
        "DoseRoutine is a protocol tracker that includes nutrition, not a nutrition app that added supplements. The center of gravity is doses, compounds, interactions and labs, with food logged because it interacts with the rest — not as the primary object.",
      ],
    },
    {
      heading: "Why nutrition and protocol data belong together",
      paragraphs: [
        "Several of the most common protocol mistakes are nutritional. Minerals compete for absorption with each other and with medications; some compounds need food and some need an empty stomach; protein intake determines how much of a GLP-1 weight change comes from lean mass. None of those are visible when nutrition lives in one app and doses live in another.",
        "Keeping both on one timeline lets the app flag the collisions as they happen — a mineral logged inside the window where it blunts a medication, or a protein intake that has drifted below target during a titration — instead of leaving you to notice the pattern yourself.",
      ],
      bullets: [
        "Photo-based meal scanning with macro estimates you can correct",
        "Timing warnings when a food or mineral collides with a dose",
        "Protein targets tracked against active GLP-1 or training goals",
        "Nutrition, doses and labs charted on one timeline",
      ],
    },
    {
      heading: "Using both",
      paragraphs: [
        "Plenty of people run Cronometer for deep nutrition analysis and DoseRoutine for the protocol, and that combination works fine — the apps are not really competing for the same job.",
        "If you would rather not maintain two logs, the question is which side of your routine carries more risk. If it is the compounds, consolidate here and accept slightly less micronutrient depth. If it is the diet, do the reverse.",
      ],
    },
  ],

  "library-index": [
    {
      heading: "What is in the compound library",
      paragraphs: [
        "The library is the reference layer behind the tracker: one entry per compound, covering supplements, peptides, hormones including testosterone and its support drugs, GLP-1 medications and the common prescriptions that people run alongside them. Each entry sets out what the compound is, the mechanism in plain language, the amount ranges that have actually been studied, how timing and food change absorption, the half-life where it is known, and the contraindications that matter enough to be worth a warning.",
        "Entries are written to be read in under two minutes and to be honest about their limits. Where the human evidence is thin — as it is for a large share of research peptides — the entry says so rather than dressing up animal data or forum convention as clinical guidance. Where numbers are disputed, you get the range and the reason for the disagreement.",
      ],
    },
    {
      heading: "How to search it",
      paragraphs: [
        "Search matches names, synonyms and brand names, so semaglutide, Ozempic and Wegovy all land in the right place, and misspellings usually still resolve. If you would rather browse, the goal filters group entries by what people are trying to achieve — sleep, recovery, fat loss, testosterone support, cognition, joint health — and the category filters split by class when you already know whether you want a peptide or a mineral.",
        "Every entry links straight into the app: add it to a stack with a schedule attached, run it through the interaction checker against everything else you take, or open the reconstitution calculator when it is something you mix yourself. The point of the library is not reading; it is getting a correct protocol set up quickly.",
      ],
      bullets: [
        "Search by generic name, brand name or common abbreviation",
        "Filter by goal when you know the outcome but not the compound",
        "Every entry links to interactions, dosing tools and stack setup",
        "Sources cited inline, with the review date on the page",
      ],
    },
    {
      heading: "How entries are kept accurate",
      paragraphs: [
        "Each entry is built from labeling, published trials and pharmacology references where those exist, and marks community practice as community practice when that is all there is. Interaction claims carry the mechanism and the source, because a warning you cannot verify is a warning most people learn to dismiss.",
        "The library is reviewed on a rolling basis and corrected in place, with the reviewed date moved when the substance of an entry changes. None of it is medical advice, and none of it is a substitute for the clinician who knows your labs — it exists so that the conversation you have with that clinician starts from accurate numbers.",
      ],
    },
    {
      heading: "How to read an entry without over-reading it",
      paragraphs: [
        "Every entry follows the same shape so you can compare two compounds without re-learning a layout. The opening line says what the compound is and what class it belongs to. The mechanism paragraph explains, in ordinary language, what it is thought to do in the body and how confident anyone should be about that. The dosing block gives studied ranges rather than a single recommended number, because the studied range is a fact and a recommendation would not be. Timing notes cover food, other compounds and time of day, and the safety block lists the interactions and conditions that would make a clinician pause.",
        "A studied range is not a suggestion to start at the top of it. In practice most people who run into trouble did two things at once: started high and started several new compounds in the same week. Adding one item at a time, holding it for long enough to see a pattern, and writing down what you noticed is slower and works better — and it is the only way to attribute an effect to a cause when you are running six things at once.",
      ],
      bullets: [
        "Same structure on every entry, so two compounds can be compared side by side",
        "Studied ranges and half-lives, not invented 'recommended' numbers",
        "Timing and food notes that change absorption in practice",
        "Contraindications and monitoring notes worth raising with a clinician",
      ],
    },
    {
      heading: "Where the library stops",
      paragraphs: [
        "This library describes compounds; it does not tell you which ones to take. It has no view on your labs, your prescriptions, your kidney or liver function, your pregnancy status or your history, and those are exactly the facts that decide whether something is reasonable for you. Anything that requires a prescription requires a prescriber, and the entries here are written to make that conversation shorter and better informed rather than to replace it.",
        "We also do not sell compounds, take vendor placements, or link to sellers. That is a deliberate limitation: the moment a reference library has something to sell, its dosing advice stops being trustworthy. If an entry says the evidence is weak, no commercial pressure is pulling in the other direction.",
      ],
    },
  ],

  "best-peptide-tracking-app": [
    {
      heading: "What peptide tracking actually demands",
      paragraphs: [
        "Peptide protocols break generic medication apps for a specific reason: the unit you inject is not the unit you buy. A vial is sold in milligrams, reconstituted with a volume of bacteriostatic water you choose, and drawn in insulin-syringe units. A tracker that only understands 'one pill, once daily' cannot represent any part of that, so people end up keeping the real numbers in a notes app and using the tracker as a checkbox.",
        "The second demand is schedule shape. Peptide protocols run in cycles with deliberate breaks, alternate-day and five-on-two patterns, titration ramps, and injection sites that need rotating so tissue gets a rest. Anything that only offers daily or weekly repeats will quietly misrepresent what you are doing within a fortnight.",
      ],
      bullets: [
        "Milligram-to-unit conversion tied to the concentration you actually mixed",
        "Vial inventory that counts down and warns before you run out mid-cycle",
        "Cycle scheduling with on and off blocks, not just daily repeats",
        "Injection-site rotation with a visual map and a history per site",
      ],
    },
    {
      heading: "Why the calculator and the log belong in one place",
      paragraphs: [
        "Reconstitution arithmetic is where most dosing errors start, and it is unforgiving: the same 250 mcg dose is 6.25 units at one concentration and 25 units at another. Doing that math in a separate calculator means the number you log is a transcription, and transcriptions drift. When the calculator writes straight into the dose record, the log carries the concentration, the volume and the unit count together, so a dose from three months ago can still be reconstructed exactly.",
        "That matters most when something goes wrong. If a side effect shows up, the useful question is what changed — a new vial, a different mixing volume, a site you had overused — and only a log that captured those details can answer it.",
      ],
    },
    {
      heading: "What to check before you commit to any tracker",
      paragraphs: [
        "Try setting up your hardest protocol first, not your easiest. If the app can hold a reconstituted peptide on an alternate-day cycle with a site rotation and a vial that expires, the simple cases will look after themselves. Then check that you can get the data back out: a tracker you cannot export from is a tracker you cannot leave, and a year of adherence history is worth more than any single feature.",
        "Finally, look at how the app treats health data. Peptide use is sensitive information for a lot of people, and the answer to 'who can read my rows and what happens when I delete my account' should be short, specific and easy to find rather than buried in a policy page.",
      ],
    },
  ],

  "best-supplement-tracker-app": [
    {
      heading: "The problem with most supplement trackers",
      paragraphs: [
        "Most supplement apps are checklists with a store attached. They will tell you that you took your magnesium, and they will happily suggest three more products, but they have no view on whether the magnesium you took at breakfast just blunted the absorption of something else you took at the same time. For a stack of two or three items that is fine. Past about six, the timing conflicts start to matter more than the individual choices.",
        "The other common gap is that a supplement stack rarely stays a supplement stack. People add a prescription, then a peptide or a GLP-1, and suddenly the app that only understands capsules cannot represent half of the routine — so the routine moves to paper and the adherence record ends.",
      ],
    },
    {
      heading: "What to look for instead",
      paragraphs: [
        "A tracker earns its place when it can hold the whole routine in one schedule and reason about it. That means real units rather than pill counts, timing rules attached to each item — with food, empty stomach, away from calcium, not within four hours of levothyroxine — and an interaction checker that explains the mechanism and cites where the claim comes from instead of flashing a colored badge.",
        "Reminders are the other half. A reminder that fires while you are driving and cannot be acted on is worse than useless, so snooze and reschedule behavior, and what happens to a dose you skipped, tell you more about an app's quality than its feature list does.",
      ],
      bullets: [
        "Units in mg, mcg, IU and mL — not just 'one capsule'",
        "Timing and food rules attached to each item, with conflict warnings",
        "Sourced interaction checking across supplements and prescriptions",
        "Adherence history you can export and show a clinician",
        "Cost per day, so the stack has a number attached to it",
      ],
    },
    {
      heading: "Getting value out of the first month",
      paragraphs: [
        "Enter the stack you actually take, including the things you take irregularly, then let the interaction pass run once. Most people find at least one timing collision they had not considered — commonly a mineral sitting on top of a thyroid medication, or zinc and copper competing at the same hour — and fixing those costs nothing.",
        "After that, the value is in the record rather than the reminders. Four to six weeks of consistent logs make it possible to answer whether an addition did anything, because the effects worth chasing are usually too small to detect from memory. Pair the log with a lab panel and you have the only evidence that actually settles the question.",
      ],
    },
  ],

  "best-trt-tracking-app": [
    {
      heading: "What TRT tracking has to get right",
      paragraphs: [
        "Testosterone replacement is a long-run protocol judged on trends, not on individual days, and that changes what a tracker needs to do. Injections land weekly, twice weekly or every other day depending on the ester and the protocol; ancillaries such as an aromatase inhibitor or hCG run on their own separate rhythm; and the whole thing is reviewed against bloodwork every few months. An app that cannot hold those three layers together forces you back to a spreadsheet.",
        "Dose units are the second requirement. TRT is dosed in milligrams but drawn in milliliters at a concentration printed on the vial, so 100 mg is 0.5 mL at 200 mg/mL and 1 mL at 100 mg/mL. A tracker that stores 'one injection' loses the number that matters the moment your pharmacy switches concentration.",
      ],
      bullets: [
        "Weekly, twice-weekly and every-other-day injection schedules",
        "mg-to-mL conversion tied to the vial concentration you are using",
        "Ancillaries on independent schedules alongside the base protocol",
        "Injection-site rotation history across delts, quads and glutes",
        "Lab results charted against the dose timeline, not in isolation",
      ],
    },
    {
      heading: "Labs are the point of the record",
      paragraphs: [
        "Total and free testosterone, estradiol, hematocrit, SHBG and PSA are the numbers that drive protocol changes, and they only mean something in context: which dose you were on, how long you had been on it, and how close to your injection the draw happened. A trough draw two days before your next shot is a different number from one taken the morning after, and comparing the two without that context produces bad decisions.",
        "Charting labs on the same timeline as doses makes the relationship visible. When hematocrit climbs, you can see whether it tracked a dose increase or a frequency change. When estradiol moves, you can see whether an ancillary change preceded it. That is the conversation your prescriber wants to have, and turning up with it already assembled shortens the appointment considerably.",
      ],
    },
    {
      heading: "Symptoms, adherence and honesty",
      paragraphs: [
        "Energy, libido, sleep quality and mood are the outcomes people are actually optimizing, and they are far more useful logged as a quick daily rating than reconstructed from memory at a review. Ratings that sit next to the dose and lab data turn a vague sense that things are better or worse into something you can point at.",
        "None of this is medical advice, and a tracker cannot tell you what your protocol should be. What it can do is make sure that when you and your clinician change something, the change is made against an accurate record rather than a recollection — which is where most avoidable mistakes on long-run hormone therapy come from.",
      ],
    },
  ],

  "vs-bearable": [
    {
      heading: "Two different questions",
      paragraphs: [
        "Bearable answers the question 'how am I feeling, and what seems to move it?' It does that with a large set of customisable factors — symptoms, mood, sleep, energy, foods, medications — and correlation views that surface patterns over weeks. For chronic illness, where the treatment is fixed and the symptoms are the variable, that is exactly the right shape.",
        "DoseRoutine answers a different question: 'is my protocol being run correctly, and is it working?' The variable is the protocol itself — doses that titrate, vials that get reconstituted, injection sites that need rotating, cycles that start and stop, labs that move in response.",
      ],
    },
    {
      heading: "Where the overlap sits",
      paragraphs: [
        "Both apps keep a daily check-in and both plot it against what you took. The difference is how much the app understands about the thing you took. In Bearable a peptide is a label; in DoseRoutine it is a compound with a concentration, a half-life, a typical dose range, known interactions and a site history.",
        "That matters because most protocol mistakes are mechanical rather than perceptual — the wrong syringe units, the same injection site three times running, a mineral taken inside the window where it blunts a medication. A symptom tracker cannot see any of those.",
      ],
      bullets: [
        "Reconstitution and syringe-unit math handled in the app",
        "Injection-site rotation with a visual history",
        "Interaction checks across supplements, peptides, hormones and prescriptions",
        "Check-ins, doses, bloodwork and body metrics on one timeline",
      ],
    },
    {
      heading: "Running both, then choosing",
      paragraphs: [
        "There is no need to decide on day one. Rebuild your live protocol in DoseRoutine, keep logging symptoms wherever you already do, and give it a fortnight. The app you keep opening is the answer.",
      ],
    },
  ],

  "vs-dosecast": [
    {
      heading: "A reminder engine is table stakes",
      paragraphs: [
        "Dosecast earned its reputation on reminder correctness: doses that can be postponed without losing the schedule, as-needed medications that do not pollute adherence stats, refill warnings that arrive before you run out. Those are unglamorous details and plenty of newer apps get them wrong.",
        "DoseRoutine treats the same details as the baseline rather than the product. Multi-time daily doses, every-N-days schedules, cyclical on and off weeks and calendar export all exist so that the reminder side is never the reason you miss something.",
      ],
    },
    {
      heading: "What sits above the reminder",
      paragraphs: [
        "The gap opens once a dose is not a tablet. A vial has a concentration that depends on how much bacteriostatic water went in; an injection has a site that should not be reused; a peptide protocol has weeks that count. None of that fits a medication list, and adding it later is a data-model change rather than a feature.",
        "The second gap is analysis. Because doses, labs, body metrics and nutrition share one timeline in DoseRoutine, a lab result can be read against the protocol that was actually running that month.",
      ],
      bullets: [
        "Vial inventory with run-out prediction",
        "Reconstitution calculator and U-100 / U-40 conversion",
        "Cycle weeks with defined start and end dates",
        "Bloodwork trends plotted against dose history",
      ],
    },
    {
      heading: "Who should stay put",
      paragraphs: [
        "If your routine is a stable list of prescriptions and Dosecast is already firing reliably, switching buys you very little. The case for moving starts the moment you find yourself keeping vial notes, site rotation or titration history somewhere outside the app.",
      ],
    },
  ],

  "vs-myfitnesspal": [
    {
      heading: "Nutrition-first versus protocol-first",
      paragraphs: [
        "MyFitnessPal is built around food, and its food database is the reason it stays installed — breadth that no purpose-built health app has matched. Supplements exist in it, but as entries in a list rather than as things with doses, schedules or interactions.",
        "DoseRoutine starts from the protocol and includes nutrition because the two collide constantly. Meals are logged by photo or barcode with calories and macros you can correct inline, and they land on the same timeline as doses, labs and body metrics.",
      ],
    },
    {
      heading: "Why the collision matters",
      paragraphs: [
        "Minerals compete for absorption with each other and with medications. Some compounds need food and some need an empty stomach. On a GLP-1, protein intake is what determines how much of a weight change comes from fat rather than lean mass, and appetite suppression makes hitting protein harder exactly when it matters most.",
        "Split across two apps, none of those collisions are visible. Kept together, the app can flag them as they happen rather than leaving you to spot the pattern months later.",
      ],
      bullets: [
        "Photo and barcode meal logging with editable macro estimates",
        "Protein targets tracked against dose escalation weeks",
        "Nutrient-timing warnings against medication windows",
        "Weight, body metrics and labs on the same timeline as food",
      ],
    },
    {
      heading: "Choosing between them",
      paragraphs: [
        "If calories and macros are the whole job, MyFitnessPal's database depth is the deciding factor and it is a fair reason to stay. If your day also involves doses, injections or lab results, keeping food in the same record as the protocol is what makes either half interpretable.",
      ],
    },
  ],

  "vs-spreadsheet": [
    {
      heading: "The most popular tracker nobody markets",
      paragraphs: [
        "Ask experienced peptide, TRT or longevity users what they track with and a large share will say Google Sheets or the Notes app. That is not a failure of taste — a spreadsheet models any protocol shape you can describe, costs nothing, and never forces its opinions on you.",
        "The honest case for it is planning. Cost per milligram, cycle modelling, titration schedules laid out in a grid: a spreadsheet is genuinely better at all of that than any app.",
      ],
    },
    {
      heading: "Where it quietly costs you",
      paragraphs: [
        "The failures are all in the daily loop. A sheet does not remind you, so adherence depends entirely on memory. It does not know that 5 mg in a vial reconstituted with 2 mL means 25 units on a U-100 syringe, so the arithmetic is re-derived by hand at the worst possible moment. It does not remember which site the last injection went into. And it will never tell you that two things in the same column interact.",
        "It also degrades. Most protocol spreadsheets are meticulous for three weeks and then stop being filled in, which leaves you with a record that is worse than useless because it looks complete.",
      ],
      bullets: [
        "Reminders and calendar alarms for every scheduled dose",
        "Reconstitution and syringe-unit math computed, not retyped",
        "Injection-site rotation tracked visually",
        "Interaction checks across the whole stack with sources shown",
        "Vial inventory that predicts when you run out",
      ],
    },
    {
      heading: "Keeping the parts that worked",
      paragraphs: [
        "Moving does not mean giving up control. Custom compounds cover anything outside the library, every field stays editable, and your data exports whenever you want it. Plenty of people keep a planning sheet for modelling and let the app own the live routine — which is the split each tool is actually good at.",
      ],
    },
  ],
};
