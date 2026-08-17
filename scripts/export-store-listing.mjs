#!/usr/bin/env node
/**
 * Export App Store + Google Play listing metadata directly from source code.
 *
 * Reads:
 *   - capacitor.config.ts        → bundle/package ID
 *   - src/lib/i18n.ts            → supported locales
 *   - src/components/native-paywall.tsx → live prices/trial length
 *   - This file's LISTING constant → canonical listing copy, keywords, categories
 *
 * Writes:
 *   - /mnt/documents/store-listing-export.md   (paste-ready Markdown)
 *   - /mnt/documents/store-listing-export.json (machine-readable)
 *
 * Usage:  node scripts/export-store-listing.mjs
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");

// --- Extract from source ----------------------------------------------------
const capacitor = read("capacitor.config.ts");
const bundleId = capacitor.match(/appId:\s*['"]([^'"]+)['"]/)?.[1] ?? "unknown";
const appName = capacitor.match(/appName:\s*['"]([^'"]+)['"]/)?.[1] ?? "DoseRoutine";

const i18n = read("src/lib/i18n.ts");
const localesBlock = i18n.match(/SUPPORTED_LOCALES\s*=\s*\[([^\]]+)\]/)?.[1] ?? "";
const locales = [...localesBlock.matchAll(/"([a-z-]+)"/g)].map((m) => m[1]);
const labelBlock = i18n.match(/LOCALE_LABELS[^{]*\{([^}]+)\}/s)?.[1] ?? "";
const localeLabels = Object.fromEntries(
  [...labelBlock.matchAll(/(\w+):\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]),
);

const paywall = read("src/components/native-paywall.tsx");
const monthlyPrice = paywall.match(/\$(\d+\.\d{2})\/month/)?.[1] ?? "9.99";
const yearlyPrice = paywall.match(/\$(\d+\.\d{2})\/year/)?.[1] ?? "59.99";
const trialDays = paywall.match(/(\d+)[- ]days? free/)?.[1] ?? "7";

// --- Canonical listing (single source of truth) -----------------------------
const LISTING = {
  appName,
  bundleId,
  subtitle: "Peptide Reconstitution Tracker", // iOS: 30 chars max — targets "peptide reconstitution"
  shortDescription: "Peptide reconstitution & dosage calculator + supplement/hormone tracker.", // Google Play: 80 chars max — leads with target keywords
  promoText:
    "Peptide reconstitution + dosage calculator built in. Track BPC-157, TB-500, semaglutide, tirzepatide & every dose.", // iOS: 170 chars max
  fullDescription: `Peptide reconstitution calculator, dosage calculator, and full stack tracker in one app.

Mixing BPC-157, TB-500, semaglutide, tirzepatide, ipamorelin or CJC-1295? DoseRoutine's built-in peptide reconstitution calculator turns any vial + BAC water combo into an exact syringe unit reading (U-100 and U-40), then schedules every dose on your daily calendar with real alarms and interaction warnings. If you stack supplements, peptides, hormones, or prescriptions, this is the tracker built specifically for complex protocols — so you can dose confidently and catch dangerous combinations before they happen.

Why download DoseRoutine?
• Your entire stack, one schedule. See every dose mapped to a clean daily calendar with automatic reminders and native alarms.
• Interaction warnings that actually matter. We cross-check every combination of supplements, peptides, hormones, and prescription meds — flagging cardiovascular risks, serotonin overlap, blood-thinner conflicts, QT-prolongation, and more.
• Share with your doctor in seconds. Export a shareable PDF summary or send your full stack summary via SMS/email before every appointment.
• Never miss a dose again. One-tap logging, consistency heatmaps, and monthly calendar views keep you on track.
• Built on real research. Browse 475+ compound entries with mechanisms, dosing guidance, cited citations, and goal tags.
• Extra tools included: interaction checker, reconstitution calculator, vial inventory + refill predictions, blood work tracker, injection site rotation, cycle tracker, cost tracker, side-effect journal, progress photos, and protocol sharing.
• Works in your language. Auto-detects ${locales.length} languages from your device settings.

Built for people who take their health seriously:
- Biohackers running peptide protocols
- Men and women on HRT / TRT
- Longevity-focused adults stacking NAD+, rapamycin, metformin
- Anyone combining supplements with prescription medications

Free to try. Upgrade to Pro for $${monthlyPrice}/month or $${yearlyPrice}/year (50% savings) with a ${trialDays}-day free trial — unlocks unlimited compounds, calendar alarms, AI-assisted plans, shareable PDF exports, and every advanced tracker.

Safety note: DoseRoutine is an educational and tracking tool, not a substitute for medical advice. Always consult a licensed clinician before starting, stopping, or combining any compound.

Learn more at doseroutine.com.`,
  keywordsIOS:
    "reconstitution,calculator,dosage,bpc157,tb500,semaglutide,tirzepatide,ipamorelin,syringe,hrt,trt,nad", // 100 chars max, comma-separated, no spaces — avoids duplicating "peptide"/"dose"/"tracker" already in app name + subtitle
  playTags: [
    "Medical",
    "Health & Fitness",
    "Peptide reconstitution calculator",
    "Peptide dosage calculator",
    "Supplement tracker",
    "Medication reminder",
    "HRT/TRT",
    "Longevity",
  ],
  category: { primary: "Medical", secondary: "Health & Fitness" },
  ageRating: "17+ (references to prescription medications and hormones)",
  contentRating: "Google Play: Teen (mature health content)",
  developerIds: {
    appStore: "6793807589",
    googlePlay: "7705492751128043194",
    developerName: "X-Developer",
  },
  urls: {
    support: "https://doseroutine.com/help",
    marketing: "https://doseroutine.com",
    privacy: "https://doseroutine.com/privacy",
    terms: "https://doseroutine.com/legal",
    medicalDisclaimer: "https://doseroutine.com/medical-disclaimer",
    aiPolicy: "https://doseroutine.com/ai-policy",
    refund: "https://doseroutine.com/refund-policy",
  },
  whatsNew:
    "First release of DoseRoutine for iPhone and Android. Track your entire longevity stack, get real-time interaction warnings, and never miss a dose.",
  reviewNotes: {
    demoUsername: "appreview@doseroutine.com",
    demoPassword: "DoseReview2026!",
    notes:
      "Reviewer account has a 10-year grandfathered Pro subscription. All features unlocked. Educational tracker only; no medication is dispensed or prescribed.",
  },
  subscriptions: [
    {
      displayName: "DoseRoutine Pro",
      referenceName: "DoseRoutine Pro (Monthly)",
      productId: "pro_monthly",
      period: "1 Month",
      priceUSD: monthlyPrice,
      freeTrialDays: Number(trialDays),
      entitlement: "pro",
      group: "DoseRoutine Pro",
    },
    {
      displayName: "DoseRoutine Pro",
      referenceName: "DoseRoutine Pro (Yearly)",
      productId: "pro_yearly",
      period: "1 Year",
      priceUSD: yearlyPrice,
      freeTrialDays: Number(trialDays),
      entitlement: "pro",
      group: "DoseRoutine Pro",
    },
  ],
  locales: locales.map((code) => ({ code, label: localeLabels[code] ?? code })),
  localizations: {
    en: {
      subtitle: "Peptide Reconstitution Calc",
      shortDescription: "Peptide reconstitution & dosage calculator + supplement/hormone tracker.",
      keywords:
        "reconstitution,dosage,calculator,peptide,bpc157,tb500,semaglutide,tirzepatide,syringe,units,trt,hrt",
      promoText:
        "Peptide reconstitution + dosage calculator built in. Track BPC-157, TB-500, semaglutide, tirzepatide & every dose.",
    },
    es: {
      subtitle: "Calculadora de péptidos",
      shortDescription:
        "Calculadora de reconstitución y dosis de péptidos + seguimiento de suplementos.",
      keywords:
        "reconstitucion,calculadora,peptido,dosis,bpc157,semaglutida,tirzepatida,jeringa,unidades,trt,hrt",
      promoText:
        "Calculadora de reconstitución y dosis de péptidos. Rastrea BPC-157, semaglutida y tirzepatida con recordatorios.",
    },
    fr: {
      subtitle: "Calculateur reconstitution",
      shortDescription:
        "Calculateur de reconstitution et de dose de peptides + suivi des suppléments.",
      keywords:
        "reconstitution,calculateur,peptide,dose,bpc157,semaglutide,tirzepatide,seringue,unites,trt,hrt",
      promoText:
        "Calculateur de reconstitution + dose de peptides intégré. Suivez BPC-157, sémaglutide et tirzépatide.",
    },
    de: {
      subtitle: "Peptid-Dosisrechner",
      shortDescription: "Peptid-Rekonstitutions- & Dosisrechner + Supplement- und Hormontracker.",

      keywords:
        "rekonstitution,rechner,dosis,peptid,bpc157,semaglutid,tirzepatid,spritze,einheiten,trt,hrt",
      promoText:
        "Peptid-Rekonstitutions- und Dosisrechner integriert. Trackt BPC-157, Semaglutid und Tirzepatid.",
    },
    it: {
      subtitle: "Calcolatore ricostituzione",
      shortDescription: "Calcolatore di ricostituzione e dose di peptidi + tracker di integratori.",
      keywords:
        "ricostituzione,calcolatore,peptide,dose,bpc157,semaglutide,tirzepatide,siringa,unita,trt,hrt",
      promoText:
        "Calcolatore ricostituzione e dosaggio peptidi integrato. Traccia BPC-157, semaglutide, tirzepatide.",
    },
    pt: {
      subtitle: "Calculadora de peptídeos",
      shortDescription:
        "Calculadora de reconstituição e dose de peptídeos + rastreador de suplementos.",
      keywords:
        "reconstituicao,calculadora,peptideo,dose,bpc157,semaglutida,tirzepatida,seringa,unidades,trt,hrt",
      promoText:
        "Calculadora de reconstituição + dose de peptídeos integrada. Rastreie BPC-157, semaglutida e tirzepatida.",
    },
    nl: {
      subtitle: "Peptide doseringcalculator",
      shortDescription:
        "Peptide reconstitutie- en doseringscalculator + supplementen- en hormoontracker.",
      keywords:
        "reconstitutie,calculator,peptide,dosering,bpc157,semaglutide,tirzepatide,spuit,eenheden,trt,hrt",
      promoText:
        "Peptide reconstitutie- en doseringscalculator ingebouwd. Volg BPC-157, semaglutide en tirzepatide.",
    },
    ja: {
      subtitle: "ペプチド用量計算機",
      shortDescription: "ペプチド再構成・用量計算機。サプリ、ホルモン、処方薬も一括管理。",
      keywords: "ペプチド,再構成,計算機,用量,BPC157,セマグルチド,チルゼパチド,注射器,単位,TRT,HRT",
      promoText:
        "ペプチド再構成と用量計算機を内蔵。BPC-157、セマグルチド、チルゼパチドを正確に管理。",
    },
    ko: {
      subtitle: "펩타이드 용량 계산기",
      shortDescription: "펩타이드 재구성 및 용량 계산기 + 보충제·호르몬 추적기.",
      keywords:
        "펩타이드,재구성,계산기,용량,BPC157,세마글루타이드,티르제파타이드,주사기,단위,TRT,HRT",
      promoText:
        "펩타이드 재구성 및 용량 계산기 내장. BPC-157, 세마글루타이드, 티르제파타이드를 정확히 추적.",
    },
    zh: {
      subtitle: "肽复溶剂量计算器",
      shortDescription: "肽复溶与剂量计算器 + 补充剂、激素和处方药追踪。",
      keywords: "肽,复溶,剂量,计算器,BPC157,司美格鲁肽,替尔泊肽,注射器,单位,TRT,HRT",
      promoText: "内置肽复溶与剂量计算器。精准追踪 BPC-157、司美格鲁肽和替尔泊肽。",
    },
    ar: {
      subtitle: "حاسبة جرعة الببتيد",
      shortDescription: "حاسبة إعادة تكوين وجرعة الببتيدات + متتبع للمكملات والهرمونات.",
      keywords: "ببتيد,اعادة_تكوين,حاسبة,جرعة,BPC157,سيماغلوتايد,تيرزيباتايد,محقنة,وحدات,TRT,HRT",
      promoText:
        "حاسبة إعادة تكوين وجرعة الببتيدات مدمجة. تتبع BPC-157 والسيماغلوتايد والتيرزيباتايد بدقة.",
    },
    hi: {
      subtitle: "पेप्टाइड डोज़ कैलकुलेटर",
      shortDescription: "पेप्टाइड रीकंस्टिट्यूशन और डोज़ कैलकुलेटर + सप्लीमेंट व हार्मोन ट्रैकर.",
      keywords:
        "पेप्टाइड,रीकंस्टिट्यूशन,कैलकुलेटर,खुराक,BPC157,सेमाग्लूटाइड,टिरजेपेटाइड,सिरिंज,यूनिट,TRT,HRT",
      promoText:
        "पेप्टाइड रीकंस्टिट्यूशन और डोज़ कैलकुलेटर बिल्ट-इन. BPC-157, सेमाग्लूटाइड, टिरजेपेटाइड सटीक ट्रैक करें.",
    },
  },
};

// --- Sanity checks ----------------------------------------------------------
const warnings = [];
if (LISTING.subtitle.length > 30)
  warnings.push(`iOS subtitle > 30 chars (${LISTING.subtitle.length})`);
if (LISTING.shortDescription.length > 80)
  warnings.push(`Play short description > 80 chars (${LISTING.shortDescription.length})`);
if (LISTING.keywordsIOS.length > 100)
  warnings.push(`iOS keywords > 100 chars (${LISTING.keywordsIOS.length})`);
if (LISTING.promoText.length > 170)
  warnings.push(`iOS promotional text > 170 chars (${LISTING.promoText.length})`);
if (LISTING.fullDescription.length > 4000)
  warnings.push(`Full description > 4000 chars (${LISTING.fullDescription.length})`);

for (const [code, loc] of Object.entries(LISTING.localizations)) {
  if (loc.subtitle.length > 30)
    warnings.push(`[${code}] iOS subtitle > 30 chars (${loc.subtitle.length})`);
  if (loc.shortDescription.length > 80)
    warnings.push(`[${code}] Play short description > 80 chars (${loc.shortDescription.length})`);
  if (loc.keywords.length > 100)
    warnings.push(`[${code}] iOS keywords > 100 chars (${loc.keywords.length})`);
  if (loc.promoText.length > 170)
    warnings.push(`[${code}] iOS promotional text > 170 chars (${loc.promoText.length})`);
}

// --- Emit -------------------------------------------------------------------
const OUT_DIR = "/mnt/documents";
mkdirSync(OUT_DIR, { recursive: true });

writeFileSync(
  `${OUT_DIR}/store-listing-export.json`,
  JSON.stringify({ generatedAt: new Date().toISOString(), warnings, listing: LISTING }, null, 2),
);

const md = `# ${LISTING.appName} — Store Listing Export

_Generated ${new Date().toISOString()} from source. Paste directly into App Store Connect and Google Play Console._

${warnings.length ? `> ⚠️ **Length warnings:**\n${warnings.map((w) => `> - ${w}`).join("\n")}\n` : "> ✅ All length limits pass.\n"}

## Identity
| Field | Value |
|---|---|
| App name | ${LISTING.appName} |
| iOS bundle ID | \`${LISTING.bundleId}\` |
| Android package | \`${LISTING.bundleId}\` |
| Google Play Developer ID | \`${LISTING.developerIds.googlePlay}\` |
| Google Play Developer name | ${LISTING.developerIds.developerName} |
| Primary category | ${LISTING.category.primary} |
| Secondary category | ${LISTING.category.secondary} |
| Age rating (iOS) | ${LISTING.ageRating} |
| Content rating (Play) | ${LISTING.contentRating} |

## Copy
**Subtitle (iOS, ≤30 chars — ${LISTING.subtitle.length}):**
${LISTING.subtitle}

**Short description (Play, ≤80 chars — ${LISTING.shortDescription.length}):**
${LISTING.shortDescription}

**Promotional text (iOS, ≤170 chars — ${LISTING.promoText.length}):**
${LISTING.promoText}

**Full description (${LISTING.fullDescription.length} chars):**
\`\`\`
${LISTING.fullDescription}
\`\`\`

**What's New (release notes):**
${LISTING.whatsNew}

## Keywords & Tags
**iOS keywords (≤100 chars, comma-separated, no spaces — ${LISTING.keywordsIOS.length}):**
\`${LISTING.keywordsIOS}\`

**Google Play tags / suggested search terms:**
${LISTING.playTags.map((t) => `- ${t}`).join("\n")}

## URLs
${Object.entries(LISTING.urls)
  .map(([k, v]) => `- **${k}:** ${v}`)
  .join("\n")}

## Subscription Products (identical IDs on Apple + Google + RevenueCat)
| Product ID | Reference name | Display name | Period | Price | Trial | Entitlement | Group |
|---|---|---|---|---|---|---|---|---|
${LISTING.subscriptions
  .map(
    (s) =>
      `| \`${s.productId}\` | ${s.referenceName} | ${s.displayName} | ${s.period} | $${s.priceUSD} USD | ${s.freeTrialDays} days | ${s.entitlement} | ${s.group} |`,
  )
  .join("\n")}

## App Review Info (Apple)
- **Sign-in email:** \`${LISTING.reviewNotes.demoUsername}\`
- **Sign-in password:** \`${LISTING.reviewNotes.demoPassword}\`
- **Notes:** ${LISTING.reviewNotes.notes}

## Supported Locales (${LISTING.locales.length})
${LISTING.locales.map((l) => `- \`${l.code}\` — ${l.label}`).join("\n")}

## Localized Store Metadata (per locale)
| Locale | Language | iOS Subtitle (≤30) | Play Short Description (≤80) | iOS Keywords (≤100) |
|---|---|---|---|
${Object.entries(LISTING.localizations)
  .map(
    ([code, loc]) =>
      `| ${code} | ${localeLabels[code] ?? code} | ${loc.subtitle} | ${loc.shortDescription} | \`${loc.keywords}\` |`,
  )
  .join("\n")}

### Localized Promotional Text (iOS, ≤170 chars)
${Object.entries(LISTING.localizations)
  .map(([code, loc]) => `- **${code}:** ${loc.promoText}`)
  .join("\n")}
`;

writeFileSync(`${OUT_DIR}/store-listing-export.md`, md);

console.log("✅ Exported:");
console.log(`   ${OUT_DIR}/store-listing-export.md`);
console.log(`   ${OUT_DIR}/store-listing-export.json`);
if (warnings.length) {
  console.log("\n⚠️  Warnings:");
  for (const w of warnings) console.log(`   - ${w}`);
}
