import type { AeoFaqPair } from "@/lib/aeo";

export const PRIVACY_FAQ: AeoFaqPair[] = [
  {
    q: "What personal data does DoseRoutine store?",
    a: "DoseRoutine stores your account email, profile details (age band, sex, height, weight, timezone, and unit preference), the compounds and doses you add, your schedule, whether doses were taken, and your subscription status. This is the information needed to run reminders, interaction checks, and adherence tracking.",
  },
  {
    q: "Does DoseRoutine sell or share my data with advertisers?",
    a: "No. DoseRoutine shares data only with the infrastructure providers needed to run the service — its hosting and database provider, Stripe for payments, and its email delivery provider. It does not sell your data and does not share it with advertisers.",
  },
  {
    q: "Is my stack data sent to AI providers?",
    a: "When you use the Plan Generator, your stack — compound names, doses, and timing — is sent to DoseRoutine's AI provider to produce a suggested schedule. Your name, email, and medical history are not sent as part of that request.",
  },
  {
    q: "Can I delete my data or exercise GDPR/CCPA rights?",
    a: "Yes. You can export or delete your account and all associated data at any time by emailing support. EU/UK users have the additional rights described under GDPR, including access, rectification, erasure, portability, and objection, and California residents have the rights described under the CCPA/CPRA.",
  },
  {
    q: "How is my data secured?",
    a: "Data is stored in encrypted managed databases with row-level access controls so only your account can read your records. Passwords are handled by DoseRoutine's authentication provider and are never stored by DoseRoutine directly.",
  },
];

export const COOKIES_FAQ: AeoFaqPair[] = [
  {
    q: "What cookies does DoseRoutine use?",
    a: "DoseRoutine uses a small number of strictly-necessary cookies for the auth session, CSRF/security tokens, and Stripe checkout, plus functional preference cookies for language, units, interaction acknowledgements, and cookie-banner state. It does not use third-party advertising cookies.",
  },
  {
    q: "Does DoseRoutine use advertising or tracking cookies?",
    a: "No. DoseRoutine does not use third-party advertising cookies, cross-site tracking pixels, data brokers, ad networks, or social media 'like' trackers. It only uses privacy-respecting product analytics that count anonymous pageviews and truncate IP addresses before storage.",
  },
  {
    q: "Does DoseRoutine respect Do Not Track?",
    a: "Yes, DoseRoutine respects 'Do Not Track' and 'Global Privacy Control' signals for optional analytics. Strictly-necessary cookies, such as the auth session cookie, remain in use because the app cannot function without them.",
  },
  {
    q: "What happens if I clear my cookies?",
    a: "Clearing the auth cookie signs you out. Clearing preference storage resets your language, units, and interaction acknowledgements to their defaults. You can also sign out directly from More → Account to end the session on that device.",
  },
  {
    q: "What analytics does DoseRoutine collect?",
    a: "DoseRoutine uses privacy-respecting product analytics to count anonymous pageviews and conversions. There is no cross-site tracking, no advertising cookies, and no fingerprinting, and IP addresses are truncated before they are stored.",
  },
];

export const LEGAL_FAQ: AeoFaqPair[] = [
  {
    q: "Is DoseRoutine medical advice?",
    a: "No. DoseRoutine is an educational tool, not a medical device and not medical advice. Interaction warnings, plan suggestions, and adherence tracking are informational only, and nothing in the app diagnoses, treats, cures, or prevents any disease. Always consult a licensed clinician before changing what you take.",
  },
  {
    q: "How does the free trial and billing work?",
    a: "New accounts start with a 7-day free trial of Pro. If you don't cancel before the trial ends, your subscription — monthly at $9.99 or annual at $59.99 — begins automatically and renews until canceled. There is one trial per user, and accounts created before the trial-first model keep their existing access.",
  },
  {
    q: "Who is responsible if DoseRoutine misses an interaction?",
    a: "The service is provided 'as is' without warranties. DoseRoutine does not know your full medical history, so a missing interaction warning does not mean a combination is safe. To the maximum extent permitted by law, DoseRoutine is not liable for decisions made based on information shown in the app.",
  },
  {
    q: "Does DoseRoutine use AI, and is that output reviewed?",
    a: "DoseRoutine uses AI (Google Gemini via a managed AI gateway) to draft library articles, generate suggested plans, and power in-app chat. AI output is educational, not medical advice, and is not reviewed by a licensed clinician before you see it, so it can be incomplete or wrong.",
  },
  {
    q: "How do I cancel my DoseRoutine subscription?",
    a: "Cancel anytime from More → Billing in the app, or from your Apple or Google subscription settings if you subscribed on mobile. Access continues until the end of the period you already paid for; see the Refund & Cancellation Policy for details, including EU/UK statutory withdrawal rights.",
  },
];

export const REFUND_POLICY_FAQ: AeoFaqPair[] = [
  {
    q: "How does the DoseRoutine free trial work?",
    a: "New accounts start with a 7-day free trial of DoseRoutine Pro. You can cancel any time during the trial and you will not be charged. If you don't cancel before the trial ends, your chosen plan — monthly or annual — begins automatically at the price shown at sign-up.",
  },
  {
    q: "Can I get a refund on an annual plan?",
    a: "If you cancel an annual plan within 14 days of the initial charge or an annual renewal, email support for a full refund. After 14 days, annual plans are non-refundable, but you keep access for the remainder of the paid year.",
  },
  {
    q: "What about refunds on monthly plans?",
    a: "Monthly Pro is billed month-to-month after the trial. If you cancel, you keep access until the end of the current billing month, but DoseRoutine does not pro-rate refunds for partial months.",
  },
  {
    q: "What rights do EU or UK customers have?",
    a: "EU and UK consumers have a statutory 14-day right of withdrawal from the date of purchase. Email support within that window and DoseRoutine will refund the full amount to the original payment method, even though paid features may already have started.",
  },
  {
    q: "What if I subscribed through the App Store or Google Play?",
    a: "If you subscribed through the iOS App Store or Google Play, Apple or Google — not DoseRoutine — processes the payment and handles refunds. Request a refund through Apple's reportaproblem.apple.com or the Google Play refund flow, and cancel from your device's subscription settings.",
  },
];

export const MEDICAL_DISCLAIMER_FAQ: AeoFaqPair[] = [
  {
    q: "Is DoseRoutine a substitute for a doctor?",
    a: "No. DoseRoutine is an organization and reference tool, and using it does not create a doctor–patient, pharmacist–patient, or other clinical relationship. Nothing in the app — including dosing ranges, interaction warnings, and AI-generated plan suggestions — is medical advice, a diagnosis, or a treatment recommendation.",
  },
  {
    q: "Are DoseRoutine's interaction warnings complete?",
    a: "No. Interaction data is compiled from public sources such as NIH, FDA, DailyMed, PubChem, and peer-reviewed literature on a best-effort basis. The absence of a warning does not mean a combination is safe, since everyone metabolizes compounds differently and clinical context matters.",
  },
  {
    q: "What should I do in a medical emergency?",
    a: "DoseRoutine is not for emergencies. If you think you're having a medical emergency, overdose, or serious adverse reaction, call your local emergency number immediately — 911 in the US, 999 in the UK, or 112 in the EU — or go to the nearest emergency room.",
  },
  {
    q: "Who should I talk to before changing what I take?",
    a: "Always talk with a licensed physician, pharmacist, or qualified healthcare provider who knows your full medical history before starting, stopping, or changing any supplement, peptide, hormone, or prescription medication shown in DoseRoutine.",
  },
  {
    q: "Who can use DoseRoutine?",
    a: "DoseRoutine is intended for adults 18 and over. Some compounds in the library are classified as research-use-only in certain jurisdictions, and legality and clinical use vary by country, so you are responsible for following the laws where you live.",
  },
];

export const DATA_DELETION_FAQ: AeoFaqPair[] = [
  {
    q: "How do I delete my DoseRoutine account?",
    a: "The fastest way is in-app: sign in, open More → Account, tap Delete my account, and confirm — your account and all data are removed immediately. Alternatively, email support@doseroutine.com with the subject 'Delete my account,' and the request is processed within 7 days.",
  },
  {
    q: "What data gets deleted when I delete my account?",
    a: "Deletion removes your account and sign-in credentials, profile details, your stack of compounds and doses, dose history and adherence records, push notification subscriptions, interaction acknowledgements, and AI-generated plans or shared links tied to your account.",
  },
  {
    q: "Does DoseRoutine keep any data after I delete my account?",
    a: "Billing records from Stripe are kept for the period required by tax and accounting law, typically around 7 years in the US and 10 years in parts of the EU, containing only your email at purchase and amount charged. Anonymized aggregate stats and, rarely, minimal records tied to an active fraud or legal matter may also be retained until resolved.",
  },
  {
    q: "How long does account deletion take?",
    a: "In-app deletion is immediate. Email requests are processed within 7 days. Backups rotate on a rolling 30-day schedule, so deleted data is fully gone from backup snapshots after that period.",
  },
  {
    q: "Can I export my data before deleting my account?",
    a: "Yes. Before deleting, you can email support to request a copy of your data in JSON format, which DoseRoutine sends within 7 days.",
  },
];
