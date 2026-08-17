// Verified external entity IDs for library compounds.
//
// Each entry was resolved against PubChem and Wikidata and then class-verified
// (Wikidata instance-of / subclass-of must be a chemical, drug, peptide, plant
// or nutrient) and title-checked against PubChem, with false positives removed
// by hand. These power the `sameAs` / `identifier` grounding on compound pages
// so answer engines can tie "X on DoseRoutine" to the same entity they know
// from PubChem, Wikidata and Wikipedia.
//
// To add or correct an entry, verify the ID by hand — do not guess.

export interface CompoundEntityIds {
  /** PubChem Compound ID. */
  cid?: number;
  /** Wikidata item ID, e.g. "Q18216". */
  qid?: string;
  /** English Wikipedia article URL. */
  wikipedia?: string;
}

export const COMPOUND_ENTITY_IDS: Record<string, CompoundEntityIds> = {
  "5-amino-1mq": { cid: 950107 },
  "5-htp": {
    cid: 144,
    qid: "Q238544",
    wikipedia: "https://en.wikipedia.org/wiki/5-Hydroxytryptophan",
  },
  "7-keto-dhea": { cid: 193313, qid: "Q55973939" },
  acetaminophen: {
    cid: 1983,
    qid: "Q57055",
    wikipedia: "https://en.wikipedia.org/wiki/Paracetamol",
  },
  "acetyl-l-carnitine": {
    cid: 7045767,
    qid: "Q311992",
    wikipedia: "https://en.wikipedia.org/wiki/Acetylcarnitine",
  },
  "acp-105": {
    cid: 11638442,
    qid: "Q110264135",
    wikipedia: "https://en.wikipedia.org/wiki/ACP-105",
  },
  adenosylcobalamin: { cid: 70678541, qid: "Q24724725" },
  adipotide: { cid: 163360068 },
  adrafinil: { cid: 3033226, qid: "Q366482", wikipedia: "https://en.wikipedia.org/wiki/Adrafinil" },
  "agmatine-sulfate": { cid: 2794990, qid: "Q21546999" },
  ala: { cid: 864, qid: "Q312229", wikipedia: "https://en.wikipedia.org/wiki/Lipoic_acid" },
  albiglutide: {
    cid: 122173812,
    qid: "Q4712362",
    wikipedia: "https://en.wikipedia.org/wiki/Albiglutide",
  },
  allopurinol: {
    cid: 135401907,
    qid: "Q412486",
    wikipedia: "https://en.wikipedia.org/wiki/Allopurinol",
  },
  "alpha-gpc": {
    cid: 657272,
    qid: "Q28529699",
    wikipedia: "https://en.wikipedia.org/wiki/Glycerophosphorylcholine",
  },
  amantadine: { cid: 2130, qid: "Q409761", wikipedia: "https://en.wikipedia.org/wiki/Amantadine" },
  amitriptyline: {
    cid: 11065,
    qid: "Q58397",
    wikipedia: "https://en.wikipedia.org/wiki/Amitriptyline",
  },
  amlodipine: { cid: 60496, qid: "Q411347", wikipedia: "https://en.wikipedia.org/wiki/Amlodipine" },
  amoxicillin: {
    cid: 33613,
    qid: "Q201928",
    wikipedia: "https://en.wikipedia.org/wiki/Amoxicillin",
  },
  "amphetamine-salts": {
    cid: 44149306,
    qid: "Q935761",
    wikipedia: "https://en.wikipedia.org/wiki/Adderall",
  },
  anamorelin: {
    cid: 16072155,
    qid: "Q20707542",
    wikipedia: "https://en.wikipedia.org/wiki/Anamorelin",
  },
  anastrozole: {
    cid: 2187,
    qid: "Q419143",
    wikipedia: "https://en.wikipedia.org/wiki/Anastrozole",
  },
  "anastrozole-arimidex": {
    cid: 2187,
    qid: "Q419143",
    wikipedia: "https://en.wikipedia.org/wiki/Anastrozole",
  },
  andarine: { cid: 9824562, qid: "Q4753617", wikipedia: "https://en.wikipedia.org/wiki/Andarine" },
  aniracetam: { cid: 2196, qid: "Q417630", wikipedia: "https://en.wikipedia.org/wiki/Aniracetam" },
  "aod-9604": { cid: 71300630, qid: "Q72443552" },
  apigenin: { qid: "Q424567", wikipedia: "https://en.wikipedia.org/wiki/Apigenin" },
  apixaban: { cid: 10182969, qid: "Q414462", wikipedia: "https://en.wikipedia.org/wiki/Apixaban" },
  "apple-cider-vinegar": {
    qid: "Q618322",
    wikipedia: "https://en.wikipedia.org/wiki/Apple_cider_vinegar",
  },
  "ara-290": {
    cid: 91810664,
    qid: "Q27273306",
    wikipedia: "https://en.wikipedia.org/wiki/Cibinetide",
  },
  argireline: {
    cid: 71587772,
    qid: "Q3622439",
    wikipedia: "https://en.wikipedia.org/wiki/Acetyl_hexapeptide-8",
  },
  armodafinil: {
    cid: 9690109,
    qid: "Q418913",
    wikipedia: "https://en.wikipedia.org/wiki/Armodafinil",
  },
  ashwagandha: { qid: "Q852660", wikipedia: "https://en.wikipedia.org/wiki/Withania_somnifera" },
  "aspirin-low-dose": { cid: 2244 },
  astaxanthin: {
    cid: 12358421,
    qid: "Q413740",
    wikipedia: "https://en.wikipedia.org/wiki/Astaxanthin",
  },
  astragalus: { qid: "Q157184", wikipedia: "https://en.wikipedia.org/wiki/Astragalus_(plant)" },
  atenolol: { cid: 2249, qid: "Q411325", wikipedia: "https://en.wikipedia.org/wiki/Atenolol" },
  atomoxetine: {
    cid: 54840,
    qid: "Q417240",
    wikipedia: "https://en.wikipedia.org/wiki/Atomoxetine",
  },
  atorvastatin: {
    cid: 656846,
    qid: "Q668093",
    wikipedia: "https://en.wikipedia.org/wiki/Atorvastatin",
  },
  azithromycin: {
    cid: 447043,
    qid: "Q165399",
    wikipedia: "https://en.wikipedia.org/wiki/Azithromycin",
  },
  "bacopa-monnieri": {
    qid: "Q1366575",
    wikipedia: "https://en.wikipedia.org/wiki/Bacopa_monnieri",
  },
  "banaba-leaf": {
    cid: 6918774,
    qid: "Q5172335",
    wikipedia: "https://en.wikipedia.org/wiki/Corosolic_acid",
  },
  bcaas: {
    cid: 9886134,
    qid: "Q420726",
    wikipedia: "https://en.wikipedia.org/wiki/Branched-chain_amino_acid",
  },
  benfotiamine: {
    cid: 3032771,
    qid: "Q409953",
    wikipedia: "https://en.wikipedia.org/wiki/Benfotiamine",
  },
  berberine: { cid: 12457, qid: "Q176525", wikipedia: "https://en.wikipedia.org/wiki/Berberine" },
  "berberine-hcl": { cid: 12456 },
  "beta-alanine": {
    cid: 239,
    qid: "Q310919",
    wikipedia: "https://en.wikipedia.org/wiki/%CE%92-Alanine",
  },
  "beta-sitosterol": {
    cid: 222284,
    qid: "Q121802",
    wikipedia: "https://en.wikipedia.org/wiki/%CE%92-Sitosterol",
  },
  "betaine-anhydrous": {
    cid: 247,
    qid: "Q10860583",
    wikipedia: "https://en.wikipedia.org/wiki/Trimethylglycine",
  },
  "bitter-melon": {
    qid: "Q428750",
    wikipedia: "https://en.wikipedia.org/wiki/Momordica_charantia",
  },
  "black-cohosh": { qid: "Q27658295" },
  "black-seed-oil": { qid: "Q160575", wikipedia: "https://en.wikipedia.org/wiki/Nigella_sativa" },
  "boldenone-undecylenate": {
    cid: 11954310,
    qid: "Q27295867",
    wikipedia: "https://en.wikipedia.org/wiki/Boldenone_undecylenate",
  },
  boron: { cid: 2724165, qid: "Q618", wikipedia: "https://en.wikipedia.org/wiki/Boron" },
  "boron-glycinate": { cid: 92003852 },
  "boswellia-serrata": {
    qid: "Q2367334",
    wikipedia: "https://en.wikipedia.org/wiki/Boswellia_serrata",
  },
  "bpc-157": { cid: 9941957, qid: "Q27270252", wikipedia: "https://en.wikipedia.org/wiki/BPC-157" },
  bromantane: {
    cid: 4660557,
    qid: "Q385533",
    wikipedia: "https://en.wikipedia.org/wiki/Bromantane",
  },
  bromelain: {
    cid: 44263865,
    qid: "Q415756",
    wikipedia: "https://en.wikipedia.org/wiki/Bromelain",
  },
  bronchogen: { cid: 11690869 },
  bupropion: { cid: 62884, qid: "Q834280", wikipedia: "https://en.wikipedia.org/wiki/Bupropion" },
  buspirone: { cid: 2477, qid: "Q412194", wikipedia: "https://en.wikipedia.org/wiki/Buspirone" },
  caffeine: { cid: 9871508, qid: "Q60235", wikipedia: "https://en.wikipedia.org/wiki/Caffeine" },
  cagrilintide: {
    cid: 171397054,
    qid: "Q123428019",
    wikipedia: "https://en.wikipedia.org/wiki/Cagrilintide",
  },
  calcium: { cid: 10112, qid: "Q706", wikipedia: "https://en.wikipedia.org/wiki/Calcium" },
  "calcium-d-glucarate": {
    cid: 154911,
    qid: "Q27289374",
    wikipedia: "https://en.wikipedia.org/wiki/Calcium_D-glucarate",
  },
  capromorelin: {
    cid: 216208,
    qid: "Q5036299",
    wikipedia: "https://en.wikipedia.org/wiki/Capromorelin",
  },
  carbetocin: {
    cid: 16681432,
    qid: "Q5037853",
    wikipedia: "https://en.wikipedia.org/wiki/Carbetocin",
  },
  cardarine: { cid: 9803963, qid: "Q5515069", wikipedia: "https://en.wikipedia.org/wiki/GW501516" },
  carvedilol: {
    cid: 185395,
    qid: "Q412534",
    wikipedia: "https://en.wikipedia.org/wiki/Carvedilol",
  },
  "cdp-choline": {
    cid: 13804,
    qid: "Q28529682",
    wikipedia: "https://en.wikipedia.org/wiki/Citicoline",
  },
  celecoxib: { cid: 2662, qid: "Q408801", wikipedia: "https://en.wikipedia.org/wiki/Celecoxib" },
  cephalexin: { cid: 27447, qid: "Q411417", wikipedia: "https://en.wikipedia.org/wiki/Cefalexin" },
  cerebrolysin: { qid: "Q19946892", wikipedia: "https://en.wikipedia.org/wiki/Cerebrolysin" },
  cetirizine: { cid: 55182, qid: "Q423075", wikipedia: "https://en.wikipedia.org/wiki/Cetirizine" },
  chlorella: { qid: "Q133017", wikipedia: "https://en.wikipedia.org/wiki/Chlorella" },
  "choline-bitartrate": {
    cid: 6900,
    qid: "Q18324709",
    wikipedia: "https://en.wikipedia.org/wiki/Choline_bitartrate",
  },
  "chondroitin-sulfate": {
    cid: 24766,
    qid: "Q408014",
    wikipedia: "https://en.wikipedia.org/wiki/Chondroitin_sulfate",
  },
  "chromium-picolinate": {
    cid: 151932,
    qid: "Q2329715",
    wikipedia: "https://en.wikipedia.org/wiki/Chromium(III)_picolinate",
  },
  "cinnamon-extract": {
    qid: "Q204148",
    wikipedia: "https://en.wikipedia.org/wiki/Cinnamomum_cassia",
  },
  ciprofloxacin: {
    cid: 62998,
    qid: "Q256602",
    wikipedia: "https://en.wikipedia.org/wiki/Ciprofloxacin",
  },
  citalopram: {
    cid: 10150457,
    qid: "Q409672",
    wikipedia: "https://en.wikipedia.org/wiki/Citalopram",
  },
  "citrulline-malate": { cid: 162762, qid: "Q27286437" },
  "cjc-1295": {
    cid: 91971820,
    qid: "Q5012018",
    wikipedia: "https://en.wikipedia.org/wiki/CJC-1295",
  },
  "cjc-1295-with-dac": { cid: 56841945 },
  cla: { cid: 5280644 },
  "clomiphene-citrate": {
    cid: 60974,
    qid: "Q72461111",
    wikipedia: "https://en.wikipedia.org/wiki/Clomiphene_citrate",
  },
  clonidine: { cid: 2803, qid: "Q412221", wikipedia: "https://en.wikipedia.org/wiki/Clonidine" },
  clopidogrel: {
    cid: 115366,
    qid: "Q410237",
    wikipedia: "https://en.wikipedia.org/wiki/Clopidogrel",
  },
  colchicine: { cid: 6167, qid: "Q326224", wikipedia: "https://en.wikipedia.org/wiki/Colchicine" },
  collagen: { qid: "Q1779264" },
  coluracetam: {
    cid: 214346,
    qid: "Q3683872",
    wikipedia: "https://en.wikipedia.org/wiki/Coluracetam",
  },
  copper: { cid: 23978, qid: "Q753", wikipedia: "https://en.wikipedia.org/wiki/Copper" },
  coq10: { cid: 5281915, qid: "Q321285", wikipedia: "https://en.wikipedia.org/wiki/Coenzyme_Q10" },
  cordyceps: { qid: "Q312238", wikipedia: "https://en.wikipedia.org/wiki/Cordyceps" },
  creatine: { cid: 80116, qid: "Q27271832" },
  "creatine-hcl": { cid: 134732 },
  curcumin: { cid: 969516, qid: "Q312266", wikipedia: "https://en.wikipedia.org/wiki/Curcumin" },
  cycloastragenol: {
    cid: 13943286,
    qid: "Q3979404",
    wikipedia: "https://en.wikipedia.org/wiki/Cycloastragenol",
  },
  "d-ribose": { cid: 10975657, qid: "Q38176423" },
  dabigatran: {
    cid: 216210,
    qid: "Q419345",
    wikipedia: "https://en.wikipedia.org/wiki/Dabigatran",
  },
  "dandelion-root": { qid: "Q95998986" },
  "delta-sleep-inducing-peptide": {
    cid: 68816,
    qid: "Q5254800",
    wikipedia: "https://en.wikipedia.org/wiki/Delta-sleep-inducing_peptide",
  },
  dexmethylphenidate: {
    cid: 154100,
    qid: "Q1207210",
    wikipedia: "https://en.wikipedia.org/wiki/Dexmethylphenidate",
  },
  dhea: {
    cid: 9817954,
    qid: "Q408376",
    wikipedia: "https://en.wikipedia.org/wiki/Dehydroepiandrosterone",
  },
  diclofenac: {
    cid: 5018304,
    qid: "Q244408",
    wikipedia: "https://en.wikipedia.org/wiki/Diclofenac",
  },
  dihexa: { cid: 129010512 },
  dihydroberberine: { cid: 10217 },
  diindolylmethane: { cid: 3071 },
  diphenhydramine: {
    cid: 8980,
    qid: "Q413486",
    wikipedia: "https://en.wikipedia.org/wiki/Diphenhydramine",
  },
  "dl-phenylalanine": { cid: 994, qid: "Q27103475" },
  "dong-quai": { qid: "Q2051387", wikipedia: "https://en.wikipedia.org/wiki/Angelica_sinensis" },
  doxycycline: {
    cid: 54685920,
    qid: "Q422442",
    wikipedia: "https://en.wikipedia.org/wiki/Doxycycline",
  },
  "drostanolone-propionate": {
    cid: 224004,
    qid: "Q5308606",
    wikipedia: "https://en.wikipedia.org/wiki/Drostanolone_propionate",
  },
  dulaglutide: {
    cid: 171042928,
    qid: "Q21011228",
    wikipedia: "https://en.wikipedia.org/wiki/Dulaglutide",
  },
  duloxetine: { cid: 60834, qid: "Q411932", wikipedia: "https://en.wikipedia.org/wiki/Duloxetine" },
  dutasteride: {
    cid: 11679580,
    qid: "Q424760",
    wikipedia: "https://en.wikipedia.org/wiki/Dutasteride",
  },
  dynamine: { qid: "Q3010661", wikipedia: "https://en.wikipedia.org/wiki/Dynamine" },
  eaas: { qid: "Q245282", wikipedia: "https://en.wikipedia.org/wiki/Essential_amino_acid" },
  ecdysterone: {
    cid: 118701161,
    qid: "Q423338",
    wikipedia: "https://en.wikipedia.org/wiki/20-Hydroxyecdysone",
  },
  ecnoglutide: {
    cid: 162625103,
    qid: "Q123481340",
    wikipedia: "https://en.wikipedia.org/wiki/Ecnoglutide",
  },
  enalapril: {
    cid: 14962498,
    qid: "Q422185",
    wikipedia: "https://en.wikipedia.org/wiki/Enalapril",
  },
  enclomiphene: {
    cid: 1548953,
    qid: "Q28208734",
    wikipedia: "https://en.wikipedia.org/wiki/Enclomifene",
  },
  "enclomiphene-citrate": { cid: 6420009, qid: "Q27281081" },
  "epitalon-aegg": { cid: 219042 },
  epithalon: { cid: 219042, qid: "Q27285389", wikipedia: "https://en.wikipedia.org/wiki/Epitalon" },
  ergothioneine: {
    cid: 5351619,
    qid: "Q614788",
    wikipedia: "https://en.wikipedia.org/wiki/Ergothioneine",
  },
  escitalopram: {
    cid: 146571,
    qid: "Q423757",
    wikipedia: "https://en.wikipedia.org/wiki/Escitalopram",
  },
  esomeprazole: {
    cid: 9568614,
    qid: "Q553223",
    wikipedia: "https://en.wikipedia.org/wiki/Esomeprazole",
  },
  estradiol: {
    cid: 5991,
    qid: "Q4721888",
    wikipedia: "https://en.wikipedia.org/wiki/17%CE%B1-Estradiol",
  },
  "estradiol-valerate": {
    cid: 13791,
    qid: "Q5401768",
    wikipedia: "https://en.wikipedia.org/wiki/Estradiol_valerate",
  },
  eszopiclone: {
    cid: 969472,
    qid: "Q413184",
    wikipedia: "https://en.wikipedia.org/wiki/Eszopiclone",
  },
  "evening-primrose-oil": { qid: "Q55829827" },
  exemestane: { cid: 60198, qid: "Q418819", wikipedia: "https://en.wikipedia.org/wiki/Exemestane" },
  exenatide: {
    cid: 45588096,
    qid: "Q417762",
    wikipedia: "https://en.wikipedia.org/wiki/Exenatide",
  },
  ezetimibe: { cid: 150311, qid: "Q417997", wikipedia: "https://en.wikipedia.org/wiki/Ezetimibe" },
  "fadogia-agrestis": { qid: "Q39830766" },
  famotidine: {
    cid: 5702160,
    qid: "Q411159",
    wikipedia: "https://en.wikipedia.org/wiki/Famotidine",
  },
  fasoracetam: {
    cid: 10198262,
    qid: "Q5436839",
    wikipedia: "https://en.wikipedia.org/wiki/Fasoracetam",
  },
  fenofibrate: {
    cid: 3339,
    qid: "Q419724",
    wikipedia: "https://en.wikipedia.org/wiki/Fenofibrate",
  },
  fenugreek: {
    cid: 163183937,
    qid: "Q133205",
    wikipedia: "https://en.wikipedia.org/wiki/Fenugreek",
  },
  finasteride: {
    cid: 58630855,
    qid: "Q424167",
    wikipedia: "https://en.wikipedia.org/wiki/Finasteride",
  },
  "finasteride-1mg": { cid: 57363, qid: "Q47522038" },
  fisetin: { cid: 5281614, qid: "Q418384", wikipedia: "https://en.wikipedia.org/wiki/Fisetin" },
  "fish-oil-high-epa": { cid: 446284 },
  fluconazole: {
    cid: 3365,
    qid: "Q411478",
    wikipedia: "https://en.wikipedia.org/wiki/Fluconazole",
  },
  fluoxetine: {
    cid: 57369875,
    qid: "Q422244",
    wikipedia: "https://en.wikipedia.org/wiki/Fluoxetine",
  },
  fluoxymesterone: {
    cid: 6446,
    qid: "Q410663",
    wikipedia: "https://en.wikipedia.org/wiki/Fluoxymesterone",
  },
  furosemide: { cid: 3440, qid: "Q388801", wikipedia: "https://en.wikipedia.org/wiki/Furosemide" },
  gaba: { cid: 119, qid: "Q210021", wikipedia: "https://en.wikipedia.org/wiki/GABA" },
  gabapentin: { cid: 3446, qid: "Q410352", wikipedia: "https://en.wikipedia.org/wiki/Gabapentin" },
  "garcinia-cambogia": { qid: "Q2089493" },
  "gdf-11": { qid: "Q14912149" },
  "ghk-cu": {
    cid: 9831891,
    qid: "Q5168796",
    wikipedia: "https://en.wikipedia.org/wiki/Copper_peptide_GHK-Cu",
  },
  "ghrh-1-29": {
    cid: 16199244,
    qid: "Q7455005",
    wikipedia: "https://en.wikipedia.org/wiki/Sermorelin",
  },
  "ghrp-2": {
    cid: 6918245,
    qid: "Q21098924",
    wikipedia: "https://en.wikipedia.org/wiki/Pralmorelin",
  },
  "ghrp-6": { cid: 4345065, qid: "Q27077800" },
  "glucosamine-sulfate": { cid: 73415774, qid: "Q27252374" },
  glutamine: { cid: 75855, qid: "Q181619", wikipedia: "https://en.wikipedia.org/wiki/Glutamine" },
  glutathione: {
    cid: 124886,
    qid: "Q116907",
    wikipedia: "https://en.wikipedia.org/wiki/Glutathione",
  },
  glycine: {
    cid: 67149,
    qid: "Q311395",
    wikipedia: "https://en.wikipedia.org/wiki/Glycine_(plant)",
  },
  gonadorelin: {
    cid: 638793,
    qid: "Q20817116",
    wikipedia: "https://en.wikipedia.org/wiki/Gonadorelin",
  },
  "green-coffee-bean-extract": {
    cid: 1794427,
    qid: "Q421964",
    wikipedia: "https://en.wikipedia.org/wiki/Chlorogenic_acid",
  },
  "green-tea-extract": { qid: "Q72509498" },
  guanfacine: {
    cid: 71401,
    qid: "Q5613599",
    wikipedia: "https://en.wikipedia.org/wiki/Guanfacine",
  },
  "gymnema-sylvestre": {
    qid: "Q2725835",
    wikipedia: "https://en.wikipedia.org/wiki/Gymnema_sylvestre",
  },
  hcg: {
    cid: 16131408,
    qid: "Q407172",
    wikipedia: "https://en.wikipedia.org/wiki/Human_chorionic_gonadotropin",
  },
  hexarelin: {
    cid: 6918297,
    qid: "Q21098927",
    wikipedia: "https://en.wikipedia.org/wiki/Examorelin",
  },
  "hgh-somatropin": { qid: "Q58526200" },
  hmb: {
    cid: 9860341,
    qid: "Q223081",
    wikipedia: "https://en.wikipedia.org/wiki/%CE%92-Hydroxy_%CE%B2-methylbutyric_acid",
  },
  "holy-basil": { qid: "Q960124", wikipedia: "https://en.wikipedia.org/wiki/Ocimum_tenuiflorum" },
  hordenine: { cid: 68313, qid: "Q119915", wikipedia: "https://en.wikipedia.org/wiki/Hordenine" },
  "horny-goat-weed": { qid: "Q157746", wikipedia: "https://en.wikipedia.org/wiki/Epimedium" },
  humanin: { cid: 16131438, qid: "Q24769974" },
  "huperzine-a": {
    cid: 854026,
    qid: "Q425198",
    wikipedia: "https://en.wikipedia.org/wiki/Huperzine_A",
  },
  hydrochlorothiazide: {
    cid: 3639,
    qid: "Q423930",
    wikipedia: "https://en.wikipedia.org/wiki/Hydrochlorothiazide",
  },
  hydrocortisone: {
    cid: 5754,
    qid: "Q190875",
    wikipedia: "https://en.wikipedia.org/wiki/Cortisol",
  },
  ibuprofen: {
    cid: 24848049,
    qid: "Q186969",
    wikipedia: "https://en.wikipedia.org/wiki/Ibuprofen",
  },
  "igf-1-lr3": { qid: "Q20707573", wikipedia: "https://en.wikipedia.org/wiki/IGF-1_LR3" },
  inositol: { cid: 892, qid: "Q407997", wikipedia: "https://en.wikipedia.org/wiki/Inositol" },
  "insulin-long-acting": { cid: 118984454, qid: "Q29006109" },
  "insulin-rapid": {
    cid: 16132418,
    qid: "Q2754775",
    wikipedia: "https://en.wikipedia.org/wiki/Insulin_aspart",
  },
  iodine: { cid: 807, qid: "Q1103", wikipedia: "https://en.wikipedia.org/wiki/Iodine" },
  ipamorelin: {
    cid: 9831659,
    qid: "Q20707829",
    wikipedia: "https://en.wikipedia.org/wiki/Ipamorelin",
  },
  iron: { cid: 24393, qid: "Q428946", wikipedia: "https://en.wikipedia.org/wiki/Ferrous" },
  isotretinoin: {
    cid: 5282379,
    qid: "Q287029",
    wikipedia: "https://en.wikipedia.org/wiki/Isotretinoin",
  },
  ivermectin: {
    cid: 56841529,
    qid: "Q415178",
    wikipedia: "https://en.wikipedia.org/wiki/Ivermectin",
  },
  "kisspeptin-10": { cid: 25240297 },
  kpv: { cid: 90474670, qid: "Q139981024" },
  "krill-oil": { qid: "Q599039", wikipedia: "https://en.wikipedia.org/wiki/Krill_oil" },
  "l-arginine": { cid: 6322, qid: "Q173670", wikipedia: "https://en.wikipedia.org/wiki/Arginine" },
  "l-carnitine": { cid: 10917, qid: "Q20735709" },
  "l-citrulline": {
    cid: 9750,
    qid: "Q408641",
    wikipedia: "https://en.wikipedia.org/wiki/Citrulline",
  },
  "l-theanine": {
    cid: 439378,
    qid: "Q909931",
    wikipedia: "https://en.wikipedia.org/wiki/Theanine",
  },
  "l-tryptophan": {
    cid: 6305,
    qid: "Q181003",
    wikipedia: "https://en.wikipedia.org/wiki/Tryptophan",
  },
  lansoprazole: {
    cid: 3883,
    qid: "Q254296",
    wikipedia: "https://en.wikipedia.org/wiki/Lansoprazole",
  },
  larazotide: {
    cid: 9810532,
    qid: "Q27295752",
    wikipedia: "https://en.wikipedia.org/wiki/Larazotide",
  },
  letrozole: { qid: "Q194974", wikipedia: "https://en.wikipedia.org/wiki/Letrozole" },
  leucine: { cid: 6106, qid: "Q483745", wikipedia: "https://en.wikipedia.org/wiki/Leucine" },
  levocetirizine: {
    cid: 9955977,
    qid: "Q421091",
    wikipedia: "https://en.wikipedia.org/wiki/Levocetirizine",
  },
  levothyroxine: { qid: "Q773449", wikipedia: "https://en.wikipedia.org/wiki/Levothyroxine" },
  "levothyroxine-sodium": {
    cid: 23666112,
    qid: "Q773449",
    wikipedia: "https://en.wikipedia.org/wiki/Levothyroxine",
  },
  ligandrol: {
    cid: 44137686,
    qid: "Q21098841",
    wikipedia: "https://en.wikipedia.org/wiki/LGD-4033",
  },
  "lion-s-mane-mushroom": {
    qid: "Q19737",
    wikipedia: "https://en.wikipedia.org/wiki/Hericium_erinaceus",
  },
  liothyronine: {
    cid: 23724940,
    qid: "Q327362",
    wikipedia: "https://en.wikipedia.org/wiki/Triiodothyronine",
  },
  liraglutide: {
    cid: 16134956,
    qid: "Q2526479",
    wikipedia: "https://en.wikipedia.org/wiki/Liraglutide",
  },
  lisdexamfetamine: {
    cid: 11597697,
    qid: "Q6558704",
    wikipedia: "https://en.wikipedia.org/wiki/Lisdexamfetamine",
  },
  lisinopril: { cid: 55187, qid: "Q412208", wikipedia: "https://en.wikipedia.org/wiki/Lisinopril" },
  "lithium-carbonate": {
    cid: 11125,
    qid: "Q410174",
    wikipedia: "https://en.wikipedia.org/wiki/Lithium_carbonate",
  },
  "lithium-orotate": {
    cid: 23686432,
    qid: "Q6647963",
    wikipedia: "https://en.wikipedia.org/wiki/Lithium_orotate",
  },
  livagen: { cid: 87919683 },
  lixisenatide: {
    cid: 90472060,
    qid: "Q6659956",
    wikipedia: "https://en.wikipedia.org/wiki/Lixisenatide",
  },
  "ll-37": { cid: 16198951, qid: "Q135995608" },
  loratadine: { cid: 3957, qid: "Q424049", wikipedia: "https://en.wikipedia.org/wiki/Loratadine" },
  losartan: { cid: 11751549, qid: "Q410074", wikipedia: "https://en.wikipedia.org/wiki/Losartan" },
  lovastatin: { cid: 53232, qid: "Q417740", wikipedia: "https://en.wikipedia.org/wiki/Lovastatin" },
  "low-dose-naltrexone": {
    qid: "Q5259325",
    wikipedia: "https://en.wikipedia.org/wiki/Low-dose_naltrexone",
  },
  lycopene: { cid: 446925, qid: "Q208130", wikipedia: "https://en.wikipedia.org/wiki/Lycopene" },
  macimorelin: {
    cid: 9804938,
    qid: "Q15624037",
    wikipedia: "https://en.wikipedia.org/wiki/Macimorelin",
  },
  "magnesium-citrate": {
    cid: 6099959,
    qid: "Q45044",
    wikipedia: "https://en.wikipedia.org/wiki/Magnesium_citrate",
  },
  "magnesium-glycinate": {
    cid: 84645,
    qid: "Q19597808",
    wikipedia: "https://en.wikipedia.org/wiki/Magnesium_glycinate",
  },
  "magnesium-l-threonate": {
    cid: 45489777,
    qid: "Q6731374",
    wikipedia: "https://en.wikipedia.org/wiki/Magnesium_L-threonate",
  },
  "magnesium-malate": {
    cid: 164748,
    qid: "Q5927277",
    wikipedia: "https://en.wikipedia.org/wiki/Magnesium_malate",
  },
  "magnesium-oxide": {
    cid: 14792,
    qid: "Q214769",
    wikipedia: "https://en.wikipedia.org/wiki/Magnesium_oxide",
  },
  "magnesium-taurate": {
    cid: 13343447,
    qid: "Q25323830",
    wikipedia: "https://en.wikipedia.org/wiki/Magnesium_taurate",
  },
  manganese: { cid: 23930, qid: "Q731", wikipedia: "https://en.wikipedia.org/wiki/Manganese" },
  matrixyl: {
    cid: 9897237,
    qid: "Q18386276",
    wikipedia: "https://en.wikipedia.org/wiki/Palmitoyl_pentapeptide-4",
  },
  mazdutide: {
    cid: 167312357,
    qid: "Q123248554",
    wikipedia: "https://en.wikipedia.org/wiki/Mazdutide",
  },
  "melanotan-i": {
    cid: 16197727,
    qid: "Q410794",
    wikipedia: "https://en.wikipedia.org/wiki/Afamelanotide",
  },
  "melanotan-ii": {
    cid: 92432,
    qid: "Q423855",
    wikipedia: "https://en.wikipedia.org/wiki/Melanotan_II",
  },
  melatonin: { cid: 896, qid: "Q180912", wikipedia: "https://en.wikipedia.org/wiki/Melatonin" },
  mesterolone: {
    cid: 102324219,
    qid: "Q4291328",
    wikipedia: "https://en.wikipedia.org/wiki/Mesterolone",
  },
  metformin: { cid: 14219, qid: "Q19484", wikipedia: "https://en.wikipedia.org/wiki/Metformin" },
  "metformin-er": { cid: 14219 },
  methandrostenolone: {
    cid: 6300,
    qid: "Q417194",
    wikipedia: "https://en.wikipedia.org/wiki/Metandienone",
  },
  "methenolone-enanthate": {
    cid: 248271,
    qid: "Q15409391",
    wikipedia: "https://en.wikipedia.org/wiki/Metenolone_enanthate",
  },
  methylcobalamin: {
    cid: 6449897,
    qid: "Q250442",
    wikipedia: "https://en.wikipedia.org/wiki/Methylcobalamin",
  },
  "methylene-blue": {
    cid: 6099,
    qid: "Q422134",
    wikipedia: "https://en.wikipedia.org/wiki/Methylene_blue",
  },
  methylphenidate: {
    cid: 9280,
    qid: "Q422112",
    wikipedia: "https://en.wikipedia.org/wiki/Methylphenidate",
  },
  methyltestosterone: {
    cid: 6010,
    qid: "Q421768",
    wikipedia: "https://en.wikipedia.org/wiki/Methyltestosterone",
  },
  metoprolol: { cid: 6440651, qid: "Q72492436" },
  metronidazole: {
    cid: 4173,
    qid: "Q169569",
    wikipedia: "https://en.wikipedia.org/wiki/Metronidazole",
  },
  "milk-thistle": { qid: "Q193798", wikipedia: "https://en.wikipedia.org/wiki/Silybum_marianum" },
  minocycline: {
    cid: 68858974,
    qid: "Q415336",
    wikipedia: "https://en.wikipedia.org/wiki/Minocycline",
  },
  "minoxidil-oral": { cid: 4201 },
  mirtazapine: {
    cid: 46782643,
    qid: "Q421930",
    wikipedia: "https://en.wikipedia.org/wiki/Mirtazapine",
  },
  "mk-677": {
    cid: 6450830,
    qid: "Q5984942",
    wikipedia: "https://en.wikipedia.org/wiki/Ibutamoren",
  },
  "mod-4023": { qid: "Q110220159", wikipedia: "https://en.wikipedia.org/wiki/Somatrogon" },
  modafinil: { cid: 4236, qid: "Q410441", wikipedia: "https://en.wikipedia.org/wiki/Modafinil" },
  molybdenum: { cid: 23932, qid: "Q1053", wikipedia: "https://en.wikipedia.org/wiki/Molybdenum" },
  "mots-c": { cid: 146675088 },
  "mots-c-analog": { cid: 146675088 },
  "msm-powder": {
    cid: 6213,
    qid: "Q423842",
    wikipedia: "https://en.wikipedia.org/wiki/Methylsulfonylmethane",
  },
  "mucuna-pruriens": { qid: "Q953611", wikipedia: "https://en.wikipedia.org/wiki/Mucuna_pruriens" },
  "n-acetyl-l-tyrosine": {
    cid: 68310,
    qid: "Q27109405",
    wikipedia: "https://en.wikipedia.org/wiki/N-Acetyl-L-tyrosine",
  },
  "n-acetyl-selank": { cid: 133082488 },
  "n-acetyl-semax-amidate": { cid: 172638603 },
  nac: { cid: 12035, qid: "Q375613", wikipedia: "https://en.wikipedia.org/wiki/Acetylcysteine" },
  "naltrexone-full-dose": {
    cid: 5360515,
    qid: "Q409587",
    wikipedia: "https://en.wikipedia.org/wiki/Naltrexone",
  },
  "nandrolone-decanoate": {
    cid: 9677,
    qid: "Q16634231",
    wikipedia: "https://en.wikipedia.org/wiki/Nandrolone_decanoate",
  },
  "nandrolone-phenylpropionate": {
    cid: 229455,
    qid: "Q4312826",
    wikipedia: "https://en.wikipedia.org/wiki/Nandrolone_phenylpropionate",
  },
  naproxen: { cid: 23681059, qid: "Q1215575", wikipedia: "https://en.wikipedia.org/wiki/Naproxen" },
  nattokinase: { qid: "Q11323875", wikipedia: "https://en.wikipedia.org/wiki/Nattokinase" },
  niacinamide: {
    cid: 936,
    qid: "Q192423",
    wikipedia: "https://en.wikipedia.org/wiki/Nicotinamide",
  },
  nmn: { cid: 14180, qid: "Q27094156" },
  noopept: { cid: 180496, qid: "Q7049784", wikipedia: "https://en.wikipedia.org/wiki/Omberacetam" },
  nortriptyline: {
    cid: 4543,
    qid: "Q61387",
    wikipedia: "https://en.wikipedia.org/wiki/Nortriptyline",
  },
  nr: { cid: 439924 },
  "omega-3": { cid: 446284, qid: "Q1786125", wikipedia: "https://en.wikipedia.org/wiki/Fish_oil" },
  omeprazole: { cid: 4594, qid: "Q422210", wikipedia: "https://en.wikipedia.org/wiki/Omeprazole" },
  "omeprazole-prilosec": {
    cid: 155794,
    qid: "Q422210",
    wikipedia: "https://en.wikipedia.org/wiki/Omeprazole",
  },
  orforglipron: {
    cid: 137319706,
    qid: "Q120491908",
    wikipedia: "https://en.wikipedia.org/wiki/Orforglipron",
  },
  ostarine: {
    cid: 11326715,
    qid: "Q5379258",
    wikipedia: "https://en.wikipedia.org/wiki/Enobosarm",
  },
  osteocalcin: { qid: "Q59250722" },
  oxandrolone: {
    cid: 13728274,
    qid: "Q420859",
    wikipedia: "https://en.wikipedia.org/wiki/Oxandrolone",
  },
  oxiracetam: { cid: 4626, qid: "Q415099", wikipedia: "https://en.wikipedia.org/wiki/Oxiracetam" },
  oxymetholone: {
    cid: 5281034,
    qid: "Q420864",
    wikipedia: "https://en.wikipedia.org/wiki/Oxymetholone",
  },
  oxytocin: { cid: 439302, qid: "Q169960", wikipedia: "https://en.wikipedia.org/wiki/Oxytocin" },
  p21: { cid: 14191208 },
  "panax-ginseng": { qid: "Q182881", wikipedia: "https://en.wikipedia.org/wiki/Panax_ginseng" },
  pantoprazole: {
    cid: 15008962,
    qid: "Q286846",
    wikipedia: "https://en.wikipedia.org/wiki/Pantoprazole",
  },
  paroxetine: {
    cid: 9845306,
    qid: "Q408471",
    wikipedia: "https://en.wikipedia.org/wiki/Paroxetine",
  },
  passionflower: { qid: "Q161185", wikipedia: "https://en.wikipedia.org/wiki/Passiflora" },
  "pe-22-28": { cid: 165437303 },
  "pentosan-polysulfate": {
    qid: "Q7165276",
    wikipedia: "https://en.wikipedia.org/wiki/Pentosan_polysulfate",
  },
  phenelzine: {
    cid: 61100,
    qid: "Q1747559",
    wikipedia: "https://en.wikipedia.org/wiki/Phenelzine",
  },
  phenylalanine: {
    cid: 6140,
    qid: "Q170545",
    wikipedia: "https://en.wikipedia.org/wiki/Phenylalanine",
  },
  phenylpiracetam: {
    cid: 132441,
    qid: "Q420882",
    wikipedia: "https://en.wikipedia.org/wiki/Phenylpiracetam",
  },
  phosphatidylserine: {
    cid: 9547096,
    qid: "Q2354337",
    wikipedia: "https://en.wikipedia.org/wiki/Phosphatidylserine",
  },
  phosphorus: { cid: 5462309, qid: "Q674", wikipedia: "https://en.wikipedia.org/wiki/Phosphorus" },
  "pine-bark-extract": { qid: "Q72499888" },
  pinealon: {
    cid: 10273502,
    qid: "Q106026341",
    wikipedia: "https://en.wikipedia.org/wiki/Pinealon",
  },
  piracetam: { cid: 4843, qid: "Q410069", wikipedia: "https://en.wikipedia.org/wiki/Piracetam" },
  potassium: { cid: 516951, qid: "Q703", wikipedia: "https://en.wikipedia.org/wiki/Potassium" },
  pqq: { cid: 1024 },
  pralmorelin: {
    cid: 9940988,
    qid: "Q21098924",
    wikipedia: "https://en.wikipedia.org/wiki/Pralmorelin",
  },
  pramiracetam: {
    cid: 51712,
    qid: "Q415746",
    wikipedia: "https://en.wikipedia.org/wiki/Pramiracetam",
  },
  pravastatin: {
    cid: 9931182,
    qid: "Q1240093",
    wikipedia: "https://en.wikipedia.org/wiki/Pravastatin",
  },
  prednisone: { cid: 5865, qid: "Q424972", wikipedia: "https://en.wikipedia.org/wiki/Prednisone" },
  pregabalin: {
    cid: 5486971,
    qid: "Q412174",
    wikipedia: "https://en.wikipedia.org/wiki/Pregabalin",
  },
  pregnenolone: {
    cid: 15032,
    qid: "Q412158",
    wikipedia: "https://en.wikipedia.org/wiki/Pregnenolone",
  },
  progesterone: {
    cid: 5994,
    qid: "Q26963",
    wikipedia: "https://en.wikipedia.org/wiki/Progesterone",
  },
  "propionyl-l-carnitine": { cid: 188824, qid: "Q27103933" },
  propranolol: {
    cid: 165193,
    qid: "Q423364",
    wikipedia: "https://en.wikipedia.org/wiki/Propranolol",
  },
  protein: { qid: "Q185009", wikipedia: "https://en.wikipedia.org/wiki/Whey" },
  "pt-141": {
    cid: 9941379,
    qid: "Q415353",
    wikipedia: "https://en.wikipedia.org/wiki/Bremelanotide",
  },
  pterostilbene: {
    cid: 5281727,
    qid: "Q2908011",
    wikipedia: "https://en.wikipedia.org/wiki/Pterostilbene",
  },
  pygeum: { qid: "Q6093547", wikipedia: "https://en.wikipedia.org/wiki/Pygeum_(plant)" },
  quercetin: { cid: 5280804, qid: "Q409478", wikipedia: "https://en.wikipedia.org/wiki/Quercetin" },
  "r-alpha-lipoic-acid": { cid: 6112, qid: "Q27887203" },
  raloxifene: {
    cid: 18410283,
    qid: "Q425223",
    wikipedia: "https://en.wikipedia.org/wiki/Raloxifene",
  },
  ramelteon: { cid: 208902, qid: "Q417689", wikipedia: "https://en.wikipedia.org/wiki/Ramelteon" },
  ramipril: { cid: 14520363, qid: "Q412666", wikipedia: "https://en.wikipedia.org/wiki/Ramipril" },
  ranitidine: { qid: "Q423037", wikipedia: "https://en.wikipedia.org/wiki/Ranitidine" },
  rapamycin: { cid: 5284616, qid: "Q32089", wikipedia: "https://en.wikipedia.org/wiki/Sirolimus" },
  rasagiline: {
    cid: 3052775,
    qid: "Q420685",
    wikipedia: "https://en.wikipedia.org/wiki/Rasagiline",
  },
  "red-clover": { qid: "Q156635", wikipedia: "https://en.wikipedia.org/wiki/Trifolium_pratense" },
  "reishi-mushroom": { qid: "Q1799774", wikipedia: "https://en.wikipedia.org/wiki/Ganoderma" },
  "relaxin-2": { qid: "Q18031139" },
  resveratrol: {
    cid: 445154,
    qid: "Q407329",
    wikipedia: "https://en.wikipedia.org/wiki/Resveratrol",
  },
  retatrutide: {
    cid: 172898051,
    qid: "Q120468350",
    wikipedia: "https://en.wikipedia.org/wiki/Retatrutide",
  },
  "retatrutide-ly": {
    cid: 172898051,
    qid: "Q120468350",
    wikipedia: "https://en.wikipedia.org/wiki/Retatrutide",
  },
  "rhodiola-rosea": { qid: "Q161665", wikipedia: "https://en.wikipedia.org/wiki/Rhodiola_rosea" },
  rivaroxaban: {
    cid: 66926287,
    qid: "Q420262",
    wikipedia: "https://en.wikipedia.org/wiki/Rivaroxaban",
  },
  rosuvastatin: {
    cid: 6439133,
    qid: "Q415159",
    wikipedia: "https://en.wikipedia.org/wiki/Rosuvastatin",
  },
  "s-23": {
    cid: 24892822,
    qid: "Q7387038",
    wikipedia: "https://en.wikipedia.org/wiki/S-23_(drug)",
  },
  "sam-e": {
    cid: 34755,
    qid: "Q27135598",
    wikipedia: "https://en.wikipedia.org/wiki/S-Adenosyl_methionine",
  },
  "saw-palmetto": { qid: "Q927607", wikipedia: "https://en.wikipedia.org/wiki/Serenoa" },
  selank: { cid: 11765600, qid: "Q5810370", wikipedia: "https://en.wikipedia.org/wiki/Selank" },
  selegiline: { cid: 26758, qid: "Q402633", wikipedia: "https://en.wikipedia.org/wiki/Deprenyl" },
  selenium: { cid: 6326970, qid: "Q876", wikipedia: "https://en.wikipedia.org/wiki/Selenium" },
  semaglutide: {
    cid: 56843331,
    qid: "Q27261089",
    wikipedia: "https://en.wikipedia.org/wiki/Semaglutide",
  },
  semax: { cid: 9811102, qid: "Q4415058", wikipedia: "https://en.wikipedia.org/wiki/Semax" },
  serelaxin: {
    cid: 71300755,
    qid: "Q7453086",
    wikipedia: "https://en.wikipedia.org/wiki/Serelaxin",
  },
  sermorelin: {
    cid: 16132413,
    qid: "Q7455005",
    wikipedia: "https://en.wikipedia.org/wiki/Sermorelin",
  },
  "sermorelin-acetate": {
    cid: 91820622,
    qid: "Q72507408",
    wikipedia: "https://en.wikipedia.org/wiki/Sermorelin_acetate",
  },
  serrapeptase: {
    cid: 171666295,
    qid: "Q7455390",
    wikipedia: "https://en.wikipedia.org/wiki/Serratiopeptidase",
  },
  sertraline: { cid: 68617, qid: "Q407617", wikipedia: "https://en.wikipedia.org/wiki/Sertraline" },
  "sertraline-hcl": { cid: 63009, qid: "Q27108281" },
  sildenafil: {
    cid: 135413523,
    qid: "Q191521",
    wikipedia: "https://en.wikipedia.org/wiki/Sildenafil",
  },
  silica: {
    cid: 24261,
    qid: "Q116269",
    wikipedia: "https://en.wikipedia.org/wiki/Silicon_dioxide",
  },
  simvastatin: {
    cid: 11812557,
    qid: "Q670131",
    wikipedia: "https://en.wikipedia.org/wiki/Simvastatin",
  },
  "snap-8": { cid: 71587832, qid: "Q27270653" },
  sodium: { cid: 5235, qid: "Q658", wikipedia: "https://en.wikipedia.org/wiki/Sodium" },
  "soy-isoflavones": { cid: 70267806, qid: "Q104636178" },
  spermidine: { cid: 9539, qid: "Q418834", wikipedia: "https://en.wikipedia.org/wiki/Spermidine" },
  "spermidine-wheat": {
    cid: 9539,
    qid: "Q418834",
    wikipedia: "https://en.wikipedia.org/wiki/Spermidine",
  },
  spironolactone: {
    cid: 24847844,
    qid: "Q422188",
    wikipedia: "https://en.wikipedia.org/wiki/Spironolactone",
  },
  spirulina: { qid: "Q14565729", wikipedia: "https://en.wikipedia.org/wiki/Spirulina_(genus)" },
  "sr-9009": { cid: 57394020, qid: "Q15410184", wikipedia: "https://en.wikipedia.org/wiki/SR9009" },
  "ss-31": {
    cid: 11764719,
    qid: "Q27269822",
    wikipedia: "https://en.wikipedia.org/wiki/Elamipretide",
  },
  "st-john-s-wort": {
    cid: 9548591,
    qid: "Q158289",
    wikipedia: "https://en.wikipedia.org/wiki/Hypericum_perforatum",
  },
  stanozolol: { cid: 25249, qid: "Q417219", wikipedia: "https://en.wikipedia.org/wiki/Stanozolol" },
  "stinging-nettle-root": {
    qid: "Q155909",
    wikipedia: "https://en.wikipedia.org/wiki/Urtica_dioica",
  },
  sulforaphane: {
    cid: 5350,
    qid: "Q424489",
    wikipedia: "https://en.wikipedia.org/wiki/Sulforaphane",
  },
  survodutide: {
    cid: 171378821,
    qid: "Q123907235",
    wikipedia: "https://en.wikipedia.org/wiki/Survodutide",
  },
  suvorexant: {
    cid: 24965990,
    qid: "Q7650517",
    wikipedia: "https://en.wikipedia.org/wiki/Suvorexant",
  },
  synephrine: { cid: 7172, qid: "Q421351", wikipedia: "https://en.wikipedia.org/wiki/Synephrine" },
  "ta-65": {
    cid: 13943286,
    qid: "Q3979404",
    wikipedia: "https://en.wikipedia.org/wiki/Cycloastragenol",
  },
  tabimorelin: {
    cid: 9810101,
    qid: "Q7673066",
    wikipedia: "https://en.wikipedia.org/wiki/Tabimorelin",
  },
  tadalafil: { cid: 9821704, qid: "Q424156", wikipedia: "https://en.wikipedia.org/wiki/Tadalafil" },
  tamoxifen: { cid: 3032583, qid: "Q412178", wikipedia: "https://en.wikipedia.org/wiki/Tamoxifen" },
  "tb-500": { cid: 62707662, qid: "Q137400007", wikipedia: "https://en.wikipedia.org/wiki/TB-500" },
  tesamorelin: {
    cid: 16137828,
    qid: "Q7705415",
    wikipedia: "https://en.wikipedia.org/wiki/Tesamorelin",
  },
  "tesamorelin-acetate": {
    cid: 16137828,
    qid: "Q7705415",
    wikipedia: "https://en.wikipedia.org/wiki/Tesamorelin",
  },
  tesofensine: {
    cid: 11370864,
    qid: "Q7705544",
    wikipedia: "https://en.wikipedia.org/wiki/Tesofensine",
  },
  testolone: {
    cid: 44200882,
    qid: "Q25099854",
    wikipedia: "https://en.wikipedia.org/wiki/Vosilasarm",
  },
  "testosterone-cypionate": {
    cid: 441404,
    qid: "Q27108401",
    wikipedia: "https://en.wikipedia.org/wiki/Testosterone_cypionate",
  },
  "testosterone-enanthate": {
    cid: 9416,
    qid: "Q27108402",
    wikipedia: "https://en.wikipedia.org/wiki/Testosterone_enanthate",
  },
  "testosterone-propionate": {
    cid: 5995,
    qid: "Q10354588",
    wikipedia: "https://en.wikipedia.org/wiki/Testosterone_propionate",
  },
  "testosterone-sustanon": { cid: 155142 },
  "testosterone-undecanoate": {
    cid: 65157,
    qid: "Q15410178",
    wikipedia: "https://en.wikipedia.org/wiki/Testosterone_undecanoate",
  },
  theacrine: { cid: 75324, qid: "Q12646548", wikipedia: "https://en.wikipedia.org/wiki/Theacrine" },
  thymalin: { cid: 3085284, qid: "Q21225353" },
  "thymosin-alpha-1": { cid: 16130571, qid: "Q20817234" },
  "thymosin-beta-4": {
    cid: 45382195,
    qid: "Q7799643",
    wikipedia: "https://en.wikipedia.org/wiki/Thymosin_beta-4",
  },
  tirzepatide: {
    cid: 166567236,
    qid: "Q108324770",
    wikipedia: "https://en.wikipedia.org/wiki/Tirzepatide",
  },
  tmg: {
    cid: 4292413,
    qid: "Q10860583",
    wikipedia: "https://en.wikipedia.org/wiki/Trimethylglycine",
  },
  tocotrienols: {
    cid: 9929901,
    qid: "Q427419",
    wikipedia: "https://en.wikipedia.org/wiki/Tocotrienol",
  },
  "tongkat-ali": { qid: "Q311710", wikipedia: "https://en.wikipedia.org/wiki/Eurycoma_longifolia" },
  tranylcypromine: {
    cid: 2723716,
    qid: "Q420885",
    wikipedia: "https://en.wikipedia.org/wiki/Tranylcypromine",
  },
  trazodone: { cid: 5533, qid: "Q411457", wikipedia: "https://en.wikipedia.org/wiki/Trazodone" },
  "trenbolone-acetate": {
    cid: 66359,
    qid: "Q27288295",
    wikipedia: "https://en.wikipedia.org/wiki/Trenbolone_acetate",
  },
  "trenbolone-enanthate": {
    cid: 20112041,
    qid: "Q27277951",
    wikipedia: "https://en.wikipedia.org/wiki/Trenbolone_enanthate",
  },
  "tribulus-terrestris": {
    cid: 10125785,
    qid: "Q235889",
    wikipedia: "https://en.wikipedia.org/wiki/Tribulus_terrestris",
  },
  turinabol: {
    cid: 15706078,
    qid: "Q909987",
    wikipedia: "https://en.wikipedia.org/wiki/Chlorodehydromethyltestosterone",
  },
  turkesterone: {
    cid: 14376672,
    qid: "Q4466094",
    wikipedia: "https://en.wikipedia.org/wiki/Turkesterone",
  },
  "turkey-tail": { qid: "Q753833", wikipedia: "https://en.wikipedia.org/wiki/Trametes_versicolor" },
  tyrosine: { cid: 6057, qid: "Q188017", wikipedia: "https://en.wikipedia.org/wiki/Tyrosine" },
  ubiquinol: { cid: 9962735, qid: "Q411963", wikipedia: "https://en.wikipedia.org/wiki/Ubiquinol" },
  ubiquinone: {
    cid: 5281915,
    qid: "Q321285",
    wikipedia: "https://en.wikipedia.org/wiki/Coenzyme_Q10",
  },
  "uridine-monophosphate": {
    cid: 6030,
    qid: "Q414932",
    wikipedia: "https://en.wikipedia.org/wiki/Uridine_monophosphate",
  },
  "urolithin-a": {
    cid: 5488186,
    qid: "Q15634120",
    wikipedia: "https://en.wikipedia.org/wiki/Urolithin_A",
  },
  "valerian-root": { qid: "Q72515979" },
  valsartan: { cid: 60846, qid: "Q155472", wikipedia: "https://en.wikipedia.org/wiki/Valsartan" },
  vanadium: { cid: 23990, qid: "Q722", wikipedia: "https://en.wikipedia.org/wiki/Vanadium" },
  vardenafil: {
    cid: 135438569,
    qid: "Q424161",
    wikipedia: "https://en.wikipedia.org/wiki/Vardenafil",
  },
  venlafaxine: {
    cid: 9795857,
    qid: "Q898407",
    wikipedia: "https://en.wikipedia.org/wiki/Venlafaxine",
  },
  vinpocetine: {
    cid: 443955,
    qid: "Q420288",
    wikipedia: "https://en.wikipedia.org/wiki/Vinpocetine",
  },
  vip: { cid: 102602038, qid: "Q163656", wikipedia: "https://en.wikipedia.org/wiki/Viper" },
  "vitamin-a": { cid: 445354, qid: "Q18225", wikipedia: "https://en.wikipedia.org/wiki/Vitamin_A" },
  "vitamin-b-complex": { qid: "Q183206", wikipedia: "https://en.wikipedia.org/wiki/B_vitamins" },
  "vitamin-b1-thiamine": {
    cid: 6202,
    qid: "Q83187",
    wikipedia: "https://en.wikipedia.org/wiki/Thiamine",
  },
  "vitamin-b12": {
    cid: 165339223,
    qid: "Q187706",
    wikipedia: "https://en.wikipedia.org/wiki/Vitamin_B12",
  },
  "vitamin-b2-riboflavin": {
    cid: 493570,
    qid: "Q130365",
    wikipedia: "https://en.wikipedia.org/wiki/Riboflavin",
  },
  "vitamin-b3-niacin": {
    cid: 938,
    qid: "Q192423",
    wikipedia: "https://en.wikipedia.org/wiki/Nicotinamide",
  },
  "vitamin-b5-pantothenic-acid": {
    cid: 6613,
    qid: "Q179894",
    wikipedia: "https://en.wikipedia.org/wiki/Pantothenic_acid",
  },
  "vitamin-b6": {
    cid: 104817,
    qid: "Q423746",
    wikipedia: "https://en.wikipedia.org/wiki/Pyridoxine",
  },
  "vitamin-b7-biotin": {
    cid: 171548,
    qid: "Q181354",
    wikipedia: "https://en.wikipedia.org/wiki/Biotin",
  },
  "vitamin-b9-folate": {
    cid: 135398561,
    qid: "Q192553",
    wikipedia: "https://en.wikipedia.org/wiki/Levomefolic_acid",
  },
  "vitamin-c": {
    cid: 54670067,
    qid: "Q199678",
    wikipedia: "https://en.wikipedia.org/wiki/Vitamin_C",
  },
  "vitamin-d2-ergocalciferol": { cid: 5280793 },
  "vitamin-d3": {
    cid: 5280795,
    qid: "Q139347",
    wikipedia: "https://en.wikipedia.org/wiki/Cholecalciferol",
  },
  "vitamin-e": {
    cid: 14985,
    qid: "Q158348",
    wikipedia: "https://en.wikipedia.org/wiki/%CE%91-Tocopherol",
  },
  "vitamin-k1": {
    cid: 5284607,
    qid: "Q186093",
    wikipedia: "https://en.wikipedia.org/wiki/Phytomenadione",
  },
  "vitamin-k2": {
    cid: 5282367,
    qid: "Q7936967",
    wikipedia: "https://en.wikipedia.org/wiki/Vitamin_K2",
  },
  "vitamin-k2-mk-4": {
    cid: 5282367,
    qid: "Q192354",
    wikipedia: "https://en.wikipedia.org/wiki/Menatetrenone",
  },
  "vitamin-k2-mk-7": {
    cid: 5287554,
    qid: "Q27120546",
    wikipedia: "https://en.wikipedia.org/wiki/MK-7",
  },
  "vitex-agnus-castus": {
    qid: "Q259318",
    wikipedia: "https://en.wikipedia.org/wiki/Vitex_agnus-castus",
  },
  warfarin: {
    cid: 54678486,
    qid: "Q113368879",
    wikipedia: "https://en.wikipedia.org/wiki/Warfarin",
  },
  "warfarin-coumadin": { cid: 16204922, qid: "Q47521415" },
  "yerba-mate": { qid: "Q117068", wikipedia: "https://en.wikipedia.org/wiki/Yerba_mate" },
  "yk-11": { cid: 119058028, qid: "Q27295178", wikipedia: "https://en.wikipedia.org/wiki/YK-11" },
  "yohimbine-hcl": { cid: 6169 },
  zinc: { cid: 3007857, qid: "Q758", wikipedia: "https://en.wikipedia.org/wiki/Zinc" },
  "zinc-bisglycinate": {
    cid: 151910,
    qid: "Q27264191",
    wikipedia: "https://en.wikipedia.org/wiki/Zinc_glycinate",
  },
  "zinc-picolinate": {
    cid: 9904746,
    qid: "Q27273986",
    wikipedia: "https://en.wikipedia.org/wiki/Zinc_picolinate",
  },
  zolpidem: { cid: 441338, qid: "Q218842", wikipedia: "https://en.wikipedia.org/wiki/Zolpidem" },
};

/** Absolute URLs proving this compound is the same entity known elsewhere. */
export function entitySameAs(slug: string): string[] {
  const e = COMPOUND_ENTITY_IDS[slug];
  if (!e) return [];
  const out: string[] = [];
  if (e.cid) out.push(`https://pubchem.ncbi.nlm.nih.gov/compound/${e.cid}`);
  if (e.qid) out.push(`https://www.wikidata.org/wiki/${e.qid}`);
  if (e.wikipedia) out.push(e.wikipedia);
  return out;
}

/** schema.org PropertyValue identifiers for the same external databases. */
export function entityIdentifiers(
  slug: string,
): Array<{ "@type": "PropertyValue"; propertyID: string; value: string }> {
  const e = COMPOUND_ENTITY_IDS[slug];
  if (!e) return [];
  const out: Array<{ "@type": "PropertyValue"; propertyID: string; value: string }> = [];
  if (e.cid)
    out.push({ "@type": "PropertyValue", propertyID: "PubChem CID", value: String(e.cid) });
  if (e.qid) out.push({ "@type": "PropertyValue", propertyID: "Wikidata", value: e.qid });
  return out;
}
