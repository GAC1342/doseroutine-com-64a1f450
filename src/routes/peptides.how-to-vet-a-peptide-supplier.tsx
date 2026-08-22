import { createFileRoute } from "@tanstack/react-router";
import { PeptideGuidePage } from "@/components/peptide-guide-page";
import { peptideGuideHead } from "@/lib/peptide-guide-head";
import { clusterRelated } from "@/lib/peptide-cluster-links";

export const PATH = "/peptides/how-to-vet-a-peptide-supplier";
export const CANONICAL = `https://doseroutine.com${PATH}`;
const TITLE = "How to Vet a Peptide Supplier: A Buyer's Checklist";
const DESC =
  "Third-party testing, certificates of analysis, HPLC vs mass spec, storage and shipping: how to judge a peptide vendor, and the red flags to avoid.";

export const FAQ = [
  {
    q: "How do I know if a peptide supplier is legitimate?",
    a: "Ask for a batch-specific certificate of analysis from an independent lab, dated and matched to the lot number on your vial. A legitimate supplier provides HPLC purity and mass spectrometry identity for that exact batch. A generic PDF with no lot number is marketing, not testing.",
  },
  {
    q: "What is a certificate of analysis (COA)?",
    a: "A lab document reporting what a specific batch contains: peptide identity confirmed by mass spectrometry, purity by HPLC, and often water and residual solvent content. It must name the lab, the lot number and the test date. Without a lot number it cannot be verified against your vial.",
  },
  {
    q: "What purity should a peptide be?",
    a: "Reputable research suppliers report 98 percent or higher by HPLC. Purity is not the same as identity — a 99 percent pure sample of the wrong molecule is still wrong — which is why mass spectrometry confirmation matters alongside the HPLC trace.",
  },
  {
    q: "Are research peptides safe to use?",
    a: "Research peptides are not approved for human use, are not manufactured to pharmaceutical standards, and independent testing has repeatedly found products that did not match their labels. Testing narrows the risk; it does not remove it. Approved, prescribed peptide medicines are a different category entirely.",
  },
  {
    q: "What are the biggest red flags in a peptide vendor?",
    a: "No batch-specific COA, dosing or medical advice on the site, health claims about treating conditions, no cold shipping option, no lot numbers on vials, anonymous ownership with no contact address, and pressure discounting. Any single one is enough to walk away.",
  },
  {
    q: "Does 'for research use only' mean anything?",
    a: "Legally, yes — it is the disclaimer that keeps an unapproved product sellable. It also means the vendor makes no representation that the product is safe for people, and the buyer carries all of that risk.",
  },
];

const SECTIONS = [
  {
    heading: "Start here: this is an unregulated market",
    paragraphs: [
      "Peptides sold online as research chemicals sit outside the approval and manufacturing standards that apply to medicines. No agency has verified the contents of the vial, and the seller is not required to make it match the label. Regulators have issued repeated warning letters to peptide sellers for marketing unapproved drugs, and the US Food and Drug Administration has categorized several popular peptides — BPC-157 among them — as bulk substances presenting significant safety risks.",
      "That does not make every vendor dishonest. It does mean the burden of verification falls entirely on the buyer, and a checklist is the only sensible response.",
    ],
  },
  {
    heading: "The vetting checklist",
    steps: [
      "Ask for a certificate of analysis for the specific lot number you will receive — not a sample COA, not last year's batch.",
      "Check the COA names an independent third-party lab with contact details, and that the test date is recent relative to the batch.",
      "Confirm it reports both HPLC purity (typically ≥98%) and mass spectrometry identity showing the expected molecular weight.",
      "Verify the lot number on the COA matches the label on the vial when it arrives. If the vial has no lot number, the COA proves nothing.",
      "Check the product is lyophilized and ships cold or with an insulated pack; ambient shipping in summer is a real potency problem.",
      "Look for a physical address, a named company and reachable support — not just a contact form.",
      "Read the site for dosing protocols or health claims. Vendors that tell you how to dose are advertising an unapproved drug, and that tells you how seriously they take compliance.",
      "Search independent third-party test programs and community lab-testing results for the brand before ordering.",
    ],
  },
  {
    heading: "How to read a COA without a chemistry degree",
    table: {
      caption: "The four fields that carry the information.",
      head: ["Field", "What you want to see", "What it means if missing"],
      rows: [
        [
          "Lot / batch number",
          "Matches the number printed on your vial",
          "The document cannot be tied to your product at all",
        ],
        [
          "HPLC purity",
          "A chromatogram plus a number, usually ≥98%",
          "Purity is unverified; a bare percentage with no trace is unsupported",
        ],
        [
          "Mass spectrometry",
          "Observed mass matching the theoretical molecular weight",
          "Identity is unconfirmed — purity alone cannot tell you what it is",
        ],
        [
          "Testing lab",
          "An independent lab named, with a date and signature",
          "Likely in-house or fabricated; no accountability",
        ],
      ],
    },
    paragraphs: [
      "One further check costs nothing: look up the peptide's theoretical molecular weight and confirm the mass on the COA agrees within about one unit. A mismatch means the vial contains something other than what the label says, whatever the purity figure claims.",
    ],
  },
  {
    heading: "Brand-name searches are not endorsements",
    paragraphs: [
      "A large share of peptide search traffic is brand names — people checking whether a specific vendor is trustworthy. DoseRoutine does not sell peptides, does not take affiliate commissions from vendors, and does not rank suppliers. We have no way to verify any individual seller's batches, and any list we published would be out of date within a month, because batch quality varies batch to batch even within one brand.",
      "Apply the checklist above to whichever vendor you are considering. A brand that passed for someone else last year is not evidence about the vial you are about to buy.",
    ],
  },
  {
    heading: "After it arrives",
    bullets: [
      "Photograph the vial label and the lot number before reconstituting; if there is a problem later you will need it.",
      "Store lyophilized powder cold, dry and dark until you use it.",
      "Log the reconstitution date, diluent type and volume so the concentration and beyond-use date are recorded rather than remembered.",
      "Note the lot number against the vial in whatever you track with, so a bad batch can be traced to the doses you took.",
      "Get baseline blood work before starting anything, and involve a clinician. Self-sourced products are exactly the situation where oversight matters most.",
    ],
  },
];

const REFERENCES = [
  {
    cite: "US Food and Drug Administration. Certain Bulk Drug Substances for Use in Compounding — Category 2 list (substances presenting significant safety risks).",
    url: "https://www.fda.gov/drugs/human-drug-compounding/bulk-drug-substances-nominated-use-compounding-under-section-503a-federal-food-drug-and-cosmetic-act",
  },
  {
    cite: "US Food and Drug Administration. Warning Letters — searchable database of enforcement actions, including unapproved peptide products.",
    url: "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters",
  },
  {
    cite: "Federal Trade Commission. Health Products Compliance Guidance. 2022.",
    url: "https://www.ftc.gov/business-guidance/resources/health-products-compliance-guidance",
  },
  {
    cite: "World Anti-Doping Agency. The Prohibited List — S2: Peptide Hormones, Growth Factors, Related Substances and Mimetics.",
    url: "https://www.wada-ama.org/en/prohibited-list",
  },
  {
    cite: "US Pharmacopeia. General Chapter <1503> Quality Attributes of Synthetic Peptide Drug Substances.",
    url: "https://www.usp.org/",
  },
];

export const Route = createFileRoute("/peptides/how-to-vet-a-peptide-supplier")({
  head: () =>
    peptideGuideHead({
      path: PATH,
      title: TITLE,
      description: DESC,
      crumb: "Vetting a supplier",
      faq: FAQ,
    }),
  component: Page,
});

function Page() {
  return (
    <PeptideGuidePage
      heading="How to vet a peptide supplier"
      answer="Ask for a batch-specific certificate of analysis from an independent lab, with a lot number matching your vial, HPLC purity at 98 percent or higher, and mass spectrometry confirming identity. No lot number, dosing advice on the site, or ambient shipping are each reason enough to buy elsewhere."
      callout={{
        title: "We do not sell peptides or rank vendors",
        body: "DoseRoutine has no supplier affiliations and takes no vendor commissions. This page is a checklist for judging any seller yourself — research peptides are not approved for human use and carry risk that testing reduces but does not remove.",
      }}
      sections={SECTIONS}
      faq={FAQ}
      references={REFERENCES}
      reviewed="August 2026"
      productNote={{
        title: "Record the lot number with the dose",
        body: "DoseRoutine stores vial strength, diluent volume, reconstitution date and your own notes per vial — so if a batch turns out to be bad, you can see exactly which doses came from it.",
      }}
      related={clusterRelated(PATH)}
      canonical={CANONICAL}
    />
  );
}
