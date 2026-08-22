export type ArticleFaq = { question: string; answer: string };

const common: Record<string, Array<readonly [string, string]>> = {
  armodafinil: [
    [
      "À quoi sert l'armodafinil ?",
      "L'armodafinil est un médicament sur ordonnance favorisant l'éveil, utilisé contre la somnolence excessive liée à la narcolepsie, à l'apnée obstructive du sommeil et au travail posté. Il ne remplace pas le traitement du trouble du sommeil sous-jacent.",
    ],
    [
      "Combien de temps dure l'effet de l'armodafinil ?",
      "L'effet peut couvrir une grande partie de la journée car la demi-vie d'élimination est longue. La durée varie selon la dose, le métabolisme, les autres médicaments et l'indication.",
    ],
    [
      "Quels sont les effets indésirables courants de l'armodafinil ?",
      "Maux de tête, nausées, vertiges et troubles du sommeil sont fréquents. Une éruption cutanée, une réaction allergique, un changement d'humeur marqué ou des symptômes thoraciques nécessitent un avis médical rapide.",
    ],
    [
      "L'armodafinil interagit-il avec d'autres médicaments ?",
      "Oui. Il peut modifier l'efficacité des contraceptifs hormonaux, des anticoagulants, des antiépileptiques et d'autres traitements. Faites vérifier la liste complète par un pharmacien.",
    ],
    [
      "L'armodafinil est-il identique au modafinil ?",
      "Non. Les deux molécules sont proches, mais l'armodafinil ne contient que l'énantiomère R, à action plus longue. Les doses ne sont pas interchangeables telles quelles.",
    ],
  ],

  carbetocin: [
    [
      "What is carbetocin used for?",
      "Carbetocin is an oxytocin-like medicine used in some countries to help prevent excessive bleeding after childbirth by supporting uterine contraction. Approved uses vary by country and clinical setting.",
    ],
    [
      "How is carbetocin given?",
      "It is normally given by a trained clinician as a single intravenous or intramuscular dose around delivery. It is not for unsupervised or home administration.",
    ],
    [
      "How is carbetocin different from oxytocin?",
      "Carbetocin acts on the same receptor but generally has a longer duration of uterine activity. Choice depends on local guidance, delivery type, storage, cost, and patient factors.",
    ],
    [
      "What are possible carbetocin side effects?",
      "Reported effects include nausea, abdominal pain, flushing, headache, tremor, and blood-pressure changes. Monitoring is important because postpartum bleeding can change quickly.",
    ],
    [
      "Who should not receive carbetocin?",
      "Contraindications depend on the product label and clinical situation. The obstetric team must assess heart disease, epilepsy, liver or kidney disease, allergies, and other medicines.",
    ],
  ],
  "carbetocin-dose": [
    [
      "What is the usual carbetocin dose after delivery?",
      "Labels commonly describe one clinician-administered dose, but route and approved dose differ by jurisdiction and indication. The local label and hospital protocol control.",
    ],
    [
      "Can a carbetocin dose be repeated?",
      "Carbetocin is generally intended as a single dose in its approved postpartum use. Additional uterotonic treatment is a clinical decision rather than an automatic repeat dose.",
    ],
    [
      "Is carbetocin dosed by body weight?",
      "Standard labeled postpartum dosing is usually fixed rather than weight based. Individual circumstances can still change whether it is appropriate.",
    ],
    [
      "Is the dose different for intravenous and intramuscular use?",
      "Routes and authorized dosing vary between labels and countries. Clinicians should use the instructions for the stocked formulation rather than converting routes independently.",
    ],
    [
      "Why must carbetocin dosing be supervised?",
      "It affects uterine contraction and circulation when bleeding and vital signs can change rapidly, so maternal monitoring and emergency treatment must be available.",
    ],
  ],
  clonidine: [
    [
      "What is clonidine used for?",
      "Clonidine is approved for high blood pressure, and certain formulations are approved for ADHD. It is also used in selected situations depending on local guidance.",
    ],
    [
      "Why should clonidine not be stopped suddenly?",
      "Abrupt withdrawal can cause rebound high blood pressure, rapid heart rate, headache, and agitation. A prescriber should provide a gradual taper.",
    ],
    [
      "What are common clonidine side effects?",
      "Sleepiness, dizziness, dry mouth, constipation, slow heart rate, and low blood pressure are common concerns.",
    ],
    [
      "Can clonidine be taken with sedating medicines?",
      "Alcohol, sleep medicines, opioids, and other sedatives can increase drowsiness. Other blood-pressure medicines can add to its pressure-lowering effect.",
    ],
    [
      "How should a missed clonidine dose be handled?",
      "Instructions depend on formulation and schedule. Follow the prescription label or ask a pharmacist, and do not double a dose without specific direction.",
    ],
  ],
  intuniv: [
    [
      "What is Intuniv used for?",
      "Intuniv is extended-release guanfacine used for ADHD in children and adolescents in many jurisdictions, alone or with a stimulant.",
    ],
    [
      "Is Intuniv the same as immediate-release guanfacine?",
      "No. Intuniv has different absorption and dosing instructions and should not be substituted milligram for milligram without prescriber guidance.",
    ],
    [
      "What are common Intuniv side effects?",
      "Sleepiness, fatigue, dizziness, low blood pressure, slow heart rate, nausea, and abdominal discomfort can occur.",
    ],
    [
      "Can Intuniv be stopped suddenly?",
      "It should usually be tapered because sudden discontinuation can raise blood pressure and heart rate. Follow the prescriber's schedule.",
    ],
    [
      "Should Intuniv be taken with food?",
      "Follow the label consistently. High-fat meals can change exposure, and the tablet should generally be swallowed whole.",
    ],
  ],
  longevity: [
    [
      "What does longevity mean in health research?",
      "Longevity refers to length of life, while healthspan describes years lived in good function and health. Good evidence focuses on both.",
    ],
    [
      "Which habits have the strongest evidence for healthy aging?",
      "Not smoking, regular activity, adequate sleep, vaccination, social connection, and management of blood pressure, cholesterol, and diabetes have strong human evidence.",
    ],
    [
      "Can supplements extend human lifespan?",
      "No supplement has been proven to broadly extend lifespan in healthy people, though one can be appropriate for a documented deficiency or clinical indication.",
    ],
    [
      "What biomarkers are useful for longevity tracking?",
      "Blood pressure, lipids, glucose, waist circumference, fitness, strength, kidney function, and age-appropriate screening can be useful with clinical interpretation.",
    ],
    [
      "How should longevity claims be evaluated?",
      "Prioritize replicated human outcomes, absolute effects, safety, and study duration. Animal findings and short-term biomarkers are not proof of longer human life.",
    ],
  ],
  "longevity-peptides": [
    [
      "Are any peptides proven to extend human lifespan?",
      "No peptide has been proven in high-quality trials to extend lifespan in generally healthy humans.",
    ],
    [
      "Why are longevity peptide claims uncertain?",
      "Long lifespan trials are difficult, products may be investigational, and biomarker changes do not necessarily translate into fewer illnesses or longer life.",
    ],
    [
      "What are the risks of unapproved peptides?",
      "Risks include contamination, incorrect concentration, immune reactions, injection complications, unknown long-term effects, and interactions.",
    ],
    [
      "What evidence should a peptide claim include?",
      "Look for registered human trials, peer-reviewed methods, meaningful outcomes, transparent adverse-event reporting, and independent confirmation.",
    ],
    [
      "What should be discussed with a clinician first?",
      "Discuss the product, regulatory status, goals, health conditions, cancer history, pregnancy plans, medicines, monitoring, sourcing, and stopping plan.",
    ],
  ],
  "science-of-longevity": [
    [
      "What processes are studied in aging science?",
      "Researchers study genomic instability, cellular senescence, mitochondrial changes, altered nutrient sensing, inflammation, stem-cell function, and communication between tissues.",
    ],
    [
      "Do animal longevity results apply to humans?",
      "Animal studies identify mechanisms, but biological and lifespan differences mean they cannot establish a human longevity benefit on their own.",
    ],
    [
      "What is a surrogate marker in longevity research?",
      "A surrogate is a measurable sign expected to relate to future health. It is useful only when changes reliably predict meaningful outcomes.",
    ],
    [
      "How long must longevity studies run?",
      "Risk factors can change in months, but proving prevention of disease, disability, or death generally requires larger and much longer studies.",
    ],
    [
      "What is the difference between lifespan and healthspan?",
      "Lifespan is total time alive. Healthspan is the period lived without major disease or disability.",
    ],
  ],
  "what-is-guanfacine-used-for": [
    [
      "¿Para qué sirve la guanfacina?",
      "La guanfacina se usa para la presión arterial alta y, en su forma de liberación prolongada, para el TDAH. La indicación aprobada depende de la formulación y del país, por lo que la receta manda.",
    ],
    [
      "¿Cómo ayuda la guanfacina en el TDAH?",
      "Actúa sobre los receptores adrenérgicos alfa-2A implicados en la atención y el control de los impulsos. El beneficio se evalúa con el seguimiento clínico a lo largo de varias semanas, no en un solo día.",
    ],
    [
      "¿Cuáles son los efectos secundarios frecuentes de la guanfacina?",
      "Somnolencia, fatiga, mareo, presión arterial baja, frecuencia cardíaca lenta, boca seca y estreñimiento son los más descritos. Avisa al prescriptor si son persistentes.",
    ],
    [
      "¿Se puede combinar la guanfacina con un estimulante?",
      "En algunos casos los clínicos combinan guanfacina de liberación prolongada con un estimulante, siempre con seguimiento individualizado de presión arterial y frecuencia cardíaca.",
    ],
    [
      "¿Por qué hay que retirar la guanfacina de forma gradual?",
      "Suspenderla de golpe puede provocar subidas de rebote de presión arterial y pulso. La reducción debe dirigirla quien la prescribe.",
    ],
  ],

  "yuka-app": [
    [
      "What does the Yuka app do?",
      "Yuka scans food and cosmetic barcodes and presents a simplified product score. It is a shopping aid, not individualized medical advice.",
    ],
    [
      "Are Yuka scores the same as medical advice?",
      "No. A product score cannot account for allergies, medical conditions, total diet, dose, or a clinician's treatment goals.",
    ],
    [
      "Why can food-scanning apps disagree?",
      "Apps use different databases, weighting systems, serving assumptions, and additive or processing rules. Missing label data can also alter results.",
    ],
    [
      "Can Yuka track calories and macros eaten?",
      "Its main purpose is product evaluation. A nutrition tracker is better suited to portions, calories, protein, carbohydrate, fat, and daily totals.",
    ],
    [
      "How should a barcode-app result be checked?",
      "Compare it with the package label, ingredients, serving size, and current manufacturer information. Verify medical diets and allergies with a professional.",
    ],
  ],

  boldenone: [
    [
      "What is boldenone (Equipoise)?",
      "Boldenone undecylenate is a veterinary anabolic steroid marketed as Equipoise. It has no approved human medical use in the United States or the European Union, and non-medical use is illegal in many countries.",
    ],
    [
      "How long does boldenone stay in the body?",
      "The undecylenate ester releases slowly, so detectable metabolites can persist for months. That long tail matters for anti-doping tests and for how slowly side effects resolve.",
    ],
    [
      "What are the main risks of boldenone?",
      "Reported concerns include suppressed natural testosterone, raised red blood cell count and blood pressure, unfavourable cholesterol shifts, mood changes, acne, hair loss and cardiovascular strain.",
    ],
    [
      "Which markers do people monitor on an anabolic cycle?",
      "Clinicians typically watch haematocrit and haemoglobin, blood pressure, a lipid panel, liver and kidney function, oestradiol and total or free testosterone — before, during and after.",
    ],
    [
      "Does boldenone aromatise to oestrogen?",
      "Yes, it converts to oestrogen at a lower rate than testosterone, but oestrogenic effects still occur. Any management of that belongs with a clinician, not with self-directed dosing.",
    ],
  ],

  "ramelteon-drug-class": [
    [
      "What drug class is ramelteon in?",
      "Ramelteon is a melatonin receptor agonist. It selectively activates MT1 and MT2 receptors in the suprachiasmatic nucleus rather than acting on GABA receptors like z-drugs or benzodiazepines.",
    ],
    [
      "How is ramelteon different from zolpidem or a benzodiazepine?",
      "It does not sedate through GABA. It is not a controlled substance in the United States and is not associated with the dependence and next-day impairment profile of GABAergic hypnotics.",
    ],
    [
      "What is ramelteon approved for?",
      "It is approved in the United States for insomnia characterised by difficulty with sleep onset. It is not indicated for sleep-maintenance insomnia.",
    ],
    [
      "How long does ramelteon take to work?",
      "It is absorbed quickly and is taken shortly before bed, but subjective benefit for sleep onset often builds over several nights of consistent use.",
    ],
    [
      "What are common ramelteon side effects?",
      "Drowsiness, dizziness, fatigue and nausea are reported. Hormonal changes such as raised prolactin have also been described; persistent effects should be reviewed with a prescriber.",
    ],
  ],

  "extended-release-melatonin": [
    [
      "What is extended-release melatonin?",
      "It is a formulation that releases melatonin gradually over several hours instead of all at once, aiming to support sleep maintenance rather than only sleep onset.",
    ],
    [
      "How is it different from immediate-release melatonin?",
      "Immediate-release produces a short spike that mainly helps with falling asleep or shifting circadian timing. Prolonged-release aims to hold levels through the night.",
    ],
    [
      "Who is prolonged-release melatonin studied in?",
      "It is authorised in Europe for short-term insomnia in adults aged 55 and over, and it has been studied in some sleep problems associated with neurodevelopmental conditions.",
    ],
    [
      "When should extended-release melatonin be taken?",
      "Product labels generally specify a fixed window before bedtime, often one to two hours, taken consistently. Timing drives the circadian effect, so keep it the same each night.",
    ],
    [
      "Are there side effects or interactions?",
      "Headache, next-morning grogginess and vivid dreams are reported. Melatonin is metabolised by CYP1A2, so fluvoxamine, some antidepressants and smoking status can change exposure.",
    ],
  ],

  "ranitidine-drug": [
    [
      "Why was ranitidine withdrawn?",
      "Regulators including the FDA and EMA withdrew ranitidine in 2020 after testing found NDMA, a probable human carcinogen, in products and found it could increase over time and with storage temperature.",
    ],
    [
      "What is NDMA?",
      "N-nitrosodimethylamine is a nitrosamine classified as a probable human carcinogen. Regulators set strict daily intake limits, and some ranitidine samples exceeded them.",
    ],
    [
      "What replaced ranitidine?",
      "Other H2 blockers such as famotidine and nizatidine remain available, alongside proton pump inhibitors and antacids. The right substitute depends on the condition being treated.",
    ],
    [
      "Is famotidine affected by the same problem?",
      "Famotidine has a different chemical structure and has not been withdrawn for NDMA. It remains widely used for reflux and ulcer-related indications.",
    ],
    [
      "What should someone do with leftover ranitidine?",
      "Stop using it and dispose of it through a pharmacy take-back or local guidance, then discuss an alternative with a prescriber or pharmacist rather than substituting one yourself.",
    ],
  ],

  "meal-planning-app": [
    [
      "What should a meal planning app actually do?",
      "The useful ones handle recipe or meal scheduling, an accurate food database, portion and macro maths, a grocery list, and a fast way to log what you really ate.",
    ],
    [
      "Are free meal planning apps good enough?",
      "For basic weekly menus, often yes. Limits usually show up in database accuracy, barcode coverage, custom macro targets and exporting your own data.",
    ],
    [
      "How accurate are app calorie counts?",
      "Accuracy depends on the database entry, not the app's design. Verified sources such as USDA FoodData Central and label-backed barcode records are far more reliable than user-submitted entries.",
    ],
    [
      "Can a meal planner work alongside supplement or peptide timing?",
      "Yes, and that is where most standalone planners stop. Pairing meals with dose timing matters for compounds affected by food, minerals or fasting windows.",
    ],
    [
      "How does DoseRoutine handle meals?",
      "DoseRoutine logs meals by barcode, photo scan or search with macro breakdowns, and puts them on the same timeline as your supplement and protocol schedule.",
    ],
  ],

  "pastillas-para-bajar-de-peso": [
    [
      "¿Qué son las pastillas para bajar de peso?",
      "Son productos que buscan reducir el apetito, la absorción de grasas o aumentar el gasto energético. Incluyen medicamentos con receta aprobados y suplementos sin receta, que no se evalúan igual.",
    ],
    [
      "¿Funcionan las pastillas para adelgazar sin receta?",
      "La mayoría de los suplementos tienen evidencia débil o inconsistente y no se revisan como los medicamentos. Los cambios reales suelen ser pequeños frente a la dieta, el ejercicio y el sueño.",
    ],
    [
      "¿Qué medicamentos para el peso están aprobados?",
      "Según el país, agencias como la FDA y la EMA han aprobado fármacos como orlistat, liraglutida, semaglutida o tirzepatida para obesidad, siempre bajo prescripción y con criterios clínicos.",
    ],
    [
      "¿Qué riesgos tienen estos productos?",
      "Efectos digestivos, alteraciones del ritmo cardíaco, insomnio, ansiedad e interacciones con otros medicamentos. Algunos productos vendidos por internet contienen sustancias no declaradas.",
    ],
    [
      "¿Cómo hacer un seguimiento seguro?",
      "Registra la dosis, el horario, el peso, los efectos adversos y los análisis que pida tu médico. Un registro constante permite valorar si el tratamiento realmente aporta beneficio.",
    ],
  ],

  "lisdexamfetamine-brand-name": [
    [
      "¿Cuál es el nombre de marca de la lisdexanfetamina?",
      "Se comercializa principalmente como Vyvanse, y como Elvanse o Tyvense en varios países europeos. El principio activo es el mismo: dimesilato de lisdexanfetamina.",
    ],
    [
      "¿Para qué se usa la lisdexanfetamina?",
      "Está aprobada para el TDAH y, en algunos países, para el trastorno por atracón en adultos. Es un medicamento controlado que requiere receta y seguimiento.",
    ],
    [
      "¿El genérico es igual que Vyvanse?",
      "Los genéricos autorizados deben demostrar bioequivalencia. Aun así, conviene avisar al prescriptor si notas un cambio al pasar de una presentación a otra.",
    ],
    [
      "¿Cómo actúa la lisdexanfetamina?",
      "Es un profármaco: el organismo debe convertirla en dexanfetamina, lo que produce un inicio más gradual y una duración prolongada respecto a las anfetaminas de acción inmediata.",
    ],
    [
      "¿Qué conviene vigilar durante el tratamiento?",
      "Presión arterial, frecuencia cardíaca, apetito, peso, sueño y estado de ánimo. Registrar la hora exacta de cada toma ayuda a explicar los altibajos durante el día.",
    ],
  ],

  "zinc-bisglycinate-supplement": [
    [
      "Zinc bisglycinate क्या है?",
      "यह zinc का ऐसा रूप है जिसमें zinc दो glycine अणुओं से जुड़ा (chelated) होता है। यह chelation पेट में zinc को स्थिर रखता है, जिससे अवशोषण आमतौर पर बेहतर और सहनशीलता अधिक होती है।",
    ],
    [
      "क्या zinc bisglycinate zinc oxide से बेहतर है?",
      "अध्ययनों में bisglycinate जैसे chelated रूपों का अवशोषण zinc oxide की तुलना में अधिक पाया गया है। Zinc oxide सस्ता है, लेकिन उससे मिलने वाला elemental zinc कम अवशोषित होता है।",
    ],
    [
      "Zinc कब लेना चाहिए?",
      "खाली पेट लेने पर अवशोषण बेहतर होता है, पर मतली हो सकती है — तब हल्के भोजन के साथ लें। Calcium, iron या high-fibre भोजन के साथ लेने से बचें।",
    ],
    [
      "ज़्यादा zinc लेने से क्या होता है?",
      "लंबे समय तक अधिक मात्रा copper की कमी, कम प्रतिरक्षा और anaemia का कारण बन सकती है। अधिकांश वयस्कों के लिए ऊपरी सीमा लगभग 40 mg elemental zinc प्रतिदिन मानी जाती है।",
    ],
    [
      "Zinc किन दवाओं के साथ टकराता है?",
      "Zinc कुछ antibiotics (tetracycline, quinolone) और bisphosphonates के अवशोषण को कम कर सकता है। इन्हें कई घंटों के अंतर पर लें और अपने फार्मासिस्ट से पुष्टि करें।",
    ],
  ],
};

export const CMS_ARTICLE_FAQS = Object.fromEntries(
  Object.entries(common).map(([slug, rows]) => [
    slug,
    rows.map(([question, answer]) => ({ question, answer })),
  ]),
) as Record<string, ArticleFaq[]>;

export function articleFaqs(slug: string, cmsFaqs?: ArticleFaq[] | null): ArticleFaq[] {
  const merged = [...(cmsFaqs ?? [])];
  const seen = new Set(merged.map((faq) => faq.question.trim().toLowerCase()));
  for (const faq of CMS_ARTICLE_FAQS[slug] ?? []) {
    const key = faq.question.trim().toLowerCase();
    if (!seen.has(key)) merged.push(faq);
    seen.add(key);
  }
  return merged;
}
