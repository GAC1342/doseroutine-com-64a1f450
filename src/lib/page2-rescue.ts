// Phase 3 — "Page-2 Rescue".
//
// These slugs already rank in Google positions ~16–55 for high-volume head
// terms (Semrush, Aug 2026). They lose the click because the page does not
// answer the exact searched question above the fold and does not cover the
// "People also ask" cluster around that query.
//
// This module adds, per slug:
//   - a query-matched <title> / meta description,
//   - an answer-first paragraph rendered directly under the H1,
//   - a "quick facts" table (class, brand names, forms, onset, half-life),
//   - extra PAA-style Q&A that is merged into BOTH the visible accordion and
//     the FAQPage JSON-LD (Google requires those to match).
//
// Rules for anything added here:
//   * factual, neutral, sourced-in-prose — same standard as the AI pipeline,
//   * NEVER prescribe a dose; describe what is commonly studied/labeled,
//   * no invented citations, DOIs or URLs.

import type { FaqPair } from "@/lib/faq-schema";

export type QuickFact = { label: string; value: string };

export type RescueEntry = {
  /** The search query this page is closest to ranking for. */
  targetQuery: string;
  /** <=58 chars, leads with the searched phrase. */
  metaTitle: string;
  /** <=150 chars before the DoseRoutine suffix is appended. */
  metaDescription: string;
  /** 45–80 word direct answer, rendered above the fold under the H1. */
  answer: string;
  quickFacts: QuickFact[];
  extraFaq: FaqPair[];
};

const EDU = "This is educational information, not medical advice.";

export const PAGE2_RESCUE: Record<string, RescueEntry> = {
  acetaminophen: {
    targetQuery: "acetaminophen",
    metaTitle: "Acetaminophen (Tylenol): Uses, Dosing Limits, Risks",
    metaDescription:
      "Acetaminophen is an over-the-counter pain reliever and fever reducer. What it treats, the daily ceiling on the FDA label, and liver-safety rules.",
    answer:
      "Acetaminophen (paracetamol, sold as Tylenol) is an over-the-counter analgesic and antipyretic used for mild-to-moderate pain and fever. Unlike ibuprofen it is not an anti-inflammatory and does not irritate the stomach lining or thin the blood. Its main hazard is liver injury: the FDA label caps healthy adults at 3,000–4,000 mg in 24 hours, and it is the leading cause of acute liver failure in the U.S.",
    quickFacts: [
      { label: "Drug class", value: "Non-opioid analgesic / antipyretic" },
      { label: "Also sold as", value: "Tylenol, Panadol, paracetamol (outside the U.S.)" },
      { label: "Common forms", value: "Tablet, caplet, liquid suspension, suppository, IV" },
      { label: "Onset", value: "About 30–60 minutes for oral forms" },
      { label: "Half-life", value: "Roughly 2–3 hours in healthy adults" },
      { label: "Main safety limit", value: "FDA label ceiling of 3,000–4,000 mg per 24 hours" },
    ],
    extraFaq: [
      {
        q: "Is acetaminophen the same as ibuprofen?",
        a:
          "No. Acetaminophen relieves pain and fever but has essentially no anti-inflammatory effect, while ibuprofen is an NSAID that reduces inflammation. They also carry different risks: acetaminophen's ceiling is liver toxicity, ibuprofen's is stomach bleeding and kidney strain. Clinicians sometimes alternate them, but that should be confirmed with a pharmacist. " +
          EDU,
      },
      {
        q: "How much acetaminophen is too much in one day?",
        a:
          "The FDA label sets a maximum of 3,000–4,000 mg per 24 hours for healthy adults, and lower for people who drink alcohol regularly or have liver disease. Accidental overdose usually happens through stacking — many cold, flu and prescription pain combinations already contain acetaminophen, so the totals add up silently. " +
          EDU,
      },
      {
        q: "Can you drink alcohol while taking acetaminophen?",
        a:
          "Regular alcohol use depletes glutathione, the liver's defense against acetaminophen's toxic metabolite, so combining the two raises the risk of liver injury. FDA labeling advises anyone having three or more alcoholic drinks a day to ask a clinician before using it. " +
          EDU,
      },
      {
        q: "Is acetaminophen safe during pregnancy?",
        a:
          "It is the analgesic most commonly recommended in pregnancy by obstetric bodies including ACOG, and is generally considered the preferred option over NSAIDs, particularly after 20 weeks. Some observational research has raised questions about prolonged use, so the standing advice is the lowest effective amount for the shortest time under clinician guidance. " +
          EDU,
      },
    ],
  },

  eszopiclone: {
    targetQuery: "lunesta",
    metaTitle: "Lunesta (Eszopiclone): How It Works, Effects, Risks",
    metaDescription:
      "Lunesta is the brand name for eszopiclone, a prescription non-benzodiazepine sleep medication. How it works, side effects, and the FDA boxed warning.",
    answer:
      'Lunesta is the brand name for eszopiclone, a prescription "Z-drug" hypnotic for insomnia. It acts on the same GABA-A receptor site as benzodiazepines but with a different chemical structure, shortening how long it takes to fall asleep and reducing night-time waking. The FDA carries a boxed warning for complex sleep behaviors — sleepwalking, sleep-driving and sleep-eating with no memory of the event.',
    quickFacts: [
      { label: "Generic name", value: "Eszopiclone" },
      { label: "Drug class", value: 'Non-benzodiazepine hypnotic ("Z-drug")' },
      { label: "Schedule", value: "DEA Schedule IV controlled substance in the U.S." },
      { label: "Onset", value: "Roughly 30 minutes; taken immediately before bed" },
      { label: "Half-life", value: "About 6 hours (longer in older adults)" },
      { label: "Boxed warning", value: "Complex sleep behaviors; discontinue after any episode" },
    ],
    extraFaq: [
      {
        q: "Is Lunesta a benzodiazepine?",
        a:
          "No, but it is close in effect. Eszopiclone is a non-benzodiazepine hypnotic that binds the same GABA-A receptor complex benzodiazepines act on, which is why it shares their sedation, dependence and next-day impairment profile despite a different molecular structure. " +
          EDU,
      },
      {
        q: "Why does Lunesta leave a metallic taste?",
        a: "A bitter or metallic aftertaste is the single most commonly reported side effect of eszopiclone in FDA labeling, affecting a large minority of users. It is caused by the drug being secreted in saliva and typically persists into the next morning rather than fading overnight.",
      },
      {
        q: "How long can you take Lunesta?",
        a:
          "Labeling and sleep-medicine guidelines frame Z-drugs as short-term treatment while the cause of the insomnia is addressed, because tolerance, dependence and rebound insomnia on stopping become more likely with prolonged nightly use. The American Academy of Sleep Medicine positions cognitive behavioral therapy for insomnia (CBT-I) as first-line instead. " +
          EDU,
      },
      {
        q: "What should not be mixed with Lunesta?",
        a:
          "Alcohol, opioids, benzodiazepines and other CNS depressants are the key combinations to avoid — they compound respiratory depression and next-day impairment. Strong CYP3A4 inhibitors such as ketoconazole raise eszopiclone blood levels substantially. " +
          EDU,
      },
    ],
  },

  lisdexamfetamine: {
    targetQuery: "lisdexamfetamine",
    metaTitle: "Lisdexamfetamine (Vyvanse): Uses, Effects, Warnings",
    metaDescription:
      "Lisdexamfetamine is the prodrug stimulant sold as Vyvanse for ADHD and binge eating disorder. How the prodrug design works, effects, and risks.",
    answer:
      "Lisdexamfetamine, sold as Vyvanse, is a prescription stimulant approved for ADHD and moderate-to-severe binge eating disorder. It is a prodrug: the molecule is inert until enzymes in red blood cells cleave off an l-lysine group to release dextroamphetamine. That conversion is what gives it a slow, smooth onset and makes it harder to abuse by snorting or injecting than immediate-release amphetamine.",
    quickFacts: [
      { label: "Brand name", value: "Vyvanse" },
      { label: "Drug class", value: "CNS stimulant, amphetamine prodrug" },
      { label: "Schedule", value: "DEA Schedule II controlled substance" },
      { label: "Approved for", value: "ADHD (age 6+) and binge eating disorder in adults" },
      {
        label: "Onset / duration",
        value: "About 1–2 hours to onset; roughly 10–14 hours of effect",
      },
      { label: "Forms", value: "Capsule and chewable tablet; capsule contents dissolve in water" },
    ],
    extraFaq: [
      {
        q: "What is the difference between lisdexamfetamine and Adderall?",
        a:
          "Adderall is a ready-made mix of amphetamine salts that works as soon as it is absorbed. Lisdexamfetamine is inactive until the body enzymatically converts it to dextroamphetamine, which produces a gentler onset, a longer and flatter curve, and lower abuse potential by non-oral routes. " +
          EDU,
      },
      {
        q: "How long does lisdexamfetamine last?",
        a:
          "FDA labeling describes effects lasting roughly 10–14 hours from a single morning dose, which is why it is taken early in the day. Because the enzymatic conversion is rate-limited, taking more does not shorten onset — it mostly increases side effects. " +
          EDU,
      },
      {
        q: "Does lisdexamfetamine cause weight loss?",
        a:
          "Appetite suppression is one of its most common labeled side effects, and weight loss frequently accompanies treatment. It is approved for binge eating disorder but explicitly not approved for obesity or weight loss, and FDA labeling warns against using it for that purpose. " +
          EDU,
      },
      {
        q: "What should be monitored on lisdexamfetamine?",
        a:
          "FDA labeling recommends monitoring blood pressure and heart rate, growth in children, sleep, and any emergence of psychiatric symptoms. It carries a boxed warning for abuse, misuse and dependence, and is contraindicated within 14 days of an MAOI. " +
          EDU,
      },
    ],
  },

  guanfacine: {
    targetQuery: "intuniv",
    metaTitle: "Intuniv (Guanfacine ER): Uses, Effects, Side Effects",
    metaDescription:
      "Intuniv is extended-release guanfacine, a non-stimulant ADHD medication. How it differs from stimulants, what it treats, and common side effects.",
    answer:
      "Intuniv is the extended-release form of guanfacine, a non-stimulant approved for ADHD in children and adolescents, alone or alongside a stimulant. It is a selective alpha-2A adrenergic agonist: rather than raising dopamine like a stimulant, it strengthens signaling in prefrontal cortex circuits that govern attention and impulse control. It is not a controlled substance, and the trade-off is sedation and lowered blood pressure.",
    quickFacts: [
      { label: "Generic name", value: "Guanfacine (extended-release)" },
      { label: "Drug class", value: "Selective alpha-2A adrenergic agonist, non-stimulant" },
      { label: "Approved for", value: "ADHD, ages 6–17 (monotherapy or stimulant adjunct)" },
      { label: "Controlled?", value: "No — not a scheduled substance" },
      { label: "Onset of benefit", value: "Gradual; typically 1–2 weeks, full effect longer" },
      { label: "Common side effects", value: "Sleepiness, fatigue, low blood pressure, dry mouth" },
    ],
    extraFaq: [
      {
        q: "Is Intuniv the same as guanfacine?",
        a:
          "Intuniv is extended-release guanfacine dosed once daily for ADHD. Plain guanfacine (Tenex) is the immediate-release version originally marketed for high blood pressure; the two are not interchangeable milligram for milligram because the release profiles differ. " +
          EDU,
      },
      {
        q: "How is Intuniv different from a stimulant?",
        a:
          "Stimulants raise dopamine and norepinephrine availability and work within an hour. Guanfacine instead binds postsynaptic alpha-2A receptors in the prefrontal cortex and builds effect over weeks. It is not controlled, does not suppress appetite the way stimulants do, and tends to help more with hyperactivity, irritability and emotional dysregulation than with pure focus. " +
          EDU,
      },
      {
        q: "Why does Intuniv cause sleepiness?",
        a:
          "Guanfacine reduces central sympathetic outflow, which lowers blood pressure and heart rate and produces sedation. Somnolence and fatigue are the most commonly reported effects in labeling, usually strongest in the first weeks and often eased by taking it in the evening under clinician guidance. " +
          EDU,
      },
      {
        q: "Can Intuniv be stopped suddenly?",
        a:
          "Labeling advises tapering rather than stopping abruptly, because sudden withdrawal of an alpha-2 agonist can cause rebound hypertension, headache and nervousness. Any change should be planned with the prescriber. " +
          EDU,
      },
    ],
  },

  amlodipine: {
    targetQuery: "what is amlodipine used for",
    metaTitle: "What Is Amlodipine Used For? Uses, Doses, Effects",
    metaDescription:
      "Amlodipine is a calcium channel blocker prescribed for high blood pressure and angina. What it treats, how fast it works, and why ankles swell.",
    answer:
      "Amlodipine (Norvasc) is a long-acting dihydropyridine calcium channel blocker prescribed for high blood pressure and for chronic stable or vasospastic angina. It blocks calcium entry into vascular smooth muscle, relaxing arteries so the heart pumps against less resistance. Its very long half-life means one daily dose covers 24 hours, and full blood-pressure effect takes about one to two weeks to settle.",
    quickFacts: [
      { label: "Brand name", value: "Norvasc" },
      { label: "Drug class", value: "Dihydropyridine calcium channel blocker" },
      { label: "Prescribed for", value: "Hypertension; chronic stable and vasospastic angina" },
      { label: "Dosing rhythm", value: "Once daily, with or without food" },
      { label: "Half-life", value: "Roughly 30–50 hours — full effect in 1–2 weeks" },
      {
        label: "Signature side effect",
        value: "Dose-related ankle and lower-leg swelling (oedema)",
      },
    ],
    extraFaq: [
      {
        q: "Why does amlodipine make ankles swell?",
        a:
          "Amlodipine dilates arterioles more than veins, which raises pressure in the capillary beds of the lower legs and pushes fluid into the tissue. The swelling is dose-related, more common in women, and is not a sign of heart or kidney failure by itself — but it should still be reported, since prescribers often manage it by adjusting the regimen. " +
          EDU,
      },
      {
        q: "Is it better to take amlodipine in the morning or at night?",
        a:
          "Its half-life of 30–50 hours means blood levels stay steady around the clock, so timing matters far less than consistency. Large trials comparing morning and evening dosing of antihypertensives have not shown a decisive winner; the practical advice is to pick one time and keep it. " +
          EDU,
      },
      {
        q: "Can you eat grapefruit with amlodipine?",
        a:
          "Grapefruit inhibits CYP3A4, the enzyme that clears amlodipine, so it can raise blood levels and increase dizziness and swelling. The interaction is milder than with some other calcium channel blockers such as felodipine, but labeling still advises caution. " +
          EDU,
      },
      {
        q: "What happens if you stop amlodipine suddenly?",
        a:
          "Amlodipine does not cause the sharp rebound seen with abruptly stopped beta blockers, but blood pressure will drift back up over days as the drug clears, and angina can return. Stopping should be a clinician's decision. " +
          EDU,
      },
    ],
  },

  tadalafil: {
    targetQuery: "what is cialis",
    metaTitle: "What Is Cialis (Tadalafil)? Uses, Duration, Safety",
    metaDescription:
      "Cialis is the brand name for tadalafil, a PDE5 inhibitor for erectile dysfunction and BPH. How long it lasts and how it differs from Viagra.",
    answer:
      "Cialis is the brand name for tadalafil, a PDE5 inhibitor approved for erectile dysfunction, the urinary symptoms of benign prostatic hyperplasia, and pulmonary arterial hypertension (as Adcirca). It blocks the enzyme that breaks down cGMP, so nitric-oxide signaling relaxes smooth muscle and blood flow improves. Its defining feature is duration — an effective window of roughly 36 hours, far longer than sildenafil.",
    quickFacts: [
      { label: "Generic name", value: "Tadalafil" },
      { label: "Drug class", value: "PDE5 inhibitor" },
      {
        label: "Approved for",
        value: "Erectile dysfunction, BPH symptoms, pulmonary hypertension",
      },
      { label: "Onset", value: "About 30–60 minutes" },
      { label: "Duration", value: 'Up to ~36 hours — the source of the "weekend pill" nickname' },
      {
        label: "Absolute contraindication",
        value: "Any nitrate medication (dangerous blood-pressure drop)",
      },
    ],
    extraFaq: [
      {
        q: "What is the difference between Cialis and Viagra?",
        a:
          "Both are PDE5 inhibitors, but tadalafil (Cialis) lasts around 36 hours and is absorbed regardless of food, while sildenafil (Viagra) lasts roughly 4–6 hours and is slowed by a fatty meal. Tadalafil is also approved for BPH urinary symptoms; sildenafil is not. Side-effect profiles differ slightly — tadalafil causes more back and muscle ache, sildenafil more visual disturbance. " +
          EDU,
      },
      {
        q: "Does Cialis work without arousal?",
        a: "No. PDE5 inhibitors preserve the nitric-oxide signal that arousal generates; they do not create it. Without sexual stimulation there is no cGMP for the drug to protect, which is why labeling describes it as facilitating rather than causing an erection.",
      },
      {
        q: "Why can't you take Cialis with nitrates?",
        a:
          'Nitrates and PDE5 inhibitors act on the same nitric-oxide/cGMP pathway from different directions. Together they can cause a severe, sudden drop in blood pressure. FDA labeling makes any nitrate — including recreational "poppers" (amyl nitrite) — an absolute contraindication. ' +
          EDU,
      },
      {
        q: "Why does tadalafil cause back pain?",
        a:
          "Back and muscle ache appear in roughly 3–6% of users in trial data and are thought to reflect tadalafil's weak inhibition of PDE11, an enzyme found in skeletal muscle. It typically starts 12–24 hours after dosing and resolves within two days. " +
          EDU,
      },
    ],
  },

  diphenhydramine: {
    targetQuery: "diphenhydramine",
    metaTitle: "Diphenhydramine (Benadryl): Uses, Sedation, Risks",
    metaDescription:
      "Diphenhydramine is a first-generation antihistamine used for allergies and as an OTC sleep aid. Why it sedates and the risks of nightly use.",
    answer:
      'Diphenhydramine (Benadryl) is a first-generation antihistamine used for allergy symptoms, itching, motion sickness and — because it crosses into the brain — as the active ingredient in most over-the-counter "PM" sleep aids. That same brain penetration causes sedation, dry mouth and next-day grogginess, and its anticholinergic activity is why geriatric guidelines such as the AGS Beers Criteria advise against routine use in older adults.',
    quickFacts: [
      { label: "Brand names", value: 'Benadryl; the "PM" in many OTC sleep products' },
      {
        label: "Drug class",
        value: "First-generation (sedating) H1 antihistamine, anticholinergic",
      },
      {
        label: "Used for",
        value: "Allergy symptoms, hives, itching, motion sickness, short-term sleep",
      },
      { label: "Onset / duration", value: "About 15–30 minutes; effects last 4–6 hours" },
      { label: "Half-life", value: "Roughly 4–9 hours; longer in older adults" },
      {
        label: "Caution group",
        value: "Listed as potentially inappropriate in older adults (Beers Criteria)",
      },
    ],
    extraFaq: [
      {
        q: "Is diphenhydramine safe to take every night for sleep?",
        a:
          "It is not designed for that. Tolerance to the sedating effect develops within days, sleep architecture is altered, and the anticholinergic load is linked in observational research to next-day cognitive fog and, with long-term cumulative use in older adults, to higher dementia risk. Sleep-medicine guidance favours CBT-I over nightly antihistamines. " +
          EDU,
      },
      {
        q: "Why does Benadryl make you sleepy but Zyrtec doesn't?",
        a: "Diphenhydramine is a first-generation antihistamine that crosses the blood-brain barrier freely and blocks central H1 receptors. Second-generation agents such as cetirizine, loratadine and fexofenadine were engineered to stay largely outside the brain, so they treat allergy symptoms with far less sedation.",
      },
      {
        q: "What should not be combined with diphenhydramine?",
        a:
          "Alcohol, opioids, benzodiazepines and other sedatives compound its CNS depression. Stacking it with other anticholinergics — some bladder medications, tricyclic antidepressants, certain antipsychotics — increases confusion, urinary retention and heart-rate effects. Many multi-symptom cold products already contain it, so accidental doubling is common. " +
          EDU,
      },
      {
        q: "How long does diphenhydramine stay in your system?",
        a:
          "With a half-life of roughly 4–9 hours in healthy adults, most of a dose clears within about a day, but clearance slows considerably with age and liver impairment — which is why next-morning grogginess is more pronounced in older users. " +
          EDU,
      },
    ],
  },

  "minoxidil-oral": {
    targetQuery: "oral minoxidil",
    metaTitle: "Oral Minoxidil for Hair Loss: How It Works, Risks",
    metaDescription:
      "Low-dose oral minoxidil is used off-label for hair loss. How it differs from topical minoxidil, expected timeline, and cardiovascular cautions.",
    answer:
      "Oral minoxidil is an older blood-pressure medication now widely prescribed off-label at very low doses for androgenetic alopecia and other hair loss. It is a potassium channel opener that dilates blood vessels; in hair follicles it appears to prolong the growth (anagen) phase. Because it is systemic, it works where topical foam cannot reach — but it also carries the same cardiovascular cautions, including fluid retention and rapid heart rate.",
    quickFacts: [
      { label: "Original approval", value: "Oral tablet (Loniten) for severe hypertension" },
      { label: "Hair-loss use", value: "Off-label, low-dose, prescription only" },
      { label: "Drug class", value: "Potassium channel opener / vasodilator" },
      {
        label: "Timeline",
        value: "Shedding phase first weeks; visible change typically 3–6 months",
      },
      {
        label: "Common effects",
        value: "Body hair growth, ankle swelling, faster heart rate, dizziness",
      },
      {
        label: "Monitoring",
        value: "Blood pressure, heart rate, oedema; caution with heart disease",
      },
    ],
    extraFaq: [
      {
        q: "Is oral minoxidil better than topical minoxidil?",
        a:
          "Comparative dermatology studies suggest low-dose oral minoxidil is at least as effective as topical for many people, with better adherence because there is no daily application, greasy residue or scalp irritation. The trade-off is systemic exposure: body hair growth, fluid retention and cardiovascular effects only occur with the oral route. " +
          EDU,
      },
      {
        q: "Does oral minoxidil cause hair growth everywhere?",
        a:
          "Hypertrichosis — extra hair on the face, arms, back or hands — is the most consistently reported side effect of the oral route and is dose-related. It is the main reason some people discontinue, and it reverses over months after stopping. " +
          EDU,
      },
      {
        q: "Why does hair shed when starting minoxidil?",
        a:
          "Minoxidil pushes follicles from the resting telogen phase into a new growth phase, and the old hairs are released as the new ones come through. This shedding usually peaks in the first 4–8 weeks and is considered a sign the drug is acting, not failing. " +
          EDU,
      },
      {
        q: "Who should avoid oral minoxidil?",
        a:
          "Its original label carries warnings around pericardial effusion, tachycardia and fluid retention, so people with existing heart failure, uncontrolled arrhythmia, pheochromocytoma or significant kidney impairment need specialist assessment. It is also avoided in pregnancy. " +
          EDU,
      },
    ],
  },

  "sertraline-hcl": {
    targetQuery: "zoloft generic name",
    metaTitle: "Zoloft Generic Name: Sertraline HCl Uses & Effects",
    metaDescription:
      "The generic name for Zoloft is sertraline hydrochloride, an SSRI antidepressant. What it treats, how long it takes, and common side effects.",
    answer:
      'The generic name for Zoloft is sertraline hydrochloride, an SSRI antidepressant. "HCl" simply denotes the hydrochloride salt used to make the molecule stable and absorbable — sertraline and sertraline HCl are the same medicine. It is FDA-approved for major depressive disorder, OCD, panic disorder, PTSD, social anxiety disorder and PMDD, and typically takes four to six weeks for full mood benefit.',
    quickFacts: [
      { label: "Brand name", value: "Zoloft" },
      { label: "Generic name", value: "Sertraline hydrochloride (sertraline HCl)" },
      { label: "Drug class", value: "Selective serotonin reuptake inhibitor (SSRI)" },
      { label: "Approved for", value: "MDD, OCD, panic disorder, PTSD, social anxiety, PMDD" },
      { label: "Time to effect", value: "Sleep and anxiety often first; mood typically 4–6 weeks" },
      { label: "Half-life", value: "Roughly 26 hours — once-daily dosing" },
    ],
    extraFaq: [
      {
        q: "Is sertraline HCl the same as Zoloft?",
        a:
          "Yes. Zoloft is the brand; sertraline hydrochloride is the same active molecule sold generically. FDA-approved generics must demonstrate bioequivalence, so the clinical effect is considered interchangeable, though inactive fillers can differ between manufacturers. " +
          EDU,
      },
      {
        q: "How long does sertraline take to work?",
        a:
          'Physical and sleep symptoms often shift within one to two weeks, while the full antidepressant effect is generally assessed at four to six weeks in clinical guidelines. Stopping early because "nothing happened" in week two is one of the most common reasons treatment is judged unsuccessful. ' +
          EDU,
      },
      {
        q: "What are the most common sertraline side effects?",
        a:
          "FDA labeling lists nausea, diarrhea, insomnia or drowsiness, dry mouth, sweating, tremor and sexual side effects such as delayed orgasm or reduced libido as the most frequent. Gastrointestinal effects usually settle over the first weeks; sexual effects often persist while treatment continues. " +
          EDU,
      },
      {
        q: "Can you stop sertraline suddenly?",
        a:
          'Abrupt discontinuation can trigger discontinuation syndrome — dizziness, "brain zaps", irritability, flu-like symptoms — so labeling and guidelines advise a gradual taper supervised by the prescriber rather than stopping outright. ' +
          EDU,
      },
    ],
  },

  "l-theanine": {
    targetQuery: "what is l theanine",
    metaTitle: "What Is L-Theanine? Effects, Timing and Safety",
    metaDescription:
      "L-theanine is an amino acid found in green tea studied for calm focus and stress. What it does, how it pairs with caffeine, and safety notes.",
    answer:
      "L-theanine is a non-protein amino acid found almost exclusively in tea leaves (Camellia sinensis) and some mushrooms. It crosses the blood-brain barrier and is studied for producing calm alertness rather than sedation — human EEG studies show increased alpha-wave activity, the pattern associated with relaxed wakefulness. It is most commonly used alongside caffeine to smooth out jitteriness while keeping the focus benefit.",
    quickFacts: [
      { label: "What it is", value: "Amino acid (γ-glutamylethylamide) from tea leaves" },
      { label: "Commonly studied for", value: "Stress reactivity, calm focus, sleep quality" },
      {
        label: "Commonly studied at",
        value: "100–400 mg per day in trials — individual needs vary",
      },
      { label: "Onset", value: "Roughly 30–60 minutes" },
      { label: "Half-life", value: "About 1–3 hours" },
      { label: "Safety", value: "FDA GRAS status; generally well tolerated in trials" },
    ],
    extraFaq: [
      {
        q: "What does L-theanine actually do?",
        a:
          "Randomized trials and EEG research suggest it raises alpha-wave activity, modestly increases GABA and dopamine signaling, and blunts the subjective and physiological stress response to demanding tasks. It is not a sedative — most trials find attention preserved or improved rather than dulled. " +
          EDU,
      },
      {
        q: "Why is L-theanine taken with caffeine?",
        a:
          "The combination is one of the better-supported nootropic pairings: trials repeatedly show caffeine plus theanine improves attention-switching and reduces the anxiety and jitter caffeine alone can cause. A roughly 1:2 caffeine-to-theanine ratio is the pairing most often used in that research. " +
          EDU,
      },
      {
        q: "Does L-theanine make you sleepy?",
        a:
          "It generally does not cause sedation the way an antihistamine or melatonin does. Sleep trials suggest it improves sleep quality mainly by lowering pre-sleep arousal, which is why some people take it in the evening and others use it during the day for focus without drowsiness. " +
          EDU,
      },
      {
        q: "Is it safe to take L-theanine every day?",
        a:
          "It holds FDA GRAS status and human trials up to several weeks report few adverse effects beyond occasional headache. The main practical cautions are additive blood-pressure lowering and additive sedation with other calming agents. " +
          EDU,
      },
    ],
  },

  cardarine: {
    targetQuery: "cardarine",
    metaTitle: "Cardarine (GW501516): Effects, Cancer Data, Legality",
    metaDescription:
      "Cardarine (GW501516) is a discontinued PPAR-delta agonist, not a SARM. Why development stopped, the rodent cancer findings, and WADA status.",
    answer:
      "Cardarine (GW501516) is a PPAR-delta agonist developed in the 1990s for dyslipidaemia and metabolic disease, and frequently mislabelled online as a SARM — it is not one, and it does not bind androgen receptors. Development was halted after long-term rodent studies produced tumours across multiple organ systems at a range of doses. It is banned by WADA, is not approved for human use anywhere, and is sold only as an unregulated research chemical.",
    quickFacts: [
      { label: "Also called", value: "GW501516, GW-501,516, Endurobol" },
      { label: "Class", value: "PPAR-delta agonist — not a SARM" },
      { label: "Development status", value: "Discontinued; never approved for human use" },
      {
        label: "Key safety finding",
        value: "Multi-organ tumours in long-term rodent carcinogenicity studies",
      },
      {
        label: "Sport status",
        value: "WADA prohibited at all times (S4 hormone/metabolic modulators)",
      },
      {
        label: "Legal status",
        value: "Not a legal dietary supplement; research-chemical grey market",
      },
    ],
    extraFaq: [
      {
        q: "Is Cardarine a SARM?",
        a:
          "No. SARMs act on the androgen receptor; Cardarine activates PPAR-delta, a nuclear receptor that regulates fatty-acid metabolism in muscle. It is grouped with SARMs by retailers because it is sold through the same channels, but the mechanism, effects and risk profile are entirely different. " +
          EDU,
      },
      {
        q: "Why was GW501516 discontinued?",
        a:
          "GSK ended development after two-year rodent carcinogenicity studies showed dose-dependent tumours in multiple tissues, including liver, bladder, stomach, thyroid and skin. WADA issued a rare public health warning to athletes on the basis of those findings. " +
          EDU,
      },
      {
        q: "Does Cardarine show up on a drug test?",
        a:
          "Yes — WADA-accredited laboratories screen for GW501516 and its metabolites, and it has been the basis of numerous sanctions. It is prohibited in and out of competition, so tested athletes face a positive at any point in the year. " +
          EDU,
      },
      {
        q: "What does Cardarine claim to do?",
        a:
          'Animal work showed increased fatty-acid oxidation, shifted muscle fiber metabolism and improved running endurance, which is the origin of the "exercise in a pill" framing. No controlled human efficacy trials support those endurance claims, and the carcinogenicity data ended clinical evaluation before that question was answered. ' +
          EDU,
      },
    ],
  },

  niacinamide: {
    targetQuery: "niacinamide",
    metaTitle: "Niacinamide: Skin Benefits, Dosing and Safety",
    metaDescription:
      "Niacinamide is the amide form of vitamin B3, used topically for skin barrier and pigmentation and orally as a non-flushing B3. What the evidence shows.",
    answer:
      "Niacinamide (nicotinamide) is the amide form of vitamin B3. Unlike nicotinic acid it does not cause the niacin flush, and it does not lower cholesterol. Topically it is one of the best-supported cosmetic actives — dermatology trials report improved barrier function, reduced transepidermal water loss, less hyperpigmentation and reduced sebum. Orally it serves as a B3 source and is studied in dermatology for actinic keratosis and skin-cancer chemoprevention.",
    quickFacts: [
      { label: "Also called", value: "Nicotinamide, vitamin B3 amide" },
      { label: "Not the same as", value: 'Nicotinic acid ("flush niacin") — different effects' },
      { label: "Topical use", value: "Commonly formulated at 2–10% in serums and moisturisers" },
      {
        label: "Studied topically for",
        value: "Barrier repair, hyperpigmentation, sebum, redness",
      },
      {
        label: "Oral tolerable upper limit",
        value: "NIH ODS sets 35 mg/day UL for supplemental niacin forms",
      },
      {
        label: "Main oral caution",
        value: "Very high chronic intake has been linked to liver enzyme elevation",
      },
    ],
    extraFaq: [
      {
        q: "What is the difference between niacinamide and niacin?",
        a:
          "Both are forms of vitamin B3 and both convert to NAD+, but nicotinic acid (niacin) activates a receptor that causes flushing and lowers LDL, while niacinamide does neither. That makes niacinamide the preferred form when the goal is B3 status or skin effects rather than lipid change. " +
          EDU,
      },
      {
        q: "What does niacinamide do for skin?",
        a:
          "Controlled dermatology studies report increased ceramide production and barrier strength, less transepidermal water loss, reduced transfer of melanin to skin cells (so lighter pigmentation over weeks), reduced sebum output and calmer redness. It is also unusually tolerant of pairing with other actives. " +
          EDU,
      },
      {
        q: "Can you use niacinamide with vitamin C or retinol?",
        a:
          "Yes. The old claim that niacinamide neutralises vitamin C came from decades-old experiments run at high heat that converted niacinamide to nicotinic acid; at cosmetic formulation conditions this does not meaningfully occur. Pairing with retinol is common and often reduces retinoid irritation. " +
          EDU,
      },
      {
        q: "Is oral niacinamide safe long term?",
        a:
          "The NIH Office of Dietary Supplements sets a tolerable upper intake of 35 mg/day for supplemental B3 in adults, though far higher amounts have been used in dermatology trials under supervision. Sustained very high intake warrants liver-enzyme monitoring, and anyone on medication should confirm with a clinician. " +
          EDU,
      },
    ],
  },

  mirtazapine: {
    targetQuery: "mirtazapine drug class",
    metaTitle: "Mirtazapine Drug Class: NaSSA Antidepressant Guide",
    metaDescription:
      "Mirtazapine is a NaSSA — a noradrenergic and specific serotonergic antidepressant, not an SSRI. How its class explains sedation and appetite effects.",
    answer:
      "Mirtazapine belongs to the NaSSA class — noradrenergic and specific serotonergic antidepressants — and is often grouped as a tetracyclic antidepressant. It is not an SSRI. Instead of blocking reuptake, it antagonises presynaptic alpha-2 autoreceptors to increase norepinephrine and serotonin release, while blocking 5-HT2, 5-HT3 and H1 receptors. That receptor profile is why it sedates strongly, increases appetite, and rarely causes the sexual side effects or nausea typical of SSRIs.",
    quickFacts: [
      {
        label: "Drug class",
        value: "NaSSA — noradrenergic and specific serotonergic antidepressant",
      },
      { label: "Also classified as", value: "Tetracyclic antidepressant (TeCA)" },
      { label: "Brand name", value: "Remeron" },
      { label: "Key receptor actions", value: "Alpha-2 antagonist; 5-HT2, 5-HT3 and H1 blocker" },
      { label: "Signature effects", value: "Sedation, increased appetite and weight gain" },
      { label: "Half-life", value: "Roughly 20–40 hours — once daily, usually at night" },
    ],
    extraFaq: [
      {
        q: "Is mirtazapine an SSRI?",
        a:
          "No. SSRIs block the serotonin transporter; mirtazapine instead blocks presynaptic alpha-2 autoreceptors and several postsynaptic serotonin receptors. This is why it is often chosen when SSRIs have failed or when their nausea and sexual side effects are intolerable. " +
          EDU,
      },
      {
        q: "Why is mirtazapine more sedating at lower doses?",
        a:
          "At low doses the potent H1 antihistamine effect dominates, producing strong sedation. As the dose rises, noradrenergic activity increases and partly offsets that antihistamine sedation — which is the widely described clinical paradox of the drug. " +
          EDU,
      },
      {
        q: "Why does mirtazapine cause weight gain?",
        a:
          "Blockade of H1 and 5-HT2C receptors both increase appetite, and labeling lists increased appetite and weight gain among the most common effects. In some settings — older adults with poor appetite, or depression with weight loss — this is the reason it is chosen. " +
          EDU,
      },
      {
        q: "Can mirtazapine be combined with an SSRI?",
        a:
          'Combining them is a recognized strategy in treatment-resistant depression, sometimes called "California rocket fuel" when paired with venlafaxine, but it raises serotonin syndrome risk and must be prescriber-directed with monitoring. ' +
          EDU,
      },
    ],
  },

  exenatide: {
    targetQuery: "exenatide",
    metaTitle: "Exenatide (Byetta, Bydureon): Uses and Effects",
    metaDescription:
      "Exenatide is a GLP-1 receptor agonist for type 2 diabetes, available twice-daily or weekly. How it works and how it compares to newer GLP-1s.",
    answer:
      "Exenatide was the first GLP-1 receptor agonist approved for type 2 diabetes, derived from exendin-4 in Gila monster venom. It is sold as twice-daily Byetta and once-weekly extended-release Bydureon. It increases glucose-dependent insulin release, suppresses glucagon, slows gastric emptying and reduces appetite. It has largely been displaced in practice by semaglutide and tirzepatide, which deliver larger A1c and weight reductions.",
    quickFacts: [
      { label: "Brand names", value: "Byetta (twice daily), Bydureon BCise (weekly)" },
      { label: "Drug class", value: "GLP-1 receptor agonist (incretin mimetic)" },
      { label: "Origin", value: "Synthetic exendin-4, first identified in Gila monster venom" },
      { label: "Approved for", value: "Type 2 diabetes — not approved for weight loss" },
      { label: "Route", value: "Subcutaneous injection" },
      { label: "Boxed warning", value: "Thyroid C-cell tumours (extended-release form)" },
    ],
    extraFaq: [
      {
        q: "How does exenatide compare to semaglutide?",
        a:
          "Head-to-head trials such as SUSTAIN-3 found weekly semaglutide produced greater A1c and weight reduction than extended-release exenatide. Semaglutide also carries cardiovascular outcome data and a weight-management indication that exenatide does not, which is why prescribing has shifted. " +
          EDU,
      },
      {
        q: "What is the difference between Byetta and Bydureon?",
        a:
          "Both deliver exenatide. Byetta is immediate-release, injected twice daily before meals, and blunts post-meal glucose spikes more sharply. Bydureon is a microsphere extended-release formulation injected once weekly that gives steadier coverage and lowers fasting glucose more, with less injection burden but more injection-site nodules. " +
          EDU,
      },
      {
        q: "Does exenatide cause weight loss?",
        a:
          "Weight reduction is consistently seen in trials through slowed gastric emptying and appetite suppression, but it is typically more modest than with semaglutide or tirzepatide, and exenatide is not FDA-approved for weight management. " +
          EDU,
      },
      {
        q: "Who should not take exenatide?",
        a:
          "Labeling contraindicates the extended-release form in anyone with a personal or family history of medullary thyroid carcinoma or MEN2, and advises against use with a history of pancreatitis or severe gastrointestinal disease. Kidney impairment also restricts its use. " +
          EDU,
      },
    ],
  },

  hcg: {
    targetQuery: "human chorionic gonadotropin hormone",
    metaTitle: "hCG Hormone: What It Does, Uses and Testing",
    metaDescription:
      "Human chorionic gonadotropin (hCG) is the pregnancy hormone, also used clinically in fertility treatment and alongside testosterone therapy.",
    answer:
      "Human chorionic gonadotropin (hCG) is a glycoprotein hormone produced by the placenta shortly after implantation — it is the hormone pregnancy tests detect. Structurally it closely resembles luteinising hormone and binds the same receptor, which is why clinicians use it to trigger ovulation in fertility treatment, to treat certain forms of hypogonadism, and to maintain testicular function and fertility in men on testosterone therapy.",
    quickFacts: [
      { label: "Full name", value: "Human chorionic gonadotropin" },
      { label: "Produced by", value: "Placental syncytiotrophoblast after implantation" },
      { label: "Acts on", value: "The LH receptor — hence its clinical uses" },
      {
        label: "Clinical uses",
        value: "Ovulation trigger, hypogonadotropic hypogonadism, TRT adjunct",
      },
      { label: "Route", value: "Subcutaneous or intramuscular injection (prescription)" },
      { label: "Detected by", value: "Urine and serum pregnancy tests; also a tumour marker" },
    ],
    extraFaq: [
      {
        q: "What does hCG do in pregnancy?",
        a:
          "It signals the corpus luteum to keep producing progesterone until the placenta takes over around weeks 8–10, which maintains the uterine lining. Levels roughly double every 48–72 hours in early pregnancy and peak near weeks 8–11, which is why serial measurements are used to assess viability. " +
          EDU,
      },
      {
        q: "Why is hCG used with testosterone therapy?",
        a:
          "Exogenous testosterone suppresses LH, and without LH the testes shrink and sperm production falls. Because hCG binds the LH receptor, it keeps that signal running — endocrinology practice uses it alongside TRT to preserve testicular volume and fertility. It is prescription-only and requires monitoring. " +
          EDU,
      },
      {
        q: "Does the hCG diet work?",
        a:
          "No. Randomized trials comparing hCG with placebo alongside a very-low-calorie diet found no difference in weight loss, hunger or fat distribution; any loss came from the extreme calorie restriction. The FDA prohibits marketing hCG for weight loss and requires labeling saying it is ineffective for that purpose. " +
          EDU,
      },
      {
        q: "Can hCG be elevated without pregnancy?",
        a:
          "Yes. Certain germ cell and trophoblastic tumours secrete hCG, which is why it functions as a tumour marker, and low-level elevations occur in some pituitary conditions and in older age. Unexpected elevation needs clinical evaluation rather than self-interpretation. " +
          EDU,
      },
    ],
  },

  azithromycin: {
    targetQuery: "what is a z pack",
    metaTitle: "What Is a Z-Pak? Azithromycin Uses and Warnings",
    metaDescription:
      "A Z-Pak is a 5-day azithromycin course for bacterial infections. What it treats, why it keeps working after day 5, and heart-rhythm cautions.",
    answer:
      "A Z-Pak (Zithromax Z-Pak) is a five-day course of azithromycin, a macrolide antibiotic. Two tablets are taken on day one and one daily for four more days. It treats bacterial infections such as community-acquired pneumonia, pharyngitis, sinusitis, some skin infections and chlamydia. Because azithromycin has a very long tissue half-life, it keeps working for several days after the last tablet — and it does nothing at all for viral colds or flu.",
    quickFacts: [
      { label: "Active drug", value: "Azithromycin" },
      { label: "Drug class", value: "Macrolide antibiotic" },
      { label: "Typical course", value: "5 days — a loading day then 4 daily tablets" },
      { label: "Treats", value: "Bacterial respiratory, skin, ear and some STIs" },
      {
        label: "Tissue half-life",
        value: "Roughly 68 hours — activity persists after the last dose",
      },
      { label: "Key caution", value: "QT prolongation; FDA warning on abnormal heart rhythm risk" },
    ],
    extraFaq: [
      {
        q: "Does a Z-Pak treat a cold or the flu?",
        a:
          "No. Colds, flu and most sore throats and bronchitis are viral, and azithromycin has no activity against viruses. CDC antibiotic-stewardship guidance specifically flags Z-Paks for viral respiratory illness as a major driver of unnecessary prescribing and resistance. " +
          EDU,
      },
      {
        q: "Why does a Z-Pak keep working after 5 days?",
        a:
          "Azithromycin concentrates inside tissue and white blood cells and clears slowly, with a terminal half-life around 68 hours. Effective tissue levels persist for several days after the final tablet, which is why the course is short compared with other antibiotics. " +
          EDU,
      },
      {
        q: "What are the heart risks of azithromycin?",
        a:
          "The FDA issued a safety communication about QT-interval prolongation and rare fatal arrhythmia, most relevant to people with existing QT prolongation, low potassium or magnesium, significant bradycardia, or who take other QT-prolonging drugs. Those risks should be reviewed with the prescriber. " +
          EDU,
      },
      {
        q: "Can you drink alcohol on a Z-Pak?",
        a:
          "Alcohol does not directly block azithromycin's action the way it does with metronidazole, but it can worsen the nausea, stomach upset and diarrhea the antibiotic already causes, and it interferes with rest and recovery. " +
          EDU,
      },
    ],
  },

  inositol: {
    targetQuery: "inositol",
    metaTitle: "Inositol: PCOS, Anxiety and Myo vs D-Chiro Ratios",
    metaDescription:
      "Inositol is a sugar alcohol studied for PCOS, insulin sensitivity and anxiety. What myo-inositol does and why the 40:1 ratio is used.",
    answer:
      "Inositol is a naturally occurring sugar alcohol that acts as a second messenger for insulin, FSH and serotonin signaling. Myo-inositol is the dominant form in the body; D-chiro-inositol is a converted derivative. It has the strongest evidence base in PCOS — where trials report improved insulin sensitivity, restored ovulation and lower androgens — with additional research in gestational diabetes and anxiety disorders.",
    quickFacts: [
      { label: "What it is", value: "Sugar alcohol / carbocyclic polyol, once called vitamin B8" },
      { label: "Main forms", value: "Myo-inositol (MI) and D-chiro-inositol (DCI)" },
      {
        label: "Common ratio",
        value: "40:1 MI:DCI — the physiological plasma ratio used in PCOS trials",
      },
      {
        label: "Studied for",
        value: "PCOS, insulin sensitivity, gestational diabetes, anxiety, sleep",
      },
      {
        label: "Commonly studied at",
        value: "2–4 g/day of myo-inositol in PCOS trials — needs vary",
      },
      { label: "Tolerability", value: "Generally well tolerated; GI upset at higher intakes" },
    ],
    extraFaq: [
      {
        q: "What is the difference between myo-inositol and D-chiro-inositol?",
        a:
          "Myo-inositol is the abundant form, central to FSH signaling and egg quality; D-chiro-inositol is produced from it by an insulin-dependent enzyme and is more involved in glycogen storage and androgen production. Ovarian tissue needs mostly myo-inositol, which is why excess D-chiro can be counterproductive there. " +
          EDU,
      },
      {
        q: "Why is the 40:1 inositol ratio used for PCOS?",
        a:
          "40:1 mirrors the myo- to D-chiro ratio found in human plasma, and trials using that ratio reported better ovulation and metabolic outcomes than D-chiro-heavy formulas. It has become the default composition in PCOS supplement research. " +
          EDU,
      },
      {
        q: "How long does inositol take to work for PCOS?",
        a:
          "Most PCOS trials measure outcomes at three to six months, with insulin markers often shifting earlier than cycle regularity. Reviews consistently note that benefits accrue gradually rather than within weeks. " +
          EDU,
      },
      {
        q: "Does inositol help with anxiety?",
        a:
          "Small randomized trials, mostly in panic disorder and OCD and using high intakes, reported reductions in panic frequency comparable to fluvoxamine in one crossover study. The evidence base is much thinner than for PCOS, and results should be treated as preliminary. " +
          EDU,
      },
    ],
  },

  lovastatin: {
    targetQuery: "lovastatin",
    metaTitle: "Lovastatin: Uses, Timing, Side Effects and Grapefruit",
    metaDescription:
      "Lovastatin is a statin that lowers LDL cholesterol. Why it is taken at night, common muscle side effects, and the grapefruit interaction.",
    answer:
      "Lovastatin (Mevacor, Altoprev) was the first statin approved in the United States. It inhibits HMG-CoA reductase, the rate-limiting enzyme in liver cholesterol synthesis, which lowers LDL cholesterol and cardiovascular risk. Because that enzyme is most active overnight and lovastatin is short-acting, labeling directs the immediate-release form to be taken with the evening meal.",
    quickFacts: [
      { label: "Brand names", value: "Mevacor, Altoprev (extended-release)" },
      { label: "Drug class", value: "HMG-CoA reductase inhibitor (statin)" },
      { label: "Prescribed for", value: "High LDL cholesterol and cardiovascular risk reduction" },
      {
        label: "Timing",
        value: "Immediate-release with the evening meal; food improves absorption",
      },
      {
        label: "Potency",
        value: "Lower-intensity statin compared with atorvastatin or rosuvastatin",
      },
      {
        label: "Key interaction",
        value: "CYP3A4 — grapefruit, some antifungals, macrolides, HIV drugs",
      },
    ],
    extraFaq: [
      {
        q: "Why is lovastatin taken at night?",
        a:
          "The liver makes most of its cholesterol overnight, and lovastatin has a short half-life, so evening dosing lines the drug up with peak enzyme activity. Higher-potency, longer-acting statins such as atorvastatin and rosuvastatin do not require this. " +
          EDU,
      },
      {
        q: "Why can't you have grapefruit with lovastatin?",
        a:
          "Grapefruit inhibits intestinal CYP3A4, the enzyme that clears lovastatin, and can raise blood levels several-fold — increasing the risk of muscle injury and rhabdomyolysis. Lovastatin and simvastatin are the statins most affected; pravastatin and rosuvastatin are largely unaffected. " +
          EDU,
      },
      {
        q: "Does lovastatin cause muscle pain?",
        a:
          "Muscle aching is the most frequently reported statin complaint, though blinded trials find rates close to placebo for most people. Serious rhabdomyolysis is rare but real, and any dark urine with severe muscle pain and weakness warrants urgent evaluation. " +
          EDU,
      },
      {
        q: "How is lovastatin different from atorvastatin?",
        a:
          "Atorvastatin is a higher-intensity, longer-acting statin that lowers LDL more per dose, can be taken at any time of day, and is less sensitive to grapefruit. Lovastatin remains in use as an older, lower-cost, moderate-intensity option. " +
          EDU,
      },
    ],
  },

  eaas: {
    targetQuery: "eaas",
    metaTitle: "EAAs: Essential Amino Acids vs BCAAs Explained",
    metaDescription:
      "EAAs are the nine essential amino acids the body cannot make. How they compare with BCAAs and whey, and when supplementing makes sense.",
    answer:
      "EAAs are the nine essential amino acids — histidine, isoleucine, leucine, lysine, methionine, phenylalanine, threonine, tryptophan and valine — that the body cannot synthesize and must obtain from food. In sports nutrition research, supplying all nine stimulates muscle protein synthesis, whereas BCAAs alone supply only three and cannot sustain new muscle protein. Anyone already hitting adequate daily protein gets little additional benefit.",
    quickFacts: [
      { label: "What they are", value: "The nine amino acids the body cannot produce" },
      { label: "Includes", value: "Leucine, isoleucine, valine (the BCAAs) plus six others" },
      {
        label: "Studied for",
        value: "Muscle protein synthesis, training in a fasted state, low-protein diets",
      },
      {
        label: "Commonly studied at",
        value: "6–15 g per serving in acute MPS trials — needs vary",
      },
      {
        label: "Food equivalent",
        value: "Whey, eggs, dairy and meat already supply the full profile",
      },
      { label: "Key caveat", value: "Redundant if total daily protein intake is already adequate" },
    ],
    extraFaq: [
      {
        q: "What is the difference between EAAs and BCAAs?",
        a:
          "BCAAs are three of the nine EAAs. Leucine triggers the mTOR signal that starts muscle protein synthesis, but building protein requires all nine amino acids as raw material. Isotope studies show BCAAs alone raise the signal without sustaining synthesis, which is why EAAs have largely replaced BCAAs in the research literature. " +
          EDU,
      },
      {
        q: "Are EAAs better than whey protein?",
        a:
          "Whey already contains all nine EAAs and is generally cheaper per gram of amino acid. Free-form EAAs absorb faster and carry almost no calories, which is why they are used around fasted training or for people with poor appetite or digestive limits — but for most trainees whey delivers the same outcome. " +
          EDU,
      },
      {
        q: "Do you need EAAs if you eat enough protein?",
        a:
          "Generally no. Position stands from bodies such as the ISSN emphasize total daily protein and per-meal leucine content as the drivers of muscle gain; EAA supplements add convenience rather than a distinct effect once intake is adequate. " +
          EDU,
      },
      {
        q: "When is the best time to take EAAs?",
        a:
          "Acute trials most often use them before or during training, particularly when training fasted, since free-form amino acids appear in blood within about 15–30 minutes. Total daily intake still outweighs timing in longer-term studies. " +
          EDU,
      },
    ],
  },

  armodafinil: {
    targetQuery: "armodafinil",
    metaTitle: "Armodafinil (Nuvigil): Uses, Duration vs Modafinil",
    metaDescription:
      "Armodafinil is a prescription wakefulness agent for narcolepsy, sleep apnea and shift work disorder. How it differs from modafinil.",
    answer:
      "Armodafinil (Nuvigil) is a prescription wakefulness-promoting agent approved for excessive sleepiness from narcolepsy, obstructive sleep apnea and shift work disorder. It is the longer-lasting R-enantiomer of modafinil, so a given milligram amount produces higher and more sustained afternoon blood levels. It is a Schedule IV controlled substance and carries a warning for serious rash including Stevens-Johnson syndrome.",
    quickFacts: [
      { label: "Brand name", value: "Nuvigil" },
      {
        label: "Relationship to modafinil",
        value: "The purified R-enantiomer — longer-acting half",
      },
      { label: "Approved for", value: "Narcolepsy, OSA-related sleepiness, shift work disorder" },
      { label: "Schedule", value: "DEA Schedule IV controlled substance" },
      { label: "Half-life", value: "Roughly 15 hours — higher late-day levels than modafinil" },
      { label: "Serious warning", value: "Rare severe rash (SJS/TEN); stop at first sign of rash" },
    ],
    extraFaq: [
      {
        q: "What is the difference between armodafinil and modafinil?",
        a:
          "Modafinil is a 50:50 mix of R- and S-enantiomers; the S half clears quickly while the R half persists. Armodafinil is the R half alone, so it produces a flatter, longer plasma curve with higher afternoon concentrations. Milligram amounts are therefore not interchangeable. " +
          EDU,
      },
      {
        q: "Is armodafinil a stimulant?",
        a:
          "It is classified as a wakefulness-promoting agent rather than a classical stimulant. Its exact mechanism is not fully established, but it involves weak dopamine transporter inhibition plus orexin and histamine pathway effects, producing less peripheral cardiovascular stimulation and less euphoria than amphetamines. " +
          EDU,
      },
      {
        q: "Does armodafinil interact with birth control?",
        a:
          "Yes — this is a clinically important one. Armodafinil induces CYP3A4, which can reduce the effectiveness of hormonal contraceptives. Labeling advises an alternative or additional method during treatment and for a month after stopping. " +
          EDU,
      },
      {
        q: "How long does armodafinil last?",
        a:
          "With a half-life around 15 hours, effects commonly extend 10–14 hours, which is why it is taken in the morning for daytime sleepiness or roughly an hour before a shift for shift work disorder. Late dosing frequently disrupts night-time sleep. " +
          EDU,
      },
    ],
  },

  tamoxifen: {
    targetQuery: "tamoxifen",
    metaTitle: "Tamoxifen (Nolvadex): Uses, Side Effects, Risks",
    metaDescription:
      "Tamoxifen is a selective estrogen receptor modulator used in breast cancer treatment and prevention. What it does, how long it is taken, and its risks.",
    answer:
      "Tamoxifen (sold as Nolvadex) is a selective estrogen receptor modulator, or SERM. It blocks estrogen receptors in breast tissue while acting estrogen-like in bone and the uterus, which is why it is prescribed for hormone receptor-positive breast cancer and for risk reduction in people at high risk. Standard courses run five to ten years. Its best-known risks are hot flashes, blood clots and, less commonly, uterine cancer, so it is a prescription-only drug requiring monitoring.",
    quickFacts: [
      { label: "Drug class", value: "Selective estrogen receptor modulator (SERM)" },
      { label: "Also sold as", value: "Nolvadex, Soltamox (oral solution)" },
      { label: "Main uses", value: "Hormone receptor-positive breast cancer; risk reduction" },
      { label: "Common forms", value: "Oral tablet, oral solution" },
      {
        label: "Half-life",
        value: "Roughly 5–7 days for tamoxifen; longer for its active metabolite",
      },
      { label: "Typical course", value: "5–10 years of daily use in adjuvant therapy" },
      { label: "Status", value: "Prescription-only in the U.S., U.K. and EU" },
    ],
    extraFaq: [
      {
        q: "What is tamoxifen used for?",
        a:
          "Tamoxifen is prescribed for hormone receptor-positive breast cancer — as adjuvant therapy after surgery, for metastatic disease, and for ductal carcinoma in situ — and to reduce breast cancer risk in people identified as high risk. It is also used off-label in some other estrogen-driven conditions. Because it changes hormone signaling throughout the body, it is only used under specialist supervision. " +
          EDU,
      },
      {
        q: "How does tamoxifen work?",
        a:
          "Tamoxifen is converted in the liver, largely by the CYP2D6 enzyme, into endoxifen and other active metabolites that bind estrogen receptors. In breast tissue these metabolites act as antagonists, blocking estrogen from driving tumour growth. In bone and the uterine lining the same drug behaves more like an agonist, which explains both its bone-preserving effect and its uterine risks. " +
          EDU,
      },
      {
        q: "What are the most common tamoxifen side effects?",
        a:
          "The most frequently reported effects are hot flashes, night sweats, vaginal dryness or discharge, irregular periods, mood changes and fatigue. Less common but more serious risks include deep vein thrombosis, pulmonary embolism, stroke, cataracts and endometrial changes including uterine cancer. Any unusual vaginal bleeding, leg swelling or sudden shortness of breath should be reported urgently. " +
          EDU,
      },
      {
        q: "How long do people take tamoxifen?",
        a:
          "Adjuvant courses have historically run five years, and trials such as ATLAS and aTTom showed that extending to ten years further reduced recurrence and breast cancer mortality in some patients. The choice between five and ten years depends on recurrence risk, menopausal status and how well side effects are tolerated, and is made with the treating oncologist. " +
          EDU,
      },
      {
        q: "Do antidepressants or supplements interact with tamoxifen?",
        a:
          "Yes. Strong CYP2D6 inhibitors — including paroxetine and fluoxetine — can reduce conversion of tamoxifen into its active metabolite, and clinicians often prefer weaker inhibitors such as venlafaxine or citalopram when an antidepressant is needed. St John's wort and some other supplements also alter tamoxifen metabolism. Any new medicine or supplement should be checked with the prescriber or pharmacist first. " +
          EDU,
      },
      {
        q: "Is tamoxifen a chemotherapy drug?",
        a:
          "No. Tamoxifen is hormone (endocrine) therapy, not cytotoxic chemotherapy. It works by interfering with estrogen signaling rather than by killing rapidly dividing cells, so it does not cause the hair loss and marrow suppression associated with chemotherapy. It may be given after chemotherapy, alongside other treatments, or on its own. " +
          EDU,
      },
      {
        q: "Is tamoxifen safe to use for bodybuilding or gynecomastia?",
        a:
          "Tamoxifen is sometimes taken without a prescription in bodybuilding contexts to manage estrogen-related gynecomastia, but this is unapproved, unsupervised use of a drug with clot, stroke and eye risks, and it is a banned substance under WADA rules. Gynecomastia has several causes that need diagnosis rather than self-treatment, so this should be handled by a clinician. " +
          EDU,
      },
    ],
  },

  survodutide: {
    targetQuery: "survodutide",
    metaTitle: "Survodutide: How It Works, Trial Results, Status",
    metaDescription:
      "Survodutide is an investigational glucagon/GLP-1 dual agonist from Boehringer Ingelheim. Mechanism, phase 2 weight-loss results and approval status.",
    answer:
      "Survodutide (BI 456906) is an investigational once-weekly injectable that activates both the glucagon receptor and the GLP-1 receptor. The GLP-1 arm reduces appetite and slows gastric emptying, while the glucagon arm is intended to raise energy expenditure and act on liver fat. In phase 2 obesity trials reported in 2024, participants lost roughly 19% of body weight at 46 weeks on the highest arm. It is not approved by the FDA or EMA and remains in phase 3 testing.",
    quickFacts: [
      { label: "Also known as", value: "BI 456906" },
      { label: "Class", value: "Dual glucagon receptor / GLP-1 receptor agonist" },
      { label: "Developer", value: "Boehringer Ingelheim with Zealand Pharma" },
      { label: "Route", value: "Once-weekly subcutaneous injection (trial protocols)" },
      { label: "Status", value: "Investigational — phase 3; not FDA or EMA approved" },
      { label: "Studied in", value: "Obesity, type 2 diabetes and MASH (liver fat)" },
    ],
    extraFaq: [
      {
        q: "Is survodutide approved by the FDA?",
        a:
          "No. As of 2026 survodutide is investigational and has not been approved by the FDA or the EMA for any indication. It is being evaluated in the phase 3 SYNCHRONIZE program for obesity and related conditions, so the only legitimate access is through an enrolled clinical trial. " +
          EDU,
      },
      {
        q: "How is survodutide different from tirzepatide or semaglutide?",
        a:
          "Semaglutide targets the GLP-1 receptor alone; tirzepatide targets GLP-1 plus GIP. Survodutide pairs GLP-1 with glucagon receptor activation, a mechanism aimed at increasing energy expenditure and reducing liver fat in addition to appetite suppression. Head-to-head trials against tirzepatide have not been published, so cross-trial comparisons are not reliable. " +
          EDU,
      },
      {
        q: "How much weight did people lose on survodutide in trials?",
        a:
          "In a phase 2 trial published in 2024, adults with obesity lost about 19% of body weight on average after 46 weeks on the highest dose arm, versus roughly 2% on placebo, with dose escalation still ongoing at the end of the study. Phase 3 results will determine what the approved profile looks like. " +
          EDU,
      },
      {
        q: "What are the reported side effects of survodutide?",
        a:
          "Trial reports describe a gastrointestinal profile similar to other incretin drugs — nausea, vomiting, diarrhea and constipation — most often during dose escalation, and these accounted for most discontinuations. Because the glucagon arm can affect heart rate and liver parameters, trial protocols monitor those specifically. " +
          EDU,
      },
    ],
  },

  "boldenone-undecylenate": {
    targetQuery: "boldenone undecylenate",
    metaTitle: "Boldenone Undecylenate (Equipoise): Effects, Risks",
    metaDescription:
      "Boldenone undecylenate is a veterinary anabolic steroid sold as Equipoise. What it is, its long ester half-life, legal status and documented risks.",
    answer:
      "Boldenone undecylenate is an injectable anabolic-androgenic steroid developed for veterinary use, best known under the brand name Equipoise. The long undecylenate ester releases boldenone slowly, giving an elimination half-life measured in weeks and detection windows of several months. It has no approved human medical use in the United States, is a Schedule III controlled substance, and is prohibited in sport by WADA. Documented risks mirror other AAS: suppressed natural testosterone, adverse lipid shifts, raised hematocrit and cardiovascular strain.",
    quickFacts: [
      { label: "Brand name", value: "Equipoise (veterinary)" },
      { label: "Class", value: "Injectable anabolic-androgenic steroid (testosterone derivative)" },
      { label: "Ester", value: "Undecylenate — slow release, long-acting" },
      { label: "Half-life", value: "Roughly 14 days; detectable for months" },
      { label: "Legal status", value: "DEA Schedule III in the U.S.; no approved human use" },
      { label: "Sport status", value: "Prohibited at all times under the WADA code" },
    ],
    extraFaq: [
      {
        q: "Is boldenone undecylenate legal for humans?",
        a:
          "No. Boldenone undecylenate is approved only as a veterinary product and is a Schedule III controlled substance in the United States, so possession or supply for human use without a prescription is illegal. Because human-grade product does not exist, material sold for that purpose comes from veterinary or unregulated sources with no purity guarantee. " +
          EDU,
      },
      {
        q: "How long does boldenone stay in your system?",
        a:
          "The undecylenate ester releases very slowly, giving an elimination half-life of roughly two weeks, and metabolites have been reported in anti-doping testing for five months or longer after the last injection. That long tail is why it is one of the more frequently caught substances in drug-tested sport. " +
          EDU,
      },
      {
        q: "What are the main risks of boldenone undecylenate?",
        a:
          "Like other anabolic-androgenic steroids it suppresses endogenous testosterone production, worsens the HDL-to-LDL ratio, can raise hematocrit and blood pressure, and carries cardiovascular and mood risks. Boldenone also converts to estrogenic metabolites, so gynecomastia and fluid retention are reported. None of these are monitored when the drug is used outside clinical supervision. " +
          EDU,
      },
      {
        q: "How does boldenone compare with testosterone?",
        a:
          "Boldenone is a testosterone derivative with a modified double bond that reduces its androgenic activity relative to its anabolic activity on paper, and it aromatises to estrogen at a lower rate than testosterone. In practice both are AAS with overlapping suppression, lipid and cardiovascular consequences, and only testosterone has legitimate approved human indications. " +
          EDU,
      },
    ],
  },

  dihexa: {
    targetQuery: "dihexa",
    metaTitle: "Dihexa: What It Is, Research Status and Risks",
    metaDescription:
      "Dihexa is an experimental angiotensin IV-derived peptide studied for synapse formation. What the research shows and why it is not an approved drug.",
    answer:
      "Dihexa (N-hexanoic-Tyr-Ile-(6) aminohexanoic amide) is an experimental small peptide derived from angiotensin IV, studied in preclinical models for its ability to promote synapse formation through the hepatocyte growth factor / c-Met pathway. Interest comes from rodent work in Alzheimer's and Parkinson's models. It has never completed human clinical trials, is not approved by any regulator, and is sold only as an unregulated research chemical, so its human safety profile — including any effect on tumour-relevant growth signaling — is unknown.",
    quickFacts: [
      { label: "Type", value: "Synthetic angiotensin IV-derived peptidomimetic" },
      {
        label: "Proposed mechanism",
        value: "Potentiates hepatocyte growth factor / c-Met signaling",
      },
      { label: "Evidence base", value: "Rodent and in-vitro studies only" },
      { label: "Regulatory status", value: "Not approved; no completed human trials" },
      { label: "Availability", value: "Sold as a research chemical, not a medicine" },
      { label: "Key unknown", value: "Human dosing, long-term safety and cancer-risk signals" },
    ],
    extraFaq: [
      {
        q: "Is dihexa approved or safe for human use?",
        a:
          "No regulator has approved dihexa for any indication, and there are no published completed human clinical trials establishing a safe exposure. Everything circulating about human use comes from self-experimentation reports rather than controlled data, so both effectiveness and safety in people are unestablished. " +
          EDU,
      },
      {
        q: "What does dihexa actually do in research studies?",
        a:
          "In rodent and cell studies dihexa augments hepatocyte growth factor signaling at the c-Met receptor, which increased dendritic spine and synapse formation and improved performance in memory tasks in impaired animals. These are preclinical findings in models, and effects in animal cognition models frequently fail to reproduce in humans. " +
          EDU,
      },
      {
        q: "Why is dihexa considered risky?",
        a:
          "The c-Met pathway it amplifies is also involved in cell proliferation and is implicated in several cancers, so chronic activation is a theoretical oncological concern that no human study has ruled out. On top of that, research-chemical supply means no purity, sterility or content verification. " +
          EDU,
      },
    ],
  },

  "d-ribose": {
    targetQuery: "d-ribose",
    metaTitle: "D-Ribose: Benefits, Evidence, Dosing and Safety",
    metaDescription:
      "D-ribose is a five-carbon sugar used to support ATP regeneration. What the research shows in heart failure and fatigue, plus dosing and safety notes.",
    answer:
      "D-ribose is a naturally occurring five-carbon sugar that sits at the start of the pathway your cells use to rebuild ATP, the molecule that powers muscle contraction. Because ischaemic and failing heart tissue regenerates ATP slowly, supplemental ribose has been studied in heart failure, coronary artery disease, fibromyalgia and chronic fatigue, typically at 5 g taken up to three times daily. Trials are small and results mixed; it does not improve performance in healthy trained athletes in most studies.",
    quickFacts: [
      { label: "Type", value: "Pentose (five-carbon) monosaccharide" },
      { label: "Role", value: "Rate-limiting substrate for ATP and nucleotide synthesis" },
      { label: "Common study amount", value: "5 g, one to three times daily" },
      { label: "Studied in", value: "Heart failure, ischaemia, fibromyalgia, chronic fatigue" },
      {
        label: "Common side effects",
        value: "GI upset and transient low blood sugar on an empty stomach",
      },
      { label: "Regulatory status", value: "Sold as a dietary supplement, not a drug" },
    ],
    extraFaq: [
      {
        q: "Does d-ribose actually improve energy?",
        a:
          "Evidence is strongest — though still limited to small trials — in people whose tissue ATP is depleted, such as heart failure or ischaemia, where ribose improved some measures of diastolic function and quality of life. In healthy, well-trained people most controlled studies find no performance or energy benefit, because ATP regeneration is not the limiting factor. " +
          EDU,
      },
      {
        q: "Does d-ribose raise blood sugar?",
        a:
          "D-ribose is a sugar, but unlike glucose it tends to lower blood glucose transiently because it stimulates insulin release while contributing little to circulating glucose. That is why lightheadedness or hypoglycaemic symptoms are reported when it is taken on an empty stomach, and why people on diabetes medication should clear it with a clinician first. " +
          EDU,
      },
      {
        q: "When should you take d-ribose?",
        a:
          "Study protocols usually split the total across the day and take it with food or a carbohydrate source to blunt the transient drop in blood sugar; athletes in trials often took a dose around training. Single large amounts on an empty stomach are the most common cause of the nausea and diarrhea reported. " +
          EDU,
      },
    ],
  },

  epithalon: {
    targetQuery: "epithalon",
    metaTitle: "Epithalon (Epitalon): Evidence, Claims and Status",
    metaDescription:
      "Epithalon is a synthetic tetrapeptide marketed for telomerase and longevity claims. What the research actually shows and its regulatory status.",
    answer:
      "Epithalon (also spelled epitalon, sequence Ala-Glu-Asp-Gly) is a synthetic tetrapeptide derived from a pineal gland extract, developed in Russia and marketed on claims that it activates telomerase and extends lifespan. The supporting literature is mostly older Russian animal work and small non-blinded human reports, largely from a single research group, with little independent replication. It is not approved by the FDA or EMA, is sold as an unregulated research chemical, and its long-term human safety is unestablished.",
    quickFacts: [
      { label: "Also spelled", value: "Epitalon, epithalone" },
      { label: "Sequence", value: "Ala-Glu-Asp-Gly (AEDG tetrapeptide)" },
      { label: "Origin", value: "Derived from the pineal peptide preparation epithalamin" },
      {
        label: "Claimed mechanism",
        value: "Telomerase activation and pineal/melatonin regulation",
      },
      { label: "Evidence quality", value: "Mostly animal and small unblinded human studies" },
      { label: "Regulatory status", value: "Not approved by FDA or EMA; research chemical only" },
    ],
    extraFaq: [
      {
        q: "Does epithalon really lengthen telomeres?",
        a:
          "Cell-culture and rodent studies from the originating research group reported telomerase activation and longer telomeres, but these results have not been independently replicated in rigorous human trials. Telomere length is also a marker with a complicated relationship to health outcomes, so lengthening it is not by itself evidence of a longevity benefit. " +
          EDU,
      },
      {
        q: "Is epithalon approved or legal?",
        a:
          "Epithalon has no FDA or EMA approval for any indication and is not a recognized dietary supplement ingredient in the U.S., so it is sold labeled for research use only. That means no manufacturing oversight, no purity guarantee and no sterility assurance for material intended for injection. " +
          EDU,
      },
      {
        q: "What are the side effects of epithalon?",
        a:
          "Published reports describe few adverse effects, but they come from small, short, mostly unblinded studies that are not designed to detect uncommon or delayed harms, so the absence of reported effects is weak evidence of safety. Injection-related risks such as infection and reaction at the site apply to any unregulated injectable. " +
          EDU,
      },
    ],
  },

  capromorelin: {
    targetQuery: "capromorelin",
    metaTitle: "Capromorelin: Ghrelin Agonist Uses and Status",
    metaDescription:
      "Capromorelin is an FDA-approved veterinary appetite stimulant and ghrelin receptor agonist. How it works, its approvals, and its human trial history.",
    answer:
      "Capromorelin is an orally active ghrelin receptor (GHS-R1a) agonist that mimics ghrelin to stimulate appetite and trigger growth hormone release. It is FDA-approved in veterinary medicine as Entyce for appetite stimulation in dogs and Elura for weight management in cats with chronic kidney disease. In humans it reached clinical trials for age-related functional decline, where it raised IGF-1 and lean mass, but development was discontinued and it has no human approval.",
    quickFacts: [
      { label: "Class", value: "Ghrelin receptor (GHS-R1a) agonist / growth hormone secretagogue" },
      { label: "Brand names", value: "Entyce (dogs), Elura (cats) — veterinary" },
      { label: "Route", value: "Oral solution" },
      {
        label: "Approved use",
        value: "Appetite stimulation in dogs; weight management in CKD cats",
      },
      {
        label: "Human status",
        value: "Trialled for age-related decline; development discontinued",
      },
      { label: "Typical effects", value: "Increased food intake, GH and IGF-1 release" },
    ],
    extraFaq: [
      {
        q: "Is capromorelin approved for humans?",
        a:
          "No. Capromorelin's only approvals are veterinary. It was studied in human trials for sarcopenia and age-related functional decline, where it increased IGF-1 and lean body mass over twelve months, but the program did not continue to approval, so there is no human label, indication or dosing guidance. " +
          EDU,
      },
      {
        q: "How does capromorelin work?",
        a:
          "It binds the growth hormone secretagogue receptor GHS-R1a in the hypothalamus and pituitary — the same receptor the hunger hormone ghrelin uses — which drives appetite signaling and a pulse of growth hormone, followed by a rise in IGF-1. That dual effect is why it is used to restore food intake in animals that will not eat. " +
          EDU,
      },
      {
        q: "What are capromorelin's side effects?",
        a:
          "In veterinary labeling the most common effects are vomiting, hypersalivation and diarrhea, with transient increases in blood glucose reported. Growth hormone secretagogues as a class can also cause fluid retention, joint discomfort and reduced insulin sensitivity, which is part of why human development of several of them stalled. " +
          EDU,
      },
    ],
  },

  "s-23": {
    targetQuery: "s-23 sarm",
    metaTitle: "S-23: What It Is, Research Findings and Risks",
    metaDescription:
      "S-23 is an investigational non-steroidal SARM studied as a male contraceptive candidate. What the animal research shows and why it is not approved.",
    answer:
      "S-23 is an investigational non-steroidal selective androgen receptor modulator originally studied as a candidate male hormonal contraceptive, because in rodents it suppressed sperm production reversibly while maintaining muscle and bone mass. It has never been approved for human use, has no published human clinical trials, and is prohibited at all times under the WADA code. Products sold online are unregulated research chemicals; analyses of the SARM market repeatedly find mislabelled or contaminated contents.",
    quickFacts: [
      { label: "Class", value: "Non-steroidal selective androgen receptor modulator (SARM)" },
      { label: "Original purpose", value: "Male hormonal contraceptive candidate" },
      { label: "Evidence base", value: "Rodent studies; no published human trials" },
      {
        label: "Regulatory status",
        value: "Not approved; not a lawful dietary supplement ingredient",
      },
      { label: "Sport status", value: "Prohibited at all times under the WADA code" },
      { label: "Known effects in animals", value: "Suppressed spermatogenesis and LH/FSH" },
    ],
    extraFaq: [
      {
        q: "Is S-23 legal to buy or use?",
        a:
          "S-23 is not approved as a drug and the FDA has stated SARMs are not lawful dietary supplement ingredients, so products are sold under research-chemical labeling. Selling them for human consumption has drawn FDA warning letters, and possession rules vary by country. Anti-doping bodies treat any detected SARM as a violation. " +
          EDU,
      },
      {
        q: "What did S-23 research actually find?",
        a:
          "In rats, S-23 bound the androgen receptor with high affinity, preserved muscle and prostate tissue and suppressed luteinising and follicle-stimulating hormone enough to halt sperm production, with fertility returning after withdrawal. That contraceptive suppression is the same mechanism that makes it hormonally disruptive when taken for physique purposes. " +
          EDU,
      },
      {
        q: "What are the risks of taking S-23?",
        a:
          "Because no human safety study exists, the risks are inferred from the SARM class: suppression of natural testosterone requiring recovery time, unfavourable HDL changes, and liver enzyme elevations, with case reports of drug-induced liver injury following SARM use. Unregulated sourcing adds the separate risk of getting a different or contaminated compound entirely. " +
          EDU,
      },
    ],
  },

  "zinc-bisglycinate": {
    targetQuery: "zinc bisglycinate",
    metaTitle: "Zinc Bisglycinate: Absorption, Dosing and Safety",
    metaDescription:
      "Zinc bisglycinate is a chelated zinc form studied for better absorption and gentler digestion. How it compares with other zinc salts, plus safe limits.",
    answer:
      "Zinc bisglycinate (zinc chelated to two glycine molecules) is a supplemental form of zinc chosen for absorption and tolerability. Chelation lets it bypass some of the competition and phytate binding that limits ionic salts like zinc oxide, and comparison studies generally show higher plasma zinc responses and less nausea than oxide or sulfate. The adult RDA is 8–11 mg of elemental zinc daily, and the tolerable upper intake level is 40 mg from all sources combined.",
    quickFacts: [
      { label: "Form", value: "Zinc chelated to two glycine molecules (bisglycinate)" },
      {
        label: "Why it is used",
        value: "Higher absorption and less stomach upset than zinc oxide",
      },
      { label: "Adult RDA", value: "8 mg/day for women, 11 mg/day for men (elemental zinc)" },
      { label: "Upper limit", value: "40 mg/day elemental zinc from all sources (US UL)" },
      { label: "Best taken", value: "With food if nausea occurs; away from high-phytate meals" },
      {
        label: "Key interactions",
        value: "Copper, iron, calcium, tetracycline and quinolone antibiotics",
      },
    ],
    extraFaq: [
      {
        q: "Is zinc bisglycinate better absorbed than zinc picolinate or oxide?",
        a:
          "Zinc oxide is the clear laggard — it is poorly soluble and absorbs least. Bisglycinate and picolinate both outperform it in comparison studies, and bisglycinate has additional data showing higher plasma zinc and better tolerability than sulfate. Head-to-head evidence between bisglycinate and picolinate is thin, so the practical difference between those two is small. " +
          EDU,
      },
      {
        q: "How much zinc bisglycinate is safe per day?",
        a:
          "Safety limits are set on elemental zinc, not on the total weight of the chelate, so check the elemental figure on the label. The US tolerable upper intake level is 40 mg of elemental zinc a day from all sources; sustained intake above that risks copper deficiency, anemia and impaired immune function. " +
          EDU,
      },
      {
        q: "Does zinc bisglycinate need to be taken with copper?",
        a:
          "At intakes near the RDA it does not. Chronic supplementation well above the RDA does interfere with copper absorption, which is why long-term high-dose regimens are often paired with about 1 mg of copper per 15 mg of zinc. That pairing is a hedge against a real depletion risk, not a benefit in itself. " +
          EDU,
      },
    ],
  },

  gaba: {
    targetQuery: "gaba supplement",
    metaTitle: "GABA Supplement: What It Does and What Evidence Shows",
    metaDescription:
      "GABA is the brain's main inhibitory neurotransmitter, also sold as a calming supplement. What it does, whether oral GABA reaches the brain, and safety.",
    answer:
      "GABA (gamma-aminobutyric acid) is the brain's main inhibitory neurotransmitter, which quiets neuronal firing. It is also sold as an oral supplement for stress and sleep, but how much swallowed GABA reaches the brain is disputed, because it crosses the blood-brain barrier poorly. Small trials report reduced stress markers and faster sleep onset; the evidence base remains small and short-term.",
    quickFacts: [
      { label: "Class", value: "Inhibitory neurotransmitter; sold as a dietary supplement" },
      {
        label: "Common forms",
        value: "Capsules, powder, chewables; PharmaGABA (fermented) branded form",
      },
      { label: "Amounts studied", value: "Roughly 100–300 mg in most small human trials" },
      { label: "Onset in studies", value: "Changes in stress markers within about 30–60 minutes" },
      {
        label: "Main open question",
        value: "Limited blood-brain barrier penetration of oral GABA",
      },
      {
        label: "Common side effects",
        value: "Drowsiness, tingling, mild stomach upset at higher intakes",
      },
    ],
    extraFaq: [
      {
        q: "Does oral GABA actually cross the blood-brain barrier?",
        a:
          "Only to a very limited extent. GABA is a polar molecule with poor passive permeability, and most pharmacology reviews conclude that swallowed GABA does not meaningfully raise brain GABA in healthy adults. Effects reported in small trials may come from the enteric nervous system and vagal signaling rather than direct central action. " +
          EDU,
      },
      {
        q: "Is GABA the same as gabapentin?",
        a:
          "No. Despite the name, gabapentin does not bind GABA receptors; it acts on the alpha-2-delta subunit of voltage-gated calcium channels and is a prescription medicine for seizures and neuropathic pain. GABA sold as a supplement is the neurotransmitter itself and is regulated as a food supplement, not a drug. " +
          EDU,
      },
      {
        q: "Can you take GABA with alcohol or sleep medication?",
        a:
          "Combining it with alcohol, benzodiazepines, Z-drugs or other sedatives can add to drowsiness and impair coordination, and those combinations have not been studied. Anyone already taking a prescribed sedative or anticonvulsant should check with a pharmacist before adding it. " +
          EDU,
      },
    ],
  },

  ezetimibe: {
    targetQuery: "ezetimibe",
    metaTitle: "Ezetimibe: How It Lowers Cholesterol, Uses and Risks",
    metaDescription:
      "Ezetimibe blocks cholesterol absorption in the small intestine. What it treats, how much it lowers LDL, and how it differs from a statin.",
    answer:
      "Ezetimibe is a prescription cholesterol medicine that blocks the NPC1L1 transporter in the small intestine, cutting absorption of dietary and biliary cholesterol. Used alone it lowers LDL cholesterol by roughly 15–20 percent; added to a statin it delivers a further reduction and, in the IMPROVE-IT trial, fewer cardiovascular events. It is not a statin and does not inhibit cholesterol synthesis.",
    quickFacts: [
      { label: "Class", value: "Cholesterol absorption inhibitor (NPC1L1)" },
      { label: "Brand names", value: "Zetia, Ezetrol; with simvastatin as Vytorin/Inegy" },
      { label: "Label strength", value: "10 mg tablet, once daily" },
      { label: "Typical LDL effect", value: "About 15–20% alone; additive on top of a statin" },
      {
        label: "Key trial",
        value: "IMPROVE-IT — fewer cardiovascular events added to simvastatin",
      },
      { label: "Common side effects", value: "Diarrhea, joint pain, fatigue; myopathy uncommon" },
    ],
    extraFaq: [
      {
        q: "How is ezetimibe different from a statin?",
        a:
          "Statins block HMG-CoA reductase and reduce how much cholesterol the liver makes; ezetimibe blocks how much is absorbed from the gut. Because the mechanisms differ, the effects add up, which is why the two are often prescribed together when a statin alone does not reach the LDL target or the statin dose is limited by side effects. " +
          EDU,
      },
      {
        q: "Does ezetimibe cause muscle pain like statins?",
        a:
          "Muscle symptoms are much less common with ezetimibe, which is a large part of why it is used in statin-intolerant patients. Myopathy and rhabdomyolysis have been reported rarely, mostly when combined with a statin, so new unexplained muscle pain or weakness should be reported to a clinician. " +
          EDU,
      },
      {
        q: "Can ezetimibe be taken with supplements or food?",
        a:
          "It can be taken with or without food at any time of day. Bile acid sequestrants such as cholestyramine reduce its absorption and should be separated by several hours. Plant sterol or stanol supplements work on the same absorption pathway, so their added effect is likely to be small. " +
          EDU,
      },
    ],
  },

  allopurinol: {
    targetQuery: "allopurinol",
    metaTitle: "Allopurinol: Uses, How It Works, Side Effects",
    metaDescription:
      "Allopurinol lowers uric acid to prevent gout attacks and kidney stones. How it works, what to expect when starting it, and its main safety warnings.",
    answer:
      "Allopurinol is a xanthine oxidase inhibitor that reduces uric acid production, used to prevent gout flares, tophi, uric acid kidney stones and tumour lysis syndrome. It is preventive, not a treatment for an attack in progress, and can trigger flares in the first months, so clinicians often add colchicine or an anti-inflammatory cover. Its most serious risk is a rare severe hypersensitivity reaction.",
    quickFacts: [
      { label: "Class", value: "Xanthine oxidase inhibitor (urate-lowering therapy)" },
      { label: "Brand names", value: "Zyloprim, Aloprim, Zyloric" },
      { label: "Main uses", value: "Gout prevention, uric acid stones, tumour lysis syndrome" },
      { label: "Onset", value: "Uric acid falls within days; flare protection builds over months" },
      { label: "Key monitoring", value: "Serum urate target, renal function, liver enzymes" },
      {
        label: "Serious risk",
        value: "Allopurinol hypersensitivity syndrome; higher with HLA-B*58:01",
      },
    ],
    extraFaq: [
      {
        q: "Why can allopurinol cause a gout attack when you start it?",
        a:
          "Lowering serum urate mobilises urate out of existing joint deposits, and that shift can precipitate a flare even though the underlying problem is improving. Guidelines therefore advise starting low, titrating slowly to a urate target, and using prophylactic colchicine or an NSAID for the first three to six months. Treatment is not stopped for a flare. " +
          EDU,
      },
      {
        q: "What are the serious side effects of allopurinol?",
        a:
          "The important one is allopurinol hypersensitivity syndrome — rash progressing to Stevens-Johnson syndrome or DRESS, with fever, eosinophilia and organ involvement. Risk is markedly higher in carriers of HLA-B*58:01, more common in people of Han Chinese, Thai and Korean ancestry, and screening is recommended in those groups. Any new rash warrants stopping and urgent review. " +
          EDU,
      },
      {
        q: "Which drugs interact with allopurinol?",
        a:
          "Azathioprine and mercaptopurine are the critical ones: allopurinol blocks their breakdown and can cause severe marrow suppression, so doses must be cut sharply or the combination avoided. Interactions are also described with warfarin, theophylline and ampicillin (rash risk), and diuretics can raise urate and blunt its effect. " +
          EDU,
      },
    ],
  },

  lansoprazole: {
    targetQuery: "lansoprazole",
    metaTitle: "Lansoprazole: Uses, How It Works and Long-Term Risks",
    metaDescription:
      "Lansoprazole is a proton pump inhibitor for reflux and ulcers. How it works, how to take it, and what long-term use is associated with.",
    answer:
      "Lansoprazole is a proton pump inhibitor that shuts down the stomach's acid-secreting pumps, used for reflux disease, erosive oesophagitis, peptic ulcers, H. pylori eradication regimens and Zollinger-Ellison syndrome. It works best taken 30–60 minutes before a meal, and full effect builds over several days. Long-term use is associated with reduced absorption of magnesium, B12 and calcium.",
    quickFacts: [
      { label: "Class", value: "Proton pump inhibitor (H+/K+-ATPase inhibitor)" },
      { label: "Brand names", value: "Prevacid, Zoton; also sold over the counter" },
      { label: "Best taken", value: "30–60 minutes before the first meal of the day" },
      { label: "Onset", value: "Acid suppression starts within hours; full effect over 2–4 days" },
      { label: "Common side effects", value: "Headache, diarrhea, abdominal pain, nausea" },
      {
        label: "Long-term associations",
        value: "Low magnesium and B12, C. difficile, fracture risk",
      },
    ],
    extraFaq: [
      {
        q: "How is lansoprazole different from omeprazole?",
        a:
          "Both are proton pump inhibitors with very similar efficacy for reflux and ulcer healing. The practical differences are metabolic: omeprazole inhibits CYP2C19 more strongly and carries the clopidogrel interaction warning, while lansoprazole has less effect on that pathway. Choice usually comes down to tolerability, cost and formulation. " +
          EDU,
      },
      {
        q: "What happens if you take lansoprazole long term?",
        a:
          "Observational studies link prolonged use with low magnesium, vitamin B12 and iron absorption, an increased risk of C. difficile and other enteric infections, and modest associations with fractures and kidney disease. These are associations rather than proven causes, but guidelines advise using the lowest effective duration and reviewing continued need. " +
          EDU,
      },
      {
        q: "Can you stop lansoprazole suddenly?",
        a:
          "Stopping abruptly after weeks of use often produces rebound acid hypersecretion — symptoms briefly worse than before treatment — which is easily mistaken for the original disease returning. Tapering the dose or stepping down to an H2 blocker over a few weeks reduces that rebound. " +
          EDU,
      },
    ],
  },

  "bacopa-monnieri": {
    targetQuery: "bacopa monnieri",
    metaTitle: "Bacopa Monnieri: Memory Evidence, Dosage, Side Effects",
    metaDescription:
      "Bacopa monnieri is an ayurvedic herb studied for memory and learning. What the trials show, how long it takes, and its common side effects.",
    answer:
      "Bacopa monnieri is an ayurvedic herb whose active bacoside compounds have been tested in randomized trials for memory and learning. Meta-analyses find modest improvements in delayed word recall and information-processing speed, but only after roughly 8–12 weeks of daily use — it is not acute. Gastrointestinal upset is the most common complaint, and taking it with food reduces that.",
    quickFacts: [
      { label: "Class", value: "Ayurvedic nootropic herb (bacoside saponins)" },
      {
        label: "Amounts studied",
        value: "Typically 300 mg/day of extract standardized to ~50% bacosides",
      },
      { label: "Time to effect", value: "8–12 weeks of continuous use in most trials" },
      {
        label: "Best measured effect",
        value: "Delayed recall; smaller effects on processing speed",
      },
      { label: "Common side effects", value: "Nausea, cramping, loose stools, dry mouth" },
      { label: "Best taken", value: "With food; often split across the day" },
    ],
    extraFaq: [
      {
        q: "How long does bacopa take to work?",
        a:
          "Trials that found cognitive effects dosed daily for 8–12 weeks; studies of single doses generally find nothing. That slow onset is consistent with the proposed mechanisms — dendritic branching and antioxidant effects in the hippocampus — rather than acute neurotransmitter stimulation, so expecting a same-day effect misreads the evidence. " +
          EDU,
      },
      {
        q: "What are bacopa's side effects?",
        a:
          "Digestive complaints dominate: nausea, abdominal cramping, increased stool frequency and dry mouth, largely dose-related and reduced by taking it with a meal. It has cholinergic activity, so caution is advised alongside cholinergic drugs, and it may add to the sedating effect of other calming agents. " +
          EDU,
      },
      {
        q: "How much bacopa is used in studies?",
        a:
          "The common protocol is 300 mg a day of an extract standardized to about 50 percent bacosides, or roughly 750–1,500 mg a day of a less concentrated whole-herb preparation. Comparing products by total milligrams is misleading unless the bacoside percentage is stated. " +
          EDU,
      },
    ],
  },

  glycine: {
    targetQuery: "glycine supplement",
    metaTitle: "Glycine: Sleep Evidence, Uses and Safety",
    metaDescription:
      "Glycine is an amino acid studied for sleep quality, collagen synthesis and metabolic health. What trials show and how much is typically used.",
    answer:
      "Glycine is the smallest amino acid, a building block of collagen and glutathione and an inhibitory neurotransmitter in the brainstem and spinal cord. Small randomized trials report that 3 grams before bed improves subjective sleep quality and next-day alertness, apparently by lowering core body temperature. It is also studied in combination with N-acetylcysteine for glutathione status.",
    quickFacts: [
      { label: "Class", value: "Non-essential amino acid; inhibitory neurotransmitter" },
      {
        label: "Amounts studied",
        value: "3 g before bed for sleep; higher amounts in metabolic studies",
      },
      {
        label: "Proposed sleep mechanism",
        value: "Peripheral vasodilation lowering core body temperature",
      },
      {
        label: "Other roles",
        value: "Collagen synthesis, glutathione precursor, bile acid conjugation",
      },
      { label: "Taste", value: "Naturally sweet; mixes easily in water" },
      { label: "Common side effects", value: "Mild nausea or loose stools at higher intakes" },
    ],
    extraFaq: [
      {
        q: "Does glycine help you sleep?",
        a:
          "Small Japanese trials found 3 grams taken before bed improved self-reported sleep quality, shortened time to fall asleep on polysomnography and reduced next-day fatigue in people with poor sleep. The samples were small and short, so it is suggestive rather than settled, and it is not a sedative. " +
          EDU,
      },
      {
        q: "How much glycine is safe per day?",
        a:
          "Amounts of 3–5 grams a day are used routinely in trials without significant adverse effects, and studies have gone considerably higher for short periods. Very large single doses can cause nausea or soft stools. People taking clozapine should be aware glycine has been reported to reduce its effectiveness. " +
          EDU,
      },
      {
        q: "Is glycine the same as collagen?",
        a:
          "No, but they are closely related: glycine makes up roughly one third of the amino acids in collagen, which is why collagen powders are a rich glycine source. Supplementing glycine alone supplies that amino acid without the other collagen peptides, and it is far cheaper per gram. " +
          EDU,
      },
    ],
  },

  ivermectin: {
    targetQuery: "ivermectin",
    metaTitle: "Ivermectin: Approved Uses, How It Works, Safety",
    metaDescription:
      "Ivermectin is an antiparasitic medicine for conditions such as strongyloidiasis, onchocerciasis and scabies. Approved uses, dosing basis and safety.",
    answer:
      "Ivermectin is an antiparasitic drug that paralyses invertebrate nerve and muscle cells by binding glutamate-gated chloride channels. It is approved for intestinal strongyloidiasis and onchocerciasis in tablet form, and topically for rosacea and head lice, and is widely used for scabies. Doses are weight-based. Veterinary formulations are not interchangeable with human products and have caused overdoses.",
    quickFacts: [
      { label: "Class", value: "Avermectin antiparasitic" },
      { label: "Brand names", value: "Stromectol (oral); Soolantra, Sklice (topical)" },
      { label: "Approved oral uses", value: "Strongyloidiasis, onchocerciasis (river blindness)" },
      { label: "Dosing basis", value: "Weight-based, typically taken on an empty stomach" },
      {
        label: "Common side effects",
        value: "Dizziness, nausea, itching, rash; Mazzotti reaction in filariasis",
      },
      { label: "Important caution", value: "Veterinary formulations are not safe substitutes" },
    ],
    extraFaq: [
      {
        q: "What is ivermectin actually approved to treat?",
        a:
          "In the U.S. the oral tablet is FDA-approved for intestinal strongyloidiasis and onchocerciasis; topical formulations are approved for rosacea and head lice. It is also used, and widely recommended internationally, for scabies. It is not approved as an antiviral, and the FDA and EMA advise against use for COVID-19 outside trials. " +
          EDU,
      },
      {
        q: "Is animal ivermectin the same as the human medicine?",
        a:
          "No. Veterinary pastes and injectables are formulated and concentrated for large animals such as horses and cattle, so a human-sized portion is easy to mis-measure, and the excipients are not tested for humans. Poison centers have recorded serious overdoses — vomiting, confusion, seizures and hypotension — from these products. " +
          EDU,
      },
      {
        q: "What interacts with ivermectin?",
        a:
          "It is a P-glycoprotein substrate, so strong inhibitors of that transporter and of CYP3A4 — for example ketoconazole, ritonavir or erythromycin — can raise exposure. Combining it with high-dose sedatives is also cautioned because ivermectin acts on GABA-gated channels once the blood-brain barrier is compromised. " +
          EDU,
      },
    ],
  },

  anastrozole: {
    targetQuery: "anastrozole",
    metaTitle: "Anastrozole: Uses, How It Works and Side Effects",
    metaDescription:
      "Anastrozole is an aromatase inhibitor used in hormone-receptor-positive breast cancer. How it lowers estrogen, its side effects and monitoring.",
    answer:
      "Anastrozole is a non-steroidal aromatase inhibitor that blocks the enzyme converting androgens to estrogens, cutting circulating estradiol by around 80–90 percent. Its approved use is hormone-receptor-positive breast cancer in postmenopausal women, as adjuvant or advanced-disease therapy. Because estrogen supports bone, joint pain, stiffness, hot flushes and accelerated bone loss are the characteristic side effects.",
    quickFacts: [
      { label: "Class", value: "Non-steroidal aromatase inhibitor" },
      { label: "Brand name", value: "Arimidex" },
      { label: "Label strength", value: "1 mg tablet once daily" },
      { label: "Approved use", value: "Hormone-receptor-positive breast cancer, postmenopausal" },
      { label: "Oestradiol effect", value: "Roughly 80–90% suppression of circulating estradiol" },
      { label: "Monitoring", value: "Bone mineral density, lipids, joint symptoms" },
    ],
    extraFaq: [
      {
        q: "How does anastrozole differ from tamoxifen?",
        a:
          "Tamoxifen blocks the estrogen receptor and can be used before or after menopause; anastrozole removes the estrogen itself by blocking aromatase and only works when the ovaries are no longer the main source, so it is for postmenopausal patients. Their side-effect profiles differ too: tamoxifen carries clot and endometrial risk, anastrozole carries bone and joint risk. " +
          EDU,
      },
      {
        q: "What are the most common anastrozole side effects?",
        a:
          "Joint pain and stiffness, hot flushes, fatigue, vaginal dryness, mood changes and headache. Longer term, the estrogen suppression accelerates bone mineral density loss and can raise LDL cholesterol, which is why bone density and lipids are monitored during treatment. " +
          EDU,
      },
      {
        q: "Is anastrozole used by men?",
        a:
          "Off-label, some clinicians prescribe it for gynaecomastia or alongside testosterone therapy to reduce estradiol conversion, but this is not an approved indication and the evidence base is thin. Over-suppressing estradiol in men harms bone density, lipids, libido and mood, so it is not a benign addition. " +
          EDU,
      },
    ],
  },

  "huperzine-a": {
    targetQuery: "huperzine a",
    metaTitle: "Huperzine A: Effects, Evidence and Safety Limits",
    metaDescription:
      "Huperzine A is a plant alkaloid that inhibits acetylcholinesterase. What the memory research shows, how it is used, and why cycling is advised.",
    answer:
      "Huperzine A is an alkaloid from Huperzia serrata that inhibits acetylcholinesterase, the enzyme breaking down acetylcholine, so cholinergic signaling is prolonged. It has been studied mainly in Alzheimer's disease and in students, with meta-analyses reporting modest cognitive improvements from generally low-quality trials. Because it is a genuine enzyme inhibitor with a long duration, it is not a casual daily supplement.",
    quickFacts: [
      { label: "Class", value: "Acetylcholinesterase inhibitor (plant alkaloid)" },
      { label: "Source", value: "Huperzia serrata (Chinese club moss)" },
      {
        label: "Amounts studied",
        value: "50–200 mcg per day; measured in micrograms, not milligrams",
      },
      {
        label: "Regulatory status",
        value: "Prescription drug in China; sold as a supplement in the U.S.",
      },
      {
        label: "Common side effects",
        value: "Nausea, sweating, vivid dreams, cramps, slowed heart rate",
      },
      { label: "Practical note", value: "Often cycled rather than taken continuously" },
    ],
    extraFaq: [
      {
        q: "Does huperzine A improve memory?",
        a:
          "Meta-analyses of Chinese trials in Alzheimer's disease report improvements on MMSE and daily-living scores versus placebo, but reviewers rate the studies as methodologically weak. Evidence in healthy adults is far thinner and mostly limited to small student studies, so a meaningful benefit in healthy users is not established. " +
          EDU,
      },
      {
        q: "Why do people cycle huperzine A?",
        a:
          "It inhibits acetylcholinesterase for many hours, and sustained cholinergic pressure can lead to receptor downregulation and cholinergic side effects such as nausea, cramping, excess sweating and a slowed heart rate. Cycling — using it intermittently rather than daily — is the common practical response, though it is not formally studied. " +
          EDU,
      },
      {
        q: "What should not be combined with huperzine A?",
        a:
          "It should not be stacked with prescription cholinesterase inhibitors such as donepezil, rivastigmine or galantamine, because the effects add up and can cause a cholinergic crisis. Caution also applies with beta-blockers (additive bradycardia), anticholinergic drugs (opposing effects) and in people with asthma, epilepsy or a slow heart rate. " +
          EDU,
      },
    ],
  },

  loratadine: {
    targetQuery: "loratadine",
    metaTitle: "Loratadine: Uses, How It Works and Side Effects",
    metaDescription:
      "Loratadine is a non-drowsy antihistamine for hay fever and hives. How it works, how it compares with cetirizine, and its safety profile.",
    answer:
      "Loratadine is a second-generation H1 antihistamine used for allergic rhinitis and chronic hives. It blocks histamine at peripheral H1 receptors and crosses into the brain poorly, so it is far less sedating than older antihistamines like diphenhydramine. Effects start within one to three hours and last about 24 hours, making once-daily dosing standard.",
    quickFacts: [
      { label: "Class", value: "Second-generation H1 antihistamine" },
      { label: "Brand names", value: "Claritin, Clarityn; also generic and combination products" },
      { label: "Typical adult strength", value: "10 mg once daily (OTC label)" },
      { label: "Onset / duration", value: "1–3 hours; roughly 24 hours of effect" },
      { label: "Sedation", value: "Low — least sedating of the common second-generation options" },
      { label: "Common side effects", value: "Headache, dry mouth, fatigue" },
    ],
    extraFaq: [
      {
        q: "Is loratadine or cetirizine better for allergies?",
        a:
          "Cetirizine tends to work slightly faster and is rated marginally more effective for nasal symptoms in comparison studies, but it causes drowsiness in roughly one in ten users. Loratadine is the less sedating of the two. Fexofenadine sits between them. For most people, the choice comes down to whether sedation matters that day. " +
          EDU,
      },
      {
        q: "Can you take loratadine every day?",
        a:
          "Yes — daily use through an allergy season is the intended pattern, and long-term data in allergic rhinitis and chronic urticaria are reassuring. Unlike decongestant nasal sprays it does not cause rebound symptoms. Anyone needing it continuously for months should still have the underlying trigger reviewed. " +
          EDU,
      },
      {
        q: "Does loratadine interact with other medicines?",
        a:
          "It is metabolised by CYP3A4 and CYP2D6, so strong inhibitors such as ketoconazole, erythromycin or cimetidine raise its blood levels, though this has not translated into clinically significant heart-rhythm problems as it did with the withdrawn drug terfenadine. Alcohol and other sedatives can add to any drowsiness. " +
          EDU,
      },
    ],
  },
};

export function getRescueEntry(slug: string): RescueEntry | null {
  return PAGE2_RESCUE[slug] ?? null;
}

/** Slugs covered by the rescue layer — used by tests and reporting. */
export const RESCUE_SLUGS = Object.keys(PAGE2_RESCUE);
