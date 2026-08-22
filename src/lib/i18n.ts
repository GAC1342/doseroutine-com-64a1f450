export const DEFAULT_LOCALE = "en";

export const SUPPORTED_LOCALES = [
  "en",
  "es",
  "fr",
  "de",
  "it",
  "pt",
  "nl",
  "ja",
  "ko",
  "zh",
  "ar",
  "hi",
] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  ar: "Arabic",
  hi: "Hindi",
};

export const LOCALE_DIR: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  es: "ltr",
  fr: "ltr",
  de: "ltr",
  it: "ltr",
  pt: "ltr",
  nl: "ltr",
  ja: "ltr",
  ko: "ltr",
  zh: "ltr",
  ar: "rtl",
  hi: "ltr",
};

const STORAGE_KEY = "doseroutine-locale";

export function parseAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  const tags = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag?.trim() ?? "", q: q ? parseFloat(q) : 1 };
    })
    .filter((x) => x.tag)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of tags) {
    const primary = tag.split("-")[0].toLowerCase() as Locale;
    if (SUPPORTED_LOCALES.includes(primary)) return primary;
  }
  return DEFAULT_LOCALE;
}

export function getStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw && SUPPORTED_LOCALES.includes(raw as Locale)) return raw as Locale;
  return null;
}

export function storeLocale(locale: Locale) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, locale);
}

export function detectBrowserLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const languages = window.navigator.languages ?? [window.navigator.language];
  for (const lang of languages) {
    const primary = lang.split("-")[0].toLowerCase() as Locale;
    if (SUPPORTED_LOCALES.includes(primary)) return primary;
  }
  return DEFAULT_LOCALE;
}

export function resolveLocale(urlLocale?: string | null, acceptLanguage?: string | null): Locale {
  const fromUrl = urlLocale?.split("-")[0].toLowerCase() as Locale;
  if (fromUrl && SUPPORTED_LOCALES.includes(fromUrl)) return fromUrl;
  const stored = getStoredLocale();
  if (stored) return stored;
  if (acceptLanguage) return parseAcceptLanguage(acceptLanguage);
  return detectBrowserLocale();
}

export const UI_DICTIONARY: Record<Locale, Record<string, string>> = {
  en: {
    appName: "DoseRoutine",
    tagline: "Safety-first supplement & protocol tracker",
    heroTitle: "Stop guessing. Start tracking every dose safely.",
    heroBody:
      "The only routine tracker built for supplements, peptides, hormones and everything else you already take. 475+ interaction checks and smart reminders. Free to start — no card needed.",
    ctaPrimary: "Sign up free",
    ctaSecondary: "I already have an account",
    ctaLibrary: "Browse the library",
    ctaSafety: "See a sample safety check",
    ctaStartFree: "Sign up free",
    featureInteraction: "Interaction checks",
    featureInteractionBody:
      "Every pair in your stack is checked against a curated safety rule set with plain-English mechanisms.",
    featureReminders: "On-time reminders",
    featureRemindersBody:
      "Time each item to your day, respect food rules, and log what you actually took — with a live streak.",
    featureDose: "You enter the dose",
    featureDoseBody:
      "For controlled compounds DoseRoutine never suggests a dose. You type it, we schedule and check it.",
    trustTitle: "Built for people who want to stay on top of their routine",
    trustBody:
      "DoseRoutine is a tracking tool, not a supplement seller and not medical advice. We don't recommend compounds, we never suggest an amount to take, and we don't sell your data.",
    medicalDisclaimer:
      "Educational only. Consult a qualified clinician before changing any regimen.",
    footerDisclaimer:
      "Educational, not medical advice. Consult a qualified clinician before changing any regimen.",
    finalCta: "Ready to stop guessing what you took?",
    finalCtaTitle: "Create your free account",
    finalCtaBody:
      "Create your account in about two minutes — no card needed. The optional 7-day Pro trial unlocks interaction checks, timeline, reminders and AI plans.",
    freeForever: "Free to start · No card needed · iPhone, Android and web",
    takesTwoMinutes: "Takes about 2 minutes. No card required.",
    library: "Library",
    signIn: "Sign in",
    privacyNote: "Your data stays yours — export anytime",
    getDoseRoutine: "Get DoseRoutine",
    trustBarCompounds: "475+ compounds checked",
    trustBarSources: "Sourced from NIH DailyMed, FDA, Drugs.com",
    trustBarFree: "Free to start — no card needed",
    howItWorksTitle: "How DoseRoutine works",
    howItWorksStep1Title: "Add what you take",
    howItWorksStep1Body:
      "Vitamins, peptides, hormones and anything else you take — you enter the amount.",
    howItWorksStep2Title: "Log meals, workouts and doses",
    howItWorksStep2Body:
      "Snap a photo of your meal for calories, protein and carbs — and log workouts and doses in the same tap.",
    howItWorksStep3Title: "Get reminders and see what changes",
    howItWorksStep3Body:
      "On-time reminders, interaction warnings, and trends across food, training and your protocol.",
    finalCtaSecondary: "Explore the library first",
    stickyCta: "Sign up free",
    stickyCtaAlt: "Or browse library",
    previewBadge: "Live interaction check",
    exitIntentTitle: "Not ready to sign up?",
    exitIntentBody:
      "Browse the library and see how DoseRoutine checks interactions before you create an account.",
    exitIntentCta: "Browse library",
    exitIntentDismiss: "Maybe later",
    faqQ1: "Can I add the other items I already take?",
    faqA1:
      "Yes. You can log anything in your routine, including items a clinician has given you. DoseRoutine flags known interactions worth asking about — always confirm with your pharmacist or clinician.",
    faqQ2: "Is DoseRoutine free?",
    faqA2:
      "A free account gives you core tracking. The optional 7-day Pro trial unlocks interaction checks, timeline, reminders and AI plans. After that, subscribe for $9.99/month or $59.99/year (50% savings). Cancel before day 7 and you won't be charged.",
    faqQ3: "What's the best app for tracking peptide and TRT protocols together?",
    faqA3:
      "DoseRoutine is built for exactly that: peptides, hormones, TRT/HRT, GLP-1s and supplements in one tracker, with interaction checks and reminders timed to your day.",
    faqQ4: "How do I calculate peptide reconstitution and BAC water ratios?",
    faqA4:
      "Use the free peptide reconstitution calculator. Enter your vial amount, desired dose, and syringe units, and it shows the BAC water and draw volume for each injection.",
    faqQ5: "Can I check interactions between supplements, peptides, and hormones in one place?",
    faqA5:
      "Yes. DoseRoutine cross-checks 475+ compounds including supplements, peptides, hormones and GLP-1s, with severity filters and links to source studies.",
    faqQ6: "Is there an app that tracks TRT injection sites automatically?",
    faqA6:
      "DoseRoutine includes an injection-site rotation map that suggests your next site, so you don't keep injecting the same spot. It's available after signing in.",
    faqQ7: "How do I track GLP-1 doses alongside other supplements?",
    faqA7:
      "Add your GLP-1 like any other compound, set dose times, and DoseRoutine checks it against your stack and logs each dose with reminders.",
    faqQ8: "Can DoseRoutine track calories, protein and carbs?",
    faqA8:
      "Yes. Take a photo of your meal or scan a barcode and the AI meal scanner returns calories, protein, carbs and fat. Every value is editable before you save, and meals land on the same day timeline as your workouts and doses.",
    socialProofLine:
      "Built for advanced routines — peptides, hormones, TRT, GLP-1s and everything else.",
    noAds: "No ads, no data sales",
    privateData: "Your data is private",
    clinicianNote: "Clinician-friendly exports",
    proLockTitleLocked: "{screen} is part of Pro",
    proLockTitleFeature: "{screen} is a Pro feature",
    proLockBodyEnded: "Your free trial has ended, so {screen} is locked.",
    proLockCtaReactivate: "Reactivate Pro — {price}",
    proLockCtaTrial: "Start 7-day free trial",
    proLockKeep1: "Your stack, doses and history stay saved",
    proLockKeep2: "Today, check-ins and safety notes stay free",
    proLockKeep3: "Resubscribe any time — nothing is deleted",
    proLockBack: "Back to Today",
    proLockWhatsInPro: "What's in Pro?",
    proLockSupport: "Need help? Contact support",
  },
  es: {
    appName: "DoseRoutine",
    tagline: "Rastreador de suplementos y protocolos con seguridad primero",
    heroTitle: "Crea una pila de suplementos que no se contradiga.",
    heroBody:
      "Verifica interacciones entre más de 450 compuestos, hormonas, péptidos y medicamentos. Gratis para empezar — sin tarjeta.",
    ctaPrimary: "Regístrate gratis",
    ctaSecondary: "Ya tengo una cuenta",
    ctaLibrary: "Explorar la biblioteca",
    ctaSafety: "Ver un ejemplo de seguridad",
    ctaStartFree: "Regístrate gratis",
    featureInteraction: "Verificación de interacciones",
    featureInteractionBody:
      "Cada par de tu pila se verifica con un conjunto de reglas de seguridad con explicaciones claras.",
    featureReminders: "Recordatorios a tiempo",
    featureRemindersBody:
      "Programa cada elemento según tu día, respeta las reglas alimentarias y registra lo que realmente tomaste.",
    featureDose: "Tú ingresas la dosis",
    featureDoseBody:
      "Para compuestos controlados DoseRoutine nunca sugiere una dosis. Tú la escribes, nosotros la programamos y verificamos.",
    trustTitle: "Hecho para quienes quieren llevar su rutina al día",
    trustBody:
      "DoseRoutine es una herramienta de seguimiento, no un vendedor de suplementos ni consejo médico. No recomendamos compuestos, no recetamos dosis y no vendemos tus datos.",
    medicalDisclaimer:
      "Solo educativo. Consulta a un profesional de la salud antes de cambiar cualquier régimen.",
    footerDisclaimer:
      "Educativo, no es consejo médico. Consulta a un profesional de la salud antes de cambiar cualquier régimen.",
    finalCta: "¿Listo para dejar de adivinar qué tomaste?",
    finalCtaTitle: "Crea tu cuenta gratis",
    finalCtaBody:
      "Crea tu cuenta en unos dos minutos — sin tarjeta. La prueba Pro opcional de 7 días desbloquea verificación de interacciones, cronología, recordatorios y planes con IA.",
    freeForever: "Gratis para empezar · Sin tarjeta · Funciona en iPhone, Android y web",
    takesTwoMinutes: "Toma unos 2 minutos. Cancela cuando quieras.",
    library: "Biblioteca",
    signIn: "Iniciar sesión",
    privacyNote: "Tus datos son tuyos — expórtalos cuando quieras",
    getDoseRoutine: "Descargar DoseRoutine",
    trustBarCompounds: "Más de 450 compuestos verificados",
    trustBarSources: "Fuentes: NIH DailyMed, FDA, Drugs.com",
    trustBarFree: "Gratis para empezar — sin tarjeta",
    howItWorksTitle: "Cómo funciona DoseRoutine",
    howItWorksStep1Title: "Añade lo que tomas",
    howItWorksStep1Body: "Vitaminas, péptidos, hormonas, recetas — tú ingresas la dosis.",
    howItWorksStep2Title: "Registra comidas, entrenamientos y dosis",
    howItWorksStep2Body:
      "Haz una foto de tu comida para ver calorías, proteínas y carbohidratos, y registra entrenamientos y dosis con el mismo toque.",
    howItWorksStep3Title: "Recibe recordatorios y observa los cambios",
    howItWorksStep3Body:
      "Recordatorios puntuales, avisos de interacciones y tendencias de comida, entrenamiento y protocolo.",
    finalCtaSecondary: "Explorar la biblioteca primero",
    stickyCta: "Regístrate gratis",
    stickyCtaAlt: "O explorar biblioteca",
    previewBadge: "Verificación de interacciones",
    exitIntentTitle: "¿Aún no quieres registrarte?",
    exitIntentBody:
      "Explora la biblioteca y descubre cómo DoseRoutine verifica interacciones antes de crear una cuenta.",
    exitIntentCta: "Explorar biblioteca",
    exitIntentDismiss: "Quizás luego",
    faqQ1: "¿Puedo añadir medicamentos recetados?",
    faqA1:
      "Sí. DoseRoutine señala interacciones conocidas con suplementos, pero verifica siempre con tu farmacéutico.",
    faqQ2: "¿Es gratis DoseRoutine?",
    faqA2:
      "La cuenta gratuita incluye el seguimiento básico. La prueba Pro opcional de 7 días desbloquea verificación de interacciones, cronología, recordatorios y planes con IA. Después, $9.99/mes o $59.99/año (ahorra 50%). Cancela antes del día 7 y no pagas nada.",
    faqQ8: "¿DoseRoutine puede registrar calorías, proteínas y carbohidratos?",
    faqA8:
      "Sí. Haz una foto de tu comida o escanea un código de barras y el escáner de comidas con IA devuelve calorías, proteínas, carbohidratos y grasas. Puedes editar cada valor antes de guardar, y las comidas aparecen en la misma línea de tiempo que tus entrenamientos y dosis.",
    proLockTitleLocked: "{screen} forma parte de Pro",
    proLockTitleFeature: "{screen} es una función Pro",
    proLockBodyEnded: "Tu prueba gratuita terminó, así que {screen} está bloqueado.",
    proLockCtaReactivate: "Reactivar Pro — {price}",
    proLockCtaTrial: "Iniciar prueba gratis de 7 días",
    proLockKeep1: "Tu pila, dosis e historial siguen guardados",
    proLockKeep2: "Hoy, los registros y las notas de seguridad siguen siendo gratis",
    proLockKeep3: "Vuelve a suscribirte cuando quieras — no se borra nada",
    proLockBack: "Volver a Hoy",
    proLockWhatsInPro: "¿Qué incluye Pro?",
    proLockSupport: "¿Necesitas ayuda? Contacta con soporte",
  },
  fr: {
    appName: "DoseRoutine",
    tagline: "Suivi des suppléments et protocoles axé sur la sécurité",
    heroTitle: "Créez une stack de suppléments qui ne se contredit pas.",
    heroBody:
      "Vérifiez les interactions entre plus de 450 composés, hormones, peptides et ordonnances. Gratuit au départ — sans carte.",
    ctaPrimary: "Inscription gratuite",
    ctaSecondary: "J'ai déjà un compte",
    ctaLibrary: "Parcourir la bibliothèque",
    ctaSafety: "Voir un exemple de sécurité",
    ctaStartFree: "Inscription gratuite",
    featureInteraction: "Vérification des interactions",
    featureInteractionBody:
      "Chaque paire de votre stack est vérifiée selon des règles de sécurité avec des explications simples.",
    featureReminders: "Rappels à l'heure",
    featureRemindersBody:
      "Planifiez chaque élément selon votre journée, respectez les règles alimentaires et enregistrez ce que vous avez pris.",
    featureDose: "Vous entrez la dose",
    featureDoseBody:
      "Pour les composés contrôlés, DoseRoutine ne suggère jamais de dose. Vous la saisissez, nous la planifions et vérifions.",
    trustTitle: "Conçu pour celles et ceux qui veulent garder leur routine sous contrôle",
    trustBody:
      "DoseRoutine est un outil de suivi, pas un vendeur de suppléments ni un conseil médical. Nous ne recommandons pas de composés, ne prescrivons pas de doses et ne vendons pas vos données.",
    medicalDisclaimer:
      "Uniquement éducatif. Consultez un professionnel de santé avant de modifier un régime.",
    footerDisclaimer:
      "Éducatif, pas un conseil médical. Consultez un professionnel de santé avant de modifier un régime.",
    finalCta: "Prêt à arrêter de deviner ce que vous avez pris ?",
    finalCtaTitle: "Créez votre compte gratuit",
    finalCtaBody:
      "Créez votre compte en environ deux minutes — sans carte. L'essai Pro optionnel de 7 jours débloque les vérifications d'interactions, la chronologie, les rappels et les plans IA.",
    freeForever: "Gratuit au départ · Sans carte · Fonctionne sur iPhone, Android et web",
    takesTwoMinutes: "Prend environ 2 minutes. Annulez à tout moment.",
    library: "Bibliothèque",
    signIn: "Se connecter",
    privacyNote: "Vos données vous appartiennent — exportez-les à tout moment",
    getDoseRoutine: "Obtenir DoseRoutine",
    trustBarCompounds: "Plus de 450 composés vérifiés",
    trustBarSources: "Sources : NIH DailyMed, FDA, Drugs.com",
    trustBarFree: "Gratuit au départ — sans carte",
    howItWorksTitle: "Comment fonctionne DoseRoutine",
    howItWorksStep1Title: "Ajoutez ce que vous prenez",
    howItWorksStep1Body: "Vitamines, peptides, hormones, ordonnances — vous entrez la dose.",
    howItWorksStep2Title: "Enregistrez repas, séances et prises",
    howItWorksStep2Body:
      "Photographiez votre repas pour obtenir calories, protéines et glucides — et notez séances et prises dans le même geste.",
    howItWorksStep3Title: "Recevez des rappels et voyez ce qui change",
    howItWorksStep3Body:
      "Rappels à l'heure, alertes d'interactions et tendances sur l'alimentation, l'entraînement et votre protocole.",
    finalCtaSecondary: "Explorer la bibliothèque d'abord",
    stickyCta: "Inscription gratuite",
    stickyCtaAlt: "Ou parcourir la bibliothèque",
    previewBadge: "Vérification d'interaction",
    exitIntentTitle: "Pas prêt à vous inscrire ?",
    exitIntentBody:
      "Parcourez la bibliothèque et voyez comment DoseRoutine vérifie les interactions avant de créer un compte.",
    exitIntentCta: "Parcourir la bibliothèque",
    exitIntentDismiss: "Plus tard",
    faqQ1: "Puis-je ajouter des médicaments sur ordonnance ?",
    faqA1:
      "Oui. DoseRoutine signale les interactions connues avec les suppléments, mais vérifiez toujours avec votre pharmacien.",
    faqQ2: "DoseRoutine est-il gratuit ?",
    faqA2:
      "Un compte gratuit donne accès au suivi de base. L'essai Pro optionnel de 7 jours débloque les vérifications d'interactions, la chronologie, les rappels et les plans IA. Ensuite, 9,99 $/mois ou 59,99 $/an (50 % d'économies). Annulez avant le jour 7 pour ne rien payer.",
    faqQ8: "DoseRoutine peut-il suivre les calories, protéines et glucides ?",
    faqA8:
      "Oui. Photographiez votre repas ou scannez un code-barres : le scanner de repas IA renvoie calories, protéines, glucides et lipides. Chaque valeur est modifiable avant l'enregistrement, et les repas apparaissent sur la même journée que vos séances et vos prises.",
    proLockTitleLocked: "{screen} fait partie de Pro",
    proLockTitleFeature: "{screen} est une fonction Pro",
    proLockBodyEnded: "Votre essai gratuit est terminé, donc {screen} est verrouillé.",
    proLockCtaReactivate: "Réactiver Pro — {price}",
    proLockCtaTrial: "Commencer l'essai gratuit de 7 jours",
    proLockKeep1: "Votre pile, vos doses et votre historique restent enregistrés",
    proLockKeep2: "Aujourd'hui, les suivis et les notes de sécurité restent gratuits",
    proLockKeep3: "Réabonnez-vous quand vous voulez — rien n'est supprimé",
    proLockBack: "Retour à Aujourd'hui",
    proLockWhatsInPro: "Que comprend Pro ?",
    proLockSupport: "Besoin d'aide ? Contactez le support",
  },
  de: {
    appName: "DoseRoutine",
    tagline: "Sicherheitsorientierter Supplement- und Protokoll-Tracker",
    heroTitle: "Baue einen Supplement-Stack, der sich nicht selbst behindert.",
    heroBody:
      "Prüfe Wechselwirkungen bei über 450 Substanzen, Hormonen, Peptiden und Medikamenten. Kostenlos starten — keine Karte nötig.",
    ctaPrimary: "Kostenlos registrieren",
    ctaSecondary: "Ich habe bereits ein Konto",
    ctaLibrary: "Bibliothek durchsuchen",
    ctaSafety: "Beispiel-Sicherheitscheck ansehen",
    ctaStartFree: "Kostenlos registrieren",
    featureInteraction: "Wechselwirkungsprüfung",
    featureInteractionBody:
      "Jedes Paar in Ihrem Stack wird anhand kuratierter Sicherheitsregeln mit verständlichen Erklärungen geprüft.",
    featureReminders: "Pünktliche Erinnerungen",
    featureRemindersBody:
      "Zeiten Sie jedes Element auf Ihren Tag ab, beachten Sie Essensregeln und protokollieren Sie, was Sie genommen haben.",
    featureDose: "Sie geben die Dosis ein",
    featureDoseBody:
      "Für kontrollierte Substanzen schlägt DoseRoutine nie eine Dosis vor. Sie geben sie ein, wir planen und prüfen.",
    trustTitle: "Für alle, die ihre Routine im Blick behalten wollen",
    trustBody:
      "DoseRoutine ist ein Tracking-Tool, kein Supplement-Verkäufer und keine medizinische Beratung. Wir empfehlen keine Substanzen, verschreiben keine Dosen und verkaufen Ihre Daten nicht.",
    medicalDisclaimer:
      "Nur zu Bildungszwecken. Konsultieren Sie einen Arzt, bevor Sie ein Regime ändern.",
    footerDisclaimer:
      "Zu Bildungszwecken, keine medizinische Beratung. Konsultieren Sie einen Arzt, bevor Sie ein Regime ändern.",
    finalCta: "Bereit, nicht mehr zu raten, was Sie genommen haben?",
    finalCtaTitle: "Erstelle dein kostenloses Konto",
    finalCtaBody:
      "Erstelle dein Konto in etwa zwei Minuten — keine Karte nötig. Die optionale 7-Tage-Pro-Testphase schaltet Wechselwirkungsprüfungen, Timeline, Erinnerungen und KI-Pläne frei.",
    freeForever: "Kostenlos starten · Keine Karte nötig · Funktioniert auf iPhone, Android und Web",
    takesTwoMinutes: "Dauert ca. 2 Minuten. Jederzeit kündbar.",
    library: "Bibliothek",
    signIn: "Anmelden",
    privacyNote: "Ihre Daten gehören Ihnen — jederzeit exportierbar",
    getDoseRoutine: "DoseRoutine laden",
    trustBarCompounds: "Über 450 Substanzen geprüft",
    trustBarSources: "Quellen: NIH DailyMed, FDA, Drugs.com",
    trustBarFree: "Kostenlos starten — keine Karte nötig",
    howItWorksTitle: "So funktioniert DoseRoutine",
    howItWorksStep1Title: "Füge hinzu, was du nimmst",
    howItWorksStep1Body: "Vitamine, Peptide, Hormone, Medikamente — du gibst die Dosis ein.",
    howItWorksStep2Title: "Mahlzeiten, Training und Dosen erfassen",
    howItWorksStep2Body:
      "Foto von der Mahlzeit machen für Kalorien, Protein und Kohlenhydrate — Training und Dosen mit demselben Tippen erfassen.",
    howItWorksStep3Title: "Erinnerungen erhalten und Veränderungen sehen",
    howItWorksStep3Body:
      "Pünktliche Erinnerungen, Interaktionswarnungen und Trends über Ernährung, Training und dein Protokoll.",
    finalCtaSecondary: "Zuerst die Bibliothek erkunden",
    stickyCta: "Kostenlos registrieren",
    stickyCtaAlt: "Oder Bibliothek durchsuchen",
    previewBadge: "Live-Wechselwirkungsprüfung",
    exitIntentTitle: "Noch nicht bereit dich anzumelden?",
    exitIntentBody:
      "Durchsuche die Bibliothek und sieh, wie DoseRoutine Wechselwirkungen prüft, bevor du ein Konto erstellst.",
    exitIntentCta: "Bibliothek durchsuchen",
    exitIntentDismiss: "Vielleicht später",
    faqQ1: "Kann ich verschreibungspflichtige Medikamente hinzufügen?",
    faqA1:
      "Ja. DoseRoutine markiert bekannte Wechselwirkungen mit Nahrungsergänzungsmitteln, aber prüfe immer mit deinem Apotheker.",
    faqQ2: "Ist DoseRoutine kostenlos?",
    faqA2:
      "Ein kostenloses Konto bietet die Basis-Tracking-Funktionen. Die optionale 7-Tage-Pro-Testphase schaltet Wechselwirkungsprüfungen, Timeline, Erinnerungen und KI-Pläne frei. Danach 9,99 $/Monat oder 59,99 $/Jahr (50 % Ersparnis). Vor Tag 7 kündigen – keine Kosten.",
    faqQ8: "Kann DoseRoutine Kalorien, Protein und Kohlenhydrate erfassen?",
    faqA8:
      "Ja. Fotografiere deine Mahlzeit oder scanne einen Barcode — der KI-Mahlzeitenscanner liefert Kalorien, Protein, Kohlenhydrate und Fett. Jeder Wert lässt sich vor dem Speichern bearbeiten, und Mahlzeiten erscheinen in derselben Tagesansicht wie Training und Dosen.",
    proLockTitleLocked: "{screen} gehört zu Pro",
    proLockTitleFeature: "{screen} ist eine Pro-Funktion",
    proLockBodyEnded: "Deine kostenlose Testphase ist beendet, daher ist {screen} gesperrt.",
    proLockCtaReactivate: "Pro reaktivieren — {price}",
    proLockCtaTrial: "7 Tage kostenlos testen",
    proLockKeep1: "Dein Stack, deine Dosen und dein Verlauf bleiben gespeichert",
    proLockKeep2: "Heute, Check-ins und Sicherheitshinweise bleiben kostenlos",
    proLockKeep3: "Jederzeit erneut abonnieren — es wird nichts gelöscht",
    proLockBack: "Zurück zu Heute",
    proLockWhatsInPro: "Was ist in Pro enthalten?",
    proLockSupport: "Hilfe nötig? Support kontaktieren",
  },
  it: {
    appName: "DoseRoutine",
    tagline: "Tracker di integratori e protocolli con la sicurezza al primo posto",
    heroTitle: "Crea uno stack di integratori che non si contrasta.",
    heroBody:
      "Verifica le interazioni tra oltre 450 composti, ormoni, peptidi e farmaci. Gratis per iniziare — senza carta.",
    ctaPrimary: "Iscriviti gratis",
    ctaSecondary: "Ho già un account",
    ctaLibrary: "Sfoglia la libreria",
    ctaSafety: "Vedi un esempio di sicurezza",
    ctaStartFree: "Iscriviti gratis",
    featureInteraction: "Controllo interazioni",
    featureInteractionBody:
      "Ogni coppia del tuo stack viene verificata con regole di sicurezza e spiegazioni chiare.",
    featureReminders: "Promemoria puntuali",
    featureRemindersBody:
      "Programma ogni elemento nella tua giornata, rispetta le regole alimentari e registra ciò che hai effettivamente preso.",
    featureDose: "Inserisci tu la dose",
    featureDoseBody:
      "Per i composti controllati DoseRoutine non suggerisce mai una dose. Tu la inserisci, noi la programmiamo e verifichiamo.",
    trustTitle: "Pensato per chi vuole tenere sotto controllo la propria routine",
    trustBody:
      "DoseRoutine è uno strumento di tracciamento, non un venditore di integratori né consiglio medico. Non raccomandiamo composti, non prescriviamo dosi e non vendiamo i tuoi dati.",
    medicalDisclaimer:
      "Solo a scopo educativo. Consulta un professionista sanitario prima di modificare qualsiasi regime.",
    footerDisclaimer:
      "Educativo, non consiglio medico. Consulta un professionista sanitario prima di modificare qualsiasi regime.",
    finalCta: "Pronto a smettere di indovinare cosa hai preso?",
    finalCtaTitle: "Crea il tuo account gratuito",
    finalCtaBody:
      "Crea il tuo account in circa due minuti — senza carta. La prova Pro opzionale di 7 giorni sblocca i controlli interazioni, la cronologia, i promemoria e i piani AI.",
    freeForever: "Gratis per iniziare · Senza carta · Funziona su iPhone, Android e web",
    takesTwoMinutes: "Richiede circa 2 minuti. Annulla in qualsiasi momento.",
    library: "Libreria",
    signIn: "Accedi",
    privacyNote: "I tuoi dati sono tuoi — esportali in qualsiasi momento",
    getDoseRoutine: "Scarica DoseRoutine",
    trustBarCompounds: "Oltre 450 composti verificati",
    trustBarSources: "Fonti: NIH DailyMed, FDA, Drugs.com",
    trustBarFree: "Gratis per iniziare — senza carta",
    howItWorksTitle: "Come funziona DoseRoutine",
    howItWorksStep1Title: "Aggiungi ciò che prendi",
    howItWorksStep1Body: "Vitamine, peptidi, ormoni, ricette — tu inserisci la dose.",
    howItWorksStep2Title: "Registra pasti, allenamenti e dosi",
    howItWorksStep2Body:
      "Scatta una foto al pasto per calorie, proteine e carboidrati — e registra allenamenti e dosi con lo stesso tocco.",
    howItWorksStep3Title: "Ricevi promemoria e osserva i cambiamenti",
    howItWorksStep3Body:
      "Promemoria puntuali, avvisi di interazioni e andamenti su alimentazione, allenamento e protocollo.",
    finalCtaSecondary: "Esplora prima la libreria",
    stickyCta: "Iscriviti gratis",
    stickyCtaAlt: "O sfoglia la libreria",
    previewBadge: "Controllo interazioni live",
    exitIntentTitle: "Non sei pronto per registrarti?",
    exitIntentBody:
      "Sfoglia la libreria e scopri come DoseRoutine controlla le interazioni prima di creare un account.",
    exitIntentCta: "Sfoglia libreria",
    exitIntentDismiss: "Più tardi",
    faqQ1: "Posso aggiungere farmaci da prescrizione?",
    faqA1:
      "Sì. DoseRoutine segnala interazioni note con integratori, ma verifica sempre con il tuo farmacista.",
    faqQ2: "DoseRoutine è gratis?",
    faqA2:
      "Un account gratuito offre il tracciamento di base. La prova Pro opzionale di 7 giorni sblocca i controlli interazioni, la cronologia, i promemoria e i piani AI. Poi $9,99/mese o $59,99/anno (risparmio 50%). Annulla prima del giorno 7 e non paghi nulla.",
    faqQ8: "DoseRoutine può tracciare calorie, proteine e carboidrati?",
    faqA8:
      "Sì. Fotografa il pasto o scansiona un codice a barre: lo scanner pasti con IA restituisce calorie, proteine, carboidrati e grassi. Ogni valore è modificabile prima di salvare e i pasti compaiono nella stessa giornata di allenamenti e dosi.",
    proLockTitleLocked: "{screen} fa parte di Pro",
    proLockTitleFeature: "{screen} è una funzione Pro",
    proLockBodyEnded: "La tua prova gratuita è terminata, quindi {screen} è bloccato.",
    proLockCtaReactivate: "Riattiva Pro — {price}",
    proLockCtaTrial: "Inizia la prova gratuita di 7 giorni",
    proLockKeep1: "Il tuo stack, le dosi e lo storico restano salvati",
    proLockKeep2: "Oggi, i check-in e le note di sicurezza restano gratuiti",
    proLockKeep3: "Riabbonati quando vuoi — non viene eliminato nulla",
    proLockBack: "Torna a Oggi",
    proLockWhatsInPro: "Cosa include Pro?",
    proLockSupport: "Serve aiuto? Contatta il supporto",
  },
  pt: {
    appName: "DoseRoutine",
    tagline: "Rastreador de suplementos e protocolos com foco em segurança",
    heroTitle: "Crie uma stack de suplementos que não se contradiga.",
    heroBody:
      "Verifique interações entre mais de 450 compostos, hormônios, peptídeos e medicamentos. Grátis para começar — sem cartão.",
    ctaPrimary: "Cadastre-se grátis",
    ctaSecondary: "Já tenho uma conta",
    ctaLibrary: "Navegar pela biblioteca",
    ctaSafety: "Ver exemplo de segurança",
    ctaStartFree: "Cadastre-se grátis",
    featureInteraction: "Verificação de interações",
    featureInteractionBody:
      "Cada par da sua stack é verificado com regras de segurança e explicações claras.",
    featureReminders: "Lembretes no horário",
    featureRemindersBody:
      "Programe cada item no seu dia, respeite as regras alimentares e registre o que realmente tomou.",
    featureDose: "Você insere a dose",
    featureDoseBody:
      "Para compostos controlados, o DoseRoutine nunca sugere uma dose. Você digita, nós programamos e verificamos.",
    trustTitle: "Feito para quem quer manter a rotina em dia",
    trustBody:
      "O DoseRoutine é uma ferramenta de acompanhamento, não um vendedor de suplementos nem conselho médico. Não recomendamos compostos, não prescrevemos doses e não vendemos seus dados.",
    medicalDisclaimer:
      "Apenas educativo. Consulte um profissional de saúde antes de alterar qualquer regime.",
    footerDisclaimer:
      "Educativo, não é conselho médico. Consulte um profissional de saúde antes de alterar qualquer regime.",
    finalCta: "Pronto para parar de adivinhar o que tomou?",
    finalCtaTitle: "Crie sua conta grátis",
    finalCtaBody:
      "Crie sua conta em cerca de dois minutos — sem cartão. O teste Pro opcional de 7 dias desbloqueia verificação de interações, linha do tempo, lembretes e planos de IA.",
    freeForever: "Grátis para começar · Sem cartão · Funciona em iPhone, Android e web",
    takesTwoMinutes: "Leva cerca de 2 minutos. Cancele quando quiser.",
    library: "Biblioteca",
    signIn: "Entrar",
    privacyNote: "Seus dados são seus — exporte quando quiser",
    getDoseRoutine: "Baixar DoseRoutine",
    trustBarCompounds: "Mais de 450 compostos verificados",
    trustBarSources: "Fontes: NIH DailyMed, FDA, Drugs.com",
    trustBarFree: "Grátis para começar — sem cartão",
    howItWorksTitle: "Como funciona o DoseRoutine",
    howItWorksStep1Title: "Adicione o que você toma",
    howItWorksStep1Body: "Vitaminas, peptídeos, hormônios, receitas — você insere a dose.",
    howItWorksStep2Title: "Registre refeições, treinos e doses",
    howItWorksStep2Body:
      "Tire uma foto da refeição para ver calorias, proteínas e carboidratos — e registre treinos e doses no mesmo toque.",
    howItWorksStep3Title: "Receba lembretes e veja o que muda",
    howItWorksStep3Body:
      "Lembretes na hora certa, avisos de interações e tendências de alimentação, treino e protocolo.",
    finalCtaSecondary: "Explore a biblioteca primeiro",
    stickyCta: "Cadastre-se grátis",
    stickyCtaAlt: "Ou navegar pela biblioteca",
    previewBadge: "Verificação de interações",
    exitIntentTitle: "Ainda não quer se cadastrar?",
    exitIntentBody:
      "Navegue pela biblioteca e veja como o DoseRoutine verifica interações antes de criar uma conta.",
    exitIntentCta: "Navegar pela biblioteca",
    exitIntentDismiss: "Talvez depois",
    faqQ1: "Posso adicionar medicamentos prescritos?",
    faqA1:
      "Sim. O DoseRoutine sinaliza interações conhecidas com suplementos, mas sempre confirme com seu farmacêutico.",
    faqQ2: "O DoseRoutine é gratuito?",
    faqA2:
      "Uma conta gratuita oferece o acompanhamento básico. O teste Pro opcional de 7 dias desbloqueia verificação de interações, linha do tempo, lembretes e planos de IA. Depois, $9,99/mês ou $59,99/ano (economia de 50%). Cancele antes do dia 7 e não pague nada.",
    faqQ8: "O DoseRoutine acompanha calorias, proteínas e carboidratos?",
    faqA8:
      "Sim. Tire uma foto da refeição ou escaneie um código de barras e o scanner de refeições com IA devolve calorias, proteínas, carboidratos e gorduras. Todos os valores podem ser editados antes de salvar, e as refeições aparecem na mesma linha do tempo dos treinos e doses.",
    proLockTitleLocked: "{screen} faz parte do Pro",
    proLockTitleFeature: "{screen} é um recurso Pro",
    proLockBodyEnded: "Seu teste gratuito terminou, então {screen} está bloqueado.",
    proLockCtaReactivate: "Reativar Pro — {price}",
    proLockCtaTrial: "Começar teste gratuito de 7 dias",
    proLockKeep1: "Sua pilha, doses e histórico continuam salvos",
    proLockKeep2: "Hoje, os registros e as notas de segurança continuam gratuitos",
    proLockKeep3: "Assine novamente quando quiser — nada é excluído",
    proLockBack: "Voltar para Hoje",
    proLockWhatsInPro: "O que vem no Pro?",
    proLockSupport: "Precisa de ajuda? Fale com o suporte",
  },
  nl: {
    appName: "DoseRoutine",
    tagline: "Veiligheidsgerichte supplement- en protocoltracker",
    heroTitle: "Bouw een supplement-stack die zichzelf niet tegenwerkt.",
    heroBody:
      "Controleer interacties bij meer dan 450 stoffen, hormonen, peptiden en medicijnen. Gratis starten — geen kaart nodig.",
    ctaPrimary: "Gratis aanmelden",
    ctaSecondary: "Ik heb al een account",
    ctaLibrary: "Bibliotheek bekijken",
    ctaSafety: "Bekijk een veiligheidsvoorbeeld",
    ctaStartFree: "Gratis aanmelden",
    featureInteraction: "Interactiecontroles",
    featureInteractionBody:
      "Elk paar in je stack wordt gecontroleerd tegen veilige regels met duidelijke uitleg.",
    featureReminders: "Tijdige herinneringen",
    featureRemindersBody:
      "Plan elk item in je dag, houd rekening met voedingsregels en log wat je daadwerkelijk hebt genomen.",
    featureDose: "Jij voert de dosis in",
    featureDoseBody:
      "Voor gecontroleerde stoffen stelt DoseRoutine nooit een dosis voor. Jij typt hem in, wij plannen en controleren.",
    trustTitle: "Gemaakt voor mensen die grip willen houden op hun routine",
    trustBody:
      "DoseRoutine is een trackingtool, geen supplementverkoper en geen medisch advies. We bevelen geen stoffen aan, schrijven geen doseringen voor en verkopen je gegevens niet.",
    medicalDisclaimer: "Alleen educatief. Raadpleeg een arts voordat je een regime wijzigt.",
    footerDisclaimer:
      "Educatief, geen medisch advies. Raadpleeg een arts voordat je een regime wijzigt.",
    finalCta: "Klaar om te stoppen met raden wat je hebt genomen?",
    finalCtaTitle: "Maak je gratis account",
    finalCtaBody:
      "Maak je account in ongeveer twee minuten — geen kaart nodig. De optionele 7-daagse Pro-proef ontgrendelt interactiecontroles, tijdlijn, herinneringen en AI-plannen.",
    freeForever: "Gratis starten · Geen kaart nodig · Werkt op iPhone, Android en web",
    takesTwoMinutes: "Duurt ongeveer 2 minuten. Altijd opzegbaar.",
    library: "Bibliotheek",
    signIn: "Inloggen",
    privacyNote: "Jouw data is van jou — exporteer altijd wanneer je wilt",
    getDoseRoutine: "DoseRoutine downloaden",
    trustBarCompounds: "Meer dan 450 stoffen gecontroleerd",
    trustBarSources: "Bronnen: NIH DailyMed, FDA, Drugs.com",
    trustBarFree: "Gratis starten — geen kaart nodig",
    howItWorksTitle: "Hoe DoseRoutine werkt",
    howItWorksStep1Title: "Voeg toe wat je gebruikt",
    howItWorksStep1Body: "Vitamines, peptiden, hormonen, medicijnen — jij voert de dosis in.",
    howItWorksStep2Title: "Log maaltijden, trainingen en doses",
    howItWorksStep2Body:
      "Maak een foto van je maaltijd voor calorieën, eiwitten en koolhydraten — en log trainingen en doses met dezelfde tik.",
    howItWorksStep3Title: "Krijg herinneringen en zie wat verandert",
    howItWorksStep3Body:
      "Herinneringen op tijd, interactiewaarschuwingen en trends over voeding, training en je protocol.",
    finalCtaSecondary: "Eerst de bibliotheek verkennen",
    stickyCta: "Gratis aanmelden",
    stickyCtaAlt: "Of bibliotheek bekijken",
    previewBadge: "Live interactiecontrole",
    exitIntentTitle: "Nog niet klaar om je aan te melden?",
    exitIntentBody:
      "Bekijk de bibliotheek en zie hoe DoseRoutine interacties controleert voordat je een account maakt.",
    exitIntentCta: "Bibliotheek bekijken",
    exitIntentDismiss: "Misschien later",
    faqQ1: "Kan ik voorgeschreven medicijnen toevoegen?",
    faqA1:
      "Ja. DoseRoutine markeert bekende interacties met supplementen, maar controleer altijd met je apotheker.",
    faqQ2: "Is DoseRoutine gratis?",
    faqA2:
      "Een gratis account geeft je basisvolgen. De optionele 7-daagse Pro-proef ontgrendelt interactiecontroles, tijdlijn, herinneringen en AI-plannen. Daarna $9,99/maand of $59,99/jaar (50% besparing). Annuleer voor dag 7 – geen kosten.",
    faqQ8: "Kan DoseRoutine calorieën, eiwitten en koolhydraten bijhouden?",
    faqA8:
      "Ja. Maak een foto van je maaltijd of scan een barcode en de AI-maaltijdscanner geeft calorieën, eiwitten, koolhydraten en vet terug. Elke waarde is aanpasbaar voordat je opslaat, en maaltijden staan op dezelfde dagtijdlijn als je trainingen en doses.",
    proLockTitleLocked: "{screen} hoort bij Pro",
    proLockTitleFeature: "{screen} is een Pro-functie",
    proLockBodyEnded: "Je gratis proefperiode is afgelopen, dus {screen} is vergrendeld.",
    proLockCtaReactivate: "Pro heractiveren — {price}",
    proLockCtaTrial: "Start gratis proefperiode van 7 dagen",
    proLockKeep1: "Je stack, doses en geschiedenis blijven bewaard",
    proLockKeep2: "Vandaag, check-ins en veiligheidsnotities blijven gratis",
    proLockKeep3: "Neem wanneer je wilt weer een abonnement — er wordt niets verwijderd",
    proLockBack: "Terug naar Vandaag",
    proLockWhatsInPro: "Wat zit er in Pro?",
    proLockSupport: "Hulp nodig? Neem contact op met support",
  },
  ja: {
    appName: "DoseRoutine",
    tagline: "安全性を最優先にしたサプリメント＆プロトコル管理ツール",
    heroTitle: "自分自身と戦わないサプリメントスタックを作ろう。",
    heroBody:
      "450以上の化合物、ホルモン、ペプチド、処方薬の相互作用をチェック。無料で開始 — カード不要。",
    ctaPrimary: "無料で登録",
    ctaSecondary: "アカウントをお持ちの方",
    ctaLibrary: "ライブラリを見る",
    ctaSafety: "安全性チェックの例を見る",
    ctaStartFree: "無料で登録",
    featureInteraction: "相互作用チェック",
    featureInteractionBody:
      "スタック内のすべての組み合わせを、分かりやすい説明付きの安全ルールでチェックします。",
    featureReminders: "時間通りのリマインダー",
    featureRemindersBody:
      "各アイテムを1日のスケジュールに合わせ、食事のルールを尊重し、実際に摂取したものを記録します。",
    featureDose: "自分で用量を入力",
    featureDoseBody:
      "管理対象物質について、DoseRoutineは用量を提案しません。あなたが入力し、私たちがスケジュールとチェックを行います。",
    trustTitle: "毎日のルーティンをきちんと把握したい人のために",
    trustBody:
      "DoseRoutineは追跡ツールであり、サプリメント販売者でも医療アドバイスでもありません。物質を推奨せず、用量を処方せず、データを販売しません。",
    medicalDisclaimer: "教育目的のみです。レジメンを変更する前に医療専門家に相談してください。",
    footerDisclaimer:
      "教育目的であり医療アドバイスではありません。レジメンを変更する前に医療専門家に相談してください。",
    finalCta: "何を摂取したか推測するのをやめませんか？",
    finalCtaTitle: "無料アカウントを作成",
    finalCtaBody:
      "約2分で無料アカウントを作成。カード不要。オプションの7日間Proトライアルで相互作用チェック、タイムライン、リマインダー、AIプランが利用可能になります。",
    freeForever: "無料で開始 · カード不要 · iPhone、Android、Webで利用可能",
    takesTwoMinutes: "約2分で開始。いつでもキャンセル可能。",
    library: "ライブラリ",
    signIn: "サインイン",
    privacyNote: "あなたのデータはあなたのもの — いつでもエクスポート可能",
    getDoseRoutine: "DoseRoutine を入手",
    trustBarCompounds: "450以上の化合物をチェック",
    trustBarSources: "出典：NIH DailyMed、FDA、Drugs.com",
    trustBarFree: "無料で開始 — カード不要",
    howItWorksTitle: "DoseRoutineの使い方",
    howItWorksStep1Title: "摂取しているものを追加",
    howItWorksStep1Body: "ビタミン、ペプチド、ホルモン、処方薬 — 用量はあなたが入力します。",
    howItWorksStep2Title: "食事・運動・摂取を記録",
    howItWorksStep2Body:
      "食事を撮影するだけでカロリー・タンパク質・炭水化物がわかり、運動や摂取も同じ操作で記録できます。",
    howItWorksStep3Title: "リマインドと変化の確認",
    howItWorksStep3Body:
      "時間どおりのリマインド、相互作用の警告、食事・トレーニング・プロトコルの推移を確認できます。",
    finalCtaSecondary: "まずライブラリを探索",
    stickyCta: "無料で登録",
    stickyCtaAlt: "またはライブラリを見る",
    previewBadge: "ライブ相互作用チェック",
    exitIntentTitle: "まだ登録する準備ができていませんか？",
    exitIntentBody:
      "アカウントを作成する前に、ライブラリを見てDoseRoutineがどのように相互作用をチェックするか確認してください。",
    exitIntentCta: "ライブラリを見る",
    exitIntentDismiss: "後で",
    faqQ1: "処方薬を追加できますか？",
    faqA1:
      "はい。DoseRoutineはサプリメントとの既知の相互作用を警告しますが、必ず薬剤師に確認してください。",
    faqQ2: "DoseRoutineは無料ですか？",
    faqA2:
      "無料アカウントで基本の記録ができます。オプションの7日間Proトライアルで相互作用チェック、タイムライン、リマインダー、AIプランが利用可能になります。その後、$9.99/月または$59.99/年（50%割引）。7日目までにキャンセルすれば料金は発生しません。",
    faqQ8: "DoseRoutineでカロリー・タンパク質・炭水化物を記録できますか？",
    faqA8:
      "はい。食事を撮影するかバーコードをスキャンすると、AI食事スキャナーがカロリー・タンパク質・炭水化物・脂質を返します。保存前にすべての値を編集でき、食事はトレーニングや摂取と同じ1日のタイムラインに表示されます。",
    proLockTitleLocked: "{screen} は Pro の機能です",
    proLockTitleFeature: "{screen} は Pro の機能です",
    proLockBodyEnded: "無料トライアルが終了したため、{screen} はロックされています。",
    proLockCtaReactivate: "Pro を再開する — {price}",
    proLockCtaTrial: "7日間の無料トライアルを開始",
    proLockKeep1: "スタック・服用記録・履歴は保存されたままです",
    proLockKeep2: "今日の画面、チェックイン、安全メモは引き続き無料です",
    proLockKeep3: "いつでも再登録できます — データは削除されません",
    proLockBack: "今日に戻る",
    proLockWhatsInPro: "Pro に含まれるもの",
    proLockSupport: "サポートが必要ですか？ お問い合わせ",
  },
  ko: {
    appName: "DoseRoutine",
    tagline: "안전성 우선 보충제 및 프로토콜 추적기",
    heroTitle: "서로 충돌하지 않는 보충제 스택을 만드세요.",
    heroBody:
      "450개 이상의 화합물, 호르몬, 펩타이드, 처방약의 상호작용을 확인하세요. 무료로 시작 — 카드 불필요.",
    ctaPrimary: "무료로 가입하기",
    ctaSecondary: "이미 계정이 있어요",
    ctaLibrary: "라이브러리 둘러보기",
    ctaSafety: "안전성 확인 예시 보기",
    ctaStartFree: "무료로 가입하기",
    featureInteraction: "상호작용 확인",
    featureInteractionBody:
      "스택의 모든 쌍을 명확한 설명이 포함된 선별된 안전 규칙으로 확인합니다.",
    featureReminders: "제시간 알림",
    featureRemindersBody:
      "각 항목을 하루 일정에 맞추고, 식사 규칙을 준수하며, 실제 복용한 것을 기록합니다.",
    featureDose: "직접 복용량 입력",
    featureDoseBody:
      "통제 물질의 경우 DoseRoutine는 복용량을 제안하지 않습니다. 사용자가 입력하면 우리가 일정을 잡고 확인합니다.",
    trustTitle: "루틴을 잘 관리하고 싶은 분들을 위해",
    trustBody:
      "DoseRoutine는 추적 도구이며, 보충제 판매자나 의료 조언이 아닙니다. 물질을 권장하지 않고, 복용량을 처방하지 않으며, 데이터를 판매하지 않습니다.",
    medicalDisclaimer: "교육 목적만 해당됩니다. 요법을 변경하기 전에 의료 전문가와 상담하세요.",
    footerDisclaimer:
      "교육용이며 의료 조언이 아닙니다. 요법을 변경하기 전에 의료 전문가와 상담하세요.",
    finalCta: "무엇을 복용했는지 추측하는 것을 그만두실 준비가 되셨나요?",
    finalCtaTitle: "무료 계정 만들기",
    finalCtaBody:
      "약 2분이면 무료 계정을 만듭니다. 카드 불필요. 선택적 7일 Pro 체험으로 상호작용 확인, 타임라인, 알림, AI 플랜이 해금됩니다.",
    freeForever: "무료로 시작 · 카드 불필요 · iPhone, Android, Web에서 작동",
    takesTwoMinutes: "약 2분이 소요됩니다. 언제든지 취소 가능.",
    library: "라이브러리",
    signIn: "로그인",
    privacyNote: "데이터는 사용자의 것 — 언제든지 내보내기 가능",
    getDoseRoutine: "DoseRoutine 받기",
    trustBarCompounds: "450개 이상의 화합물 확인",
    trustBarSources: "출처: NIH DailyMed, FDA, Drugs.com",
    trustBarFree: "무료로 시작 — 카드 불필요",
    howItWorksTitle: "DoseRoutine 사용 방법",
    howItWorksStep1Title: "복용 중인 것 추가",
    howItWorksStep1Body: "비타민, 펩타이드, 호르몬, 처방약 — 복용량은 직접 입력합니다.",
    howItWorksStep2Title: "식사, 운동, 복용 기록",
    howItWorksStep2Body:
      "식사를 촬영하면 칼로리·단백질·탄수화물을 알려주고, 운동과 복용도 같은 화면에서 기록합니다.",
    howItWorksStep3Title: "알림을 받고 변화를 확인",
    howItWorksStep3Body:
      "제때 오는 알림, 상호작용 경고, 그리고 식사·운동·프로토콜의 추세를 함께 봅니다.",
    finalCtaSecondary: "먼저 라이브러리 둘러보기",
    stickyCta: "무료로 가입하기",
    stickyCtaAlt: "또는 라이브러리 둘러보기",
    previewBadge: "실시간 상호작용 확인",
    exitIntentTitle: "아직 가입할 준비가 안 되셨나요?",
    exitIntentBody:
      "계정을 만들기 전에 라이브러리를 둘러보고 DoseRoutine가 상호작용을 어떻게 확인하는지 살펴보세요.",
    exitIntentCta: "라이브러리 둘러보기",
    exitIntentDismiss: "나중에",
    faqQ1: "처방약을 추가할 수 있나요?",
    faqA1: "네. DoseRoutine는 보충제와의 알려진 상호작용을 표시하지만, 항상 약사와 확인하세요.",
    faqQ2: "DoseRoutine는 무료인가요?",
    faqA2:
      "무료 계정으로 기본 추적이 가능합니다. 선택적 7일 Pro 체험으로 상호작용 확인, 타임라인, 알림, AI 플랜이 해금됩니다. 이후 $9.99/월 또는 $59.99/년(50% 할인). 7일 전에 취소하면 요금이 발생하지 않습니다.",
    faqQ8: "DoseRoutine으로 칼로리, 단백질, 탄수화물을 추적할 수 있나요?",
    faqA8:
      "네. 식사를 촬영하거나 바코드를 스캔하면 AI 식사 스캐너가 칼로리, 단백질, 탄수화물, 지방을 알려줍니다. 저장 전에 모든 값을 수정할 수 있고, 식사는 운동·복용과 같은 하루 타임라인에 표시됩니다.",
    proLockTitleLocked: "{screen}은(는) Pro 기능입니다",
    proLockTitleFeature: "{screen}은(는) Pro 기능입니다",
    proLockBodyEnded: "무료 체험이 종료되어 {screen}이(가) 잠겼습니다.",
    proLockCtaReactivate: "Pro 다시 시작 — {price}",
    proLockCtaTrial: "7일 무료 체험 시작",
    proLockKeep1: "스택, 복용량, 기록은 그대로 저장됩니다",
    proLockKeep2: "오늘 화면, 체크인, 안전 메모는 계속 무료입니다",
    proLockKeep3: "언제든 다시 구독할 수 있습니다 — 삭제되는 것은 없습니다",
    proLockBack: "오늘로 돌아가기",
    proLockWhatsInPro: "Pro에 포함된 기능",
    proLockSupport: "도움이 필요하신가요? 지원팀에 문의",
  },
  zh: {
    appName: "DoseRoutine",
    tagline: "以安全为先的补充剂与方案追踪器",
    heroTitle: "构建一个不会自相冲突的补充剂方案。",
    heroBody: "检查450多种化合物、激素、肽和处方药的相互作用。免费开始 — 无需银行卡。",
    ctaPrimary: "免费注册",
    ctaSecondary: "已有账户",
    ctaLibrary: "浏览资料库",
    ctaSafety: "查看安全示例",
    ctaStartFree: "免费注册",
    featureInteraction: "相互作用检查",
    featureInteractionBody:
      "您方案中的每一对组合都会根据精选的安全规则进行检查，并提供通俗易懂的机制说明。",
    featureReminders: "准时提醒",
    featureRemindersBody: "按您的一天安排每个项目，遵守饮食规则，并记录您实际服用的内容。",
    featureDose: "您输入剂量",
    featureDoseBody: "对于受控化合物，DoseRoutine 从不建议剂量。您输入，我们来安排和检查。",
    trustTitle: "为想把日常安排管理好的人打造",
    trustBody:
      "DoseRoutine 是一个追踪工具，不是补充剂销售商，也不是医疗建议。我们不推荐化合物、不开具剂量，也不出售您的数据。",
    medicalDisclaimer: "仅供教育用途。在更改任何方案前请咨询合格的临床医生。",
    footerDisclaimer: "教育用途，非医疗建议。在更改任何方案前请咨询合格的临床医生。",
    finalCta: "准备好停止猜测自己吃了什么了吗？",
    finalCtaTitle: "创建免费账户",
    finalCtaBody:
      "大约两分钟创建免费账户，无需银行卡。可选的 7 天 Pro 试用可解锁相互作用检查、时间线、提醒和 AI 计划。",
    freeForever: "免费开始 · 无需银行卡 · 适用于 iPhone、Android 和网页",
    takesTwoMinutes: "大约需要 2 分钟。随时可取消。",
    library: "资料库",
    signIn: "登录",
    privacyNote: "您的数据归您所有 — 可随时导出",
    getDoseRoutine: "获取 DoseRoutine",
    trustBarCompounds: "已检查450多种化合物",
    trustBarSources: "来源：NIH DailyMed、FDA、Drugs.com",
    trustBarFree: "免费开始 — 无需银行卡",
    howItWorksTitle: "DoseRoutine 如何运作",
    howItWorksStep1Title: "添加你服用的内容",
    howItWorksStep1Body: "维生素、肽、激素、处方药 — 由你输入剂量。",
    howItWorksStep2Title: "记录饮食、训练和用量",
    howItWorksStep2Body: "拍一张餐食照片即可获得热量、蛋白质和碳水，训练与用量也能一并记录。",
    howItWorksStep3Title: "接收提醒，看到变化",
    howItWorksStep3Body: "准时提醒、相互作用警告，以及饮食、训练和方案的整体趋势。",
    finalCtaSecondary: "先探索资料库",
    stickyCta: "免费注册",
    stickyCtaAlt: "或浏览资料库",
    previewBadge: "实时相互作用检查",
    exitIntentTitle: "还没准备好注册？",
    exitIntentBody: "在创建账户之前，浏览资料库，了解 DoseRoutine 如何检查相互作用。",
    exitIntentCta: "浏览资料库",
    exitIntentDismiss: "稍后",
    faqQ1: "可以添加处方药吗？",
    faqA1: "可以。DoseRoutine 会标记与补充剂的已知相互作用，但请务必与药剂师确认。",
    faqQ2: "DoseRoutine 是免费的吗？",
    faqA2:
      "免费账户可使用核心记录功能。可选的 7 天 Pro 试用可解锁相互作用检查、时间线、提醒和 AI 计划。之后$9.99/月或$59.99/年（节省50%）。在第7天前取消，不收取任何费用。",
    faqQ8: "DoseRoutine 能记录热量、蛋白质和碳水吗？",
    faqA8:
      "可以。拍摄餐食照片或扫描条码，AI 餐食扫描会返回热量、蛋白质、碳水和脂肪。保存前每项数值都可编辑，餐食会与训练和用量显示在同一天的时间线上。",
    proLockTitleLocked: "{screen} 属于 Pro 功能",
    proLockTitleFeature: "{screen} 是 Pro 功能",
    proLockBodyEnded: "免费试用已结束，因此 {screen} 已锁定。",
    proLockCtaReactivate: "重新启用 Pro — {price}",
    proLockCtaTrial: "开始 7 天免费试用",
    proLockKeep1: "你的配方、剂量和历史记录仍会保存",
    proLockKeep2: "今天、打卡和安全提示仍然免费",
    proLockKeep3: "随时可以重新订阅 — 不会删除任何数据",
    proLockBack: "返回今天",
    proLockWhatsInPro: "Pro 包含哪些功能？",
    proLockSupport: "需要帮助？联系客服",
  },
  ar: {
    appName: "DoseRoutine",
    tagline: "أداة تتبع المكملات والبروتوكولات مع الأولوية للسلامة",
    heroTitle: "أنشئ مكدس مكملات لا يتعارض مع نفسه.",
    heroBody:
      "تحقق من التفاعلات بين أكثر من 450 مركباً، هرمونات، ببتيدات وأدوية موصوفة. ابدأ مجانًا — بدون بطاقة.",
    ctaPrimary: "سجّل مجانًا",
    ctaSecondary: "لدي حساب بالفعل",
    ctaLibrary: "تصفح المكتبة",
    ctaSafety: "اطلع على مثال للسلامة",
    ctaStartFree: "سجّل مجانًا",
    featureInteraction: "فحوصات التفاعلات",
    featureInteractionBody: "يتم فحص كل زوج في مكدسك مقابل مجموعة قواعد أمان مختارة مع شروح بسيطة.",
    featureReminders: "تنبيهات في الوقت المناسب",
    featureRemindersBody: "جدّل كل عنصر حسب يومك، واحترم قواعد الطعام، وسجّل ما تناولته فعلياً.",
    featureDose: "أنت تدخل الجرعة",
    featureDoseBody:
      "للمركبات الخاضعة للرقابة، لا يقترح DoseRoutine أبداً جرعة. أنت تكتبها، ونحن نجدولها ونفحصها.",
    trustTitle: "مُصمّم لمن يريد متابعة روتينه اليومي بسهولة",
    trustBody:
      "DoseRoutine أداة تتبع، وليس بائع مكملات ولا نصيحة طبية. لا نوصي بمركبات، ولا نصف جرعات، ولا نبيع بياناتك.",
    medicalDisclaimer: "للأغراض التعليمية فقط. استشر طبيباً مؤهلاً قبل تغيير أي نظام.",
    footerDisclaimer: "للأغراض التعليمية، وليس نصيحة طبية. استشر طبيباً مؤهلاً قبل تغيير أي نظام.",
    finalCta: "هل أنت مستعد لوقف التخمين بما تناولته؟",
    finalCtaTitle: "أنشئ حسابك المجاني",
    finalCtaBody:
      "أنشئ حسابك المجاني في حوالي دقيقتين — بدون بطاقة. النسخة التجريبية الاختيارية لمدة 7 أيام من Pro تفتح فحوصات التفاعلات والجدول الزمني والتنبيهات والخطط الذكية.",
    freeForever: "ابدأ مجانًا · بدون بطاقة · يعمل على iPhone وAndroid والويب",
    takesTwoMinutes: "يستغرق حوالي دقيقتين. يمكن الإلغاء في أي وقت.",
    library: "المكتبة",
    signIn: "تسجيل الدخول",
    privacyNote: "بياناتك ملكك — يمكنك تصديرها في أي وقت",
    getDoseRoutine: "احصل على DoseRoutine",
    trustBarCompounds: "أكثر من 450 مركباً تم فحصه",
    trustBarSources: "المصادر: NIH DailyMed، FDA، Drugs.com",
    trustBarFree: "ابدأ مجانًا — بدون بطاقة",
    howItWorksTitle: "كيف يعمل DoseRoutine",
    howItWorksStep1Title: "أضف ما تتناوله",
    howItWorksStep1Body: "فيتامينات، ببتيدات، هرمونات، أدوية موصوفة — أنت تدخل الجرعة.",
    howItWorksStep2Title: "سجّل الوجبات والتمارين والجرعات",
    howItWorksStep2Body:
      "التقط صورة لوجبتك لمعرفة السعرات والبروتين والكربوهيدرات — وسجّل التمارين والجرعات باللمسة نفسها.",
    howItWorksStep3Title: "احصل على تذكيرات وشاهد ما يتغيّر",
    howItWorksStep3Body:
      "تذكيرات في وقتها، تنبيهات التفاعلات، ومؤشرات لتغذيتك وتمارينك وبروتوكولك.",
    finalCtaSecondary: "استكشف المكتبة أولاً",
    stickyCta: "سجّل مجانًا",
    stickyCtaAlt: "أو تصفح المكتبة",
    previewBadge: "فحص تفاعلات مباشر",
    exitIntentTitle: "غير مستعد للتسجيل؟",
    exitIntentBody: "تصفح المكتبة واطلع على كيفية فحص DoseRoutine للتفاعلات قبل إنشاء حساب.",
    exitIntentCta: "تصفح المكتبة",
    exitIntentDismiss: "لاحقاً",
    faqQ1: "هل يمكنني إضافة أدوية موصوفة؟",
    faqA1:
      "نعم. يسلط DoseRoutine الضوء على التفاعلات المعروفة مع المكملات، لكن تحقق دائماً مع الصيدلي.",
    faqQ2: "هل DoseRoutine مجاني؟",
    faqA2:
      "الحساب المجاني يمنحك التتبع الأساسي. النسخة التجريبية الاختيارية لمدة 7 أيام من Pro تفتح فحوصات التفاعلات والجدول الزمني والتنبيهات والخطط الذكية. بعد ذلك، 9.99 دولار/شهر أو 59.99 دولار/سنة (توفير 50%). ألغِ قبل اليوم 7 ولا تدفع شيئاً.",
    faqQ8: "هل يستطيع DoseRoutine تتبع السعرات والبروتين والكربوهيدرات؟",
    faqA8:
      "نعم. التقط صورة لوجبتك أو امسح الباركود وسيعيد ماسح الوجبات بالذكاء الاصطناعي السعرات والبروتين والكربوهيدرات والدهون. يمكن تعديل كل قيمة قبل الحفظ، وتظهر الوجبات في الجدول اليومي نفسه مع التمارين والجرعات.",
    proLockTitleLocked: "{screen} جزء من Pro",
    proLockTitleFeature: "{screen} ميزة في Pro",
    proLockBodyEnded: "انتهت فترتك التجريبية المجانية، لذلك {screen} مقفل.",
    proLockCtaReactivate: "إعادة تفعيل Pro — {price}",
    proLockCtaTrial: "ابدأ تجربة مجانية لمدة 7 أيام",
    proLockKeep1: "تبقى مجموعتك وجرعاتك وسجلك محفوظة",
    proLockKeep2: "تبقى صفحة اليوم والتسجيلات وملاحظات السلامة مجانية",
    proLockKeep3: "يمكنك الاشتراك مرة أخرى في أي وقت — لن يُحذف أي شيء",
    proLockBack: "العودة إلى اليوم",
    proLockWhatsInPro: "ما الذي يتضمنه Pro؟",
    proLockSupport: "هل تحتاج مساعدة؟ تواصل مع الدعم",
  },
  hi: {
    appName: "DoseRoutine",
    tagline: "सुरक्षा-प्रथम सप्लीमेंट और प्रोटोकॉल ट्रैकर",
    heroTitle: "ऐसा सप्लीमेंट स्टैक बनाएं जो आपस में न लड़े।",
    heroBody:
      "475+ यौगिकों, हार्मोन, पेप्टाइड और नुस्खे की दवाओं की बातचीत जाँचें। मुफ़्त शुरुआत — कार्ड की ज़रूरत नहीं।",
    ctaPrimary: "मुफ़्त साइन अप करें",
    ctaSecondary: "मेरा पहले से खाता है",
    ctaLibrary: "लाइब्रेरी ब्राउज़ करें",
    ctaSafety: "सुरक्षा उदाहरण देखें",
    ctaStartFree: "मुफ़्त साइन अप करें",
    featureInteraction: "इंटरैक्शन जाँच",
    featureInteractionBody:
      "आपके स्टैक में हर युग्म की सादी-समझी सुरक्षा नियमों के खिलाफ जाँच की जाती है।",
    featureReminders: "समय पर रिमाइंडर",
    featureRemindersBody:
      "हर आइटम को आपके दिन के अनुसार समयबद्ध करें, भोजन के नियमों का पालन करें, और जो लिया वह लॉग करें।",
    featureDose: "आप खुराक दर्ज करते हैं",
    featureDoseBody:
      "नियंत्रित यौगिकों के लिए DoseRoutine कभी खुराक नहीं सुझाता। आप टाइप करते हैं, हम शेड्यूल और जाँच करते हैं।",
    trustTitle: "उन लोगों के लिए जो अपनी दिनचर्या पर नज़र रखना चाहते हैं",
    trustBody:
      "DoseRoutine एक ट्रैकिंग टूल है, सप्लीमेंट विक्रेता या चिकित्सा सलाह नहीं। हम यौगिक सुझाते नहीं, खुराक निर्धारित नहीं करते, और आपका डेटा नहीं बेचते।",
    medicalDisclaimer:
      "केवल शैक्षिक उद्देश्य। किसी भी रेजीमेन को बदलने से पहले योग्य चिकित्सक से परामर्श करें।",
    footerDisclaimer:
      "शैक्षिक, चिकित्सा सलाह नहीं। किसी भी रेजीमेन को बदलने से पहले योग्य चिकित्सक से परामर्श करें।",
    finalCta: "तैयार हैं अंदाज़ा लगाना बंद करने के लिए कि आपने क्या लिया?",
    finalCtaTitle: "अपना मुफ़्त खाता बनाएं",
    finalCtaBody:
      "लगभग 2 मिनट में मुफ़्त खाता बनाएं — कार्ड की ज़रूरत नहीं। वैकल्पिक 7-दिन का Pro परीक्षण इंटरैक्शन जाँच, टाइमलाइन, रिमाइंडर और AI योजनाओं को अनलॉक करता है।",
    freeForever: "मुफ़्त शुरुआत · कार्ड की ज़रूरत नहीं · iPhone, Android और वेब पर काम करता है",
    takesTwoMinutes: "लगभग 2 मिनट लेता है। कभी भी रद्द करें।",
    library: "लाइब्रेरी",
    signIn: "साइन इन करें",
    privacyNote: "आपका डेटा आपका है — कभी भी निर्यात करें",
    getDoseRoutine: "DoseRoutine प्राप्त करें",
    trustBarCompounds: "475+ यौगिक जाँचे गए",
    trustBarSources: "स्रोत: NIH DailyMed, FDA, Drugs.com",
    trustBarFree: "मुफ़्त शुरुआत — कार्ड की ज़रूरत नहीं",
    howItWorksTitle: "DoseRoutine कैसे काम करता है",
    howItWorksStep1Title: "जो लेते हैं वह जोड़ें",
    howItWorksStep1Body: "विटामिन, पेप्टाइड, हार्मोन, नुस्खे — आप खुराक दर्ज करते हैं।",
    howItWorksStep2Title: "भोजन, वर्कआउट और खुराक दर्ज करें",
    howItWorksStep2Body:
      "अपने भोजन की फोटो लें और कैलोरी, प्रोटीन व कार्ब्स पाएं — वर्कआउट और खुराक भी उसी टैप में दर्ज करें।",
    howItWorksStep3Title: "रिमाइंडर पाएं और बदलाव देखें",
    howItWorksStep3Body:
      "समय पर रिमाइंडर, इंटरैक्शन चेतावनियाँ, और भोजन, ट्रेनिंग व प्रोटोकॉल के रुझान।",
    finalCtaSecondary: "पहले लाइब्रेरी देखें",
    stickyCta: "मुफ़्त साइन अप करें",
    stickyCtaAlt: "या लाइब्रेरी ब्राउज़ करें",
    previewBadge: "लाइव इंटरैक्शन जाँच",
    exitIntentTitle: "अभी साइन अप करने के लिए तैयार नहीं?",
    exitIntentBody:
      "खाता बनाने से पहले लाइब्रेरी ब्राउज़ करें और देखें कि DoseRoutine इंटरैक्शन कैसे जाँचता है।",
    exitIntentCta: "लाइब्रेरी ब्राउज़ करें",
    exitIntentDismiss: "बाद में",
    faqQ1: "क्या मैं नुस्खे की दवाएं जोड़ सकता हूँ?",
    faqA1:
      "हाँ। DoseRoutine सप्लीमेंट्स के साथ ज्ञात इंटरैक्शन को चिह्नित करता है, लेकिन हमेशा अपने फार्मासिस्ट से पुष्टि करें।",
    faqQ2: "क्या DoseRoutine मुफ़्त है?",
    faqA2:
      "मुफ़्त खाते से मूल ट्रैकिंग मिलती है। वैकल्पिक 7-दिन का Pro परीक्षण इंटरैक्शन जाँच, टाइमलाइन, रिमाइंडर और AI योजनाओं को अनलॉक करता है। इसके बाद $9.99/माह या $59.99/वर्ष (50% बचत)। दिन 7 से पहले रद्द करें — कोई शुल्क नहीं।",
    faqQ8: "क्या DoseRoutine कैलोरी, प्रोटीन और कार्ब्स ट्रैक कर सकता है?",
    faqA8:
      "हाँ। अपने भोजन की फोटो लें या बारकोड स्कैन करें — AI मील स्कैनर कैलोरी, प्रोटीन, कार्ब्स और फैट बताता है। सेव करने से पहले हर मान संपादित किया जा सकता है, और भोजन उसी दिन की टाइमलाइन में वर्कआउट व खुराक के साथ दिखता है।",
    proLockTitleLocked: "{screen} Pro का हिस्सा है",
    proLockTitleFeature: "{screen} एक Pro सुविधा है",
    proLockBodyEnded: "आपका मुफ़्त ट्रायल समाप्त हो गया है, इसलिए {screen} लॉक है।",
    proLockCtaReactivate: "Pro फिर से शुरू करें — {price}",
    proLockCtaTrial: "7 दिन का मुफ़्त ट्रायल शुरू करें",
    proLockKeep1: "आपका स्टैक, खुराक और इतिहास सुरक्षित रहते हैं",
    proLockKeep2: "आज, चेक-इन और सुरक्षा नोट्स मुफ़्त रहते हैं",
    proLockKeep3: "कभी भी दोबारा सब्सक्राइब करें — कुछ भी नहीं मिटता",
    proLockBack: "आज पर वापस जाएँ",
    proLockWhatsInPro: "Pro में क्या शामिल है?",
    proLockSupport: "मदद चाहिए? सपोर्ट से संपर्क करें",
  },
};

export function t(locale: Locale, key: string, fallback?: string): string {
  const dict = UI_DICTIONARY[locale] ?? UI_DICTIONARY[DEFAULT_LOCALE];
  return dict[key] ?? fallback ?? UI_DICTIONARY[DEFAULT_LOCALE][key] ?? key;
}
