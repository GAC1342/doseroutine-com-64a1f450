import type { AeoFaqPair } from "@/lib/aeo";

export const MANUAL_FAQ: AeoFaqPair[] = [
  {
    q: "What does the DoseRoutine instruction manual cover?",
    a: "The manual walks through every part of the app: initial setup, logging daily doses, setting reminders, tracking fitness and food, using safety tools like the interaction checker, generating reports, and troubleshooting common problems. It's organized into numbered chapters, each with searchable step-by-step sections.",
  },
  {
    q: "Can I search the manual instead of reading it top to bottom?",
    a: "Yes. A search box at the top of the manual filters sections by keyword — for example 'reminder', 'meal', or 'delete' — so you can jump straight to the relevant steps without scrolling through unrelated chapters.",
  },
  {
    q: "Can I save manual sections to read later?",
    a: "If you're signed in, you can bookmark any section with the bookmark icon. Saved sections sync across your devices when you're online, or stay on the current device if you're offline, and you can filter the manual to show only your saved sections.",
  },
  {
    q: "Does the manual replace the Help Center?",
    a: "No. The manual is the complete, detailed reference for every feature, while the Help Center gives a shorter, one-page explanation per feature. Use the Help Center for a quick answer and the manual when you need the full step-by-step instructions.",
  },
  {
    q: "What if the manual doesn't answer my question?",
    a: "Email support@doseroutine.com and describe what you're trying to do. If you're signed in, you can also leave feedback directly on a manual chapter, which goes to the team that maintains the manual.",
  },
];

export const SOURCES_FAQ: AeoFaqPair[] = [
  {
    q: "Where does DoseRoutine's compound and interaction data come from?",
    a: "DoseRoutine builds its library from published literature and public reference databases: PubMed for peer-reviewed studies, DailyMed for FDA-submitted prescribing information, PubChem for chemical data, NIH Office of Dietary Supplements fact sheets, MedlinePlus monographs, and Cochrane systematic reviews. Forums, vendor pages, and unattributed blog posts are never cited.",
  },
  {
    q: "How many compounds and interaction rules does DoseRoutine track?",
    a: "The data set currently contains 476 compounds — supplements, vitamins, minerals, peptides, hormones including TRT, GLP-1 medications, and common daily prescriptions — plus 308 interaction rules, including both named compound pairs and broader category-level rules.",
  },
  {
    q: "How is an interaction rule created?",
    a: "Each rule starts with a plausible mechanism, such as a shared metabolic pathway, an additive physiological effect, or absorption competition. The mechanism is checked against literature and label warnings, assigned a severity (avoid, caution, note, or synergy) based on evidence strength, written in plain English, and given attached references shown on the page.",
  },
  {
    q: "How often is the data reviewed?",
    a: "Compound and interaction entries are reviewed on a rolling cycle and immediately when a reader reports a problem or a source changes. Pages that have completed a dated review show a visible 'Last reviewed' date and the same date in their structured data; pages without that line have not yet been through a dated review pass.",
  },
  {
    q: "Is DoseRoutine's data a substitute for medical advice?",
    a: "No. DoseRoutine is educational reference content and a routine tracker, not medical advice, a diagnosis, or a substitute for a pharmacist or physician. The absence of a listed interaction rule is not proof that a combination is safe.",
  },
];

export const EDITORIAL_POLICY_FAQ: AeoFaqPair[] = [
  {
    q: "Who writes and maintains DoseRoutine's content?",
    a: "Content is produced and maintained by the DoseRoutine editorial team — the same small team that builds the interaction checker and compound library. Pages are published under the DoseRoutine organization rather than individual bylines because each page is assembled from a shared, versioned data set rather than written once by one person.",
  },
  {
    q: "Does DoseRoutine use AI to write its content?",
    a: "Some long-form library copy is drafted with AI assistance and then edited and checked by the team against peer-reviewed literature and label data. Dose ranges, interaction severities, and contraindications are never left to AI output alone. Full disclosure is on the AI policy page.",
  },
  {
    q: "How often is DoseRoutine content reviewed?",
    a: "Compound and interaction pages are reviewed on a rolling cycle, and immediately when a reader reports a problem or a source changes. Every page carries a machine-readable dateModified field in its structured data so search engines and AI assistants can see how current it is.",
  },
  {
    q: "How do I report an error on DoseRoutine?",
    a: "Email support@doseroutine.com with the page URL and, if you have it, the source that contradicts the claim. Substantive corrections are made and the page's reviewed date is updated — errors are corrected openly, not quietly deleted.",
  },
  {
    q: "Is DoseRoutine independent of supplement sellers?",
    a: "Yes. DoseRoutine does not sell supplements, does not take payment for inclusion in the library, and does not accept payment to change a severity rating or recommendation. The product is funded by subscriptions, not by sponsors.",
  },
];

export const AI_POLICY_FAQ: AeoFaqPair[] = [
  {
    q: "Where does DoseRoutine use AI?",
    a: "DoseRoutine uses AI in three places: drafting library content (compound overviews, timing notes, common stacks, and interaction summaries, which are periodically reviewed by the team), the plan generator that proposes a schedule from the compounds and doses you enter, and the in-app AI chat assistant that answers general questions about supplements, peptides, hormones, and timing.",
  },
  {
    q: "Which AI models does DoseRoutine use?",
    a: "DoseRoutine uses large language models from Google's Gemini family, accessed through a managed AI gateway. The specific model may change as newer versions ship, and DoseRoutine does not train its own models on user data.",
  },
  {
    q: "Is AI output in DoseRoutine medical advice?",
    a: "No. AI output — library articles, plan suggestions, chat responses, and interaction warnings — is educational information only. It is not a diagnosis, prescription, or treatment plan, and no licensed clinician reviews each individual AI response before you see it, so always confirm with a clinician or pharmacist before acting on it.",
  },
  {
    q: "What data does DoseRoutine send to AI providers?",
    a: "The plan generator sends the compounds, doses, and goals in your stack, but not your name, email, medical history, or account identifiers. AI chat sends the text of your conversation messages. Library content is drafted in batch, so no user data is sent when a visitor simply reads a library page.",
  },
  {
    q: "Can I use DoseRoutine without its AI features?",
    a: "Yes. Core tracking, reminders, and schedules work without AI, so you can simply avoid the Plan Generator and AI Chat. The library will still show AI-drafted content, clearly marked as such, which you should treat like any other online health article.",
  },
];

export const INSTALL_FAQ: AeoFaqPair[] = [
  {
    q: "How do I install DoseRoutine on my iPhone?",
    a: "In Safari on doseroutine.com, tap the ••• (more) button on the bottom bar, tap the Share icon, scroll down and tap Add to Home Screen, confirm the name DoseRoutine, then tap Add. The whole process takes about 20 seconds.",
  },
  {
    q: "How do I install DoseRoutine on Android?",
    a: "Open doseroutine.com in Chrome, tap the ⋮ menu in the top right, tap Add to Home screen (or Install app), then confirm. The DoseRoutine icon appears on your home screen and opens like a native app.",
  },
  {
    q: "Do I need to download DoseRoutine from an app store?",
    a: "No. DoseRoutine is a progressive web app you install directly from your mobile browser's share or menu options — there's no App Store or Google Play listing to search for.",
  },
  {
    q: "What's different after installing DoseRoutine on my home screen?",
    a: "Once installed, DoseRoutine launches full-screen with its own icon, without Safari or Chrome's browser bar, so it behaves like a native app while still being the same web app you were using before.",
  },
  {
    q: "What if Add to Home Screen doesn't appear?",
    a: "Make sure you're using Safari on iPhone or Chrome on Android — other browsers may not show the option. If it's still missing, email support@doseroutine.com for help.",
  },
];
