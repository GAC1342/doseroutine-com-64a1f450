/**
 * Trust & safety copy shown to visitors before they create an account.
 *
 * Every answer restates something already published on /privacy, /legal,
 * /data-deletion, /editorial-policy or /sources — nothing new is claimed here.
 * Kept in one module so the visible text and the FAQPage JSON-LD can never
 * drift apart.
 */

export type TrustFaqPair = { q: string; a: string };

export const TRUST_FAQ: readonly TrustFaqPair[] = [
  {
    q: "Does DoseRoutine give medical advice?",
    a: "No. DoseRoutine compiles publicly available reference information from sources such as NIH/MedlinePlus, FDA labelling, Mayo Clinic and PubChem, and shows you where interactions have been documented. It does not diagnose, prescribe or replace a clinician or pharmacist.",
  },
  {
    q: "Is my health data private — who can see it?",
    a: "Your stack, doses, labs and notes are yours. Data is stored in encrypted managed databases with row-level access controls, so only your account can read your records.",
  },
  {
    q: "Do you sell my data or share it with advertisers?",
    a: "No. We do not sell your data and we do not share it with advertisers. The only third parties involved are the infrastructure providers that run the app — hosting and database, payments, and email delivery.",
  },
  {
    q: "Can I delete my account and everything in it?",
    a: "Yes, at any time. You can export or permanently delete your account and all associated data from the app or by emailing support, and we request deletion from the connected services too. If you're in the EU or UK, the additional GDPR rights described in our privacy policy also apply.",
  },
  {
    q: "Where does the interaction and compound data come from?",
    a: "Interaction entries are compiled from public pharmacology and clinical literature, drug labelling and NIH resources, with PMIDs or DOIs attached where a specific study supports the entry. Every reference page links its sources so you can read the original.",
  },
  {
    q: "Who builds DoseRoutine?",
    a: "DoseRoutine is an independently built product, made by someone tracking their own peptide, hormone and supplement routine. It isn't funded by supplement brands or clinics, and no compound page is sponsored.",
  },
] as const;

/** Short subset used in tight spaces such as the sign-up page. */
export const TRUST_FAQ_COMPACT: readonly TrustFaqPair[] = [
  TRUST_FAQ[1],
  TRUST_FAQ[2],
  TRUST_FAQ[3],
];

export const SAFETY_POINTS: readonly string[] = [
  "DoseRoutine is a tracking and reference tool. It does not diagnose, prescribe, or replace your doctor or pharmacist.",
  "Interaction results are informational flags to discuss with a clinician — not clearances to combine anything.",
  "Dose calculators do the arithmetic you enter. They don't decide what you should take, or how much.",
];
